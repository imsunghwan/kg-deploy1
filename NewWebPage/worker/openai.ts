/** OpenAI Responses API 호출 (서버에서만, 키는 Cloudflare 비밀 설정 OPENAI_API_KEY) */
import type { Env } from './shared'

export type Verdict = 'answer' | 'unknown' | 'off_topic' | 'injection' | 'abuse'

export interface ModelReply {
  verdict: Verdict
  faq_ids: number[]
  reply: string
  tokensIn: number
  tokensOut: number
}

/** 모델이 반드시 이 형식(JSON)으로만 답하게 함 */
const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['verdict', 'faq_ids', 'reply'],
  properties: {
    verdict: { type: 'string', enum: ['answer', 'unknown', 'off_topic', 'injection', 'abuse'] },
    faq_ids: { type: 'array', items: { type: 'integer' } },
    reply: { type: 'string' },
  },
}

export async function askModel(
  env: Env,
  opts: {
    model: string
    effort: string
    maxOutputTokens: number
    instructions: string
    history: { role: 'user' | 'assistant'; content: string }[]
    message: string
    /** 서버가 만든 부가 정보(감정 분석·사용자 이름) — 사용자가 위조할 수 없도록 developer 메시지로 */
    context?: string
  },
): Promise<ModelReply> {
  const res = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.OPENAI_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: opts.model,
      // 고정된 지침·지식을 앞에 둬서 같은 앞부분이 캐시되도록 (입력 비용 절감)
      instructions: opts.instructions,
      input: [
        ...opts.history,
        ...(opts.context ? [{ role: 'developer' as const, content: opts.context }] : []),
        { role: 'user', content: opts.message },
      ],
      reasoning: { effort: opts.effort },
      max_output_tokens: opts.maxOutputTokens,
      text: { format: { type: 'json_schema', name: 'chat_reply', strict: true, schema: SCHEMA } },
      store: false,
    }),
  })
  if (!res.ok) throw new Error(`OpenAI 오류 (${res.status}): ${(await res.text()).slice(0, 300)}`)
  const data = (await res.json()) as {
    output?: { type: string; content?: { type: string; text?: string }[] }[]
    usage?: { input_tokens?: number; output_tokens?: number }
  }
  const text = data.output
    ?.filter((o) => o.type === 'message')
    .flatMap((o) => o.content ?? [])
    .find((c) => c.type === 'output_text')?.text
  if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.')
  const parsed = JSON.parse(text) as Omit<ModelReply, 'tokensIn' | 'tokensOut'>
  return { ...parsed, tokensIn: data.usage?.input_tokens ?? 0, tokensOut: data.usage?.output_tokens ?? 0 }
}
