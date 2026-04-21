'use client'
import { formatDistanceToNow, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { Clock, UserCheck, AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import type { BadgeVariant } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { REPORTES_MOCK } from '@/lib/mocks/reportes'
import { cn } from '@/lib/utils'
import type { FiltrosDashboard } from '@/types'

interface RealtimeFeedProps {
  filtros?: FiltrosDashboard
  className?: string
}

const ESTADO_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  enviado:     { variant: 'cyan',    label: 'Enviado' },
  en_revision: { variant: 'amber',   label: 'En revisión' },
  verificado:  { variant: 'emerald', label: 'Verificado' },
  resuelto:    { variant: 'slate',   label: 'Resuelto' },
}

const LARVAS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  si:        { variant: 'crimson', label: '⚠ Larvas' },
  no_seguro: { variant: 'amber',   label: 'Dudoso' },
  no:        { variant: 'slate',   label: 'Sin larvas' },
}

const SORTED = [...REPORTES_MOCK].sort(
  (a, b) => new Date(b.fecha_reporte).getTime() - new Date(a.fecha_reporte).getTime(),
)

export function RealtimeFeed({ className }: RealtimeFeedProps) {
  return (
    <section className={cn('glass-card flex flex-col overflow-hidden', className)}>
      <div
        className="shrink-0 px-4 py-3 flex items-center justify-between border-b"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={14} style={{ color: '#fbbf24' }} aria-hidden />
          <h2
            className="text-xs font-mono font-semibold tracking-wider"
            style={{ color: '#fbbf24' }}
          >
            REPORTES EN TIEMPO REAL
          </h2>
        </div>
        <span className="text-[10px] font-mono text-slate-600">{SORTED.length} total</span>
      </div>

      <ul className="flex-1 overflow-y-auto" role="feed" aria-label="Reportes recientes">
        {SORTED.map(r => {
          const estado = ESTADO_BADGE[r.estado] ?? { variant: 'slate' as BadgeVariant, label: r.estado }
          const larvas = LARVAS_BADGE[r.observa_larvas] ?? { variant: 'slate' as BadgeVariant, label: r.observa_larvas }
          const isAlert = r.observa_larvas === 'si'
          const timeAgo = formatDistanceToNow(parseISO(r.fecha_reporte), {
            addSuffix: true,
            locale: es,
          })

          return (
            <li
              key={r.id}
              className="px-4 py-3 flex items-start gap-3 hover:bg-white/[0.02] transition-colors"
              style={{
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                borderLeft: `2px solid ${isAlert ? 'rgba(248,113,113,0.5)' : 'transparent'}`,
              }}
            >
              <span
                className="shrink-0 mt-1 w-2 h-2 rounded-full block"
                style={{
                  background: isAlert ? '#f87171' : '#22d3ee',
                  boxShadow: isAlert ? '0 0 6px rgba(248,113,113,0.5)' : undefined,
                }}
                aria-hidden
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-300 truncate">
                    {r.tipo_lugar}
                  </span>
                  <span className="text-[10px] text-slate-600 shrink-0">· {r.tipo_objeto}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  <Badge variant={estado.variant}>{estado.label}</Badge>
                  <Badge variant={larvas.variant}>{larvas.label}</Badge>
                </div>
                <div className="flex items-center gap-1 mt-1.5">
                  <Clock size={10} className="text-slate-600 shrink-0" aria-hidden />
                  <span className="text-[10px] text-slate-600 font-mono">{timeAgo}</span>
                </div>
              </div>

              <Button
                size="xs"
                variant={r.estado === 'enviado' ? 'cyan' : 'ghost'}
                aria-label={`Asignar reporte ${r.id.slice(0, 8)}`}
                onClick={() => console.log('Asignar:', r.id)}
                className="shrink-0"
              >
                <UserCheck size={11} className="inline mr-1" aria-hidden />
                Asignar
              </Button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
