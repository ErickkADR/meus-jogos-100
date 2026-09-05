/**
 * Resolve a capa de cada item de media-input.json e escreve src/data/media.ts.
 *
 *   node scripts/resolve-media.mjs
 *   TMDB_KEY=xxxx node scripts/resolve-media.mjs   (habilita filmes e séries)
 *
 * Fontes, por tipo:
 *   anime, manga  -> AniList GraphQL      sem key
 *   book, hq      -> Open Library         sem key
 *   movie, series -> TMDB                 precisa de TMDB_KEY
 *
 * Sem a key, filmes e séries entram sem capa e caem no placeholder do card —
 * o resto da página funciona igual. É só rodar de novo com a key depois.
 *
 * Capas resolvidas ficam em media-covers.json e são reaproveitadas. Isso não é
 * só velocidade: sem o cache, uma rodada que tomasse rate limit apagaria todas
 * as capas do media.ts — foi exatamente o que aconteceu ao rodar o script
 * quatro vezes seguidas. Rodar de novo agora só busca o que falta.
 *
 * Use --refresh para ignorar o cache e reconsultar tudo.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = join(HERE, '..')
const TMDB_KEY = process.env.TMDB_KEY ?? ''
const REFRESH = process.argv.includes('--refresh')
const CACHE_FILE = join(HERE, 'media-covers.json')

/** id -> URL da capa. Só entra aqui o que já foi validado alguma vez. */
const cache = (() => {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
  } catch {
    return {}
  }
})()

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

/* ── Similaridade ────────────────────────────────────────────────────────── */

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function dice(a, b) {
  const bi = (s) => {
    const out = new Set()
    for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2))
    return out
  }
  const A = bi(norm(a))
  const B = bi(norm(b))
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const g of A) if (B.has(g)) inter++
  return (2 * inter) / (A.size + B.size)
}

/**
 * O Open Library devolve QUALQUER coisa quando não acha o título — pediu
 * "Alexandre, o Grande" e voltou "The Great Gatsby". Sem esse corte a capa
 * errada entra silenciosamente, que é pior do que capa nenhuma.
 */
function similar(wants, gots, floor = 0.5) {
  const W = (Array.isArray(wants) ? wants : [wants]).filter(Boolean)
  const G = (Array.isArray(gots) ? gots : [gots]).filter(Boolean)
  for (const want of W) {
    for (const got of G) {
      const w = norm(want)
      const g = norm(got)
      if (w && g && (g.includes(w) || w.includes(g))) return true
      if (dice(want, got) >= floor) return true
    }
  }
  return false
}

/* ── AniList ─────────────────────────────────────────────────────────────── */

/**
 * Page(...) em vez de Media(...): o Media devolve só o "melhor" resultado do
 * ranking deles, e para "Your Name" isso é um comercial de água mineral.
 * Pegando 8 e escolhendo por similaridade, o filme certo aparece.
 */
const ANILIST_QUERY = `
query ($search: String, $type: MediaType) {
  Page(perPage: 8) {
    media(search: $search, type: $type) {
      title { romaji english }
      coverImage { extraLarge large }
      startDate { year }
    }
  }
}`

async function anilistOnce(term, type, names) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch('https://graphql.anilist.co', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: term, type } }),
        signal: AbortSignal.timeout(20000),
      })
      if (res.status === 429) {
        // A AniList manda quantos segundos faltam; respeitar isso evita
        // falhas intermitentes que parecem "título não encontrado".
        const wait = Number(res.headers.get('retry-after') ?? 0)
        await sleep((wait > 0 ? wait + 1 : 5 * (attempt + 1)) * 1000)
        continue
      }
      const list = json?.data?.Page?.media ?? []
      // O termo de busca costuma ser o romaji e o título vem em inglês
      // ("Kimi no Na wa." -> "Your Name."): basta qualquer par bater.
      const wants = [term, ...names]
      for (const m of list) {
        const got = [m.title?.english, m.title?.romaji].filter(Boolean)
        if (!got.length || !similar(wants, got, 0.45)) continue
        const cover = m.coverImage?.extraLarge ?? m.coverImage?.large ?? null
        if (!cover) continue
        return { cover, matched: m.title?.english ?? m.title?.romaji, year: m.startDate?.year ?? null }
      }
      return null
    } catch {
      await sleep(1500)
    }
  }
  return null
}

/** Tenta cada nome que temos — romaji e inglês indexam diferente. */
async function fromAniList(term, type, names = []) {
  const terms = [...new Set([term, ...names])].filter(Boolean)
  for (const t of terms) {
    const hit = await anilistOnce(t, type, names)
    if (hit?.cover) return hit
    await sleep(900)
  }
  return null
}

/* ── Open Library ────────────────────────────────────────────────────────── */

async function fromOpenLibrary(term, names = []) {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(term)}&limit=3&fields=title,cover_i,first_publish_year`
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    const docs = (await res.json())?.docs ?? []
    // Precisa ter capa E o título precisa parecer com o que foi pedido.
    const hit = docs.find((d) => d.cover_i && similar([term, ...names], d.title ?? ''))
    if (!hit) return null
    return {
      cover: `https://covers.openlibrary.org/b/id/${hit.cover_i}-L.jpg`,
      matched: hit.title ?? null,
      year: hit.first_publish_year ?? null,
    }
  } catch {
    return null
  }
}

/* ── TMDB ────────────────────────────────────────────────────────────────── */

