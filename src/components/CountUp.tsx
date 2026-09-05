import { useEffect, useRef, useState } from 'react'

interface Props {
  to: number
  duration?: number
  decimals?: number
  suffix?: string
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3)

/** Número que sobe de 0 até `to` no mount. Respeita prefers-reduced-motion. */
export function CountUp({ to, duration = 1100, decimals = 0, suffix = '' }: Props) {
  const [value, setValue] = useState(0)
  const frame = useRef<number>()

  useEffect(() => {
    const reduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || duration <= 0) {
      setValue(to)
      return
    }

    const start = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1)
      setValue(to * easeOutCubic(progress))
      if (progress < 1) frame.current = requestAnimationFrame(tick)
    }

    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current) cancelAnimationFrame(frame.current)
    }
  }, [to, duration])

  return (
    <>
      {value.toFixed(decimals)}
      {suffix}
    </>
  )
}
