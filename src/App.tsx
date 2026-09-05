import { games } from './data/games'
import { media } from './data/media'
import { isPerfect } from './types'
import { isComplete, KIND_LABEL, type MediaKind } from './types/media'
import { GamesView } from './views/GamesView'
import { MediaView } from './views/MediaView'
import { useHashRoute } from './hooks/useHashRoute'

type Route = 'jogos' | MediaKind

const NAV: { route: Route; label: string; icon: string }[] = [
  { route: 'jogos', label: 'Jogos', icon: '🎮' },
  { route: 'anime', label: KIND_LABEL.anime, icon: '⚔️' },
  { route: 'manga', label: KIND_LABEL.manga, icon: '📖' },
  { route: 'series', label: KIND_LABEL.series, icon: '📺' },
  { route: 'movie', label: KIND_LABEL.movie, icon: '🎬' },
  { route: 'book', label: KIND_LABEL.book, icon: '📚' },
  { route: 'hq', label: KIND_LABEL.hq, icon: '🦸' },
]

const VALID = new Set<string>(NAV.map((n) => n.route))

/** Total de "concluídos" de todas as mídias — o número que dá título ao site. */
const totalDone = games.filter(isPerfect).length + media.filter(isComplete).length

function countFor(route: Route): number {
  return route === 'jogos' ? games.length : media.filter((m) => m.kind === route).length
}

export default function App() {
  const [raw, go] = useHashRoute('jogos')
  const route = (VALID.has(raw) ? raw : 'jogos') as Route

  return (
    <div className="app">
      <div className="aurora" aria-hidden="true">
        <span className="aurora__blob aurora__blob--gold" />
        <span className="aurora__blob aurora__blob--blue" />
      </div>

      <div className="topbar">
        <div className="topbar__inner">
          <button className="brand" onClick={() => go('jogos')}>
            <span className="brand__mark">MEUS</span>
            <span className="brand__accent">100%</span>
            <span className="brand__count">{totalDone}</span>
          </button>

          <nav className="nav" aria-label="Seções">
            {NAV.map((n) => (
              <button
                key={n.route}
                className={`nav__item ${route === n.route ? 'is-active' : ''}`}
                onClick={() => go(n.route)}
                aria-current={route === n.route ? 'page' : undefined}
              >
                <span className="nav__icon" aria-hidden="true">{n.icon}</span>
                <span className="nav__label">{n.label}</span>
                <span className="nav__count">{countFor(n.route)}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* key força a remontagem: sem isso as animações de entrada e os
          filtros da view anterior sobrariam ao trocar de seção. */}
      {route === 'jogos' ? <GamesView key="jogos" /> : <MediaView key={route} kind={route} />}

      <footer className="foot">
        <p className="foot__dim">
          Dados da Steam e da página OBRAS no Notion. Capas: Steam, AniList, Open Library e TMDB.
        </p>
      </footer>
    </div>
  )
}