async function fromTmdb(term, kind, year, names = []) {
  if (!TMDB_KEY) return null
  const path = kind === 'movie' ? 'movie' : 'tv'
  const yearParam = year ? `&${kind === 'movie' ? 'year' : 'first_air_date_year'}=${year}` : ''
  try {
    const url = `https://api.themoviedb.org/3/search/${path}?api_key=${TMDB_KEY}&query=${encodeURIComponent(term)}${yearParam}&language=pt-BR`
    const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
    if (!res.ok) return null
    const hit = (await res.json())?.results?.find(
      (r) => r.poster_path && similar([term, ...names], [r.title, r.name, r.original_title, r.original_name]),
    )
    if (!hit) return null
    return {
      cover: `https://image.tmdb.org/t/p/w500${hit.poster_path}`,
      matched: hit.title ?? hit.name ?? null,
      year: Number((hit.release_date ?? hit.first_air_date ?? '').slice(0, 4)) || null,
    }
  } catch {
    return null
  }
}

/* ── Execução ────────────────────────────────────────────────────────────── */

const slug = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 46)

const input = JSON.parse(readFileSync(join(HERE, 'media-input.json'), 'utf8'))
const out = []
const seen = new Set()
let i = 0

for (const item of input) {
  i++
  const term = item.q ?? item.n
  let hit = null

  let id = `${item.k}-${slug(item.n)}`
  while (seen.has(id)) id += '-x'
  seen.add(id)

  const cached = !REFRESH && cache[id]
  const alt = [item.n, item.q].filter(Boolean)
  // `c` no input = capa fixada à mão, para quando a busca por nome não
  // resolve. "Your Name" é o caso: a AniList insiste em devolver um
  // comercial de água mineral para esse termo, então fixamos pelo id 21519.
  if (cached) hit = { cover: cached, matched: null, year: null }
  else if (item.c) hit = { cover: item.c, matched: item.n, year: item.y ?? null }
  else if (item.k === 'anime') hit = await fromAniList(term, 'ANIME', alt)
  else if (item.k === 'manga') hit = await fromAniList(term, 'MANGA', alt)
  else if (item.k === 'book' || item.k === 'hq') hit = await fromOpenLibrary(term, alt)
  else hit = await fromTmdb(term, item.k, item.y, alt)

  const entry = { id, kind: item.k, title: item.n, status: item.s }
  if (hit?.cover) {
    entry.cover = hit.cover
    cache[id] = hit.cover
  }
  if (item.r != null) entry.rating = item.r
  if (item.p) entry.progress = item.p
  const year = item.y ?? hit?.year
  if (year) entry.year = year
  out.push(entry)

  console.log(
    `${String(i).padStart(3)} ${cached ? 'CACHE' : hit?.cover ? 'OK   ' : 'MISS '} [${item.k}] ${item.n}` +
      (hit?.matched && hit.matched !== item.n ? `  -> ${hit.matched}` : ''),
  )
  // Sem rede, sem espera.
  if (!cached) await sleep(item.k === 'anime' || item.k === 'manga' ? 1100 : 350)
}

/* ── Saída ───────────────────────────────────────────────────────────────── */

const KIND_ORDER = ['anime', 'manga', 'series', 'movie', 'book', 'hq']
const STATUS_ORDER = { done: 0, ongoing: 1, paused: 2, dropped: 3, todo: 4 }
out.sort(
  (a, b) =>
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
    STATUS_ORDER[a.status] - STATUS_ORDER[b.status] ||
    (b.rating ?? -1) - (a.rating ?? -1) ||
    a.title.localeCompare(b.title, 'pt-BR'),
)

const fmt = (e) => {
  const p = [`id: ${JSON.stringify(e.id)}`, `kind: '${e.kind}'`, `title: ${JSON.stringify(e.title)}`, `status: '${e.status}'`]
  if (e.rating != null) p.push(`rating: ${e.rating}`)
  if (e.progress) p.push(`progress: ${JSON.stringify(e.progress)}`)
  if (e.year) p.push(`year: ${e.year}`)
  if (e.cover) p.push(`cover: ${JSON.stringify(e.cover)}`)
  return `  { ${p.join(', ')} },`
}

const lines = [`import type { MediaItem } from '../types/media'`, '', '/**', ' * Séries, filmes, animes, mangás, livros e HQs.', ' *', ' * Gerado por scripts/resolve-media.mjs a partir de media-input.json, que veio', ' * da página OBRAS no Notion. Capas: AniList (anime/mangá), Open Library', ' * (livros/HQ) e TMDB (filmes/séries).', ' */', 'export const media: MediaItem[] = [']
for (const kind of KIND_ORDER) {
  const group = out.filter((e) => e.kind === kind)
  if (!group.length) continue
  const withCover = group.filter((e) => e.cover).length
  lines.push(`  // ─── ${kind} (${group.length}, ${withCover} com capa)`)
  lines.push(...group.map(fmt), '')
}
lines.push(']', '')

writeFileSync(join(ROOT, 'src', 'data', 'media.ts'), lines.join('\n'))

const miss = out.filter((e) => !e.cover)
console.log(`\n=== ${out.length} itens, ${out.length - miss.length} com capa`)
for (const kind of KIND_ORDER) {
  const g = out.filter((e) => e.kind === kind)
  if (g.length) console.log(`${kind.padEnd(7)} ${String(g.filter((e) => e.cover).length).padStart(3)}/${g.length}`)
}
if (miss.length) console.log(`\nsem capa: ${miss.map((e) => e.title).join(' | ')}`)
if (!TMDB_KEY) console.log('\n(TMDB_KEY ausente — filmes e séries ficaram sem capa)')
