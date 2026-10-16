// 六年级语文内容包（统编版：六上新教材、六下平台当前的旧版，需求 R4k / §9 Y13）：生成器 + 课文材料 + 拼音表。catalog 在进这门课
// 的页面之前按需加载它（N8，loadCourse）；导入即完成全部注册。目录本身在 course.ts（随首页加载）。
import './generators' // 副作用：注册全部生成器（题目要求词条与拼音由 shared/makers 引的 shared/prompts 注册）

export { chineseGrade6 } from './course'
