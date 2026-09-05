import { readFileSync, writeFileSync, readdirSync } from 'node:fs'
const rows = JSON.parse(readFileSync('resolved.json', 'utf8'))
const COVERS_DIR = 'C:/Users/erick/OneDrive/Desktop/ARQUIVOS/CODE/meus-jogos-100/public/covers'
const localFiles = readdirSync(COVERS_DIR)

// id do arquivo local -> nome do jogo
const LOCAL_MAP = {
  'pokemon-legends-za': 'Pokémon Legends: Z-A',
  'zelda-totk': 'The Legend of Zelda: Tears of the Kingdom',
  'pokemon-scarlet': 'Pokémon Scarlet',
  'zelda-oot': 'The Legend of Zelda: Ocarina of Time',
  'pokemon-arceus': 'Pokémon Legends: Arceus',
  'pokemon-sword': 'Pokémon Sword',
  'bayonetta-2': 'Bayonetta 2',
  'bayonetta-3': 'Bayonetta 3',
}
const byName = {}
for (const [slug, name] of Object.entries(LOCAL_MAP)) {
  const f = localFiles.find(f => f.startsWith(slug + '.'))
  if (f) byName[name] = f
}

const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'')
  .replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,42)

const seen = new Set()
const out = []
for (const r of rows) {
  let id = slug(r.n)
  while (seen.has(id)) id += '-x'
  seen.add(id)

  const g = { id, name: r.n, platform: r.pf }
  if (r.appId) { g.appId = r.appId; g.cover = r.cover }
  if (byName[r.n]) g.localCover = byName[r.n]
  if (r.e != null) { g.earned = r.e; g.total = r.t }
  else if (r.p != null) g.percent = r.p
  if (r.h != null) g.hours = r.h
  if (r.r != null) g.rating = r.r
  if (r.x || r.z) g.noAchievements = true
  out.push(g)
}

// ordem: 100% -> maior progresso -> sem conquistas -> resto alfabetico
const pct = g => g.earned != null ? Math.round(g.earned/g.total*100) : (g.percent ?? -1)
out.sort((a,b) => {
  const pa = pct(a), pb = pct(b)
  if (pa === 100 && pb !== 100) return -1
  if (pb === 100 && pa !== 100) return 1
  if (pb !== pa) return pb - pa
  return a.name.localeCompare(b.name, 'pt-BR')
})

const fmt = g => {
  const p = [`id: ${JSON.stringify(g.id)}`, `name: ${JSON.stringify(g.name)}`, `platform: '${g.platform}'`]
  if (g.appId) p.push(`appId: ${g.appId}`, `cover: '${g.cover}'`)
  if (g.localCover) p.push(`localCover: ${JSON.stringify(g.localCover)}`)
  if (g.earned != null) p.push(`earned: ${g.earned}`, `total: ${g.total}`)
  if (g.percent != null) p.push(`percent: ${g.percent}`)
  if (g.hours != null) p.push(`hours: ${g.hours}`)
  if (g.rating != null) p.push(`rating: ${g.rating}`)
  if (g.noAchievements) p.push(`noAchievements: true`)
  return `  { ${p.join(', ')} },`
}

const perfect = out.filter(g => pct(g) === 100)
const prog = out.filter(g => pct(g) > 0 && pct(g) < 100)
const zero = out.filter(g => pct(g) === 0)
const none = out.filter(g => pct(g) === -1)

const body = [
  `import type { Game } from '../types'`, '',
  `/**`,
  ` * Biblioteca completa: ${out.length} jogos.`,
  ` *`,
  ` * appId e formato de capa foram resolvidos automaticamente pela busca da loja`,
  ` * Steam e VALIDADOS um a um (HEAD na CDN) — não são chutes. O campo \`cover\``,
  ` * diz qual arte existe para aquele app, então a URL é montada direto, sem`,
  ` * tentativa e erro no cliente.`,
  ` *`,
  ` * \`localCover\` aponta para public/covers/ — usado nos exclusivos Nintendo,`,
  ` * que não têm página na Steam.`,
  ` *`,
  ` * Fonte dos números: prints da Steam (set/2026) + base "🎮 JOGOS — CENTRAL"`,
  ` * no Notion. Regenerado por scripts/resolve-covers.mjs.`,
  ` */`,
  `export const games: Game[] = [`,
  `  // ─── 100% das conquistas (${perfect.length}) ${'─'.repeat(Math.max(0, 40))}`,
  ...perfect.map(fmt), '',
  `  // ─── Em progresso (${prog.length}) ${'─'.repeat(46)}`,
  ...prog.map(fmt), '',
  `  // ─── Ainda em 0% (${zero.length}) ${'─'.repeat(48)}`,
  ...zero.map(fmt), '',
  `  // ─── Sem sistema de conquistas (${none.length}) ${'─'.repeat(32)}`,
  ...none.map(fmt),
  `]`, '',
].join('\n')

writeFileSync('C:/Users/erick/OneDrive/Desktop/ARQUIVOS/CODE/meus-jogos-100/src/data/games.ts', body)
console.log(`gerado: ${out.length} jogos`)
console.log(`  100%:        ${perfect.length}`)
console.log(`  progresso:   ${prog.length}`)
console.log(`  0%:          ${zero.length}`)
console.log(`  s/ conquista:${none.length}`)
console.log(`  capa Steam:  ${out.filter(g=>g.appId).length}`)
console.log(`  capa local:  ${out.filter(g=>g.localCover).length}`)
console.log(`  placeholder: ${out.filter(g=>!g.appId&&!g.localCover).map(g=>g.name).join(', ') || '(nenhum)'}`)
