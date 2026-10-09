import * as THREE from 'three'
import type { Character, Lang } from '../content'

export type Images = Record<string, HTMLImageElement>

/** 이미지들을 미리 불러오고 진행률(0..1)을 알려줍니다. */
export function loadImages(urls: string[], onProgress: (p: number) => void): Promise<Images> {
  let done = 0
  const out: Images = {}
  return Promise.all(
    urls.map(
      (url) =>
        new Promise<void>((resolve) => {
          const img = new Image()
          img.decoding = 'async'
          img.onload = img.onerror = () => {
            out[url] = img
            onProgress(++done / urls.length)
            resolve()
          }
          img.src = url
        }),
    ),
  ).then(() => out)
}

function canvas(w: number, h: number) {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  return [c, c.getContext('2d')!] as const
}

function tex(c: HTMLCanvasElement) {
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

function drawCover(g: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, w: number, h: number) {
  const s = Math.max(w / img.width, h / img.height)
  const iw = img.width * s
  const ih = img.height * s
  g.drawImage(img, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih)
}

/** 코코비 사이트의 흰 테두리 카드 느낌을 재구성한 캐릭터 카드 */
export function cardTexture(img: HTMLImageElement, ch: Character) {
  const S = 512
  const [c, g] = canvas(S, S)
  const pad = 26
  // 그림자
  g.save()
  g.shadowColor = 'rgba(0,0,0,0.35)'
  g.shadowBlur = 24
  g.shadowOffsetY = 10
  g.fillStyle = '#fff'
  roundRect(g, pad, pad, S - pad * 2, S - pad * 2, 34)
  g.fill()
  g.restore()
  // 안쪽 그림
  const b = 16
  g.save()
  roundRect(g, pad + b, pad + b, S - (pad + b) * 2, S - (pad + b) * 2, 22)
  g.clip()
  if (ch.cutout) {
    g.fillStyle = ch.color
    g.fillRect(0, 0, S, S)
    g.drawImage(img, S * 0.2, S * 0.08, S * 0.6, (S * 0.6 * img.height) / img.width)
  } else {
    drawCover(g, img, pad + b, pad + b, S - (pad + b) * 2, S - (pad + b) * 2)
  }
  g.restore()
  return tex(c)
}

/** 컷아웃 이미지를 그대로 텍스처로 (투명 배경) */
export function imageTexture(img: HTMLImageElement) {
  const t = new THREE.Texture(img)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  t.needsUpdate = true
  return t
}

/** 게시판 아래에 거는 나무 이름 명판 */
export function plaqueTexture(ch: Character, index: number, lang: Lang) {
  const W = 512
  const H = 128
  const [c, g] = canvas(W, H)
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, '#c98d55')
  grad.addColorStop(1, '#a86b3a')
  g.fillStyle = grad
  roundRect(g, 4, 4, W - 8, H - 8, 22)
  g.fill()
  // 나뭇결
  g.strokeStyle = 'rgba(90,50,20,0.18)'
  g.lineWidth = 3
  for (let i = 0; i < 5; i++) {
    g.beginPath()
    const y = 22 + i * 21
    g.moveTo(20, y)
    g.bezierCurveTo(160, y + Math.sin(i + index) * 8, 340, y - 6, W - 20, y + 3)
    g.stroke()
  }
  g.strokeStyle = '#7a4a24'
  g.lineWidth = 6
  roundRect(g, 4, 4, W - 8, H - 8, 22)
  g.stroke()
  g.fillStyle = '#fff8ec'
  g.textAlign = 'center'
  // 한글은 주아체(굵기 하나), 영문은 Fredoka Bold
  g.font = lang === 'ko' ? '60px "Jua", sans-serif' : '700 56px "Fredoka", "Jua", sans-serif'
  g.fillText(lang === 'ko' ? ch.name.ko : ch.name.en.toUpperCase(), W / 2, 74)
  g.fillStyle = 'rgba(255,248,236,0.75)'
  g.font = lang === 'ko' ? '20px "Jua", sans-serif' : '600 19px "Fredoka", "Jua", sans-serif'
  const species = lang === 'ko' ? ch.species.ko : ch.species.en.toUpperCase()
  g.fillText(`F-${String(index + 1).padStart(2, '0')} · ${species}`, W / 2, 104)
  return tex(c)
}

/** 부드러운 원형 빛 */
export function glowTexture(inner = 'rgba(255,255,255,1)', outer = 'rgba(255,255,255,0)') {
  const [c, g] = canvas(256, 256)
  const r = g.createRadialGradient(128, 128, 0, 128, 128, 128)
  r.addColorStop(0, inner)
  r.addColorStop(0.25, inner.replace(/[\d.]+\)$/, '0.45)'))
  r.addColorStop(1, outer)
  g.fillStyle = r
  g.fillRect(0, 0, 256, 256)
  return tex(c)
}

/** 뭉게구름 (여러 원을 블러로 뭉쳐서) */
export function cloudTexture(seed = 1) {
  const [c, g] = canvas(512, 512)
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647)
  g.filter = 'blur(18px)'
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2
    const d = rnd() * 120
    const x = 256 + Math.cos(a) * d * 1.3
    const y = 270 + Math.sin(a) * d * 0.6
    const r = 50 + rnd() * 70
    const grd = g.createRadialGradient(x, y - r * 0.3, 0, x, y, r)
    grd.addColorStop(0, 'rgba(255,255,255,0.95)')
    grd.addColorStop(0.7, 'rgba(240,246,255,0.6)')
    grd.addColorStop(1, 'rgba(230,238,250,0)')
    g.fillStyle = grd
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
  }
  const t = tex(c)
  return t
}

/** 별자리 마커 '+' */
export function crossTexture() {
  const [c, g] = canvas(64, 64)
  g.strokeStyle = '#fff'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(32, 8)
  g.lineTo(32, 56)
  g.moveTo(8, 32)
  g.lineTo(56, 32)
  g.stroke()
  return tex(c)
}

/** 점(파티클) */
export function dotTexture() {
  const [c, g] = canvas(64, 64)
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32)
  r.addColorStop(0, 'rgba(255,255,255,1)')
  r.addColorStop(0.3, 'rgba(255,255,255,0.6)')
  r.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = r
  g.fillRect(0, 0, 64, 64)
  return tex(c)
}
