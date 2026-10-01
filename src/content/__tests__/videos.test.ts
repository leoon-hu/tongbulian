import { describe, expect, it } from 'vitest'
import { liveCourses } from '@/engine/catalog'
import { VIDEO_LESSONS, videoUrlOf } from '../videos'

/** 平台上这一节没有同步课的知识点（scripts/videos.mjs 会列出来） */
const NO_VIDEO = new Set(['c2s2-02-garden'])

describe('同步课视频链接（F2）', () => {
  const kps = liveCourses().flatMap(({ course }) => course.knowledgePoints.map((kp) => kp.id))

  it('上线的知识点都有（平台上没有这一节的除外），表里没有不存在的知识点', () => {
    const missing = kps.filter((id) => !VIDEO_LESSONS[id] && !NO_VIDEO.has(id))
    expect(missing).toEqual([])
    const unknown = Object.keys(VIDEO_LESSONS).filter((id) => !kps.includes(id))
    expect(unknown).toEqual([])
  })

  it('地址是平台的课时页，只带课时 id', () => {
    for (const id of kps) {
      const url = videoUrlOf(id)
      if (NO_VIDEO.has(id)) {
        expect(url).toBeUndefined()
        continue
      }
      expect(url).toMatch(/^https:\/\/basic\.smartedu\.cn\/syncClassroom\/classActivity\?activityId=[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)
    }
  })
})
