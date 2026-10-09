import * as THREE from 'three'
import { glslNoise, rng } from './noise'
import { cloudTexture, crossTexture, dotTexture, glowTexture, imageTexture } from './textures'
import type { Images } from './textures'
import { cardMesh, fitFov, makeCamera, v3, type Label, type Stage } from './stage'
import { byId, characters, family } from '../content'
import { T, easeInOut, lerp, range, win } from '../timeline'

const R = 10
const SUN = v3(-0.75, 0.45, 0.55).normalize()
/** 구름을 뚫고 내려갈 지점 */
const DIVE = v3(0.32, 0.72, 0.62).normalize()

type Key = { s: number; pos: THREE.Vector3; look: THREE.Vector3 }

const story: Key[] = [
  // 시선을 살짝 위로 → 행성 지평선이 화면 아래쪽으로 내려가 시작 문구와 겹치지 않음
  { s: 0, pos: v3(0, 6, 14.5), look: v3(0, 14.6, 0) },
  { s: 0.9, pos: v3(0, 9.5, 14.5), look: v3(0, 13.4, 0) },
  { s: 1.6, pos: v3(0, 12.6, 14.5), look: v3(0, 12.2, 0) },
  { s: 2.6, pos: v3(0.8, 12.9, 13.4), look: v3(0.6, 12.3, 0) },
  { s: 3.7, pos: v3(0, 10, 37), look: v3(-4.2, 13.2, 0) },
  { s: 5.1, pos: v3(-5, 11, 34), look: v3(-4.6, 13.4, 0) },
  { s: 5.6, pos: v3(-2, 13, 30), look: DIVE.clone().multiplyScalar(R) },
  { s: 6.25, pos: DIVE.clone().multiplyScalar(R * 1.45), look: DIVE.clone().multiplyScalar(R) },
  { s: 6.7, pos: DIVE.clone().multiplyScalar(R * 1.04), look: DIVE.clone().multiplyScalar(R * 0.9) },
]
const ending: Key[] = [
  { s: T.end[0], pos: v3(0, 3, 27), look: v3(0, 11.5, 0) },
  { s: 16.4, pos: v3(0, 5, 37), look: v3(0, 13.2, 0) },
  // 시선을 살짝 위로 → 행성이 화면 아래로 내려가 위쪽 로고·링크와 겹치지 않음
  { s: T.end[1], pos: v3(0, 8, 47), look: v3(0, 14.2, 0) },
]

function sample(keys: Key[], s: number, pos: THREE.Vector3, look: THREE.Vector3) {
  if (s <= keys[0].s) {
    pos.copy(keys[0].pos)
    look.copy(keys[0].look)
    return
  }
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (s <= b.s) {
      const t = easeInOut(range(s, a.s, b.s))
      pos.lerpVectors(a.pos, b.pos, t)
      look.lerpVectors(a.look, b.look, t)
      return
    }
  }
  const last = keys[keys.length - 1]
  pos.copy(last.pos)
  look.copy(last.look)
}

// 가족 별자리 배치 (중심 기준 상대 좌표)
const C = v3(0, 11, 5)
const famPos: Record<string, THREE.Vector3> = {
  coco: v3(-1.5, 0.3, 1.6),
  lobi: v3(1.5, -0.3, 1.9),
  donna: v3(-6, 2.8, 0),
  bob: v3(5.8, 3.2, -1),
  lala: v3(0.3, 5.6, 0.8),
  george: v3(-8.6, -2.6, -2),
  martha: v3(-3.4, -3.6, 3.2),
  sean: v3(7.6, -3.2, 0),
}
const edges = [
  ['coco', 'lobi'], ['coco', 'donna'], ['lobi', 'bob'], ['donna', 'bob'], ['lala', 'donna'],
  ['lala', 'bob'], ['george', 'donna'], ['martha', 'george'], ['martha', 'coco'], ['sean', 'bob'], ['sean', 'lobi'],
]

export class SpaceStage implements Stage {
  scene = new THREE.Scene()
  camera = makeCamera(45)
  pickables: THREE.Object3D[] = []
  labels: Label[] = []

  private planet: THREE.Mesh
  private clouds: THREE.Mesh
  private planetUniforms = { uSun: { value: SUN }, uTime: { value: 0 } }
  private story = new THREE.Group()
  private ending = new THREE.Group()
  private ring = new THREE.Group()
  private sprites: Record<string, THREE.Mesh> = {}
  private famCards: Record<string, THREE.Mesh> = {}
  private lines: THREE.LineSegments
  private crosses: THREE.Sprite[] = []
  private net: THREE.LineSegments
  private netGroup = new THREE.Group()
  private diveClouds: THREE.Sprite[] = []
  private ringCards: THREE.Mesh[] = []
  private stars: THREE.Points
  private pos = v3()
  private look = v3()
  private landscape = true

