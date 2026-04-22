'use client'
import { useState } from 'react'
import { MapContainer, TileLayer, CircleMarker, Popup, LayerGroup } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { Layers } from 'lucide-react'
import { IQUITOS_ZOOM, CAPAS_MAPA } from '@/config/regiones'
import type { CapaMapa } from '@/config/regiones'
import { useReportes } from '@/lib/hooks/useReportes'
import { useCasosNoti } from '@/lib/hooks/useCasosNoti'
import { useCasosNetlab } from '@/lib/hooks/useCasosNetlab'
import { cn } from '@/lib/utils'
import type { FiltrosDashboard } from '@/types'
import type { PathOptions } from 'leaflet'

const CENTER: [number, number] = [-3.7437, -73.2516]

const DISTRICT_CENTERS: Record<string, [number, number]> = {
  IQUITOS:  [-3.7437, -73.2516],
  PUNCHANA: [-3.7043, -73.2483],
  BELEN:    [-3.7757, -73.2516],
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
  return DISTRICT_CENTERS[name.toUpperCase()] ?? CENTER
}

function hexRgb(hex: string): string {
  return `${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)}`
}

function criaderoStyle(observaLarvas: string): { radius: number; pathOptions: PathOptions } {
  const critical = observaLarvas === 'si'
  return {
    radius: critical ? 8 : 5,
    pathOptions: {
      fillColor: critical ? '#f87171' : '#22d3ee',
      color: critical ? '#fca5a5' : '#67e8f9',
      fillOpacity: 0.85,
      weight: 1.5,
      opacity: 0.4,
    },
  }
}

function notiStyle(tipo: string): { radius: number; pathOptions: PathOptions } {
  const color = tipo === 'C' ? '#f87171' : tipo === 'P' ? '#fbbf24' : '#60a5fa'
  return {
    radius: 7,
    pathOptions: { fillColor: color, color: '#ffffff', fillOpacity: 0.8, weight: 1.5, opacity: 0.12 },
  }
}

function netlabStyle(dx: string): { radius: number; pathOptions: PathOptions } {
  const positive = dx === 'Positivo'
  return {
    radius: positive ? 10 : 6,
    pathOptions: {
      fillColor: positive ? '#ef4444' : '#475569',
      color: positive ? '#fca5a5' : '#64748b',
      fillOpacity: 0.9,
      weight: 2,
      opacity: 0.5,
    },
  }
}

const LARVAS_LABEL: Record<string, string> = { si: 'Sí', no: 'No', no_seguro: 'Dudoso' }
const ESTADO_LABEL: Record<string, string>  = {
  enviado: 'Enviado', en_revision: 'En revisión', verificado: 'Verificado', resuelto: 'Resuelto',
}
const TIPO_LABEL: Record<string, string>  = { C: 'Confirmado', P: 'Probable', S: 'Sospechoso' }
const TIPO_COLOR: Record<string, string>  = { C: '#f87171', P: '#fbbf24', S: '#60a5fa' }

const DEFAULT_FILTROS: FiltrosDashboard = {
  departamento: 'LORETO',
  provincia: 'MAYNAS',
  distrito: 'todos',
  rango: '30d',
}

interface MapPanelProps {
  filtros?: FiltrosDashboard
  className?: string
}

