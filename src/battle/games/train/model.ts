/**
 * 开火车的纯模型（需求 B36v）：快照 + 事件 + 时间 → 场景数据（两列火车的车头位置、轮子转角、烟、信号灯、站台上的乘客、铃、粒子）。
 * 车头位置由分数定：mouthX + 车头长 + 分数 × 车厢间距——正好开出 score 节车厢；8 分（赢了）再一路开到对面的车站。
 * 倒数时整列火车藏在隧道里只亮车灯，「开始」才开出来。不碰 canvas，随机数可注种子，node 里可测；渲染在 render.ts。
 */
import type { RNG } from '@/engine'
import type { Team } from '@/battle/protocol'
import type { GameEvent, GameState } from '@/battle/game/contract'
import { ParticlePool } from '@/battle/game/engine/particles'
import { Racer } from '@/battle/game/engine/racer'
import { Decay } from '@/battle/game/engine/rig'
import { clamp, ease, Tween } from '@/battle/game/engine/tween'
import { CHIMNEY_X, CHIMNEY_Y } from '@/battle/game/sprites/train'
import type { CritterKind } from '@/battle/game/sprites/scenery'

/** 默认的两位司机；选了小动物（B66）就换成他们的 */
export const DRIVERS: [CritterKind, CritterKind] = ['bear', 'pig']

export interface TrainGeometry {
  W: number
  H: number
  compact: boolean
  /** 相对 120px 高的缩放 */
  k: number
  /** 隧道口（山的右边缘）：火车从这里开出来，左边的部分看不见 */
  mouthX: number
  /** 隧道洞顶 */
  archTop: number
  /** 隧道洞的宽（深色部分） */
  archW: number
  /** 赢了车头停在这里（对面的车站） */
  stationX: number
  /** 站台左端 */
  platformX: number
  /** 雨棚顶边（非紧凑版） */
  roofY: number
  /** 两条铁轨的钢轨顶面 y（红上蓝下） */
  laneY: [number, number]
  roadTop: number
  roadBottom: number
  /** 车头长度 */
  size: number
  /** 车厢长度、车厢间距（含挂钩）、一节的步长 = carLen + gap */
  carLen: number
  gap: number
  pitch: number
  skyH: number
  /** 倒数时车头藏在隧道里的位置（车鼻刚好在洞口里面） */
  hiddenX: number
}

export function layoutTrain(W: number, H: number, compact: boolean): TrainGeometry {
  const k = H / 120
  const scale = Math.min(1, W / 1000)
  const size = compact ? Math.min(30, H * 0.5) : 42 * k
  const mouthX = compact ? 36 : 84 * scale + 8
  const stationX = W - (compact ? 34 : 70 * scale + 10)
  const roadTop = compact ? H * 0.08 : H * 0.36
  const roadBottom = compact ? H * 0.96 : H * 0.94
  const laneH = (roadBottom - roadTop) / 2
  const gap = size * 0.14
  let carLen = size * 0.85
  let pitch = carLen + gap
  // 8 节都开出来之后还要留一段路冲到车站（至少两个车头长）
  const maxPitch = (stationX - mouthX - size - size * 2) / 8
  if (pitch > maxPitch) {
    pitch = Math.max(size * 0.3, maxPitch)
    carLen = pitch - gap
  }
  return {
    W,
    H,
    compact,
    k,
    mouthX,
    archTop: compact ? roadTop : roadTop - 4 * k,
    archW: compact ? size * 0.5 : size * 0.55,
    stationX,
    platformX: stationX - size * 2.2,
    roofY: roadTop - size * 0.72 - 5 * k,
    laneY: [roadTop + laneH * 0.92, roadTop + laneH * 1.92],
    roadTop,
    roadBottom,
    size,
    carLen,
    gap,
    pitch,
    skyH: compact ? H * 0.3 : roadTop,
    hiddenX: mouthX - size * 0.12,
  }
}

export interface Cloud {
  x: number
  y: number
  s: number
  v: number
}

export interface TrainOptions {
  reducedMotion: boolean
}

/** 得一分开出一节：0.8 秒 */
export const RUN_TIME = 0.8
export const RUN_TIME_REDUCED = 0.3
/** 「开始」从隧道里开出来 */
export const OUT_TIME = 1.2
/** 赢了一路开到对面的车站 */
export const WIN_TIME = 1.8
export const SPRINT_FROM = 2
const CROWD = 3
/** 跑的时候冒烟的间隔（秒），连对更密 */
const PUFF_GAP = 0.14
/** 停着（比赛中）偶尔冒一小口 */
const IDLE_PUFF_GAP = 0.9
/** 输了：熄火冒黑烟 */
const DARK_PUFF_GAP = 0.5

