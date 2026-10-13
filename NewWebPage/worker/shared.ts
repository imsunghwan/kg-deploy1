/** Worker 전체에서 함께 쓰는 설정·도구 */

export interface Env {
  DB: D1Database
  ASSETS: Fetcher
  /** 방문 분석 페이지 비밀번호 */
  STATS_PASSWORD?: string
  /** 챗봇 관리자 페이지 비밀번호 */
  ADMIN_PASSWORD?: string
  /** OpenAI API 키 (없으면 챗봇은 등록된 질문·답변만으로 응답) */
  OPENAI_API_KEY?: string
  /** TypeSafe API 키 — Jev 감정 분석 (없으면 감정 분석 없이 동작) */
  TYPESAFE_API_KEY?: string
  /** 로컬 시험 전용: '1' 이면 키 없이 가짜 감정 분류 (배포 환경에는 넣지 않음) */
  JEV_MOCK?: string
  /** SMTP 메일 — 대화 시작 알림 (기본 Gmail smtp.gmail.com:465) */
  SMTP_HOST?: string
  SMTP_PORT?: string
  /** 보내는 주소(로그인 아이디) */
  SMTP_USER?: string
  /** Google 앱 비밀번호 */
  SMTP_PASS?: string
  /** 알림을 받을 주소 (없으면 SMTP_USER) */
  NOTIFY_TO?: string
}

/** 이 서비스가 배포된 주소들 (이벤트·대화 요청은 여기서 온 것만 받음) */
export const SITES = ['kg-deploy1.kg-landing.workers.dev', 'kg-deploy1-git-main-imsunghwan.vercel.app']
export const ORIGINS = SITES.map((s) => `https://${s}`)

/**
 * 요청이 허용된 사이트에서 왔는지. 내 컴퓨터에서 `wrangler dev` 로 시험할 때만
 * 그 로컬 주소(127.0.0.1:8787 등)도 허용 — 배포된 Worker 에는 해당 없음.
 */
export function allowedSite(req: Request, host: string, origin: string) {
  const self = new URL(req.url)
  const local = /^(127\.0\.0\.1|localhost)$/.test(self.hostname)
  const hostOk = SITES.includes(host) || (local && host === self.host)
  const originOk = !origin || ORIGINS.includes(origin) || (local && origin === self.origin)
  return hostOk && originOk
}

/** 검색·미리보기 봇 */
export const BOT = /bot|crawl|spider|slurp|preview|scrap|facebookexternalhit|embedly|headless|lighthouse/i

/** 한국 시간 기준 날짜 YYYY-MM-DD */
export function kstDay(ms: number) {
  return new Date(ms + 9 * 3600_000).toISOString().slice(0, 10)
}

/** 한국 시간 오늘 0시(ms) */
export function kstDayStart(ms: number) {
  return Date.parse(`${kstDay(ms)}T00:00:00+09:00`)
}

/**
 * 날마다 바뀌는 무작위 소금값으로 만든 익명 해시.
 * 같은 날 같은 사람만 묶이고, 소금값은 이틀 뒤 지워져 되돌릴 수 없음.
 */
export async function dailyHash(env: Env, day: string, raw: string) {
  const random = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
  await env.DB.prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?, ?)').bind(day, random).run()
  const row = await env.DB.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first<{ salt: string }>()
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${row?.salt}|${raw}`))
  return [...new Uint8Array(buf)].slice(0, 10).map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function device(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile'
  return 'desktop'
}

export function country(req: Request) {
  return (req as Request & { cf?: { country?: string } }).cf?.country ?? null
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}

/** 우리 사이트에서 온 요청에만 CORS 허용 (Vercel 주소 → Cloudflare Worker) */
export function cors(res: Response, req: Request, methods = 'POST, OPTIONS') {
  const origin = req.headers.get('origin') ?? ''
  if (ORIGINS.includes(origin)) {
    res.headers.set('access-control-allow-origin', origin)
    res.headers.set('access-control-allow-methods', methods)
    res.headers.set('access-control-allow-headers', 'content-type')
    res.headers.set('vary', 'origin')
  }
  return res
}

/**
 * 브라우저 기본 로그인 창(Basic 인증)으로 비밀번호 확인. 아이디는 아무거나.
 * 통과하면 null, 아니면 401/503 응답.
 */
export async function requirePassword(req: Request, secret: string | undefined, secretName: string, realm: string) {
  if (!secret) {
    return new Response(`비밀번호가 아직 설정되지 않았습니다. (npx wrangler secret put ${secretName})`, {
      status: 503,
      headers: { 'content-type': 'text/plain; charset=utf-8' },
    })
  }
  const header = req.headers.get('authorization') ?? ''
  let password = ''
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6))
      password = decoded.slice(decoded.indexOf(':') + 1)
    } catch {
      password = ''
    }
  }
  if (password && (await sameSecret(password, secret))) return null
  return new Response('비밀번호가 필요합니다.', {
    status: 401,
    headers: {
      'www-authenticate': `Basic realm="${realm}", charset="UTF-8"`,
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}

/** 길이가 달라도 시간 차이로 비밀번호가 새지 않도록 해시끼리 비교 */
async function sameSecret(a: string, b: string) {
  const enc = new TextEncoder()
  const [ha, hb] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))])
  return crypto.subtle.timingSafeEqual(ha, hb)
}

export function htmlPage(html: string) {
  return new Response(html, {
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
