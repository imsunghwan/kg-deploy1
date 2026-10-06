import { BRAND } from '../content'

export function Footer({ className = '' }: { className?: string }) {
  return (
    <footer
      className={`relative z-20 mx-auto my-[50px] grid w-full grid-cols-[1fr_auto_1fr] items-end px-5 text-[12px] text-[#d9d9d9] ${className}`}
    >
      <span />
      <p className="text-center">{BRAND.tagline}</p>
      <div className="tooltip justify-self-end" tabIndex={0}>
        <span className="cursor-default">credits</span>
        <div className="tooltip__content">
          {BRAND.credits}
          <br />©{BRAND.year}
        </div>
      </div>
    </footer>
  )
}