export class TrainModel {
  geo: TrainGeometry = layoutTrain(1000, 120, false)
  trains: [Racer, Racer]
  /** 两位司机（B66：按快照里两队的小动物换） */
  kinds: [CritterKind, CritterKind] = [DRIVERS[0], DRIVERS[1]]
  /** 轮子转角（按走过的距离累计） */
  wheel: [number, number] = [0, 0]
  /** 正在滚动的程度 0…1（按每帧位移判，赢了冲向车站时 Racer 的 moving 不算） */
  roll: [number, number] = [0, 0]
  /** 到站了（蒸汽 / 彩纸 / 举旗只放一次） */
  arrived: [boolean, boolean] = [false, false]
  /** 汽笛喷汽 */
  whistle: [Decay, Decay] = [new Decay(0.35), new Decay(0.35)]
  private lastX: [number, number] = [0, 0]
  private puffT: [number, number] = [0, 0]
  clouds: Cloud[] = []
  time = 0
  phase: GameState['phase'] = 'lobby'
  winner: Team | null = null
  target = 8
  sprint = false
  /** 信号灯：0 红灯 1 绿灯 */
  signal = new Tween(0, ease.outCubic)
  /** 铃摆动（到站 / 还差一分） */
  bell = new Decay(0.7)
  /** 还差一分：站牌钟发光 */
  signGlow = new Decay(1)
  /** 站长举旗迎接：0 旗放下 1 举起 */
  greet = new Tween(0, ease.outBack)
  crowdWave: number[] = Array.from({ length: CROWD }, () => 0)
  crowdJump = 0
  particles: ParticlePool
  quality = 0
  private readonly rng: RNG
  private readonly opts: TrainOptions

  constructor(rng: RNG, opts: TrainOptions = { reducedMotion: false }) {
    this.rng = rng
    this.opts = opts
    this.particles = new ParticlePool(64, () => rng.next())
    this.trains = [new Racer('red', rng, ease.outCubic), new Racer('blue', rng, ease.outCubic)]
    this.layout(1000, 120, false)
  }

  get animated(): boolean {
    return !this.opts.reducedMotion
  }

  private get timing() {
    return { animated: this.animated, moveTime: RUN_TIME, moveTimeReduced: RUN_TIME_REDUCED }
  }

  layout(W: number, H: number, compact: boolean): void {
    this.geo = layoutTrain(W, H, compact)
    this.trains.forEach((c, i) => {
      c.pos.set(c.mood === 'ready' ? this.geo.hiddenX : this.xFor(c.score, c.mood === 'win'))
      this.lastX[i] = c.pos.value
    })
    const n = compact ? 1 : 3
    this.clouds = Array.from({ length: n }, (_, i) => ({
      x: (W * (i + 0.5)) / n + (this.rng.next() - 0.5) * 80,
      y: this.geo.skyH * (0.15 + this.rng.next() * 0.4),
      s: (compact ? 8 : 12) * (0.8 + this.rng.next() * 0.5),
      v: (compact ? 6 : 10) * (0.7 + this.rng.next() * 0.6),
    }))
  }

  /** 车头（车鼻）的位置：正好开出 score 节车厢 */
  headFor(score: number): number {
    const g = this.geo
    return g.mouthX + g.size + clamp(score, 0, this.target) * g.pitch
  }

  xFor(score: number, won = false): number {
    return won ? this.geo.stationX : this.headFor(score)
  }

  train(team: Team): Racer {
    return this.trains[team === 'red' ? 0 : 1]
  }

  /** 已经完全开出隧道的车厢数 */
  carsOut(i: 0 | 1): number {
    const g = this.geo
    const n = Math.floor((this.trains[i].pos.value - g.mouthX - g.size) / g.pitch + 1e-6)
    return clamp(n, 0, this.target)
  }

  /** 第 j 节车厢（1 起）的前端 x */
  wagonX(i: 0 | 1, j: number): number {
    const g = this.geo
    return this.trains[i].pos.value - g.size - g.gap - (j - 1) * g.pitch
  }

