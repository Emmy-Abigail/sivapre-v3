'use client'
import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { Layers, Map as MapIcon } from 'lucide-react'
import { IQUITOS_CENTER, IQUITOS_ZOOM, CAPAS_MAPA } from '@/config/regiones'
import type { CapaMapa } from '@/config/regiones'
import { REPORTES_MOCK } from '@/lib/mocks/reportes'
import { CASOS_NOTI_MOCK } from '@/lib/mocks/casosNoti'
import { CASOS_NETLAB_MOCK } from '@/lib/mocks/casosNetlab'
import { cn } from '@/lib/utils'
import type { FiltrosDashboard } from '@/types'

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN

// ─── Centros aproximados por distrito ─────────────────────────
const DISTRICT_CENTERS: Record<string, [number, number]> = {
  IQUITOS:  [-73.2516, -3.7437],
  PUNCHANA: [-73.2483, -3.7043],
  BELEN:    [-73.2516, -3.7757],
}

function hashStr(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return h
}

function jitter(id: string, scale = 0.004): [number, number] {
  const h1 = hashStr(id)
  const h2 = hashStr(id + '_y')
  return [((h1 % 200) - 100) / 100 * scale, ((h2 % 200) - 100) / 100 * scale]
}

function districtCenter(name: string): [number, number] {
  return DISTRICT_CENTERS[name.toUpperCase()] ?? (IQUITOS_CENTER as [number, number])
}

// ─── GeoJSON features (computados una vez al cargar el módulo) ─
const criaderoFeatures = REPORTES_MOCK.map(r => ({
  type: 'Feature' as const,
  geometry: { type: 'Point' as const, coordinates: [r.longitud, r.latitud] as [number, number] },
  properties: {
    id: r.id,
    tipo_lugar: r.tipo_lugar,
    tipo_objeto: r.tipo_objeto,
    observa_larvas: r.observa_larvas,
    estado: r.estado,
    fecha: r.fecha_reporte,
  },
}))

const notiFeatures = CASOS_NOTI_MOCK.map(c => {
  const [cx, cy] = districtCenter(c.distrito)
  const [dx, dy] = jitter(c.id)
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [cx + dx, cy + dy] as [number, number] },
    properties: {
      id: c.id,
      id_caso: c.id_caso_noti,
      tipo: c.tipo_diagnostico,
      semana: c.semana_epidemiologica,
      distrito: c.distrito,
    },
  }
})

const netlabFeatures = CASOS_NETLAB_MOCK.map(c => {
  const [cx, cy] = districtCenter(c.distrito_paciente)
  const [dx, dy] = jitter(c.id)
  return {
    type: 'Feature' as const,
    geometry: { type: 'Point' as const, coordinates: [cx + dx, cy + dy] as [number, number] },
    properties: {
      id: c.id,
      id_muestra: c.id_muestra_netlab,
      serotipo: c.serotipo_dengue,
      dx: c.dx_molecular_dengue,
      elisa: c.elisa_ns1,
      fecha: c.fecha_validado,
    },
  }
})

// ─── HTML de popups ───────────────────────────────────────────
function criaderoHTML(p: Record<string, unknown>): string {
  const larvasColor = p.observa_larvas === 'si' ? '#f87171' : '#94a3b8'
  const larvasLabel = ({ si: 'Sí', no: 'No', no_seguro: 'Dudoso' } as Record<string, string>)[p.observa_larvas as string] ?? '-'
  const estadoLabel = ({ enviado: 'Enviado', en_revision: 'En revisión', verificado: 'Verificado', resuelto: 'Resuelto' } as Record<string, string>)[p.estado as string] ?? '-'
  return `<div class="mp-popup"><p class="mp-title" style="color:#22d3ee">Criadero</p>
    <p><span class="mp-k">Lugar:</span>${p.tipo_lugar}</p>
    <p><span class="mp-k">Objeto:</span>${p.tipo_objeto}</p>
    <p><span class="mp-k">Larvas:</span><span style="color:${larvasColor}">${larvasLabel}</span></p>
    <p><span class="mp-k">Estado:</span>${estadoLabel}</p></div>`
}

