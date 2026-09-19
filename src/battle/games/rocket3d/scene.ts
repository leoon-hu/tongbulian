/**
 * 火箭升空 3D 试点（需求 B36f）的场景：用 Three.js 把 2D 版的模型（games/rocket/model.ts，同一份比赛逻辑与几何）画成 3D。
 * 世界坐标 = CSS 像素（x 向右、y 向上 = −像素 y、z 朝观众），透视相机的距离与视角算成 z = 0 平面正好是盒子的像素尺寸，
 * 所以模型算出来的位置直接可用；星星 / 行星 / 月亮放在后面几层有视差。
 * 这里只搭场景与每帧同步，不碰 WebGLRenderer（node 里能测）；Three 的命名空间由调用方传进来（按需加载）。
 */
import type * as ThreeNs from 'three'
import type { Team } from '@/battle/protocol'
import { breathe } from '@/battle/game/engine/rig'
import type { Rocket, RocketModel } from '../rocket/model'

export type Three = typeof ThreeNs

const TEAM: Record<Team, { main: string; dark: string }> = {
  red: { main: '#ff6b6b', dark: '#d94c4c' },
  blue: { main: '#4aa3ff', dark: '#2f7fd6' },
}

/** 粒子池的容量（与 ParticlePool 默认一致；缓冲区按它分配） */
const PARTICLE_CAP = 64