  setState(s: GameState): void {
    this.target = Math.max(1, s.target)
    this.kinds = [s.avatars?.red ?? DRIVERS[0], s.avatars?.blue ?? DRIVERS[1]]
    const prevPhase = this.phase
    this.phase = s.phase
    this.winner = s.winner
    this.sprint = Math.max(s.red, s.blue) >= this.target - SPRINT_FROM && s.phase !== 'ended'
    const g = this.geo
    const parked = s.phase === 'lobby' || s.phase === 'countdown'
    this.trains.forEach((c, i) => {
      const wasWin = c.mood === 'win'
      const forward = c.apply(s, (score, won) => this.xFor(score, won), this.timing)
      if (parked) c.pos.set(g.hiddenX)
      else if (c.pos.target < this.headFor(0) - 0.5) {
        // 还藏在隧道里（刚开始 / 晚进来的观战者）：开出来到自己分数的位置
        c.pos.to(this.headFor(c.score), this.animated ? OUT_TIME : RUN_TIME_REDUCED, ease.outCubic)
      } else if (!wasWin && c.mood === 'win') {
        // 赢了：一路开到对面的车站（比得分那一步远得多，走得久一点、匀速一点）
        c.pos.to(g.stationX, this.animated ? WIN_TIME : RUN_TIME_REDUCED, ease.inOutSine)
        this.arrived[i] = false
      }
      if (forward) this.puff(c, 3)
    })
    if ((prevPhase === 'countdown' || prevPhase === 'lobby') && s.phase === 'playing') this.go()
    if (s.phase !== 'ended') this.arrived = [false, false]
    if (parked) {
      this.signal.set(0)
      this.greet.set(0)
      this.crowdJump = 0
      this.particles.clear()
      this.trains.forEach((c, i) => {
        this.lastX[i] = c.pos.value
      })
    }
  }

  /** 烟囱冒烟（隧道里冒的从洞口顶上飘出来）；dark = 熄火的黑烟 */
  private puff(c: Racer, n: number, dark = false, small = false): void {
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const lane = c.team === 'red' ? 0 : 1
    let x = c.pos.value + g.size * CHIMNEY_X
    let y = g.laneY[lane] + g.size * CHIMNEY_Y
    // 烟囱还在洞里：烟从洞口顶上往右上飘出来（不往山里飘）
    const inside = x < g.mouthX
    if (inside) {
      x = g.mouthX + 2 * g.k
      y = g.archTop + 3 * g.k
    }
    this.particles.emit({
      x,
      y,
      count: n,
      speed: (small ? 22 : 40) * g.k,
      angle: inside ? -Math.PI * 0.35 : Math.PI * 0.72,
      spread: 0.7,
      life: small ? 0.8 : 1.1,
      size: (small ? 2.6 : dark ? 3.6 : 4.2) * g.k,
      colors: dark ? ['#5f5f66', '#7a7a82'] : ['#d9dde5', '#c9ced8', '#eef0f4'],
      gravity: -36 * g.k,
      drag: 2.2,
    })
  }

  /** 「开始」：信号变绿，两列火车鸣笛、从隧道口冒一大团烟（开出来的位移由 setState 里的快照定） */
  private go(): void {
    this.signal.to(1, this.animated ? 0.5 : 0.1)
    this.trains.forEach((c) => {
      c.boost.kick(0.4)
      this.puff(c, 6)
    })
    for (const w of this.whistle) w.kick(1)
  }

  /** 到站：两侧喷蒸汽、鸣笛、铃响、站长举旗、乘客跳起来撒彩纸 */
  private arrive(c: Racer, i: 0 | 1): void {
    this.arrived[i] = true
    this.whistle[i].kick(1)
    this.bell.kick(1)
    this.greet.to(1, this.animated ? 0.45 : 0.1)
    this.crowdJump = 1
    if (!this.animated || this.quality >= 2) return
    const g = this.geo
    const y = g.laneY[i] - g.size * 0.16
    for (const dir of [0, Math.PI]) {
      this.particles.emit({
        x: c.pos.value - g.size * 0.5,
        y,
        count: 7,
        speed: 55 * g.k,
        angle: dir,
        spread: 0.9,
        life: 0.8,
        size: 4 * g.k,
        colors: ['#ffffff', '#f0f0f4'],
        gravity: -20 * g.k,
        drag: 2.5,
      })
    }
    const colors = c.team === 'red' ? ['#ff6b6b', '#ffc93c', '#fff', '#ff9b9b'] : ['#4aa3ff', '#ffc93c', '#fff', '#8fc3ff']
    this.particles.emit({
      x: g.stationX - g.size * 0.6,
      y: g.roadTop - g.size * 0.4,
      count: 26,
      speed: 130 * g.k,
      angle: -Math.PI / 2,
      spread: Math.PI * 1.2,
      life: 1.6,
      size: 4 * g.k,
      colors,
      shape: 'flake',
      gravity: 120 * g.k,
      drag: 1.2,
    })
  }

