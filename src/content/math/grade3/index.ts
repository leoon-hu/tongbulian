// 三年级数学内容包：生成器 + 题目词条与拼音。catalog 在进这门课的页面之前按需加载它（N8，loadCourse）；
// 导入即完成全部注册。目录本身在 course.ts（随首页加载）。
import './lang' // 副作用：注册题目 / 选项词条与拼音（生成器出题时要查词条的拼音）
import './generators' // 副作用：注册全部生成器

export { mathGrade3 } from './course'
