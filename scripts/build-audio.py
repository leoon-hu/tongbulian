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
def clip_name(lang: str, text: str) -> str:
    return f"{lang}-{hashlib.sha1(text.encode('utf-8')).hexdigest()[:10]}"


def cache_path(cache: Path, lang: str, text: str) -> Path:
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
    """并行合成一批 (lang, text, cache_file)；返回失败项 → 错误信息。"""
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
        "这里的 mp3 是题目朗读用的片段（数字、短语、emoji 的名字、运算符的读法），由 `scripts/build-audio.py` 生成：",
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

    # 期望的文件集合；已经存在的成品不重做（文本相同 → 文件名相同 → 内容相同）
    wanted: Dict[str, Tuple[str, str]] = {}          # 文件名 → (lang, text)
    for lang, texts in corpus.items():
        if lang not in VOICES:
            sys.exit(f"语料里有不认识的语言 {lang!r}（VOICES 里没有对应音色）")
        for text in texts:
            wanted[clip_name(lang, text)] = (lang, text)
    existing = {p.stem for p in out.glob("*.mp3")}
    to_make = {name: lt for name, lt in wanted.items() if name not in existing}
    stale = sorted(existing - set(wanted))
    to_synth = [(lang, text, cache_path(cache, lang, text)) for lang, text in to_make.values()
                if not cache_path(cache, lang, text).is_file()]
    print(f"语料 {len(wanted)} 条：已有 {len(wanted) - len(to_make)}，待处理 {len(to_make)}（其中待合成 {len(to_synth)}），多余 {len(stale)}")
    if args.dry_run:
        for name, (lang, text) in sorted(to_make.items()):
            print(f"  + {name}  [{lang}] {text}")
        for name in stale:
            print(f"  - {name}")
        return 0

    problems: List[str] = []
    errors = synth_all(to_synth, args.jobs)
    for (lang, text), err in errors.items():
        problems.append(f"合成失败 [{lang}]「{text}」：{err}")

    if to_make:
        print(f"处理 {len(to_make)} 条…")
    for name, (lang, text) in sorted(to_make.items()):
        if (lang, text) in errors:
            continue
        try:
            process(ffmpeg, cache_path(cache, lang, text), out / f"{name}.mp3")
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
