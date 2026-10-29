import type { KnowledgePoint, QuestionType, Unit } from '@/types/models'

/**
 * 统编版五年级道德与法治知识点树（单一事实源，需求 R4u）：上册是根据 2022 年版课程标准修订的新教材（整册讲党领导人民建立新中国、
 * 建设社会主义、改革开放、进入新时代的历史）；下册平台上还是旧版（总主编鲁洁），照平台当前那本做，平台换了新版再重做下册、id 跟着换。
 * 上册 4 个单元 13 课（4 / 3 / 3 / 3），下册 3 个单元 12 课（3 / 3 / 6），一课一个知识点。标题照课本目录。
 * 单元 id：d5s<册>u<序号>；知识点 id：d5s<册>-<课号两位>-<语义名>（课号照课本全册连着编）。
 */
export const UNITS: Unit[] = [
  { id: 'd5s1u1', semester: 1, order: 1, title: '没有共产党就没有新中国' },
  { id: 'd5s1u2', semester: 1, order: 2, title: '建设社会主义新中国' },
  { id: 'd5s1u3', semester: 1, order: 3, title: '进行改革开放' },
  { id: 'd5s1u4', semester: 1, order: 4, title: '开创新时代' },
  { id: 'd5s2u1', semester: 2, order: 1, title: '我们一家人' },
  { id: 'd5s2u2', semester: 2, order: 2, title: '公共生活靠大家' },
  { id: 'd5s2u3', semester: 2, order: 3, title: '百年追梦 复兴中华' },
]

const TYPES: QuestionType[] = ['conduct', 'civics']

const kp = (id: string, unit: number, title: string, icon: string): KnowledgePoint => ({
  id,
  unitId: `${id.slice(0, 4)}u${unit}`,
  title,
  icon,
  questionTypes: TYPES,
})

export const KNOWLEDGE_POINTS: KnowledgePoint[] = [
  // ── 上册（新版）──
  kp('d5s1-01-kaitian', 1, '开天辟地的大事变', '🚩'),
  kp('d5s1-02-daolu', 1, '探索中国革命道路', '🧭'),
  kp('d5s1-03-kangri', 1, '抗日战争的中流砥柱', '⛰️'),
  kp('d5s1-04-jiefang', 1, '夺取胜利的解放战争', '🎖️'),
  kp('d5s1-05-zhanqilai', 2, '中国人民站起来了', '🇨🇳'),
  kp('d5s1-06-dangjia', 2, '人民当家作主', '🏛️'),
  kp('d5s1-07-shehuizhuyi', 2, '社会主义好', '🏭'),
  kp('d5s1-08-gaige', 3, '改革开放展宏图', '🌅'),
  kp('d5s1-09-guoli', 3, '综合国力日益提升', '🚀'),
  kp('d5s1-10-tongyi', 3, '祖国统一大业不断推进', '🤝'),
  kp('d5s1-11-xinshidai', 4, '走进新时代', '🌄'),
  kp('d5s1-12-chengjiu', 4, '历史性成就', '🏆'),
  kp('d5s1-13-zhengcheng', 4, '开启新征程', '🛤️'),
  // ── 下册（旧版）──
  kp('d5s2-01-bici', 1, '读懂彼此的心', '💞'),
  kp('d5s2-02-meihao', 1, '让我们的家更美好', '🏠'),
  kp('d5s2-03-jiafeng', 1, '弘扬优秀家风', '📜'),
  kp('d5s2-04-gonggong', 2, '我们的公共生活', '🏙️'),
  kp('d5s2-05-zhixu', 2, '建立良好的公共秩序', '🚦'),
  kp('d5s2-06-fengxian', 2, '我参与 我奉献', '🙋'),
  kp('d5s2-07-kangzheng', 3, '不甘屈辱 奋勇抗争', '🔥'),
  kp('d5s2-08-juexing', 3, '推翻帝制 民族觉醒', '🔔'),
  kp('d5s2-09-gongchandang', 3, '中国有了共产党', '⭐'),
  kp('d5s2-10-shengli', 3, '夺取抗日战争和人民解放战争的胜利', '🏅'),
  kp('d5s2-11-dongfang', 3, '屹立在世界的东方', '🌏'),
  kp('d5s2-12-qiangqilai', 3, '富起来到强起来', '💪'),
]
