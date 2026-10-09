import * as THREE from 'three'
import { fbm2, rng } from './noise'
import { cloudTexture } from './textures'
import { fitFov, makeCamera, v3, type Label, type Stage } from './stage'
import { byId, places } from '../content'
import { T, easeInOut, lerp, range, win } from '../timeline'

const SIZE = 130
const SEG = 150
const RADIUS = 42

/** 섬 높이 함수: 가장자리는 바다 아래, 북서쪽에 산 */
function height(x: number, z: number) {
  const warp = fbm2(x * 0.03 + 11, z * 0.03 - 4, 3) * 0.28
  const d = Math.hypot(x, z * 1.15) / RADIUS + warp
  const mask = 1 - smooth01((d - 0.55) / 0.5)
  const hills = (fbm2(x * 0.045, z * 0.045) * 0.5 + 0.5) * 6
  const peak = 13 * Math.exp(-((x + 12) ** 2 + (z + 18) ** 2) / 160)
  // 섬에서 멀어질수록 깊어져서 바깥 바다(-6)와 자연스럽게 이어짐
  let h = mask * (1.2 + hills + peak) - 1.4 - (1 - mask) * 4.6 * smooth01((d - 0.9) / 0.5)
  // 장소 주변은 평평하게
  for (const p of places) {
    const dd = Math.hypot(x - p.pos[0], z - p.pos[1])
    if (dd < 6) h = lerp(Math.max(h, 0.9), h, smooth01(dd / 6))
  }
  return h
}
function smooth01(t: number) {
  t = Math.min(1, Math.max(0, t))
  return t * t * (3 - 2 * t)
}

const colors = {
  sand: new THREE.Color('#f7dc8f'),
  grass: new THREE.Color('#71c84a'),
  grass2: new THREE.Color('#4fae3b'),
  forest: new THREE.Color('#2f8a3a'),
  rock: new THREE.Color('#9c8a74'),
  snow: new THREE.Color('#ffffff'),
  under: new THREE.Color('#d9c27c'),
}

export class IslandStage implements Stage {
  scene = new THREE.Scene()
  camera = makeCamera(42)
  pickables: THREE.Object3D[] = []
  labels: Label[] = []
  private water: THREE.Mesh
  private waterU = { uTime: { value: 0 }, uHeight: { value: null as THREE.Texture | null } }
  private clouds: THREE.Sprite[] = []

