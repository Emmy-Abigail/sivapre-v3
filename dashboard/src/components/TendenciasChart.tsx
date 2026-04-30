import {
  ResponsiveContainer, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Area, AreaChart,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import { useTendencias } from '../hooks/useDashboard';
import type { Filtros } from '../types';

interface Props {
  filtros: Partial<Filtros>;
}

interface ChartPoint {
  label: string;
  reportes: number;
  netlab: number;
}

export function TendenciasChart({ filtros }: Props) {
  const { data, isLoading } = useTendencias(filtros);

  const chartData: ChartPoint[] = (() => {
    if (!data) return [];
    const map = new Map<string, ChartPoint>();

    data.reportes.forEach(({ semana, total }) => {
      if (!semana) return;
      const label = format(parseISO(semana), "d MMM", { locale: es });
      const k = semana.substring(0, 10);
      const cur = map.get(k) ?? { label, reportes: 0, netlab: 0 };
      map.set(k, { ...cur, reportes: cur.reportes + total });
    });

    data.netlab.forEach(({ semana, total }) => {
      if (!semana) return;
      const label = format(parseISO(semana), "d MMM", { locale: es });
      const k = semana.substring(0, 10);
      const cur = map.get(k) ?? { label, reportes: 0, netlab: 0 };
      map.set(k, { ...cur, label, netlab: cur.netlab + total });
    });

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  })();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
        <p className="font-semibold text-gray-800 mb-2">Semana del {label}</p>
        {payload.map((p: any) => (
          <p key={p.dataKey} className="flex items-center gap-2" style={{ color: p.color }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
            {p.name}: <span className="font-bold ml-auto pl-4">{p.value}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h2 className="text-sm font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          Tendencias Semanales
        </h2>
        <p className="text-xs text-gray-400 mt-0.5">Últimas 12 semanas — reportes ciudadanos y confirmados NETLAB</p>
      </div>

      {isLoading ? (
        <div className="h-56 bg-gray-50 rounded-xl animate-pulse" />
      ) : chartData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-gray-400 text-sm">
          Sin datos para el período seleccionado
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorReportes" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0F6E56" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#0F6E56" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorNetlab" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: '#9CA3AF' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
            />
            <Area
              type="monotone"
              dataKey="reportes"
              name="Reportes ciudadanos"
              stroke="#0F6E56"
              strokeWidth={2.5}
              fill="url(#colorReportes)"
              dot={{ r: 3, fill: '#0F6E56', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
            <Area
              type="monotone"
              dataKey="netlab"
              name="Confirmados NETLAB"
              stroke="#EF4444"
              strokeWidth={2.5}
              fill="url(#colorNetlab)"
              dot={{ r: 3, fill: '#EF4444', strokeWidth: 0 }}
              activeDot={{ r: 5 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
