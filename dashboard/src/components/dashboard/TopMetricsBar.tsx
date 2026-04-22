'use client'
import { Activity, AlertTriangle, FileText, FlaskConical } from 'lucide-react'
import { getISOWeek, getISOWeekYear } from 'date-fns'
import { hexToRgb } from '@/lib/utils'
import { useKpis } from '@/lib/hooks/useKpis'

export function TopMetricsBar() {
  const { data: kpis, isLoading } = useKpis()
  const dash = isLoading ? '–' : undefined
  const v = (n?: number) => dash ?? String(n ?? 0)

  const now = new Date()
  const seActual = getISOWeek(now)
  const año      = getISOWeekYear(now)

  const pctCriticos = kpis && kpis.total_reportes > 0
    ? `${Math.round((kpis.reportes_con_larvas / kpis.total_reportes) * 100)}% del total`
    : '–'

  const METRICS = [
    {
      label: 'Reportes activos',
      value: v(kpis?.total_reportes),
      delta: `${v(kpis?.reportes_con_larvas)} críticos`,
      icon: FileText,
      color: '#22d3ee',
    },
    {
      label: 'Criaderos críticos',
      value: v(kpis?.reportes_con_larvas),
      delta: pctCriticos,
      icon: AlertTriangle,
      color: '#f87171',
    },
    {
      label: 'Confirmados NETLAB',
      value: v(kpis?.casos_confirmados),
      delta: 'DENV-2 dominante',
      icon: FlaskConical,
      color: '#f87171',
    },
    {
      label: 'Semana epidemiológica',
      value: `SE ${seActual}`,
      delta: String(año),
      icon: Activity,
      color: '#34d399',
    },
  ]

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
