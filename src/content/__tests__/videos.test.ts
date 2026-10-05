import { describe, expect, it } from 'vitest'
import { liveCourses } from '@/engine/catalog'
import { VIDEO_FALLBACKS, VIDEO_LESSONS, videoOf } from '../videos'

/**
 * 平台上新旧教材都没有这一节视频的知识点（scripts/videos.mjs 会列出来）：三上语文园地八——新教材这一节还没有课时，
 * 旧教材第八单元的园地上只挂了「第5—8单元复习活动课」。平台补上了重跑 npm run videos 再从这里删掉
 */
const NO_VIDEO = new Set(['c3s1-08-garden'])

const ID = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
const SYNC = new RegExp(`^https://basic\\.smartedu\\.cn/syncClassroom/classActivity\\?activityId=${ID}$`)
const ELITE = new RegExp(`^https://basic\\.smartedu\\.cn/qualityCourse\\?courseId=${ID}$`)

describe('课程视频链接（F2）', () => {
  const kps = liveCourses().flatMap(({ course }) => course.knowledgePoints.map((kp) => kp.id))

  it('上线的知识点都有（平台上新旧教材都没有这一节的除外），表里没有不存在的知识点', () => {
    const missing = kps.filter((id) => !videoOf(id) && !NO_VIDEO.has(id))
    expect(missing).toEqual([])
    const unknown = [...Object.keys(VIDEO_LESSONS), ...Object.keys(VIDEO_FALLBACKS)].filter((id) => !kps.includes(id))
    expect(unknown).toEqual([])
  })

  it('有新教材同步课的不挂替代视频；替代视频都标了来源', () => {
    expect(Object.keys(VIDEO_FALLBACKS).filter((id) => VIDEO_LESSONS[id])).toEqual([])
    for (const alt of Object.values(VIDEO_FALLBACKS)) expect(['elite', 'old', 'old-elite']).toContain(alt.from)
  })

  it('同步课（新旧教材）是平台的课时页、精品课是精品课页，都只带 id', () => {
    for (const id of kps) {
      const v = videoOf(id)
      if (NO_VIDEO.has(id)) {
        expect(v).toBeUndefined()
        continue
      }
      expect(v!.from).toBe(VIDEO_LESSONS[id] ? 'sync' : VIDEO_FALLBACKS[id]!.from)
      expect(v!.url).toMatch(v!.from === 'sync' || v!.from === 'old' ? SYNC : ELITE)
    }
  })
})
