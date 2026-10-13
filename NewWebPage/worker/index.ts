/**
 * kg-deploy1 Worker
 * - 정적 사이트(dist)는 Cloudflare 가 그대로 서비스하고,
 * - 아래 경로만 이 Worker 가 처리 (wrangler.jsonc 의 run_worker_first):
 *   POST /api/track  방문 이벤트 수집 (Vercel·Cloudflare 두 주소에서 보냄)
 *   GET  /api/stats  분석 데이터 (비밀번호 필요)
 *   GET  /stats      분석 페이지 (비밀번호 필요)
 */
import dashboard from './stats.html'

interface Env {
  DB: D1Database
  ASSETS: Fetcher
  /** `npx wrangler secret put STATS_PASSWORD` 로 설정 */
  STATS_PASSWORD?: string
}

/** 이벤트를 받을 사이트 주소 (그 외 출처는 무시) */
const SITES = ['kg-deploy1.kg-landing.workers.dev', 'kg-deploy1-git-main-imsunghwan.vercel.app']
const TYPES = new Set(['view', 'chapter', 'character', 'constellation', 'lang', 'link', 'time'])
const BOT = /bot|crawl|spider|slurp|preview|scrap|facebookexternalhit|embedly|headless|lighthouse/i

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    if (url.pathname === '/api/track') {
      if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), req)
      if (req.method === 'POST') return cors(await track(req, env, ctx), req)
      return new Response('Method Not Allowed', { status: 405 })
    }
    if (url.pathname === '/api/stats' || url.pathname === '/stats' || url.pathname === '/stats/') {
      const denied = await authorize(req, env)
      if (denied) return denied
      if (url.pathname === '/api/stats') return json(await stats(env, Number(url.searchParams.get('days')) || 30))
      return new Response(dashboard, {
        headers: {
          'content-type': 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-robots-tag': 'noindex, nofollow',
        },
      })
    }
    return env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<Env>

/* ---------------- 수집 ---------------- */

async function track(req: Request, env: Env, ctx: ExecutionContext) {
  const ok = new Response(null, { status: 204 })
  const ua = req.headers.get('user-agent') ?? ''
  if (BOT.test(ua)) return ok
  const origin = req.headers.get('origin') ?? ''
  let body: Record<string, unknown>
  try {
    const text = await req.text()
    if (text.length > 2000) return ok
    body = JSON.parse(text)
  } catch {
    return ok
  }
  const type = String(body.t ?? '')
  const session = String(body.s ?? '')
  const host = String(body.h ?? '')
  // 다른 사이트에서 보낸 값·이상한 값은 조용히 버림
  if (!TYPES.has(type) || !/^[a-z0-9]{8,32}$/.test(session) || !SITES.includes(host)) return ok
  if (origin && !SITES.some((s) => origin === `https://${s}`)) return ok

  const now = Date.now()
  const day = kstDay(now)
  const ip = req.headers.get('cf-connecting-ip') ?? ''
  const visitor = await visitorHash(env, day, `${ip}|${ua}`)
  const value = typeof body.v === 'number' && Number.isFinite(body.v) ? Math.max(0, Math.min(body.v, 6 * 3600)) : null
  const cf = (req as Request & { cf?: { country?: string } }).cf
  await env.DB.prepare(
    `INSERT INTO events (ts, day, session, visitor, type, name, value, host, ref, country, device, lang)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      now,
      day,
      session,
      visitor,
      type,
      clip(body.n, 40),
      value,
      host,
      type === 'view' ? referrer(String(body.r ?? ''), host) : null,
      cf?.country ?? null,
      device(ua),
      body.l === 'en' ? 'en' : 'ko',
    )
    .run()
  // 이틀 지난 소금값은 지워서 지난 방문자 해시를 되돌릴 수 없게
  ctx.waitUntil(env.DB.prepare('DELETE FROM salts WHERE day < ?').bind(kstDay(now - 2 * 86400_000)).run())
  return ok
}

function kstDay(ms: number) {
  return new Date(ms + 9 * 3600_000).toISOString().slice(0, 10)
}

async function visitorHash(env: Env, day: string, raw: string) {
  const random = [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, '0')).join('')
  await env.DB.prepare('INSERT OR IGNORE INTO salts (day, salt) VALUES (?, ?)').bind(day, random).run()
  const row = await env.DB.prepare('SELECT salt FROM salts WHERE day = ?').bind(day).first<{ salt: string }>()
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${row?.salt}|${raw}`))
  return [...new Uint8Array(buf)].slice(0, 10).map((b) => b.toString(16).padStart(2, '0')).join('')
}

function clip(v: unknown, n: number) {
  if (v == null) return null
  return String(v).slice(0, n)
}

function device(ua: string) {
  if (/iPad|Tablet|PlayBook|Silk|(Android(?!.*Mobile))/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|Android/i.test(ua)) return 'mobile'
  return 'desktop'
}

