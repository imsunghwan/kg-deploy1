import { useState } from 'react'
import { Link } from 'react-router-dom'
import { StandeeScene } from '../components/StandeeScene'
import { Header } from '../components/Logo'
import { Footer } from '../components/Footer'
import { NAV } from '../content'

export default function Home() {
  const [hover, setHover] = useState<number | null>(null)

  return (
    <div className="relative flex h-svh flex-col overflow-hidden">
      <StandeeScene hoverAngle={hover === null ? null : NAV[hover].angle} />
      {/* 하단 방사형 조명 */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_38%_at_50%_100%,rgba(255,255,255,0.11),transparent_70%)]" />

      <div className="intro-up" style={{ ['--delay' as string]: '0.2s' }}>
        <Header />
      </div>

      <nav
        aria-label="Main"
        className="relative z-10 m-auto flex flex-col items-center gap-3 px-4 text-[20px] font-normal md:flex-row md:gap-[18px]"
        onMouseLeave={() => setHover(null)}
      >
        {NAV.map((item, i) => (
          <Link
            key={item.to}
            to={item.to}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
            className="intro-up transition-opacity duration-500"
            style={{
              ['--delay' as string]: `${0.5 + i * 0.08}s`,
              opacity: hover === null || hover === i ? 1 : 0.35,
            }}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="intro-up" style={{ ['--delay' as string]: '0.9s' }}>
        <Footer className="!my-[40px]" />
      </div>
    </div>
  )
}
