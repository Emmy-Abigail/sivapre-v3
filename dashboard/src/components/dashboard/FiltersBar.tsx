'use client'
import { Select } from '@/components/ui/Select'
import {
  FILTRO_DEPARTAMENTOS,
  FILTRO_PROVINCIAS,
  FILTRO_DISTRITOS,
  RANGOS_TEMPORALES,
} from '@/config/regiones'
import type { FiltrosDashboard } from '@/types'

interface FiltersBarProps {
  filtros: FiltrosDashboard
  onChange: (key: keyof FiltrosDashboard, value: string) => void
}

export function FiltersBar({ filtros, onChange }: FiltersBarProps) {
  return (
    <div
      className="shrink-0 px-4 py-2 flex items-end gap-4 flex-wrap border-b"
      style={{
        background: 'rgba(7,18,36,0.6)',
        borderColor: 'rgba(255,255,255,0.04)',
        backdropFilter: 'blur(8px)',
      }}
      role="toolbar"
      aria-label="Filtros del dashboard"
    >
      <Select
        id="fil-depto"
        label="Departamento"
        options={FILTRO_DEPARTAMENTOS}
        value={filtros.departamento}
        disabled
        onChange={() => {}}
      />
      <Select
        id="fil-prov"
        label="Provincia"
        options={FILTRO_PROVINCIAS}
        value={filtros.provincia}
        disabled
        onChange={() => {}}
      />
      <Select
        id="fil-dist"
        label="Distrito"
        options={FILTRO_DISTRITOS}
        value={filtros.distrito}
        onChange={e => onChange('distrito', e.target.value)}
      />
      <Select
        id="fil-rango"
        label="Período"
        options={RANGOS_TEMPORALES}
        value={filtros.rango}
        onChange={e => onChange('rango', e.target.value)}
      />
      <div className="flex items-center gap-2 ml-auto pb-1">
        <span className="text-[10px] text-slate-600 font-mono">Piloto · Loreto · Maynas</span>
        <span
          className="w-2 h-2 rounded-full animate-pulse-cyan"
          style={{ background: '#22d3ee', boxShadow: '0 0 6px #22d3ee' }}
          aria-hidden
          title="Sistema activo"
        />
      </div>
    </div>
  )
}
