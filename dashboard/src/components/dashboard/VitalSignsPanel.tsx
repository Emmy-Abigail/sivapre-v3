import { TrendingUp } from 'lucide-react'

const WEEKLY_DATA = [12, 19, 15, 28, 22, 35, 31, 42, 38, 51, 45, 64]
const LABELS = ['SE 5', 'SE 6', 'SE 7', 'SE 8', 'SE 9', 'SE 10', 'SE 11', 'SE 12', 'SE 13', 'SE 14', 'SE 15', 'SE 16']

const W = 320
const H = 90
const PADDING = { top: 10, right: 8, bottom: 20, left: 28 }

function toSvgCoords(data: number[]) {
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const chartW = W - PADDING.left - PADDING.right
  const chartH = H - PADDING.top - PADDING.bottom

  return data.map((v, i) => ({
    x: PADDING.left + (i / (data.length - 1)) * chartW,
    y: PADDING.top + chartH - ((v - min) / range) * chartH,
    value: v,
  }))
}

export function VitalSignsPanel() {
  const points = toSvgCoords(WEEKLY_DATA)
  const polyline = points.map((p) => `${p.x},${p.y}`).join(' ')
  const areaPath = `M ${points[0].x},${H - PADDING.bottom} ${points.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${points[points.length - 1].x},${H - PADDING.bottom} Z`

  const last = points[points.length - 1]
  const prev = points[points.length - 2]
  const trend = last.value > prev.value

  return (
    <section
      className="glass-card-cyan p-4 flex flex-col gap-3"
      aria-label="Tendencia semanal de casos"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} style={{ color: '#22d3ee' }} />
          <span className="text-sm font-medium text-slate-300">
            Tendencia semanal — Casos activos
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="text-xs font-mono font-bold"
            style={{ color: trend ? '#f87171' : '#34d399' }}
          >
            {trend ? '▲' : '▼'} {Math.abs(WEEKLY_DATA[WEEKLY_DATA.length - 1] - WEEKLY_DATA[WEEKLY_DATA.length - 2])}
          </span>
          <span className="text-xs text-slate-600">vs SE anterior</span>
        </div>
      </div>

      {/* SVG Chart */}
      <div className="w-full overflow-hidden">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ height: H }}
          role="img"
          aria-label="Gráfico de tendencia de casos por semana epidemiológica"
        >
          {/* Líneas de cuadrícula horizontales */}
          {[0, 0.25, 0.5, 0.75, 1].map((t) => {
            const y = PADDING.top + t * (H - PADDING.top - PADDING.bottom)
            return (
              <line
                key={t}
                x1={PADDING.left}
                y1={y}
                x2={W - PADDING.right}
                y2={y}
                stroke="rgba(34, 211, 238, 0.07)"
                strokeWidth="1"
              />
            )
          })}

          {/* Área rellena con gradiente */}
          <defs>
            <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={areaPath} fill="url(#areaGrad)" />

          {/* Línea principal */}
          <polyline
            points={polyline}
            fill="none"
            stroke="#22d3ee"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Punto actual */}
          <circle
            cx={last.x}
            cy={last.y}
            r="3"
            fill="#22d3ee"
            style={{ filter: 'drop-shadow(0 0 4px #22d3ee)' }}
          />
          <circle cx={last.x} cy={last.y} r="5" fill="none" stroke="#22d3ee" strokeWidth="1" strokeOpacity="0.4" />

          {/* Etiquetas eje X — solo primero, medio y último */}
          {[0, Math.floor(LABELS.length / 2), LABELS.length - 1].map((i) => (
            <text
              key={i}
              x={points[i].x}
              y={H - 4}
              textAnchor="middle"
              fontSize="8"
              fill="#334155"
              fontFamily="monospace"
            >
              {LABELS[i]}
            </text>
          ))}

          {/* Valor actual */}
          <text
            x={last.x - 2}
            y={last.y - 8}
            textAnchor="middle"
            fontSize="9"
            fill="#22d3ee"
            fontFamily="monospace"
            style={{ filter: 'drop-shadow(0 0 3px rgba(34,211,238,0.8))' }}
          >
            {WEEKLY_DATA[WEEKLY_DATA.length - 1]}
          </text>
        </svg>
      </div>

      {/* Footer stats */}
      <div className="flex justify-between text-[10px] font-mono text-slate-600">
        <span>Mín: {Math.min(...WEEKLY_DATA)}</span>
        <span style={{ color: 'rgba(34, 211, 238, 0.5)' }}>SE 5 → SE 16 · 2026</span>
        <span>Máx: {Math.max(...WEEKLY_DATA)}</span>
      </div>
    </section>
  )
}
