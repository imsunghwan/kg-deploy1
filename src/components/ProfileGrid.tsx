import { useEffect, useState, type ReactNode } from 'react'
import { CharacterSlot } from './CharacterSlot'
import { CountUp, spotlight } from './fx'
import { PROFILE } from '../content'

function Card({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <section
      data-reveal="media"
      onPointerMove={spotlight}
      className={`bento ${className}`}
      style={{ ['--reveal-delay' as string]: `${delay}s` }}
    >
      {children}
    </section>
  )
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <div className="mb-4 text-[12px] uppercase tracking-[0.08em] text-white/40">{children}</div>
}

function SeoulClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  const time = now.toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })
  return <span className="font-mono tabular-nums">{time}</span>
}

// 자기소개 프로필 영역. PROFILE 에서 비어 있는 항목의 카드는 그리지 않습니다.
export function ProfileGrid() {
  const P = PROFILE
  const hasOthers = Boolean(
    P.oneLiner || P.stats.length || P.stack.length || P.location || P.now.length ||
    P.career.length || P.links.length,
  )
  const hasRest = hasOthers || P.funFacts.length > 0
  // 프로필 옆에 Fun facts 만 있을 때는 두 카드를 나란히 크게 배치
  const funOnly = !hasOthers && P.funFacts.length > 0

  return (
    <div className="mx-auto max-w-[1280px]">
        <div
          className={
            hasRest
              ? 'grid auto-rows-[minmax(150px,auto)] grid-cols-1 gap-4 md:grid-cols-12'
              : 'mx-auto grid max-w-[520px] grid-cols-1'
          }
        >
          {/* 프로필 */}
          <Card className={`flex flex-col ${hasRest ? 'md:col-span-5 md:row-span-3' : 'min-h-[560px]'}`}>
            {P.status && (
              <div className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-[12px] text-white/75">
                <span className="pulse-dot" />
                {P.status}
              </div>
            )}
            <div className="my-6 flex flex-1 items-center justify-center">
              {PROFILE.photo ? (
                <img src={PROFILE.photo} alt={PROFILE.name} className="aspect-square w-[min(280px,70%)] rounded-full object-cover" />
              ) : (
                <CharacterSlot name="avatar" className="aspect-[256/301] w-[min(256px,70%)] drop-shadow-[0_16px_28px_rgba(0,0,0,0.45)]" />
              )}
            </div>
            <div className="text-[13px] text-white/45">{PROFILE.team}</div>
            <h1 className="mt-1 text-[clamp(36px,4.4vw,56px)] font-semibold leading-[1.05] tracking-[-0.03em]">{PROFILE.name}</h1>
            <div className="mt-2 text-[16px] text-white/60">{[P.nameEn, P.role].filter(Boolean).join(' · ')}</div>
          </Card>

          {/* 한 줄 소개 */}
          {P.oneLiner && (
          <Card className="flex items-end md:col-span-7 md:row-span-2" delay={0.06}>
            <p className="text-[clamp(26px,3.2vw,46px)] font-medium leading-[1.2] tracking-[-0.02em]">{PROFILE.oneLiner}</p>
          </Card>
          )}

          {/* 숫자 */}
          {P.stats.length > 0 && (
          <Card className="md:col-span-7" delay={0.12}>
            <div className="grid h-full grid-cols-3 items-end gap-4">
              {PROFILE.stats.map((s) => (
                <div key={s.label}>
                  <CountUp value={s.value} className="block text-[clamp(32px,3.6vw,52px)] font-semibold leading-none tracking-[-0.03em]" />
                  <div className="mt-2 text-[13px] text-white/50">{s.label}</div>
                </div>
              ))}
            </div>
          </Card>
          )}

          {/* 기술 스택 */}
          {P.stack.length > 0 && (
          <Card className="flex flex-col justify-between !px-0 md:col-span-7" delay={0.05}>
            <div className="px-7"><Eyebrow>Stack</Eyebrow></div>
            <div className="marquee">
              {[0, 1].map((k) => (
                <div key={k} className="marquee__track" aria-hidden={k === 1}>
                  {PROFILE.stack.map((t) => (
                    <span key={t} className="whitespace-nowrap rounded-full border border-white/12 bg-white/[0.03] px-4 py-2 text-[15px]">{t}</span>
                  ))}
                </div>
              ))}
            </div>
          </Card>
          )}

          {/* 위치·시간 */}
          {P.location && (
          <Card className="flex flex-col justify-between md:col-span-5" delay={0.1}>
            <Eyebrow>Based in</Eyebrow>
            <div className="flex items-end justify-between">
              <div className="text-[28px] font-semibold tracking-[-0.02em]">{PROFILE.location}</div>
              <div className="text-[20px] text-white/70"><SeoulClock /></div>
            </div>
          </Card>
          )}

          {/* 지금 하는 것 */}
          {P.now.length > 0 && (
          <Card className="md:col-span-4" delay={0.05}>
            <Eyebrow>Now</Eyebrow>
            <dl className="flex flex-col gap-3">
              {PROFILE.now.map((n) => (
                <div key={n.label} className="flex justify-between gap-4 border-b border-white/[0.06] pb-3 last:border-0">
                  <dt className="text-[14px] text-white/45">{n.label}</dt>
                  <dd className="text-right text-[15px]">{n.value}</dd>
                </div>
              ))}
            </dl>
          </Card>
          )}

          {/* 커리어 */}
          {P.career.length > 0 && (
          <Card className="md:col-span-5" delay={0.1}>
            <Eyebrow>Career</Eyebrow>
            <ol className="relative flex flex-col gap-5 border-l border-white/10 pl-5">
              {PROFILE.career.map((c, i) => (
                <li key={i} className="relative">
                  <span className={`absolute -left-[25px] top-1.5 h-2 w-2 rounded-full ${i === 0 ? 'bg-white' : 'bg-white/25'}`} />
                  <div className="text-[12px] text-white/40">{c.period}</div>
                  <div className="text-[16px] font-medium">{c.title}</div>
                  <div className="text-[14px] text-white/55">{c.place}</div>
                </li>
              ))}
            </ol>
          </Card>
          )}

          {/* 링크 */}
          {P.links.length > 0 && (
          <Card className="flex flex-col md:col-span-3" delay={0.15}>
            <Eyebrow>Links</Eyebrow>
            <ul className="mt-auto flex flex-col">
              {PROFILE.links.map((l) => (
                <li key={l.label}>
                  <a href={l.href} className="group flex items-center justify-between border-b border-white/[0.06] py-3 text-[18px] last:border-0">
                    {l.label}
                    <span className="text-white/40 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-white">↗</span>
                  </a>
                </li>
              ))}
            </ul>
          </Card>
          )}

          {/* 재미있는 사실 */}
          {P.funFacts.length > 0 && (
          funOnly ? (
            <Card className="flex flex-col md:col-span-7 md:row-span-3" delay={0.08}>
              <Eyebrow>Fun facts</Eyebrow>
              <ul className="my-auto flex flex-col items-center gap-3 py-6 text-center">
                {P.funFacts.map((f) => (
                  <li key={f} className="text-[clamp(26px,3vw,40px)] font-semibold leading-[1.2] tracking-[-0.02em]">“{f}”</li>
                ))}
              </ul>
              {/* 위쪽 라벨과 같은 높이의 빈 공간 → 문구가 카드 정중앙에 오도록 */}
              <div aria-hidden="true" className="invisible">
                <Eyebrow>Fun facts</Eyebrow>
              </div>
            </Card>
          ) : (
          <Card className="md:col-span-12" delay={0.05}>
            <div>
              <Eyebrow>Fun facts</Eyebrow>
              <ul className="flex flex-wrap gap-2">
                {PROFILE.funFacts.map((f) => (
                  <li key={f} className="rounded-full bg-white/[0.06] px-4 py-2 text-[15px]">{f}</li>
                ))}
              </ul>
            </div>
          </Card>
          )
          )}
        </div>
    </div>
  )
}
