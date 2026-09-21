/**
 * 抢旗场景的道具：两头的城堡（队色城垛、塔楼、旗帜、城门）、赛场上的格子石子、正中那面星星旗。
 * 小动物复用摘果子的 drawPicker（系队色围巾）。
 */
import type { Team } from '@/battle/protocol'
import { circle, fillRoundRect, withAlpha, withTransform } from '../engine/draw'
import { starPath } from './space'

const TEAM: Record<Team, { main: string; dark: string; wall: string; wallDark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c', wall: '#f2d3c2', wallDark: '#d9a98f' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6', wall: '#d3e3f2', wallDark: '#9fbfd9' },
}

/** 城堡：主体 + 城垛 + 一座塔楼（塔顶插旗）+ 城门（gate 0…1 放下来）；(x, groundY) 是底边中点，facing 是朝赛场的方向 */
export function drawCastle(ctx: CanvasRenderingContext2D, x: number, groundY: number, w: number, h: number, team: Team, facing: 1 | -1, wave: number, gate: number, glow: number): void {
  const c = TEAM[team]
  const towerW = w * 0.36
  const towerH = h * 1.35
  const towerX = x - facing * w * 0.22
  if (glow > 0.02) {
    withAlpha(ctx, glow * 0.5, () => {
      ctx.fillStyle = '#fff3b0'
      ctx.beginPath()
      ctx.roundRect(x - w * 0.65, groundY - towerH * 1.15, w * 1.3, towerH * 1.2, w * 0.2)
      ctx.fill()
    })
  }
  // 主体
  ctx.fillStyle = c.wall
  ctx.fillRect(x - w / 2, groundY - h, w, h)
  ctx.fillStyle = c.wallDark
  ctx.fillRect(x - w / 2, groundY - h * 0.12, w, h * 0.12)
  // 城垛
  const merlon = w / 7
  for (let i = 0; i < 7; i += 2) {
    ctx.fillStyle = c.wall
    ctx.fillRect(x - w / 2 + i * merlon, groundY - h - merlon * 0.9, merlon, merlon * 0.9)
  }
  // 塔楼 + 队色塔顶 + 旗
  ctx.fillStyle = c.wall
  ctx.fillRect(towerX - towerW / 2, groundY - towerH, towerW, towerH)
  ctx.fillStyle = c.main
  ctx.beginPath()
  ctx.moveTo(towerX - towerW * 0.6, groundY - towerH)
  ctx.lineTo(towerX, groundY - towerH - towerW * 0.7)
  ctx.lineTo(towerX + towerW * 0.6, groundY - towerH)
  ctx.closePath()
  ctx.fill()
  const poleTop = groundY - towerH - towerW * 0.7 - towerW * 0.7
  ctx.strokeStyle = '#6b4f2e'
  ctx.lineWidth = Math.max(1, towerW * 0.06)
  ctx.beginPath()
  ctx.moveTo(towerX, groundY - towerH - towerW * 0.7)
  ctx.lineTo(towerX, poleTop)
  ctx.stroke()
  withTransform(ctx, towerX, poleTop, Math.sin(wave) * 0.12, facing, 1, () => {
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(towerW * 0.7 + Math.sin(wave * 1.3) * towerW * 0.06, towerW * 0.18)
    ctx.lineTo(0, towerW * 0.36)
    ctx.closePath()
    ctx.fill()
  })
  // 窗
  ctx.fillStyle = c.wallDark
  ctx.fillRect(towerX - towerW * 0.12, groundY - towerH * 0.7, towerW * 0.24, towerW * 0.3)
  // 城门（朝赛场那边）：拱门 + 放下来的闸
  const gateW = w * 0.26
  const gateH = h * 0.62
  const gateX = x + facing * w * 0.2
  ctx.fillStyle = '#5a3a2a'
  ctx.beginPath()
  ctx.moveTo(gateX - gateW / 2, groundY)
  ctx.lineTo(gateX - gateW / 2, groundY - gateH + gateW / 2)
  ctx.arc(gateX, groundY - gateH + gateW / 2, gateW / 2, Math.PI, 0)
  ctx.lineTo(gateX + gateW / 2, groundY)
  ctx.closePath()
  ctx.fill()
  if (gate > 0.02) {
    ctx.strokeStyle = '#9a9aa8'
    ctx.lineWidth = Math.max(1, gateW * 0.08)
    ctx.beginPath()
    const top = groundY - gateH
    const bottom = top + gateH * gate
    for (let i = 1; i < 4; i++) {
      const gx = gateX - gateW / 2 + (gateW * i) / 4
      ctx.moveTo(gx, top)
      ctx.lineTo(gx, bottom)
    }
    ctx.stroke()
  }
}

/** 赛场上的格子标记（小石子） */
export function drawStone(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, mid: boolean): void {
  ctx.fillStyle = mid ? '#ffd54a' : 'rgba(255,255,255,0.7)'
  circle(ctx, x, y, mid ? r * 1.3 : r)
  ctx.fill()
}

/** 星星旗：白旗（插进城堡后变队色）；(x, y) 是杆底 */
export function drawStarFlag(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, team: Team | null, wave: number, dir: 1 | -1): void {
  ctx.strokeStyle = '#6b4f2e'
  ctx.lineCap = 'round'
  ctx.lineWidth = Math.max(1.5, h * 0.07)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y - h)
  ctx.stroke()
  ctx.fillStyle = '#ffd54a'
  circle(ctx, x, y - h, h * 0.06)
  ctx.fill()
  const fw = h * 0.6
  const fh = h * 0.38
  withTransform(ctx, x, y - h * 0.98, Math.sin(wave) * 0.1, dir, 1, () => {
    ctx.fillStyle = team ? TEAM[team].main : '#ffffff'
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(fw + Math.sin(wave * 1.3) * fw * 0.08, fh * 0.5)
    ctx.lineTo(0, fh)
    ctx.closePath()
    ctx.fill()
    ctx.strokeStyle = team ? TEAM[team].dark : '#c9c9d4'
    ctx.lineWidth = Math.max(1, h * 0.03)
    ctx.stroke()
    ctx.fillStyle = team ? '#ffffff' : '#ffd54a'
    starPath(ctx, fw * 0.35, fh * 0.5, fh * 0.22)
    ctx.fill()
  })
}

/** 队色的一小块地毯：标出哪座城堡是谁的 */
export function drawRug(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, team: Team): void {
  fillRoundRect(ctx, x - w / 2, y - h / 2, w, h, h / 2, TEAM[team].main)
}
