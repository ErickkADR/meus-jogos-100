import { readFileSync, writeFileSync } from 'node:fs'

const input = JSON.parse(readFileSync('input.json', 'utf8'))

const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[™®©]/g, '')
    .replace(/&/g, ' and ')
    .replace(/['’`]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\b(the|a|an|of|edition|remastered|complete|goty|game of the year)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

function bigrams(s) {
  const out = new Set()
  for (let i = 0; i < s.length - 1; i++) out.add(s.slice(i, i + 2))
  return out
}

function dice(a, b) {
  const A = bigrams(a)
  const B = bigrams(b)
  if (!A.size || !B.size) return 0
  let inter = 0
  for (const g of A) if (B.has(g)) inter++
  return (2 * inter) / (A.size + B.size)
}

function score(want, got) {
  const w = norm(want)
  const g = norm(got)
  if (w === g) return 1
  if (g.startsWith(w) || w.startsWith(g)) return 0.94
  if (g.includes(w) || w.includes(g)) return 0.86
  return dice(w, g)
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function search(term) {
  const url = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=US`
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(20000) })
      if (res.status === 429) {
        await sleep(4000 * (attempt + 1))
        continue
      }
      if (!res.ok) return []
      const json = await res.json()
      return json.items ?? []
    } catch {
      await sleep(1200)
    }
  }
  return []
}

/** A capa vertical não existe para todo app; header.jpg é o fallback. */
async function pickCover(appId) {
  const base = `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}`
  for (const [kind, file] of [
    ['library', 'library_600x900.jpg'],
    ['header', 'header.jpg'],
  ]) {
    try {
      const res = await fetch(`${base}/${file}`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(15000),
      })
      if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) return kind
    } catch {
      /* tenta o próximo */
    }
  }
  return null
}

const results = []
let i = 0

for (const game of input) {
  i++
  const term = game.q ?? game.n
  const items = await search(term)

  let best = null
  let bestScore = 0
  for (const item of items) {
    if (item.type && item.type !== 'app') continue
    const s = score(game.q ?? game.n, item.name)
    if (s > bestScore) {
      bestScore = s
      best = item
    }
  }

  // Se a busca com o termo alternativo falhou, tenta o nome puro.
  if ((!best || bestScore < 0.55) && game.q) {
    const alt = await search(game.n)
    for (const item of alt) {
      if (item.type && item.type !== 'app') continue
      const s = score(game.n, item.name)
      if (s > bestScore) {
        bestScore = s
        best = item
      }
    }
  }

  let cover = null
  if (best && bestScore >= 0.55) cover = await pickCover(best.id)

  const row = {
    ...game,
    appId: best && bestScore >= 0.55 ? best.id : null,
    matched: best?.name ?? null,
    score: Number(bestScore.toFixed(3)),
    cover,
  }
  results.push(row)

  const flag = row.appId ? (cover === 'library' ? 'OK ' : cover === 'header' ? 'HDR' : 'NOIMG') : 'MISS'
  console.log(`${String(i).padStart(3)} ${flag} ${game.n} -> ${row.matched ?? '—'} (${row.score})`)

  await sleep(320)
}

writeFileSync('resolved.json', JSON.stringify(results, null, 1))

const miss = results.filter((r) => !r.appId)
const noimg = results.filter((r) => r.appId && !r.cover)
const hdr = results.filter((r) => r.cover === 'header')
const low = results.filter((r) => r.appId && r.score < 0.8)

console.log(`\n=== ${results.length} jogos`)
console.log(`capa vertical: ${results.filter((r) => r.cover === 'library').length}`)
console.log(`só header:     ${hdr.length}`)
console.log(`sem appId:     ${miss.length} -> ${miss.map((r) => r.n).join(' | ')}`)
console.log(`sem imagem:    ${noimg.length} -> ${noimg.map((r) => r.n).join(' | ')}`)
console.log(`\nmatch fraco (revisar):`)
for (const r of low) console.log(`  ${r.score}  "${r.n}" -> "${r.matched}"`)
