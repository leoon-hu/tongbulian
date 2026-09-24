/**
 * 点亮星星的渲染：renderBackground 画不动的部分（夜空、山影、月亮），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（闪的小星星、小云与两只角色、连线、大星星、火花、粒子）。
 */
import { drawActFx, withActBody, type ActPose } from '@/battle/game/engine/act'
import { circle, withAlpha } from '@/battle/game/engine/draw'
import { clamp01 } from '@/battle/game/engine/tween'
import { drawBigStar, drawConstellation, drawHillsSilhouette, drawMoon, drawPuff, drawSpark, drawStarKid, nightGradient } from '@/battle/game/sprites/stars'
import type { StarsGeometry, StarsModel } from './model'

/** 头顶小图标（想的泡泡最高）要的高度：图标按 max(身高, 22) 画，泡泡顶在头顶往上 0.56 个它 */
function fxRoom(size: number): number {
  return Math.max(size, 22) * 0.56 + 1
}

/**
 * 跳起来别出盒子（B72）：头顶（坐高的 1.1 倍是耳朵尖，拉长时跟着高）离盒子顶只有 room 这么多，
 * 点一下的蹦（lift，px）和表演的跳（单位坐高）加起来按它收一收；手机紧凑版的红队上面几乎没有地方
 */
export function fitLift(p: ActPose, lift: number, room: number, size: number): [ActPose, number] {
  const most = Math.max(0, room - 2 - size * 1.1 * p.sy)
  const own = Math.min(lift, most)
  const act = Math.min(p.lift, (most - own) / size)
  return [act < p.lift ? { ...p, lift: act } : p, own]
}

export function renderBackground(ctx: CanvasRenderingContext2D, g: StarsGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = nightGradient(ctx, H)
  ctx.fillRect(0, 0, W, H)
  if (!g.compact) {
    drawMoon(ctx, W * 0.9, H * 0.22, 9 * k)
    drawHillsSilhouette(ctx, W, H * 0.8, H * 0.2)
  }
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: StarsModel): void {
  const g = m.geo
  const { k } = g
  for (const t of m.twinkles) {
    withAlpha(ctx, m.twinkleOf(t), () => {
      ctx.fillStyle = '#ffffff'
      circle(ctx, t.x, t.y, t.r)
      ctx.fill()
    })
  }
  m.kids.forEach((kid, i) => {
    const pts = g.stars[i]!
    drawConstellation(ctx, pts, m.lines[i]!.value, kid.team, Math.max(1, 1.6 * k))
    pts.forEach((p, n) => drawBigStar(ctx, p.x, p.y, g.starR, kid.team, m.litOf(i, n), m.scaleOf(i, n), m.pulseOf(i, n)))
    const spark = m.sparkOf(i)
    if (spark) drawSpark(ctx, spark.x, spark.y, g.starR * 0.5, kid.team, spark.alpha)
    // 一题里的表演（B72）：云一起一伏、坐在云上晃腿；整体（跳 / 晃 / 压扁）交给 withActBody，
    // 手势与表情接到角色的姿势上（挥棒、举棒、挥一圈、棒尖冒灰烟），头顶的小图标最后画
    const seatY = g.kidY[i]! + m.bobOf(i)
    const [a, lift] = fitLift(kid.act.pose(), m.liftOf(kid), seatY, g.size)
    drawPuff(ctx, g.kidX, seatY + g.size * 0.05, g.size * 0.75)
    // 棒子举高时棒尖最高到坐着的地方往上 1.6 个坐高：上面放不下（手机紧凑版的红队）就少举一点
    const reach = clamp01((seatY - lift - g.size * 1.2) / (g.size * 0.4))
    withActBody(ctx, g.kidX, seatY, g.size, a, 1, () =>
      drawStarKid(ctx, 0, 0, g.size, kid.team, m.kinds[i]!, {
        wave: Math.max(m.waveOf(kid, i), a.wave * (0.5 + 0.5 * Math.sin(a.beat))),
        lift,
        cheer: kid.mood === 'win' ? 1 : 0,
        sleepy: m.sleepyOf(kid),
        blink: kid.blink.value,
        look: Math.max(kid.look.value, a.look),
        dir: 1,
        arms: a.arms,
        raise: kid.act.typing * reach,
        spin: m.wandSpinOf(kid),
        fizzle: m.fizzleOf(kid),
        scratch: a.scratch,
        rub: a.beat * 2,
        legs: m.time * 5 + i,
        legAmp: m.legSwingOf(kid),
        happy: a.happy,
        wide: a.wide,
      }),
    )
    const top = seatY - lift - (a.lift + 1.1 * a.sy) * g.size
    drawActFx(ctx, g.kidX, Math.max(top, fxRoom(g.size)), g.size, a, { side: 1, quality: m.quality })
  })
  m.particles.draw(ctx)
}
