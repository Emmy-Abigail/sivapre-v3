import { Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'

type TriajeEstado = 'Confirmado' | 'Sospechoso' | 'En revisión' | 'Resuelto'

interface Caso {
  id: string
  nombre: string
  distrito: string
  edad: number
  estado: TriajeEstado
  hace: string
  serotipo?: string
}

const CASOS_MOCK: Caso[] = [
  { id: '1', nombre: 'P. Ríos V.', distrito: 'Iquitos Cercado', edad: 34, estado: 'Confirmado', hace: '12 min', serotipo: 'DENV-2' },
  { id: '2', nombre: 'M. Flores C.', distrito: 'Belén', edad: 22, estado: 'Sospechoso', hace: '38 min' },
  { id: '3', nombre: 'J. Panduro A.', distrito: 'Punchana', edad: 45, estado: 'En revisión', hace: '1 h' },
  { id: '4', nombre: 'L. García T.', distrito: 'Iquitos Cercado', edad: 18, estado: 'Confirmado', hace: '2 h', serotipo: 'DENV-2' },
  { id: '5', nombre: 'C. Vásquez M.', distrito: 'Belén', edad: 61, estado: 'Sospechoso', hace: '3 h' },
  { id: '6', nombre: 'A. Torres N.', distrito: 'Punchana', edad: 29, estado: 'Resuelto', hace: '5 h' },
]

const ESTADO_CONFIG: Record<TriajeEstado, { color: string; bg: string; border: string }> = {
  Confirmado: {
    color: '#f87171',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
  },
  Sospechoso: {
    color: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
  },
  'En revisión': {
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.1)',
    border: 'rgba(34, 211, 238, 0.3)',
  },
  Resuelto: {
    color: '#34d399',
    bg: 'rgba(16, 185, 129, 0.08)',
    border: 'rgba(52, 211, 153, 0.25)',
  },
}

function Badge({ estado }: { estado: TriajeEstado }) {
  const cfg = ESTADO_CONFIG[estado]
  return (
    <span
      className="text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}
    >
      {estado}
    </span>
  )
}

export function PatientListPanel() {
  return (
    <section
      className="glass-card flex flex-col flex-1 overflow-hidden"
      style={{ border: '1px solid rgba(255, 255, 255, 0.06)' }}
      aria-label="Lista de casos recientes"
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}
      >
        <div className="flex items-center gap-2">
          <Users size={14} style={{ color: '#22d3ee' }} />
          <span className="text-sm font-medium text-slate-300">Casos recientes</span>
        </div>
        <span className="text-[10px] font-mono text-slate-600">
          {CASOS_MOCK.filter(c => c.estado === 'Confirmado').length} confirmados
        </span>
      </div>

      {/* Lista */}
      <ul className="flex-1 overflow-y-auto divide-y" style={{ divideColor: 'rgba(255,255,255,0.04)' }}>
        {CASOS_MOCK.map((caso) => (
          <li
            key={caso.id}
            className={cn(
              'px-4 py-3 flex items-center gap-3 hover:bg-white/[0.02] transition-colors',
              caso.estado === 'Resuelto' && 'opacity-50'
            )}
          >
            {/* Indicador de estado */}
            <div
              className="w-1.5 h-8 rounded-full shrink-0"
              style={{ background: ESTADO_CONFIG[caso.estado].color, opacity: 0.7 }}
              aria-hidden="true"
            />

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-sm font-medium text-slate-200 truncate">
                  {caso.nombre}
                </span>
                {caso.serotipo && (
                  <span
                    className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                    style={{
                      background: 'rgba(248, 113, 113, 0.1)',
                      color: '#f87171',
                      border: '1px solid rgba(248, 113, 113, 0.25)',
                    }}
                  >
                    {caso.serotipo}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-[11px] text-slate-600">
                <span>{caso.distrito}</span>
                <span>·</span>
                <span>{caso.edad} años</span>
              </div>
            </div>

            {/* Badge + tiempo */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <Badge estado={caso.estado} />
              <span className="flex items-center gap-1 text-[10px] text-slate-700">
                <Clock size={9} />
                {caso.hace}
              </span>
            </div>
          </li>
        ))}
      </ul>

      {/* Footer */}
      <div
        className="px-4 py-2.5 shrink-0 text-center"
        style={{ borderTop: '1px solid rgba(255, 255, 255, 0.05)' }}
      >
        <button
          className="text-xs transition-colors"
          style={{ color: 'rgba(34, 211, 238, 0.6)' }}
          onMouseEnter={e => (e.currentTarget.style.color = '#22d3ee')}
          onMouseLeave={e => (e.currentTarget.style.color = 'rgba(34, 211, 238, 0.6)')}
        >
          Ver todos los casos →
        </button>
      </div>
    </section>
  )
}
