# Onde paramos — 05/09/2026

Estado do projeto para retomar depois, de qualquer máquina.
Arquitetura e decisões técnicas estão no [CLAUDE.md](CLAUDE.md); aqui é só o
que está feito, o que falta e como continuar.

- **No ar:** https://erickkadr.github.io/meus-jogos-100/
- **Repo:** https://github.com/ErickkADR/meus-jogos-100 (público)

```bash
npm install
npm run dev       # local em :5173
npm run deploy    # build + push na branch gh-pages
```

---

## O que já está pronto

Site em React + TypeScript com o design system da Steam, sete seções num menu
no topo, navegadas por hash (`#/jogos`, `#/anime`, …).

| Seção | Itens | Com capa |
|---|---:|---:|
| Jogos | 274 | 273 |
| Animes | 65 | 65 |
| Mangás | 14 | 14 |
| Séries | 21 | 0 |
| Filmes | 26 | 0 |
| Livros | 9 | 7 |
| HQs | 3 | 2 |

**Jogos:** 12 com 100% das conquistas, 42 em progresso, 156 em 0% e 64 sem
sistema de conquistas.

Os 12 platinados: Sparking! ZERO, MiSide, Subnautica, TWD Season One, TWD
Season Two, To the Moon, Wallpaper Engine, Spider-Man 2, Slime Rancher,
TWD A New Frontier, GRIS e Hentai Girl.

---

## Pendências

### 1. TMDB_KEY — destrava 47 capas

Séries e filmes estão sem pôster porque dependem de uma key gratuita.
Criar em https://www.themoviedb.org/settings/api e rodar:

```bash
TMDB_KEY=sua_key node scripts/resolve-media.mjs
npm run deploy
```

O cache preserva o que já existe; só séries e filmes saem para a rede.

> **Atenção quando virar multiusuário:** key de API em site estático fica
> exposta no bundle. Para uso pessoal tudo bem; com contas, isso vai para o
> backend.

### 2. Três itens que precisam de você

| Item | O que falta |
|---|---|
| **Marvas** (jogo) | Único jogo sem capa. Não existe na loja Steam com esse nome — provável que eu tenha lido errado do print, como aconteceu com "Bron & Beard's" que na verdade era **Bronzebeard's Tavern**. Conferir o nome na biblioteca e corrigir em `scripts/games-input.json`. |
| **Jogo de capa escura, cenário noturno** | Está na base do Notion como "não identificado" e não entrou no site. Por isso o site tem 274 e o Notion 276. |
| **Don't Starve Together** | Marcado como "sem conquistas" seguindo o print, mas o DST recebeu conquistas numa atualização. Reconferir na loja. |

### 3. Limpar a página OBRAS no Notion

As tabelas **GAMES (PC)** e **GAMES SWITCH** ficaram redundantes com a database
🎮 JOGOS — CENTRAL. Você já aprovou remover, mas o conector do Notion caiu na
sessão. **Precisa religar o conector** para fazer.

### 4. Capas que são compromisso

- **Pokémon Legends: Z-A** — key art, não a capa da caixa
- **Pokémon Scarlet** — banner, não a capa
- **Alexandre, o Grande**, **O ceticismo da fé**, **One World Under Doom** —
  sem capa de propósito: o Open Library devolvia o livro errado (chegou a
  sugerir "The Great Gatsby" e "Eragon"), e capa errada é pior que capa nenhuma

Para fixar qualquer capa à mão, é só pôr a URL no campo `c` do item em
`scripts/media-input.json` — foi assim que o Your Name foi resolvido.

---

## Como atualizar os dados

### Jogos

1. Editar `scripts/games-input.json` (percentual, novas platinas, jogos novos)
2. `node scripts/resolve-covers.mjs` — resolve appId e valida a capa na CDN
3. `node scripts/generate-games.mjs` — escreve `src/data/games.ts`
4. `npm run deploy`

### Outras mídias

1. Editar `scripts/media-input.json`
2. `node scripts/resolve-media.mjs` (com `TMDB_KEY=` se for mexer em filme/série)
3. `npm run deploy`

O passo 3 dos jogos é separado porque o resolve leva ~5 min; o de mídia já
escreve o `.ts` direto e usa cache.

**Manter o Notion em dia junto.** A base 🎮 JOGOS — CENTRAL é a fonte de
verdade; estes JSON são a cópia que o site consome.

---

## Armadilhas que já morderam

Cada uma custou retrabalho — estão documentadas no CLAUDE.md com o detalhe
técnico, mas o resumo é:

1. **appId escrito de memória traz a capa de outro jogo, sem dar erro.** Foi
   como Forza Horizon 4 virou um carro de DLC e Mafia virou "The Old Country".
   Nada de appId sem confirmar o nome no `appdetails`.
2. **Um appId que existe não é um appId certo.** Aceitar qualquer id que
   responda pôs "Schedule I" no lugar de GUN.
3. **O Open Library devolve qualquer coisa** quando não acha o título. Toda
   fonte passa por `similar()` antes de ser aceita.
4. **A AniList usa `Page()`, não `Media()`** — o `Media` devolve só o topo do
   ranking deles, e para "Your Name" isso é um comercial de água mineral.
5. **O resolvedor de mídia já foi destrutivo:** sem cache, uma rodada com rate
   limit apagava todas as capas. Hoje `media-covers.json` protege isso, mas
   evite rodar várias vezes seguidas — a AniList limita rápido.
6. **No Notion, `RENAME COLUMN "X" TO "Y"; ADD COLUMN "X"` na mesma chamada
   destrói a coluna.** Perdi 232 linhas de análise assim. Fazer em duas
   chamadas.

---

## Próximo passo grande: multiusuário

O objetivo declarado é abrir para outras pessoas cadastrarem seus 100%.
O que isso exige:

- **Auth + banco.** Supabase é o padrão dos outros projetos aqui.
- **Import automático da Steam** via Web API (`GetOwnedGames` +
  `GetPlayerAchievements`). Isso mata de vez a atualização manual dos
  percentuais, que hoje é o ponto mais frágil — os 42 "em progresso" são um
  retrato de set/2026 e desatualizam sozinhos.
- **IMDB para filmes e séries.** Não tem API gratuita de imagens, mas a conta
  permite **exportar avaliações em CSV**, o que traz muito mais títulos do que
  os 47 tirados do Notion, já com suas notas. O CSV vem com o `tconst`, que
  casa direto com o TMDB para buscar o pôster. Fluxo: IMDB dá a lista, TMDB dá
  a capa.
- **Cadastro manual** para plataformas sem conquistas. O modelo precisa
  distinguir "zerado" de "100% de conquistas" — Switch não tem troféu.
- `platform` em `types.ts` e `MediaKind` em `types/media.ts` já preveem isso.

---

## Detalhe em aberto

O repo se chama `meus-jogos-100`, de quando só havia jogos. A marca no topo
já é **"MEUS 100%"**. Se quiser renomear o repo, dá para fazer sem quebrar o
Pages — o GitHub redireciona a URL antiga.
