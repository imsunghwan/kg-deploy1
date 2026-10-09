import * as THREE from 'three'
import { fbm2, rng } from './noise'
import { cloudTexture, dotTexture, glowTexture, imageTexture, plaqueTexture, type Images } from './textures'
import { fitFov, makeCamera, v3, type Label, type Stage } from './stage'
import { byId, friends, type Lang } from '../content'
import { T, clamp, easeInOut, lerp, range } from '../timeline'

const GAP = 11
const START_Z = -8
const SIDE = 3.7
const END_Z = START_Z - GAP * friends.length - 6
export const FLOWERS = Array.from({ length: 11 }, (_, i) => `/deco/flower-${String(i + 1).padStart(2, '0')}.png`)

/** 섬 안쪽을 굽이굽이 지나는 오솔길의 x 좌표 */
const pathX = (z: number) => Math.sin(z * 0.07) * 3.2 + Math.sin(z * 0.023 + 1) * 2.4
const smooth01 = (t: number) => {
  t = clamp(t)
  return t * t * (3 - 2 * t)
}

/** 길에서 멀어질수록 완만하게 솟는 구릉 */
function groundH(x: number, z: number) {
  const d = Math.abs(x - pathX(z))
  const hills = (fbm2(x * 0.045 + 5, z * 0.045) * 0.5 + 0.5) * 3.2
  return hills * smooth01((d - 4) / 12) + smooth01((d - 22) / 40) * 10
}

const C = {
  grass: new THREE.Color('#7ccf4f'),
  grass2: new THREE.Color('#5cb941'),
  meadow: new THREE.Color('#9edb5c'),
  forest: new THREE.Color('#3f9a3e'),
  wood: '#9a6a3c',
}

export class VillageStage implements Stage {
  scene = new THREE.Scene()
  camera = makeCamera(52)
  pickables: THREE.Object3D[] = []
  labels: Label[] = []
  /** 지금 카메라가 바라보는 친구 (HTML 스펙 패널용) */
  focus = { id: '', alpha: 0 }
  /** 엔딩 전환(아이리스)이 모여들 지점: 길 끝 코코·러비 */
  readonly irisTarget = v3(pathX(END_Z), 1.2, END_Z)
  private boards: THREE.Group[] = []
  private pollen: THREE.Points
  private siblings: THREE.Mesh[] = []
  private clouds: THREE.Sprite[] = []
  private r = rng(31)

  constructor(images: Images, cards: Record<string, THREE.Texture>) {
    const horizon = new THREE.Color('#d9efff')
    this.scene.background = horizon
    this.scene.fog = new THREE.Fog(horizon, 45, 210)

    this.scene.add(new THREE.HemisphereLight('#eef8ff', '#6f9a4f', 1.55))
    const sun = new THREE.DirectionalLight('#fff0d2', 2.3)
    sun.position.set(-30, 50, 25)
    this.scene.add(sun)

    this.scene.add(this.makeSky(), this.makeGround(), this.makePath(), this.makeMountains())
    this.scene.add(this.makeTrees(), this.makeBushes(), this.makeHouses(), this.makeFences())
    this.makeFlowers(images)
    this.makeClouds()

    friends.forEach((ch, i) => this.makeBoard(ch.id, i, cards[ch.id]))
    this.makeEnd(images)

    // 반짝이는 꽃가루
    const n = 900
    const pos = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      const z = 8 - this.r() * (8 - END_Z + 10)
      pos.set([pathX(z) + (this.r() - 0.5) * 22, 0.3 + this.r() * 5, z], i * 3)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    this.pollen = new THREE.Points(
      geo,
      new THREE.PointsMaterial({ map: dotTexture(), color: '#fff6c8', size: 0.1, transparent: true, opacity: 0.9, depthWrite: false }),
    )
    this.scene.add(this.pollen)
  }

  private makeSky() {
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        vertexShader: /* glsl */ `varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
        fragmentShader: /* glsl */ `varying vec3 vP;
          void main(){
            float h = clamp(vP.y, 0.0, 1.0);
            vec3 c = mix(vec3(0.85,0.94,1.0), vec3(0.36,0.66,0.98), pow(h, 0.55));
            // 태양 쪽 따뜻한 빛
            float sun = max(dot(vP, normalize(vec3(-0.5,0.35,-0.8))), 0.0);
            c += vec3(1.0,0.82,0.55) * pow(sun, 12.0) * 0.55;
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    )
    return sky
  }

