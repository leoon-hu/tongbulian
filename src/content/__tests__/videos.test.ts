import { describe, expect, it } from 'vitest'
import { liveCourses } from '@/engine/catalog'
import { VIDEO_FALLBACKS, VIDEO_LESSONS, videoOf } from '../videos'

/**
 * 平台上新旧教材都没有这一节视频的知识点（scripts/videos.mjs 会列出来）：三上语文园地八——新教材这一节还没有课时，
 * 旧教材第八单元的园地上只挂了「第5—8单元复习活动课」；四上「用估算解决问题」——新教材四上的同步课 2026-10-05 只上了
 * 第一单元，旧教材没有讲这个的一节；四上语文的《长城》《秦兵马俑》《我将无我，不负人民》与语文园地六——新教材四上的同步课
 * 2026-10-11 也只上了第一单元，这几课是新教材才有的（旧教材里没有，园地六的单元也没有对得上的旧单元）；三下、四上、四下英语的
 * Revision——平台上这一章只挂了听力材料（2026-10-25）。平台补上了重跑
 * npm run videos 再从这里删掉
 */
const NO_VIDEO = new Set(['e3s2-07-revision', 'e4s1-07-revision', 'e4s2-07-revision', 'e5s1-02-a', 'e5s1-02-spell', 'e5s1-02-b', 'e5s1-04-a', 'e5s1-04-spell', 'e5s1-04-b', 'e5s1-07-revision', 'c3s1-08-garden', 'm4s1-04-estimate', 'm5s1-07-tiling', 'm6s1-07-standard', 'c4s1-06-changcheng', 'c4s1-06-bingmayong', 'c4s1-06-garden', 'c4s1-08-wuwo', 'c5s1-01-garden', 'c5s1-06-hangtianyuan', 'c5s1-07-diyichangxue', 'c5s1-07-garden', 'c5s1-08-shuweilv'])

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
