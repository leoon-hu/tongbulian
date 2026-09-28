// 一年级语文内容包（统编新教材，需求 R4c / §9）：生成器 + 题目词条 + 拼音。catalog 在进这门课的页面之前按需加载它
// （N8，loadCourse）；导入即完成全部注册。目录本身在 course.ts（随首页加载）。
import './generators' // 副作用：注册全部生成器
import './i18n' // 副作用：注册题目要求词条
import './pinyin' // 副作用：注册题目要求的拼音

export { chineseGrade1 } from './course'