  constructor() {
    const sky = new THREE.Color('#9fd6ff')
    this.scene.background = sky
    this.scene.fog = new THREE.Fog(sky, 120, 320)

    this.scene.add(new THREE.HemisphereLight('#e6f6ff', '#5d7d4a', 1.6))
    const sun = new THREE.DirectionalLight('#fff1d6', 2.4)
    sun.position.set(50, 70, 30)
    this.scene.add(sun)

    this.scene.add(this.makeTerrain())
    this.water = this.makeWater()
    this.scene.add(this.water)
    this.scene.add(this.makeTrees())
    this.scene.add(this.makeHouses())

    // 장소 라벨
    for (const p of places) {
      const y = Math.max(height(p.pos[0], p.pos[1]), 0.5)
      this.labels.push({ key: `place-${p.id}`, pos: v3(p.pos[0], y + 4.2, p.pos[1]), alpha: 0 })
    }

    // 떠다니는 구름
    const maps = [cloudTexture(5), cloudTexture(17), cloudTexture(23)]
    const r = rng(3)
    for (let i = 0; i < 26; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: maps[i % 3], transparent: true, depthWrite: false, fog: false }))
      const near = i < 12
      s.position.set((r() - 0.5) * (near ? 70 : 220), near ? 60 + r() * 30 : 22 + r() * 18, (r() - 0.5) * (near ? 70 : 220))
      s.scale.setScalar(near ? 26 + r() * 20 : 18 + r() * 16)
      s.userData.near = near
      s.userData.vx = (r() - 0.5) * 0.6
      this.clouds.push(s)
      this.scene.add(s)
    }
  }

  private makeTerrain() {
    const geo = new THREE.PlaneGeometry(SIZE, SIZE, SEG, SEG)
    geo.rotateX(-Math.PI / 2)
    const pos = geo.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) pos.setY(i, height(pos.getX(i), pos.getZ(i)))
    const flat = geo.toNonIndexed()
    const fp = flat.getAttribute('position') as THREE.BufferAttribute
    const col = new Float32Array(fp.count * 3)
    const c = new THREE.Color()
    for (let i = 0; i < fp.count; i += 3) {
      const y = (fp.getY(i) + fp.getY(i + 1) + fp.getY(i + 2)) / 3
      const x = fp.getX(i)
      const z = fp.getZ(i)
      const n = fbm2(x * 0.2, z * 0.2, 2) * 0.5 + 0.5
      if (y < 0) c.copy(colors.under)
      else if (y < 0.75) c.copy(colors.sand)
      else if (y < 3.6) c.copy(colors.grass).lerp(colors.grass2, n)
      else if (y < 6.5) c.copy(colors.forest).lerp(colors.grass2, n * 0.4)
      else if (y < 10) c.copy(colors.rock)
      else c.copy(colors.snow)
      for (let k = 0; k < 3; k++) col.set([c.r, c.g, c.b], (i + k) * 3)
    }
    flat.setAttribute('color', new THREE.BufferAttribute(col, 3))
    flat.computeVertexNormals()
    return new THREE.Mesh(flat, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.95 }))
  }

  private makeWater() {
    // 섬 높이를 텍스처로 구워서 얕은 물·파도 띠 계산에 사용
    const N = 256
    const data = new Uint8Array(N * N * 4)
    for (let j = 0; j < N; j++) {
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1) - 0.5) * SIZE
        const z = (j / (N - 1) - 0.5) * SIZE
        const h = height(x, z)
        const v = Math.max(0, Math.min(255, Math.round((h + 6) * 18)))
        data.set([v, v, v, 255], (j * N + i) * 4)
      }
    }
    const ht = new THREE.DataTexture(data, N, N)
    ht.magFilter = THREE.LinearFilter
    ht.minFilter = THREE.LinearFilter
    ht.needsUpdate = true
    this.waterU.uHeight.value = ht
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...this.waterU, fogColor: { value: new THREE.Color('#9fd6ff') } },
      transparent: true,
      vertexShader: /* glsl */ `
        varying vec3 vW; varying float vDist;
        void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz;
          vec4 mv = viewMatrix*w; vDist = -mv.z; gl_Position = projectionMatrix*mv; }`,
      fragmentShader: /* glsl */ `
        uniform float uTime; uniform sampler2D uHeight; uniform vec3 fogColor;
        varying vec3 vW; varying float vDist;
        void main(){
          vec2 uv = vW.xz / ${SIZE.toFixed(1)} + 0.5;
          float inside = step(0.0,uv.x)*step(uv.x,1.0)*step(0.0,uv.y)*step(uv.y,1.0);
          float h = mix(-6.0, texture2D(uHeight, uv).r*255.0/18.0 - 6.0, inside);
          float depth = clamp(-h/5.0, 0.0, 1.0);
          vec3 deep = vec3(0.10,0.42,0.80), shallow = vec3(0.30,0.86,0.92);
          vec3 c = mix(shallow, deep, smoothstep(0.0,1.0,depth));
          // 해안 파도 띠 (밀려왔다 빠지는 줄무늬)
          float band = sin(h*5.0 + uTime*1.6);
          float foam = smoothstep(0.75,0.95,band) * smoothstep(-2.4,-0.2,h);
          foam += smoothstep(-0.35,-0.05,h);
          c = mix(c, vec3(1.0), clamp(foam,0.0,1.0)*0.85);
          // 잔물결 반짝임
          float sp = sin(vW.x*0.9+uTime*0.7)*sin(vW.z*0.8-uTime*0.6);
          c += smoothstep(0.92,1.0,sp)*0.12;
          float f = smoothstep(120.0, 320.0, vDist);
          gl_FragColor = vec4(mix(c, fogColor, f), 1.0);
        }`,
    })
    const m = new THREE.Mesh(new THREE.PlaneGeometry(900, 900), mat)
    m.rotation.x = -Math.PI / 2
    m.position.y = 0
    return m
  }

  private makeTrees() {
    const g = new THREE.Group()
    const r = rng(12)
    const spots: THREE.Vector3[] = []
    for (let tries = 0; tries < 6000 && spots.length < 420; tries++) {
      const x = (r() - 0.5) * SIZE * 0.9
      const z = (r() - 0.5) * SIZE * 0.9
      const h = height(x, z)
      if (h < 1.1 || h > 8) continue
      if (places.some((p) => Math.hypot(x - p.pos[0], z - p.pos[1]) < 7)) continue
      spots.push(v3(x, h, z))
    }
    const crown = new THREE.InstancedMesh(
      new THREE.ConeGeometry(1, 2.6, 6),
      new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }),
      spots.length,
    )
    const round = new THREE.IcosahedronGeometry(1, 0)
    const blobs = new THREE.InstancedMesh(round, new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.9 }), spots.length)
    const trunk = new THREE.InstancedMesh(
      new THREE.CylinderGeometry(0.18, 0.24, 1, 5),
      new THREE.MeshStandardMaterial({ color: '#8a5a35', roughness: 1 }),
      spots.length,
    )
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    const greens = ['#2f9e44', '#40b04a', '#1f7a37', '#5cc14c', '#78d14f']
    let nc = 0
    let nb = 0
    spots.forEach((p, i) => {
      const s = 0.7 + r() * 0.8
      m.compose(v3(p.x, p.y + 0.5 * s, p.z), new THREE.Quaternion(), v3(s, s, s))
      trunk.setMatrixAt(i, m)
      c.set(greens[Math.floor(r() * greens.length)])
      if (r() < 0.55) {
        m.compose(v3(p.x, p.y + 2.2 * s, p.z), new THREE.Quaternion(), v3(s, s, s))
        crown.setMatrixAt(nc, m)
        crown.setColorAt(nc++, c)
      } else {
        m.compose(v3(p.x, p.y + 1.9 * s, p.z), new THREE.Quaternion(), v3(s * 1.3, s * 1.2, s * 1.3))
        blobs.setMatrixAt(nb, m)
        blobs.setColorAt(nb++, c)
      }
    })
    crown.count = nc
    blobs.count = nb
    g.add(crown, blobs, trunk)
    return g
  }

  private makeHouses() {
    const g = new THREE.Group()
    const r = rng(4)
    for (const p of places) {
      const color = byId[p.chars[0]].color
      const y = Math.max(height(p.pos[0], p.pos[1]), 0.5)
      const base = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.2, 2.8), new THREE.MeshStandardMaterial({ color: '#fff7ea', roughness: 0.8 }))
      base.position.set(p.pos[0], y + 1.1, p.pos[1])
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 4), new THREE.MeshStandardMaterial({ color, roughness: 0.7, flatShading: true }))
      roof.position.set(p.pos[0], y + 3.1, p.pos[1])
      roof.rotation.y = Math.PI / 4
      const ang = r() * Math.PI
      base.rotation.y = ang
      roof.rotation.y += ang
      // 땅 표시용 동그라미
      const pad = new THREE.Mesh(new THREE.CircleGeometry(4.2, 32), new THREE.MeshStandardMaterial({ color: '#f5e6b8', roughness: 1 }))
      pad.rotation.x = -Math.PI / 2
      pad.position.set(p.pos[0], y + 0.05, p.pos[1])
      g.add(pad, base, roof)
    }
    return g
  }

  resize(w: number, h: number) {
    fitFov(this.camera, w, h, 42)
  }

  update(s: number, time: number, dt: number, pointer: THREE.Vector2) {
    const t = range(s, T.island[0], T.island[1])
    this.waterU.uTime.value = time
    // 위에서 내려다보다가(구름 사이) 비스듬한 시점으로, 이후 천천히 회전
    const a = easeInOut(range(t, 0, 0.5))
    const orbit = lerp(0.15, -0.55, easeInOut(range(t, 0.25, 1)))
    const dist = lerp(8, 82, a)
    const height = lerp(105, 52, a)
    this.camera.position.set(Math.sin(orbit) * dist + pointer.x * 2, height + pointer.y * 1.5, Math.cos(orbit) * dist)
    this.camera.lookAt(0, 0, lerp(0, 2, a))

    for (const c of this.clouds) {
      c.position.x += c.userData.vx * dt
      if (c.userData.near) {
        // 강하 직후에는 구름이 화면을 덮었다가 흩어짐
        c.material.opacity = 1 - range(t, 0.05, 0.3)
        c.visible = c.material.opacity > 0.001
      }
    }

    const la = win(s, 7.4, 7.8, 9.05, 9.3)
    for (const l of this.labels) l.alpha = la
  }
}
