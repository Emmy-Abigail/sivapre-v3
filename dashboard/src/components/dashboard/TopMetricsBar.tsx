import { Activity, AlertTriangle, FileText, FlaskConical } from 'lucide-react'

const METRICS = [
  {
    label: 'Reportes activos',
    value: '247',
    delta: '+12 hoy',
    icon: FileText,
    color: '#22d3ee',
    glow: 'rgba(34, 211, 238, 0.15)',
  },
  {
    label: 'Alertas críticas',
    value: '18',
    delta: '+3 nuevas',
    icon: AlertTriangle,
    color: '#f87171',
    glow: 'rgba(248, 113, 113, 0.15)',
  },
  {
    label: 'Casos confirmados',
    value: '64',
    delta: 'DENV-2 dominante',
    icon: FlaskConical,
    color: '#f87171',
    glow: 'rgba(248, 113, 113, 0.10)',
  },
  {
    label: 'Semana epidemiológica',
    value: 'SE 16',
    delta: '2026',
    icon: Activity,
    color: '#34d399',
    glow: 'rgba(52, 211, 153, 0.12)',
  },
]

export function TopMetricsBar() {
  return (
    <header
      className="shrink-0 px-4 py-3 flex items-center gap-4 border-b"
      style={{
        background: 'rgba(7, 18, 36, 0.9)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255, 255, 255, 0.06)',
      }}
    >
      {/* Título */}
      <div className="mr-4 hidden lg:block">
        <h1
          className="text-sm font-semibold tracking-widest uppercase font-mono"
          style={{ color: '#22d3ee', textShadow: '0 0 10px rgba(34,211,238,0.5)' }}
        >
          SIVAPRE
        </h1>
        <p className="text-xs text-slate-500">Dashboard de gestión</p>
      </div>

      {/* Separador */}
      <div
        className="hidden lg:block w-px h-8 shrink-0"
        style={{ background: 'rgba(34, 211, 238, 0.15)' }}
      />

      {/* KPIs */}
      <div className="flex items-center gap-3 flex-1 overflow-x-auto">
        {METRICS.map(({ label, value, delta, icon: Icon, color, glow }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-2 rounded-lg shrink-0"
            style={{
              background: `rgba(${hexToRgb(color)}, 0.05)`,
              border: `1px solid rgba(${hexToRgb(color)}, 0.2)`,
              boxShadow: `0 0 16px ${glow}`,
            }}
          >
            <Icon size={16} style={{ color, flexShrink: 0 }} />
            <div>
              <p
                className="text-xl font-bold leading-none font-mono"
                style={{ color, textShadow: `0 0 8px ${glow}` }}
              >
                {value}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
            </div>
            <span className="text-[10px] text-slate-600 ml-1 hidden xl:block">
              {delta}
            </span>
          </div>
        ))}
      </div>
    </header>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
