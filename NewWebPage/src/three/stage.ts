import * as THREE from 'three'

export interface Label {
  key: string
  /** 화면에 투영할 월드 위치 */
  pos: THREE.Vector3
  alpha: number
}

/** 각 장면(우주, 섬, 홀, 골드)이 따르는 공통 형태 */
export interface Stage {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  /** s: 전체 스크롤(화면 수), time: 경과 초, pointer: -1..1 */
  update(s: number, time: number, dt: number, pointer: THREE.Vector2): void
  resize(w: number, h: number): void
  /** 클릭 가능한 메시 (userData.charId 보유) */
  pickables: THREE.Object3D[]
  labels: Label[]
}

export function makeCamera(fov = 45) {
  return new THREE.PerspectiveCamera(fov, 1, 0.1, 2000)
}

/** 세로 화면에서는 화각을 넓혀 피사체가 잘리지 않게 */
export function fitFov(camera: THREE.PerspectiveCamera, w: number, h: number, base: number) {
  const aspect = w / h
  camera.aspect = aspect
  camera.fov = aspect < 1 ? Math.min(base / Math.pow(aspect, 0.55), 85) : base
  camera.updateProjectionMatrix()
}

export const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z)

/** 카드형 평면 (카메라를 바라보도록 billboard 처리는 각 장면에서) */
export function cardMesh(map: THREE.Texture, size: number, charId?: string) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
  )
  if (charId) m.userData.charId = charId
  return m
}
