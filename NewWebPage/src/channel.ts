/**
 * 빌드 채널과 기능 스위치
 *
 *   정식 빌드  `/`       — npm run build 의 첫 번째 빌드 (vite build)
 *   테스트 빌드 `/test/`  — 두 번째 빌드 (vite build --mode test)
 *
 * 새 기능은 먼저 test 채널에서만 켜고, 승인되면 아래 스위치를 `true` 로 바꿔
 * 정식 빌드에도 반영합니다 (정식 승격).
 */
export const CHANNEL: 'prod' | 'test' = import.meta.env.MODE === 'test' ? 'test' : 'prod'

export const FEATURES = {
  /** 우측 하단 챗봇 (코코비 도우미) — 2026-10-13 정식 승격 */
  chatbot: true,
  /** 방문 분석 이벤트 전송 — 테스트 빌드 방문은 통계에 섞지 않음 */
  analytics: CHANNEL === 'prod',
}

/** 챗봇·분석 API 가 있는 Cloudflare Worker 주소 */
export const API_BASE = /\.workers\.dev$|^(127\.0\.0\.1|localhost):8787$/.test(location.host)
  ? '' // Worker 가 직접 사이트를 서비스하는 주소면 같은 출처
  : 'https://kg-deploy1.kg-landing.workers.dev'
