/** 방문 분석: 이벤트 수집(/api/track)과 집계(/api/stats) */
import { BOT, ORIGINS, SITES, country, dailyHash, device, kstDay, type Env } from './shared'

const TYPES = new Set(['view', 'chapter', 'character', 'constellation', 'lang', 'link', 'time'])

export async function track(req: Request, env: Env, ctx: ExecutionContext) {
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
  if (origin && !ORIGINS.includes(origin)) return ok

  const now = Date.now()
  const day = kstDay(now)
  const ip = req.headers.get('cf-connecting-ip') ?? ''
  const visitor = await dailyHash(env, day, `${ip}|${ua}`)
  const value = typeof body.v === 'number' && Number.isFinite(body.v) ? Math.max(0, Math.min(body.v, 6 * 3600)) : null
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
      country(req),
      device(ua),
      body.l === 'en' ? 'en' : 'ko',
    )
    .run()
  // 이틀 지난 소금값은 지워서 지난 방문자 해시를 되돌릴 수 없게
  ctx.waitUntil(env.DB.prepare('DELETE FROM salts WHERE day < ?').bind(kstDay(now - 2 * 86400_000)).run())
  return ok
}



function clip(v: unknown, n: number) {
  if (v == null) return null
  return String(v).slice(0, n)
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


/* ---------------- 통계 ---------------- */

export async function stats(env: Env, days: number) {
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
