/**
 * 朗读语料：把所有可能读出来的片段收齐（生成音频包的输入，也是 manifest 测试的依据）。
 * - 数字 0–100 与中文的「两」：题目里的数都在这个范围
 * - 外壳固定句：正确答案是 / 鼓励语 / 结算 / 对战的开始与胜负播报 / 页面打开时自动读的提示语
 * - 每个知识点用固定种子跑三档难度各 CORPUS_SEEDS 题，题干与答案的片段全部收进来；语文的条目有限，另外逐条出一遍（一句课文都不漏）
 * - 汉字写的序数（排队题「从左数第三个是谁」）不是数字槽、拆不回小片段，全部说法逐个收
 * - 并成一条的短语（「有14个」「比小猪」，F14）除了它本身，拆开的小片段（「有」「14」「个」）也收：种子里没枚举到的
 *   组合在播放时拆回小片段照样有音频，不用退 TTS
 * 停顿标记 PAUSE 不是音频，不收。种子固定，所以结果是确定的；模板改了、生成器改了，这里的集合跟着变，测试会提醒重跑 npm run audio。
 */
import type { Lang } from '@/types/models'
import { createRng, getGenerator } from '@/engine'
import { allCourses } from '@/engine/catalog'
import { answerSpeech, PAUSE, phraseSpeech, piecesOf, questionSpeech, RIGHT_KEYS, tokenVoice } from '@/engine/speech'
import { LINE_KEYS } from '@/battle/lines'
import { everyItemQuestion as chineseG1Items } from '@/content/chinese/grade1/generators'
import { everyItemQuestion as chineseG2Items } from '@/content/chinese/grade2/generators'
import { everyPosFrom } from '@/content/math/grade1/generators/position'
// 按需加载的数学包（三年级）：语料要跑遍所有知识点，这里直接导入（语文包由上面两行导入）
import '@/content/math/grade3'

export const CORPUS_SEEDS = 300

const FIXED_KEYS = [
  'practice.answerIs',
  'summary.success',
  'summary.scorePre',
  'summary.scorePost',
  ...RIGHT_KEYS,
  // 对战（B39）：开始、胜负播报、横屏提示；队名是固定词条，昵称不读
  'battle.getReady',
  'battle.go',
  'battle.win.red',
  'battle.win.blue',
  'battle.close',
  'battle.rotate',
  'battle.streak',
  'battle.lead',
  'battle.nearWin',
  'battle.deuce',
  'battle.half.red',
  'battle.half.blue',
  // 表情 🔥 加油（B58）：飞出去时朗读一声
  'emote.cheer',
  // 机器人的话（B61）
  'robot.lead',
  'robot.behind',
  'robot.worry',
  'robot.lose',
  'robot.win',
  // 角色的台词（B71）：25 个角色各 3 句
  ...LINE_KEYS,
  // 开场规则句与结束语（B39）：每种有专属话的皮肤一条 + default
  ...['default', 'race', 'car', 'train', 'rocket', 'balloon', 'swim', 'ladder', 'dig', 'fish', 'tower', 'flower', 'egg', 'bubble', 'fruit', 'stars', 'puzzle', 'tug', 'seesaw', 'flag', 'ice', 'castle'].flatMap((id) => [`battle.rule.${id}`, `battle.finish.${id}`]),
  // 页面打开 / 切换功能时自动读的提示语（B39a）：设置页「怎么练？」与四张卡的说明（含自己练，B26）、改名字、退出确认，
  // 房间的二维码页说明、「以另一队进入」提示、三方连接状态窗口、输口令面板，以及孩子会看到的错误提示
  'battle.how',
  'battle.mode.ai.desc',
  'battle.mode.duo.desc',
  'battle.mode.online.desc',
  'battle.mode.practice.desc',
  'battle.name.ask',
  'battle.exit.ask',
  'room.scan',
  'room.enter.hint.red',
  'room.enter.hint.blue',
  'room.wait.title',
  'room.wait.sub',
  'room.wait.sub.coop',
  'room.join.title',
  'room.join.hint',
  'room.join.wrong',
  'room.connect.slow',
  ...['noRoom', 'closed', 'replaced', 'version', 'full', 'busy', 'teamFull', 'started', 'locked', 'notHost', 'bad'].map((e) => `room.error.${e}`),
  // 语音（B57）：开 / 关、出错提示、「一个屋子里就不用开」
  'mic.on',
  'mic.off',
  'mic.denied',
  'mic.unsupported',
  'mic.full',
  'mic.hint',
  'mic.lost',
  'mic.failed',
  'mic.crowded',
  // 打怪兽（第 10 章）：设置页卡片的说明（M5）、开场规则、打倒 / 下一只 / 最后十秒 / 时间到的提示、Boss 的话、结束播报（M11）
  'boss.mode.solo.desc',
  'boss.mode.ai.coop.desc',
  'boss.mode.ai.versus.desc',
  'boss.mode.duo.coop.desc',
  'boss.mode.duo.versus.desc',
  'boss.mode.online.coop.desc',
  'boss.mode.online.versus.desc',
  'boss.rule.coop',
  'boss.rule.versus',
  'boss.down',
  'boss.in.2',
  'boss.in.3',
  'boss.in.gold',
  'boss.lastTen',
  'boss.timeUp',
  'boss.taunt',
  'boss.roar',
  'boss.jelly',
  'boss.tickle',
  'boss.paused',
  'boss.record',
  'boss.result.none',
  'boss.tie',
]

