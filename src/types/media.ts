/**
 * Tipos das mídias que não são jogos.
 *
 * Ficam separados de `Game` de propósito: jogo tem conquistas e plataforma,
 * série tem temporada e episódio, livro tem página. Forçar tudo num tipo só
 * encheria cada item de campos opcionais que nunca se aplicam.
 * O que os une é a apresentação — o card e a grade são compartilhados.
 */
export type MediaKind = 'anime' | 'manga' | 'series' | 'movie' | 'book' | 'hq'

export type MediaStatus = 'done' | 'ongoing' | 'paused' | 'dropped' | 'todo'

export interface MediaItem {
  id: string
  kind: MediaKind
  title: string
  /** URL completa da capa: AniList, Open Library, TMDB ou arquivo local. */
  cover?: string
  /** Nota de 0 a 10 dada por mim. */
  rating?: number
  status: MediaStatus
  /** Onde parei, no formato de cada mídia: "T4 E3", "cap. 382", "pág. 56". */
  progress?: string
  /** Ano de lançamento, quando a fonte informa — ajuda a desambiguar. */
  year?: number
}

export const KIND_LABEL: Record<MediaKind, string> = {
  anime: 'Animes',
  manga: 'Mangás',
  series: 'Séries',
  movie: 'Filmes',
  book: 'Livros',
  hq: 'HQs',
}

export const STATUS_LABEL: Record<MediaStatus, string> = {
  done: 'Concluído',
  ongoing: 'Acompanhando',
  paused: 'Pausado',
  dropped: 'Dropado',
  todo: 'Não iniciado',
}

/** Concluído é o equivalente da platina aqui: ganha o emblema dourado. */
export function isComplete(item: MediaItem): boolean {
  return item.status === 'done'
}
