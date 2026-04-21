import { cn } from '@/lib/utils'

export type BadgeVariant = 'cyan' | 'crimson' | 'amber' | 'emerald' | 'slate'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const STYLES: Record<BadgeVariant, React.CSSProperties> = {
  cyan:    { background: 'rgba(34,211,238,0.12)',  color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)'  },
  crimson: { background: 'rgba(239,68,68,0.12)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.3)'   },
  amber:   { background: 'rgba(251,191,36,0.12)',  color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)'  },
  emerald: { background: 'rgba(52,211,153,0.12)',  color: '#34d399', border: '1px solid rgba(52,211,153,0.3)'  },
  slate:   { background: 'rgba(148,163,184,0.10)', color: '#94a3b8', border: '1px solid rgba(148,163,184,0.2)' },
}

export function Badge({ children, variant = 'slate', className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wide whitespace-nowrap',
        className,
      )}
      style={STYLES[variant]}
    >
      {children}
    </span>
  )
}