  onEvent(e: GameEvent): void {
    switch (e.type) {
      case 'countdown':
        for (const c of this.trains) c.setMood('ready')
        break
      case 'go':
        this.go()
        break
      case 'point': {
        const c = this.train(e.team)
        c.boost.kick(Math.min(1, (e.streak - 1) * 0.35))
        const side = e.team === 'red' ? 0 : 1
        for (let i = 0; i < CROWD; i++) if (i % 2 === side) this.crowdWave[i] = 1
        break
      }
      case 'streak':
        this.train(e.team).boost.kick(1)
        this.whistle[e.team === 'red' ? 0 : 1].kick(1)
        break
      case 'lead':
        this.train(e.team === 'red' ? 'blue' : 'red').look.kick(1)
        break
      case 'nearWin':
        this.signGlow.kick(1)
        this.bell.kick(0.6)
        break
      case 'finished':
        this.bell.kick(1)
        break
      case 'half':
        // 到一半（B70）：那一队做一下「点一下」的小动作
        this.poke(e.team)
        break
      default:
        break
    }
  }

  /** 点一下（B59）：鸣笛喷汽、烟囱冒一团烟、车身颠一下 */
  /** 终局特写（B63）要对准的点：这一队的角色现在在盒子里的位置 */
  focus(team: Team): { x: number; y: number } {
    const g = this.geo
    const i = team === 'red' ? 0 : 1
    const c = this.trains[i]!
    return { x: c.pos.value - g.size * 0.6, y: g.laneY[i]! - g.size * 0.35 }
  }
  poke(team: Team): void {
    const c = this.train(team)
    c.poke.kick(1)
    this.whistle[team === 'red' ? 0 : 1].kick(1)
    this.puff(c, 4)
  }

  degrade(level: number): void {
    this.quality = level
    if (level >= 2) this.particles.clear()
  }

  step(dt: number): void {
    this.time += dt
    const g = this.geo
    const animated = this.animated
    if (animated && this.quality < 1) {
      for (const c of this.clouds) {
        c.x += c.v * dt
        if (c.x - c.s * 1.2 > g.W) c.x = -c.s * 1.5
      }
    }
    this.signal.step(dt)
    this.greet.step(dt)
    this.bell.step(dt)
    this.signGlow.step(dt)
    for (let i = 0; i < CROWD; i++) {
      const w = this.crowdWave[i]!
      this.crowdWave[i] = this.sprint ? Math.max(0.5, w) : w > 0.001 ? w * Math.pow(0.5, dt / 0.6) : 0
    }
    if (this.crowdJump > 0) this.crowdJump += dt
    this.trains.forEach((c, idx) => {
      const i = idx as 0 | 1
      c.step(dt, 5, animated)
      this.whistle[i].step(dt)
      // 轮子按走过的距离转；滚动程度按每帧位移算（赢了冲向车站时也算在滚）
      const dx = c.pos.value - this.lastX[i]
      this.lastX[i] = c.pos.value
      const r = g.size * 0.11
      this.wheel[i] = this.wheel[i] + dx / r
      const rolling = Math.abs(dx) > 0.02
      this.roll[i] += ((rolling ? 1 : 0) - this.roll[i]) * Math.min(1, dt * 10)
      // 烟：跑的时候按速度冒，连对更密；停着偶尔冒一小口；输了熄火冒黑烟
      this.puffT[i] += dt
      if (rolling) {
        if (this.puffT[i] > PUFF_GAP / (1 + c.boost.value * 1.5)) {
          this.puffT[i] = 0
          this.puff(c, 1 + Math.round(c.boost.value * 2))
        }
      } else if (c.mood === 'lose') {
        if (this.puffT[i] > DARK_PUFF_GAP) {
          this.puffT[i] = 0
          this.puff(c, 1, true)
        }
      } else if (this.phase !== 'lobby' && this.puffT[i] > IDLE_PUFF_GAP) {
        this.puffT[i] = 0
        this.puff(c, 1, false, true)
      }
      if (c.mood === 'win' && c.pos.done && !this.arrived[i]) this.arrive(c, i)
    })
    this.particles.step(dt)
  }

  /** 车身离地：跑动时轻微颠簸，到站后高兴地一颠一颠 */
  lift(c: Racer): number {
    return this.liftBase(c) + c.poke.value * this.geo.size * 0.08
  }

  private liftBase(c: Racer): number {
    const g = this.geo
    if (!this.animated) return 0
    const i = c.team === 'red' ? 0 : 1
    if (c.mood === 'win' && this.arrived[i]) return Math.abs(Math.sin(c.phase)) * g.size * 0.04
    return Math.abs(Math.sin(c.phase * 2)) * g.size * 0.015 * this.roll[i]
  }

  /** 车灯：隧道里最亮，跑的时候亮，停着微亮，熄火了几乎不亮 */
  light(c: Racer): number {
    if (c.mood === 'ready') return 1
    if (c.mood === 'lose') return 0.12
    const i = c.team === 'red' ? 0 : 1
    return 0.35 + this.roll[i] * 0.45
  }

  sad(c: Racer): number {
    return c.mood === 'lose' ? Math.min(1, c.moodT) : 0
  }
}
