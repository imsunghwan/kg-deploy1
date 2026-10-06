import { ORG, TEAMS } from '../content'

const delay = (s: number) => ({ ['--reveal-delay' as string]: `${s}s` })

// 위쪽의 해당 카드로 부드럽게 스크롤하고 잠깐 강조
function goTo(id: string) {
  const el = document.getElementById(`team-${id}`)
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' })
  el.classList.remove('is-target')
  void el.offsetWidth // 연속 클릭 시 애니메이션 재시작
  el.classList.add('is-target')
  window.setTimeout(() => el.classList.remove('is-target'), 2200)
}

function CeoNode() {
  return (
    <button
      type="button"
      onClick={() => goTo(ORG.ceo.id)}
      aria-label={`${ORG.ceo.name} 카드로 이동`}
      data-reveal="text"
      className="org-node org-node--ceo mx-auto flex w-[min(280px,100%)] items-center justify-center gap-4 px-6 py-5 text-left"
    >
      <img src={ORG.ceo.avatar} alt="" className="h-14 w-14 shrink-0 drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)]" />
      <div>
        <div className="text-[11px] uppercase tracking-[0.12em] text-white/50">{ORG.ceo.en}</div>
        <div className="mt-1 text-[22px] font-semibold tracking-[-0.02em]">{ORG.ceo.name}</div>
      </div>
    </button>
  )
}

function TeamNode({ t, i }: { t: (typeof TEAMS.list)[number]; i: number }) {
  return (
    <button
      type="button"
      onClick={() => goTo(t.id)}
      aria-label={`${t.name} 카드로 이동`}
      data-reveal="text"
      className="org-node flex w-full items-center gap-3 px-3 py-3 text-left md:flex-1 md:flex-col md:justify-start md:gap-2 md:px-2 md:py-4 md:text-center"
      style={delay(0.75 + i * 0.06)}
    >
      <img src={t.image} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover grayscale md:h-11 md:w-11" />
      <div className="min-w-0">
        <div className="text-[15px] font-medium leading-tight md:text-[14px]">{t.name}</div>
        <div className="mt-0.5 text-[10px] uppercase tracking-[0.04em] text-white/45">{t.en}</div>
      </div>
    </button>
  )
}

// CEO 아래로 9개 팀이 연결된 조직도. 데스크톱은 가로 트리, 모바일은 세로 트리.
export function OrgChart() {
  const teams = TEAMS.list
  return (
    <div>
      {/* 데스크톱 */}
      <div className="hidden md:block">
        <CeoNode />
        <div data-reveal="line-y" className="org-line mx-auto h-12 w-px" style={delay(0.2)} />
        <div className="relative grid grid-cols-9 gap-3">
          {/* 첫 칸 중앙 ~ 마지막 칸 중앙을 잇는 가로선 */}
          <div
            data-reveal="line-x"
            className="org-line absolute top-0 h-px"
            style={{ left: 'calc((100% - 8 * 0.75rem) / 18)', right: 'calc((100% - 8 * 0.75rem) / 18)', ...delay(0.45) }}
          />
          {teams.map((t, i) => (
            <div key={t.name} className="flex flex-col items-stretch">
              <div data-reveal="line-y" className="org-line mx-auto h-8 w-px" style={delay(0.65)} />
              <TeamNode t={t} i={i} />
            </div>
          ))}
        </div>
      </div>

      {/* 모바일 */}
      <div className="md:hidden">
        <CeoNode />
        <div className="relative ml-6 mt-0 pt-6">
          <div data-reveal="line-y" className="org-line absolute bottom-[34px] left-0 top-0 w-px" style={delay(0.2)} />
          <div className="flex flex-col gap-3">
            {teams.map((t, i) => (
              <div key={t.name} className="relative pl-6">
                <div data-reveal="line-x" className="org-line org-line--from-left absolute left-0 top-1/2 h-px w-6" style={delay(0.4 + i * 0.05)} />
                <TeamNode t={t} i={i} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
