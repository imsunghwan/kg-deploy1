import { useEffect } from 'react'
import { byId, characters, copy, type Lang } from '../content'

export function CharacterModal({ id, lang, onClose, onNav }: { id: string; lang: Lang; onClose: () => void; onNav: (id: string) => void }) {
  const ch = byId[id]
  const i = characters.indexOf(ch)
  const prev = characters[(i - 1 + characters.length) % characters.length]
  const next = characters[(i + 1) % characters.length]

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onNav(prev.id)
      if (e.key === 'ArrowRight') onNav(next.id)
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [onClose, onNav, prev.id, next.id])

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={ch.name[lang]} onClick={onClose}>
      <div className="modal-card" style={{ '--accent': ch.color } as React.CSSProperties} onClick={(e) => e.stopPropagation()}>
        <div className={`modal-media ${ch.scene ? '' : 'is-cutout'}`}>
          <img src={ch.scene ?? ch.portrait} alt="" />
          <img className="modal-portrait" src={ch.portrait} alt="" />
        </div>
        <div className="modal-body">
          <p className="mono eyebrow">
            {String(i + 1).padStart(2, '0')} / {characters.length} · {ch.role[lang]}
          </p>
          <h3 className="modal-name">{ch.name[lang]}</h3>
          <p className="modal-desc">{ch.desc[lang]}</p>
          <dl className="spec mono">
            <div>
              <dt>{copy.species[lang]}</dt>
              <dd>{ch.species[lang]}</dd>
            </div>
            {ch.age && (
              <div>
                <dt>{copy.age[lang]}</dt>
                <dd>
                  {ch.age}
                  {copy.years[lang]}
                </dd>
              </div>
            )}
            <div>
              <dt>{copy.power[lang]}</dt>
              <dd>{ch.trait[lang]}</dd>
            </div>
          </dl>
          <div className="modal-nav">
            <button className="btn-ghost" onClick={() => onNav(prev.id)} aria-label={prev.name[lang]}>
              ← {prev.name[lang]}
            </button>
            <button className="btn-ghost" onClick={() => onNav(next.id)} aria-label={next.name[lang]}>
              {next.name[lang]} →
            </button>
          </div>
        </div>
        <button className="modal-close mono" onClick={onClose}>
          {copy.close[lang]} ✕
        </button>
      </div>
    </div>
  )
}
