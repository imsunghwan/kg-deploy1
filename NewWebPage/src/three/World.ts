import * as THREE from 'three'
import { characters, type Lang } from '../content'
import { T } from '../timeline'
import { VillageStage } from './VillageStage'
import { IslandStage } from './IslandStage'
import { SpaceStage } from './SpaceStage'
import type { Stage } from './stage'
import { cardTexture, type Images } from './textures'

/** 스크롤 위치(s)에 따라 알맞은 장면을 그리는 Three.js 렌더러 */
export class World {
  renderer: THREE.WebGLRenderer
  space: SpaceStage
  island: IslandStage
  village: VillageStage
  active: Stage
  private stages: Stage[]
  private pointer = new THREE.Vector2()
  private pointerTarget = new THREE.Vector2()
  private labelEls = new Map<string, HTMLElement>()
  private ray = new THREE.Raycaster()
  private v = new THREE.Vector3()
  private w = 1
  private h = 1

  constructor(canvas: HTMLCanvasElement, images: Images) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, innerWidth < 768 ? 1.5 : 2))
    this.renderer.outputColorSpace = THREE.SRGBColorSpace

    const cards: Record<string, THREE.Texture> = {}
    for (const ch of characters) cards[ch.id] = cardTexture(images[ch.portrait], ch)

    this.space = new SpaceStage(images, cards)
    this.island = new IslandStage()
    this.village = new VillageStage(images, cards)
    this.stages = [this.space, this.island, this.village]
    this.active = this.space
  }

  /** 첫 프레임 전에 모든 장면의 셰이더를 미리 컴파일 (스크롤 중 끊김 방지) */
  warmup() {
    for (const st of this.stages) this.renderer.compile(st.scene, st.camera)
  }

  bindLabel(key: string, el: HTMLElement | null) {
    if (el) this.labelEls.set(key, el)
    else this.labelEls.delete(key)
  }

  setLang(lang: Lang) {
    this.village.setLang(lang)
  }

  setPointer(x: number, y: number) {
    this.pointerTarget.set((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1)
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.renderer.setSize(w, h, false)
    for (const st of this.stages) st.resize(w, h)
  }

  stageFor(s: number): Stage {
    if (s < T.dive[1]) return this.space
    if (s < T.island[1]) return this.island
    if (s < T.village[1]) return this.village
    return this.space
  }

  update(s: number, time: number, dt: number) {
    this.pointer.lerp(this.pointerTarget, 0.05)
    this.active = this.stageFor(s)
    this.active.update(s, time, dt, this.pointer)
    this.renderer.render(this.active.scene, this.active.camera)
    this.placeLabels()
  }

  /** 아이리스 전환의 화면 중심(px): 섬 안쪽에서는 코코·러비, 그 외에는 화면 가운데 */
  irisCenter() {
    if (this.active !== this.village) return { x: this.w / 2, y: this.h / 2 }
    this.v.copy(this.village.irisTarget).project(this.village.camera)
    const x = (this.v.x * 0.5 + 0.5) * this.w
    const y = (-this.v.y * 0.5 + 0.5) * this.h
    return { x: Math.min(this.w, Math.max(0, x)), y: Math.min(this.h, Math.max(0, y)) }
  }

  private placeLabels() {
    const seen = new Set<string>()
    for (const l of this.active.labels) {
      const el = this.labelEls.get(l.key)
      if (!el) continue
      seen.add(l.key)
      this.v.copy(l.pos).project(this.active.camera)
      const behind = this.v.z > 1
      const a = behind ? 0 : l.alpha
      el.style.opacity = a.toFixed(3)
      el.style.visibility = a > 0.01 ? 'visible' : 'hidden'
      if (a > 0.01) {
        const x = (this.v.x * 0.5 + 0.5) * this.w
        const y = (-this.v.y * 0.5 + 0.5) * this.h
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`
      }
    }
    for (const [key, el] of this.labelEls) {
      if (!seen.has(key)) {
        el.style.opacity = '0'
        el.style.visibility = 'hidden'
      }
    }
  }

  /** 화면 좌표의 캐릭터 id (없으면 null) */
  pick(x: number, y: number): string | null {
    const ndc = new THREE.Vector2((x / this.w) * 2 - 1, -(y / this.h) * 2 + 1)
    this.ray.setFromCamera(ndc, this.active.camera)
    const hits = this.ray.intersectObjects(
      this.active.pickables.filter((o) => o.visible && isShown(o)),
      false,
    )
    return (hits[0]?.object.userData.charId as string) ?? null
  }

  dispose() {
    this.renderer.dispose()
  }
}

function isShown(o: THREE.Object3D) {
  let p: THREE.Object3D | null = o
  while (p) {
    if (!p.visible) return false
    p = p.parent
  }
  const m = (o as THREE.Mesh).material as THREE.Material | undefined
  return !m || m.opacity > 0.2
}
