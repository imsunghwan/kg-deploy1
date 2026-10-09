import { clamp, win } from './timeline'

type Range = [number, number, number, number]
interface Spec {
  r: Range
  /** 나타날 때 아래에서 올라오는 거리(px) */
  y?: number
  /** 흐림에서 선명해지기 */
  blur?: boolean
  /** data-text 를 타자 치듯 표시 */
  type?: boolean
  last?: number
  lastText?: string
}

/**
 * 스크롤 위치에 맞춰 HTML 요소의 등장/퇴장을 매 프레임 갱신합니다.
 * React 재렌더 없이 style 만 바꿔서 부드럽게 동작합니다.
 */
export class Choreo {
  private items = new Map<HTMLElement, Spec>()

  /** <h2 ref={choreo.at([a,b,c,d], { y: 40 })}> */
  at(r: Range, o: Omit<Spec, 'r'> = {}) {
    let cur: HTMLElement | null = null
    return (el: HTMLElement | null) => {
      if (el) {
        cur = el
        this.items.set(el, { r, ...o })
      } else if (cur) {
        this.items.delete(cur)
        cur = null
      }
    }
  }

  update(s: number) {
    for (const [el, sp] of this.items) {
      const v = win(s, ...sp.r)
      const text = sp.type ? (el.dataset.text ?? '') : undefined
      if (v === sp.last && text === sp.lastText) continue
      sp.last = v
      sp.lastText = text
      el.style.opacity = v.toFixed(3)
      el.style.visibility = v > 0.001 ? 'visible' : 'hidden'
      const y = (1 - v) * (sp.y ?? 0)
      el.style.transform = y ? `translate3d(0, ${y.toFixed(1)}px, 0)` : ''
      if (sp.blur) el.style.filter = v < 0.999 ? `blur(${((1 - v) * 10).toFixed(1)}px)` : ''
      if (text !== undefined) {
        const n = Math.round(text.length * clamp(v * 1.25))
        el.textContent = text.slice(0, n) + (n < text.length && v > 0 ? '_' : '')
      }
    }
  }
}
