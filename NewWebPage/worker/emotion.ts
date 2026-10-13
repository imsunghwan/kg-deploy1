/**
 * 감정 분석: TypeSafe Jev(판단 전용 모델)로 분류 → OpenAI 응대에 반영
 *
 *  - 분류: POST https://api.typesafe.ai/v1/systemone (model: jev-latest, choice 질문)
 *          입력 중인 문장(타이핑)과 보낸 메시지를 7가지 감정의 확률로 받음
 *  - 응대: 가장 높은 감정이 기준(threshold) 이상이면, 답변 첫머리에 그 감정을 먼저 알아주는 말을 하도록
 *          OpenAI 에 감정 정보와 '응대 기준'을 함께 전달. 등록된 답을 바로 보낼 때도 같은 첫마디를 붙임
 *  - 키: TYPESAFE_API_KEY (없으면 감정 분석 없이 동작)
 */
import type { Env } from './shared'

export const EMOTIONS = ['joy', 'neutral', 'curious', 'confused', 'anxious', 'sad', 'angry'] as const
export type Emotion = (typeof EMOTIONS)[number]
export type Probs = Partial<Record<Emotion, number>>

export interface EmotionResult {
  top: Emotion
  prob: number
  probs: Probs
  confidence: number | null
}

type Guide = { label: string; emoji: string; threshold: number; opener: { ko: string; en: string }; guide: string }

/** 감정별 응대 기준 — 관리자 페이지 '규칙 설정 → 감정 응대 기준'에서 수정 */
export const DEFAULT_EMOTION_GUIDES: Record<Emotion, Guide> = {
  angry: {
    label: '분노·짜증',
    emoji: '😠',
    threshold: 0.5,
    opener: { ko: '기분이 많이 상하셨을 것 같아요.', en: 'I’m sorry — that sounds really frustrating.' },
    guide: '먼저 진심으로 공감·사과하고, 변명 없이 차분하고 정중하게 답한다. 해결 방법(문의 메일 등)을 분명히 알려 준다.',
  },
  sad: {
    label: '슬픔·실망',
    emoji: '😢',
    threshold: 0.5,
    opener: { ko: '많이 아쉬우셨겠어요.', en: 'I’m sorry to hear that.' },
    guide: '부드럽게 위로하고, 도움이 될 만한 내용을 따뜻하게 안내한다.',
  },
  anxious: {
    label: '불안·걱정',
    emoji: '😟',
    threshold: 0.5,
    opener: { ko: '걱정되셨죠? 제가 차근차근 알려 드릴게요.', en: 'No worries — let me walk you through it.' },
    guide: '안심시키는 말투로, 확실한 사실만 짧고 분명하게 알려 준다.',
  },
  confused: {
    label: '혼란',
    emoji: '😵',
    threshold: 0.5,
    opener: { ko: '헷갈리셨을 것 같아요. 쉽게 정리해 드릴게요.', en: 'That can be confusing — here’s a simple explanation.' },
    guide: '쉬운 말로, 필요하면 순서(①②③)를 붙여 단계별로 설명한다.',
  },
  joy: {
    label: '기쁨·만족',
    emoji: '😊',
    threshold: 0.6,
    opener: { ko: '즐거우시다니 저도 기뻐요!', en: 'So glad you’re enjoying it!' },
    guide: '밝고 신나는 말투로 맞장구치며 답한다.',
  },
  curious: {
    label: '호기심',
    emoji: '🤔',
    threshold: 1.1, // 1 보다 크면 첫마디를 붙이지 않음
    opener: { ko: '', en: '' },
    guide: '궁금증에 바로 답하고, 관련된 재미있는 사실을 하나 덧붙여도 좋다.',
  },
  neutral: {
    label: '평온·중립',
    emoji: '🙂',
    threshold: 1.1,
    opener: { ko: '', en: '' },
    guide: '바로 핵심만 친절하게 답한다.',
  },
}
export type EmotionGuides = typeof DEFAULT_EMOTION_GUIDES

const CRITERIA: Record<Emotion, string> = {
  joy: 'Joy / satisfaction — happy, thankful, delighted, excited (기쁨·만족)',
  neutral: 'Calm / neutral — plainly asking or stating something without notable emotion (평온·중립)',
  curious: 'Curiosity — wants to know more, interested (호기심)',
  confused: 'Confusion — does not understand, puzzled, lost (혼란)',
  anxious: 'Anxiety / worry — worried, nervous, uneasy (불안·걱정)',
  sad: 'Sadness / disappointment — upset, let down, sorry (슬픔·실망)',
  angry: 'Anger / irritation — angry, annoyed, complaining strongly (분노·짜증)',
}

export function jevReady(env: Env) {
  return !!env.TYPESAFE_API_KEY || env.JEV_MOCK === '1'
}

