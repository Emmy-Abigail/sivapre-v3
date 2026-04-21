import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

type CardVariant = 'default' | 'cyan' | 'crimson'

const VARIANT_CLASS: Record<CardVariant, string> = {
  default: 'glass-card',
  cyan:    'glass-card-cyan',
  crimson: 'glass-card-crimson',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant
}

export function Card({ children, variant = 'default', className, ...props }: CardProps) {
  return (
    <div className={cn(VARIANT_CLASS[variant], className)} {...props}>
      {children}
    </div>
  )
}