export function MapPanel({ filtros, className }: MapPanelProps) {
  const f = filtros ?? DEFAULT_FILTROS

  const { data: reportes   = [], isLoading: loadingR } = useReportes(f)
  const { data: casosNoti  = [], isLoading: loadingN } = useCasosNoti(f)
  const { data: casosNetlab = [], isLoading: loadingL } = useCasosNetlab(f)

  const [activeLayers, setActiveLayers] = useState<Set<CapaMapa>>(
    new Set(['criaderos', 'noti', 'netlab']),
  )

  function toggleLayer(id: CapaMapa) {
    setActiveLayers(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const totalPuntos  = reportes.length + casosNoti.length + casosNetlab.length
  const anyLoading   = loadingR || loadingN || loadingL

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
          {anyLoading ? '…' : `${totalPuntos} puntos`}
        </span>
      </div>

      {/* Mapa */}
      <div className="flex-1 relative" style={{ minHeight: 260 }}>
        <MapContainer
          center={CENTER}
          zoom={IQUITOS_ZOOM}
          style={{ position: 'absolute', inset: 0, height: '100%', width: '100%' }}
          zoomControl
          attributionControl
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
            subdomains="abcd"
            maxZoom={20}
          />

          {/* Criaderos */}
          {activeLayers.has('criaderos') && (
            <LayerGroup>
              {reportes.map(r => {
                const { radius, pathOptions } = criaderoStyle(r.observa_larvas)
                return (
                  <CircleMarker key={r.id} center={[r.latitud, r.longitud]} radius={radius} pathOptions={pathOptions}>
                    <Popup className="sivapre-popup">
                      <div className="mp-popup">
                        <p className="mp-title" style={{ color: '#22d3ee' }}>Criadero</p>
                        <p><span className="mp-k">Lugar:</span>{r.tipo_lugar}</p>
                        <p><span className="mp-k">Objeto:</span>{r.tipo_objeto}</p>
                        <p>
                          <span className="mp-k">Larvas:</span>
                          <span style={{ color: r.observa_larvas === 'si' ? '#f87171' : '#94a3b8' }}>
                            {LARVAS_LABEL[r.observa_larvas] ?? '-'}
                          </span>
                        </p>
                        <p><span className="mp-k">Estado:</span>{ESTADO_LABEL[r.estado] ?? '-'}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </LayerGroup>
          )}

          {/* NOTI */}
          {activeLayers.has('noti') && (
            <LayerGroup>
              {casosNoti.map(c => {
                const [clat, clng] = districtCenter(c.distrito)
                const [dlat, dlng] = jitter(c.id)
                const { radius, pathOptions } = notiStyle(c.tipo_diagnostico)
                return (
                  <CircleMarker key={c.id} center={[clat + dlat, clng + dlng]} radius={radius} pathOptions={pathOptions}>
                    <Popup className="sivapre-popup">
                      <div className="mp-popup">
                        <p className="mp-title" style={{ color: '#60a5fa' }}>Caso NOTI</p>
                        <p><span className="mp-k">ID:</span>{c.id_caso_noti}</p>
                        <p>
                          <span className="mp-k">Tipo:</span>
                          <span style={{ color: TIPO_COLOR[c.tipo_diagnostico] ?? '#94a3b8' }}>
                            {TIPO_LABEL[c.tipo_diagnostico] ?? '-'}
                          </span>
                        </p>
                        <p><span className="mp-k">SE:</span>{c.semana_epidemiologica}</p>
                        <p><span className="mp-k">Distrito:</span>{c.distrito}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </LayerGroup>
          )}

          {/* NETLAB */}
          {activeLayers.has('netlab') && (
            <LayerGroup>
              {casosNetlab.map(c => {
                const [clat, clng] = districtCenter(c.distrito_paciente)
                const [dlat, dlng] = jitter(c.id)
                const { radius, pathOptions } = netlabStyle(c.dx_molecular_dengue ?? '')
                return (
                  <CircleMarker key={c.id} center={[clat + dlat, clng + dlng]} radius={radius} pathOptions={pathOptions}>
                    <Popup className="sivapre-popup">
                      <div className="mp-popup">
                        <p className="mp-title" style={{ color: '#f87171' }}>NETLAB</p>
                        <p><span className="mp-k">Muestra:</span>{c.id_muestra_netlab}</p>
                        <p>
                          <span className="mp-k">RT-PCR:</span>
                          <span style={{ color: c.dx_molecular_dengue === 'Positivo' ? '#f87171' : '#34d399' }}>
                            {c.dx_molecular_dengue ?? 'N/D'}
                          </span>
                        </p>
                        <p>
                          <span className="mp-k">Serotipo:</span>
                          <span style={{ color: '#fbbf24' }}>{c.serotipo_dengue ?? 'N/D'}</span>
                        </p>
                        <p><span className="mp-k">ELISA NS1:</span>{c.elisa_ns1 ?? 'N/D'}</p>
                      </div>
                    </Popup>
                  </CircleMarker>
                )
              })}
            </LayerGroup>
          )}
        </MapContainer>

        {/* Indicador de carga sobre el mapa */}
        {anyLoading && (
          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-[10px] font-mono pointer-events-none"
            style={{ background: 'rgba(7,18,36,0.85)', color: 'rgba(34,211,238,0.6)', border: '1px solid rgba(34,211,238,0.15)' }}
          >
            Actualizando capas…
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="shrink-0 px-4 py-2 flex items-center justify-between border-t"
        style={{ borderColor: 'rgba(255,255,255,0.04)' }}
      >
        <span className="text-[10px] font-mono text-slate-600">Iquitos · Loreto · Perú · OSM</span>
        <span className="text-[10px] font-mono text-slate-600">
          {Math.abs(CENTER[0]).toFixed(4)}°S {Math.abs(CENTER[1]).toFixed(4)}°W
        </span>
      </div>
    </div>
  )
}
