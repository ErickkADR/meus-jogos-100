/**
 * Publica o build na branch gh-pages.
 *
 * Por que não GitHub Actions: o token gh desta conta não tem escopo `workflow`,
 * então commitar .github/workflows/* falha no push. Rodar `gh auth refresh -s
 * workflow` resolveria, mas o deploy manual é uma dependência a menos.
 */
import { execSync } from 'node:child_process'
import { rmSync, writeFileSync } from 'node:fs'

const REPO = 'https://github.com/ErickkADR/meus-jogos-100.git'
const run = (cmd, cwd) => execSync(cmd, { cwd, stdio: 'inherit' })

run('npm run build')
writeFileSync('dist/.nojekyll', '')   // sem isso o Pages ignora pastas com _
rmSync('dist/.git', { recursive: true, force: true })

run('git init -q -b gh-pages', 'dist')
run('git add -A', 'dist')
run('git -c user.name=ErickkADR -c user.email=erick.dantas.work@gmail.com commit -q -m "Deploy: Meus Jogos 100%"', 'dist')
run(`git push -q -f ${REPO} gh-pages`, 'dist')

console.log('\npublicado em https://erickkadr.github.io/meus-jogos-100/')
