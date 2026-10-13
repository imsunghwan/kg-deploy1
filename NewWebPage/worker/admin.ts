/**
 * 챗봇 관리자 API (/api/admin/*) — ADMIN_PASSWORD 로 보호
 * 질문·답변·카테고리 작성/수정/삭제, 규칙·문구 설정, 대화 기록, 차단 관리, 연결 상태, 테스트 메일
 */
import { DEFAULT_SETTINGS, getSettings } from './chat'
import { mailConfigured, sendMail } from './mail'
import { SITES, json, kstDayStart, type Env } from './shared'

const str = (v: unknown, max: number) => String(v ?? '').trim().slice(0, max)
const int = (v: unknown, d = 0) => (Number.isFinite(Number(v)) ? Math.round(Number(v)) : d)

export async function admin(req: Request, env: Env, path: string): Promise<Response> {
  const method = req.method
  // 다른 사이트에서 관리자 브라우저를 이용해 몰래 바꾸지 못하도록 같은 주소에서 온 요청만 허용
  if (method !== 'GET') {
    const origin = req.headers.get('origin') ?? ''
    if (origin !== new URL(req.url).origin) return json({ error: 'forbidden' }, 403)
  }
  const body: Record<string, unknown> =
    method === 'POST' || method === 'PUT' ? await req.json<Record<string, unknown>>().catch(() => ({})) : {}
  const seg = path.replace(/^\/api\/admin\/?/, '').split('/').filter(Boolean)
  const [res, id] = [seg[0] ?? '', seg[1]]
  const now = Date.now()

  /* ---- 질문·답변 ---- */
  if (res === 'faq' && method === 'GET') {
    const [cats, items] = await env.DB.batch([
      env.DB.prepare('SELECT * FROM faq_categories ORDER BY sort, id'),
      env.DB.prepare('SELECT * FROM faq_items ORDER BY category_id, sort, id'),
    ])
    return json({ categories: cats.results, items: items.results })
  }
  if (res === 'categories') {
    if (method === 'POST') {
      const name = str(body.name, 40)
      if (!name) return json({ error: '카테고리 이름을 입력해 주세요.' }, 400)
      const r = await env.DB.prepare('INSERT INTO faq_categories (name, sort) VALUES (?, ?)').bind(name, int(body.sort, 99)).run()
      return json({ id: r.meta.last_row_id })
    }
    if (method === 'PUT' && id) {
      const name = str(body.name, 40)
      if (!name) return json({ error: '카테고리 이름을 입력해 주세요.' }, 400)
      await env.DB.prepare('UPDATE faq_categories SET name = ?, sort = ? WHERE id = ?').bind(name, int(body.sort, 99), int(id)).run()
      return json({ ok: true })
    }
    if (method === 'DELETE' && id) {
      // 카테고리를 지워도 질문·답변은 남기고 '미분류'로
      await env.DB.batch([
        env.DB.prepare('UPDATE faq_items SET category_id = NULL WHERE category_id = ?').bind(int(id)),
        env.DB.prepare('DELETE FROM faq_categories WHERE id = ?').bind(int(id)),
      ])
      return json({ ok: true })
    }
  }
  if (res === 'items') {
    const fields = () => {
      const question = str(body.question, 200)
      const answer = str(body.answer, 2000)
      if (!question || !answer) return null
      const cat = body.category_id === null || body.category_id === '' ? null : int(body.category_id)
      const keywords = str(body.keywords, 400)
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean)
        .join(',')
      return [cat, question, answer, keywords, body.enabled === false || body.enabled === 0 ? 0 : 1, int(body.sort, 99), now] as const
    }
    if (method === 'POST') {
      const f = fields()
      if (!f) return json({ error: '질문과 답변을 모두 입력해 주세요.' }, 400)
      const r = await env.DB.prepare(
        'INSERT INTO faq_items (category_id, question, answer, keywords, enabled, sort, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      )
        .bind(...f)
        .run()
      return json({ id: r.meta.last_row_id })
    }
    if (method === 'PUT' && id) {
      const f = fields()
      if (!f) return json({ error: '질문과 답변을 모두 입력해 주세요.' }, 400)
      await env.DB.prepare(
        'UPDATE faq_items SET category_id = ?, question = ?, answer = ?, keywords = ?, enabled = ?, sort = ?, updated_at = ? WHERE id = ?',
      )
        .bind(...f, int(id))
        .run()
      return json({ ok: true })
    }
    if (method === 'DELETE' && id) {
      await env.DB.prepare('DELETE FROM faq_items WHERE id = ?').bind(int(id)).run()
      return json({ ok: true })
    }
  }

  /* ---- 규칙·문구 설정 ---- */
  if (res === 'settings') {
    if (method === 'GET') return json({ settings: await getSettings(env), defaults: DEFAULT_SETTINGS })
    if (method === 'PUT') {
      const stmts = []
      for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
        if (!(key in body)) continue
        const v = body[key]
        // 기본값과 같은 형태의 값만 저장
        let ok = false
        if (typeof def === 'number') ok = typeof v === 'number' && Number.isFinite(v) && v >= 0
        else if (typeof def === 'boolean') ok = typeof v === 'boolean'
        else if (typeof def === 'string') ok = typeof v === 'string' && v.length <= 60
        else ok = !!v && typeof v === 'object' && typeof (v as { ko?: unknown }).ko === 'string' && typeof (v as { en?: unknown }).en === 'string'
        if (!ok) return json({ error: `잘못된 값: ${key}` }, 400)
        stmts.push(env.DB.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value').bind(key, JSON.stringify(v)))
      }
      if (body.reset === true) stmts.push(env.DB.prepare('DELETE FROM settings'))
      if (stmts.length) await env.DB.batch(stmts)
      return json({ ok: true })
    }
  }

  /* ---- 대화 기록 ---- */
  if (res === 'chats') {
    if (method === 'GET' && !id) {
      const url = new URL(req.url)
      const flagged = url.searchParams.get('flagged') === '1'
      const rows = await env.DB.prepare(
        `SELECT s.*, (SELECT content FROM chat_messages m WHERE m.session = s.session AND m.role = 'user' ORDER BY ts LIMIT 1) AS first
         FROM chat_sessions s ${flagged ? 'WHERE s.flagged = 1' : ''} ORDER BY s.last_at DESC LIMIT 100`,
      ).all()
      return json({ sessions: rows.results })
    }
    if (method === 'GET' && id) {
      const rows = await env.DB.prepare('SELECT * FROM chat_messages WHERE session = ? ORDER BY ts').bind(id).all()
      return json({ messages: rows.results })
    }
    if (method === 'DELETE' && id) {
      await env.DB.batch([
        env.DB.prepare('DELETE FROM chat_messages WHERE session = ?').bind(id),
        env.DB.prepare('DELETE FROM chat_sessions WHERE session = ?').bind(id),
      ])
      return json({ ok: true })
    }
  }

  /* ---- 차단 ---- */
  if (res === 'blocks') {
    if (method === 'GET') {
      const rows = await env.DB.prepare('SELECT * FROM chat_blocks WHERE until > ? ORDER BY created_at DESC').bind(now).all()
      return json({ blocks: rows.results })
    }
    if (method === 'DELETE' && id) {
      await env.DB.prepare('UPDATE chat_blocks SET until = ? WHERE id = ?').bind(now, int(id)).run()
      return json({ ok: true })
    }
  }

  /* ---- 연결 상태 ---- */
  if (res === 'status' && method === 'GET') {
    const start = kstDayStart(now)
    const [model, tokens, sessions, mails] = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE source = 'llm' AND ts >= ?").bind(start),
      env.DB.prepare('SELECT COALESCE(SUM(tokens_in),0) AS i, COALESCE(SUM(tokens_out),0) AS o FROM chat_messages WHERE ts >= ?').bind(start),
      env.DB.prepare('SELECT COUNT(*) AS n FROM chat_sessions WHERE started_at >= ?').bind(start),
      env.DB.prepare('SELECT COUNT(*) AS n FROM chat_sessions WHERE notified = 1 AND started_at >= ?').bind(start),
    ])
    const one = (r: D1Result<unknown>) => (r.results?.[0] ?? {}) as Record<string, number>
    const s = await getSettings(env)
    return json({
      openai: !!env.OPENAI_API_KEY,
      mail: mailConfigured(env),
      model: s.model,
      today: {
        modelCalls: one(model).n ?? 0,
        tokensIn: one(tokens).i ?? 0,
        tokensOut: one(tokens).o ?? 0,
        sessions: one(sessions).n ?? 0,
        mails: one(mails).n ?? 0,
      },
      testUrl: `https://${SITES[0]}/test/`,
    })
  }
  if (res === 'test-mail' && method === 'POST') {
    try {
      await sendMail(env, '[코코비 챗봇] 테스트 메일', '관리자 페이지에서 보낸 테스트 메일입니다. 이 메일이 보이면 대화 시작 알림이 정상으로 동작해요.')
      return json({ ok: true })
    } catch (e) {
      return json({ error: (e as Error).message }, 500)
    }
  }

  return json({ error: 'not found' }, 404)
}
