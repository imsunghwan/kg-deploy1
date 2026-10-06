import { useState } from 'react'
import { COCOBI } from '../content'

type Props = {
  name: keyof typeof COCOBI
  className?: string
  /** 슬롯 안내 문구를 숨기고 빈 박스만 보여줄지 */
  compact?: boolean
}

// 공식 코코비 이미지가 public/cocobi/ 에 있으면 표시하고, 없으면 어떤 이미지를 넣어야 하는지 안내합니다.
export function CharacterSlot({ name, className = '', compact = false }: Props) {
  const { src, hint } = COCOBI[name]
  const [missing, setMissing] = useState(false)

  if (missing) {
    return (
      <div className={`char-slot char-slot--empty ${className}`}>
        {!compact && (
          <div className="px-5 text-center text-[12px] leading-relaxed text-white/45">
            <div className="mb-1 font-medium text-white/70">코코비 공식 이미지</div>
            {hint}
            <div className="mt-2 font-mono text-[11px] text-white/35">public{src}</div>
          </div>
        )}
      </div>
    )
  }
  return (
    <div className={`char-slot ${className}`}>
      <img src={src} alt="" onError={() => setMissing(true)} />
    </div>
  )
}
