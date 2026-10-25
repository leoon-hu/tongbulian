// 六年级英语内容包（人教版 PEP：六上新教材、六下平台上的旧版，需求 R4p / §11）：生成器 + 材料 + 拼音表。catalog 在进这门课的页面之前按需加载它
// （N8，loadCourse）；导入即完成全部注册。目录本身在 course.ts（随首页加载）。
import './generators' // 副作用：注册全部生成器（题目要求词条与拼音由 shared/makers 引的 shared/prompts 注册）

export { englishGrade6 } from './course'
