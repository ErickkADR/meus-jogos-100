import { useState } from 'react'
import { completion, coverUrl, isPerfect, isWideCover, type Game } from '../types'
import { PerfectBadge } from './PerfectBadge'
import { useInView } from '../hooks/useInView'

interface Props {
  game: Game
  index: number
}

const PLATFORM_LABEL: Record<Game['platform'], string> = {
  steam: 'Steam',
  switch: 'Switch',
  playstation: 'PlayStation',
  xbox: 'Xbox',
  outro: 'Outra',
}

/** Hue estável a partir do nome, para o placeholder não ser cinza genérico. */
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

export function GameCard({ game, index }: Props) {
  const { ref, inView } = useInView<HTMLElement>()
  const [broken, setBroken] = useState(false)

  const perfect = isPerfect(game)
  const percent = completion(game)
  const src = broken ? null : coverUrl(game)
  const wide = isWideCover(game)

  return (
    <article
      ref={ref}
      className={`card ${perfect ? 'card--perfect' : ''} ${inView ? 'is-visible' : ''}`}
      style={{ '--delay': `${Math.min(index, 22) * 40}ms` } as React.CSSProperties}
    >
      <div className="card__frame">
        <div className="card__art">
          {src ? (
            <>
              {/* Capas widescreen não preenchem 2:3; o fundo borrado evita a
                  tarja preta sem distorcer a arte. */}
              {wide && <img className="card__blur" src={src} alt="" aria-hidden="true" />}
              <img
                className={`card__cover ${wide ? 'card__cover--wide' : ''}`}
                src={src}
                alt={game.name}
                loading="lazy"
                decoding="async"
                onError={() => setBroken(true)}
              />
            </>
          ) : (
            <div
              className="card__placeholder"
              style={{ '--hue': hueFrom(game.name) } as React.CSSProperties}
            >
              <span className="card__initials">{initials(game.name)}</span>
            </div>
          )}

          {perfect && <span className="card__sheen" aria-hidden="true" />}
          <div className="card__scrim" aria-hidden="true" />

          {perfect && (
            <div className="card__badge">
              <PerfectBadge />
            </div>
          )}

          <div className="card__overlay">
            <h3 className="card__title">{game.name}</h3>
            <div className="card__meta">
              <span className="tag">{PLATFORM_LABEL[game.platform]}</span>
              {typeof game.hours === 'number' && (
                <span className="tag">
                  {game.hours < 1 ? `${Math.round(game.hours * 60)} min` : `${game.hours} h`}
                </span>
              )}
              {typeof game.rating === 'number' && <span className="tag tag--rating">{game.rating}/10</span>}
            </div>
          </div>
        </div>

        <footer className="card__foot">
          {perfect ? (
            <div className="card__perfect-line">
              <span className="card__perfect-label">100% ALCANÇADAS</span>
              {typeof game.total === 'number' && (
                <span className="card__count">
                  {game.earned}/{game.total}
                </span>
              )}
            </div>
          ) : game.noAchievements ? (
            <div className="card__bar-row">
              <span className="card__bar-label">SEM CONQUISTAS</span>
              <span className="card__count card__count--muted">—</span>
            </div>
          ) : (
            <>
              <div className="card__bar-row">
                <span className="card__bar-label">CONQUISTAS</span>
                <span className="card__count">{percent}%</span>
              </div>
              <div className="bar">
                <div className="bar__fill" style={{ width: inView ? `${percent}%` : '0%' }} />
              </div>
            </>
          )}
        </footer>
      </div>
    </article>
  )
}
