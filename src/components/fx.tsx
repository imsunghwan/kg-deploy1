import { useEffect, useRef, useState, type PointerEvent } from 'react'

// 화면에 들어오면 true (한 번만)
export function useInView<T extends Element>(threshold = 0.3) {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {
        setInView(true)
        io.disconnect()
      }
    }, { threshold })
    io.observe(el)
    return () => io.disconnect()
  }, [threshold])
  return [ref, inView] as const
}

// '[N]+', '12k' 같은 값에서 숫자 부분만 0부터 세어 올라갑니다. 숫자가 없으면 그대로 표시.
export function CountUp({ value, className = '' }: { value: string; className?: string }) {
  const [ref, inView] = useInView<HTMLSpanElement>()
  const match = value.match(/^(\D*)(\d+(?:\.\d+)?)(.*)$/)
  const target = match ? parseFloat(match[2]) : 0
  const [n, setN] = useState(0)

  useEffect(() => {
    if (!inView || !match) return
    const start = performance.now()
    let raf = 0
    const step = (now: number) => {
      const t = Math.min((now - start) / 1400, 1)
      setN(target * (1 - Math.pow(1 - t, 4)))
      if (t < 1) raf = requestAnimationFrame(step)
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [inView, target]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!match) return <span ref={ref} className={className}>{value}</span>
  const decimals = match[2].includes('.') ? 1 : 0
  return (
    <span ref={ref} className={className}>
      {match[1]}
      {n.toFixed(decimals)}
      {match[3]}
    </span>
  )
}

// 화면에 들어오면 줄 단위로 타이핑
export function Typewriter({ lines, className = '' }: { lines: string[]; className?: string }) {
  const [ref, inView] = useInView<HTMLDivElement>(0.4)
  const [chars, setChars] = useState(0)
  const total = lines.reduce((a, l) => a + l.length + 1, 0)

  useEffect(() => {
    if (!inView || chars >= total) return
    const id = setTimeout(() => setChars((c) => c + 1), lines.join('\n')[chars] === '\n' ? 380 : 28)
    return () => clearTimeout(id)
  }, [inView, chars, total, lines])

  let left = chars
  return (
    <div ref={ref} className={className}>
      {lines.map((line, i) => {
        const shown = line.slice(0, Math.max(0, left))
        const active = left >= 0 && left <= line.length
        left -= line.length + 1
        if (!shown && !active) return null
        return (
          <div key={i} className={line.startsWith('✓') ? 'text-[#3ddc84]' : ''}>
            {shown}
            {active && <span className="caret" />}
          </div>
        )
      })}
    </div>
  )
}

// 벤토 카드의 마우스 스포트라이트 좌표
export function spotlight(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', `${e.clientX - r.left}px`)
  el.style.setProperty('--my', `${e.clientY - r.top}px`)
}
