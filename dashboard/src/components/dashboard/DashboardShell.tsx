'use client'
import dynamic from 'next/dynamic'
import { useState } from 'react'
import { Sidebar } from './Sidebar'
import { TopMetricsBar } from './TopMetricsBar'
import { FiltersBar } from './FiltersBar'
import { VitalSignsPanel } from './VitalSignsPanel'
import { RealtimeFeed } from './RealtimeFeed'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/lib/hooks/useAuth'
import type { FiltrosDashboard } from '@/types'

const MapPanel = dynamic(
  () => import('@/components/map/MapPanel').then(m => ({ default: m.MapPanel })),
  {
    ssr: false,
    loading: () => (
      <div
        className="glass-card flex-1 flex items-center justify-center radar-grid"
        style={{ minHeight: 260 }}
        aria-busy="true"
        aria-label="Cargando mapa"
      >
        <p className="text-xs font-mono text-slate-500 animate-pulse-cyan">Cargando mapa…</p>
      </div>
    ),
  },
)

const DEFAULT_FILTROS: FiltrosDashboard = {
  departamento: 'LORETO',
  provincia: 'MAYNAS',
  distrito: 'todos',
  rango: '30d',
}

export function DashboardShell() {
  const [filtros, setFiltros] = useState<FiltrosDashboard>(DEFAULT_FILTROS)
  const { isChecking, isAuthenticated, login, logout } = useAuth()

  function handleChange(key: keyof FiltrosDashboard, value: string) {
    setFiltros(prev => ({ ...prev, [key]: value } as FiltrosDashboard))
  }

  // Hydrating localStorage — render nothing to avoid flash
  if (isChecking) return null

  // Not logged in — show login form
  if (!isAuthenticated) {
    return (
      <LoginForm
        onLogin={login.mutateAsync}
        isPending={login.isPending}
        errorMessage={
          login.isError
            ? 'Credenciales incorrectas o servidor no disponible'
            : null
        }
      />
    )
  }

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#050d1a' }}>
      <Sidebar onLogout={logout} />
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        <TopMetricsBar />
        <FiltersBar filtros={filtros} onChange={handleChange} />
        <main className="flex-1 overflow-hidden p-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-4 h-full">
            <MapPanel filtros={filtros} className="h-full" />
            <div className="flex flex-col gap-4 min-h-0 overflow-hidden">
              <div className="shrink-0">
                <VitalSignsPanel filtros={filtros} />
              </div>
              <RealtimeFeed filtros={filtros} className="flex-1 min-h-0" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
