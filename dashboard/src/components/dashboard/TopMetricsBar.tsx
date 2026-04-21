import { Activity, AlertTriangle, FileText, FlaskConical } from 'lucide-react'
import { hexToRgb } from '@/lib/utils'
import { REPORTES_MOCK } from '@/lib/mocks/reportes'
import { CASOS_NOTI_MOCK } from '@/lib/mocks/casosNoti'
import { CASOS_NETLAB_MOCK } from '@/lib/mocks/casosNetlab'

const totalReportes = REPORTES_MOCK.length
const criaderosCriticos = REPORTES_MOCK.filter(r => r.observa_larvas === 'si').length
const netlabPositivos = CASOS_NETLAB_MOCK.filter(c => c.dx_molecular_dengue === 'Positivo').length
const seActual = Math.max(...CASOS_NOTI_MOCK.map(c => c.semana_epidemiologica))

const METRICS = [
  {
    label: 'Reportes activos',
    value: String(totalReportes),
    delta: `${criaderosCriticos} críticos`,
    icon: FileText,
    color: '#22d3ee',
  },
  {
    label: 'Criaderos críticos',
    value: String(criaderosCriticos),
    delta: `${Math.round((criaderosCriticos / totalReportes) * 100)}% del total`,
    icon: AlertTriangle,
    color: '#f87171',
  },
  {
    label: 'Confirmados NETLAB',
    value: String(netlabPositivos),
    delta: 'DENV-2 dominante',
    icon: FlaskConical,
    color: '#f87171',
  },
  {
    label: 'Semana epidemiológica',
    value: `SE ${seActual}`,
    delta: '2026',
    icon: Activity,
    color: '#34d399',
  },
]

export function TopMetricsBar() {
  return (
    <header
      className="shrink-0 px-4 py-3 flex items-center gap-4 border-b"
      style={{
        background: 'rgba(7,18,36,0.9)',
        backdropFilter: 'blur(12px)',
        borderColor: 'rgba(255,255,255,0.06)',
      }}
    >
      <div className="mr-2 hidden lg:block shrink-0">
        <h1
          className="text-sm font-semibold tracking-widest uppercase font-mono"
          style={{ color: '#22d3ee', textShadow: '0 0 10px rgba(34,211,238,0.5)' }}
        >
          SIVAPRE
        </h1>
        <p className="text-[10px] text-slate-500">Dashboard de gestión</p>
      </div>

      <div
        className="hidden lg:block w-px h-8 shrink-0"
        style={{ background: 'rgba(34,211,238,0.12)' }}
        aria-hidden
      />

      <div
        className="flex items-center gap-3 flex-1 overflow-x-auto"
        role="list"
        aria-label="KPIs del sistema"
      >
        {METRICS.map(({ label, value, delta, icon: Icon, color }) => {
          const rgb = hexToRgb(color)
          return (
            <div
              key={label}
              className="flex items-center gap-3 px-4 py-2 rounded-lg shrink-0"
              style={{
                background: `rgba(${rgb}, 0.05)`,
                border: `1px solid rgba(${rgb}, 0.2)`,
                boxShadow: `0 0 16px rgba(${rgb}, 0.1)`,
              }}
              role="listitem"
              aria-label={`${label}: ${value}`}
            >
              <Icon size={16} style={{ color, flexShrink: 0 }} aria-hidden />
              <div>
                <p
                  className="text-xl font-bold leading-none font-mono"
                  style={{ color, textShadow: `0 0 8px rgba(${rgb}, 0.5)` }}
                >
                  {value}
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">{label}</p>
              </div>
              <span className="text-[10px] text-slate-600 ml-1 hidden xl:block">{delta}</span>
            </div>
          )
        })}
      </div>
    </header>
  )
}
