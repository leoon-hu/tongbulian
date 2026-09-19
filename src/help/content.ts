/**
 * 帮助页的内容（需求 F17）：学习内容 / 题目说明、对战玩法、规则、技巧、常见问题。
 * 应用里的帮助页（views/HelpView.vue，随语言切换）和给搜索引擎的静态页（seo/site.ts，只有中文）用同一份。
 * 只依赖目录与皮肤注册表（知识点数、游戏名与规则句都是算出来的，不手写数字）。
 */
import type { Lang } from '@/types/models'
import { getGenerator } from '@/engine'
import { liveCourses } from '@/engine/catalog'
import { translate } from '@/engine/i18n'
import { SKINS, finishKey, ruleKey } from '@/battle/skins'

export type HelpBlock =
  | { kind: 'p'; text: string }
  | { kind: 'list'; items: string[] }
  | { kind: 'steps'; items: string[] }
  /** 每种游戏一行：图标、名字、开场规则句、结束语 */
  | { kind: 'games' }
  | { kind: 'faq'; items: { q: string; a: string }[] }

export type HelpSectionId = 'learn' | 'play' | 'rules' | 'tips' | 'faq'

export interface HelpSection {
  id: HelpSectionId
  icon: string
  title: string
  blocks: HelpBlock[]
}

export interface HelpGame {
  id: string
  icon: string
  name: string
  rule: string
  finish: string
}

export const HELP_TITLE: Record<Lang, string> = { zh: '帮助与说明', en: 'Help & guide' }
export const HELP_LEAD: Record<Lang, string> = {
  zh: '同步练怎么用：学习内容和题目、对战怎么玩、规则、技巧、常见问题。',
  en: 'How Chapter Practice works: what to learn, how the battle mode works, its rules, tips and FAQ.',
}

/** 「一年级数学 26 个知识点、二年级数学 29 个知识点」 */
function coverage(lang: Lang): string {
  return liveCourses()
    .map((lc) => {
      const n = lc.course.knowledgePoints.filter((kp) => getGenerator(kp.id)).length
      const name = translate({ k: 'course.name', p: { grade: lc.grade.title, subject: lc.subject.title } }, lang)
      return lang === 'zh' ? `${name} ${n} 个知识点` : `${name} (${n} topics)`
    })
    .join(lang === 'zh' ? '、' : ', ')
}

/** 每种游戏的名字、开场规则句与结束语（3D 试点用火箭的话） */
export function helpGames(lang: Lang): HelpGame[] {
  return SKINS.map((s) => ({
    id: s.id,
    icon: s.icon,
    name: translate({ k: `skin.${s.id}` }, lang),
    rule: translate({ k: ruleKey(s.id) }, lang),
    finish: translate({ k: finishKey(s.id) }, lang),
  }))
}

