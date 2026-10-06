import { Link } from 'react-router-dom'
import { BRAND } from '../content'

// 첫 글자는 흰색, 나머지는 회색인 2톤 워드마크
export function Logo() {
  const [first, ...rest] = BRAND.mark
  return (
    <Link to="/" aria-label="Home" className="text-[15px] font-bold tracking-[-0.02em] leading-none">
      <span className="text-white">{first}</span>
      <span className="text-[#7d7d7d]">{rest.join('')}</span>
    </Link>
  )
}

export function Header() {
  return (
    <header className="relative z-20 my-[50px] flex justify-center">
      <Logo />
    </header>
  )
}
