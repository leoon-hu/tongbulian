/**
 * 朗读语料：把所有可能读出来的片段收齐（生成音频包的输入，也是 manifest 测试的依据）。
 * - 数字 0–100 与中文的「两」：题目里的数都在这个范围
 * - 外壳固定句：正确答案是 / 鼓励语 / 结算 / 对战的开始与胜负播报 / 页面打开时自动读的提示语
 * - 每个知识点用固定种子跑三档难度各 CORPUS_SEEDS 题，题干与答案的片段全部收进来
 * - 并成一条的短语（「有14个」「比小猪」，F14）除了它本身，拆开的小片段（「有」「14」「个」）也收：种子里没枚举到的
 *   组合在播放时拆回小片段照样有音频，不用退 TTS
 * 停顿标记 PAUSE 不是音频，不收。种子固定，所以结果是确定的；模板改了、生成器改了，这里的集合跟着变，测试会提醒重跑 npm run audio。
 */
import type { Lang } from '@/types/models'
import { createRng, getGenerator } from '@/engine'
import { allCourses } from '@/engine/catalog'
import { answerSpeech, PAUSE, phraseSpeech, piecesOf, questionSpeech, RIGHT_KEYS } from '@/engine/speech'
import { LINE_KEYS } from '@/battle/lines'

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
  'robot.ready',
  'robot.lead',
  'robot.behind',
  'robot.worry',
  'robot.lose',
  'robot.win',
  // 角色的台词（B71）：25 个角色各 3 句
  ...LINE_KEYS,
  // 开场规则句与结束语（B39）：每种有专属话的皮肤一条 + default
  ...['default', 'race', 'car', 'train', 'rocket', 'balloon', 'swim', 'ladder', 'dig', 'fish', 'tower', 'flower', 'egg', 'bubble', 'fruit', 'stars', 'puzzle', 'tug', 'seesaw', 'flag', 'ice', 'castle'].flatMap((id) => [`battle.rule.${id}`, `battle.finish.${id}`]),
  // 页面打开 / 切换功能时自动读的提示语（B39a）：设置页「跟谁打」与三种模式的说明、问名字、退出确认，
  // 房间的二维码页说明、「以另一队进入」提示、三方连接状态窗口、输口令面板，以及孩子会看到的错误提示
  'battle.who',
  'battle.mode.ai.desc',
  'battle.mode.duo.desc',
  'battle.mode.online.desc',
  'battle.name.ask',
  'battle.exit.ask',
  // 地图上点知识点弹出的「自己练，还是对战？」（B26）
  'entry.ask',
  'room.scan',
  'room.enter.hint.red',
  'room.enter.hint.blue',
  'room.wait.title',
  'room.wait.sub',
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
]

export function collectCorpus(): Record<Lang, string[]> {
  const sets: Record<Lang, Set<string>> = { zh: new Set(), en: new Set() }
  const langs: Lang[] = ['zh', 'en']
  const add = (lang: Lang, tokens: string[]): void => {
    for (const t of tokens) {
      if (t === PAUSE) continue
      sets[lang].add(t)
      for (const piece of piecesOf(t, lang)) sets[lang].add(piece)
    }
  }
  for (const lang of langs) {
    for (let n = 0; n <= 100; n++) sets[lang].add(String(n))
    for (const key of FIXED_KEYS) add(lang, phraseSpeech({ k: key }, lang))
  }
  sets.zh.add('两')
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
