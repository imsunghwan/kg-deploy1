import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import Lenis from 'lenis'
import { Choreo } from './choreo'
import { CharacterModal } from './components/CharacterModal'
import { Loader } from './components/Loader'
import { byId, chapters, characters, copy, family, friends, places, siblings, type Lang } from './content'
import { T, TOTAL, easeInOut, iris, whiteVeil } from './timeline'
import { Constellations } from './fx/Constellations'
import { loadImages } from './three/textures'
import { FLOWERS } from './three/VillageStage'
import { World } from './three/World'

const BRAND = ['/brand/hello-cocobi-lg@3x.webp', '/brand/ko-main_characters_logo@3x.webp', ...FLOWERS]
/** 원본 사이트처럼 한국어일 때는 '꼬마공룡 코코비', 영어일 때는 'Hello Cocobi' 로고 */
// 원본 PNG(280px·396px)를 3배로 키우고 경계만 선명하게 보정한 WebP. 원본은 같은 폴더에 보관
const LOGO = {
  ko: { src: '/brand/ko-main_characters_logo@3x.webp', alt: '꼬마공룡 코코비' },
  en: { src: '/brand/hello-cocobi-lg@3x.webp', alt: 'Hello Cocobi' },
}
const LINKS = [
  { label: 'YouTube', href: 'https://www.youtube.com/channel/UC2fWLJgQUxRg-5Mv5A0cJMg' },
  { label: 'Instagram', href: 'https://www.instagram.com/cocobi_official' },
  { label: 'Spotify', href: 'https://open.spotify.com/artist/3Q6e77Xm6RlpD4lnlk9Zim' },
  { label: 'Apps', href: 'https://kigle.co.kr/bbs/board.php?bo_table=apps' },
]

