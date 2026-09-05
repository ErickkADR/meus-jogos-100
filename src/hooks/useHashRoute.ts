import { useEffect, useState } from 'react'

/**
 * Roteamento por hash, sem react-router.
 *
 * Hash e não History API porque o site é servido pelo GitHub Pages: sem
 * servidor para reescrever rotas, /animes daria 404 no refresh. Com #/animes
 * o deep-link e o botão de voltar funcionam em qualquer host estático.
 */
export function useHashRoute(fallback: string): [string, (route: string) => void] {
  const read = () => window.location.hash.replace(/^#\/?/, '') || fallback
  const [route, setRoute] = useState(read)

  useEffect(() => {
    const onChange = () => setRoute(read())
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  })

  const go = (next: string) => {
    window.location.hash = `/${next}`
    setRoute(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return [route, go]
}
