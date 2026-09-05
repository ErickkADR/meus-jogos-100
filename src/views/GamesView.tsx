import { useMemo, useState } from 'react'
import { games } from '../data/games'
import { completion, isPerfect, tracksAchievements, type Game } from '../types'
import { GameCard } from '../components/GameCard'
import { CountUp } from '../components/CountUp'
import { PerfectBadge } from '../components/PerfectBadge'

type Filter = 'perfect' | 'progress' | 'zero' | 'none' | 'all'

const perfectList = games.filter(isPerfect)
const progressList = games.filter((g) => tracksAchievements(g) && !isPerfect(g) && completion(g) > 0)
const zeroList = games.filter((g) => tracksAchievements(g) && completion(g) === 0)
const noneList = games.filter((g) => !tracksAchievements(g))

const BUCKETS: Record<Filter, Game[]> = {
  perfect: perfectList,
  progress: progressList,
  zero: zeroList,
  none: noneList,
  all: games,
}

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'perfect', label: 'Platinados' },
  { id: 'progress', label: 'Em progresso' },
  { id: 'zero', label: 'Não iniciados' },
  { id: 'none', label: 'Sem conquistas' },
  { id: 'all', label: 'Todos' },
]

export function GamesView() {
  const [filter, setFilter] = useState<Filter>('perfect')
  const [query, setQuery] = useState('')

  const visible = useMemo(() => {
    const base = BUCKETS[filter]
    const q = query.trim().toLowerCase()
    return q ? base.filter((g) => g.name.toLowerCase().includes(q)) : base
  }, [filter, query])

  // Só jogos com sistema de conquistas entram na taxa — contar Undertale como
  // "não platinado" seria mentira, ele não tem o que platinar.
  const trackable = games.length - noneList.length
  const perfectRate = (perfectList.length / trackable) * 100
  const totalAchievements = perfectList.reduce((sum, g) => sum + (g.total ?? 0), 0)

  return (
    <>
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__badge">
            <PerfectBadge size={52} />
          </div>
          <h1 className="hero__title">
            JOGOS <span className="hero__accent">100%</span>
          </h1>
          <p className="hero__sub">{games.length} jogos, todas as plataformas, um lugar só.</p>

          <dl className="stats">
            <div className="stat stat--gold">
              <dt>Platinados</dt>
              <dd><CountUp to={perfectList.length} /></dd>
            </div>
            <div className="stat">
              <dt>Em progresso</dt>
              <dd><CountUp to={progressList.length} duration={1300} /></dd>
            </div>
            <div className="stat">
              <dt>Conquistas fechadas</dt>
              <dd><CountUp to={totalAchievements} duration={1700} /></dd>
            </div>
            <div className="stat">
              <dt>Da biblioteca</dt>
              <dd><CountUp to={perfectRate} decimals={1} suffix="%" duration={1500} /></dd>
            </div>
          </dl>
        </div>
      </header>

      <nav className="toolbar">
        <div className="segmented" role="tablist" aria-label="Filtrar jogos">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={`segmented__item ${filter === f.id ? 'is-active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              <span className="segmented__count">{BUCKETS[f.id].length}</span>
            </button>
          ))}
        </div>

        <label className="search">
          <svg viewBox="0 0 20 20" width="15" height="15" aria-hidden="true">
            <path
              d="M8.5 15a6.5 6.5 0 1 1 4.42-1.74l4.41 4.41-1.18 1.18-4.41-4.41A6.47 6.47 0 0 1 8.5 15Zm0-11.5a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z"
              fill="currentColor"
            />
          </svg>
          <input
            type="search"
            value={query}
            placeholder="Buscar jogo…"
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar jogo"
          />
        </label>
      </nav>

      <main className="grid-wrap">
        {visible.length > 0 ? (
          <div className="grid">
            {visible.map((game, i) => (
              <GameCard key={game.id} game={game} index={i} />
            ))}
          </div>
        ) : (
          <p className="empty">Nenhum jogo bate com “{query}”.</p>
        )}
      </main>

      <footer className="foot">
        <p>
          <strong>{perfectList.length}</strong> platinados de <strong>{trackable}</strong> jogos
          com conquistas. Outros <strong>{noneList.length}</strong> não têm sistema de conquistas.
        </p>
      </footer>
    </>
  )
}
