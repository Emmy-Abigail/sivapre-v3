import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, LayersControl, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { useMapaReportes, useMapaNoti, useMapaNetlab } from '../hooks/useDashboard';
import type { Filtros } from '../types';
import { Badge } from './ui/Badge';

// Centroides aproximados de provincias peruanas (ubigeo prefix → [lat, lng])
const UBIGEO_CENTROIDS: Record<string, [number, number]> = {
  '01': [-6.77, -79.84],  // Amazonas
  '02': [-9.53, -77.53],  // Ancash
  '03': [-13.16, -74.22], // Apurímac
  '04': [-13.53, -71.97], // Arequipa
  '05': [-13.16, -74.22], // Ayacucho
  '06': [-7.15, -78.52],  // Cajamarca
  '07': [-12.04, -77.04], // Callao
  '08': [-13.52, -71.97], // Cusco
  '09': [-9.91, -76.24],  // Huancavelica
  '10': [-9.93, -76.24],  // Huánuco
  '11': [-14.06, -75.73], // Ica
  '12': [-11.99, -75.29], // Junín
  '13': [-7.15, -78.52],  // La Libertad
  '14': [-6.77, -79.84],  // Lambayeque
  '15': [-12.04, -77.04], // Lima
  '16': [-3.74, -73.25],  // Loreto
  '17': [-8.38, -74.53],  // Madre de Dios
  '18': [-14.84, -74.97], // Moquegua
  '19': [-10.72, -75.40], // Pasco
  '20': [-5.19, -80.63],  // Piura
  '21': [-13.51, -71.97], // Puno
  '22': [-6.05, -76.98],  // San Martín
  '23': [-18.01, -70.25], // Tacna
  '24': [-4.57, -80.45],  // Tumbes
  '25': [-8.36, -74.55],  // Ucayali
};

function getCoords(ubigeo: string, dpto: string): [number, number] {
  const prefix = ubigeo?.substring(0, 2);
  if (prefix && UBIGEO_CENTROIDS[prefix]) return UBIGEO_CENTROIDS[prefix];
  // Fallback por nombre de departamento
  const dptoMap: Record<string, [number, number]> = {
    'LORETO': [-3.74, -73.25], 'LIMA': [-12.04, -77.04], 'PIURA': [-5.19, -80.63],
    'LA LIBERTAD': [-8.11, -79.02], 'CAJAMARCA': [-7.15, -78.52], 'CUSCO': [-13.52, -71.97],
    'PUNO': [-15.84, -70.02], 'JUNIN': [-11.99, -75.29], 'AREQUIPA': [-16.40, -71.53],
    'SAN MARTIN': [-6.05, -76.98], 'UCAYALI': [-8.36, -74.55], 'HUANUCO': [-9.93, -76.24],
    'ICA': [-14.06, -75.73], 'ANCASH': [-9.53, -77.53], 'LAMBAYEQUE': [-6.77, -79.84],
  };
  const key = dpto?.toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return dptoMap[key] ?? [-9.19, -75.01]; // centro de Perú como fallback
}

function estadoColor(estado: string): string {
  const map: Record<string, string> = {
    enviado: '#0F6E56', en_revision: '#F59E0B', resuelto: '#6B7280',
    rechazado: '#EF4444', cancelado: '#9CA3AF',
  };
  return map[estado] ?? '#0F6E56';
}

function larvasColor(larvas: string): string {
  if (larvas === 'Sí, claramente') return '#EF4444';
  if (larvas === 'No estoy seguro') return '#F59E0B';
  return '#0F6E56';
}

// Fuerza re-render del mapa al cambiar tamaño
function MapResizer() {
  const map = useMap();
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100); }, [map]);
  return null;
}

interface Props {
  filtros: Partial<Filtros>;
}

