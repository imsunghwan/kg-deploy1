import { characters, type Lang } from '../content'
import type { Images } from '../three/textures'

/**
 * 엔딩 우주 배경을 누르면 그 자리에 코코비 캐릭터가 '별자리'로 떠오르는 2D 효과.
 * 캐릭터 그림의 윤곽선에서 별 위치를 뽑고, 별들을 최소 신장 트리(MST)로 이어 별자리 선을 만든다.
 * 뒤에는 캐릭터 그림을 성운처럼 반투명하게 깔아 누군지 알아볼 수 있게 한다.
 */

interface Shape {
  /** -0.5..0.5 정규화 좌표 */
  stars: [number, number][]
  /** 그려지는 순서대로의 선 (별 인덱스 쌍) */
  lines: [number, number][]
  ghost: HTMLCanvasElement
}

interface Item {
  id: string
  x: number
  y: number
  size: number
  born: number
  label: string
}

const STARS = 22
const DRAW_IN = 1100 // 선이 그어지는 시간(ms)
const HOLD = 2600
const FADE = 1200
const LIFE = DRAW_IN + HOLD + FADE

export class Constellations {
  private ctx: CanvasRenderingContext2D
  private items: Item[] = []
  private cache = new Map<string, Shape>()
  private last = ''
  private dirty = false
  private dpr = 1
  private w = 1
  private h = 1

  constructor(
    private canvas: HTMLCanvasElement,
    private images: Images,
  ) {
    this.ctx = canvas.getContext('2d')!
  }

  resize(w: number, h: number) {
    this.w = w
    this.h = h
    this.dpr = Math.min(devicePixelRatio, 2)
    this.canvas.width = Math.round(w * this.dpr)
    this.canvas.height = Math.round(h * this.dpr)
    this.dirty = true
  }

  spawn(x: number, y: number, lang: Lang) {
    // 바로 전과 다른 캐릭터를 무작위로
    const pool = characters.filter((c) => c.id !== this.last)
    const ch = pool[Math.floor(Math.random() * pool.length)]
    this.last = ch.id
    const size = Math.min(380, Math.max(220, Math.min(this.w, this.h) * 0.42))
    // 화면 밖으로 너무 나가지 않게
    const cx = Math.min(this.w - size * 0.35, Math.max(size * 0.35, x))
    const cy = Math.min(this.h - size * 0.4, Math.max(size * 0.35, y))
    this.items.push({
      id: ch.id,
      x: cx,
      y: cy,
      size,
      born: performance.now(),
      label: lang === 'ko' ? `${ch.name.ko}자리` : `${ch.name.en.toUpperCase()} CONSTELLATION`,
    })
    if (this.items.length > 6) this.items.shift()
  }

