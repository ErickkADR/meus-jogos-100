import { useState } from 'react'
import { isComplete, STATUS_LABEL, type MediaItem } from '../types/media'
import { PerfectBadge } from './PerfectBadge'
import { useInView } from '../hooks/useInView'

interface Props {
  item: MediaItem
  index: number
}

/** Hue estável a partir do título, para o placeholder não ser cinza genérico. */
function hueFrom(name: string): number {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash) % 360
}

function initials(name: string): string {
  return name
    .replace(/[^\p{L}\p{N} ]/gu, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('')
}

/**
 * Mesma casca visual do GameCard — o card é a identidade do site. O que muda é
 * o rodapé: aqui não há barra de conquistas, e sim status e onde parei.
 */
export function MediaCard({ item, index }: Props) {
  const { ref, inView } = useInView<HTMLElement>()
  const [broken, setBroken] = useState(false)

  const done = isComplete(item)
  const src = broken ? null : item.cover

  return (
    <article
      ref={ref}
      className={`card ${done ? 'card--perfect' : ''} ${inView ? 'is-visible' : ''}`}
      style={{ '--delay': `${Math.min(index, 22) * 40}ms` } as React.CSSProperties}
    >
      <div className="card__frame">
        <div className="card__art">
          {src ? (
            <img
              className="card__cover"
              src={src}
              alt={item.title}
              loading="lazy"
              decoding="async"
              onError={() => setBroken(true)}
            />
          ) : (
            <div
              className="card__placeholder"
              style={{ '--hue': hueFrom(item.title) } as React.CSSProperties}
            >
              <span className="card__initials">{initials(item.title)}</span>
            </div>
          )}

          {done && <span className="card__sheen" aria-hidden="true" />}
          <div className="card__scrim" aria-hidden="true" />

          {done && (
            <div className="card__badge">
              <PerfectBadge />
            </div>
          )}

          <div className="card__overlay">
            <h3 className="card__title">{item.title}</h3>
            <div className="card__meta">
              {item.year && <span className="tag">{item.year}</span>}
              {item.progress && <span className="tag">{item.progress}</span>}
              {typeof item.rating === 'number' && (
                <span className="tag tag--rating">{item.rating}/10</span>
              )}
            </div>
          </div>
        </div>

        <footer className="card__foot">
          <div className="card__perfect-line">
            <span className={done ? 'card__perfect-label' : 'card__bar-label'}>
              {done ? 'CONCLUÍDO' : STATUS_LABEL[item.status].toUpperCase()}
            </span>
            {typeof item.rating === 'number' && (
              <span className="card__count">{item.rating}</span>
            )}
          </div>
        </footer>
      </div>
    </article>
  )
}