export function MapaVigilancia({ filtros }: Props) {
  const { data: reportes, isLoading: loadingR } = useMapaReportes(filtros);
  const { data: noti } = useMapaNoti(filtros);
  const { data: netlab } = useMapaNetlab(filtros);
  const [activeLayer, setActiveLayer] = useState<'estado' | 'larvas'>('estado');

  const totalPuntos = (reportes?.length ?? 0) + (noti?.length ?? 0) + (netlab?.length ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Mapa de Vigilancia Multicapa
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">{totalPuntos} puntos visibles</p>
        </div>
        <div className="flex gap-2">
          {(['estado', 'larvas'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setActiveLayer(l)}
              className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all ${
                activeLayer === l
                  ? 'bg-[#0F6E56] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {l === 'estado' ? 'Por estado' : 'Por larvas'}
            </button>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="px-5 pb-3 flex flex-wrap gap-3">
        <LeyendaItem color="#0F6E56" label="Reportes ciudadanos" />
        <LeyendaItem color="#3B82F6" label="Casos NOTI" shape="circle-outline" />
        <LeyendaItem color="#EF4444" label="Confirmados NETLAB" shape="circle-outline" />
        {activeLayer === 'estado' ? (
          <>
            <LeyendaItem color="#F59E0B" label="En revisión" size="sm" />
            <LeyendaItem color="#6B7280" label="Resuelto" size="sm" />
          </>
        ) : (
          <>
            <LeyendaItem color="#EF4444" label="Con larvas" size="sm" />
            <LeyendaItem color="#F59E0B" label="Incierto" size="sm" />
          </>
        )}
      </div>

      {/* Mapa */}
      <div className="relative">
        {loadingR && (
          <div className="absolute inset-0 bg-white/70 z-10 flex items-center justify-center rounded-b-2xl">
            <div className="w-8 h-8 border-2 border-[#0F6E56] border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <MapContainer
          center={[-9.19, -75.01]}
          zoom={5}
          style={{ height: '480px', width: '100%' }}
          scrollWheelZoom
        >
          <MapResizer />
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='© <a href="https://openstreetmap.org">OpenStreetMap</a>'
          />
          <LayersControl position="topright">

            {/* Capa 1: Reportes ciudadanos */}
            <LayersControl.Overlay checked name="🟢 Reportes ciudadanos (SIVAPRE)">
              <>
                {(reportes ?? []).map((r) => (
                  <CircleMarker
                    key={r.id}
                    center={[r.lat, r.lng]}
                    radius={7}
                    pathOptions={{
                      fillColor: activeLayer === 'estado' ? estadoColor(r.estado) : larvasColor(r.observa_larvas),
                      fillOpacity: 0.85,
                      color: '#fff',
                      weight: 1.5,
                    }}
                  >
                    <Popup maxWidth={280}>
                      <div className="text-sm">
                        {r.foto_url && (
                          <img src={r.foto_url} alt="Foto" className="w-full h-32 object-cover rounded-lg mb-2" />
                        )}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <EstadoBadge estado={r.estado} />
                          <LarvasBadge larvas={r.observa_larvas} />
                        </div>
                        <p className="font-semibold text-gray-900">{r.tipo_lugar} — {r.tipo_objeto}</p>
                        <p className="text-gray-500 text-xs mt-1">{r.reporter.nombre} · {r.reporter.distrito}, {r.reporter.provincia}</p>
                        {r.comentarios && <p className="text-gray-600 text-xs mt-1 italic">"{r.comentarios}"</p>}
                        <p className="text-gray-400 text-xs mt-1">
                          {r.fecha_reporte ? format(new Date(r.fecha_reporte), "d MMM yyyy HH:mm", { locale: es }) : '—'}
                        </p>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </>
            </LayersControl.Overlay>

            {/* Capa 2: NOTI */}
            <LayersControl.Overlay checked name="🔵 Casos sospechosos (NOTI)">
              <>
                {(noti ?? []).map((n, i) => {
                  const coords = getCoords(n.ubigeo, n.departamento);
                  return (
                    <CircleMarker
                      key={`noti-${i}`}
                      center={coords}
                      radius={Math.min(6 + Math.sqrt(n.total) * 2, 30)}
                      pathOptions={{
                        fillColor: '#3B82F6',
                        fillOpacity: 0.5,
                        color: '#2563EB',
                        weight: 2,
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">{n.provincia}, {n.departamento}</p>
                          <p className="text-blue-600 font-bold text-lg">{n.total} casos</p>
                          <p className="text-gray-500 text-xs">{n.tipo_diagnostico} · UBIGEO {n.ubigeo}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </>
            </LayersControl.Overlay>

            {/* Capa 3: NETLAB */}
            <LayersControl.Overlay checked name="🔴 Confirmados por lab (NETLAB)">
              <>
                {(netlab ?? []).map((nl, i) => {
                  const coords = getCoords(nl.ubigeo, nl.departamento);
                  return (
                    <CircleMarker
                      key={`netlab-${i}`}
                      center={[coords[0] + 0.05, coords[1] + 0.05]}
                      radius={Math.min(6 + Math.sqrt(nl.total) * 2.5, 35)}
                      pathOptions={{
                        fillColor: '#EF4444',
                        fillOpacity: 0.55,
                        color: '#DC2626',
                        weight: 2,
                        dashArray: '4,3',
                      }}
                    >
                      <Popup>
                        <div className="text-sm">
                          <p className="font-semibold text-gray-900">{nl.distrito}, {nl.provincia}</p>
                          <p className="text-red-600 font-bold text-lg">{nl.total} confirmados</p>
                          {nl.serotipo && (
                            <span className="inline-block mt-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-bold rounded-full">
                              {nl.serotipo}
                            </span>
                          )}
                          <p className="text-gray-500 text-xs mt-1">PCR positivo · UBIGEO {nl.ubigeo}</p>
                        </div>
                      </Popup>
                    </CircleMarker>
                  );
                })}
              </>
            </LayersControl.Overlay>

          </LayersControl>
        </MapContainer>
      </div>
    </div>
  );
}

function LeyendaItem({
  color, label, shape = 'circle', size = 'md',
}: { color: string; label: string; shape?: 'circle' | 'circle-outline'; size?: 'sm' | 'md' }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className="rounded-full flex-shrink-0"
        style={{
          width: size === 'sm' ? 8 : 10,
          height: size === 'sm' ? 8 : 10,
          backgroundColor: shape === 'circle' ? color : 'transparent',
          border: shape === 'circle-outline' ? `2px solid ${color}` : undefined,
          boxShadow: shape === 'circle' ? `0 0 0 1.5px ${color}33` : undefined,
        }}
      />
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

function EstadoBadge({ estado }: { estado: string }) {
  const map: Record<string, 'green' | 'yellow' | 'gray' | 'red'> = {
    enviado: 'green', en_revision: 'yellow', resuelto: 'gray', rechazado: 'red', cancelado: 'gray',
  };
  const labels: Record<string, string> = {
    enviado: 'Enviado', en_revision: 'En revisión', resuelto: 'Resuelto',
    rechazado: 'Rechazado', cancelado: 'Cancelado',
  };
  return <Badge variant={map[estado] ?? 'gray'}>{labels[estado] ?? estado}</Badge>;
}

function LarvasBadge({ larvas }: { larvas: string }) {
  if (larvas === 'Sí, claramente') return <Badge variant="red">Con larvas</Badge>;
  if (larvas === 'No estoy seguro') return <Badge variant="yellow">Incierto</Badge>;
  return <Badge variant="green">Sin larvas</Badge>;
}
