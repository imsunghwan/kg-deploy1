import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Block, Lines, Page } from '../components/Page'
import { Media } from '../components/Media'
import { useReveal } from '../components/useReveal'
import { SHOWCASE, type Work } from '../content'

const YEARS = Object.keys(SHOWCASE.years).map(Number).sort((a, b) => b - a)

export default function Showcase() {
  const params = useParams()
  const year = YEARS.includes(Number(params.year)) ? Number(params.year) : YEARS[0]
  const works = SHOWCASE.years[year]
  const [open, setOpen] = useState<Work | null>(null)

  useReveal([year])

  // 연도 링크로 들어왔으면 목록까지 스크롤
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!params.year) return
    // 페이지 진입 페이드가 시작된 뒤 스크롤
    const id = setTimeout(() => listRef.current?.scrollIntoView({ behavior: 'smooth' }), 250)
    return () => clearTimeout(id)
    // 첫 진입 때만
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Page>
      <Block className="!mt-[150px]">
        <h1 data-reveal="text" className="t-label">{SHOWCASE.label}</h1>
        <h2 data-reveal="text" className="t-display"><Lines lines={SHOWCASE.title} /></h2>
      </Block>

      <Block>
        <div ref={listRef} className="scroll-mt-10">
          <ul data-reveal="text" className="mb-14 flex justify-center gap-5 text-[20px] font-normal">
            {YEARS.map((y) => (
              <li key={y} className={`hover-underline ${y === year ? 'is-active' : 'text-white/60'}`}>
                <Link to={`/showcase/${y}`} preventScrollReset>{y}</Link>
              </li>
            ))}
          </ul>

          <div key={year} className={works.length === 1 ? 'mx-auto grid max-w-[620px]' : 'grid gap-x-10 gap-y-14 md:grid-cols-3'}>
            {works.map((w, i) => (
              <WorkCard key={`${year}-${w.title}`} work={w} index={i} onOpen={() => setOpen(w)} />
            ))}
          </div>
        </div>
      </Block>

      <WorkModal work={open} onClose={() => setOpen(null)} />
    </Page>
  )
}

function WorkCard({ work, index, onOpen }: { work: Work; index: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group block text-left"
      style={{ ['--reveal-delay' as string]: `${(index % 3) * 0.1}s` }}
    >
      {work.variants ? (
        <VariantStack work={work} />
      ) : (
      <div className="overflow-hidden">
        <Media
          src={work.image}
          alt={work.title}
          className={`w-full transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.035] ${
            work.icon
              ? 'aspect-square rounded-[28px] [&_img]:object-contain [&_img]:p-[12%] [&_img]:grayscale-0'
              : 'aspect-[7/8] [&_img]:transition-[filter] [&_img]:duration-700 group-hover:[&_img]:grayscale-0'
          }`}
        />
      </div>
      )}
      <div data-reveal="text" className={work.category ? 'mt-4 text-[12px] leading-[1.5]' : 'mt-6 text-center'}>
        {work.category && <div className="font-medium uppercase">{work.category}</div>}
        <div className={work.category ? 'text-white/70' : 'text-[20px] font-semibold tracking-[-0.01em] md:text-[24px]'}>{work.title}</div>
      </div>
    </button>
  )
}

// 시안 여러 개를 대표 시안이 맨 앞에 오도록 겹쳐 보여주고, 호버하면 펼칩니다.
const FAN = [
  { rest: 'translate-x-0 rotate-0', hover: 'group-hover:translate-x-0 group-hover:-translate-y-[3%]' },
  { rest: '-translate-x-[24%] -rotate-[9deg] scale-[0.86]', hover: 'group-hover:-translate-x-[52%] group-hover:-rotate-[12deg]' },
  { rest: 'translate-x-[24%] rotate-[9deg] scale-[0.86]', hover: 'group-hover:translate-x-[52%] group-hover:rotate-[12deg]' },
]

