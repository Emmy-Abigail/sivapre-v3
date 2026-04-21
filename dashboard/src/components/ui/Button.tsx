import { cn } from '@/lib/utils'
import { ButtonHTMLAttributes } from 'react'

export type ButtonVariant = 'cyan' | 'crimson' | 'ghost'
export type ButtonSize = 'sm' | 'xs'

const STYLES: Record<ButtonVariant, React.CSSProperties> = {
  cyan:    { background: 'rgba(34,211,238,0.10)',  color: '#22d3ee', border: '1px solid rgba(34,211,238,0.3)'   },
  crimson: { background: 'rgba(239,68,68,0.10)',   color: '#f87171', border: '1px solid rgba(239,68,68,0.3)'    },
  ghost:   { background: 'transparent',            color: '#94a3b8', border: '1px solid rgba(255,255,255,0.08)' },
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
}

export function Button({ children, variant = 'ghost', size = 'sm', className, ...props }: ButtonProps) {
  const sizeClass = size === 'xs' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1.5 text-xs'
  return (
    <button
      className={cn(
        'rounded font-mono font-medium transition-opacity hover:opacity-80 active:opacity-60 cursor-pointer',
        sizeClass,
        className,
      )}
      style={STYLES[variant]}
      {...props}
    >
      {children}
    </button>
  )
}