const PARTICLE_VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vAlpha = aAlpha;
  vColor = aColor;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(1.0, -mv.z);
}`

const PARTICLE_FRAG = `
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec2 d = gl_PointCoord - vec2(0.5);
  if (dot(d, d) > 0.25) discard;
  gl_FragColor = vec4(vColor, vAlpha);
}`

export interface RocketParts {
  rockets: [ThreeNs.Group, ThreeNs.Group]
  flames: [ThreeNs.Group, ThreeNs.Group]
  goals: [ThreeNs.Group, ThreeNs.Group]
  pads: [ThreeNs.Mesh, ThreeNs.Mesh]
  stars: [ThreeNs.Points, ThreeNs.Points]
  particles: ThreeNs.Points
  planet: ThreeNs.Group | null
  moon: ThreeNs.Mesh | null
  shooting: ThreeNs.Mesh
  backdrop: ThreeNs.Mesh
}

export interface RocketScene {
  scene: ThreeNs.Scene
  camera: ThreeNs.PerspectiveCamera
  parts: RocketParts
  /** 盒子尺寸 / 布局变了：相机与不动的物件重新摆（模型要先 layout 好） */
  layout(): void
  /** 每帧把模型状态同步到物件上；dpr 用来算粒子的像素大小 */
  sync(dpr: number): void
  dispose(): void
}

function starShape(T: Three, r: number): ThreeNs.Shape {
  const s = new T.Shape()
  for (let i = 0; i < 10; i++) {
    const rr = i % 2 === 0 ? r : r * 0.45
    const a = -Math.PI / 2 + (Math.PI / 5) * i
    const x = Math.cos(a) * rr
    const y = Math.sin(a) * rr
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  s.closePath()
  return s
}

export function createRocketScene(T: Three, model: RocketModel): RocketScene {
  const scene = new T.Scene()
  scene.background = new T.Color('#0b1030')
  const camera = new T.PerspectiveCamera(45, 1, 1, 6000)

  // 灯光：环境光 + 从左上来的平行光
  const ambient = new T.AmbientLight(0xffffff, 1.2)
  const sun = new T.DirectionalLight(0xffffff, 2.2)
  sun.position.set(-1, 1, 1.6)
  scene.add(ambient, sun)

  // 背景渐变：一块很大的平面，按 2D 版星空渐变的四档颜色给顶点上色（1 × 3 段 = 四排顶点）
  const bgGeo = new T.PlaneGeometry(1, 1, 1, 3)
  const stops: [number, ThreeNs.Color][] = [
    [0, new T.Color('#0b1440')],
    [0.55, new T.Color('#22225f')],
    [0.9, new T.Color('#4b2b7c')],
    [1, new T.Color('#7a4a6a')],
  ]
  const pos = bgGeo.attributes.position!
  const bgColors: number[] = []
  for (let i = 0; i < pos.count; i++) {
    const t = 0.5 - pos.getY(i)
    let c = stops[stops.length - 1]![1]
    for (let j = 1; j < stops.length; j++) {
      const [t0, c0] = stops[j - 1]!
      const [t1, c1] = stops[j]!
      if (t <= t1) {
        c = c0.clone().lerp(c1, t1 === t0 ? 0 : (t - t0) / (t1 - t0))
        break
      }
    }
    bgColors.push(c.r, c.g, c.b)
  }
  bgGeo.setAttribute('color', new T.Float32BufferAttribute(bgColors, 3))
  const backdrop = new T.Mesh(bgGeo, new T.MeshBasicMaterial({ vertexColors: true }))
  scene.add(backdrop)

  // 星星：两组交替闪
  const starMats = [0, 1].map(() => new T.PointsMaterial({ color: '#ffffff', size: 2, sizeAttenuation: false, transparent: true, opacity: 0.75, depthWrite: false }))
  const stars: [ThreeNs.Points, ThreeNs.Points] = [new T.Points(new T.BufferGeometry(), starMats[0]!), new T.Points(new T.BufferGeometry(), starMats[1]!)]
  scene.add(...stars)

  // 行星（带环）与月亮
  const planet = new T.Group()
  const planetBody = new T.Mesh(new T.SphereGeometry(1, 24, 16), new T.MeshStandardMaterial({ color: '#c98cff', roughness: 0.7 }))
  const ring = new T.Mesh(new T.RingGeometry(1.35, 1.95, 40), new T.MeshBasicMaterial({ color: '#e6ccff', side: T.DoubleSide, transparent: true, opacity: 0.7 }))
  ring.rotation.x = 1.25
  planet.add(planetBody, ring)
  scene.add(planet)
  const moon = new T.Mesh(new T.SphereGeometry(1, 20, 14), new T.MeshStandardMaterial({ color: '#f2f0d8', roughness: 0.9 }))
  scene.add(moon)

  // 地面、发射台、导轨、目标星
  const ground = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: '#3a2a4a', roughness: 1 }))
  scene.add(ground)
  const padMat = () => new T.MeshStandardMaterial({ color: '#6a5a7a', roughness: 0.8, emissive: new T.Color('#ffd54a'), emissiveIntensity: 0 })
  const pads: [ThreeNs.Mesh, ThreeNs.Mesh] = [new T.Mesh(new T.BoxGeometry(1, 1, 1), padMat()), new T.Mesh(new T.BoxGeometry(1, 1, 1), padMat())]
  const towers = [0, 1].map(() => new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshStandardMaterial({ color: '#8a7a9a', roughness: 0.8 })))
  const guides = [0, 1].map((i) => {
    const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(0, 0, 0), new T.Vector3(0, 1, 0)])
    const mat = new T.LineDashedMaterial({ color: i === 0 ? '#ff8c8c' : '#8cbeff', dashSize: 3, gapSize: 5, transparent: true, opacity: 0.35 })
    return new T.Line(geo, mat)
  })
  scene.add(...pads, ...towers, ...guides)
  const goals: [ThreeNs.Group, ThreeNs.Group] = [new T.Group(), new T.Group()]
  const goalMeshes = goals.map((g) => {
    const shape = starShape(T, 1)
    const core = new T.Mesh(new T.ShapeGeometry(shape), new T.MeshBasicMaterial({ color: '#ffd54a' }))
    const glow = new T.Mesh(new T.ShapeGeometry(shape), new T.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.25, blending: T.AdditiveBlending, depthWrite: false }))
    glow.scale.setScalar(1.8)
    glow.position.z = -1
    g.add(glow, core)
    scene.add(g)
    return { core, glow }
  })

  // 两枚火箭：机身、条纹、鼻锥、舷窗、四片尾翼、尾焰（内外两层）
  const rockets: [ThreeNs.Group, ThreeNs.Group] = [new T.Group(), new T.Group()]
  const flames: [ThreeNs.Group, ThreeNs.Group] = [new T.Group(), new T.Group()]
  const flameMats: ThreeNs.MeshBasicMaterial[][] = []
  model.rockets.forEach((r, i) => {
    const c = TEAM[r.team]
    const g = rockets[i]!
    const body = new T.Mesh(new T.CylinderGeometry(0.16, 0.145, 0.62, 20), new T.MeshStandardMaterial({ color: '#f4f4f8', roughness: 0.45 }))
    body.position.y = 0.31
    const stripe = new T.Mesh(new T.CylinderGeometry(0.165, 0.165, 0.1, 20), new T.MeshStandardMaterial({ color: c.main, roughness: 0.5 }))
    stripe.position.y = 0.42
    const nose = new T.Mesh(new T.ConeGeometry(0.16, 0.3, 20), new T.MeshStandardMaterial({ color: c.main, roughness: 0.5 }))
    nose.position.y = 0.77
    const window = new T.Mesh(new T.SphereGeometry(0.07, 12, 8), new T.MeshStandardMaterial({ color: '#8fd0ff', emissive: new T.Color('#3d8fe6'), emissiveIntensity: 0.4, roughness: 0.3 }))
    window.position.set(0, 0.36, 0.14)
    g.add(body, stripe, nose, window)
    for (let f = 0; f < 4; f++) {
      const a = (Math.PI / 2) * f
      const fin = new T.Mesh(new T.BoxGeometry(0.03, 0.24, 0.16), new T.MeshStandardMaterial({ color: c.dark, roughness: 0.6 }))
      fin.position.set(Math.sin(a) * 0.2, 0.1, Math.cos(a) * 0.2)
      fin.rotation.y = a
      g.add(fin)
    }
    const flame = flames[i]!
    const outerGeo = new T.ConeGeometry(0.14, 0.45, 16)
    outerGeo.rotateX(Math.PI)
    outerGeo.translate(0, -0.225, 0)
    const innerGeo = new T.ConeGeometry(0.08, 0.28, 12)
    innerGeo.rotateX(Math.PI)
    innerGeo.translate(0, -0.14, 0)
    const outerMat = new T.MeshBasicMaterial({ color: '#ff9f43', transparent: true, opacity: 0.9 })
    const innerMat = new T.MeshBasicMaterial({ color: '#ffe27a', transparent: true, opacity: 0.95 })
    flame.add(new T.Mesh(outerGeo, outerMat), new T.Mesh(innerGeo, innerMat))
    flameMats.push([outerMat, innerMat])
    g.add(flame)
    scene.add(g)
  })

  // 粒子（烟、发射烟、烟花）：一块固定大小的缓冲区，每帧从模型的粒子池抄过来
  const pGeo = new T.BufferGeometry()
  const pPos = new Float32Array(PARTICLE_CAP * 3)
  const pSize = new Float32Array(PARTICLE_CAP)
  const pAlpha = new Float32Array(PARTICLE_CAP)
  const pColor = new Float32Array(PARTICLE_CAP * 3)
  pGeo.setAttribute('position', new T.BufferAttribute(pPos, 3))
  pGeo.setAttribute('aSize', new T.BufferAttribute(pSize, 1))
  pGeo.setAttribute('aAlpha', new T.BufferAttribute(pAlpha, 1))
  pGeo.setAttribute('aColor', new T.BufferAttribute(pColor, 3))
  pGeo.setDrawRange(0, 0)
  const pMat = new T.ShaderMaterial({
    uniforms: { uScale: { value: 1 } },
    vertexShader: PARTICLE_VERT,
    fragmentShader: PARTICLE_FRAG,
    transparent: true,
    depthWrite: false,
  })
  const particles = new T.Points(pGeo, pMat)
  particles.frustumCulled = false
  scene.add(particles)
  const colorCache = new Map<string, [number, number, number]>()
  const rgb = (hex: string): [number, number, number] => {
    let c = colorCache.get(hex)
    if (!c) {
      const col = new T.Color(hex)
      c = [col.r, col.g, col.b]
      colorCache.set(hex, c)
    }
    return c
  }

  // 流星：一根细长的亮条
  const shooting = new T.Mesh(new T.BoxGeometry(1, 1, 1), new T.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0 }))
  shooting.visible = false
  scene.add(shooting)

  /** 相机到 z = 0 平面的距离 */
  let dist = 800
  const parallax = (px: number, py: number, z: number): [number, number] => {
    const g = model.geo
    const f = (dist - z) / dist
    return [g.W / 2 + (px - g.W / 2) * f, -(g.H / 2 + (py - g.H / 2) * f)]
  }

  function layout(): void {
    const g = model.geo
    const { W, H, k } = g
    dist = H * 1.15
    camera.aspect = W / H
    camera.fov = T.MathUtils.radToDeg(2 * Math.atan(H / 2 / dist))
    camera.position.set(W / 2, -H / 2, dist)
    camera.lookAt(W / 2, -H / 2, 0)
    camera.updateProjectionMatrix()
    // 背景平面在最后面，铺满那个深度的视野
    const bz = -900
    const bf = (dist - bz) / dist
    backdrop.position.set(W / 2, -H / 2, bz)
    backdrop.scale.set(W * bf * 1.1, H * bf * 1.1, 1)
    // 星星分两组，各自一层深度
    stars.forEach((pts, gi) => {
      const list = model.stars.filter((_, i) => i % 2 === gi)
      const arr = new Float32Array(list.length * 3)
      list.forEach((s, i) => {
        const z = -80 - (i % 4) * 60
        const [x, y] = parallax(s.x, s.y, z)
        arr[i * 3] = x
        arr[i * 3 + 1] = y
        arr[i * 3 + 2] = z
      })
      pts.geometry.setAttribute('position', new T.BufferAttribute(arr, 3))
      pts.geometry.computeBoundingSphere()
      ;(pts.material as ThreeNs.PointsMaterial).size = 2.2 * k
    })
    if (model.planet) {
      const [x, y] = parallax(model.planet.x, model.planet.y, -220)
      planet.visible = true
      planet.position.set(x, y, -220)
      planet.scale.setScalar(model.planet.r * (dist + 220) / dist)
    } else planet.visible = false
    if (model.moon) {
      const [x, y] = parallax(model.moon.x, model.moon.y, -260)
      moon.visible = true
      moon.position.set(x, y, -260)
      moon.scale.setScalar(model.moon.r * (dist + 260) / dist)
    } else moon.visible = false
    const groundH = H - g.padY
    ground.position.set(W / 2, -(g.padY + groundH / 2), -60)
    ground.scale.set(W * 3, Math.max(1, groundH), 240)
    g.colX.forEach((x, i) => {
      const pad = pads[i]!
      pad.position.set(x, -(g.padY + g.padH / 2), 0)
      pad.scale.set(g.padW, g.padH, g.padW * 0.6)
      const tower = towers[i]!
      tower.position.set(x + g.padW * 0.55, -(g.padY - g.size * 0.55), 0)
      tower.scale.set(g.padW * 0.16, g.size * 1.1, g.padW * 0.16)
      const guide = guides[i]!
      guide.geometry.setFromPoints([new T.Vector3(x, -(g.padY - g.size * 1.3), -2), new T.Vector3(x, -(g.starY + g.starR * 2), -2)])
      guide.computeLineDistances()
      const gm = guide.material as ThreeNs.LineDashedMaterial
      gm.dashSize = 3 * k
      gm.gapSize = 5 * k
      const goal = goals[i]!
      goal.position.set(x, -g.starY, 0)
      goal.scale.setScalar(g.starR)
      rockets[i]!.scale.setScalar(g.size)
    })
    shooting.visible = false
  }

  function syncRocket(r: Rocket, i: number): void {
    const g = model.geo
    const grp = rockets[i]!
    const x = g.colX[i]! + model.xOffset(r)
    grp.position.set(x, -model.yOf(r), 0)
    grp.rotation.z = -model.tiltOf(r)
    grp.rotation.y = model.animated ? model.time * 0.8 + i * 1.3 : 0.4
    const flame = model.flameOf(r)
    const flicker = model.animated ? 0.5 + 0.5 * Math.sin(model.time * 40 + r.phase) : 0
    const f = flames[i]!
    if (flame <= 0.02) f.visible = false
    else {
      f.visible = true
      f.scale.set(0.8 + flame * 0.4, flame * (1 + flicker * 0.25), 0.8 + flame * 0.4)
      const [outer, inner] = flameMats[i]!
      outer!.opacity = 0.75 + flicker * 0.2
      inner!.opacity = 0.85 + flicker * 0.15
    }
  }

  function sync(dpr: number): void {
    const g = model.geo
    const t = model.time
    const twinkle = model.animated && model.quality < 1
    starMats.forEach((m, i) => {
      m.opacity = twinkle ? 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(t * 1.6 + i * Math.PI)) : 0.75
    })
    if (planet.visible && model.animated) planet.rotation.y = t * 0.15
    pads.forEach((p) => {
      ;(p.material as ThreeNs.MeshStandardMaterial).emissiveIntensity = model.padGlow.value * 1.5
    })
    goals.forEach((goal, i) => {
      const team: Team = i === 0 ? 'red' : 'blue'
      const base = model.animated ? breathe(t, 2.2) * 0.4 : 0.3
      const pulse = Math.min(1, base + (model.sprint ? 0.5 : 0) + model.goalPulse.value * 0.6)
      const won = model.winner === team
      goal.scale.setScalar(g.starR * (1 + pulse * 0.2 + (won ? 0.5 : 0)))
      goal.rotation.z = won ? model.rays : 0
      const { glow } = goalMeshes[i]!
      ;(glow.material as ThreeNs.MeshBasicMaterial).opacity = 0.15 + pulse * 0.35 + (won ? 0.3 : 0)
      glow.scale.setScalar(1.8 + pulse * 0.6 + (won ? 1 : 0))
    })
    model.rockets.forEach((r, i) => syncRocket(r, i))
    // 粒子
    const items = model.particles.items
    const n = Math.min(items.length, PARTICLE_CAP)
    for (let i = 0; i < n; i++) {
      const p = items[i]!
      const life = 1 - p.age / p.life
      pPos[i * 3] = p.x
      pPos[i * 3 + 1] = -p.y
      pPos[i * 3 + 2] = 4
      pSize[i] = p.size * (p.shape === 'flake' ? 1.6 : 1 + life) * dpr
      pAlpha[i] = Math.max(0, Math.min(1, life * 1.2))
      const [cr, cg, cb] = rgb(p.color)
      pColor[i * 3] = cr
      pColor[i * 3 + 1] = cg
      pColor[i * 3 + 2] = cb
    }
    pGeo.setDrawRange(0, n)
    pGeo.attributes.position!.needsUpdate = true
    pGeo.attributes.aSize!.needsUpdate = true
    pGeo.attributes.aAlpha!.needsUpdate = true
    pGeo.attributes.aColor!.needsUpdate = true
    pMat.uniforms.uScale!.value = dist
    // 流星
    const s = model.shooting
    if (s) {
      const len = 40 * g.k
      const a = Math.atan2(-s.vy, s.vx)
      shooting.visible = true
      shooting.position.set(s.x - (Math.cos(a) * len) / 2, -s.y - (Math.sin(a) * len) / 2, -30)
      shooting.rotation.z = a
      shooting.scale.set(len, Math.max(1, 1.5 * g.k), Math.max(1, 1.5 * g.k))
      ;(shooting.material as ThreeNs.MeshBasicMaterial).opacity = Math.max(0, 1 - s.age / s.life)
    } else shooting.visible = false
  }

  function dispose(): void {
    scene.traverse((obj) => {
      const mesh = obj as ThreeNs.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as ThreeNs.Material | ThreeNs.Material[] | undefined
      if (Array.isArray(mat)) mat.forEach((m) => m.dispose())
      else mat?.dispose()
    })
    scene.clear()
  }

  return {
    scene,
    camera,
    parts: { rockets, flames, goals, pads, stars, particles, planet, moon, shooting, backdrop },
    layout,
    sync,
    dispose,
  }
}
