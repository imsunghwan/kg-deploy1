import { useState } from 'react'

type Props = {
  src: string
  alt: string
  className?: string
  drift?: boolean
  reveal?: boolean
}

// 이미지가 아직 생성되지 않았으면 그라디언트 플레이스홀더만 보입니다.
export function Media({ src, alt, className = '', drift = false, reveal = true }: Props) {
  const [failed, setFailed] = useState(false)
  return (
    <figure
      data-reveal={reveal ? 'media' : undefined}
      className={`media ${drift ? 'media--drift' : ''} ${className}`}
    >
      {!failed && <img src={src} alt={alt} loading="lazy" onError={() => setFailed(true)} />}
    </figure>
  )
}
