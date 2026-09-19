/** 粒子池：固定上限（尘土 / 彩纸 / 水花 / 火焰共用），满了就顶掉最老的。 */

export interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  age: number
  life: number
  size: number
  color: string
  shape: 'dot' | 'flake'
  rot: number
  vrot: number
  gravity: number
  drag: number
}

export interface EmitOptions {
  x: number
  y: number
  count?: number
  /** 初速度（px/s）与方向（弧度，0 = 向右，-π/2 = 向上）、扩散角 */
  speed?: number
  angle?: number
  spread?: number
  life?: number
  size?: number
  colors?: readonly string[]
  shape?: Particle['shape']
  gravity?: number
  drag?: number
}

export const DEFAULT_CAPACITY = 64

export class ParticlePool {
  readonly items: Particle[] = []

  constructor(
    readonly capacity = DEFAULT_CAPACITY,
    private readonly random: () => number = Math.random,
  ) {}

  get count(): number {
    return this.items.length
  }

  emit(o: EmitOptions): void {
    const n = o.count ?? 6
    const speed = o.speed ?? 80
    const angle = o.angle ?? -Math.PI / 2
    const spread = o.spread ?? Math.PI / 3
    const colors = o.colors && o.colors.length ? o.colors : ['#ffffff']
    for (let i = 0; i < n; i++) {
      const a = angle + (this.random() - 0.5) * spread
      const v = speed * (0.6 + this.random() * 0.8)
      const p: Particle = {
        x: o.x,
        y: o.y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        age: 0,
        life: (o.life ?? 0.7) * (0.7 + this.random() * 0.6),
        size: (o.size ?? 4) * (0.7 + this.random() * 0.6),
        color: colors[Math.floor(this.random() * colors.length)]!,
        shape: o.shape ?? 'dot',
        rot: this.random() * Math.PI * 2,
        vrot: (this.random() - 0.5) * 8,
        gravity: o.gravity ?? 200,
        drag: o.drag ?? 1.5,
      }
      if (this.items.length >= this.capacity) this.items.shift()
      this.items.push(p)
    }
  }

  step(dt: number): void {
    const items = this.items
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i]!
      p.age += dt
      if (p.age >= p.life) {
        items.splice(i, 1)
        continue
      }
      p.vy += p.gravity * dt
      const k = Math.max(0, 1 - p.drag * dt)
      p.vx *= k
      p.vy *= k
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.rot += p.vrot * dt
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.items) {
      const k = 1 - p.age / p.life
      ctx.globalAlpha = Math.max(0, Math.min(1, k * 1.2))
      ctx.fillStyle = p.color
      if (p.shape === 'flake') {
        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rot)
        ctx.fillRect(-p.size / 2, -p.size / 3, p.size, (p.size * 2) / 3)
        ctx.restore()
      } else {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size * (0.5 + 0.5 * k), 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.globalAlpha = 1
  }

  clear(): void {
    this.items.length = 0
  }
}