function notiHTML(p: Record<string, unknown>): string {
  const tipoLabel = ({ C: 'Confirmado', P: 'Probable', S: 'Sospechoso' } as Record<string, string>)[p.tipo as string] ?? '-'
  const tipoColor = ({ C: '#f87171', P: '#fbbf24', S: '#60a5fa' } as Record<string, string>)[p.tipo as string] ?? '#94a3b8'
  return `<div class="mp-popup"><p class="mp-title" style="color:#60a5fa">Caso NOTI</p>
    <p><span class="mp-k">ID:</span>${p.id_caso}</p>
    <p><span class="mp-k">Tipo:</span><span style="color:${tipoColor}">${tipoLabel}</span></p>
    <p><span class="mp-k">SE:</span>${p.semana}</p>
    <p><span class="mp-k">Distrito:</span>${p.distrito}</p></div>`
}

function netlabHTML(p: Record<string, unknown>): string {
  const dxColor = p.dx === 'Positivo' ? '#f87171' : '#34d399'
  return `<div class="mp-popup"><p class="mp-title" style="color:#f87171">NETLAB</p>
    <p><span class="mp-k">Muestra:</span>${p.id_muestra}</p>
    <p><span class="mp-k">RT-PCR:</span><span style="color:${dxColor}">${p.dx ?? 'N/D'}</span></p>
    <p><span class="mp-k">Serotipo:</span><span style="color:#fbbf24">${p.serotipo ?? 'N/D'}</span></p>
    <p><span class="mp-k">ELISA NS1:</span>${p.elisa ?? 'N/D'}</p></div>`
}

function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

// ─── Componente ───────────────────────────────────────────────
interface MapPanelProps {
  filtros?: FiltrosDashboard
  className?: string
}

