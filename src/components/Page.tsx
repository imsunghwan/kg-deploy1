import type { ReactNode } from 'react'
import { Header } from './Logo'
import { Footer } from './Footer'

export function Page({ children }: { children: ReactNode }) {
  return (
    <>
      <Header />
      <main className="px-4 md:px-7">{children}</main>
      <Footer />
    </>
  )
}

export function Block({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`my-[120px] md:my-[200px] ${className}`}>{children}</section>
}

export function Narrow({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-[970px] text-center">{children}</div>
}

// 여러 줄 제목: 줄마다 <br />
export function Lines({ lines }: { lines: string[] }) {
  return lines.map((line, i) => (
    <span key={i}>
      {line}
      {i < lines.length - 1 && <br />}
    </span>
  ))
}
