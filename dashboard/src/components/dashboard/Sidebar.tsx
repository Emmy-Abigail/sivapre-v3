'use client'

import {
  Activity,
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  Map,
  Settings,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard', active: true },
  { icon: Map,             label: 'Mapa',       active: false },
  { icon: Activity,        label: 'Actividad',  active: false },
  { icon: Users,           label: 'Usuarios',   active: false },
  { icon: AlertTriangle,   label: 'Alertas',    active: false },
  { icon: Settings,        label: 'Config.',    active: false },
]

interface SidebarProps {
  onLogout?: () => void
}

export function Sidebar({ onLogout }: SidebarProps) {
  return (
    <aside
      className="flex flex-col items-center w-16 shrink-0 border-r py-4 gap-2"
      style={{
        backgroundColor: '#071224',
        borderColor: 'rgba(34, 211, 238, 0.15)',
      }}
      aria-label="Navegación principal"
    >
      {/* Logo */}
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center mb-4 text-xs font-bold font-mono"
        style={{
          background: 'rgba(34, 211, 238, 0.15)',
          border: '1px solid rgba(34, 211, 238, 0.4)',
          color: '#22d3ee',
          textShadow: '0 0 8px rgba(34, 211, 238, 0.8)',
        }}
      >
        SV
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 w-full px-2 flex-1" role="navigation">
        {NAV_ITEMS.map(({ icon: Icon, label, active }) => (
          <button
            key={label}
            aria-label={label}
            title={label}
            className={cn(
              'w-full flex items-center justify-center h-10 rounded-lg transition-all duration-200 relative group',
              active
                ? 'bg-cyan-500/10 text-cyan-400'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            )}
            style={
              active
                ? { boxShadow: '0 0 12px rgba(34, 211, 238, 0.15)', border: '1px solid rgba(34, 211, 238, 0.25)' }
                : {}
            }
          >
            <Icon size={18} strokeWidth={active ? 2 : 1.5} />
            <span
              className="absolute left-full ml-3 px-2 py-1 rounded text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{
                background: '#0a1930',
                border: '1px solid rgba(34, 211, 238, 0.2)',
                color: '#94a3b8',
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </nav>

      {/* Logout */}
      {onLogout && (
        <div className="w-full px-2 mt-auto">
          <button
            onClick={onLogout}
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="w-full flex items-center justify-center h-10 rounded-lg transition-all duration-200 relative group text-slate-600 hover:text-slate-300 hover:bg-white/5"
          >
            <LogOut size={16} strokeWidth={1.5} />
            <span
              className="absolute left-full ml-3 px-2 py-1 rounded text-xs font-medium whitespace-nowrap pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-50"
              style={{
                background: '#0a1930',
                border: '1px solid rgba(34, 211, 238, 0.2)',
                color: '#94a3b8',
              }}
            >
              Cerrar sesión
            </span>
          </button>
        </div>
      )}
    </aside>
  )
}