export function helpSections(lang: Lang): HelpSection[] {
  const games = SKINS.length
  if (lang === 'en') {
    return [
      {
        id: 'learn',
        icon: '📚',
        title: 'What to learn & the questions',
        blocks: [
          {
            kind: 'p',
            text: `Questions follow the units of the current PEP (People's Education Press) textbooks for primary school Chinese, math and English, grades 1–6. Available now: ${coverage('en')}. More grades and subjects are being added.`,
          },
          {
            kind: 'p',
            text: 'Questions are not copied from a bank: every round of 8 is generated for the topic at textbook difficulty. An unfinished round continues next time with the same questions; a finished round gets a check mark and the next visit starts a new one.',
          },
          {
            kind: 'list',
            items: [
              'Number pad: type the answer, ⌫ deletes, ✓ submits.',
              'Four choices: tap one card to answer.',
              'Visual aids in the question: ten-frames, objects, clock faces, money, shapes, number lines, rulers, column arithmetic, line-ups and more.',
            ],
          },
          {
            kind: 'p',
            text: 'Every Chinese character carries pinyin, each question is read aloud when it appears, and 🔊 reads it again. A wrong answer shows and reads the correct one, with a demonstration where a visual aid applies (making ten and breaking ten are animated). No timer, no penalty, no leaderboard.',
          },
          {
            kind: 'p',
            text: 'Free, no ads, no account. Progress is stored only in this browser. Switch between 中文 and English at the top; questions, pinyin and speech follow.',
          },
        ],
      },
      {
        id: 'play',
        icon: '⚔️',
        title: 'How the battle mode works',
        blocks: [
          {
            kind: 'steps',
            items: [
              'Enter: turn on "⚔️ Battle" at the top right of the topic map, then tap a topic; or tap ⚔️ in the header of a practice page.',
              'Who to play: "vs robot" (the robot has its own questions and three speeds 🐢 🐰 🚀) or "two on one device" (one tablet sideways, each side answers its own questions and can tap at the same time). "Own devices" is coming.',
              `Pick a game: ${games} game scenes, or 🎲 random for a new one every match.`,
              'The first time you are asked for a name; pick a ready-made one. It is not asked again.',
              'Start: the game explains its rule in one sentence, then "Ready… 3, 2, 1, go!" and both sides get their first question.',
            ],
          },
          {
            kind: 'p',
            text: 'The arena is always landscape: red team on the left, blue team on the right, the game scene across the top or in the middle. Each player has a row: the question on top (tap it or 🔊 to hear it again), the number pad or choice cards below. A phone held upright asks you to turn it sideways.',
          },
          {
            kind: 'p',
            text: 'When it ends, the result page shows the winner, score, time and each player\'s "answered n · correct m", with "play again" (same people and game, new questions), "change game" and "leave".',
          },
        ],
      },
      {
        id: 'rules',
        icon: '📜',
        title: 'Rules',
        blocks: [
          {
            kind: 'list',
            items: [
              'First team to 8 correct answers wins. Each side gets its own questions from the same topic.',
              'A correct answer scores 1 point and moves the game scene one step. A wrong answer costs nothing: the correct answer shows for about a second and the next question comes.',
              '3 or 5 in a row pops "n in a row!"; going from behind to ahead pops "Took the lead!"; 4 points pops "halfway!"; 7 points pops "One more!" and the scene sprints.',
              'At 8 points the match ends at once: victory animation, "Red / Blue team wins!" plus one line from the game, then the result page.',
              'Battles do not change practice progress and are not recorded. The robot speed can be changed on the setup page any time.',
            ],
          },
          { kind: 'games' },
        ],
      },
      {
        id: 'tips',
        icon: '💡',
        title: 'Tips',
        blocks: [
          {
            kind: 'list',
            items: [
              'Listen first: the question is read aloud; tap 🔊 to hear it again before answering.',
              'On the number pad, fix mistakes with ⌫ and press ✓ only when sure; with cards, read the pinyin before choosing.',
              'Against the robot, start with 🐢 slow and move up to 🐰 or 🚀 after winning.',
              'Steady beats fast: a wrong answer costs nothing, but the other side keeps moving. Answers in a row get a bonus (higher chime, livelier scene).',
              'Two on one device: each side keeps to its own half. A grown-up can play along with a child.',
              'Practise the topic in practice mode first; then the battle is easier.',
              'Install the site to the home screen: it opens full screen and works without internet.',
            ],
          },
        ],
      },
      {
        id: 'faq',
        icon: '❓',
        title: 'FAQ',
        blocks: [
          {
            kind: 'faq',
            items: [
              { q: 'No sound?', a: 'Check the 🔊 / 🔇 button in the top bar. On iPhone and iPad, flip the side mute switch. The first time, tap the screen once so the browser allows audio.' },
              { q: 'The battle does not fit on my phone?', a: 'The battle needs landscape. Held upright, the page asks you to turn the phone; sideways it switches to a compact layout.' },
              {
                q: 'How do I install it on a tablet or phone for offline use?',
                a: 'Use the install bar at the top of the home page ("Install" or "How"). On iPhone and iPad open it in Safari, tap Share → Add to Home Screen. Once installed, practice and battles work without internet (except the 3D rocket).',
              },
              { q: 'Where is progress stored? Can it be lost?', a: 'Only in this device\'s browser; nothing is uploaded and devices do not sync. Clearing browser data clears it.' },
              { q: 'Do questions repeat?', a: 'They are generated randomly, so almost never. An unfinished round continues with the same questions; a finished one gets new ones.' },
              { q: 'What is "Rocket 3D"?', a: 'A pilot: a 3D rocket drawn with WebGL, downloaded on first use. Devices without WebGL or without internet fall back to the 2D version automatically; 🎲 random never picks it.' },
              { q: 'Is the robot too strong?', a: 'It has three speeds 🐢 🐰 🚀 and it makes mistakes too. Start with the slow one.' },
              { q: 'How do I change my name?', a: 'Tap the name on the battle setup page.' },
              { q: 'Why no Chinese / English / grade 3 yet?', a: 'Content is built grade by grade and is being added.' },
              { q: 'Does it cost anything? Any ads?', a: 'Free, no ads, no account; the code is open source.' },
            ],
          },
        ],
      },
    ]
  }
  return [
    {
      id: 'learn',
      icon: '📚',
      title: '学习内容与题目',
      blocks: [
        {
          kind: 'p',
          text: `同步练按现行人教版教材（2022 版课标新教材）的单元出题，覆盖小学一到六年级的语文、数学、英语。现在可练的是${coverage('zh')}，其它年级和学科陆续补充。`,
        },
        {
          kind: 'p',
          text: '题目不是从题库里抄来的，而是每次按知识点随机生成：一轮 8 题，难度按课本要求。同一轮没做完，下次进来接着做同一组题；做完一轮打勾，再进去就是新的一轮。',
        },
        {
          kind: 'list',
          items: [
            '数字键盘：填一个数，打错用 ⌫ 删掉，按 ✓ 提交。',
            '四选一：点一张卡片就算作答。',
            '题干配教具：十格阵、实物图、钟面、人民币、图形、数轴、尺子、竖式、排队等，看得见就更容易懂。',
          ],
        },
        {
          kind: 'p',
          text: '每个汉字都标拼音，进题自动朗读，题干下方的 🔊 可以再听一遍。答错会读出并显示正确答案，有教具的知识点会演示一遍（凑十法、破十法有动画）；不计时、不扣分、没有排行。',
        },
        {
          kind: 'p',
          text: '免费、无广告、不用注册；进度只存在这台设备的浏览器里。顶部可以切换中文 / English，题目、拼音、朗读都跟着切。',
        },
      ],
    },
    {
      id: 'play',
      icon: '⚔️',
      title: '对战怎么玩',
      blocks: [
        {
          kind: 'steps',
          items: [
            '进入：知识点地图右上角打开「⚔️ 对战」，再点一个知识点；或者在练习页页头点 ⚔️。',
            '跟谁打：「打机器人」（机器人有自己的题，🐢 慢 / 🐰 中 / 🚀 快三档）或「两人一台」（一台平板横着放，左右各答各的，可以同时按）；「各用各的」（每人一台设备）敬请期待。',
            `选游戏：${games} 种游戏画面，也可以「🎲 随机」，每局换一种。`,
            '第一次会问名字，点一个现成的就行，以后不再问。',
            '开始：先讲一句这个游戏的规则，「预备…3、2、1，开始！」，两边同时拿到第一题。',
          ],
        },
        {
          kind: 'p',
          text: '竞技场一律横向：左边红队、右边蓝队，游戏画面在上方横条或左右之间的竖条。每人一行：上面是题目（点一下或点 🔊 再听一遍），下面是数字键盘或选项卡。手机竖着拿会提示横过来。',
        },
        {
          kind: 'p',
          text: '结束后是结果页：谁赢、比分、用时、每人「答 n · 对 m」；可以「再来一局」（同样的人和游戏，换一组题）、「换个游戏」或「退出」。',
        },
      ],
    },
    {
      id: 'rules',
      icon: '📜',
      title: '游戏规则',
      blocks: [
        {
          kind: 'list',
          items: [
            '谁先答对 8 题谁赢。两边的题各自独立，来自同一个知识点。',
            '答对一题得 1 分，游戏画面走一步；答错不扣分、不锁题，1 秒多显示正确答案就出下一题。',
            '连对 3 题、5 题弹出「连对 n 题！」；从落后变成领先弹「反超啦！」；到 4 分弹「到一半啦！」；到 7 分弹「还差一分！」，画面进入冲刺状态。',
            '到 8 分立刻结束：胜利动画、播报「红队 / 蓝队获胜」并接一句游戏话，再进结果页。',
            '对战不改练习进度，也不存战绩；机器人的速度随时可以在设置页改。',
          ],
        },
        { kind: 'games' },
      ],
    },
    {
      id: 'tips',
      icon: '💡',
      title: '游戏技巧',
      blocks: [
        {
          kind: 'list',
          items: [
            '先听清题再答：进题会自动读，没听清点 🔊 再听一遍。',
            '数字键盘打错了用 ⌫ 改，确认了再按 ✓；选项卡先看拼音再选。',
            '第一次打机器人先选 🐢 慢，赢了再升到 🐰 或 🚀。',
            '稳比快重要：答错虽然不扣分，但对方在往前走；连对还有加成（声音更高、画面更带劲）。',
            '两人一台时左右各管各的，别去按对方那边；大人可以陪小朋友一起玩。',
            '先在练习模式把这个知识点做熟，再去对战更有把握。',
            '把网站装到平板 / 手机的主屏幕，全屏打开、没有网也能玩。',
          ],
        },
      ],
    },
    {
      id: 'faq',
      icon: '❓',
      title: '常见问题',
      blocks: [
        {
          kind: 'faq',
          items: [
            { q: '没有声音？', a: '看顶部栏是不是 🔇；iPhone / iPad 把侧面的静音键打开；第一次打开要先点一下屏幕，浏览器才允许出声。' },
            { q: '手机上进不了对战，或者画面挤？', a: '对战需要横屏，竖着拿会提示「请把手机横过来」；横过来会自动用紧凑版布局。' },
            {
              q: '怎么装到平板 / 手机上离线用？',
              a: '首页顶部的安装提示条点「安装」或「怎么做」；iPhone / iPad 用 Safari 打开，点分享 → 添加到主屏幕。装好后没有网也能练和对战（3D 火箭除外）。',
            },
            { q: '进度存在哪里？会不会丢？', a: '只存在这台设备的浏览器里，不上传，换设备不同步；清了浏览器数据就没了。' },
            { q: '题目会重复吗？', a: '每次随机生成，几乎不重复；没做完的一轮下次接着做同一组题，做完就换新题。' },
            { q: '「火箭升空 3D」是什么？', a: '一个试点，用 WebGL 画的 3D 火箭，第一次要联网下载；设备不支持或没网时自动用 2D 版，「随机」不会挑到它。' },
            { q: '机器人会不会太厉害？', a: '有 🐢 慢 / 🐰 中 / 🚀 快三档，它也会答错；先从慢的开始。' },
            { q: '想改名字？', a: '在对战设置页点名字那一行就能改。' },
            { q: '为什么还没有语文 / 英语 / 三年级？', a: '内容按年级逐个做，陆续补充。' },
            { q: '收费吗？有广告吗？', a: '免费、无广告、不用注册，代码开源。' },
          ],
        },
      ],
    },
  ]
}
