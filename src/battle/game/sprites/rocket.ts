/**
 * 火箭：尾翼、白色机身带队色条纹、队色鼻锥、圆舷窗、尾焰。
 * 坐标：原点在机身底部正中（尾焰从这里往下喷），朝上；s 是机身高度（iPad 约 44px）。
 */
import { circle, withTransform } from '../engine/draw'
import type { Team } from '@/battle/protocol'

export interface RocketPose {
  /** 整体倾斜（弧度，正 = 顺时针） */
  tilt: number
  /** 尾焰大小 0（熄火）…1.5（喷大火） */
  flame: number
  /** 尾焰抖动 0…1 */
  flicker: number
}

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

export function drawFlame(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, flame: number, flicker: number): void {
  if (flame <= 0.02) return
  const len = s * 0.45 * flame * (1 + flicker * 0.25)
  const w = s * 0.16 * (0.8 + flame * 0.4)
  ctx.fillStyle = '#ff9f43'
  ctx.beginPath()
  ctx.moveTo(x - w, y)
  ctx.quadraticCurveTo(x - w * 0.6, y + len * 0.6, x, y + len)
  ctx.quadraticCurveTo(x + w * 0.6, y + len * 0.6, x + w, y)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#ffe66d'
  ctx.beginPath()
  ctx.moveTo(x - w * 0.5, y)
  ctx.quadraticCurveTo(x - w * 0.3, y + len * 0.35, x, y + len * 0.55)
  ctx.quadraticCurveTo(x + w * 0.3, y + len * 0.35, x + w * 0.5, y)
  ctx.closePath()
  ctx.fill()
}

export function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, s: number, team: Team, p: RocketPose): void {
  const c = TEAM[team]
  withTransform(ctx, x, y, p.tilt, 1, 1, () => {
    drawFlame(ctx, 0, -s * 0.02, s, p.flame, p.flicker)
    // 尾翼
    ctx.fillStyle = c.dark
    ctx.beginPath()
    ctx.moveTo(-s * 0.2, -s * 0.34)
    ctx.lineTo(-s * 0.42, s * 0.08)
    ctx.lineTo(-s * 0.2, -s * 0.02)
    ctx.closePath()
    ctx.fill()
    ctx.beginPath()
    ctx.moveTo(s * 0.2, -s * 0.34)
    ctx.lineTo(s * 0.42, s * 0.08)
    ctx.lineTo(s * 0.2, -s * 0.02)
    ctx.closePath()
    ctx.fill()
    // 机身
    ctx.fillStyle = '#f6f6fb'
    ctx.beginPath()
    ctx.roundRect(-s * 0.22, -s * 0.86, s * 0.44, s * 0.86, s * 0.14)
    ctx.fill()
    ctx.fillStyle = '#d9d9e6'
    ctx.beginPath()
    ctx.roundRect(s * 0.1, -s * 0.8, s * 0.1, s * 0.72, s * 0.05)
    ctx.fill()
    // 队色条纹
    ctx.fillStyle = c.main
    ctx.fillRect(-s * 0.22, -s * 0.3, s * 0.44, s * 0.1)
    // 鼻锥
    ctx.fillStyle = c.main
    ctx.beginPath()
    ctx.moveTo(-s * 0.22, -s * 0.84)
    ctx.quadraticCurveTo(-s * 0.1, -s * 1.12, 0, -s * 1.18)
    ctx.quadraticCurveTo(s * 0.1, -s * 1.12, s * 0.22, -s * 0.84)
    ctx.closePath()
    ctx.fill()
    // 舷窗
    ctx.fillStyle = c.dark
    circle(ctx, 0, -s * 0.56, s * 0.15)
    ctx.fill()
    ctx.fillStyle = '#bfe8ff'
    circle(ctx, 0, -s * 0.56, s * 0.1)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    circle(ctx, -s * 0.035, -s * 0.6, s * 0.035)
    ctx.fill()
  })
}
