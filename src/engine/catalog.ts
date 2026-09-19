import type { Course, GradeMeta, KnowledgePoint, SubjectMeta } from '@/types/models'
import { mathGrade1 } from '@/content/math/grade1'
import { mathGrade2 } from '@/content/math/grade2'

// ── 课程注册表：key 为 courseId（如 math-g1）。────────────────────────────
const COURSES = new Map<string, Course>()

/** 注册一个「学科×年级」内容包。内容包 index 被导入时由本文件登记。 */
export function registerCourse(course: Course): void {
  COURSES.set(course.id, course)
}

// 上线的内容包在此静态导入并登记（导入即触发其生成器 / 词条注册）。
// 新增内容包：在 content/ 下建包，然后在这里 import + registerCourse 一行。
registerCourse(mathGrade1)
registerCourse(mathGrade2)

/** 已注册的全部课程（语料收集 / 测试用） */
export function allCourses(): Course[] {
  return [...COURSES.values()]
}

/** 某学科某年级的课程：以目录里年级条目挂的 courseId 为唯一关联（没挂 = 未上线，即使包已注册） */
export function getCourse(subjectId: string, gradeId: string): Course | undefined {
  const courseId = getGrade(subjectId, gradeId)?.courseId
  return courseId ? COURSES.get(courseId) : undefined
}

/** 上线的课程（目录里挂了 courseId 的年级），按目录顺序：首页清单、SEO 静态页用 */
export function liveCourses(): { subject: SubjectMeta; grade: GradeMeta; course: Course }[] {
  const out: { subject: SubjectMeta; grade: GradeMeta; course: Course }[] = []
  for (const subject of SUBJECTS) {
    for (const grade of subject.grades) {
      const course = grade.courseId ? COURSES.get(grade.courseId) : undefined
      if (course) out.push({ subject, grade, course })
    }
  }
  return out
}

/** 某单元下的知识点 */
export function kpsOfUnit(course: Course, unitId: string): KnowledgePoint[] {
  return course.knowledgePoints.filter((kp) => kp.unitId === unitId)
}

/** 在课程内按 id 找知识点 */
export function findKp(course: Course, kpId: string): KnowledgePoint | undefined {
  return course.knowledgePoints.find((kp) => kp.id === kpId)
}

/** 按知识点 id 反查它在哪个上线课程里（对战页的地址只带 kpId）：没有 = 不存在或未上线 */
export function courseOfKp(
  kpId: string,
): { subject: SubjectMeta; grade: GradeMeta; course: Course; kp: KnowledgePoint } | undefined {
  for (const lc of liveCourses()) {
    const kp = findKp(lc.course, kpId)
    if (kp) return { ...lc, kp }
  }
  return undefined
}

/** 这个知识点所在那一册（上 / 下）的全部知识点，按目录顺序（含 ☆ 单元）；不在目录里 → []。对战按章节排游戏、「下一章」都用它 */
export function volumeKps(kpId: string): KnowledgePoint[] {
  const info = courseOfKp(kpId)
  if (!info) return []
  const semesterOf = (unitId: string): number | undefined => info.course.units.find((u) => u.id === unitId)?.semester
  const sem = semesterOf(info.kp.unitId)
  return info.course.knowledgePoints.filter((kp) => semesterOf(kp.unitId) === sem)
}

/** 本册目录里的下一个知识点（对战结果页「下一章」，B9）；已是最后一个 / 不在目录里 → null */
export function nextKp(kpId: string): string | null {
  const list = volumeKps(kpId)
  const i = list.findIndex((kp) => kp.id === kpId)
  return i >= 0 && i + 1 < list.length ? list[i + 1]!.id : null
}

// ── 目录：学科 → 年级（驱动选择页与占位）。──────────────────────────────
// live 的年级挂 courseId 指向已注册课程；soon 为占位「敬请期待」。

const grade = (id: string, courseId?: string): GradeMeta => ({
  id,
  title: { k: `grade.${id}` },
  status: courseId ? 'live' : 'soon',
  courseId,
})

export const SUBJECTS: SubjectMeta[] = [
  {
    id: 'math',
    title: { k: 'subject.math' },
    icon: '🧮',
    theme: 'math',
    status: 'live',
    grades: [
      grade('g1', 'math-g1'),
      grade('g2', 'math-g2'),
      grade('g3'),
      grade('g4'),
      grade('g5'),
      grade('g6'),
    ],
  },
  {
    id: 'chinese',
    title: { k: 'subject.chinese' },
    icon: '📖',
    theme: 'chinese',
    status: 'soon',
    grades: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((g) => grade(g)),
  },
  {
    id: 'english',
    title: { k: 'subject.english' },
    icon: '🔤',
    theme: 'english',
    status: 'soon',
    grades: ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((g) => grade(g)),
  },
]

export function getSubject(subjectId: string): SubjectMeta | undefined {
  return SUBJECTS.find((s) => s.id === subjectId)
}

export function getGrade(subjectId: string, gradeId: string): GradeMeta | undefined {
  return getSubject(subjectId)?.grades.find((g) => g.id === gradeId)
}
