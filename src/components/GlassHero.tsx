import { useEffect, useRef, type PointerEvent } from 'react'
import type React from 'react'

// 컬러 빛을 덮는 유리 카드 + 그 위의 이미지. 카드 전체가 한 장의 유리라 외곽선은 하나만 보입니다.
type Props = {
  src: string
  alt: string
  /** 불투명한 배너 이미지: 카드를 이미지 비율로 맞추고 꽉 채움. ratio = 가로/세로 */
  fill?: { ratio: number }
}

export function GlassHero({ src, alt, fill }: Props) {
  const panelRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const subjectRef = useRef<HTMLElement>(null)

  // 스크롤 진행도에 따라 이미지 배율 0 → 1
  // 카드 윗변이 화면 아래에 닿을 때 0, 카드 중심이 화면 높이 60% 지점에 오면 1
  useEffect(() => {
    const stage = stageRef.current
    const subject = subjectRef.current
    if (!stage || !subject) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      subject.style.setProperty('--s', '1')
      return
    }
    let raf = 0
    const update = () => {
      raf = 0
      const r = stage.getBoundingClientRect()
      const vh = window.innerHeight
      const start = vh
      const end = vh * 0.6 - r.height / 2
      const t = Math.min(1, Math.max(0, (start - r.top) / (start - end)))
      const eased = 1 - Math.pow(1 - t, 3)
      subject.style.setProperty('--s', eased.toFixed(4))
    }
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [])

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - r.left) / r.width
    const y = (e.clientY - r.top) / r.height
    panelRef.current?.style.setProperty('--gx', `${x * 100}%`)
    panelRef.current?.style.setProperty('--gy', `${y * 100}%`)
  }

  // 배너 모드: 뒷배경 없이 배너(와 그 위의 반사광)만 스크롤에 맞춰 커짐
  if (fill) {
    return (
      <div
        ref={stageRef}
        data-reveal="media"
        className="relative w-full"
        style={{ aspectRatio: String(fill.ratio) }}
      >
        <div ref={subjectRef as React.Ref<HTMLDivElement>} className="glass-subject glass-subject--fill absolute inset-0 overflow-hidden rounded-[18px] md:rounded-[28px]">
          <img src={src} alt={alt} className="block h-full w-full object-cover" />
          <div className="glass-gloss pointer-events-none absolute inset-0">
            <span className="glass-panel__sheen" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={stageRef}
      data-reveal="media"
      onPointerMove={onMove}
      className="glass-stage relative aspect-[16/8] w-full overflow-hidden rounded-[28px] md:aspect-[16/7]"
    >
      {/* 유리 뒤에서 떠다니는 컬러 빛 */}
      <span className="glass-blob glass-blob--yellow" />
      <span className="glass-blob glass-blob--pink" />
      <span className="glass-blob glass-blob--mint" />
      <span className="glass-blob glass-blob--violet" />

      <div ref={panelRef} className="glass-panel absolute inset-0">
        <span className="glass-panel__sheen" />
      </div>

      <img
        ref={subjectRef as React.Ref<HTMLImageElement>}
        src={src}
        alt={alt}
        className="glass-subject absolute inset-0 m-auto max-h-[86%] max-w-[min(900px,92%)] object-scale-down"
      />
    </div>
  )
}
