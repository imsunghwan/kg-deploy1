/**
 * 방문 분석 이벤트를 kg-deploy1 Worker(/api/track)로 보냄.
 * - 쿠키·저장소를 쓰지 않음. 세션 id 는 페이지를 열 때마다 새로 만드는 무작위 값.
 * - 개발 중(localhost)·테스트 빌드(/test)이거나 브라우저의 '추적 안 함' 설정이 켜져 있으면 보내지 않음.
 * - Vercel·Cloudflare 두 주소 모두 같은 곳으로 보내서 한 화면에서 함께 봄.
 */
import { FEATURES } from './channel'
import type { Lang } from './content'

const ENDPOINT = 'https://kg-deploy1.kg-landing.workers.dev/api/track'

type EventType = 'view' | 'chapter' | 'character' | 'constellation' | 'lang' | 'link' | 'time'

const enabled =
  FEATURES.analytics &&
  import.meta.env.PROD &&
  typeof navigator !== 'undefined' &&
  navigator.doNotTrack !== '1' &&
  !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)

const session = Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => (b % 36).toString(36)).join('')
let lang: Lang = 'ko'
const sentOnce = new Set<string>()

export function setAnalyticsLang(l: Lang) {
  lang = l
}

export function track(type: EventType, name?: string, value?: number) {
  if (!enabled) return
  const body = JSON.stringify({
    t: type,
    s: session,
    n: name,
    v: value,
    h: location.host,
    l: lang,
    r: type === 'view' ? document.referrer : undefined,
  })
  // text/plain 이라 다른 주소(Vercel → Cloudflare)로 보내도 사전 확인 요청이 필요 없음
  const blob = new Blob([body], { type: 'text/plain' })
  if (!navigator.sendBeacon?.(ENDPOINT, blob)) {
    fetch(ENDPOINT, { method: 'POST', body, keepalive: true, mode: 'no-cors' }).catch(() => {})
  }
}

/** 같은 방문 안에서 한 번만 보내기 (장 도달 등) */
export function trackOnce(type: EventType, name: string) {
  const key = `${type}:${name}`
  if (sentOnce.has(key)) return
  sentOnce.add(key)
  track(type, name)
}

/** 화면을 실제로 보고 있던 시간(초)을 방문이 끝날 때 보냄 */
export function startTimeTracking() {
  let active = 0
  let since = document.visibilityState === 'visible' ? performance.now() : 0
  const flush = () => {
    if (since) {
      active += performance.now() - since
      since = 0
    }
    if (active > 1000) track('time', undefined, Math.round(active / 1000))
  }
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
    else since = performance.now()
  })
  addEventListener('pagehide', flush)
}
