import { describe, expect, it } from 'vitest'
import '@/content/math/grade1'
import '@/content/math/grade2'
import { getCourse, mapPathOf } from '@/engine/catalog'

describe('mapPathOf：从知识点回地图的地址带着它所在的册', () => {
  it('上册不带参数，下册带 ?sem=2；不在目录里回首页', () => {
    expect(mapPathOf('s1-05-carry-add')).toBe('/s/math/g/g1')
    expect(mapPathOf('s2-02-borrow-sub')).toBe('/s/math/g/g1?sem=2')
    expect(mapPathOf('m2s1-02-mult-intro')).toBe('/s/math/g/g2')
    expect(mapPathOf('m2s2-05-add')).toBe('/s/math/g/g2?sem=2')
    expect(mapPathOf('nope')).toBe('/')
  })

  it('两个年级每个知识点的地址都和它所在单元的册一致', () => {
    for (const gradeId of ['g1', 'g2']) {
      const course = getCourse('math', gradeId)!
      for (const kp of course.knowledgePoints) {
        const sem = course.units.find((u) => u.id === kp.unitId)!.semester
        expect(mapPathOf(kp.id)).toBe(`/s/math/g/${gradeId}${sem === 2 ? '?sem=2' : ''}`)
      }
    }
  })
})
