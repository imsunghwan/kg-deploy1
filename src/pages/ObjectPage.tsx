import { Block, Lines, Narrow, Page } from '../components/Page'
import { Media } from '../components/Media'
import { useReveal } from '../components/useReveal'
import { IMAGES, OBJECT } from '../content'

export default function ObjectPage() {
  useReveal()

  return (
    <Page>
      <Block className="!mt-[150px]">
        <h1 data-reveal="text" className="t-label">{OBJECT.label}</h1>
        <h2 data-reveal="text" className="t-display"><Lines lines={OBJECT.title} /></h2>
      </Block>

      <Block>
        <Media src={IMAGES.objectHero} alt="" drift className="h-[70vh] w-full" />
      </Block>

      <Block>
        <Narrow>
          <h3 data-reveal="text" className="t-lead">{OBJECT.lead}</h3>
        </Narrow>
      </Block>

      <Block>
        <div className="grid grid-cols-6 gap-5">
          <Media src={IMAGES.object1} alt="" className="col-span-6 aspect-[3/4] md:col-span-2" />
          <Media src={IMAGES.object2} alt="" className="col-span-6 aspect-[3/4] md:col-span-4 md:aspect-auto" />
          <div className="col-span-6 grid gap-6 py-10 text-[16px] leading-[1.45] md:grid-cols-2 md:gap-10 md:text-[18px]">
            {OBJECT.paragraphs.map((p, i) => (
              <p key={i} data-reveal="text" style={{ ['--reveal-delay' as string]: `${i * 0.12}s` }}>{p}</p>
            ))}
            <a
              data-reveal="text"
              href={OBJECT.cta.href}
              className="hover-underline justify-self-start text-[14px] uppercase"
            >
              {OBJECT.cta.label} →
            </a>
          </div>
          <Media src={IMAGES.object3} alt="" className="col-span-6 aspect-[4/3] md:col-span-4" />
          <Media src={IMAGES.object4} alt="" className="col-span-6 aspect-[3/4] md:col-span-2 md:aspect-auto" />
        </div>
      </Block>
    </Page>
  )
}
