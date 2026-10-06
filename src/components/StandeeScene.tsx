import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'

type Props = {
  /** 호버 중인 내비 항목의 회전각(rad). 없으면 null */
  hoverAngle: number | null
}

// 사용자가 제공한 공식 이미지를 앞면에 그대로 쓰는 "아크릴 스탠디".
// 같은 이미지를 알파로 오린 얇은 판을 여러 겹 쌓아 두께를 만들고, 가운데 겹은 어둡게 칠해 옆면처럼 보이게 합니다.
const SRC = '/cocobi/home-standee.png'
const HEIGHT = 2.15 // 화면에서 원본(385px)보다 크게 늘어나지 않는 정도
const DEPTH = 0.14
const LAYERS = 18
const BASE_ANGLE = -0.12

export function StandeeScene({ hoverAngle }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const hoverRef = useRef<number | null>(hoverAngle)
  hoverRef.current = hoverAngle

  useEffect(() => {
    const mount = mountRef.current!
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.NeutralToneMapping
    renderer.toneMappingExposure = 1
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const pmrem = new THREE.PMREMGenerator(renderer)
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
    scene.environmentIntensity = 0.35

    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100)
    camera.position.set(0, 0.1, 9)

    // 조명: 위쪽 키 라이트 + 뒤쪽 림 라이트 + 앰비언트
    const key = new THREE.SpotLight(0xffffff, 0, 30, 0.5, 0.7, 1.2)
    key.position.set(-3.5, 6.5, 6)
    scene.add(key, key.target)
    const rim = new THREE.DirectionalLight(0xd9e2ff, 0)
    rim.position.set(4, 2, -4)
    scene.add(rim)
    scene.add(new THREE.HemisphereLight(0xffffff, 0x101010, 0.9))

    const group = new THREE.Group()
    scene.add(group)
    const disposables: { dispose: () => void }[] = []

    new THREE.TextureLoader().load(SRC, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      tex.anisotropy = renderer.capabilities.getMaxAnisotropy()
      const aspect = tex.image.width / tex.image.height
      const geo = new THREE.PlaneGeometry(HEIGHT * aspect, HEIGHT)
      disposables.push(tex, geo)

      // 앞·뒤 면: 원본 그대로 / 가운데 겹: 같은 이미지를 어둡게 → 부위별 색을 따라가는 옆면
      const face = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.35, metalness: 0 })
      const edge = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.6, metalness: 0, color: 0x8a8a8a })
      disposables.push(face, edge)

      for (let i = 0; i < LAYERS; i++) {
        const isFace = i === 0 || i === LAYERS - 1
        const m = new THREE.Mesh(geo, isFace ? face : edge)
        m.position.z = DEPTH / 2 - (i / (LAYERS - 1)) * DEPTH
        group.add(m)
      }
    })

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
      camera.position.z = w / h < 0.8 ? 11 : 9
      camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(mount)
    resize()

    // 루프 (프레임레이트와 무관한 보간)
    const clock = new THREE.Clock()
    const rot = { x: 0, y: BASE_ANGLE - 1.2 }
    let lightBoost = 0
    let last = 0
    let raf = 0
    const easeOut = (t: number) => 1 - Math.pow(1 - Math.min(t, 1), 4)

    const tick = () => {
      const t = clock.getElapsedTime()
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

      group.position.y = (1 - intro) * -1.2 + Math.sin(t * 0.7) * 0.05
      group.scale.setScalar(0.88 + intro * 0.12)

      lightBoost += ((hover !== null ? 1 : 0) - lightBoost) * (1 - Math.exp(-dt * 3.7))
      key.intensity = intro * (55 + lightBoost * 35)
      rim.intensity = intro * (1.2 + lightBoost * 0.8)

      renderer.render(scene, camera)
      raf = requestAnimationFrame(tick)
    }
    tick()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      window.removeEventListener('pointermove', onMove)
      disposables.forEach((d) => d.dispose())
      pmrem.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0 [&>canvas]:block [&>canvas]:h-full [&>canvas]:w-full" />
}