/** 打怪兽结束播报「一起把捣蛋龙打倒了 n 次」的 n 收到多少（M11；两个人 120 秒也很难打倒这么多次） */
export const BOSS_RESULT_MAX = 40

export function collectCorpus(): Record<Lang, string[]> {
  const sets: Record<Lang, Set<string>> = { zh: new Set(), en: new Set() }
  const langs: Lang[] = ['zh', 'en']
  const add = (lang: Lang, tokens: string[]): void => {
    for (const raw of tokens) {
      if (raw === PAUSE) continue
      // 英文界面里标过的中文内容（语文，Y6）归到中文
      const { text: t, lang: voice } = tokenVoice(raw, lang)
      sets[voice].add(t)
      for (const piece of piecesOf(t, voice)) sets[voice].add(piece)
    }
  }
  for (const lang of langs) {
    for (let n = 0; n <= 100; n++) sets[lang].add(String(n))
    for (const key of FIXED_KEYS) add(lang, phraseSpeech({ k: key }, lang))
    for (let n = 1; n <= BOSS_RESULT_MAX; n++) for (const k of ['boss.result.coop', 'boss.result.solo']) add(lang, phraseSpeech({ k, p: { n } }, lang))
  }
  sets.zh.add('两')
  // 语文的题目条目有限，逐条出一遍（随机抽样可能漏掉某一句课文、某个听音的字）
  for (const q of [...chineseG1Items(), ...chineseG2Items()]) {
    for (const lang of langs) {
      add(lang, questionSpeech(q, lang))
      add(lang, answerSpeech(q, lang))
    }
  }
  // 「从左数第三个是谁」：第几个是汉字、不是数字槽，每种说法逐个收（抽样漏掉的组合拆不回小片段）
  for (const l of everyPosFrom()) for (const lang of langs) add(lang, phraseSpeech(l, lang))
  for (const course of allCourses()) {
    for (const kp of course.knowledgePoints) {
      const gen = getGenerator(kp.id)
      if (!gen) continue
      for (let seed = 1; seed <= CORPUS_SEEDS; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          for (const lang of langs) {
            add(lang, questionSpeech(q, lang))
            add(lang, answerSpeech(q, lang))
          }
        }
      }
    }
  }
  return { zh: [...sets.zh].sort(), en: [...sets.en].sort() }
}
