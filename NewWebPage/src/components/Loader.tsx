import { useEffect, useState } from 'react'

/** EDOLUS 식 로딩 화면: 타이틀 로고 + 굴러가는 퍼센트 숫자, 끝나면 위아래로 열림 */
export function Loader({
  progress,
  done,
  label,
  logo,
  onGone,
}: {
  progress: number
  done: boolean
  label: string
  logo: { src: string; alt: string }
  onGone: () => void
}) {
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    if (!done) return
    const a = setTimeout(() => setLeaving(true), 500)
    const b = setTimeout(onGone, 1900)
    return () => {
      clearTimeout(a)
      clearTimeout(b)
    }
  }, [done, onGone])

  const pct = Math.round(progress * 100)
  const digits = String(pct).split('')
  return (
    <div className={`loader ${leaving ? 'is-leaving' : ''}`} aria-busy={!done} aria-label={`${label} ${pct}%`}>
      <div className="loader-band loader-band--top" />
      <div className="loader-band loader-band--bottom" />
      <div className="loader-center">
        <img className="loader-mark" src={logo.src} alt={logo.alt} />
        <div className="loader-pct" aria-hidden>
          {digits.map((d, i) => (
            <span className="roll" key={digits.length - i}>
              <span className="roll-strip" style={{ transform: `translateY(${-Number(d) * 10}%)` }}>
                {'0123456789'.split('').map((n) => (
                  <span key={n}>{n}</span>
                ))}
              </span>
            </span>
          ))}
          <span className="roll-pct">%</span>
        </div>
        <p className="loader-label">{label}</p>
      </div>
    </div>
  )
}
