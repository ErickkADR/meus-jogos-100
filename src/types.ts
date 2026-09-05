export type Platform = 'steam' | 'switch' | 'playstation' | 'xbox' | 'outro'

/** Qual arte existe na CDN da Steam para aquele app — validado na geração. */
export type CoverKind = 'library' | 'header' | 'hero' | 'capsule'

export interface Game {
  id: string
  name: string
  platform: Platform

  /** AppID da Steam. */
  appId?: number
  /** Formato de capa confirmado para esse appId. */
  cover?: CoverKind
  /** Arquivo em public/covers/ — para jogos sem página na Steam. */
  localCover?: string

  /** Conquistas obtidas / total, quando temos os números exatos. */
  earned?: number
  total?: number
  /** Percentual, quando a Steam só mostra isso na biblioteca. */
  percent?: number

  hours?: number
  rating?: number
  /** O jogo não tem sistema de conquistas — 0% aqui não significa nada. */
  noAchievements?: boolean
}

export function completion(game: Game): number {
  if (typeof game.earned === 'number' && game.total) {
    return Math.round((game.earned / game.total) * 100)
  }
  return game.percent ?? 0
}

export function isPerfect(game: Game): boolean {
  return !game.noAchievements && completion(game) >= 100
}

/** Só jogos com conquistas entram nas contas de progresso. */
export function tracksAchievements(game: Game): boolean {
  return !game.noAchievements
}

const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps'
const FILE: Record<CoverKind, string> = {
  library: 'library_600x900.jpg',
  header: 'header.jpg',
  hero: 'library_hero.jpg',
  capsule: 'capsule_616x353.jpg',
}

/**
 * URL da capa. O formato já foi validado na geração dos dados, então montamos
 * direto — sem a cascata de tentativa e erro que trazia capa de outro jogo.
 */
export function coverUrl(game: Game): string | null {
  if (game.localCover) return `${import.meta.env.BASE_URL}covers/${game.localCover}`
  if (game.appId && game.cover) return `${CDN}/${game.appId}/${FILE[game.cover]}`
  return null
}

/** header/hero/capsule são widescreen e precisam de enquadramento diferente. */
export function isWideCover(game: Game): boolean {
  return !game.localCover && !!game.cover && game.cover !== 'library'
}
