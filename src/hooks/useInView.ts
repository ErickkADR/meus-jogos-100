import { useEffect, useRef, useState } from 'react'

/**
 * Dispara uma única vez quando o elemento entra na viewport. Usado para as
 * animações de entrada dos cards e para o preenchimento das barras — animar
 * tudo no mount faria a metade de baixo da página "acontecer" fora da tela.
 */
export function useInView<T extends HTMLElement>(rootMargin = '0px 0px -40px 0px') {
  const ref = useRef<T>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return

    // Sem IntersectionObserver (ou com motion reduzido) mostramos tudo direto.
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          observer.disconnect()
        }
      },
      { rootMargin, threshold: 0.08 },
    )

    observer.observe(node)
    return () => observer.disconnect()
  }, [rootMargin])

  return { ref, inView }
}