export function MapPanel({ className }: MapPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [activeLayers, setActiveLayers] = useState<Set<CapaMapa>>(
    new Set(['criaderos', 'noti', 'netlab']),
  )

  useEffect(() => {
    if (!TOKEN || !containerRef.current) return

    mapboxgl.accessToken = TOKEN
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: IQUITOS_CENTER as [number, number],
      zoom: IQUITOS_ZOOM,
    })
    mapRef.current = map

    map.on('load', () => {
      // Sources
      map.addSource('criaderos-src', { type: 'geojson', data: { type: 'FeatureCollection', features: criaderoFeatures } })
      map.addSource('noti-src',      { type: 'geojson', data: { type: 'FeatureCollection', features: notiFeatures } })
      map.addSource('netlab-src',    { type: 'geojson', data: { type: 'FeatureCollection', features: netlabFeatures } })

      // Criaderos — cian, rojo si larvas detectadas
      map.addLayer({
        id: 'criaderos-layer', type: 'circle', source: 'criaderos-src',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'observa_larvas'], 'si'], 8, 5],
          'circle-color':  ['case', ['==', ['get', 'observa_larvas'], 'si'], '#f87171', '#22d3ee'],
          'circle-opacity': 0.85,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': ['case', ['==', ['get', 'observa_larvas'], 'si'], '#fca5a5', '#67e8f9'],
          'circle-stroke-opacity': 0.4,
        },
      })

      // NOTI — azul/ámbar/rojo según tipo_diagnóstico
      map.addLayer({
        id: 'noti-layer', type: 'circle', source: 'noti-src',
        paint: {
          'circle-radius': 7,
          'circle-color': ['case',
            ['==', ['get', 'tipo'], 'C'], '#f87171',
            ['==', ['get', 'tipo'], 'P'], '#fbbf24',
            '#60a5fa',
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': '#ffffff',
          'circle-stroke-opacity': 0.12,
        },
      })

      // NETLAB — mayor tamaño si positivo
      map.addLayer({
        id: 'netlab-layer', type: 'circle', source: 'netlab-src',
        paint: {
          'circle-radius': ['case', ['==', ['get', 'dx'], 'Positivo'], 10, 6],
          'circle-color':  ['case', ['==', ['get', 'dx'], 'Positivo'], '#ef4444', '#475569'],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': ['case', ['==', ['get', 'dx'], 'Positivo'], '#fca5a5', '#64748b'],
          'circle-stroke-opacity': 0.5,
        },
      })

      // Popups
      const popup = new mapboxgl.Popup({ closeButton: true, maxWidth: '220px', className: 'sivapre-popup' })

      map.on('click', 'criaderos-layer', e => {
        const f = e.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(criaderoHTML(f.properties ?? {})).addTo(map)
      })
      map.on('click', 'noti-layer', e => {
        const f = e.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(notiHTML(f.properties ?? {})).addTo(map)
      })
      map.on('click', 'netlab-layer', e => {
        const f = e.features?.[0]
        if (!f || f.geometry.type !== 'Point') return
        popup.setLngLat(f.geometry.coordinates as [number, number]).setHTML(netlabHTML(f.properties ?? {})).addTo(map)
      })

      for (const lyr of ['criaderos-layer', 'noti-layer', 'netlab-layer']) {
        map.on('mouseenter', lyr, () => { map.getCanvas().style.cursor = 'pointer' })
        map.on('mouseleave', lyr, () => { map.getCanvas().style.cursor = '' })
      }

      setMapLoaded(true)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapRef.current
    if (!map || !mapLoaded) return
    for (const capa of CAPAS_MAPA) {
      map.setLayoutProperty(`${capa.id}-layer`, 'visibility', activeLayers.has(capa.id) ? 'visible' : 'none')
    }
  }, [activeLayers, mapLoaded])

  function toggleLayer(id: CapaMapa) {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalPuntos = criaderoFeatures.length + notiFeatures.length + netlabFeatures.length

  return (
    <div className={cn('glass-card flex flex-col overflow-hidden', className)}>
      {/* Header */}
      <div
        className="shrink-0 flex items-center gap-3 px-4 py-3 border-b flex-wrap"
        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2">
          <Layers size={14} style={{ color: '#22d3ee' }} aria-hidden />
          <h2 className="text-xs font-mono font-semibold tracking-wider" style={{ color: '#22d3ee' }}>
            MAPA DE RIESGO
          </h2>
        </div>

        <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Capas del mapa">
          {CAPAS_MAPA.map(capa => {
            const active = activeLayers.has(capa.id)
            const rgb = hexRgb(capa.color)
            return (
              <button
                key={capa.id}
                onClick={() => toggleLayer(capa.id)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono font-medium transition-all cursor-pointer"
                style={{
                  background: active ? `rgba(${rgb},0.15)` : 'rgba(255,255,255,0.04)',
                  color: active ? capa.color : '#475569',
                  border: `1px solid ${active ? `rgba(${rgb},0.35)` : 'rgba(255,255,255,0.07)'}`,
                }}
                aria-pressed={active}
                title={capa.description}
              >
                <span
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ background: active ? capa.color : '#334155' }}
                  aria-hidden
                />
                {capa.label}
              </button>
            )
          })}
        </div>

        <span className="text-[10px] font-mono text-slate-600 ml-auto">
          {totalPuntos} puntos
        </span>
      </div>

      {/* Contenedor del mapa */}
      <div className="flex-1 relative" style={{ minHeight: 260 }}>
        {TOKEN ? (
          <div
            ref={containerRef}
            style={{ position: 'absolute', inset: 0 }}
            aria-label="Mapa interactivo de Iquitos"
            role="img"
          />
        ) : (
          <div
            className="w-full h-full radar-grid flex flex-col items-center justify-center gap-3 text-center p-8"
            style={{ minHeight: 260 }}
          >
            <MapIcon size={32} style={{ color: 'rgba(34,211,238,0.3)' }} aria-hidden />
            <div>
              <p className="text-xs font-mono text-slate-500">Mapa no disponible</p>
              <p className="text-[10px] text-slate-600 mt-1">
                Configura{' '}
                <span className="font-mono" style={{ color: 'rgba(34,211,238,0.5)' }}>
                  NEXT_PUBLIC_MAPBOX_TOKEN
                </span>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-4 py-2 flex items-center justify-between border-t"
        style={{ borderColor: 'rgba(255,255,255,0.04)' }}
      >
        <span className="text-[10px] font-mono text-slate-600">Iquitos · Loreto · Perú</span>
        <span className="text-[10px] font-mono text-slate-600">
          {Math.abs(IQUITOS_CENTER[1]).toFixed(4)}°S {Math.abs(IQUITOS_CENTER[0]).toFixed(4)}°W
        </span>
      </div>
    </div>
  )
}
