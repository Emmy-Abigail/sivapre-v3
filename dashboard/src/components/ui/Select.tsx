import { SelectHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface SelectOption { value: string; label: string }

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: readonly SelectOption[]
  label?: string
}

export function Select({ options, label, id, className, disabled, ...props }: SelectProps) {
  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label
          htmlFor={id}
          className="text-[10px] text-slate-500 uppercase tracking-wider font-mono"
        >
          {label}
        </label>
      )}
      <select
        id={id}
        disabled={disabled}
        className={cn(
          'rounded px-3 py-1.5 text-xs font-mono outline-none',
          disabled
            ? 'text-slate-600 cursor-not-allowed opacity-50'
            : 'text-slate-300 cursor-pointer',
          className,
        )}
        style={{
          background: 'rgba(10,25,48,0.85)',
          border: '1px solid rgba(34,211,238,0.18)',
          backdropFilter: 'blur(8px)',
        }}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value} style={{ background: '#071224' }}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  )
}
