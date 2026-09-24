/**
 * 跷跷板的渲染：renderBackground 画不动的部分（天空、山丘、小树、草地、支座），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、板与扶手、砝码、两只角色、粒子）——板上的东西在板坐标系里画。
 */
import { drawActFx, withActBody, type ActPose } from '@/battle/game/engine/act'
import { gradient, withTransform } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { drawCloud, drawHill, drawSun, drawTeamBadge, drawTree, skyGradient } from '@/battle/game/sprites/scenery'
import { drawFulcrum, drawPlank, drawRider, drawWeight } from '@/battle/game/sprites/seesaw'
import type { SeesawGeometry, SeesawModel } from './model'

/** 头顶小图标（想的泡泡最高）要的高度：图标按 max(身高, 22) 画，泡泡顶在头顶往上 0.56 个它 */
function fxRoom(size: number): number {
  return Math.max(size, 22) * 0.56 + 1
}

/**
 * 跳起来别出盒子（B72）：头顶（坐高的 1.1 倍是耳朵尖，拉长时跟着高）离盒子顶只有 room 这么多，
 * 颠一下（lift，px）和表演的跳（单位坐高）加起来按它收一收——翘到高处的那头上面地方不多
 */
export function fitLift(p: ActPose, lift: number, room: number, size: number): [ActPose, number] {
  const most = Math.max(0, room - 2 - size * 1.1 * p.sy)
  const own = Math.min(lift, most)
  const act = Math.min(p.lift, (most - own) / size)
  return [act < p.lift ? { ...p, lift: act } : p, own]
}

export function renderBackground(ctx: CanvasRenderingContext2D, g: SeesawGeometry): void {
  const { W, H, k } = g
  const skyH = g.pivotY * 1.1
  ctx.fillStyle = skyGradient(ctx, skyH)
  ctx.fillRect(0, 0, W, skyH)
  if (!g.compact) {
    drawHill(ctx, W * 0.2, skyH * 0.98, W * 0.3, skyH * 0.5, '#b9e59c')
    drawHill(ctx, W * 0.75, skyH * 1.02, W * 0.36, skyH * 0.55, '#a8dd8b')
    for (const fx of [0.06, 0.16, 0.84, 0.94]) drawTree(ctx, W * fx, skyH * 0.95, g.size * 0.9)
  }
  ctx.fillStyle = gradient(ctx, 0, skyH * 0.9, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, skyH * 0.9, W, H - skyH * 0.9)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, H - g.groundY)
  drawFulcrum(ctx, g.pivotX, g.groundY, g.pivotH, g.pivotH * 1.1)
  // 两头地上的队色圆牌（B32）
  drawTeamBadge(ctx, g.pivotX - g.half * 0.9, g.groundY - Math.max(4, 6 * k), Math.min(g.size * 0.22, 8 * k), 'red')
  drawTeamBadge(ctx, g.pivotX + g.half * 0.9, g.groundY - Math.max(4, 6 * k), Math.min(g.size * 0.22, 8 * k), 'blue')
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: SeesawModel): void {
  const g = m.geo
  const { k } = g
  const t = m.time
  if (!g.compact) drawSun(ctx, g.W * 0.82, g.pivotY * 0.35, 11 * k, m.animated ? breathe(t, 3) : 0.5)
  for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  const a = m.angle()
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  // 板坐标 → 画面坐标
  const world = (px: number, py: number) => ({ x: g.pivotX + px * cos - py * sin, y: g.pivotY + px * sin + py * cos })
  // 一题里的表演（B72）：整体（颠 / 前倾 / 晃 / 压扁）交给 withActBody（板坐标系里、朝着支点前倾），
  // 手势与表情接到角色的姿势上，头顶的小图标回到画面坐标再画（跟着板歪就不好看了）
  const acts = m.riders.map((r, i) => {
    const seatY = world(g.seat[i]!, -g.thick / 2).y
    const p = r.act.pose()
    // 按键：抓紧扶手再往前探一点（演员给的前倾对坐着的人太小）
    if (m.animated) p.lean += 0.14 * r.act.typing
    return fitLift(p, m.liftOf(r, i), seatY, g.size)
  })
  withTransform(ctx, g.pivotX, g.pivotY, a, 1, 1, () => {
    drawPlank(ctx, g.half, g.thick, m.glow[0]!.value, m.glow[1]!.value)
    m.riders.forEach((r, i) => {
      for (let n = 0; n < m.weights[i]!.length; n++) {
        const w = m.weights[i]![n]!
        if (w.delay > 0) continue
        drawWeight(ctx, g.slots[i]![n]!, -g.thick / 2 + w.drop.value, g.weightS, r.team)
      }
      const [p, lift] = acts[i]!
      const dir = i === 0 ? 1 : -1
      withActBody(ctx, g.seat[i]!, -g.thick / 2, g.size, p, dir, () =>
        drawRider(ctx, 0, 0, g.size, r.team, m.kinds[i]!, {
          lift,
          cheer: r.mood === 'win' ? 1 : 0,
          scared: Math.max(m.scaredOf(r), p.wide),
          swing: t * 3 + i,
          dangle: m.dangleOf(i),
          blink: r.blink.value,
          look: Math.max(r.look.value, p.look),
          wave: Math.max(m.waveOf(r), p.wave),
          dir,
          kick: m.kickOf(r),
          arms: p.arms,
          scratch: p.scratch,
          rub: p.beat * 2,
          happy: p.happy,
        }),
      )
    })
  })
  m.riders.forEach((_, i) => {
    const [p, lift] = acts[i]!
    const head = world(g.seat[i]!, -g.thick / 2 - lift - (p.lift + 1.1 * p.sy) * g.size)
    drawActFx(ctx, head.x, Math.max(head.y, fxRoom(g.size)), g.size, p, { side: i === 0 ? 1 : -1, quality: m.quality })
  })
  m.particles.draw(ctx)
}
