import type { LucideIcon } from 'lucide-react'
import { cn, hexToRgb } from '@/lib/utils'

type KpiTendencia = 'alerta' | 'estable' | 'mejora' | 'neutro'

interface KpiCardProps {
  label: string
  value: string | number
  delta?: string
  icon: LucideIcon
  color?: string
  tendencia?: KpiTendencia
  className?: string
}

const TENDENCIA_COLOR: Record<KpiTendencia, string> = {
  alerta:  '#f87171',
  estable: '#fbbf24',
  mejora:  '#34d399',
  neutro:  '#22d3ee',
}

export function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  color,
  tendencia = 'neutro',
  className,
}: KpiCardProps) {
  const c = color ?? TENDENCIA_COLOR[tendencia]
  const rgb = hexToRgb(c)

  return (
    <div
      className={cn('glass-card flex items-center gap-3 px-4 py-3', className)}
      style={{
        borderColor: `rgba(${rgb}, 0.25)`,
        boxShadow: `0 0 20px rgba(${rgb}, 0.07)`,
      }}
      role="status"
      aria-label={`${label}: ${value}`}
    >
      <div
        className="shrink-0 p-2 rounded-lg"
        style={{ background: `rgba(${rgb}, 0.12)` }}
      >
        <Icon size={18} style={{ color: c }} aria-hidden />
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="text-2xl font-bold font-mono leading-none"
          style={{ color: c, textShadow: `0 0 8px rgba(${rgb}, 0.5)` }}
        >
          {value}
        </p>
        <p className="text-[11px] text-slate-500 mt-1 truncate">{label}</p>
      </div>
      {delta && (
        <span
          className="text-[10px] font-mono shrink-0 hidden sm:block"
          style={{ color: `rgba(${rgb}, 0.65)` }}
        >
          {delta}
        </span>
      )}
    </div>
  )
}
