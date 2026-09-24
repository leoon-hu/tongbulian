/**
 * 摘果子的渲染：renderBackground 画不动的部分（天空、山丘、草地、树干），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（太阳、云、小鸟、树冠、树上的果子、落叶、篮子、篮子里的果子、落下的果子、两只角色、粒子）。
 */
import { drawActFx, withActBody } from '@/battle/game/engine/act'
import { gradient } from '@/battle/game/engine/draw'
import { breathe } from '@/battle/game/engine/rig'
import { PICKER_HEAD, drawBasket, drawCanopy, drawFruit, drawPicker, drawTrunk, gestureEnv, pickerAct } from '@/battle/game/sprites/fruit'
import { drawLeaf } from '@/battle/game/sprites/ladder'
import { drawCloud, drawHill, drawSun, skyGradient } from '@/battle/game/sprites/scenery'
import { drawBird } from '@/battle/game/sprites/town'
import type { FruitGeometry, FruitModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: FruitGeometry): void {
  const { W, H, k } = g
  ctx.fillStyle = skyGradient(ctx, g.groundY)
  ctx.fillRect(0, 0, W, g.groundY)
  if (!g.compact) {
    drawHill(ctx, W * 0.2, g.groundY - g.size * 0.6, W * 0.5, g.size * 1.1, '#b9e59c')
    drawHill(ctx, W * 0.85, g.groundY - g.size * 0.5, W * 0.55, g.size * 1.2, '#a8dd8b')
  }
  ctx.fillStyle = gradient(ctx, 0, g.groundY - g.size * 0.35, 0, H, [
    [0, '#a6e58a'],
    [1, '#74c95e'],
  ])
  ctx.fillRect(0, g.groundY - g.size * 0.35, W, H - g.groundY + g.size * 0.35)
  ctx.fillStyle = '#6fbf5c'
  ctx.fillRect(0, g.groundY, W, Math.max(1, 2 * k))
  drawTrunk(ctx, g.canopyX, g.groundY + 2 * k, g.canopyY + g.canopyH * 0.2, g.trunkW)
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: FruitModel): void {
  const g = m.geo
  const { W, k } = g
  const t = m.time
  if (!g.compact) {
    drawSun(ctx, W * 0.86, g.H * 0.05, 7 * k, m.animated ? breathe(t, 3) : 0.5)
    for (const c of m.clouds) drawCloud(ctx, c.x, c.y, c.s)
  }
  const sway = m.swayOf()
  drawCanopy(ctx, g.canopyX, g.canopyY, g.canopyW, g.canopyH, sway)
  // 树上的果子（跟着树冠晃）
  m.fruits.forEach((list, i) => {
    for (const f of list) if (f.state === 'tree') drawFruit(ctx, f.x.value + sway * 0.6, f.y.value, g.fruitR, m.fruitKinds[i]!)
  })
  if (!g.compact) {
    if (m.bird) drawBird(ctx, m.bird.x, m.bird.y, 5 * k, m.bird.flap)
    for (const l of m.leaves) if (l.wait <= 0) drawLeaf(ctx, l.x, l.y, 3 * k, l.rot, '#7ccf62')
  }
  m.pickers.forEach((p, i) => {
    const dir: 1 | -1 = i === 0 ? 1 : -1
    const bl = m.basketLift(p, i)
    // 一题里的表演（B72）：整体（跳 / 前倾 / 晃 / 压扁）交给 withActBody，手势与表情接到 drawPicker 上，头顶图标画在篮子前面
    const s = g.size
    const x = g.basketX[i]!
    const lift = m.liftOf(p, i)
    const a = p.act.pose()
    const base = pickerAct(p.act, a)
    // 抬头看树（点头换的）：不点头，身子往后一仰看上面
    const up = gestureEnv(p.act, 'nod')
    if (up > 0) a.lean = -0.12 * up
    // 踮脚伸手够（伸懒腰换的）：前面那只手往树上够，另一只不举，脚尖踮起来
    const reach = gestureEnv(p.act, 'stretch')
    if (reach > 0) {
      base.arms = 0
      if (m.animated) a.lift += 0.06 * reach
    }
    const leaf = m.leafOf(p)
    const typing = p.act.typing
    withActBody(ctx, x, g.kidY, s, a, dir, () =>
      drawPicker(ctx, 0, 0, s, p.team, m.kinds[i]!, {
        ...base,
        lift,
        cheer: p.mood === 'win' ? 1 : 0,
        scratch: Math.max(base.scratch, m.scratchOf(p)),
        blink: p.blink.value,
        look: Math.abs(base.look) > p.look.value ? base.look : p.look.value,
        leaf: leaf.amount,
        leafY: leaf.y,
        leafX: leaf.x,
        leafRot: leaf.rot,
        dir,
        // 正在按：双手举起准备接、抬头看果子，每按一下手往上一送
        arms: Math.max(base.arms, typing * 0.72 + a.press * 0.2),
        reachUp: reach,
        lookUp: Math.max(up, typing * 0.8, reach),
      }),
    )
    drawBasket(ctx, g.basketX[i]!, g.basketTop - bl, g.basketW, g.basketH, p.team, 'back', m.basketGlow[i]!.value)
    for (const f of m.fruits[i]!) {
      if (f.state === 'tree') continue
      const inBasket = f.state === 'basket'
      drawFruit(ctx, f.x.value, f.y.value - (inBasket ? bl : 0), g.fruitR, m.fruitKinds[i]!, inBasket ? 0.8 : 1)
    }
    drawBasket(ctx, g.basketX[i]!, g.basketTop - bl, g.basketW, g.basketH, p.team, 'front', 0)
    // 泡泡往外侧冒（里侧是树干）
    drawActFx(ctx, x - dir * s * 0.05, g.kidY - lift - (a.lift + PICKER_HEAD) * s, s, a, { side: dir === 1 ? -1 : 1, quality: m.quality })
  })
  m.particles.draw(ctx)
}
