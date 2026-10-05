// @vitest-environment happy-dom
// 内容包按需加载（需求 N8）：这个文件不静态导入语文内容包，看的就是「只有目录、没有生成器」到加载好的过程
import { describe, expect, it, vi } from 'vitest'
import type { Course } from '@/types/models'
import { hasGenerator } from '@/engine'
import { courseLoaded, courseOfKp, loadCourse, registerCourse } from '@/engine/catalog'
import { translate } from '@/engine/i18n'
import router from '@/router'

describe('内容包按需加载（N8）', () => {
  it('语文只有目录随首页加载：知识点名、英文名、反查都在，生成器与题目要求不在；数学是静态导入的', () => {
    expect(courseLoaded('math-g1')).toBe(true)
    expect(hasGenerator('s1-05-carry-add')).toBe(true)
    expect(courseLoaded('chinese-g1')).toBe(false)
    expect(courseOfKp('c1s1-05-qiutian')?.course.id).toBe('chinese-g1')
    expect(translate({ k: 'kp.c1s1-05-qiutian' }, 'zh')).toBe('秋天')
    expect(translate({ k: 'kp.c1s1-05-qiutian' }, 'en')).toBe('Autumn')
    expect(hasGenerator('c1s1-05-qiutian')).toBe(false)
    expect(translate({ k: 'yq.listenZi' }, 'zh')).toBe('yq.listenZi')
    expect(courseLoaded('chinese-g2')).toBe(false)
    expect(courseOfKp('c2s1-01-kedou')?.course.id).toBe('chinese-g2')
    expect(translate({ k: 'kp.c2s1-01-kedou' }, 'zh')).toBe('小蝌蚪找妈妈')
    expect(hasGenerator('c2s1-01-kedou')).toBe(false)
    expect(courseLoaded('chinese-g3')).toBe(false)
    expect(courseOfKp('c3s1-08-simaguang')?.course.id).toBe('chinese-g3')
    expect(translate({ k: 'kp.c3s1-08-simaguang' }, 'zh')).toBe('司马光')
    expect(translate({ k: 'kp.c3s1-08-simaguang' }, 'en')).toBe('Sima Guang')
    expect(hasGenerator('c3s1-08-simaguang')).toBe(false)
  })

  it('进语文的页面之前，路由守卫把这门课的内容包加载好（对战页按知识点反查）', async () => {
    await router.push('/battle/new/c1s1-05-qiutian')
    expect(courseLoaded('chinese-g1')).toBe(true)
    expect(hasGenerator('c1s1-05-qiutian')).toBe(true)
    expect(translate({ k: 'yq.listenZi' }, 'zh')).toBe('听一听，选出你听到的字。')
    // 两个年级各自一个包：进一年级的页面不会顺带加载二年级
    expect(courseLoaded('chinese-g2')).toBe(false)
    await router.push('/battle/new/c2s2-08-dayu')
    expect(courseLoaded('chinese-g2')).toBe(true)
    expect(hasGenerator('c2s2-08-dayu')).toBe(true)
    expect(courseLoaded('chinese-g3')).toBe(false)
    await router.push('/s/chinese/g/g3')
    expect(courseLoaded('chinese-g3')).toBe(true)
    expect(hasGenerator('c3s2-08-zaohe')).toBe(true)
  })

  it('同时几处要只加载一次；加载失败下次再试，成功了就不再调', async () => {
    const course: Course = { id: 'test-lazy', subjectId: 'test', gradeId: 'g1', units: [], knowledgePoints: [] }
    let fail = true
    const load = vi.fn(async () => {
      if (fail) throw new Error('offline')
    })
    registerCourse(course, load)
    const a = loadCourse('test-lazy')
    expect(loadCourse('test-lazy')).toBe(a)
    await expect(a).rejects.toThrow('offline')
    expect(courseLoaded('test-lazy')).toBe(false)
    fail = false
    await loadCourse('test-lazy')
    expect(courseLoaded('test-lazy')).toBe(true)
    await loadCourse('test-lazy')
    expect(load).toHaveBeenCalledTimes(2)
  })
})
