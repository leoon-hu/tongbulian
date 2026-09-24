/**
 * 拼图的渲染：renderBackground 画不动的部分（底色、两块板的框与板面），index.ts 缓存到离屏 canvas；
 * renderDynamic 每帧画会动的部分（空格、已拼上 / 飞着的块、板框的光、两只角色、粒子）。
 */
import { drawActFx, withActBody } from '@/battle/game/engine/act'
import { gradient } from '@/battle/game/engine/draw'
import { PICKER_HEAD, drawPicker, pickerAct } from '@/battle/game/sprites/fruit'
import { drawFrame, drawPiece, drawSlot } from '@/battle/game/sprites/puzzle'
import { COLS, ROWS, type PuzzleGeometry, type PuzzleModel } from './model'

export function renderBackground(ctx: CanvasRenderingContext2D, g: PuzzleGeometry): void {
  const { W, H } = g
  ctx.fillStyle = gradient(ctx, 0, 0, 0, H, [
    [0, '#fbe9c8'],
    [1, '#f3d9a6'],
  ])
  ctx.fillRect(0, 0, W, H)
  g.boardTop.forEach((top, i) => drawFrame(ctx, g.boardX, top, g.boardW, g.boardH, g.border, i === 0 ? 'red' : 'blue', 0))
}

export function renderDynamic(ctx: CanvasRenderingContext2D, m: PuzzleModel): void {
  const g = m.geo
  m.kids.forEach((kid, i) => {
    const top = g.boardTop[i]!
    const glow = m.frameGlow(i)
    if (glow > 0.02) drawFrame(ctx, g.boardX, top, g.boardW, g.boardH, g.border, kid.team, glow)
    const board = { x: g.boardX, y: top, w: g.boardW, h: g.boardH, kind: m.pictures[i]!, bright: m.brightOf(i) }
    // 空格
    for (let n = 0; n < ROWS * COLS; n++) {
      const p = m.pieces[i]![n]!
      if (p.state === 'placed') continue
      const slot = m.slotOf(i, n)
      drawSlot(ctx, slot.x, slot.y, g.pieceW, g.pieceH, p.knobs, m.slotPulse(i, n))
    }
    // 已拼上的块
    for (let n = 0; n < ROWS * COLS; n++) {
      const p = m.pieces[i]![n]!
      if (p.state !== 'placed') continue
      const slot = m.slotOf(i, n)
      drawPiece(ctx, p.x.value, p.y.value, slot.x, slot.y, g.pieceW, g.pieceH, p.knobs, board, 1, m.snapPiece[i] === n ? m.snap[i]!.value : 0)
    }
    // 飞着的块（画在最上面）
    for (let n = 0; n < ROWS * COLS; n++) {
      const p = m.pieces[i]![n]!
      if (p.state !== 'flying' || p.delay > 0) continue
      const slot = m.slotOf(i, n)
      drawPiece(ctx, p.x.value, p.y.value, slot.x, slot.y, g.pieceW, g.pieceH, p.knobs, board, p.scale.value, 0)
    }
    if (g.size > 0) {
      // 一题里的表演（B72）：整体交给 withActBody；等久了手托下巴想，按键双手伸到胸前准备，答错挠挠头（晃得轻一点）
      const s = g.size
      const x = g.kidX[i]!
      const y = g.kidY[i]!
      const dir: 1 | -1 = i === 0 ? 1 : -1
      const lift = m.liftOf(kid)
      const a = kid.act.pose()
      if (kid.act.wrongT >= 0) a.shake *= 0.4
      const base = pickerAct(kid.act, a)
      withActBody(ctx, x, y, s, a, dir, () =>
        drawPicker(ctx, 0, 0, s, kid.team, m.kinds[i]!, {
          ...base,
          lift,
          cheer: kid.mood === 'win' ? 1 : 0,
          scratch: Math.max(base.scratch, m.scratchOf(kid)),
          blink: kid.blink.value,
          look: Math.abs(base.look) > kid.look.value ? base.look : kid.look.value,
          leaf: 0,
          dir,
          chin: a.think,
          ready: kid.act.typing,
        }),
      )
      drawActFx(ctx, x + dir * s * 0.05, y - lift - (a.lift + PICKER_HEAD) * s, s, a, { side: dir, quality: m.quality })
    }
  })
  m.particles.draw(ctx)
}
