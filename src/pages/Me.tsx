import { Block, Lines, Page } from '../components/Page'
import { CharacterSlot } from '../components/CharacterSlot'
import { ProfileGrid } from '../components/ProfileGrid'
import { Typewriter } from '../components/fx'
import { useReveal } from '../components/useReveal'
import { ME } from '../content'

// 개발팀 소개 + 자기소개를 합친 페이지
export default function Me() {
  useReveal()

  return (
    <Page>
      <Block className="!mt-[150px]">
        <h1 data-reveal="text" className="t-label">{ME.label}</h1>
        <h2 data-reveal="text" className="t-display"><Lines lines={ME.title} /></h2>
      </Block>

      {/* 히어로: 코코비 장면 + 위에 떠 있는 터미널 */}
      <Block>
        {/* 이미지는 원본(800×400)보다 크게 늘리지 않고, 터미널은 오른쪽 아래 모서리에 걸쳐 둠 */}
        <div data-reveal="media" className="relative mx-auto flex max-w-[1200px] flex-col items-center pb-2 md:flex-row md:items-end md:justify-center md:pb-12">
          <div className="w-full max-w-[800px] overflow-hidden rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
            <CharacterSlot name="teamHero" className="aspect-[2/1] w-full" />
          </div>
          <div className="relative z-10 -mt-4 w-[min(460px,calc(100%-32px))] overflow-hidden rounded-2xl border border-white/10 bg-black/80 shadow-2xl backdrop-blur-md md:-mb-12 md:-ml-28 md:mt-0">
            <div className="flex items-center gap-1.5 border-b border-white/10 px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
              <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
              <span className="ml-3 font-mono text-[11px] text-white/40">kigle-dev — zsh</span>
            </div>
            <Typewriter lines={ME.terminal} className="min-h-[150px] px-4 py-3 font-mono text-[12px] leading-[1.75] text-white/85 md:text-[13px]" />
          </div>
        </div>
      </Block>

      <Block>
        <ProfileGrid />
      </Block>
    </Page>
  )
}
