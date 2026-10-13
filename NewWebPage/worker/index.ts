/**
 * kg-deploy1 Worker
 * - 정적 사이트(dist: 정식 빌드 `/`, 테스트 빌드 `/test/`)는 Cloudflare 가 그대로 서비스하고,
 * - 아래 경로만 이 Worker 가 처리 (wrangler.jsonc 의 run_worker_first):
 *   POST /api/track        방문 이벤트 수집           (analytics.ts)
 *   GET  /api/stats, /stats 방문 분석 (STATS_PASSWORD)  (analytics.ts, stats.html)
 *   GET  /api/chat/config  챗봇 인사말·추천 질문        (chat.ts)
 *   POST /api/chat         챗봇 대화                    (chat.ts)
 *   /api/admin/*, /admin   챗봇 관리자 (ADMIN_PASSWORD) (admin.ts, admin.html)
 */
import adminPage from './admin.html'
import statsPage from './stats.html'
import { admin } from './admin'
import { stats, track } from './analytics'
import { chat, chatConfig } from './chat'
import { cors, htmlPage, json, requirePassword, type Env } from './shared'

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url)
    const path = url.pathname

    if (path === '/api/track') {
      if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), req)
      if (req.method === 'POST') return cors(await track(req, env, ctx), req)
      return new Response('Method Not Allowed', { status: 405 })
    }

    if (path === '/api/chat' || path === '/api/chat/config') {
      if (req.method === 'OPTIONS') return cors(new Response(null, { status: 204 }), req, 'GET, POST, OPTIONS')
      if (path === '/api/chat/config' && req.method === 'GET') {
        return cors(await chatConfig(env, url.searchParams.get('lang') === 'en' ? 'en' : 'ko'), req, 'GET, POST, OPTIONS')
      }
      if (path === '/api/chat' && req.method === 'POST') return cors(await chat(req, env, ctx), req, 'GET, POST, OPTIONS')
      return new Response('Method Not Allowed', { status: 405 })
    }

    if (path === '/api/stats' || path === '/stats' || path === '/stats/') {
      const denied = await requirePassword(req, env.STATS_PASSWORD, 'STATS_PASSWORD', 'COCOBI stats')
      if (denied) return denied
      if (path === '/api/stats') return json(await stats(env, Number(url.searchParams.get('days')) || 30))
      return htmlPage(statsPage)
    }

    if (path.startsWith('/api/admin') || path === '/admin' || path === '/admin/') {
      const denied = await requirePassword(req, env.ADMIN_PASSWORD, 'ADMIN_PASSWORD', 'COCOBI admin')
      if (denied) return denied
      if (path.startsWith('/api/admin')) return admin(req, env, path)
      return htmlPage(adminPage)
    }

    return env.ASSETS.fetch(req)
  },
} satisfies ExportedHandler<Env>
