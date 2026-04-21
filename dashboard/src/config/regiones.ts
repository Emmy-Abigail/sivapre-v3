// Constantes geográficas del piloto SIVAPRE — Loreto, Perú

export const DEPARTAMENTOS = ['LORETO'] as const
export type Departamento = (typeof DEPARTAMENTOS)[number]

export const PROVINCIAS_LORETO = ['MAYNAS'] as const
export type Provincia = (typeof PROVINCIAS_LORETO)[number]

export const DISTRITOS_PILOTO = [
  'IQUITOS',
  'PUNCHANA',
  'BELEN',
] as const
export type DistritoPiloto = (typeof DISTRITOS_PILOTO)[number]

// Ubigeos INEI de los distritos del piloto
export const UBIGEOS: Record<DistritoPiloto, string> = {
  IQUITOS: '160101',
  PUNCHANA: '160106',
  BELEN: '160104',
}

// Centro geográfico de Iquitos para el mapa
export const IQUITOS_CENTER: [number, number] = [-73.2516, -3.7437] // [lng, lat]
export const IQUITOS_ZOOM = 12

// Bounding box aproximado de los 3 distritos
export const IQUITOS_BOUNDS: [[number, number], [number, number]] = [
  [-73.32, -3.85], // SW [lng, lat]
  [-73.18, -3.65], // NE [lng, lat]
]

// Rangos temporales disponibles en los filtros
export const RANGOS_TEMPORALES = [
  { value: '7d', label: 'Última semana' },
  { value: '30d', label: 'Último mes' },
  { value: '90d', label: 'Últimos 3 meses' },
] as const
export type RangoTemporal = '7d' | '30d' | '90d'

// Opciones para el selector de región en el FiltersBar
export const FILTRO_DEPARTAMENTOS = [
  { value: 'LORETO', label: 'Loreto' },
]

export const FILTRO_PROVINCIAS = [
  { value: 'MAYNAS', label: 'Maynas' },
]

export const FILTRO_DISTRITOS = [
  { value: 'todos', label: 'Todos los distritos' },
  { value: 'IQUITOS', label: 'Iquitos Cercado' },
  { value: 'PUNCHANA', label: 'Punchana' },
  { value: 'BELEN', label: 'Belén' },
]

// Capas del mapa (para los toggles en MapPanel)
export const CAPAS_MAPA = [
  {
    id: 'criaderos',
    label: 'Criaderos',
    color: '#22d3ee',
    description: 'Reportes ciudadanos de criaderos de zancudos',
  },
  {
    id: 'noti',
    label: 'NOTI',
    color: '#60a5fa',
    description: 'Casos sospechosos/probables/confirmados CDC Perú',
  },
  {
    id: 'netlab',
    label: 'NETLAB',
    color: '#f87171',
    description: 'Casos confirmados por laboratorio (INS)',
  },
] as const
export type CapaMapa = (typeof CAPAS_MAPA)[number]['id']