export default function App() {
  // 고른 언어를 기억해서 새로고침(로고 클릭) 후에도 같은 언어의 로딩 화면이 나오도록
  const [lang, setLang] = useState<Lang>(() => {
    try {
      return localStorage.getItem('cocobi-lang') === 'en' ? 'en' : 'ko'
    } catch {
      return 'ko'
    }
  })
  const [progress, setProgress] = useState(0)
  const [ready, setReady] = useState(false)
  const [loaderGone, setLoaderGone] = useState(false)
  const [started, setStarted] = useState(false)
  const [modal, setModal] = useState<string | null>(null)
  const [focusId, setFocusId] = useState(friends[0].id)

  const choreo = useMemo(() => new Choreo(), [])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const worldRef = useRef<World | null>(null)
  const lenisRef = useRef<Lenis | null>(null)
  const spacerRef = useRef<HTMLDivElement>(null)
  const whiteRef = useRef<HTMLDivElement>(null)
  const irisRef = useRef<HTMLDivElement>(null)
  const skyRef = useRef<HTMLCanvasElement>(null)
  const skyFx = useRef<Constellations | null>(null)
  const chapterRef = useRef<HTMLSpanElement>(null)
  const railRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const langRef = useRef(lang)
  const focusRef = useRef(focusId)
  const startedRef = useRef(false)
  const labelEls = useRef(new Map<string, HTMLElement>())

  langRef.current = lang
  useEffect(() => {
    document.documentElement.lang = lang
    try {
      localStorage.setItem('cocobi-lang', lang)
    } catch {
      // 사생활 보호 모드 등에서 저장이 막혀도 동작에는 영향 없음
    }
    worldRef.current?.setLang(lang)
  }, [lang])

  // 3D 라벨(가족 이름표, 섬 핀)을 World 에 연결
  const bind = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) labelEls.current.set(key, el)
      else labelEls.current.delete(key)
      worldRef.current?.bindLabel(key, el)
    },
    [],
  )

  // 이미지·폰트 로딩 → World 생성
  useEffect(() => {
    history.scrollRestoration = 'manual'
    scrollTo(0, 0)
    let disposed = false
    const urls = [...new Set([...characters.flatMap((c) => (c.scene ? [c.portrait, c.scene] : [c.portrait])), ...BRAND])]
    const fonts = Promise.all([
      document.fonts.load('600 54px "Fredoka"'),
      document.fonts.load('32px "Jua"', '가'),
    ]).catch(() => undefined)
    Promise.all([loadImages(urls, (p) => !disposed && setProgress(p * 0.9)), fonts]).then(([images]) => {
      if (disposed || !canvasRef.current) return
      const world = new World(canvasRef.current, images)
      world.resize(innerWidth, innerHeight)
      for (const [k, el] of labelEls.current) world.bindLabel(k, el)
      world.setLang(langRef.current)
      world.warmup()
      worldRef.current = world
      if (skyRef.current) {
        skyFx.current = new Constellations(skyRef.current, images)
        skyFx.current.resize(innerWidth, innerHeight)
      }
      setProgress(1)
      setReady(true)
    })
    return () => {
      disposed = true
      worldRef.current?.dispose()
      worldRef.current = null
    }
  }, [])

  // 부드러운 스크롤 + 매 프레임 갱신 루프
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.85, touchMultiplier: 1.4 })
    lenisRef.current = lenis
    lenis.stop()
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop)
      lenis.raf(now)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const vh = innerHeight
      const s = lenis.scroll / vh
      choreo.update(s)

      if (whiteRef.current) whiteRef.current.style.opacity = whiteVeil(s).toFixed(3)

      const world = worldRef.current
      if (world) {
        world.update(s, now / 1000, dt)
        skyFx.current?.update(now)
        // 친구들 → 엔딩 아이리스 전환 (원 바깥을 검게, 테두리는 코코비 노랑)
        const ir = irisRef.current
        const open = iris(s)
        if (ir) {
          if (open >= 0.999) {
            ir.style.visibility = 'hidden'
          } else {
            const c = world.irisCenter()
            const max = Math.hypot(Math.max(c.x, innerWidth - c.x), Math.max(c.y, innerHeight - c.y)) + 12
            const R = open * max
            const ring = R > 3 ? 7 : 0
            ir.style.visibility = 'visible'
            ir.style.background = `radial-gradient(circle at ${c.x.toFixed(1)}px ${c.y.toFixed(1)}px, transparent ${R.toFixed(1)}px, #ffd84a ${R.toFixed(1)}px, #ffd84a ${(R + ring).toFixed(1)}px, #000 ${(R + ring).toFixed(1)}px)`
          }
        }
        const f = world.village.focus
        if (f.id && f.id !== focusRef.current) {
          focusRef.current = f.id
          setFocusId(f.id)
        }
        if (panelRef.current) {
          const a = world.active === world.village ? f.alpha : 0
          panelRef.current.style.opacity = a.toFixed(3)
          panelRef.current.style.visibility = a > 0.02 ? 'visible' : 'hidden'
        }
      }

      if (railRef.current) railRef.current.style.transform = `scaleY(${(s / TOTAL).toFixed(4)})`
      if (chapterRef.current) {
        let idx = 0
        chapters.forEach((c, i) => {
          if (s + 0.6 >= c.at) idx = i
        })
        const txt = !startedRef.current
          ? ''
          : s < 1.3
            ? copy.scroll[langRef.current]
            : `${String(idx + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')} — ${chapters[idx].label[langRef.current]}`
        if (chapterRef.current.textContent !== txt) chapterRef.current.textContent = txt
      }
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      lenis.destroy()
    }
  }, [choreo])

  // 크기 변경
  useEffect(() => {
    const onResize = () => {
      if (spacerRef.current) spacerRef.current.style.height = `${(TOTAL + 1) * innerHeight}px`
      worldRef.current?.resize(innerWidth, innerHeight)
      skyFx.current?.resize(innerWidth, innerHeight)
    }
    onResize()
    addEventListener('resize', onResize)
    return () => removeEventListener('resize', onResize)
  }, [ready])

  // 포인터: 시차 효과 + 캐릭터 호버/클릭
  useEffect(() => {
    const canvas = canvasRef.current!
    let hoverT = 0
    const onMove = (e: PointerEvent) => {
      worldRef.current?.setPointer(e.clientX, e.clientY)
      if (e.target !== canvas || performance.now() - hoverT < 60) return
      hoverT = performance.now()
      canvas.style.cursor = worldRef.current?.pick(e.clientX, e.clientY) ? 'pointer' : ''
    }
    const onClick = (e: MouseEvent) => {
      const id = worldRef.current?.pick(e.clientX, e.clientY)
      if (id) return setModal(id)
      // 엔딩 우주 배경을 누르면 그 자리에 캐릭터 별자리가 떠오름
      const s = (lenisRef.current?.scroll ?? 0) / innerHeight
      if (s >= T.end[0] + 0.15) skyFx.current?.spawn(e.clientX, e.clientY, langRef.current)
    }
    addEventListener('pointermove', onMove)
    canvas.addEventListener('click', onClick)
    return () => {
      removeEventListener('pointermove', onMove)
      canvas.removeEventListener('click', onClick)
    }
  }, [])

  // 모달이 열려 있는 동안 스크롤 정지
  useEffect(() => {
    const lenis = lenisRef.current
    if (!lenis || !startedRef.current) return
    if (modal) lenis.stop()
    else lenis.start()
  }, [modal])


  const start = () => {
    if (startedRef.current) return
    startedRef.current = true
    setStarted(true)
    const lenis = lenisRef.current!
    lenis.start()
    lenis.scrollTo(innerHeight * 1.65, { duration: 3.4, easing: easeInOut })
  }
  const goto = (at: number) => {
    if (!startedRef.current) start()
    lenisRef.current?.scrollTo(at * innerHeight, { duration: 2.2, easing: easeInOut })
  }
  const open = (id: string) => setModal(id)
  const onLoaderGone = useCallback(() => setLoaderGone(true), [])
  const L = (t: { ko: string; en: string }) => t[lang]
  const lines = (t: string) => t.split('\n').map((l, i) => <span key={i}>{l}</span>)
  const focus = byId[focusId]
  const focusIdx = friends.indexOf(focus)

  return (
    <>
      <canvas ref={canvasRef} className="gl" />
      <canvas ref={skyRef} className="sky-fx" aria-hidden />
      <div ref={spacerRef} className="spacer" />

      <div className="ui">
        {/* 상단 HUD */}
        <header className={`hud ${loaderGone ? 'is-in' : ''}`}>
          <span ref={chapterRef} className="hud-left mono" />
          {/* 되감기 대신 페이지를 새로 불러와 로딩 화면부터 다시 시작 */}
          <a className="hud-logo" href={import.meta.env.BASE_URL} aria-label="COCOBI — 처음으로">
            <img src={LOGO[lang].src} alt={LOGO[lang].alt} />
          </a>
          <div className="hud-right mono">
            <button className={lang === 'ko' ? 'is-on' : ''} onClick={() => setLang('ko')}>
              KR
            </button>
            <span>/</span>
            <button className={lang === 'en' ? 'is-on' : ''} onClick={() => setLang('en')}>
              EN
            </button>
          </div>
        </header>

        {/* 오른쪽 진행 레일 */}
        <nav className={`rail ${started ? 'is-in' : ''}`} aria-label="chapters">
          <div className="rail-line">
            <div ref={railRef} className="rail-fill" />
          </div>
          {chapters.map((c) => (
            <button key={c.id} className="rail-dot" style={{ top: `${(c.at / TOTAL) * 100}%` }} onClick={() => goto(c.at)}>
              <span className="mono">{L(c.label)}</span>
            </button>
          ))}
        </nav>

        {/* 00 히어로 */}
        <section className={`hero ${loaderGone ? 'is-in' : ''} ${started ? 'is-started' : ''}`} ref={choreo.at([-1, -0.5, 0.1, 0.55], { y: -40 })}>
          <h1 className="hero-title">{lines(L(copy.heroTitle))}</h1>
          <p className="hero-sub mono">{L(copy.heroSub)}</p>
          <button className="cta mono" onClick={start}>
            <i />
            <i />
            <i />
            <i />
            {L(copy.heroCta)}
          </button>
          <p className="hero-hint mono">
            <span className="mouse" aria-hidden />
            {L(copy.heroHint)}
          </p>
        </section>

        {/* 01 HELLO COCOBI */}
        <section className="chapter chapter--bl">
          <h2 className="display" ref={choreo.at([1.3, 1.7, 2.55, 2.95], { y: 70, blur: true })}>
            {lines(L(copy.helloTitle))}
          </h2>
          <p className="typed mono" data-text={L(copy.helloSub)} ref={choreo.at([1.45, 2.0, 2.55, 2.95], { type: true })} />
        </section>

        {/* 02 가족 별자리 */}
        <section className="chapter chapter--tl">
          <h2 className="display display--md" ref={choreo.at([3.55, 3.95, 5.2, 5.5], { y: 70, blur: true })}>
            {lines(L(copy.familyTitle))}
          </h2>
          <p className="typed mono" data-text={L(copy.familySub)} ref={choreo.at([3.7, 4.2, 5.2, 5.5], { type: true })} />
        </section>
        {[...siblings, ...family].map((ch) => (
          <div key={ch.id} className="anchor" ref={bind(`fam-${ch.id}`)}>
            <button className="node-label" onClick={() => open(ch.id)}>
              <span className="node-name">{ch.name[lang]}</span>
              <span className="mono">{ch.role[lang]}</span>
            </button>
          </div>
        ))}

        {/* 03 공룡섬 */}
        <div className="frame" ref={choreo.at([7.2, 7.6, 9.05, 9.3])}>
          <i className="c tl" />
          <i className="c tr" />
          <i className="c bl" />
          <i className="c br" />
          <i className="tick l" />
          <i className="tick r" />
          <i className="cross" />
          <h2 className="display frame-title">{L(copy.islandTitle)}</h2>
          <p className="frame-read mono">{L(copy.islandHud)}</p>
          <p className="frame-sub mono">{L(copy.islandSub)}</p>
        </div>
        {places.map((p) => (
          <div key={p.id} className="anchor" ref={bind(`place-${p.id}`)}>
            <button className="pin" onClick={() => open(p.chars[0])}>
              <span className="pin-faces">
                {p.chars.map((id) => (
                  <img key={id} src={byId[id].portrait} alt="" style={{ background: byId[id].color }} />
                ))}
              </span>
              <span className="pin-label mono">{p[lang]}</span>
              <span className="pin-stem" />
            </button>
          </div>
        ))}

        {/* 04 DINO STREET */}
        <section className="chapter chapter--bl">
          <div className="scrim" ref={choreo.at([9.6, 9.95, 14.55, 14.8])} />
          <h2 className="display" ref={choreo.at([9.65, 9.95, 14.55, 14.8], { y: 60, blur: true })}>
            {L(copy.friendsTitle)}
          </h2>
          <p className="typed mono" data-text={L(copy.friendsSub)} ref={choreo.at([9.75, 10.2, 14.55, 14.8], { type: true })} />
        </section>
        <aside className={`spec-panel ${focusIdx % 2 ? 'is-left' : ''}`} ref={panelRef}>
          <div key={focusId} className="spec-inner" style={{ '--accent': focus.color } as React.CSSProperties}>
            <p className="mono eyebrow">
              F-{String(focusIdx + 1).padStart(2, '0')} · {focus.role[lang]}
            </p>
            <h3 className="spec-name">{focus.name[lang]}</h3>
            <dl className="spec mono">
              <div>
                <dt>{copy.species[lang]}</dt>
                <dd>{focus.species[lang]}</dd>
              </div>
              <div>
                <dt>{copy.age[lang]}</dt>
                <dd>
                  {focus.age}
                  {copy.years[lang]}
                </dd>
              </div>
              <div>
                <dt>{copy.power[lang]}</dt>
                <dd>{focus.trait[lang]}</dd>
              </div>
            </dl>
            <button className="btn-ghost mono" onClick={() => open(focusId)}>
              {L(copy.meet)} →
            </button>
          </div>
        </aside>


        {/* 06 엔딩 */}
        <section className="end">
          <p className="end-line" ref={choreo.at([15.2, 15.55, 16.05, 16.3], { blur: true })}>
            {L(copy.end1)}
          </p>
          <p className="end-line" ref={choreo.at([16.1, 16.45, 16.9, 17.1], { blur: true })}>
            {L(copy.end2)}
          </p>
          <div className="end-final" ref={choreo.at([17.05, 17.45, 99, 100], { y: 40 })}>
            <img src={LOGO[lang].src} alt={LOGO[lang].alt} />
            <p className="end-cta">{L(copy.endCta)}</p>
            <nav className="end-links mono">
              {LINKS.map((l) => (
                <a key={l.label} href={l.href} target="_blank" rel="noreferrer">
                  {l.label} ↗
                </a>
              ))}
            </nav>
            <a className="end-mail mono" href="mailto:biz@kiglestudio.com">
              [ BIZ@KIGLESTUDIO.COM ]
            </a>
            <p className="end-copy mono">© Kigle. All rights reserved.</p>
            <p className="end-hint mono">{L(copy.skyHint)}</p>
          </div>
        </section>
      </div>

      <div ref={whiteRef} className="veil veil--white" />
      <div ref={irisRef} className="iris" />
      <div className="grain" aria-hidden />

      {!loaderGone && <Loader progress={progress} done={ready} label={L(copy.loading)} logo={LOGO[lang]} onGone={onLoaderGone} />}
      {modal && <CharacterModal id={modal} lang={lang} onClose={() => setModal(null)} onNav={setModal} />}
    </>
  )
}