  private makeGround() {
    const geo = new THREE.PlaneGeometry(180, 290, 110, 180)
    geo.rotateX(-Math.PI / 2)
    geo.translate(0, 0, -90)
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, groundH(pos.getX(i), pos.getZ(i)))
    const flat = geo.toNonIndexed()
    const fp = flat.getAttribute('position') as THREE.BufferAttribute
    const col = new Float32Array(fp.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < fp.count; i += 3) {
      const x = fp.getX(i)
      const z = fp.getZ(i)
      const y = (fp.getY(i) + fp.getY(i + 1) + fp.getY(i + 2)) / 3
      const n = fbm2(x * 0.15, z * 0.15, 2) * 0.5 + 0.5
      c.copy(C.grass).lerp(C.grass2, n)
      if (Math.abs(x - pathX(z)) < 7) c.lerp(C.meadow, 0.45)
      if (y > 4) c.lerp(C.forest, clamp((y - 4) / 6))
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3)
    }
    flat.setAttribute('color', new THREE.BufferAttribute(col, 3))
    flat.computeVertexNormals()
    return new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }))
  }

  /** 흙길 리본 + 징검돌 */
  private makePath() {
    const g = new THREE.Group()
    const pts: number[] = []
    const idx: number[] = []
    let row = 0
    for (let z = 14; z > END_Z - 18; z -= 0.6, row++) {
      const w = 1.55 + Math.sin(z * 0.9) * 0.12 + fbm2(z * 0.3, 2, 2) * 0.25
      const x = pathX(z)
      pts.push(x - w, 0.04, z, x + w, 0.04, z)
      if (row > 0) {
        const a = (row - 1) * 2
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: '#e2bf86', roughness: 1 })))

    const stones = new THREE.InstancedMesh(
      new THREE.IcosahedronGeometry(1, 0),
      new THREE.MeshStandardMaterial({ color: '#c9c2b4', flatShading: true, roughness: 1 }),
      90,
    )
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    for (let i = 0; i < 90; i++) {
      const z = 12 - i * ((12 - END_Z + 10) / 90)
      const s = 0.22 + this.r() * 0.2
      q.setFromEuler(new THREE.Euler(0, this.r() * 3, 0))
      m.compose(v3(pathX(z) + (this.r() - 0.5) * 2, 0.05, z), q, v3(s * 1.4, s * 0.35, s))
      stones.setMatrixAt(i, m)
    }
    g.add(stones)
    return g
  }

  private makeMountains() {
    const g = new THREE.Group()
    const peaks = [
      { x: -40, z: END_Z - 120, r: 55, h: 62, snow: true },
      { x: 35, z: END_Z - 95, r: 40, h: 34, snow: false },
      { x: -95, z: END_Z - 60, r: 38, h: 30, snow: false },
    ]
    for (const p of peaks) {
      const geo = new THREE.ConeGeometry(p.r, p.h, 14, 6).toNonIndexed()
      const pos = geo.getAttribute('position') as THREE.BufferAttribute
      for (let i = 0; i < pos.count; i++) {
        const y = pos.getY(i)
        if (y < p.h / 2 - 0.1) {
          const k = 1 + fbm2(pos.getX(i) * 0.1, pos.getZ(i) * 0.1, 2) * 0.25
          pos.setX(i, pos.getX(i) * k)
          pos.setZ(i, pos.getZ(i) * k)
        }
      }
      const col = new Float32Array(pos.count * 3)
      const c = new THREE.Color()
      for (let i = 0; i < pos.count; i += 3) {
        const y = (pos.getY(i) + pos.getY(i + 1) + pos.getY(i + 2)) / 3 / p.h + 0.5
        c.set(p.snow && y > 0.72 ? '#ffffff' : y > 0.45 ? '#8fa08a' : '#4f9a48')
        for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3)
      }
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
      geo.computeVertexNormals()
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }))
      m.position.set(p.x, p.h / 2 - 2, p.z)
      g.add(m)
    }
    return g
  }

  private makeTrees() {
    const g = new THREE.Group()
    const spots: THREE.Vector3[] = []
    for (let tries = 0; tries < 11000 && spots.length < 900; tries++) {
      const z = 20 - this.r() * 240
      const x = pathX(z) + (this.r() - 0.5) * 150
      const d = Math.abs(x - pathX(z))
      if (d < 5.2) continue
      // 길 가까이는 듬성듬성, 멀어질수록 빽빽하게
      if (d < 12 && this.r() < 0.6) continue
      if (this.isReserved(x, z, 4.5)) continue
      spots.push(v3(x, groundH(x, z), z))
    }
    const crown = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 2.6, 6), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), spots.length)
    const blobs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), spots.length)
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.26, 1, 5),
      new THREE.MeshStandardMaterial({ color: '#8a5a35', roughness: 1 }),
      spots.length,
    )
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const c = new THREE.Color()
    const greens = ['#2f9e44', '#40b04a', '#1f7a37', '#5cc14c', '#78d14f', '#8bd85a']
    let nc = 0
    let nb = 0
    spots.forEach((p, i) => {
      const s = 1.1 + this.r() * 1.3
      m.compose(v3(p.x, p.y + 0.6 * s, p.z), q, v3(s, s * 1.2, s))
      trunk.setMatrixAt(i, m)
      c.set(greens[Math.floor(this.r() * greens.length)])
      if (this.r() < 0.5) {
        m.compose(v3(p.x, p.y + 2.5 * s, p.z), q, v3(s, s, s))
        crown.setMatrixAt(nc, m)
        crown.setColorAt(nc++, c)
      } else {
        m.compose(v3(p.x, p.y + 2.2 * s, p.z), q, v3(s * 1.35, s * 1.2, s * 1.35))
        blobs.setMatrixAt(nb, m)
        blobs.setColorAt(nb++, c)
      }
    })
    crown.count = nc
    blobs.count = nb
    g.add(crown, blobs, trunk)
    return g
  }

  private makeBushes() {
    const n = 260
    const bushes = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 1 }), n)
    const m = new THREE.Matrix4()
    const q = new THREE.Quaternion()
    const c = new THREE.Color()
    let k = 0
    for (let tries = 0; tries < 2000 && k < n; tries++) {
      const z = 14 - this.r() * (14 - END_Z + 16)
      const side = this.r() < 0.5 ? -1 : 1
      const x = pathX(z) + side * (2.4 + this.r() * 3.5)
      if (this.isReserved(x, z, 2.6)) continue
      const s = 0.35 + this.r() * 0.55
      m.compose(v3(x, groundH(x, z) + s * 0.4, z), q, v3(s * 1.3, s, s * 1.3))
      bushes.setMatrixAt(k, m)
      bushes.setColorAt(k++, c.set(this.r() < 0.5 ? '#4fb04a' : '#3d9a42'))
    }
    bushes.count = k
    return bushes
  }

  /** 길 옆 꽃밭: 코코비 사이트의 꽃 장식 이미지를 그대로 심음 */
  private makeFlowers(images: Images) {
    const mats = FLOWERS.map(
      (u) => new THREE.SpriteMaterial({ map: imageTexture(images[u]), transparent: true, alphaTest: 0.1, depthWrite: true }),
    )
    for (let i = 0; i < 420; i++) {
      const z = 13 - this.r() * (13 - END_Z + 14)
      const side = this.r() < 0.5 ? -1 : 1
      const x = pathX(z) + side * (1.8 + Math.pow(this.r(), 1.6) * 9)
      if (this.isReserved(x, z, 1.4)) continue
      const sp = new THREE.Sprite(mats[Math.floor(this.r() * mats.length)])
      const s = 0.35 + this.r() * 0.35
      sp.scale.setScalar(s)
      sp.position.set(x, groundH(x, z) + s * 0.5, z)
      this.scene.add(sp)
    }
  }

  private makeClouds() {
    const maps = [cloudTexture(7), cloudTexture(13), cloudTexture(41)]
    for (let i = 0; i < 16; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: maps[i % 3], transparent: true, depthWrite: false, fog: false, opacity: 0.95 }))
      s.position.set((this.r() - 0.5) * 300, 45 + this.r() * 40, END_Z - 60 - this.r() * 140)
      s.scale.setScalar(40 + this.r() * 40)
      s.userData.vx = 0.4 + this.r() * 0.8
      this.clouds.push(s)
      this.scene.add(s)
    }
  }

  private house(color: string, scale = 1) {
    const g = new THREE.Group()
    const base = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 3), new THREE.MeshStandardMaterial({ color: '#fff7ea', roughness: 0.85 }))
    base.position.y = 1.2
    const roof = new THREE.Mesh(new THREE.ConeGeometry(2.9, 2, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true }))
    roof.position.y = 3.4
    roof.rotation.y = Math.PI / 4
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 0.1), new THREE.MeshStandardMaterial({ color: '#a8703f' }))
    door.position.set(0, 0.65, 1.51)
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.6, 0.1), new THREE.MeshStandardMaterial({ color: '#8fd3ff', emissive: '#3a7fb0', emissiveIntensity: 0.3 }))
    win.position.set(1.05, 1.5, 1.51)
    g.add(base, roof, door, win)
    g.scale.setScalar(scale)
    return g
  }

  private houseSpots = [
    { z: -19, side: 1, color: '#ff8a3d' },
    { z: -46, side: -1, color: '#3f6fe8' },
    { z: -70, side: 1, color: '#ab61ff' },
    { z: -88, side: -1, color: '#06a11c' },
  ]

  private makeHouses() {
    const g = new THREE.Group()
    for (const h of this.houseSpots) {
      const x = pathX(h.z) + h.side * 12
      const m = this.house(h.color, 1.1)
      m.position.set(x, groundH(x, h.z), h.z)
      m.rotation.y = h.side * -0.9
      g.add(m)
    }
    return g
  }

  private makeFences() {
    const g = new THREE.Group()
    const mat = new THREE.MeshStandardMaterial({ color: '#f3e3c3', roughness: 0.9 })
    const post = new THREE.CylinderGeometry(0.07, 0.08, 0.9, 6)
    const runs = [
      { from: 6, to: -4, side: 1 },
      { from: -24, to: -37, side: -1 },
      { from: -54, to: -63, side: 1 },
      { from: -77, to: -85, side: -1 },
    ]
    for (const run of runs) {
      let prev: THREE.Vector3 | null = null
      for (let z = run.from; z >= run.to; z -= 1.6) {
        const x = pathX(z) + run.side * 2.2
        const p = v3(x, 0, z)
        const m = new THREE.Mesh(post, mat)
        m.position.set(x, 0.45, z)
        g.add(m)
        if (prev) {
          for (const y of [0.35, 0.7]) {
            const rail = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.07, prev.distanceTo(p)), mat)
            rail.position.set((x + prev.x) / 2, y, (z + prev.z) / 2)
            rail.lookAt(prev.x, y, prev.z)
            g.add(rail)
          }
        }
        prev = p
      }
    }
    return g
  }

  /** 친구 게시판: 나무 기둥 + 카드 + 색 지붕 + 이름 명판 */
  private makeBoard(id: string, i: number, card: THREE.Texture) {
    const ch = byId[id]
    const side = i % 2 === 0 ? -1 : 1
    const z = START_Z - i * GAP
    const g = new THREE.Group()
    g.position.set(pathX(z) + side * SIDE, 0, z)
    g.rotation.y = side * -0.5

    const wood = new THREE.MeshStandardMaterial({ color: C.wood, roughness: 0.9 })
    for (const x of [-1.35, 1.35]) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 4, 6), wood)
      p.position.set(x, 2, 0)
      g.add(p)
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(3, 3, 0.14), new THREE.MeshStandardMaterial({ color: '#c08a55', roughness: 0.9 }))
    back.position.set(0, 2.45, 0)
    const face = new THREE.Mesh(new THREE.PlaneGeometry(2.95, 2.95), new THREE.MeshBasicMaterial({ map: card, transparent: true }))
    face.position.set(0, 2.45, 0.08)
    face.userData.charId = id
    this.pickables.push(face)
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(0.62, 0.62, 3.5, 3),
      new THREE.MeshStandardMaterial({ color: ch.color, roughness: 0.6, flatShading: true }),
    )
    roof.rotation.z = Math.PI / 2
    roof.rotation.x = -Math.PI / 2 // 삼각 지붕 꼭짓점이 위로
    roof.position.set(0, 4.15, 0)
    const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 0.575), new THREE.MeshBasicMaterial({ map: plaqueTexture(ch, i, 'ko'), transparent: true }))
    plaque.position.set(0, 0.62, 0.13)
    plaque.userData.charId = id
    this.pickables.push(plaque)
    // 발밑 꽃 동그라미
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(1.6, 2.1, 40),
      new THREE.MeshBasicMaterial({ color: '#fff6c0', transparent: true, opacity: 0, depthWrite: false }),
    )
    ring.rotation.x = -Math.PI / 2
    ring.position.set(0, 0.06, 0.6)
    g.add(back, face, roof, plaque, ring)
    g.userData = { face, ring, plaque, baseRot: g.rotation.y }
    this.boards.push(g)
    this.scene.add(g)
  }

  /** 길 끝: 코코비네 집 앞의 코코 & 러비 */
  private makeEnd(images: Images) {
    const hx = pathX(END_Z - 7)
    const home = this.house('#ff5fa2', 1.6)
    home.position.set(hx, 0, END_Z - 7)
    this.scene.add(home)
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture('rgba(255,236,190,1)'), transparent: true, depthWrite: false, opacity: 0.55, blending: THREE.AdditiveBlending }),
    )
    glow.position.set(hx, 2, END_Z - 1)
    glow.scale.setScalar(9)
    this.scene.add(glow)
    ;['coco', 'lobi'].forEach((id, k) => {
      const img = images[byId[id].portrait]
      const h = id === 'coco' ? 2.4 : 2.0
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry((h * img.width) / img.height, h),
        new THREE.MeshBasicMaterial({ map: imageTexture(img), transparent: true, alphaTest: 0.02 }),
      )
      m.position.set(pathX(END_Z) + (k === 0 ? -0.95 : 0.95), h / 2, END_Z)
      m.userData.charId = id
      m.userData.h = h
      this.siblings.push(m)
      this.pickables.push(m)
      this.scene.add(m)
    })
  }

  private isReserved(x: number, z: number, pad: number) {
    for (let i = 0; i < friends.length; i++) {
      const bz = START_Z - i * GAP
      const bx = pathX(bz) + (i % 2 === 0 ? -1 : 1) * SIDE
      if (Math.hypot(x - bx, z - bz) < pad + 1.6) return true
    }
    for (const h of this.houseSpots) {
      if (Math.hypot(x - (pathX(h.z) + h.side * 12), z - h.z) < pad + 3) return true
    }
    return Math.hypot(x - pathX(END_Z), z - (END_Z - 4)) < pad + 7
  }

  /** 언어가 바뀌면 나무 명판 글씨를 다시 그림 */
  setLang(lang: Lang) {
    this.boards.forEach((b, i) => {
      const mat = (b.userData.plaque as THREE.Mesh).material as THREE.MeshBasicMaterial
      mat.map?.dispose()
      mat.map = plaqueTexture(byId[friends[i].id], i, lang)
      mat.needsUpdate = true
    })
  }

  resize(w: number, h: number) {
    fitFov(this.camera, w, h, 52)
  }

  update(s: number, time: number, dt: number, pointer: THREE.Vector2) {
    const t = range(s, T.village[0], T.village[1])
    const z = lerp(7, END_Z + 7.5, easeInOut(t))
    // 걸음에 맞춰 살짝 출렁이는 시점
    const bob = Math.sin(z * 1.7) * 0.05
    this.camera.position.set(pathX(z) + pointer.x * 0.3, 2.1 + bob + pointer.y * 0.15, z)

    let best = 0
    let bestD = Infinity
    friends.forEach((_, i) => {
      const d = Math.abs(z - (START_Z - i * GAP + 5.6))
      if (d < bestD) {
        bestD = d
        best = i
      }
    })
    const near = clamp(1 - bestD / (GAP * 0.55))
    const board = this.boards[best]
    const ahead = v3(pathX(z - 9), 1.9, z - 9)
    // 시선은 스크롤 위치만으로 계산(이전 프레임 값을 쌓아두지 않음).
    // 그래야 되감기·빠른 스크롤·반대쪽에서 다시 들어와도 카메라가 뒤를 보지 않음.
    // near 가 스크롤에 따라 연속으로 변하므로 별도 지연 없이도 부드럽게 돌아감.
    // 게시판 쪽으로는 고개를 살짝만(최대 50%) 돌려서 좌우로 크게 흔들리지 않게
    const look = ahead.lerp(v3(board.position.x, 2.3, board.position.z), smooth01(near) * 0.5)
    // 길 끝에서는 코코비네 집 앞 코코·러비 쪽으로 서서히
    look.lerp(v3(pathX(END_Z), 1.4, END_Z), smooth01(range(t, 0.86, 0.95)))
    this.camera.lookAt(look)

    this.focus.id = friends[best].id
    this.focus.alpha = near * (t > 0.92 ? 0 : 1) * clamp(range(s, T.village[0] + 0.25, T.village[0] + 0.5))

    this.boards.forEach((b, i) => {
      const on = i === best ? near : 0
      const { ring, baseRot } = b.userData as { ring: THREE.Mesh; baseRot: number }
      ;(ring.material as THREE.MeshBasicMaterial).opacity = on * 0.9
      b.rotation.y = baseRot + Math.sin(time * 2.2) * 0.03 * on
      b.position.y = on * Math.abs(Math.sin(time * 3)) * 0.08
    })
    this.siblings.forEach((m, k) => {
      m.position.y = m.userData.h / 2 + Math.abs(Math.sin(time * 2.4 + k * 1.3)) * 0.18
    })
    for (const c of this.clouds) {
      c.position.x += c.userData.vx * dt
      if (c.position.x > 160) c.position.x = -160
    }
    this.pollen.position.y = Math.sin(time * 0.4) * 0.25
    this.pollen.rotation.y = Math.sin(time * 0.05) * 0.01
  }
}
