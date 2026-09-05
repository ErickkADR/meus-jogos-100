/**
 * Resolve o appId e o formato de capa de cada jogo de games-input.json.
 *
 * Por que existe: appId escrito de memória não dá erro — ele traz a capa de
 * OUTRO jogo. Aqui nada é aceito sem passar por duas checagens: o nome tem que
 * bater com o da loja, e a arte tem que existir de fato na CDN (HEAD).
 *
 *   node scripts/resolve-covers.mjs      (de qualquer diretório)
 *
 * Saída: scripts/resolved.json, consumido por generate-games.mjs.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const INPUT = join(HERE, 'games-input.json')
const OUTPUT = join(HERE, 'resolved.json')

/**
 * Jogos em que a busca da loja erra ou não acha nada — delistados, nomes
 * ambíguos, remasters que colidem com o original. O appId aqui ainda passa
 * pelo appdetails: se o nome que voltar não bater, o override é descartado.
 *
 * `expect` é o trecho que precisa aparecer no nome oficial (case-insensitive).
 */
const OVERRIDES = {
  // a busca casava com um carro de DLC
  'Forza Horizon 4': { id: 1293830, expect: 'forza horizon 4' },
  // "Mafia" sozinho trazia o Mafia: The Old Country
  'Mafia': { id: 40990, expect: 'mafia' },
  // trazia o DEATH STRANDING 2
  'DEATH STRANDING': { id: 1190460, expect: 'death stranding' },
  // delistado depois do fim dos servidores, some da busca
  'The Crew': { id: 241560, expect: 'the crew' },
  // "Banana" casava com Banana Shooter
  'Banana': { id: 2923300, expect: 'banana' },
  'Grand Theft Auto: San Andreas': { id: 12120, expect: 'san andreas' },
  'Saints Row IV': { id: 206420, expect: 'saints row iv' },
  'Resident Evil Resistance': { id: 952070, expect: 'resistance' },
  // Enhanced Editions são upgrade do mesmo app, não app novo
  'Little Nightmares Enhanced Edition': { id: 424840, expect: 'little nightmares' },
  'Little Nightmares II Enhanced Edition': { id: 860510, expect: 'little nightmares ii' },
  'Metro Exodus Enhanced Edition': { id: 1449560, expect: 'metro exodus' },
  'Resident Evil (HD Remaster)': { id: 304240, expect: 'resident evil' },
  'Resident Evil 4 (2023)': { id: 2050650, expect: 'resident evil 4' },
  'SEGA Mega Drive & Genesis Classics': { id: 34270, expect: 'genesis classics' },
  'Tomb Raider - GOTY Edition': { id: 203160, expect: 'tomb raider' },
  'Songs for a Hero - Definitive Edition': { id: 389170, expect: 'songs for a hero' },
  // delistado: a busca da loja não retorna removidos
  'Showdown Bandit': { id: 1076280, expect: 'showdown bandit' },
  'GUN': { id: 2610, expect: 'gun' },
}

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
      return (await res.json()).items ?? []
    } catch {
      await sleep(1200)
    }
  }
  return []
}

/** Nome oficial do app — é o que valida um override. */
async function officialName(appId) {
  try {
    const res = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`,
      { signal: AbortSignal.timeout(20000) },
    )
    if (!res.ok) return null
    const entry = (await res.json())?.[String(appId)]
    return entry?.success ? (entry.data?.name ?? null) : null
  } catch {
    return null
  }
}

/** Ordem de preferência: a vertical é a única que preenche o 2:3 da grade. */
const FORMATS = [
  ['library', 'library_600x900.jpg'],
  ['header', 'header.jpg'],
  ['hero', 'library_hero.jpg'],
  ['capsule', 'capsule_616x353.jpg'],
]

async function pickCover(appId) {
  for (const [kind, file] of FORMATS) {
    try {
      const res = await fetch(
        `https://cdn.cloudflare.steamstatic.com/steam/apps/${appId}/${file}`,
        { method: 'HEAD', signal: AbortSignal.timeout(15000) },
      )
      if (res.ok && (res.headers.get('content-type') ?? '').startsWith('image/')) return kind
    } catch {
      /* tenta o próximo formato */
    }
  }
  return null
}

const input = JSON.parse(readFileSync(INPUT, 'utf8'))
const results = []
let i = 0

for (const game of input) {
  i++
  let appId = null
  let matched = null
  let best = 0

  const override = OVERRIDES[game.n]
  if (override) {
    // Um appId que existe não é um appId certo: o nome tem que bater.
    const name = await officialName(override.id)
    if (name && norm(name).includes(norm(override.expect))) {
      appId = override.id
      matched = name
      best = 1
    } else if (name) {
      console.log(`  ! override rejeitado p/ ${game.n}: [${override.id}] é "${name}"`)
    } else {
      // delistado não responde appdetails, mas a CDN ainda serve a arte
      appId = override.id
      matched = `${game.n} (delistado)`
      best = 1
    }
    await sleep(300)
  }

  if (!appId) {
    for (const term of [game.q ?? game.n, game.n]) {
      for (const item of await search(term)) {
        if (item.type && item.type !== 'app') continue
        const s = score(term, item.name)
        if (s > best) {
          best = s
          matched = item.name
          appId = item.id
        }
      }
      if (best >= 0.55) break
      await sleep(300)
    }
    if (best < 0.55) appId = null
  }

  const cover = appId ? await pickCover(appId) : null
  if (appId && !cover) appId = null // sem arte não serve de nada

  results.push({ ...game, appId, matched: appId ? matched : null, score: Number(best.toFixed(3)), cover })

  const flag = cover ? (cover === 'library' ? 'OK ' : cover.toUpperCase().slice(0, 3)) : 'MISS'
  console.log(`${String(i).padStart(3)} ${flag} ${game.n} -> ${matched ?? '—'} (${best.toFixed(2)})`)
  await sleep(320)
}

writeFileSync(OUTPUT, JSON.stringify(results, null, 1))

const miss = results.filter((r) => !r.cover)
const weak = results.filter((r) => r.appId && r.score < 0.8)
console.log(`\n=== ${results.length} jogos`)
for (const [kind] of FORMATS) {
  const n = results.filter((r) => r.cover === kind).length
  if (n) console.log(`${kind.padEnd(8)} ${n}`)
}
console.log(`sem capa: ${miss.length}${miss.length ? ' -> ' + miss.map((r) => r.n).join(' | ') : ''}`)
if (weak.length) {
  console.log('\nmatch fraco, revisar (e virar OVERRIDE se estiver errado):')
  for (const r of weak) console.log(`  ${r.score}  "${r.n}" -> "${r.matched}"`)
}
