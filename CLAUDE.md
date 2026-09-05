# Meus Jogos 100%

Vitrine do que já foi concluído: jogos com 100% de conquistas, mais animes, mangás,
séries, filmes, livros e HQs. Hoje é uma página estática de um usuário só (Erick); o
plano é virar multiusuário com contas.

O nome do repo ainda é `meus-jogos-100`, de quando só havia jogos. A marca no topo é
"MEUS 100%".

## Seções

Sete abas, navegadas por hash (`#/jogos`, `#/anime`, …). Hash e não History API porque
o GitHub Pages não reescreve rotas — `/animes` daria 404 no refresh.

Jogos e mídias têm tipos separados de propósito (`types.ts` e `types/media.ts`): jogo
tem conquistas e plataforma, série tem temporada, livro tem página. O que compartilham
é a apresentação — o card, a grade e o emblema dourado são os mesmos. O dourado
significa "100% das conquistas" em jogos e "concluído" nas outras mídias.

## Stack

React 18 + TypeScript + Vite. **Zero dependência de runtime além do React** — as
animações são CSS puro e `IntersectionObserver`. Não instalar framer-motion/GSAP sem
motivo: o efeito atual (stagger na entrada, brilho dourado, sheen, barras que enchem
ao aparecer) já está resolvido em CSS e o bundle está em ~51 kB gzip.

```
npm run dev      # servidor local
npm run build    # tsc -b && vite build
npm run preview  # servir o dist
```

## De onde vêm os dados

`src/data/games.ts`, preenchido à mão a partir de prints da Steam (set/2026) e cruzado
com a base **🎮 JOGOS — CENTRAL** no Notion (privada), que é a fonte de verdade
completa: 276 jogos; a grade tem 274 — os 2 "não identificados" da base não entram.

A grade mostra a biblioteca inteira (274), separada por filtro: platinados, em
progresso, não iniciados e sem conquistas.

Distinção que importa em `types.ts`:

- `earned`/`total` — números exatos, só existem para os jogos cuja tela de conquistas
  foi capturada ("48/48").
- `percent` — a tela de biblioteca da Steam só dá o percentual. É o que temos para a
  maioria.

`completion()` prefere os absolutos e cai no percentual. Não colapsar os dois campos
num só: perder os absolutos apagaria o "43/43" que aparece nos cards platinados.

## Capas

**Nada de appId escrito de memória.** Foi assim que a primeira versão acabou com capa
de outro jogo — Forza Horizon 4 virou um carro de DLC, Mafia virou "The Old Country",
DEATH STRANDING virou o 2. Os appIds de agora vêm de `scripts/resolve-covers.mjs`, que:

1. consulta `store.steampowered.com/api/storesearch` com o nome do jogo;
2. escolhe o melhor match por similaridade (Dice sobre bigramas, corte em 0.55);
3. faz **HEAD na CDN** para descobrir qual arte existe (`library_600x900` →
   `header` → `library_hero` → `capsule_616x353`);
4. grava o formato encontrado no campo `cover`.

Como o formato já vem validado, `coverUrl()` monta a URL direta — o cliente não tem
mais cascata de tentativa e erro. Se um appId for corrigido à mão, **confirme o nome
pelo `appdetails` antes de aceitar**: um appId que existe não é um appId certo.

Regenerar: `node scripts/resolve-covers.mjs && node scripts/generate-games.mjs`
(entrada em `scripts/games-input.json`, saída direto em `src/data/games.ts`).

### Capas locais

Exclusivos Nintendo não têm página na Steam. As 8 capas em `public/covers/` vieram das
infoboxes da Wikipedia e são referenciadas por `localCover`. Bayonetta 3 só existe na
Wikipedia em português — a inglesa não tem a arte.

Duas são compromisso: Pokémon Legends: Z-A é key art e Pokémon Scarlet é banner, não a
capa da caixa; foi o que a Wikipedia tinha.

**Marvas** é o único jogo sem capa nenhuma — não existe na loja Steam com esse nome e a
busca web não achou. Provavelmente o nome foi lido errado do print original; conferir na
biblioteca e corrigir em `games-input.json`.

### Capas widescreen

17 jogos só têm arte horizontal. Em vez de esticar para o 2:3 da grade, a arte fica
centrada sobre uma cópia borrada dela mesma (`.card__blur` + `.card__cover--wide`).

## Capas das outras mídias

`scripts/resolve-media.mjs` resolve por tipo:

| Tipo | Fonte | Key |
|---|---|---|
| anime, manga | AniList (GraphQL) | não |
| book, hq | Open Library | não |
| movie, series | TMDB | **sim** |

```bash
node scripts/resolve-media.mjs              # anime, mangá, livros e HQ
TMDB_KEY=xxxx node scripts/resolve-media.mjs   # + filmes e séries
```

Sem a `TMDB_KEY` filmes e séries entram sem capa e caem no placeholder. Nada quebra.

Três armadilhas que já custaram capa errada aqui:

1. **O Open Library devolve qualquer coisa** quando não acha o título. Pediu
   "Alexandre, o Grande" e voltou "The Great Gatsby". Toda fonte passa por `similar()`
   antes de ser aceita — capa nenhuma é melhor que capa errada.
2. **`similar()` compara N nomes contra N títulos.** O termo de busca costuma ser o
   romaji e o título vem em inglês ("Kimi no Na wa." → "Your Name."); comparar um
   contra um rejeitava acertos.
3. **A AniList usa `Page(...)`, não `Media(...)`.** O `Media` devolve só o "melhor"
   resultado do ranking deles, e para "Your Name" isso é um comercial de água mineral.
   Pegando 8 e filtrando por similaridade, o filme certo aparece.

A AniList também tem rate limit apertado: o script respeita o header `Retry-After` e
anda a ~1,1s por item. Rodar os 138 leva alguns minutos — é esperado.

Avatar: The Last Airbender está como `series`, não `anime`: não é produção japonesa e
a AniList não tem.

## Regra visual

Dourado é **exclusivo** dos 100%. Todo o resto usa a paleta azul/cinza da Steam
(`--blue`, `--text-dim`). Se o dourado começar a aparecer em elemento neutro, a platina
para de saltar na grade e o efeito inteiro se perde. Os não-platinados ainda levam
`saturate(.78) brightness(.82)` na capa, que volta ao normal no hover.

O emblema em `PerfectBadge.tsx` é uma réplica em SVG do ícone de jogo perfeito da Steam
(disco dourado com raios sobre duas fitas azuis). Ele fica com `bottom: -4px` para
transbordar a borda do card, igual ao original.

## Pendências para o modo multiusuário

- Auth + banco (Supabase é o padrão dos projetos aqui).
- Importar biblioteca via Steam Web API (`GetOwnedGames` + `GetPlayerAchievements`)
  em vez do arquivo estático.
- Cadastro manual para PlayStation/Xbox/Switch — Switch não tem conquistas, então o
  modelo precisa aceitar "zerado" como estado distinto de "100% de conquistas".
- `platform` já é união de tipos em `types.ts` prevendo isso.
