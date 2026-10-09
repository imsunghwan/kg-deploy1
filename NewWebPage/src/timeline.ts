// 스크롤 위치는 "화면 수"(scrollY / innerHeight) 단위로 다룹니다.
// 각 장(chapter)의 시작·끝을 여기 한 곳에서 관리합니다.
export const T = {
  hero: [0, 1],
  hello: [1, 3],
  family: [3, 5.5],
  dive: [5.5, 6.6],
  island: [6.6, 9.4],
  village: [9.4, 15.0],
  end: [15.0, 17.7],
} as const

/** 스크롤 가능한 전체 길이(화면 수) */
export const TOTAL = 17.7

export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => t * t * (3 - 2 * t)
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** s 가 a→b 로 갈 때 0→1 */
export const range = (s: number, a: number, b: number) => clamp((s - a) / (b - a))

/** a→b 에서 나타나고 c→d 에서 사라지는 0..1 값 */
export const win = (s: number, a: number, b: number, c: number, d: number) =>
  Math.min(smooth(range(s, a, b)), 1 - smooth(range(s, c, d)))

/** 장면 전환용 흰 가림막 불투명도 (구름 강하 → 공룡섬, 공룡섬 → 섬 안쪽) */
export function whiteVeil(s: number) {
  return Math.max(win(s, 6.2, 6.6, 6.62, 7.15), win(s, 9.1, 9.4, 9.42, 9.85))
}

/**
 * 친구들 → 엔딩: 만화 엔딩식 '아이리스' 전환.
 * 코코·러비를 중심으로 원이 좁아지며 닫히고(1→0), 잠깐 멈춘 뒤 우주 엔딩 위로 다시 열림(0→1).
 * 1 이면 완전히 열린 상태(가림 없음).
 */
export function iris(s: number) {
  if (s < 15.0) return 1 - smooth(range(s, 14.4, 14.95))
  return easeOut(range(s, 15.05, 15.6))
}
