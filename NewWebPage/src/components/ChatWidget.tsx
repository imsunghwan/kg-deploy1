import { useEffect, useRef, useState } from "react";
import { API_BASE, CHANNEL } from "../channel";
import type { Lang } from "../content";

/**
 * 우측 하단 '코코비 도우미' 챗봇. 답은 Cloudflare Worker(/api/chat)가 규칙에 따라 만듦
 *  1) 처음 열면 이름·이메일·개인정보 동의를 받고 (/api/chat/start)
 *  2) 입력하는 동안 문장을 잠깐씩 보내 감정을 분류하고 (/api/chat/emotion → TypeSafe Jev)
 *  3) 보낸 질문에는 그 감정과 이름을 반영해 답함 (/api/chat → OpenAI)
 */

interface Msg {
  role: "user" | "bot";
  text: string;
}

const T = {
  title: { ko: "코코비 도우미", en: "Cocobi Helper" },
  open: { ko: "코코비 도우미에게 물어보기", en: "Ask the Cocobi helper" },
  close: { ko: "닫기", en: "Close" },
  placeholder: { ko: "코코비에 대해 물어보세요", en: "Ask about Cocobi" },
  send: { ko: "보내기", en: "Send" },
  note: {
    ko: "대화는 상담 응대와 서비스 개선을 위해 저장돼요",
    en: "Chats are saved to answer you and improve the service",
  },
  intro: {
    ko: "안녕하세요! 코코비 도우미예요 🦖\n대화를 시작하기 전에 이름과 이메일을 알려 주세요. 이름을 불러 드리며 이야기할게요.",
    en: "Hi! I’m the Cocobi helper 🦖\nBefore we chat, please tell me your name and email so I can call you by name.",
  },
  name: { ko: "이름 (또는 별명)", en: "Name (or nickname)" },
  email: { ko: "이메일", en: "Email" },
  consent: {
    ko: "[필수] 개인정보 수집·이용에 동의합니다",
    en: "[Required] I agree to the collection and use of my personal information",
  },
  details: { ko: "자세히 보기", en: "Details" },
  start: { ko: "대화 시작하기", en: "Start chatting" },
  starting: { ko: "시작하는 중…", en: "Starting…" },
  badEmail: {
    ko: "이메일 주소를 확인해 주세요.",
    en: "Please check your email address.",
  },
  error: {
    ko: "연결이 원활하지 않아요. 잠시 후 다시 시도해 주세요.",
    en: "Connection problem. Please try again shortly.",
  },
  greeting: {
    ko: "안녕하세요! 코코비 도우미예요 🦖",
    en: "Hi! I’m the Cocobi helper 🦖",
  },
};

/** 개인정보 수집·이용 안내 (서버의 CONSENT_VERSION 과 함께 바꿀 것) */
const CONSENT_ITEMS = {
  ko: [
    [
      "수집 항목",
      "이름, 이메일, 대화 내용, 입력 중인 문장과 보낸 메시지의 감정 분석 결과",
    ],
    [
      "이용 목적",
      "질문 응대, 이름을 불러 드리는 대화, 기분에 맞춘 답변, 문의 회신, 서비스 개선",
    ],
    [
      "보관 기간",
      "목적을 이룬 뒤 지체 없이 삭제 (최대 1년). 삭제 요청은 biz@kiglestudio.com",
    ],
    [
      "국외 이전",
      "답변 생성(OpenAI)과 감정 분석(TypeSafe)을 위해 미국 서버로 전송돼요",
    ],
    ["동의 거부", "거부할 수 있어요. 다만 이 경우 챗봇은 이용할 수 없어요"],
    ["어린이", "만 14세 미만 어린이는 보호자가 함께 입력해 주세요"],
  ],
  en: [
    [
      "What",
      "Name, email, chat messages, and emotion analysis of text you type and send",
    ],
    [
      "Why",
      "Answering you by name, matching replies to how you feel, replying to inquiries, improving the service",
    ],
    [
      "How long",
      "Deleted once no longer needed (up to 1 year). Ask biz@kiglestudio.com to delete it anytime",
    ],
    [
      "Transfer",
      "Sent to servers in the US for replies (OpenAI) and emotion analysis (TypeSafe)",
    ],
    [
      "Refusal",
      "You may refuse, but the chatbot can’t be used without consent",
    ],
    [
      "Children",
      "Children under 14 should fill this in with a parent or guardian",
    ],
  ],
} as const;
const PROFILE_KEY = "cocobi-chat-profile";
const loadProfile = (): { name: string; email: string } => {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "{}");
    return { name: String(p.name ?? ""), email: String(p.email ?? "") };
  } catch {
    return { name: "", email: "" };
  }
};
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const newSession = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) =>
    (b % 36).toString(36),
  ).join("");

