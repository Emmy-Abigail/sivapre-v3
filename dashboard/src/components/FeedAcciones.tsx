import { useState } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { MapPin, CheckCircle, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useFeed, useActualizarEstado } from '../hooks/useDashboard';
import type { Filtros, FeedItem } from '../types';
import { Badge } from './ui/Badge';

const ESTADOS: { value: string; label: string; variant: 'green' | 'yellow' | 'gray' | 'red' }[] = [
  { value: 'enviado', label: 'Enviado', variant: 'green' },
  { value: 'en_revision', label: 'En revisión', variant: 'yellow' },
  { value: 'resuelto', label: 'Resuelto', variant: 'gray' },
  { value: 'rechazado', label: 'Rechazado', variant: 'red' },
];

function estadoVariant(e: string): 'green' | 'yellow' | 'gray' | 'red' | 'blue' {
  const m: Record<string, any> = {
    enviado: 'green', en_revision: 'yellow', resuelto: 'gray', rechazado: 'red', cancelado: 'gray',
  };
  return m[e] ?? 'gray';
}

function estadoLabel(e: string) {
  const m: Record<string, string> = {
    enviado: 'Enviado', en_revision: 'En revisión', resuelto: 'Resuelto',
    rechazado: 'Rechazado', cancelado: 'Cancelado',
  };
  return m[e] ?? e;
}

function larvasBadge(l: string) {
  if (l === 'Sí, claramente') return <Badge variant="red">Con larvas ⚠️</Badge>;
  if (l === 'No estoy seguro') return <Badge variant="yellow">Incierto</Badge>;
  return <Badge variant="green">Sin larvas</Badge>;
}

function FeedCard({ item }: { item: FeedItem }) {
  const [expanded, setExpanded] = useState(false);
  const { mutate: cambiarEstado, isPending } = useActualizarEstado();

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden hover:border-[#0F6E56]/30 transition-all">
      {/* Header clickeable */}
      <div
        className="flex items-start gap-3 p-4 cursor-pointer select-none"
        onClick={() => setExpanded((e) => !e)}
      >
        {/* Foto o placeholder */}
        <div className="w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100">
          {item.foto_url ? (
            <img src={item.foto_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <MapPin size={20} className="text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {item.tipo_lugar} · {item.tipo_objeto}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {larvasBadge(item.observa_larvas)}
              <Badge variant={estadoVariant(item.estado)}>{estadoLabel(item.estado)}</Badge>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            {item.reporter.nombre} · {item.reporter.distrito ?? '—'}, {item.reporter.provincia ?? '—'}
          </p>
          <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
            <Clock size={10} />
            {item.fecha_reporte
              ? format(new Date(item.fecha_reporte), "d MMM yyyy HH:mm", { locale: es })
              : '—'}
          </p>
        </div>
        <span className="text-gray-300 flex-shrink-0">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4 pt-3 bg-gray-50/50">
          {item.foto_url && (
            <img
              src={item.foto_url}
              alt="Foto del criadero"
              className="w-full h-40 object-cover rounded-xl mb-3"
            />
          )}

          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <InfoRow label="Lugar" value={item.tipo_lugar} />
            <InfoRow label="Objeto" value={item.tipo_objeto} />
            <InfoRow label="Larvas" value={item.observa_larvas} />
            <InfoRow label="Dengue cercano" value={item.conocimiento_dengue_cercano ?? '—'} />
            <InfoRow label="Lat" value={item.lat.toFixed(5)} />
            <InfoRow label="Lng" value={item.lng.toFixed(5)} />
          </div>

          {item.comentarios && (
            <p className="text-xs text-gray-600 italic bg-white rounded-lg px-3 py-2 border border-gray-100 mb-3">
              "{item.comentarios}"
            </p>
          )}

          {/* Acciones de cambio de estado */}
          {item.estado !== 'cancelado' && (
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">Cambiar estado:</p>
              <div className="flex flex-wrap gap-2">
                {ESTADOS.filter((e) => e.value !== item.estado).map((e) => (
                  <button
                    key={e.value}
                    disabled={isPending}
                    onClick={() => cambiarEstado({ id: item.id, estado: e.value })}
                    className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-semibold text-gray-700 hover:border-[#0F6E56] hover:text-[#0F6E56] transition-all disabled:opacity-50"
                  >
                    {isPending ? '...' : e.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-gray-400">{label}: </span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  );
}

interface Props {
  filtros: Partial<Filtros>;
}

export function FeedAcciones({ filtros }: Props) {
  const { data, isLoading } = useFeed(filtros);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
            Feed de Acción
          </h2>
          <p className="text-xs text-gray-400 mt-0.5">Últimos {data?.length ?? '—'} reportes</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-[#0F6E56] animate-pulse" />
          <span className="text-xs text-gray-500">Tiempo real</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 max-h-[440px] pr-1">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />
          ))
        ) : data?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <CheckCircle size={32} className="mb-2 text-gray-200" />
            <p className="text-sm">Sin reportes para los filtros actuales</p>
          </div>
        ) : (
          data?.map((item) => <FeedCard key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}