/** 유입 경로를 사람이 읽기 쉬운 이름으로 */
function referrer(r: string, host: string) {
  if (!r) return '직접 방문'
  let h: string
  try {
    h = new URL(r).hostname.replace(/^www\./, '')
  } catch {
    return '기타'
  }
  if (h === host || SITES.includes(h)) return '사이트 내부'
  const map: [RegExp, string][] = [
    [/kakao/, '카카오톡'],
    [/google\./, 'Google'],
    [/naver\./, '네이버'],
    [/daum\.|kakao\.com/, '다음'],
    [/instagram\./, '인스타그램'],
    [/facebook\.|fb\./, '페이스북'],
    [/youtube\.|youtu\.be/, '유튜브'],
    [/^t\.co$|twitter\.|x\.com/, 'X(트위터)'],
    [/slack\./, '슬랙'],
    [/bing\./, 'Bing'],
  ]
  for (const [re, name] of map) if (re.test(h)) return name
  return h.slice(0, 40)
}

function cors(res: Response, req: Request) {
  const origin = req.headers.get('origin') ?? ''
  if (SITES.some((s) => origin === `https://${s}`)) {
    res.headers.set('access-control-allow-origin', origin)
    res.headers.set('access-control-allow-methods', 'POST, OPTIONS')
    res.headers.set('access-control-allow-headers', 'content-type')
    res.headers.set('vary', 'origin')
  }
  return res
}

/* ---------------- 비밀번호 ---------------- */

async function authorize(req: Request, env: Env): Promise<Response | null> {
  if (!env.STATS_PASSWORD) {
    return new Response('분석 페이지 비밀번호가 아직 설정되지 않았습니다. (npx wrangler secret put STATS_PASSWORD)', {
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
  if (password && (await sameSecret(password, env.STATS_PASSWORD))) return null
  return new Response('비밀번호가 필요합니다.', {
    status: 401,
    headers: {
      'www-authenticate': 'Basic realm="COCOBI stats", charset="UTF-8"',
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

/* ---------------- 통계 ---------------- */

async function stats(env: Env, days: number) {
  const span = Math.max(1, Math.min(365, Math.round(days)))
  const from = kstDay(Date.now() - (span - 1) * 86400_000)
  const q = (sql: string) => env.DB.prepare(sql).bind(from)
  const [summary, daily, time, funnel, refs, devices, countries, hosts, langs, chars, links] = await env.DB.batch([
    q(`SELECT COUNT(DISTINCT day || visitor) AS visitors, COUNT(DISTINCT session) AS sessions, COUNT(*) AS views
       FROM events WHERE type = 'view' AND day >= ?`),
    q(`SELECT day, COUNT(DISTINCT visitor) AS visitors, COUNT(*) AS views
       FROM events WHERE type = 'view' AND day >= ? GROUP BY day ORDER BY day`),
    q(`SELECT AVG(sec) AS avg, COUNT(*) AS n, SUM(sec >= 60) AS over1m FROM (
         SELECT MAX(value) AS sec FROM events WHERE type = 'time' AND day >= ? GROUP BY session)`),
    q(`SELECT name, COUNT(DISTINCT session) AS n FROM events WHERE type = 'chapter' AND day >= ? GROUP BY name`),
    q(`SELECT ref AS name, COUNT(DISTINCT session) AS n FROM events WHERE type = 'view' AND day >= ? GROUP BY ref ORDER BY n DESC LIMIT 10`),
    q(`SELECT device AS name, COUNT(DISTINCT session) AS n FROM events WHERE type = 'view' AND day >= ? GROUP BY device ORDER BY n DESC`),
    q(`SELECT COALESCE(country, '??') AS name, COUNT(DISTINCT session) AS n FROM events WHERE type = 'view' AND day >= ? GROUP BY country ORDER BY n DESC LIMIT 10`),
    q(`SELECT host AS name, COUNT(DISTINCT session) AS n FROM events WHERE type = 'view' AND day >= ? GROUP BY host ORDER BY n DESC`),
    // 방문마다 마지막으로 보고 있던 언어
    q(`SELECT lang AS name, COUNT(*) AS n FROM (
         SELECT lang, ROW_NUMBER() OVER (PARTITION BY session ORDER BY ts DESC) AS rn FROM events WHERE day >= ?)
       WHERE rn = 1 GROUP BY lang ORDER BY n DESC`),
    q(`SELECT name, SUM(type = 'character') AS opens, SUM(type = 'constellation') AS stars
       FROM events WHERE type IN ('character', 'constellation') AND day >= ? GROUP BY name`),
    q(`SELECT name, COUNT(*) AS n FROM events WHERE type = 'link' AND day >= ? GROUP BY name ORDER BY n DESC`),
  ])
  const rows = <T>(r: D1Result<unknown>) => (r.results ?? []) as T[]
  return {
    from,
    to: kstDay(Date.now()),
    days: span,
    summary: rows(summary)[0] ?? { visitors: 0, sessions: 0, views: 0 },
    daily: rows(daily),
    time: rows(time)[0] ?? { avg: null, n: 0, over1m: 0 },
    funnel: rows(funnel),
    referrers: rows(refs),
    devices: rows(devices),
    countries: rows(countries),
    hosts: rows(hosts),
    langs: rows(langs),
    characters: rows(chars),
    links: rows(links),
  }
}

function json(data: unknown) {
  return new Response(JSON.stringify(data), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  })
}