export async function classify(env: Env, text: string): Promise<EmotionResult> {
  if (!env.TYPESAFE_API_KEY && env.JEV_MOCK === '1') return mockClassify(text)
  const res = await fetch('https://api.typesafe.ai/v1/systemone', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.TYPESAFE_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      model: 'jev-latest',
      state: text,
      questions: {
        emotion: {
          type: 'choice',
          instructions:
            'A visitor is typing a message to the helper chatbot of "Cocobi", a children’s dinosaur character website. ' +
            'The message may be unfinished. Which emotion does the writer feel right now? (Korean or English text)',
          criteria: CRITERIA,
        },
      },
    }),
  })
  if (!res.ok) throw new Error(`Jev 오류 (${res.status}): ${(await res.text()).slice(0, 200)}`)
  const data = (await res.json()) as {
    answers?: { emotion?: { choice?: string; probabilities?: Record<string, number>; confidence?: number } }
  }
  const a = data.answers?.emotion
  if (!a?.probabilities) throw new Error('Jev 응답에 감정 확률이 없습니다.')
  const probs: Probs = {}
  for (const e of EMOTIONS) probs[e] = Math.round((a.probabilities[e] ?? 0) * 1000) / 1000
  const top = (EMOTIONS.includes(a.choice as Emotion) ? a.choice : topOf(probs)) as Emotion
  return { top, prob: probs[top] ?? 0, probs, confidence: a.confidence ?? null }
}

function topOf(probs: Probs): Emotion {
  return EMOTIONS.reduce((best, e) => ((probs[e] ?? 0) > (probs[best] ?? 0) ? e : best), 'neutral' as Emotion)
}

/**
 * 로컬 시험 전용(JEV_MOCK=1, 키 없을 때만): 낱말로 대충 흉내 내는 가짜 분류.
 * 배포된 Worker 에는 JEV_MOCK 을 넣지 않음.
 */
function mockClassify(text: string): EmotionResult {
  const rules: [Emotion, RegExp][] = [
    ['angry', /(화나|짜증|열받|최악|왜 안|안 돼|답답|어이없|angry|annoy|terrible|worst)/i],
    ['sad', /(슬퍼|속상|실망|아쉽|우울|sad|disappoint)/i],
    ['anxious', /(걱정|불안|무서|괜찮을까|worried|nervous|scared)/i],
    ['confused', /(모르겠|헷갈|이해가 안|뭐지|어떻게 하|confus|don't understand)/i],
    ['joy', /(좋아|최고|재밌|신나|고마|감사|사랑|love|great|thanks|fun)/i],
    ['curious', /(궁금|누구|뭐야|알려|어디|who|what|where|\?)/i],
  ]
  const hit = rules.find(([, re]) => re.test(text))?.[0] ?? 'neutral'
  const probs: Probs = Object.fromEntries(EMOTIONS.map((e) => [e, e === hit ? 0.65 : 0.35 / 6])) as Probs
  return { top: hit, prob: 0.65, probs, confidence: 0.7 }
}

export async function textHash(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text.trim()))
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 대화 전체 감정 흐름: 보낸 메시지에 더 무게, 최근일수록 더 무게 */
export function aggregate(rows: { kind: string; probs: string }[]): { top: Emotion; probs: Probs } | null {
  if (!rows.length) return null
  const sum: Record<string, number> = {}
  let total = 0
  rows.forEach((r, i) => {
    const w = (r.kind === 'message' ? 2 : 1) * (1 + i / rows.length)
    let p: Probs
    try {
      p = JSON.parse(r.probs)
    } catch {
      return
    }
    for (const e of EMOTIONS) sum[e] = (sum[e] ?? 0) + (p[e] ?? 0) * w
    total += w
  })
  if (!total) return null
  const probs: Probs = {}
  for (const e of EMOTIONS) probs[e] = Math.round(((sum[e] ?? 0) / total) * 1000) / 1000
  return { top: topOf(probs), probs }
}

export function describe(probs: Probs, guides: EmotionGuides, n = 3) {
  return EMOTIONS.map((e) => [e, probs[e] ?? 0] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .filter(([, p]) => p >= 0.05)
    .map(([e, p]) => `${guides[e]?.label ?? e} ${Math.round(p * 100)}%`)
    .join(', ')
}

/** 지금 감정이 기준을 넘으면 답변 첫머리에 붙일 말 */
export function openerFor(r: EmotionResult | null, guides: EmotionGuides, lang: 'ko' | 'en') {
  if (!r) return ''
  const g = guides[r.top]
  if (!g || r.prob < g.threshold) return ''
  return g.opener[lang] ?? ''
}

/** OpenAI 지침에 덧붙이는 '감정 응대 기준' (고정 문구라 캐시됨) */
export function guideInstructions(guides: EmotionGuides) {
  const lines = EMOTIONS.map((e) => {
    const g = guides[e]
    const when = g.threshold <= 1 ? `${Math.round(g.threshold * 100)}% 이상이면 첫 문장을 "${g.opener.ko}" 같은 말로 시작` : '첫마디 없이 바로'
    return `- ${g.label}: ${when}. ${g.guide}`
  }).join('\n')
  return `[감정 응대 기준 — 감정 분석은 별도 모델(Jev)이 했고, 결과는 developer 메시지로 전달된다]
- developer 메시지의 [감정] 에서 가장 높은 감정과 비율을 보고 아래 기준대로 말투와 첫 문장을 정한다.
- 공감의 말은 첫 문장 한 번만, 짧게. 그 뒤에 원래 규칙대로 지식에 근거해 답한다.
- [대화 흐름]이 부정적으로 바뀌고 있으면 더 정중하고 짧게 답하고, 필요하면 문의 메일을 안내한다.
- 감정 수치, '감정 분석', 'Jev' 같은 말은 사용자에게 절대 드러내지 않는다.
- [사용자 이름]이 있으면 "OO님"으로 자연스럽게 한 번 불러 준다 (매 답변 첫머리마다 반복하지 않는다).
${lines}`
}
