import { Block, Lines, Narrow, Page } from '../components/Page'
import { Media } from '../components/Media'
import { GlassHero } from '../components/GlassHero'
import { OrgChart } from '../components/OrgChart'
import { useReveal } from '../components/useReveal'
import { ABOUT, BUDDIES, HEARTS, IMAGES, ORG, TEAMS } from '../content'

type CardProps = {
  id: string
  name: string
  en: string
  image: string
  index: number
  buddy?: keyof typeof BUDDIES
  side?: 'left' | 'right'
}

// 팀(또는 CEO) 카드. id 로 조직도에서 이 카드로 이동합니다.
function TeamCard({ id, name, en, image, index, buddy, side = 'right' }: CardProps) {
  return (
    <div
      id={`team-${id}`}
      className="team-card group scroll-mt-24"
      style={{ ['--reveal-delay' as string]: `${(index % 3) * 0.08}s` }}
    >
      <div className="relative overflow-hidden">
        <Media
          src={image}
          alt={`${name} 업무 모습`}
          className="aspect-[3/4] w-full transition-transform duration-[1.2s] ease-[var(--ease-out-quint)] group-hover:scale-[1.035] [&_img]:transition-[filter] [&_img]:duration-700 group-hover:[&_img]:grayscale-0"
        />
        {/* 코코비가 카드 아래 모서리에서 빼꼼 */}
        {buddy && (
          <div
            data-reveal="text"
            className={`buddy pointer-events-none absolute bottom-0 ${side === 'left' ? 'left-[4%]' : 'right-[4%]'}`}
            style={{ width: `${BUDDIES[buddy].width}%`, ['--reveal-delay' as string]: '0.35s' }}
          >
            <img
              src={HEARTS[index % HEARTS.length]}
              alt=""
              className={`heart absolute -top-[14%] w-[22%] max-w-[44px] ${side === 'left' ? 'right-[-10%]' : 'left-[-10%]'}`}
              style={{ animationDelay: `${index * 0.37}s` }}
            />
            <img src={BUDDIES[buddy].src} alt="" className="buddy__char block w-full" />
          </div>
        )}
      </div>
      <div data-reveal="text" className="mt-4 flex items-baseline justify-between gap-2">
        <span className="text-[16px] font-medium md:text-[18px]">{name}</span>
        <span className="text-[12px] uppercase text-white/50">{en}</span>
      </div>
    </div>
  )
}

export default function About() {
  useReveal()

  return (
    <Page>
      <Block className="!mt-[150px]">
        <h1 data-reveal="text" className="t-label">{ABOUT.label}</h1>
        <h2 data-reveal="text" className="t-display"><Lines lines={ABOUT.title} /></h2>
      </Block>

      <Block>
        <Narrow>
          <p data-reveal="text" className="t-lead">{ABOUT.lead}</p>
        </Narrow>
      </Block>

      <Block>
        <GlassHero src={IMAGES.aboutHero} alt="공원에서 함께 노는 코코비 친구들" fill={{ ratio: 1903 / 520 }} />
      </Block>

      <Block>
        <h2 data-reveal="text" className="t-display"><Lines lines={TEAMS.title} /></h2>
        {/* CEO: 조직도와 같은 도형 카드, 팀 카드 한 칸 너비로 가운데 */}
        <div
          id={`team-${ORG.ceo.id}`}
          className="team-card mx-auto mt-14 w-[calc((100%-1.25rem)/2)] scroll-mt-24 md:w-[calc((100%-2*1.25rem)/3)]"
        >
          <div data-reveal="text" className="org-node org-node--ceo flex min-h-[150px] flex-col items-center justify-center px-6 py-8 text-center md:min-h-[180px]">
            <img src={ORG.ceo.avatar} alt="" className="mb-4 h-[72px] w-[72px] drop-shadow-[0_10px_20px_rgba(0,0,0,0.45)] md:h-[88px] md:w-[88px]" />
            <div className="text-[12px] uppercase tracking-[0.14em] text-white/50">{ORG.ceo.en}</div>
            <div className="mt-2 text-[28px] font-semibold tracking-[-0.02em] md:text-[34px]">{ORG.ceo.name}</div>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-3">
          {TEAMS.list.map((t, i) => (
            <TeamCard key={t.id} {...t} index={i} />
          ))}
        </div>
      </Block>

      <Block>
        <h2 data-reveal="text" className="t-display"><Lines lines={ORG.title} /></h2>
        <div className="mt-14">
          <OrgChart />
        </div>
      </Block>
    </Page>
  )
}