  constructor(images: Images, cards: Record<string, THREE.Texture>) {
    this.scene.background = new THREE.Color('#02040a')
    this.scene.add(this.story, this.ending)

    this.stars = this.makeStars()
    this.scene.add(this.stars)

    // 태양 빛번짐
    const sun = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: glowTexture('rgba(255,244,225,1)'), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 }),
    )
    sun.position.copy(SUN).multiplyScalar(300)
    sun.scale.setScalar(110)
    this.scene.add(sun)

    // 행성
    this.planet = new THREE.Mesh(new THREE.SphereGeometry(R, 160, 120), this.planetMaterial())
    this.clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.018, 128, 96), this.cloudMaterial())
    const atmo = new THREE.Mesh(new THREE.SphereGeometry(R * 1.13, 96, 64), this.atmoMaterial())
    this.scene.add(this.planet, this.clouds, atmo)

    // 코코 & 러비 (컷아웃)
    for (const id of ['coco', 'lobi']) {
      const img = images[byId[id].portrait]
      const h = id === 'coco' ? 2.1 : 1.75
      const w = (h * img.width) / img.height
      const m = new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: imageTexture(img), transparent: true, depthWrite: false, alphaTest: 0.02 }),
      )
      m.userData.charId = id
      this.sprites[id] = m
      this.story.add(m)
      this.pickables.push(m)
    }

    // 가족 카드
    for (const ch of family) {
      const m = cardMesh(cards[ch.id], 3.3, ch.id)
      m.position.copy(C).add(famPos[ch.id])
      this.famCards[ch.id] = m
      this.story.add(m)
      this.pickables.push(m)
    }
    for (const id of Object.keys(famPos)) {
      this.labels.push({ key: `fam-${id}`, pos: v3(), alpha: 0 })
    }

    // 별자리 선
    this.lines = new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(edges.length * 6), 3)),
      new THREE.LineBasicMaterial({ color: '#cfe3ff', transparent: true, opacity: 0, depthWrite: false }),
    )
    this.story.add(this.lines)
    const crossMap = crossTexture()
    const r = rng(7)
    for (let i = 0; i < 18; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: crossMap, transparent: true, depthWrite: false, opacity: 0 }))
      s.scale.setScalar(0.32)
      s.userData.base = C.clone().add(v3((r() - 0.5) * 22, (r() - 0.5) * 13, (r() - 0.5) * 4))
      this.crosses.push(s)
      this.story.add(s)
    }

    // 궤도 네트워크 (HELLO 장면)
    this.net = this.makeNet()
    this.netGroup.add(this.net)
    this.story.add(this.netGroup)

    // 구름 강하
    const cloudMaps = [cloudTexture(3), cloudTexture(11), cloudTexture(29)]
    const tangentA = v3().crossVectors(DIVE, v3(0, 1, 0)).normalize()
    const tangentB = v3().crossVectors(DIVE, tangentA).normalize()
    for (let i = 0; i < 46; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: cloudMaps[i % 3], transparent: true, depthWrite: false, opacity: 0, color: '#ffffff' }),
      )
      const alt = R * (1.05 + r() * 0.32)
      const spread = 0.6 + (alt / R - 1) * 6
      s.position
        .copy(DIVE)
        .multiplyScalar(alt)
        .addScaledVector(tangentA, (r() - 0.5) * spread * 2)
        .addScaledVector(tangentB, (r() - 0.5) * spread * 2)
      s.scale.setScalar(0.8 + r() * 1.8)
      s.userData.o = 0.55 + r() * 0.45
      this.diveClouds.push(s)
      this.story.add(s)
    }

    // 엔딩: 행성을 도는 캐릭터 고리
    characters.forEach((ch, i) => {
      const m = cardMesh(cards[ch.id], 2.2, ch.id)
      const a = (i / characters.length) * Math.PI * 2
      m.position.set(Math.cos(a) * 16, 0, Math.sin(a) * 16)
      this.ring.add(m)
      this.ringCards.push(m)
      this.pickables.push(m)
    })
    this.ring.rotation.set(0.42, 0, -0.1)
    this.ending.add(this.ring)
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(14.6, 17.4, 128),
      new THREE.MeshBasicMaterial({ color: '#9cc8ff', transparent: true, opacity: 0.06, side: THREE.DoubleSide, depthWrite: false }),
    )
    halo.rotation.x = -Math.PI / 2
    this.ring.add(halo)
  }

  private makeStars() {
    const n = 4000
    const pos = new Float32Array(n * 3)
    const size = new Float32Array(n)
    const phase = new Float32Array(n)
    const r = rng(42)
    for (let i = 0; i < n; i++) {
      const u = r() * 2 - 1
      const a = r() * Math.PI * 2
      const d = 400 + r() * 400
      const s = Math.sqrt(1 - u * u)
      pos.set([Math.cos(a) * s * d, u * d, Math.sin(a) * s * d], i * 3)
      size[i] = Math.pow(r(), 6) * 5 + 1
      phase[i] = r() * 10
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1))
    geo.setAttribute('phase', new THREE.BufferAttribute(phase, 1))
    return new THREE.Points(
      geo,
      new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPx: { value: Math.min(devicePixelRatio, 2) }, uMap: { value: dotTexture() } },
        vertexShader: /* glsl */ `
          attribute float size; attribute float phase; uniform float uTime; uniform float uPx; varying float vA;
          void main(){
            vA = 0.55 + 0.45*sin(uTime*1.3 + phase*6.0);
            gl_PointSize = size * uPx * 1.6;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
          }`,
        fragmentShader: /* glsl */ `
          uniform sampler2D uMap; varying float vA;
          void main(){ float a = texture2D(uMap, gl_PointCoord).a; gl_FragColor = vec4(vec3(0.85,0.9,1.0), a*vA); }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    )
  }

  private makeNet() {
    const r = rng(19)
    const pts: THREE.Vector3[] = []
    for (let i = 0; i < 16; i++) pts.push(v3((r() - 0.5) * 14, 12 + (r() - 0.3) * 6, 4 + r() * 6))
    const seg: number[] = []
    pts.forEach((p, i) => {
      const near = pts
        .map((q, j) => ({ j, d: p.distanceTo(q) }))
        .filter((x) => x.j !== i)
        .sort((a, b) => a.d - b.d)
        .slice(0, 2)
      for (const n of near) seg.push(p.x, p.y, p.z, pts[n.j].x, pts[n.j].y, pts[n.j].z)
    })
    const crossMap = crossTexture()
    for (const p of pts) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: crossMap, transparent: true, depthWrite: false }))
      s.position.copy(p)
      s.scale.setScalar(0.22)
      this.netGroup.add(s)
    }
    return new THREE.LineSegments(
      new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(seg, 3)),
      new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false }),
    )
  }

  private planetMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: this.planetUniforms,
      vertexShader: /* glsl */ `
        varying vec3 vPos; varying vec3 vN; varying vec3 vView;
        void main(){
          vPos = position;
          vec4 wp = modelMatrix * vec4(position,1.0);
          vN = normalize(mat3(modelMatrix) * normal);
          vView = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; uniform float uTime;
        varying vec3 vPos; varying vec3 vN; varying vec3 vView;
        ${glslNoise}
        void main(){
          vec3 p = normalize(vPos);
          float n = fbm(p*1.9 + vec3(3.1,1.7,0.4))*0.7 + fbm(p*5.5)*0.22 + snoise(p*22.0)*0.05;
          float h = n - 0.06;
          vec3 deep = vec3(0.03,0.13,0.38), shallow = vec3(0.07,0.48,0.82);
          vec3 col = mix(deep, shallow, smoothstep(-0.32, 0.0, h));
          if (h > 0.0) {
            col = vec3(0.99,0.87,0.56);
            col = mix(col, vec3(0.45,0.80,0.30), smoothstep(0.02,0.035,h));
            col = mix(col, vec3(0.20,0.58,0.24), smoothstep(0.13,0.15,h));
            col = mix(col, vec3(0.56,0.45,0.36), smoothstep(0.25,0.27,h));
            col = mix(col, vec3(0.97,0.97,1.0), smoothstep(0.33,0.35,h));
          } else {
            // 해안 파도 띠
            col = mix(col, vec3(0.75,0.95,1.0), smoothstep(-0.02,0.0,h)*0.6);
          }
          col = mix(col, vec3(0.94,0.97,1.0), smoothstep(0.93,0.96,abs(p.y) + n*0.04));

          vec3 N = normalize(vN);
          float ndl = dot(N, uSun);
          float day = smoothstep(-0.12, 0.3, ndl);
          vec3 lit = col * (0.42 + 0.75*max(ndl,0.0));
          // 바다 반사광
          vec3 Hh = normalize(uSun + normalize(vView));
          float spec = pow(max(dot(N,Hh),0.0), 60.0) * step(h,0.0);
          lit += vec3(1.0,0.95,0.85)*spec*0.6;
          // 밤: 마을 불빛
          float town = smoothstep(0.55,0.75, snoise(p*40.0)) * step(0.03,h) * step(h,0.25);
          vec3 night = col*0.035 + vec3(0.0,0.01,0.03) + vec3(1.0,0.75,0.4)*town*0.9;
          vec3 c = mix(night, lit, day);
          float fres = pow(1.0 - max(dot(N, normalize(vView)),0.0), 2.5);
          c += vec3(0.35,0.62,1.0) * fres * (0.15 + 0.85*smoothstep(-0.35,0.5,ndl));
          gl_FragColor = vec4(c,1.0);
        }`,
    })
  }

  private cloudMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: this.planetUniforms,
      transparent: true,
      depthWrite: false,
      vertexShader: /* glsl */ `
        varying vec3 vPos; varying vec3 vN;
        void main(){ vPos = position; vN = normalize(mat3(modelMatrix)*normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; uniform float uTime; varying vec3 vPos; varying vec3 vN;
        ${glslNoise}
        void main(){
          vec3 p = normalize(vPos);
          float n = fbm(p*3.2 + vec3(uTime*0.012, 0.0, uTime*0.008));
          float a = smoothstep(0.08, 0.45, n) * 0.92;
          float ndl = dot(normalize(vN), uSun);
          float day = smoothstep(-0.15, 0.35, ndl);
          vec3 c = mix(vec3(0.02,0.03,0.06), vec3(1.0), day*(0.55+0.45*max(ndl,0.0)));
          gl_FragColor = vec4(c, a*(0.25+0.75*day));
        }`,
    })
  }

  private atmoMaterial() {
    return new THREE.ShaderMaterial({
      uniforms: { uSun: { value: SUN } },
      side: THREE.BackSide,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexShader: /* glsl */ `
        varying vec3 vN; varying vec3 vW;
        void main(){ vN = normalize(normalMatrix*normal); vW = normalize(mat3(modelMatrix)*normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
      fragmentShader: /* glsl */ `
        uniform vec3 uSun; varying vec3 vN; varying vec3 vW;
        void main(){
          float i = pow(max(0.72 - dot(vN, vec3(0.0,0.0,1.0)), 0.0), 3.2);
          float day = smoothstep(-0.5, 0.6, dot(-vW, uSun)) * 0.85 + 0.15;
          gl_FragColor = vec4(vec3(0.3,0.6,1.0) * i * 2.4 * day, 1.0);
        }`,
    })
  }

  resize(w: number, h: number) {
    this.landscape = w >= h
    fitFov(this.camera, w, h, 45)
  }

  update(s: number, time: number, _dt: number, pointer: THREE.Vector2) {
    const isEnd = s >= T.end[0] - 0.4
    this.story.visible = !isEnd
    this.ending.visible = isEnd
    this.planetUniforms.uTime.value = time
    ;(this.stars.material as THREE.ShaderMaterial).uniforms.uTime.value = time
    this.planet.rotation.y = time * 0.006 + s * 0.04
    this.clouds.rotation.y = this.planet.rotation.y * 1.4

    sample(isEnd ? ending : story, s, this.pos, this.look)
    // 세로 화면은 화각이 넓어 지평선이 올라오므로 시선을 조금 더 위로
    if (!this.landscape && !isEnd) {
      this.look.y += 3.2 * (1 - range(s, 0, 1.5))
      this.look.x *= 0.1 // 별자리를 가운데로
    }
    const par = isEnd ? 1.2 : 0.35
    this.camera.position.copy(this.pos).add(v3(pointer.x * par, pointer.y * par * 0.6, 0))
    this.camera.lookAt(this.look)
    // 히어로에서는 살짝 기울여 지평선이 휘어 보이도록
    this.camera.rotateZ(lerp(-0.12, 0, range(s, 0, 1.4)))

    for (const l of this.labels) l.alpha = 0
    if (isEnd) this.updateEnding(s, time)
    else this.updateStory(s, time)
  }

  private updateStory(s: number, time: number) {
    const q = this.camera.quaternion
    // 코코 & 러비: HELLO 에서는 카메라 앞, 별자리에서는 중심으로
    const helloX = this.landscape ? 1.0 : 0
    const spread = this.landscape ? 1 : 0.68
    const helloPos = {
      coco: v3(helloX - 1.0 * spread, 12.55, 9.0),
      lobi: v3(helloX + 1.1 * spread, 12.2, 9.5),
    }
    const toFam = easeInOut(range(s, 2.7, 3.7))
    const show = win(s, 0.9, 1.5, 5.6, 6.0)
    for (const id of ['coco', 'lobi'] as const) {
      const m = this.sprites[id]
      const bob = Math.sin(time * 1.1 + (id === 'coco' ? 0 : 1.7)) * 0.08
      m.position.lerpVectors(helloPos[id], C.clone().add(famPos[id]), toFam)
      m.position.y += bob
      m.scale.setScalar(lerp(this.landscape ? 1 : 0.72, 1.5, toFam))
      m.quaternion.copy(q)
      m.rotateZ(Math.sin(time * 0.8 + (id === 'coco' ? 0 : 2)) * 0.05)
      ;(m.material as THREE.MeshBasicMaterial).opacity = show
      m.visible = show > 0.001
    }

    // 궤도 네트워크
    const netA = win(s, 1.2, 1.7, 2.6, 3.1)
    this.netGroup.visible = netA > 0.001
    ;(this.net.material as THREE.LineBasicMaterial).opacity = 0.32 * netA
    this.netGroup.children.forEach((c) => {
      if (c instanceof THREE.Sprite) c.material.opacity = netA
    })

    // 가족 카드 & 별자리
    const famA = win(s, 3.2, 3.8, 5.3, 5.8)
    family.forEach((ch, i) => {
      const m = this.famCards[ch.id]
      const t = range(s, 3.2 + i * 0.06, 3.9 + i * 0.06)
      const base = C.clone().add(famPos[ch.id])
      m.position.copy(base).add(v3(0, Math.sin(time * 0.9 + i) * 0.12, (1 - easeInOut(t)) * -6))
      m.quaternion.copy(q)
      ;(m.material as THREE.MeshBasicMaterial).opacity = Math.min(famA, easeInOut(t))
      m.visible = famA > 0.001
    })
    const arr = this.lines.geometry.getAttribute('position') as THREE.BufferAttribute
    const node = (id: string) => (id === 'coco' || id === 'lobi' ? this.sprites[id] : this.famCards[id]).position
    edges.forEach(([a, b], i) => {
      const pa = node(a)
      const pb = node(b)
      arr.setXYZ(i * 2, pa.x, pa.y, pa.z)
      arr.setXYZ(i * 2 + 1, pb.x, pb.y, pb.z)
    })
    arr.needsUpdate = true
    ;(this.lines.material as THREE.LineBasicMaterial).opacity = 0.4 * famA
    this.lines.visible = famA > 0.001
    this.crosses.forEach((c, i) => {
      c.position.copy(c.userData.base).add(v3(0, Math.sin(time * 0.5 + i) * 0.1, 0))
      c.material.opacity = famA * (0.5 + 0.5 * Math.sin(time * 2 + i * 1.3))
    })

    // 라벨
    const labelA = win(s, 3.6, 3.95, 5.2, 5.5)
    for (const l of this.labels) {
      const id = l.key.slice(4)
      const p = node(id)
      const half = id === 'coco' ? 1.7 : id === 'lobi' ? 1.45 : 1.8
      l.pos.copy(p).add(v3(0, -half, 0))
      l.alpha = labelA
    }

    // 구름
    const cloudA = win(s, 5.55, 5.9, 6.6, 6.75)
    for (const c of this.diveClouds) {
      c.material.opacity = cloudA * c.userData.o
      c.visible = cloudA > 0.001
    }
  }

  private updateEnding(s: number, time: number) {
    this.ring.rotation.y = time * 0.05 + s * 0.35
    const a = win(s, T.end[0], T.end[0] + 0.6, 99, 100)
    // 고리가 기울어져 있으므로 부모 회전을 상쇄해서 카메라를 바라보게
    this.ring.updateMatrixWorld()
    const inv = this.ring.getWorldQuaternion(new THREE.Quaternion()).invert()
    const q = inv.multiply(this.camera.quaternion)
    for (const m of this.ringCards) {
      m.quaternion.copy(q)
      ;(m.material as THREE.MeshBasicMaterial).opacity = a
    }
  }
}
