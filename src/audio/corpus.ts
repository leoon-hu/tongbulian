/**
 * 朗读语料：把所有可能读出来的片段收齐（生成音频包的输入，也是 manifest 测试的依据）。
 * - 数字 0–100 与中文的「两」：题目里的数都在这个范围
 * - 外壳固定句：正确答案是 / 鼓励语 / 结算 / 对战的开始与胜负播报 / 页面打开时自动读的提示语
 * - 每个知识点用固定种子跑三档难度各 CORPUS_SEEDS 题，题干与答案的片段全部收进来
 * 种子固定，所以结果是确定的；模板改了、生成器改了，这里的集合跟着变，测试会提醒重跑 npm run audio。
 */
import type { Lang } from '@/types/models'
import { createRng, getGenerator } from '@/engine'
import { allCourses } from '@/engine/catalog'
import { answerSpeech, phraseSpeech, questionSpeech, RIGHT_KEYS } from '@/engine/speech'

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
  'battle.half.red',
  'battle.half.blue',
  // 开场规则句与结束语（B39）：每种有专属话的皮肤一条 + default
  ...['default', 'race', 'car', 'rocket', 'balloon', 'tower', 'tug', 'ice'].flatMap((id) => [`battle.rule.${id}`, `battle.finish.${id}`]),
  // 页面打开 / 切换功能时自动读的提示语（B39a）：设置页「跟谁打」与三种模式的说明、问名字、退出确认，
  // 房间的二维码页说明、「以另一队进入」提示、三方连接状态窗口、输口令面板，以及孩子会看到的错误提示
  'battle.who',
  'battle.mode.ai.desc',
  'battle.mode.duo.desc',
  'battle.mode.online.desc',
  'battle.name.ask',
  'battle.exit.ask',
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
]

export function collectCorpus(): Record<Lang, string[]> {
  const sets: Record<Lang, Set<string>> = { zh: new Set(), en: new Set() }
  const langs: Lang[] = ['zh', 'en']
  for (const lang of langs) {
    for (let n = 0; n <= 100; n++) sets[lang].add(String(n))
    for (const key of FIXED_KEYS) for (const t of phraseSpeech({ k: key }, lang)) sets[lang].add(t)
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
            for (const t of questionSpeech(q, lang)) sets[lang].add(t)
            for (const t of answerSpeech(q, lang)) sets[lang].add(t)
          }
        }
      }
    }
  }
  return { zh: [...sets.zh].sort(), en: [...sets.en].sort() }
}