function VariantStack({ work }: { work: Work }) {
  const variants = work.variants ?? []
  return (
    <div
      data-reveal="media"
      className="media relative flex aspect-[4/3] items-center justify-center overflow-hidden rounded-[28px]"
    >
      {/* 대표 시안을 마지막에 그려 맨 위에 오게 함 */}
      {variants
        .map((v, i) => ({ v, i }))
        .reverse()
        .map(({ v, i }) => (
          <img
            key={v.label}
            src={v.image}
            alt={`${work.title} ${v.label}`}
            loading="lazy"
            className={`absolute w-[42%] !object-contain !grayscale-0 drop-shadow-[0_18px_30px_rgba(0,0,0,0.55)] transition-transform duration-700 ease-[var(--ease-out-quint)] ${FAN[i]?.rest ?? ''} ${FAN[i]?.hover ?? ''}`}
            style={{ height: 'auto' }}
          />
        ))}
    </div>
  )
}

function WorkModal({ work, onClose }: { work: Work | null; onClose: () => void }) {
  const cursorRef = useRef<HTMLDivElement>(null)
  const isOpen = work !== null
  // 닫히는 애니메이션 동안 내용 유지
  const [shown, setShown] = useState<Work | null>(null)
  useEffect(() => {
    if (work) setShown(work)
  }, [work])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  // "Close" 커서: 마우스를 부드럽게 따라감
  useEffect(() => {
    if (!isOpen) return
    const el = cursorRef.current!
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const target = { ...pos }
    let raf = 0
    const onMove = (e: PointerEvent) => {
      target.x = e.clientX
      target.y = e.clientY
    }
    const loop = () => {
      pos.x += (target.x - pos.x) * 0.18
      pos.y += (target.y - pos.y) * 0.18
      el.style.left = `${pos.x}px`
      el.style.top = `${pos.y}px`
      raf = requestAnimationFrame(loop)
    }
    window.addEventListener('pointermove', onMove)
    loop()
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('pointermove', onMove)
    }
  }, [isOpen])

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-hidden={!isOpen}
      onClick={onClose}
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/90 transition-[opacity,visibility] duration-400 md:cursor-none ${
        isOpen ? 'visible opacity-100' : 'invisible opacity-0'
      }`}
    >
      {shown && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`${shown.variants ? 'w-[min(1100px,92vw)]' : shown.icon ? 'w-[min(560px,85vw,70vh)]' : 'w-[min(1100px,90vw)]'} cursor-auto transition-transform duration-700 ease-[var(--ease-out-quint)] ${
            isOpen ? 'translate-y-0 scale-100' : 'translate-y-6 scale-[0.97]'
          }`}
        >
          {shown.variants ? (
            <div className="grid grid-cols-3 gap-3 md:gap-6">
              {shown.variants.map((v) => (
                <figure key={v.label}>
                  <img src={v.image} alt={`${shown.title} ${v.label}`} className="aspect-square w-full object-contain" />
                </figure>
              ))}
            </div>
          ) : (
            <Media
              src={shown.image}
              alt={shown.title}
              reveal={false}
              className={`w-full [&_img]:grayscale-0 ${shown.icon ? 'aspect-square rounded-[28px] [&_img]:object-contain [&_img]:p-[10%]' : 'aspect-video'}`}
            />
          )}
          <div className="mt-4 flex justify-between text-[12px]">
            {shown.category ? (
              <>
                <div className="font-medium uppercase">{shown.category}</div>
                <a href={shown.link} className="hover-underline">{shown.title}</a>
              </>
            ) : (
              <div className="font-medium uppercase">{shown.title}</div>
            )}
          </div>
        </div>
      )}
      <div
        ref={cursorRef}
        aria-hidden="true"
        className={`pointer-events-none fixed hidden h-[60px] w-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/70 text-[10px] uppercase transition-[opacity,scale] duration-300 md:flex ${
          isOpen ? 'scale-100 opacity-100' : 'scale-[0.85] opacity-0'
        }`}
      >
        Close
      </div>
    </div>
  )
}
