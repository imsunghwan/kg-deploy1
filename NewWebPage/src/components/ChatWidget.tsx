import { useEffect, useRef, useState } from 'react'
import { API_BASE, CHANNEL } from '../channel'
import type { Lang } from '../content'

/** 우측 하단 '코코비 도우미' 챗봇. 답은 Cloudflare Worker(/api/chat)가 규칙에 따라 만듦 */

interface Msg {
  role: 'user' | 'bot'
  text: string
}

const T = {
  title: { ko: '코코비 도우미', en: 'Cocobi Helper' },
  open: { ko: '코코비 도우미에게 물어보기', en: 'Ask the Cocobi helper' },
  close: { ko: '닫기', en: 'Close' },
  placeholder: { ko: '코코비에 대해 물어보세요', en: 'Ask about Cocobi' },
  send: { ko: '보내기', en: 'Send' },
  note: { ko: '개인정보는 입력하지 마세요 · 대화는 품질 개선을 위해 저장돼요', en: 'Please don’t share personal info · Chats are saved to improve answers' },
  error: { ko: '연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.', en: 'Connection problem. Please try again shortly.' },
  greeting: { ko: '안녕하세요! 코코비 도우미예요 🦖', en: 'Hi! I’m the Cocobi helper 🦖' },
}

const newSession = () => Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => (b % 36).toString(36)).join('')

export function ChatWidget({ lang, onOpenChange }: { lang: Lang; onOpenChange?: (open: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [blocked, setBlocked] = useState(false)
  const [maxLength, setMaxLength] = useState(300)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const session = useRef(newSession())
  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const loadedLang = useRef<Lang | null>(null)

  // 처음 열 때(또는 언어가 바뀐 뒤 열 때) 인사말·추천 질문 받아오기
  useEffect(() => {
    if (!open || loadedLang.current === lang) return
    loadedLang.current = lang
    fetch(`${API_BASE}/api/chat/config?lang=${lang}`)
      .then((r) => r.json())
      .then((c: { greeting: string; maxLength: number; suggestions: string[] }) => {
        setMaxLength(c.maxLength || 300)
        setSuggestions(c.suggestions ?? [])
        setMsgs((m) => (m.length ? m : [{ role: 'bot', text: c.greeting }]))
      })
      .catch(() => setMsgs((m) => (m.length ? m : [{ role: 'bot', text: T.greeting[lang] }])))
  }, [open, lang])

  useEffect(() => {
    onOpenChange?.(open)
    if (open) setTimeout(() => inputRef.current?.focus(), 250)
  }, [open, onOpenChange])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [msgs, busy])

  const send = async (text: string) => {
    const m = text.trim()
    if (!m || busy || blocked) return
    setInput('')
    setSuggestions([])
    setMsgs((x) => [...x, { role: 'user', text: m }])
    setBusy(true)
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ s: session.current, m, l: lang, h: location.host, c: CHANNEL }),
      })
      const data = (await res.json()) as { reply?: string; blocked?: boolean }
      setMsgs((x) => [...x, { role: 'bot', text: data.reply ?? T.error[lang] }])
      if (data.blocked) setBlocked(true)
    } catch {
      setMsgs((x) => [...x, { role: 'bot', text: T.error[lang] }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`chat ${open ? 'is-open' : ''}`}>
      {open && (
        <section className="chat-panel" role="dialog" aria-label={T.title[lang]}>
          <header className="chat-head">
            <img src="/characters/lobi.png" alt="" />
            <div>
              <b>{T.title[lang]}</b>
              {CHANNEL === 'test' && <span className="chat-badge">TEST</span>}
            </div>
            <button className="chat-x" onClick={() => setOpen(false)} aria-label={T.close[lang]}>
              ✕
            </button>
          </header>
          {/* data-lenis-prevent: 대화창 안에서는 페이지 대신 대화가 스크롤되도록 */}
          <div className="chat-list" ref={listRef} data-lenis-prevent>
            {msgs.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {linkify(m.text)}
              </div>
            ))}
            {busy && (
              <div className="chat-msg bot chat-typing" aria-label="…">
                <i />
                <i />
                <i />
              </div>
            )}
            {suggestions.length > 0 && !busy && (
              <div className="chat-sugs">
                {suggestions.map((q) => (
                  <button key={q} onClick={() => send(q)}>
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
          <form
            className="chat-form"
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
          >
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value.slice(0, maxLength))}
              placeholder={T.placeholder[lang]}
              maxLength={maxLength}
              disabled={blocked}
              aria-label={T.placeholder[lang]}
            />
            <button type="submit" disabled={!input.trim() || busy || blocked}>
              {T.send[lang]}
            </button>
          </form>
          <p className="chat-note">
            {T.note[lang]}
            <span>
              {input.length}/{maxLength}
            </span>
          </p>
        </section>
      )}
      <button className="chat-fab" onClick={() => setOpen((o) => !o)} aria-label={open ? T.close[lang] : T.open[lang]} aria-expanded={open}>
        {open ? <span className="chat-fab-x">✕</span> : <img src="/characters/lobi.png" alt="" />}
      </button>
    </div>
  )
}

/** 답변 속 https 주소를 누를 수 있는 링크로 */
function linkify(text: string) {
  return text.split(/(https:\/\/[^\s)]+)/g).map((part, i) =>
    part.startsWith('https://') ? (
      <a key={i} href={part} target="_blank" rel="noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  )
}
