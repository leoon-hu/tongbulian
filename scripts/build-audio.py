#!/usr/bin/env python3
"""
生成朗读音频包：public/audio/<lang>-<hash>.mp3 + src/audio/manifest.json。

输入 src/audio/corpus.json（由 node scripts/collect-speech.mjs 生成）：每种语言一组要读的片段
（数字、汉字短语、emoji 的名字、运算符的读法……见 src/engine/speech.ts）。每个片段：
  1. 用 Microsoft Edge 神经语音合成（edge-tts，zh 晓伊 / en Jenny，语速 -10%），原始结果缓存在
     --tts-cache（按 音色+语速+文本 的哈希命名，已有则复用，断网也能重跑处理部分）；
  2. ffmpeg 解码为 24kHz 单声道 → 裁静音（噪声自适应，见 find_voiced）→ K 加权响度归一到 -18 dB
     （峰值不超过 -1 dBFS）→ libmp3lame 48kbps CBR。裁得干净，顺序拼播时片段之间才不会有长停顿。
  3. 文件名 <lang>-<sha1(文本)[:10]>.mp3；manifest.json 记录 文本 → 文件名。
多音字在上下文里读错的片段，送给 edge-tts 的文字按 SAY_AS 换成同音的单音字（片段文本不变），文件名取换过的
文字的哈希——内容变了地址就变，已经下过离线包的设备不会一直用缓存里读错的旧文件；页面按 manifest 里
「文件名 ≠ 文本哈希」的几条做别名（vite.config.ts 的 audioClips 插件）。
输出目录里不再属于语料的 mp3 会被删掉。重复运行结果一致（幂等）。

用法
  npm run audio                                  # = collect-speech + 本脚本
  python3 scripts/build-audio.py --jobs 8        # 合成并行数（默认 6）
  python3 scripts/build-audio.py --dry-run       # 只报告要合成 / 删除什么
需要：pip install edge-tts numpy；ffmpeg（系统安装，或 pip install imageio-ffmpeg，或 --ffmpeg 指定）。
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import numpy as np

ROOT = Path(__file__).resolve().parent.parent
CORPUS = ROOT / "src" / "audio" / "corpus.json"
MANIFEST = ROOT / "src" / "audio" / "manifest.json"
DEFAULT_OUT = ROOT / "public" / "audio"
DEFAULT_TTS_CACHE = Path(tempfile.gettempdir()) / "tongbulian-tts-cache"

VOICES = {"zh": "zh-CN-XiaoyiNeural", "en": "en-US-JennyNeural"}
TTS_RATE = "-10%"
TTS_JOBS = 6

# 音频处理参数（与拼音学习机的音频包相同，两个应用听起来是同一个声音、同样响度）
SR = 24000
WIN = SR // 100              # 10ms 分析窗
HOP = SR // 400              # 10ms 窗的滑动步长（2.5ms）
EDGE_OUT_DB = -43.0          # 起音 / 结束阈值（输出域）
CONNECT_OUT_DB = -50.0       # 连接阈值（输出域）
NOISE_MARGIN_DB = 6.0        # 两个阈值都至少比底噪上沿高这么多
CORE_DROP_DB = 20.0          # 「核心」= 比最响窗低不到 20dB 的窗
GAP_MS = 50                  # 向外延伸时容忍的静音缺口
LEAD_SILENCE_MS, LEAD_RAMP_MS = 40, 10    # 起音前：数字静音 + 淡入
TAIL_FADE_MS, TAIL_SILENCE_MS = 30, 60    # 结束后：淡出 + 数字静音
TARGET_RMS_DB = -18.0        # 有声段的 K 加权 RMS（≈ LUFS）目标
PEAK_LIMIT_DB = -1.0
BITRATE = "48k"

# 合成时的读法：片段文本不变，只改送给 edge-tts 的文字——多音字在某些上下文里读错，就换成读音唯一的同音字。
# 文件名跟着换过的文字走（clip_name），所以改了这里下次运行会重做受影响的片段、删掉旧文件。
SAY_AS: Dict[str, List[Tuple["re.Pattern[str]", str]]] = {
    "zh": [
        # 动词「数」shǔ：「从前数第 3 个」「狮子从上数排第几个」常读成 shù（「从前」被当成「以前」、「上数」被当成名词），
        # 随前面的词时对时错；「鼠」只有 shǔ 一个读音。「数一数」「从左数」读得对，一起换也听不出区别
        (re.compile(r"(?<=从[前后左右上下])数"), "鼠"),
        # 序数「第一」读 yī 不变调，但「一声」「一笔」「一个」是常用词（叫了一声、一笔钱、一个人，读 yì / yí），
        # 「第一声」「第一笔」「第一个」有被读成 yì 的风险——声调的叫法读错了等于教错；「衣」只有 yī 一个读音
        (re.compile(r"(?<=第)一(?=[声笔个])"), "衣"),
        # 语文课文里的多音字（二年级起，按课本的读法；合成语音在这些词里常读成最常见的音）：换成读音唯一的同音字，
        # 本来就读得对的换了也一样。一年级的课文碰到同样的词读音相同（长高、背着、空地……），一起换
        (re.compile(r"见(?=牛羊)"), "现"),                                  # 风吹草低见牛羊 xiàn
        (re.compile(r"(?<=天)都(?=峰)|(?<=叫天)都"), "督"),                  # 天都峰 dū
        (re.compile(r"(?<=一)行(?=白鹭|垂柳)"), "航"),                      # 一行白鹭 háng
        (re.compile(r"(?<=稻上)场"), "常"),                                 # 稻上场 cháng（打谷场）
        (re.compile(r"(?<=农事)了"), "蓼"),                                 # 一年农事了 liǎo
        (re.compile(r"(?<=耳朵一)扇"), "山"),                               # 把耳朵一扇 shān
        (re.compile(r"教(?=小鲤鱼|他们|喜鹊|什么)"), "交"),                  # 教小鲤鱼捕食 jiāo
        (re.compile(r"(?<!无)数(?=星星|得清|清|到了|九)"), "鼠"),             # 数星星、数九 shǔ
        (re.compile(r"(?<=星)转|转(?=来转去)|(?<=来)转(?=去)"), "赚"),       # 绕着北极星转、转来转去 zhuàn
        (re.compile(r"(?<=寒)号(?=鸟)"), "豪"),                             # 寒号鸟 háo（课本识字表）
        (re.compile(r"(?<=道)缝|(?<=裂)缝|(?<=的)缝(?=里)"), "凤"),          # 一道缝 fèng
        (re.compile(r"薄(?=毯子|薄的雾)|(?<=薄)薄(?=的雾)"), "雹"),          # 薄毯子 báo
        (re.compile(r"铺(?=上了)"), "扑"),                                  # 好像铺上了 pū
        (re.compile(r"盛(?=满)"), "成"),                                    # 盛满清水 chéng
        (re.compile(r"似(?=的)"), "是"),                                    # 像扇子似的 shì
        (re.compile(r"似(?!的)"), "四"),                                    # 春风似剪刀、天似穹庐 sì
        (re.compile(r"笼(?=盖)"), "拢"),                                    # 笼盖四野 lǒng
        (re.compile(r"朝(?=他飞来)"), "潮"),                                # 朝他飞来 cháo
        (re.compile(r"系(?=在门前)"), "计"),                                # 系在门前树上 jì
        (re.compile(r"(?<=上)结(?=一个|着一个)|(?<=都)结(?=果了)"), "街"),   # 烟囱上结一个苹果、都结果了 jiē
        (re.compile(r"背(?=着)"), "杯"),                                    # 背着 bēi
        (re.compile(r"待(?=不住|在)"), "呆"),                               # 待在 dāi
        (re.compile(r"炸(?=酱面)"), "闸"),                                  # 炸酱面 zhá
        (re.compile(r"扎(?=了一只|好的)"), "匝"),                           # 扎了一只风筝 zā
        (re.compile(r"倒(?=映|垃圾|过来|挺)"), "到"),                        # 倒映 dào
        (re.compile(r"钉(?=着)"), "定"),                                    # 钉着 dìng
        (re.compile(r"磨(?=成粉|坊)"), "末"),                               # 磨成粉、磨坊 mò
        (re.compile(r"(?<=勤)为(?=径)|(?<=称他)为|(?<=四海)为(?=家)|(?<=难)为(?=情)"), "围"),  # 勤为径、尊称他为、四海为家、难为情 wéi
        (re.compile(r"(?<=秋)处(?=露)|处(?=于)"), "楚"),                    # 秋处露秋寒霜降、处于 chǔ
        (re.compile(r"(?<=刚)没(?=过)"), "末"),                             # 刚没过小腿 mò
        (re.compile(r"(?<=睡大|安稳)觉"), "叫"),                            # 睡大觉 jiào
        (re.compile(r"(?<=怕)得(?=鱼惊)"), "德"),                           # 怕得鱼惊不应人 dé
        (re.compile(r"(?<=不)应(?=人)"), "硬"),                             # 不应人 yìng
        (re.compile(r"(?<=哪|两)种(?=树)"), "肿"),                          # 哪种树 zhǒng（不是「种树」）
        (re.compile(r"(?<=春)种|(?<=农民)种|种(?=在山坡|得不|的稻子)"), "众"),       # 春种一粒粟、农民种稻子 zhòng
        (re.compile(r"长(?=高|成|满|啊|着长|大)|(?<=先|快)长|(?<=帮它们)长|(?<=草)长(?=蝴蝶|莺)|(?<=根不)长"), "掌"),  # 长高 zhǎng
        (re.compile(r"当(?=一名)"), "裆"),                                  # 当一名 dāng
        (re.compile(r"好(?=客)"), "浩"),                                    # 好客 hào
        (re.compile(r"(?<=树)干"), "赣"),                                   # 树干 gàn
        (re.compile(r"(?<=葡萄)干"), "甘"),                                 # 葡萄干 gān
        (re.compile(r"教(?=室|师|训|诲)"), "叫"),                           # 教室 jiào
        (re.compile(r"当(?=成|作)"), "荡"),                                 # 当作、当成 dàng
        (re.compile(r"(?<!喧)哗"), "花"),                                   # 哗哗、哗啦 huā（象声词）
        (re.compile(r"斗(?=笠)|(?<=北)斗"), "抖"),                          # 斗笠、北斗 dǒu
        (re.compile(r"(?<=羊)圈"), "倦"),                                   # 羊圈 juàn
        (re.compile(r"冠(?=必正)"), "关"),                                  # 冠必正 guān
        (re.compile(r"空(?=地)"), "控"),                                    # 空地 kòng
        # 三年级数学（题目文案里躲不开的，多数本来就读得对，换了也一样）
        (re.compile(r"长(?=加宽|乘宽)|(?<=更|样)长"), "常"),                # 长乘宽、括号长加宽、一样长、周长更长 cháng
        (re.compile(r"重(?=[合叠])"), "虫"),                                # 重合、重叠 chóng
        (re.compile(r"为(?=一个端点)"), "围"),                              # 以点 A 为一个端点 wéi
        (re.compile(r"校(?=验)"), "叫"),                                    # 校验码 jiào
        (re.compile(r"(?<=进)率"), "律"),                                   # 进率 lǜ
        (re.compile(r"(?<=石)磨"), "末"),                                   # 石磨 mò
        (re.compile(r"^只$"), "枝"),                                        # 拆开的量词「只」单独合成时读 zhī（「12只兔子」没录到时拆成小片段）
        # 三年级语文：课文、古诗、问答里的多音字（拼音表按课本注的音；有读音唯一的同音字的直接换，读对的换了也一样）
        (re.compile(r"朝(?=辞|阳)"), "招"),                                 # 朝辞白帝、朝阳 zhāo
        (re.compile(r"(?<=一日)还"), "环"),                                 # 千里江陵一日还 huán
        (re.compile(r"(?<=万)重(?=山)|重(?=瓣|阳)"), "虫"),                  # 万重山、重瓣、重阳节 chóng
        (re.compile(r"扇(?=哪|走|送|得|动)"), "山"),                          # 扇哪扇哪、扇走、扇送、扇动 shān
        (re.compile(r"挑(?=促织)"), "朓"),                                  # 知有儿童挑促织 tiǎo
        (re.compile(r"查(?=慎行)"), "渣"),                                  # 查慎行 zhā
        (re.compile(r"更(?=夫)"), "耕"),                                    # 更夫 gēng
        (re.compile(r"(?<=左)传"), "赚"),                                   # 《左传》zhuàn
        (re.compile(r"论(?=语)"), "轮"),                                    # 《论语》lún
        (re.compile(r"(?<=四)好"), "耗"),                                   # 雅人四好 hào
        (re.compile(r"曾(?=几)"), "增"),                                    # 曾几 zēng
        (re.compile(r"(?<=老)舍|(?<=锲而)舍|(?<=锲而不)舍"), "捨"),           # 老舍、锲而舍之、锲而不舍 shě
        (re.compile(r"(?<=朝)鲜"), "显"),                                   # 朝鲜 xiǎn
        (re.compile(r"(?<=驴)圈"), "倦"),                                   # 驴圈 juàn
        (re.compile(r"系(?=住|眼镜)"), "记"),                               # 系住眼镜 jì
        (re.compile(r"(?<=打|乱)转|(?<=泡泡)转"), "赚"),                     # 打转、乱转、围着泡泡转 zhuàn
        (re.compile(r"(?<=分)行(?=写)|(?<=六十)行|(?<=哪一)行|(?<=只画了一)行"), "航"),  # 分行写、三百六十行 háng
        (re.compile(r"(?<=一)应(?=俱全)"), "英"),                            # 一应俱全 yīng
        (re.compile(r"(?<=扯成)长(?=圆)"), "常"),                            # 长圆 cháng
        (re.compile(r"长(?=着浓|得葱|出嫩)"), "掌"),                          # 长着浓密的胡子、长得葱葱茏茏 zhǎng
        (re.compile(r"(?<=前)爪"), "找"),                                   # 前爪 zhǎo
        (re.compile(r"(?<=兵来)将"), "酱"),                                  # 兵来将挡 jiàng
        (re.compile(r"(?<=见|听)为(?=实|虚)|为(?=异客)|(?<=身)为(?=宋)|(?<=所)为|(?<!可以|所以)(?<=以)为|(?<=认)为|(?<=作)为"), "围"),  # 眼见为实、为异客、以为 wéi
        (re.compile(r"(?<=挑着)担"), "淡"),                                  # 挑着担 dàn
        (re.compile(r"铺(?=满|上|了)"), "扑"),                               # 铺满、铺上 pū
        (re.compile(r"教(?=她|小珍|孩子|小狗)"), "交"),                       # 教她叠花篮 jiāo
        (re.compile(r"处(?=罚|理|分)"), "楚"),                               # 处罚、处理 chǔ
        (re.compile(r"少(?=先队)"), "哨"),                                   # 少先队 shào
        (re.compile(r"大(?=夫)"), "代"),                                     # 白求恩大夫 dài
        (re.compile(r"涨(?=得通红|红)"), "帐"),                              # 脸涨得通红 zhàng
        (re.compile(r"(?<=匀)称"), "衬"),                                    # 匀称 chèn
        (re.compile(r"(?<=凶)相"), "象"),                                    # 凶相 xiàng
        (re.compile(r"夹(?=袄)"), "颊"),                                     # 夹袄 jiá
        (re.compile(r"屏(?=住|息)"), "饼"),                                  # 屏住呼吸 bǐng
        (re.compile(r"(?<=鹿)柴"), "寨"),                                    # 鹿柴 zhài（课本注释）
        (re.compile(r"挨(?=打|了当头)"), "癌"),                              # 挨打、挨了当头一棒 ái
        (re.compile(r"粘(?=在)"), "沾"),                                     # 粘在 zhān
        (re.compile(r"划(?=过|船)"), "滑"),                                  # 划过来、划船 huá
        (re.compile(r"剥(?=离)"), "波"),                                     # 剥离 bō
        (re.compile(r"血(?=丝)"), "谑"),                                     # 血丝 xuè
        (re.compile(r"中(?=了毒)"), "众"),                                   # 中了毒 zhòng
        (re.compile(r"(?<=菜园里)种|种(?=满|下了|菜|田)"), "众"),             # 种了很多蔬菜、种满了花 zhòng
        (re.compile(r"兴(?=冲冲)"), "杏"),                                   # 兴冲冲 xìng
        (re.compile(r"差(?=别|异)"), "插"),                                  # 差别、差异 chā
        (re.compile(r"(?<=硕果)累|(?<=硕果累)累"), "雷"),                     # 硕果累累 léi
        (re.compile(r"(?<=闹)哄|(?<=闹哄)哄"), "烘"),                         # 闹哄哄 hōng
        # 四年级数学
        (re.compile(r"分(?=量)"), "芬"),                                    # 总量与分量 fēn liàng（不是「分量很重」的 fèn）
        (re.compile(r"为(?=一条边|顶点|端点)"), "围"),                       # 以射线 OA 为一条边 wéi
        (re.compile(r"量(?=角|一量|得|出|哪)|(?<=量一)量"), "粮"),            # 量角器、量一量、量得 liáng（「度量」「数量」不动）
    ],
}

# 英文界面的长度 / 质量单位写符号（三年级：mm、cm、dm、m、km、g、kg），合成时换成单词，免得按字母读（m 读成 em、g 读成 gee）；
# 前面是单独的 1 用单数（1 meter），其余用复数（5 meters、how many meters）。
_UNIT_EN = {"mm": "millimeter", "cm": "centimeter", "dm": "decimeter", "km": "kilometer", "m": "meter", "kg": "kilogram", "g": "gram"}


def _unit_en(m: "re.Match[str]") -> str:
    word = _UNIT_EN[m.group(2)]
    return f"1 {word}" if m.group(1) else f"{word}s"


SAY_AS["en"] = [(re.compile(r"(?:(?<![\d.])(1) )?(?<![\w'’.])(mm|cm|dm|km|kg|m|g)\b"), _unit_en)]  # type: ignore[list-item]

# 读一个多音字给的词（语文出题骨架 makers.ts 的 POLY_SAY，「高兴的兴」）：末尾单独那个字合成语音常按它最常见的读音读
# （兴读成 xīng、重读成 zhòng、倒读成 dǎo），换成读音唯一的同音字再合成。逐条用基频比过（YIN + DTW），读得对的不列；
# 改了 POLY_SAY 的词要同步这里（测试查这里的每个词都还在 POLY_SAY 里）。
POLY_TAIL: Dict[str, str] = {
    "长大的长": "掌",
    "互相的相": "香",
    "高兴的兴": "杏",
    "传说的传": "船",
    "仔细的仔": "紫",
    "重复的重": "虫",
    "倒映的倒": "到",
    "钉扣子的钉": "定",
    "担子的担": "但",
    "笼罩的笼": "拢",
    "吐出的吐": "土",
    "石磨的磨": "末",
    "磨坊的坊": "房",
    "哗哗的哗": "花",
    "仿佛的佛": "扶",
    "簸箕的簸": "擘",
    "一切的切": "窃",
    "数学的数": "树",
    "教室的教": "叫",
    "后背的背": "被",
    "干活的干": "赣",
    "都是的都": "兜",
    "结网的结": "洁",
    "北斗的斗": "抖",
    "那里的那": "纳",
    "什么的什": "神",
    "似的的似": "是",
    "下铺的铺": "瀑",
    # 三年级
    "挨打的挨": "癌",
    "挨着的挨": "哀",
    "粘贴的粘": "沾",
    "划船的划": "滑",
    "满载的载": "在",
    "手臂的臂": "必",
    "禁止的禁": "进",
    "不禁的禁": "今",
    "差不多的差": "岔",
    "差别的差": "插",
    "门缝的缝": "凤",
    "缝衣服的缝": "逢",
    "旋转的旋": "玄",
    "旋风的旋": "炫",
    "琢磨的琢": "昨",
    "凶恶的恶": "饿",
    "屏住的屏": "饼",
    "胸脯的脯": "葡",
    "沉闷的闷": "焖",
    "唠叨的唠": "劳",
    "唠叨的叨": "刀",
}
# 放在最前面：先按整个词换末尾，再按上下文换词里的字（倒映的倒 → 倒映的到 → 到映的到）
SAY_AS["zh"] = [(re.compile(f"^{re.escape(w)}$"), w[:-1] + h) for w, h in POLY_TAIL.items()] + SAY_AS["zh"]


# ---------------------------------------------------------------------------
# 工具：解码 / 编码 / 裁静音 / 响度（与拼音学习机 scripts/build-audio.py 相同）
# ---------------------------------------------------------------------------
def find_ffmpeg(explicit: Optional[str]) -> str:
    if explicit:
        return explicit
    exe = shutil.which("ffmpeg")
    if exe:
        return exe
    try:
        import imageio_ffmpeg  # type: ignore

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        sys.exit("找不到 ffmpeg：请安装系统 ffmpeg，或 pip install imageio-ffmpeg，或用 --ffmpeg 指定")


def db(x: float) -> float:
    return 20.0 * np.log10(max(float(x), 1e-12))


def decode(ffmpeg: str, src: Path) -> np.ndarray:
    """ffmpeg 解码为 24k 单声道 float32。"""
    cmd = [ffmpeg, "-v", "error", "-nostdin", "-i", str(src),
           "-f", "f32le", "-acodec", "pcm_f32le", "-ac", "1", "-ar", str(SR), "pipe:1"]
    res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if res.returncode != 0:
        raise RuntimeError(f"解码失败：{res.stderr.decode('utf-8', 'replace').strip()}")
    return np.frombuffer(res.stdout, dtype=np.float32).astype(np.float64)


def encode(ffmpeg: str, pcm: np.ndarray, dst: Path) -> None:
    tmp = dst.with_suffix(".mp3.part")
    cmd = [ffmpeg, "-v", "error", "-nostdin", "-y",
           "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
           "-map_metadata", "-1",
           "-c:a", "libmp3lame", "-b:a", BITRATE, "-ar", str(SR), "-ac", "1",
           "-write_xing", "1", "-id3v2_version", "0",
           "-f", "mp3", str(tmp)]
    res = subprocess.run(cmd, input=pcm.astype(np.float32).tobytes(),
                         stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=False)
    if res.returncode != 0:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"编码失败：{res.stderr.decode('utf-8', 'replace').strip()}")
    os.replace(tmp, dst)


def win_levels(pcm: np.ndarray, w: int, hop: Optional[int] = None) -> Tuple[np.ndarray, np.ndarray]:
    """
    w 个采样一窗的 RMS（线性）与 dB。hop=None：不重叠切块，不足一窗的尾巴补零后一起算；
    hop=h：窗按 h 采样滑动（前缀和实现），最后一个窗是最后一个完整落在 pcm 里的窗。
    """
    if hop is None:
        n = (pcm.size + w - 1) // w
        padded = np.zeros(n * w)
        padded[: pcm.size] = pcm
        rms = np.sqrt(np.mean(padded.reshape(n, w) ** 2, axis=1))
    else:
        cs = np.concatenate([[0.0], np.cumsum(pcm ** 2)])
        starts = np.arange(0, max(1, pcm.size - w + 1), hop)
        rms = np.sqrt(np.maximum(cs[np.minimum(starts + w, pcm.size)] - cs[starts], 0.0) / w)
    return rms, 20.0 * np.log10(np.maximum(rms, 1e-12))


def noise_ceiling(win_db: np.ndarray, c0: int, c1: int, skip_head: int, skip_tail: int) -> float:
    """
    底噪上沿：文件头段 [0, c0) 里远离核心的前一半窗、尾段 (c1, end] 里远离核心的后一半窗，各取 90 分位，
    返回两者较低者。跳过最前 skip_head 窗（编码器起始斜坡）与最后 skip_tail 窗（可能是补零）。
    「远离核心的一半」避开了紧挨核心的起音辅音 / 衰减尾；两侧取低者是为了让一侧的长擦音（f、h…）或结尾换气
    最多只污染一侧的估计。头尾都不足 30ms（源已裁得很紧）时返回 -inf，阈值就完全由输出域电平决定。
    """
    head = win_db[skip_head:c0]
    tail = win_db[c1 + 1 : len(win_db) - skip_tail]
    need = 3 * (WIN // HOP)
    ests = []
    for far in (head[: len(head) // 2], tail[len(tail) - len(tail) // 2 :]):
        if far.size >= need:
            ests.append(float(np.percentile(far, 90)))
    return min(ests) if ests else float("-inf")


def extend_run(above: np.ndarray, first: int, last: int, gap_ok: int) -> Tuple[int, int]:
    """
    从 [first, last]（两端都须为 above）向两端延伸：above 的位置并入，容忍 ≤gap_ok 个连续不 above 的位置。
    等价于：above 位置序列里相邻两点距离 > gap_ok + 1 处断开，取包含 first / last 的那一段的两端。
    """
    idx = np.flatnonzero(above)
    breaks = np.flatnonzero(np.diff(idx) > gap_ok + 1)          # idx[k] 与 idx[k+1] 之间断开
    i0 = int(np.searchsorted(idx, first))
    i1 = int(np.searchsorted(idx, last))
    left = breaks[breaks < i0]
    right = breaks[breaks >= i1]
    start = int(idx[left[-1] + 1]) if left.size else int(idx[0])
    stop = int(idx[right[0]]) if right.size else int(idx[-1])
    return start, stop


def _biquad(b: Tuple[float, float, float], a: Tuple[float, float, float], x: np.ndarray) -> np.ndarray:
    """直接 II 型双二阶滤波（纯 numpy / python 循环太慢，用 scipy 不在依赖里，这里用递推的向量化近似：逐样本循环）。"""
    b0, b1, b2 = b
    a0, a1, a2 = a
    b0, b1, b2, a1, a2 = b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0
    y = np.empty_like(x)
    x1 = x2 = y1 = y2 = 0.0
    for i in range(x.size):
        xi = x[i]
        yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2
        y[i] = yi
        x2, x1, y2, y1 = x1, xi, y1, yi
    return y


def kweight(pcm: np.ndarray) -> np.ndarray:
    """
    ITU-R BS.1770 的 K 加权（高架 +4 dB @ ~1.68 kHz + 高通 @ ~38 Hz），系数按本采样率用 RBJ 公式推出。
    在它上面算的 RMS 与 LUFS 只差一个常数，用来让不同录音来源的「听感响度」对齐（纯 RMS 会被低频 / 底噪带偏）。
    """
    import math

    def shelf(f0: float, gain_db: float, q: float):
        a_ = 10 ** (gain_db / 40)
        w0 = 2 * math.pi * f0 / SR
        cos, sin = math.cos(w0), math.sin(w0)
        alpha = sin / (2 * q)
        sq = 2 * math.sqrt(a_) * alpha
        b = (a_ * ((a_ + 1) + (a_ - 1) * cos + sq), -2 * a_ * ((a_ - 1) + (a_ + 1) * cos), a_ * ((a_ + 1) + (a_ - 1) * cos - sq))
        a = ((a_ + 1) - (a_ - 1) * cos + sq, 2 * ((a_ - 1) - (a_ + 1) * cos), (a_ + 1) - (a_ - 1) * cos - sq)
        return b, a

    def highpass(f0: float, q: float):
        w0 = 2 * math.pi * f0 / SR
        cos, sin = math.cos(w0), math.sin(w0)
        alpha = sin / (2 * q)
        b = ((1 + cos) / 2, -(1 + cos), (1 + cos) / 2)
        a = (1 + alpha, -2 * cos, 1 - alpha)
        return b, a

    y = _biquad(*shelf(1681.974, 3.99984, 0.7071752), pcm)
    return _biquad(*highpass(38.13547, 0.5003270), y)


def voiced_rms(pcm: np.ndarray, t0: int, t1: int, th_db: float, weighted: Optional[np.ndarray] = None) -> float:
    """
    [t0, t1) 里按 10ms 不重叠切窗，取（按原信号）高于阈值的窗算 RMS（句中停顿等静音窗不计入）。
    给了 weighted（K 加权后的信号）就在它上面算 RMS，窗的取舍仍按原信号判。
    """
    rms, wdb = win_levels(pcm[t0:t1], WIN)
    if weighted is None:
        v = rms[wdb > th_db]
        return float(np.sqrt(np.mean(v ** 2))) if v.size else float(np.sqrt(np.mean(rms ** 2)))
    wr, _ = win_levels(weighted[t0:t1], WIN)
    v = wr[wdb > th_db]
    return float(np.sqrt(np.mean(v ** 2))) if v.size else float(np.sqrt(np.mean(wr ** 2)))


def find_voiced(pcm: np.ndarray, weighted: Optional[np.ndarray] = None, target_db: float = TARGET_RMS_DB) -> dict:
    """
    噪声自适应裁静音 + 响度增益，返回 dict：
      t0 / t1        有声段在 pcm 里的起 / 止采样位置（t1 为开区间）
      gain           线性增益（有声窗 RMS → TARGET_RMS_DB，峰值不超过 PEAK_LIMIT_DB）
      peak_limited   是否因峰值限制而没达到目标 RMS
      th / connect   采用的起音阈值 / 连接阈值，noise 底噪上沿（都是源电平 dB）
    全部在「10ms 窗按 2.5ms 步长滑动」的 RMS 序列上进行：
      1. 核心 = 比最响窗低不到 CORE_DROP_DB 的窗；
      2. 底噪上沿 = 头 / 尾远端窗的 90 分位（见 noise_ceiling）；
      3. 两个阈值都按增益后的电平定：连接阈值 = max(CONNECT_OUT_DB - gain_dB, 底噪 + NOISE_MARGIN_DB)，
         起音阈值 = max(EDGE_OUT_DB - gain_dB, 连接阈值)。增益取决于有声区间、区间又取决于阈值，迭代到稳定；
      4. 从核心两端向外延伸，并入所有高于连接阈值的窗，容忍 ≤GAP_MS 的缺口：b/d/g/p/t/k 的除阻爆破与元音之间常隔着
         30–50ms 的弱送气或介音，缺口容忍保证爆破不被丢掉；滑动窗保证跨在 10ms 边界上的短爆破也能被接住；
         连接阈值比起音阈值低 7dB，是为了让 p/t/k 那种很弱的长送气（归一后 -45 dBFS 上下）也连得上；
      5. t0 = 这段里最早高于起音阈值的窗的起点，t1 = 最晚高于起音阈值的窗的终点（段两端低于起音阈值的部分
         归一后本来就在 -45 dBFS 以下，舍掉）。于是输出里起音后的第一个 10ms、结束前的最后一个 10ms 都高于
         起音阈值，起音前那 10ms（淡入区）在其之下。
    """
    per = WIN // HOP
    rms, sdb = win_levels(pcm, WIN, HOP)
    if sdb.max() <= EDGE_OUT_DB:
        raise RuntimeError(f"整个文件都低于 {EDGE_OUT_DB:g} dBFS（最大 10ms 窗 RMS {sdb.max():.1f} dBFS）")
    core = np.flatnonzero(sdb >= sdb.max() - CORE_DROP_DB)
    c0, c1 = int(core[0]), int(core[-1])
    noise = noise_ceiling(sdb, c0, c1, skip_head=2 * per, skip_tail=per)
    core_peak = float(np.max(np.abs(pcm[c0 * HOP : c1 * HOP + WIN])))
    peak_lin = 10 ** (PEAK_LIMIT_DB / 20)
    gap_ok = GAP_MS * SR // 1000 // HOP

    def bounds(th_connect: float, th_edge: float) -> Tuple[int, int]:
        first, last = extend_run(sdb > th_connect, c0, c1, gap_ok)
        edge = np.flatnonzero(sdb[first : last + 1] > th_edge) + first    # 核心本身高于 th_edge，非空
        return int(edge[0]), int(edge[-1])

    gain_db = 0.0
    connect = max(CONNECT_OUT_DB, noise + NOISE_MARGIN_DB)
    th = max(EDGE_OUT_DB, connect)
    limited = False
    for _ in range(10):
        first, last = bounds(connect, th)
        g = 10 ** (target_db / 20) / max(voiced_rms(pcm, first * HOP, last * HOP + WIN, th, weighted), 1e-9)
        limited = core_peak * g > peak_lin
        gain = peak_lin / core_peak if limited else g
        gain_db = 20.0 * np.log10(gain)
        connect_new = max(CONNECT_OUT_DB - gain_db, noise + NOISE_MARGIN_DB)
        th_new = max(EDGE_OUT_DB - gain_db, connect_new)
        done = abs(th_new - th) < 0.05 and abs(connect_new - connect) < 0.05
        connect, th = connect_new, th_new
        if done:
            break
    first, last = bounds(connect, th)
    return {"t0": first * HOP, "t1": min(pcm.size, last * HOP + WIN), "gain": gain,
            "peak_limited": limited, "th": th, "connect": connect, "noise": noise}


def take(pcm: np.ndarray, start: int, stop: int) -> np.ndarray:
    """pcm[start:stop]，越界部分补零（保证长度恒为 stop - start）。"""
    out = np.zeros(stop - start)
    a, b = max(0, start), min(pcm.size, stop)
    if b > a:
        out[a - start : b - start] = pcm[a:b]
    return out




def process(ffmpeg: str, src: Path, dst: Path) -> int:
    """解码 → 裁静音 → 归一 → 编码，返回时长（ms）。"""
    pcm = decode(ffmpeg, src)
    if pcm.size == 0:
        raise RuntimeError("解码得到 0 个采样")
    weighted = kweight(pcm)
    v = find_voiced(pcm, weighted, TARGET_RMS_DB)
    t0, t1 = v["t0"], v["t1"]

    ms = lambda n: n * SR // 1000  # noqa: E731
    ramp = take(pcm, t0 - ms(LEAD_RAMP_MS), t0) * np.linspace(0.0, 1.0, ms(LEAD_RAMP_MS), endpoint=False)
    n_fade = ms(TAIL_FADE_MS)
    fade = take(pcm, t1, t1 + n_fade) * (0.5 + 0.5 * np.cos(np.pi * np.arange(n_fade) / n_fade))
    seg = np.concatenate([np.zeros(ms(LEAD_SILENCE_MS)), ramp, pcm[t0:t1], fade, np.zeros(ms(TAIL_SILENCE_MS))])

    gain = v["gain"]
    peak = float(np.max(np.abs(seg)))
    if peak * gain > 10 ** (PEAK_LIMIT_DB / 20):     # 核心之外还有更高的峰（极少见）
        gain = 10 ** (PEAK_LIMIT_DB / 20) / peak
    encode(ffmpeg, seg * gain, dst)
    return int(round(seg.size * 1000 / SR))


# ---------------------------------------------------------------------------
# 合成
# ---------------------------------------------------------------------------
def spoken(lang: str, text: str) -> str:
    """送给 edge-tts 的文字（按 SAY_AS 换掉会读错的多音字）。"""
    for pat, sub in SAY_AS.get(lang, []):
        text = pat.sub(sub, text)
    return text


def clip_name(lang: str, text: str) -> str:
    """<lang>-<sha1(读法)[:10]>：一般就是片段文本的哈希，按 SAY_AS 换过读法的取换过的文字的哈希。"""
    return f"{lang}-{hashlib.sha1(spoken(lang, text).encode('utf-8')).hexdigest()[:10]}"


def cache_path(cache: Path, lang: str, text: str) -> Path:
    """text 是送给 edge-tts 的文字（spoken() 之后）。"""
    digest = hashlib.sha1(f"{VOICES[lang]}|{TTS_RATE}|{text}".encode("utf-8")).hexdigest()[:12]
    return cache / f"tts-{lang}-{digest}.mp3"


def synth_one(lang: str, text: str, dst: Path) -> str:
    """edge-tts 合成到 dst，失败重试 3 次；返回错误信息（空串 = 成功）。"""
    last = ""
    for attempt in range(1, 4):
        tmp = dst.with_suffix(".part.mp3")
        cmd = [sys.executable, "-m", "edge_tts", "--voice", VOICES[lang], f"--rate={TTS_RATE}",
               "--text", text, "--write-media", str(tmp)]
        try:
            res = subprocess.run(cmd, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=60, check=False)
            last = res.stderr.decode("utf-8", "replace").strip()[-300:]
            if res.returncode == 0 and tmp.is_file() and tmp.stat().st_size > 0:
                os.replace(tmp, dst)
                return ""
        except subprocess.TimeoutExpired:
            last = "超时"
        tmp.unlink(missing_ok=True)
        time.sleep(2 * attempt)
    return last or "未知错误"


def synth_all(todo: List[Tuple[str, str, Path]], jobs: int) -> Dict[Tuple[str, str], str]:
    """并行合成一批 (lang, 送给 edge-tts 的文字, cache_file)；返回失败项 → 错误信息。"""
    errors: Dict[Tuple[str, str], str] = {}
    if not todo:
        return errors
    print(f"合成 {len(todo)} 条（{jobs} 并行）…")
    t0 = time.time()
    done = 0
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as ex:
        futures = {ex.submit(synth_one, lang, text, p): (lang, text) for lang, text, p in todo}
        for fut in futures:
            err = fut.result()
            done += 1
            if done % 50 == 0 or done == len(todo):
                print(f"  {done}/{len(todo)}  {time.time() - t0:.0f}s")
            if err:
                errors[futures[fut]] = err
    return errors


# ---------------------------------------------------------------------------
# 主流程
# ---------------------------------------------------------------------------
def write_credits(out: Path, counts: Dict[str, int]) -> None:
    lines = [
        "# 音频来源",
        "",
        "这里的 mp3 是题目朗读用的片段（数字、短语、emoji 的名字、运算符的读法、语文的课文句子与字词），由 `scripts/build-audio.py` 生成：",
        "",
    ]
    for lang, voice in VOICES.items():
        lines.append(f"- `{lang}-*.mp3`（{counts.get(lang, 0)} 条）：Microsoft Edge 神经语音 {voice}（edge-tts，语速 {TTS_RATE}）合成，")
        lines.append("  裁静音、响度归一到 -18 dB 后转成 24 kHz 单声道 48 kbps。")
    lines += [
        "",
        "文件名是 `<语言>-<片段文本的 sha1 前 10 位>`，文本 → 文件名的对应表在 `src/audio/manifest.json`，",
        "片段清单在 `src/audio/corpus.json`。合成语音仅供学习使用。",
        "",
    ]
    (out / "CREDITS.md").write_text("\n".join(lines), encoding="utf-8")


def main() -> int:
    ap = argparse.ArgumentParser(description="生成朗读音频包")
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT, help=f"输出目录（默认 {DEFAULT_OUT}）")
    ap.add_argument("--tts-cache", type=Path, default=DEFAULT_TTS_CACHE, help=f"合成结果缓存（默认 {DEFAULT_TTS_CACHE}）")
    ap.add_argument("--ffmpeg", help="ffmpeg 可执行文件路径")
    ap.add_argument("--jobs", type=int, default=TTS_JOBS, help=f"合成并行数（默认 {TTS_JOBS}）")
    ap.add_argument("--dry-run", action="store_true", help="只报告要合成 / 处理 / 删除什么")
    args = ap.parse_args()

    if not CORPUS.is_file():
        sys.exit(f"找不到 {CORPUS}：先运行 node scripts/collect-speech.mjs")
    corpus: Dict[str, List[str]] = json.loads(CORPUS.read_text(encoding="utf-8"))
    ffmpeg = find_ffmpeg(args.ffmpeg)
    out: Path = args.out
    cache: Path = args.tts_cache
    out.mkdir(parents=True, exist_ok=True)
    cache.mkdir(parents=True, exist_ok=True)

    # 期望的文件集合；已经存在的成品不重做（读法相同 → 文件名相同 → 内容相同）
    wanted: Dict[str, Tuple[str, str]] = {}          # 文件名 → (lang, text)
    for lang, texts in corpus.items():
        if lang not in VOICES:
            sys.exit(f"语料里有不认识的语言 {lang!r}（VOICES 里没有对应音色）")
        for text in texts:
            wanted[clip_name(lang, text)] = (lang, text)
    existing = {p.stem for p in out.glob("*.mp3")}
    to_make = {name: lt for name, lt in wanted.items() if name not in existing}
    stale = sorted(existing - set(wanted))
    to_synth = sorted({(lang, spoken(lang, text), cache_path(cache, lang, spoken(lang, text)))
                       for lang, text in to_make.values() if not cache_path(cache, lang, spoken(lang, text)).is_file()})
    print(f"语料 {len(wanted)} 条：已有 {len(wanted) - len(to_make)}，待处理 {len(to_make)}（其中待合成 {len(to_synth)}），多余 {len(stale)}")
    if args.dry_run:
        for name, (lang, text) in sorted(to_make.items()):
            say = spoken(lang, text)
            print(f"  + {name}  [{lang}] {text}" + (f"（读作 {say}）" if say != text else ""))
        for name in stale:
            print(f"  - {name}")
        return 0

    problems: List[str] = []
    errors = synth_all(to_synth, args.jobs)
    for (lang, say), err in errors.items():
        problems.append(f"合成失败 [{lang}]「{say}」：{err}")

    if to_make:
        print(f"处理 {len(to_make)} 条…")
    for name, (lang, text) in sorted(to_make.items()):
        say = spoken(lang, text)
        if (lang, say) in errors:
            continue
        try:
            process(ffmpeg, cache_path(cache, lang, say), out / f"{name}.mp3")
        except RuntimeError as e:
            problems.append(f"处理失败 [{lang}]「{text}」：{e}")

    for name in stale:
        (out / f"{name}.mp3").unlink(missing_ok=True)
    if stale:
        print(f"删除不再需要的 {len(stale)} 条")

    # manifest：只登记真的存在的文件
    manifest: Dict[str, object] = {"version": 1, "voices": VOICES}
    counts: Dict[str, int] = {}
    for lang in VOICES:
        table = {}
        for text in sorted(corpus.get(lang, [])):
            name = clip_name(lang, text)
            if (out / f"{name}.mp3").is_file():
                table[text] = name
        manifest[lang] = table
        counts[lang] = len(table)
    MANIFEST.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_credits(out, counts)
    total = sum(p.stat().st_size for p in out.glob("*.mp3"))
    print(f"完成：{' / '.join(f'{k} {v} 条' for k, v in counts.items())}，共 {total / 1024 / 1024:.1f} MB → {out}")
    if problems:
        print(f"\n{len(problems)} 个问题：")
        for p in problems:
            print("  " + p)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
