import { Layers, Map } from 'lucide-react'

const LAYER_TOGGLES = [
  { label: 'Criaderos', color: '#22d3ee', active: true },
  { label: 'NOTI', color: '#60a5fa', active: true },
  { label: 'NETLAB', color: '#f87171', active: false },
]

export function MapPlaceholder() {
  return (
    <section
      className="relative rounded-xl overflow-hidden flex flex-col radar-grid"
      style={{
        minHeight: '420px',
        background: '#050d1a',
        border: '1px solid rgba(34, 211, 238, 0.15)',
        boxShadow: '0 0 40px rgba(34, 211, 238, 0.04)',
      }}
      aria-label="Panel de mapa de riesgo"
    >
      {/* Header del panel */}
      <div
        className="flex items-center justify-between px-4 py-3 shrink-0"
        style={{
          background: 'rgba(7, 18, 36, 0.7)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(34, 211, 238, 0.1)',
        }}
      >
        <div className="flex items-center gap-2">
          <Map size={15} style={{ color: '#22d3ee' }} />
          <span className="text-sm font-medium text-slate-300">
            Mapa de riesgo — Iquitos, Loreto
          </span>
        </div>

        {/* Toggles de capa */}
        <div className="flex items-center gap-2">
          <Layers size={13} className="text-slate-500" />
          {LAYER_TOGGLES.map(({ label, color, active }) => (
            <button
              key={label}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs transition-all"
              style={{
                background: active ? `rgba(${hexToRgb(color)}, 0.12)` : 'rgba(255,255,255,0.04)',
                border: `1px solid ${active ? `rgba(${hexToRgb(color)}, 0.35)` : 'rgba(255,255,255,0.08)'}`,
                color: active ? color : '#64748b',
              }}
              aria-pressed={active}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: active ? color : '#475569' }}
              />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Área del mapa */}
      <div className="flex-1 flex items-center justify-center relative">
        {/* Efecto radar de fondo */}
        <div
          className="absolute inset-0 flex items-center justify-center pointer-events-none"
          aria-hidden="true"
        >
          {[180, 130, 80].map((size) => (
            <div
              key={size}
              className="absolute rounded-full"
              style={{
                width: size,
                height: size,
                border: '1px solid rgba(34, 211, 238, 0.08)',
              }}
            />
          ))}
          <div
            className="absolute w-px"
            style={{
              height: 180,
              background: 'linear-gradient(transparent, rgba(34, 211, 238, 0.15), transparent)',
            }}
          />
          <div
            className="absolute h-px"
            style={{
              width: 180,
              background: 'linear-gradient(to right, transparent, rgba(34, 211, 238, 0.15), transparent)',
            }}
          />
        </div>

        {/* Mensaje placeholder */}
        <div className="text-center z-10">
          <div
            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: 'rgba(34, 211, 238, 0.08)',
              border: '1px solid rgba(34, 211, 238, 0.25)',
            }}
          >
            <Map size={24} style={{ color: '#22d3ee' }} />
          </div>
          <p className="text-slate-400 text-sm font-medium mb-1">
            Cargando mapa de riesgo…
          </p>
          <p className="text-slate-600 text-xs">
            Configura{' '}
            <code
              className="font-mono text-cyan-400/70 px-1 py-0.5 rounded"
              style={{ background: 'rgba(34, 211, 238, 0.08)' }}
            >
              NEXT_PUBLIC_MAPBOX_TOKEN
            </code>
          </p>

          {/* Anillo de carga */}
          <div className="mt-5 flex justify-center">
            <div
              className="w-8 h-8 rounded-full animate-spin"
              style={{
                border: '2px solid rgba(34, 211, 238, 0.1)',
                borderTopColor: '#22d3ee',
              }}
              role="status"
              aria-label="Cargando"
            />
          </div>
        </div>
      </div>

      {/* Coordenadas decorativas */}
      <div
        className="px-4 py-2 flex items-center justify-between text-[10px] font-mono shrink-0"
        style={{
          background: 'rgba(7, 18, 36, 0.6)',
          borderTop: '1px solid rgba(34, 211, 238, 0.08)',
          color: '#334155',
        }}
      >
        <span>LAT -3.7437°</span>
        <span style={{ color: 'rgba(34, 211, 238, 0.3)' }}>● IQUITOS CERCADO</span>
        <span>LNG -73.2516°</span>
      </div>
    </section>
  )
}

function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r}, ${g}, ${b}`
}
