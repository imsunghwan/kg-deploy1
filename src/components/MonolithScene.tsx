import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { BRAND, IMAGES } from '../content'

type Props = {
  /** 호버 중인 내비 항목의 회전각(rad). 없으면 null */
  hoverAngle: number | null
}

const W = 1
const H = 3
const D = 0.62
const BASE_ANGLE = -0.42

// ---------- 텍스처 (캔버스로 그림) ----------

function paintConcrete(ctx: CanvasRenderingContext2D, w: number, h: number, source?: HTMLImageElement) {
  if (source) {
    // 생성된 콘크리트 텍스처를 타일링
    const pattern = ctx.createPattern(source, 'repeat')!
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = 'rgba(40,40,40,0.35)'
    ctx.fillRect(0, 0, w, h)
    return
  }
  // 폴백: 절차적 노이즈
  ctx.fillStyle = '#5a5a5a'
  ctx.fillRect(0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h)
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 38
    img.data[i] += n
    img.data[i + 1] += n
    img.data[i + 2] += n
  }
  ctx.putImageData(img, 0, 0)
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(${Math.random() > 0.5 ? '20,20,20' : '140,140,140'},${Math.random() * 0.35})`
    const r = Math.random() * 2.2
    ctx.beginPath()
    ctx.arc(Math.random() * w, Math.random() * h, r, 0, Math.PI * 2)
    ctx.fill()
  }
}

// 브랜드 마크를 세로로 음각. mode: 'color' | 'bump'
function paintMark(ctx: CanvasRenderingContext2D, w: number, h: number, mode: 'color' | 'bump') {
  const [first, ...rest] = BRAND.mark
  ctx.save()
  ctx.translate(w * 0.5, h * 0.5)
  ctx.rotate(-Math.PI / 2)
  ctx.font = `900 ${w * 0.5}px Inter, Arial, sans-serif`
  ctx.textBaseline = 'middle'
  const full = ctx.measureText(BRAND.mark).width
  const firstW = ctx.measureText(first).width
  const x0 = -full / 2
  if (mode === 'bump') {
    ctx.fillStyle = '#000'
    ctx.fillText(BRAND.mark, x0, 0)
  } else {
    // 첫 글자: 금색 그라디언트
    const g = ctx.createLinearGradient(x0, -w * 0.3, x0 + firstW, w * 0.3)
    g.addColorStop(0, '#6b5520')
    g.addColorStop(0.45, '#d9b862')
    g.addColorStop(1, '#8a6d2a')
    ctx.fillStyle = g
    ctx.fillText(first, x0, 0)
    // 나머지: 어두운 음각
    ctx.fillStyle = 'rgba(18,18,18,0.82)'
    ctx.fillText(rest.join(''), x0 + firstW, 0)
  }
  ctx.restore()
}

function makeCanvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return c
}

function buildTextures(source?: HTMLImageElement) {
  const side = makeCanvas(512, 1536)
  paintConcrete(side.getContext('2d')!, side.width, side.height, source)

  const front = makeCanvas(512, 1536)
  const fctx = front.getContext('2d')!
  paintConcrete(fctx, front.width, front.height, source)
  paintMark(fctx, front.width, front.height, 'color')

  const bump = makeCanvas(512, 1536)
  const bctx = bump.getContext('2d')!
  bctx.fillStyle = '#fff'
  bctx.fillRect(0, 0, bump.width, bump.height)
  bctx.filter = 'blur(2px)'
  paintMark(bctx, bump.width, bump.height, 'bump')

  const toTex = (c: HTMLCanvasElement, srgb = true) => {
    const t = new THREE.CanvasTexture(c)
    if (srgb) t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 8
    return t
  }
  return { side: toTex(side), front: toTex(front), bump: toTex(bump, false), sideBump: toTex(side, false) }
}

// ---------- 씬 ----------

export function MonolithScene({ hoverAngle }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<number | null>(hoverAngle)
  hoverRef.current = hoverAngle

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.05
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.18

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0.1, 9)

    // 조명: 위쪽 키 라이트 + 뒤쪽 림 라이트 + 약한 앰비언트
    const key = new THREE.SpotLight(0xffffff, 0, 30, 0.42, 0.7, 1.2)
    key.position.set(-3.5, 6.5, 5)
    scene.add(key, key.target)
    const rim = new THREE.DirectionalLight(0xd9e2ff, 0)
    rim.position.set(4, 2, -4)
    scene.add(rim)
    const fill = new THREE.HemisphereLight(0xffffff, 0x080808, 0.12)
    scene.add(fill)

    // 모놀리스
    let tex = buildTextures()
    const makeMaterials = () => {
      const sideMat = new THREE.MeshStandardMaterial({
        map: tex.side,
        bumpMap: tex.sideBump,
        bumpScale: 0.6,
        color: 0x8c8c8c,
        roughness: 0.92,
        metalness: 0.02,
      })
      const frontMat = new THREE.MeshStandardMaterial({
        map: tex.front,
        bumpMap: tex.bump,
        bumpScale: 6,
        color: 0x8c8c8c,
        roughness: 0.85,
        metalness: 0.05,
      })
      // BoxGeometry 그룹 순서: +x, -x, +y, -y, +z(front), -z
      return [sideMat, sideMat, sideMat, sideMat, frontMat, sideMat]
    }
    let materials = makeMaterials()
    const geometry = new RoundedBoxGeometry(W, H, D, 6, 0.035)
    const mesh = new THREE.Mesh(geometry, materials)
    const group = new THREE.Group()
    group.add(mesh)
    scene.add(group)

    // 생성된 콘크리트 텍스처가 있으면 교체
    const imgEl = new Image()
    imgEl.onload = () => {
      Object.values(tex).forEach((t) => t.dispose())
      new Set(materials).forEach((m) => m.dispose())
      tex = buildTextures(imgEl)
      materials = makeMaterials()
      mesh.material = materials
    }
    imgEl.src = IMAGES.texture

    // 입력
    const mouse = { x: 0, y: 0 }
    const onMove = (e: PointerEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1
      mouse.y = (e.clientY / window.innerHeight) * 2 - 1
    }
    window.addEventListener('pointermove', onMove)

    const resize = () => {
      const { clientWidth: w, clientHeight: h } = mount
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      // 세로 화면에서는 물체가 잘리지 않도록 뒤로 뺌
      camera.position.z = w / h < 0.8 ? 12 : 9
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()

    // 루프
    const clock = new THREE.Clock()
    const rot = { x: 0, y: BASE_ANGLE - 1.2 }
    let lightBoost = 0
    let raf = 0
    const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(t, 1), 4)

    let last = 0
    const tick = () => {
      const t = clock.getElapsedTime()
      // 프레임레이트와 무관한 보간 계수 (60fps에서 약 0.045)
      const dt = Math.min(t - last, 1)
      last = t
      const k = 1 - Math.exp(-dt * 2.8)
      const intro = easeOut(t / 2.2)
      const hover = hoverRef.current

      const targetY = BASE_ANGLE + (hover ?? 0) + mouse.x * 0.28
      const targetX = mouse.y * 0.1
      rot.y += (targetY - rot.y) * k
      rot.x += (targetX - rot.x) * k
      group.rotation.set(rot.x, rot.y, 0)

      group.position.y = (1 - intro) * -1.2 + Math.sin(t * 0.7) * 0.035
      group.scale.setScalar(0.88 + intro * 0.12)

      lightBoost += ((hover !== null ? 1 : 0) - lightBoost) * (1 - Math.exp(-dt * 3.7))
      key.intensity = intro * (60 + lightBoost * 40)
      rim.intensity = intro * (1.4 + lightBoost * 0.8)

      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      imgEl.onload = null
      geometry.dispose()
      Object.values(tex).forEach((t) => t.dispose())
      new Set(materials).forEach((m) => m.dispose())
      pmrem.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
}