  update(now: number) {
    this.items = this.items.filter((it) => now - it.born < LIFE)
    if (!this.items.length && !this.dirty) return
    const g = this.ctx
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0)
    g.clearRect(0, 0, this.w, this.h)
    this.dirty = this.items.length > 0
    for (const it of this.items) this.draw(it, now)
  }

  private draw(it: Item, now: number) {
    const g = this.ctx
    const shape = this.shape(it.id)
    const age = now - it.born
    const fade = age > DRAW_IN + HOLD ? 1 - (age - DRAW_IN - HOLD) / FADE : 1
    const grow = Math.min(1, age / DRAW_IN)
    const P = (i: number): [number, number] => [it.x + shape.stars[i][0] * it.size, it.y + shape.stars[i][1] * it.size]

    // 성운처럼 은은한 캐릭터 그림
    g.save()
    g.globalCompositeOperation = 'screen'
    g.globalAlpha = 0.3 * Math.min(1, age / 700) * fade
    g.drawImage(shape.ghost, it.x - it.size / 2, it.y - it.size / 2, it.size, it.size)
    g.restore()

    // 별자리 선: 순서대로 하나씩 그어짐
    g.save()
    g.lineWidth = 1.2
    g.strokeStyle = `rgba(205, 228, 255, ${0.6 * fade})`
    g.shadowColor = 'rgba(150, 200, 255, 0.8)'
    g.shadowBlur = 6
    const n = shape.lines.length
    const drawn = grow * n
    for (let k = 0; k < n; k++) {
      const part = Math.min(1, drawn - k)
      if (part <= 0) break
      const [a, b] = shape.lines[k]
      const [ax, ay] = P(a)
      const [bx, by] = P(b)
      g.beginPath()
      g.moveTo(ax, ay)
      g.lineTo(ax + (bx - ax) * part, ay + (by - ay) * part)
      g.stroke()
    }
    g.restore()

    // 별: 선이 닿으면 나타나고 반짝임
    const shown = new Set<number>([shape.lines[0]?.[0] ?? 0])
    for (let k = 0; k < Math.floor(drawn); k++) shown.add(shape.lines[k][1])
    g.save()
    shape.stars.forEach((_, i) => {
      if (!shown.has(i)) return
      const [x, y] = P(i)
      const tw = 0.65 + 0.35 * Math.sin(now / 260 + i * 1.7)
      const r = (i % 5 === 0 ? 2.6 : 1.7) * tw
      const glow = g.createRadialGradient(x, y, 0, x, y, r * 4)
      glow.addColorStop(0, `rgba(255,255,255,${0.95 * fade})`)
      glow.addColorStop(0.35, `rgba(190,220,255,${0.5 * fade})`)
      glow.addColorStop(1, 'rgba(150,200,255,0)')
      g.fillStyle = glow
      g.beginPath()
      g.arc(x, y, r * 4, 0, Math.PI * 2)
      g.fill()
    })
    g.restore()

    // 별자리 이름
    if (age > DRAW_IN * 0.6) {
      g.save()
      g.globalAlpha = Math.min(1, (age - DRAW_IN * 0.6) / 500) * fade * 0.9
      g.fillStyle = '#e8f1ff'
      g.textAlign = 'center'
      g.font = '18px "Fredoka", "Jua", sans-serif'
      g.shadowColor = 'rgba(120, 180, 255, 0.9)'
      g.shadowBlur = 10
      g.fillText(`✦ ${it.label}`, it.x, it.y + it.size * 0.56)
      g.restore()
    }
  }

  /** 캐릭터 그림 → 별 위치·선·성운 그림 (한 번 계산 후 재사용) */
  private shape(id: string): Shape {
    const hit = this.cache.get(id)
    if (hit) return hit
    const ch = characters.find((c) => c.id === id)!
    const img = this.images[ch.portrait]
    const N = 96
    const c = document.createElement('canvas')
    c.width = c.height = N
    const g = c.getContext('2d', { willReadFrequently: true })!
    drawFit(g, img, N, ch.cutout)
    const { data } = g.getImageData(0, 0, N, N)
    const lum = new Float32Array(N * N)
    for (let i = 0; i < N * N; i++) {
      const a = data[i * 4 + 3] / 255
      lum[i] = (0.3 * data[i * 4] + 0.59 * data[i * 4 + 1] + 0.11 * data[i * 4 + 2]) * a
    }
    // 윤곽선 세기(Sobel) — 가장자리 사각 배경선이 잡히지 않도록 가운데 원 안만
    const cand: { x: number; y: number; m: number }[] = []
    for (let y = 1; y < N - 1; y++) {
      for (let x = 1; x < N - 1; x++) {
        const dx = x / N - 0.5
        const dy = y / N - 0.5
        if (dx * dx + dy * dy > 0.42 * 0.42) continue
        const L = (xx: number, yy: number) => lum[yy * N + xx]
        const gx = L(x + 1, y - 1) + 2 * L(x + 1, y) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x - 1, y) - L(x - 1, y + 1)
        const gy = L(x - 1, y + 1) + 2 * L(x, y + 1) + L(x + 1, y + 1) - L(x - 1, y - 1) - 2 * L(x, y - 1) - L(x + 1, y - 1)
        const m = Math.hypot(gx, gy)
        if (m > 80) cand.push({ x, y, m })
      }
    }
    cand.sort((a, b) => b.m - a.m)
    const pool = cand.slice(0, Math.max(60, Math.floor(cand.length * 0.35)))
    // 서로 멀리 떨어진 점 고르기(farthest point sampling) → 별이 고르게 퍼짐
    const picked: { x: number; y: number }[] = pool.length ? [pool[0]] : [{ x: N / 2, y: N / 2 }]
    while (picked.length < STARS && picked.length < pool.length) {
      let best = pool[0]
      let bestD = -1
      for (const p of pool) {
        let d = Infinity
        for (const q of picked) d = Math.min(d, (p.x - q.x) ** 2 + (p.y - q.y) ** 2)
        if (d > bestD) {
          bestD = d
          best = p
        }
      }
      picked.push(best)
    }
    const stars = picked.map((p) => [p.x / N - 0.5, p.y / N - 0.5] as [number, number])
    // 최소 신장 트리(Prim) → 별자리처럼 한 붓으로 이어진 선
    const inTree = new Set([0])
    const lines: [number, number][] = []
    while (inTree.size < stars.length) {
      let bi = -1
      let bj = -1
      let bd = Infinity
      for (const i of inTree) {
        for (let j = 0; j < stars.length; j++) {
          if (inTree.has(j)) continue
          const d = (stars[i][0] - stars[j][0]) ** 2 + (stars[i][1] - stars[j][1]) ** 2
          if (d < bd) {
            bd = d
            bi = i
            bj = j
          }
        }
      }
      inTree.add(bj)
      lines.push([bi, bj])
    }
    // 성운 그림: 가운데는 보이고 바깥으로 갈수록 사라지게
    const ghost = document.createElement('canvas')
    ghost.width = ghost.height = 256
    const gg = ghost.getContext('2d')!
    drawFit(gg, img, 256, ch.cutout)
    gg.globalCompositeOperation = 'destination-in'
    const mask = gg.createRadialGradient(128, 128, 30, 128, 128, 128)
    mask.addColorStop(0, 'rgba(0,0,0,1)')
    mask.addColorStop(0.6, 'rgba(0,0,0,0.7)')
    mask.addColorStop(1, 'rgba(0,0,0,0)')
    gg.fillStyle = mask
    gg.fillRect(0, 0, 256, 256)
    const shape = { stars, lines, ghost }
    this.cache.set(id, shape)
    return shape
  }
}

function drawFit(g: CanvasRenderingContext2D, img: HTMLImageElement, S: number, contain?: boolean) {
  const s = contain ? Math.min(S / img.width, S / img.height) : Math.max(S / img.width, S / img.height)
  const w = img.width * s
  const h = img.height * s
  g.drawImage(img, (S - w) / 2, (S - h) / 2, w, h)
}