export function ChatWidget({
  lang,
  onOpenChange,
}: {
  lang: Lang;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [maxLength, setMaxLength] = useState(300);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [emotionOn, setEmotionOn] = useState(false);
  // 대화 시작 전: 이름·이메일·동의
  const [started, setStarted] = useState(false);
  const [form, setForm] = useState(loadProfile);
  const [agree, setAgree] = useState(false);
  const [formError, setFormError] = useState("");
  const [starting, setStarting] = useState(false);
  const session = useRef(newSession());
  const lastEmotionText = useRef("");
  const nameRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const loadedLang = useRef<Lang | null>(null);

  // 처음 열 때(또는 언어가 바뀐 뒤 열 때) 인사말·추천 질문 받아오기
  useEffect(() => {
    if (!open || loadedLang.current === lang) return;
    loadedLang.current = lang;
    fetch(`${API_BASE}/api/chat/config?lang=${lang}`)
      .then((r) => r.json())
      .then(
        (c: {
          maxLength: number;
          suggestions: string[];
          emotion?: boolean;
        }) => {
          setMaxLength(c.maxLength || 300);
          setSuggestions(c.suggestions ?? []);
          setEmotionOn(!!c.emotion);
        },
      )
      .catch(() => {});
  }, [open, lang]);

  useEffect(() => {
    onOpenChange?.(open);
    if (open)
      setTimeout(
        () => (started ? inputRef.current : nameRef.current)?.focus(),
        250,
      );
  }, [open, onOpenChange, started]);

  // 입력하는 동안 감정 분석: 잠깐 멈출 때마다(0.7초) 지금까지 쓴 문장을 보냄. 결과는 서버에만 쌓이고 답변에 반영됨
  useEffect(() => {
    const t = input.trim();
    if (
      !started ||
      !emotionOn ||
      blocked ||
      t.length < 3 ||
      t === lastEmotionText.current
    )
      return;
    const timer = setTimeout(() => {
      lastEmotionText.current = t;
      fetch(`${API_BASE}/api/chat/emotion`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ s: session.current, h: location.host, t }),
        keepalive: true,
      }).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [input, started, emotionOn, blocked]);

  const start = async () => {
    const name = form.name.replace(/\s+/g, " ").trim();
    const email = form.email.trim();
    if (!name)
      return setFormError(
        lang === "ko" ? "이름을 입력해 주세요." : "Please enter your name.",
      );
    if (!EMAIL.test(email)) return setFormError(T.badEmail[lang]);
    if (!agree)
      return setFormError(
        lang === "ko"
          ? "개인정보 수집·이용에 동의해 주세요."
          : "Please agree to the privacy notice.",
      );
    setFormError("");
    setStarting(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          s: session.current,
          name,
          email,
          consent: true,
          l: lang,
          h: location.host,
          c: CHANNEL,
        }),
      });
      const data = (await res.json()) as {
        greeting?: string;
        error?: string;
        blocked?: boolean;
        limited?: boolean;
        disabled?: boolean;
      };
      if (!res.ok || !data.greeting)
        return setFormError(data.error ?? T.error[lang]);
      try {
        localStorage.setItem(PROFILE_KEY, JSON.stringify({ name, email }));
      } catch {}
      setMsgs([{ role: "bot", text: data.greeting }]);
      if (data.blocked || data.limited || data.disabled) setBlocked(true);
      setStarted(true);
    } catch {
      setFormError(T.error[lang]);
    } finally {
      setStarting(false);
    }
  };

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [msgs, busy]);

  const send = async (text: string) => {
    const m = text.trim();
    if (!m || busy || blocked) return;
    setInput("");
    lastEmotionText.current = "";
    setSuggestions([]);
    setMsgs((x) => [...x, { role: "user", text: m }]);
    setBusy(true);
    try {
      const res = await fetch(`${API_BASE}/api/chat`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          s: session.current,
          m,
          l: lang,
          h: location.host,
          c: CHANNEL,
        }),
      });
      const data = (await res.json()) as {
        reply?: string;
        blocked?: boolean;
        needStart?: boolean;
      };
      if (data.needStart) {
        // 서버에 동의 기록이 없으면(세션 만료 등) 처음 화면으로
        session.current = newSession();
        setStarted(false);
        setMsgs([]);
        setFormError(data.reply ?? "");
        return;
      }
      setMsgs((x) => [
        ...x,
        { role: "bot", text: data.reply ?? T.error[lang] },
      ]);
      if (data.blocked) setBlocked(true);
    } catch {
      setMsgs((x) => [...x, { role: "bot", text: T.error[lang] }]);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`chat ${open ? "is-open" : ""}`}>
      {open && (
        <section
          className="chat-panel"
          role="dialog"
          aria-label={T.title[lang]}
        >
          <header className="chat-head">
            <img src="/characters/lobi.png" alt="" />
            <div>
              <b>{T.title[lang]}</b>
              {CHANNEL === "test" && <span className="chat-badge">TEST</span>}
            </div>
            <button
              className="chat-x"
              onClick={() => setOpen(false)}
              aria-label={T.close[lang]}
            >
              ✕
            </button>
          </header>
          {!started ? (
            <form
              className="chat-start"
              data-lenis-prevent
              onSubmit={(e) => {
                e.preventDefault();
                start();
              }}
              noValidate
            >
              <div className="chat-msg bot">{T.intro[lang]}</div>
              <label>
                <span>{T.name[lang]}</span>
                <input
                  ref={nameRef}
                  value={form.name}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      name: e.target.value.slice(0, 30),
                    }))
                  }
                  autoComplete="name"
                  maxLength={30}
                  required
                />
              </label>
              <label>
                <span>{T.email[lang]}</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      email: e.target.value.slice(0, 254),
                    }))
                  }
                  autoComplete="email"
                  inputMode="email"
                  maxLength={254}
                  required
                />
              </label>
              <label className="chat-consent">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  required
                />
                <span>{T.consent[lang]}</span>
              </label>
              <details className="chat-terms">
                <summary>{T.details[lang]}</summary>
                <dl>
                  {CONSENT_ITEMS[lang].map(([k, v]) => (
                    <div key={k}>
                      <dt>{k}</dt>
                      <dd>{v}</dd>
                    </div>
                  ))}
                </dl>
              </details>
              {formError && (
                <p className="chat-error" role="alert">
                  {formError}
                </p>
              )}
              <button type="submit" disabled={starting}>
                {starting ? T.starting[lang] : T.start[lang]}
              </button>
            </form>
          ) : (
            <>
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
                  e.preventDefault();
                  send(input);
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
                <button
                  type="submit"
                  disabled={!input.trim() || busy || blocked}
                >
                  {T.send[lang]}
                </button>
              </form>
              <p className="chat-note">
                {T.note[lang]}
                <span>
                  {input.length}/{maxLength}
                </span>
              </p>
            </>
          )}
        </section>
      )}
      <button
        className="chat-fab"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? T.close[lang] : T.open[lang]}
        aria-expanded={open}
      >
        {open ? (
          <span className="chat-fab-x">✕</span>
        ) : (
          <img src="/characters/lobi.png" alt="" />
        )}
      </button>
    </div>
  );
}

/** 답변 속 https 주소를 누를 수 있는 링크로 */
function linkify(text: string) {
  return text.split(/(https:\/\/[^\s)]+)/g).map((part, i) =>
    part.startsWith("https://") ? (
      <a key={i} href={part} target="_blank" rel="noreferrer">
        {part}
      </a>
    ) : (
      part
    ),
  );
}
