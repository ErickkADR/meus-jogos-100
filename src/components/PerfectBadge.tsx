interface Props {
  /** Lado do emblema em px. O SVG é quadrado e escala junto. */
  size?: number
}

/**
 * Réplica do emblema de "jogo perfeito" da Steam: o disco dourado com raios,
 * apoiado sobre duas fitas azuis. Aparece no canto inferior esquerdo da capa,
 * transbordando a borda — igual ao da biblioteca.
 *
 * Os ids de gradiente levam sufixo único porque a página desenha vários
 * emblemas ao mesmo tempo e ids repetidos se sobrescrevem entre SVGs.
 */
export function PerfectBadge({ size = 34 }: Props) {
  const uid = 'pb'

  return (
    <svg
      className="perfect-badge"
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      role="img"
      aria-label="Todas as conquistas alcançadas"
    >
      <defs>
        <radialGradient id={`${uid}-disc`} cx="38%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#fffbe6" />
          <stop offset="38%" stopColor="#ffd75e" />
          <stop offset="76%" stopColor="#f0a92b" />
          <stop offset="100%" stopColor="#c97c10" />
        </radialGradient>
        <linearGradient id={`${uid}-ribbon`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#4b9fe1" />
          <stop offset="100%" stopColor="#1e5c96" />
        </linearGradient>
        <linearGradient id={`${uid}-ribbon2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3d86c6" />
          <stop offset="100%" stopColor="#153f68" />
        </linearGradient>
      </defs>

      {/* fitas — desenhadas antes para ficarem atrás do disco */}
      <path d="M13.4 22.5 L7.2 37.4 L13.1 34.6 L17.6 38.6 L22.2 26.4 Z" fill={`url(#${uid}-ribbon2)`} />
      <path d="M26.6 22.5 L32.8 37.4 L26.9 34.6 L22.4 38.6 L17.8 26.4 Z" fill={`url(#${uid}-ribbon)`} />

      {/* raios do disco */}
      <g opacity="0.9">
        {Array.from({ length: 16 }, (_, i) => {
          const angle = (i * 360) / 16
          return (
            <rect
              key={i}
              x="19.3"
              y="0.6"
              width="1.4"
              height="4"
              rx="0.7"
              fill="#f6c344"
              transform={`rotate(${angle} 20 14.5)`}
            />
          )
        })}
      </g>

      {/* disco */}
      <circle cx="20" cy="14.5" r="11.4" fill="#b8770d" />
      <circle cx="20" cy="14.5" r="10.4" fill={`url(#${uid}-disc)`} />
      <circle cx="20" cy="14.5" r="7.6" fill="none" stroke="#fff6cf" strokeOpacity="0.55" strokeWidth="1.1" />

      {/* reflexo */}
      <ellipse cx="16.6" cy="10.4" rx="4.1" ry="2.6" fill="#fffdf2" opacity="0.55" transform="rotate(-28 16.6 10.4)" />
    </svg>
  )
}
