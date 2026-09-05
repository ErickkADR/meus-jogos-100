import { useMemo, useState } from 'react'
import { media } from '../data/media'
import {
  isComplete,
  KIND_LABEL,
  STATUS_LABEL,
  type MediaItem,
  type MediaKind,
  type MediaStatus,
} from '../types/media'
import { MediaCard } from '../components/MediaCard'
import { CountUp } from '../components/CountUp'
import { PerfectBadge } from '../components/PerfectBadge'

interface Props {
  kind: MediaKind
}

const SUBTITLE: Record<MediaKind, string> = {
  anime: 'Tudo que assisti, dropei ou ainda estou acompanhando.',
  manga: 'Onde parei em cada um.',
  series: 'Temporada e episódio de cada uma.',
  movie: 'Assistidos e a fila que não anda.',
  book: 'Lidos, na metade e os que ainda vou começar.',
  hq: 'Volumes e encadernados.',
}

/** Concluídos primeiro, depois nota, depois alfabético. */
const STATUS_ORDER: Record<MediaStatus, number> = {
  done: 0,
  ongoing: 1,
  paused: 2,
  dropped: 3,
  todo: 4,
}

function sortItems(list: MediaItem[]): MediaItem[] {
  return [...list].sort(
    (a, b) =>
      STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
      (b.rating ?? -1) - (a.rating ?? -1) ||
      a.title.localeCompare(b.title, 'pt-BR'),
  )
}

export function MediaView({ kind }: Props) {
  const [status, setStatus] = useState<MediaStatus | 'all'>('all')
  const [query, setQuery] = useState('')

  const all = useMemo(() => media.filter((m) => m.kind === kind), [kind])

  // Só mostra as abas de status que existem nesta mídia — não faz sentido
  // oferecer "Dropado" numa seção onde nada foi dropado.
  const statuses = useMemo(() => {
    const present = new Set(all.map((m) => m.status))
    return (Object.keys(STATUS_ORDER) as MediaStatus[]).filter((s) => present.has(s))
  }, [all])

  const visible = useMemo(() => {
    const base = status === 'all' ? all : all.filter((m) => m.status === status)
    const q = query.trim().toLowerCase()
    return sortItems(q ? base.filter((m) => m.title.toLowerCase().includes(q)) : base)
  }, [all, status, query])

  const done = all.filter(isComplete)
  const rated = all.filter((m) => typeof m.rating === 'number')
  const avg = rated.length ? rated.reduce((s, m) => s + (m.rating ?? 0), 0) / rated.length : 0

  return (
    <>
      <header className="hero">
        <div className="hero__inner">
          <div className="hero__badge">
            <PerfectBadge size={52} />
          </div>
          <h1 className="hero__title">
            {KIND_LABEL[kind].toUpperCase()}{' '}
            <span className="hero__accent">{all.length}</span>
          </h1>
          <p className="hero__sub">{SUBTITLE[kind]}</p>

          <dl className="stats">
            <div className="stat stat--gold">
              <dt>Concluídos</dt>
              <dd><CountUp to={done.length} /></dd>
            </div>
            <div className="stat">
              <dt>Acompanhando</dt>
              <dd><CountUp to={all.filter((m) => m.status === 'ongoing').length} duration={1300} /></dd>
            </div>
            <div className="stat">
              <dt>Na fila</dt>
              <dd><CountUp to={all.filter((m) => m.status === 'todo').length} duration={1500} /></dd>
            </div>
            <div className="stat">
              <dt>Nota média</dt>
              <dd><CountUp to={avg} decimals={1} duration={1700} /></dd>
            </div>
          </dl>
        </div>
      </header>

      <nav className="toolbar">
        <div className="segmented" role="tablist" aria-label={`Filtrar ${KIND_LABEL[kind]}`}>
          <button
            role="tab"
            aria-selected={status === 'all'}
            className={`segmented__item ${status === 'all' ? 'is-active' : ''}`}
            onClick={() => setStatus('all')}
          >
            Todos
            <span className="segmented__count">{all.length}</span>
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={status === s}
              className={`segmented__item ${status === s ? 'is-active' : ''}`}
              onClick={() => setStatus(s)}
            >
              {STATUS_LABEL[s]}
              <span className="segmented__count">{all.filter((m) => m.status === s).length}</span>
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
            placeholder={`Buscar em ${KIND_LABEL[kind].toLowerCase()}…`}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Buscar"
          />
        </label>
      </nav>

      <main className="grid-wrap">
        {visible.length > 0 ? (
          <div className="grid">
            {visible.map((item, i) => (
              <MediaCard key={item.id} item={item} index={i} />
            ))}
          </div>
        ) : (
          <p className="empty">
            {query ? `Nada bate com “${query}”.` : 'Nada por aqui ainda.'}
          </p>
        )}
      </main>
    </>
  )
}
