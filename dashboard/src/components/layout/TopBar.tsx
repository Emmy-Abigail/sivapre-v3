import { RefreshCw, Bell } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';

interface TopBarProps {
  title: string;
  subtitle?: string;
}

export function TopBar({ title, subtitle }: TopBarProps) {
  const qc = useQueryClient();
  const isFetching = qc.isFetching() > 0;

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-black text-gray-900" style={{ fontFamily: 'Montserrat, sans-serif' }}>
          {title}
        </h1>
        {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => qc.invalidateQueries()}
          className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-[#0F6E56] hover:border-[#0F6E56] transition-all shadow-sm"
          title="Actualizar datos"
        >
          <RefreshCw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
        <button className="p-2 rounded-xl bg-white border border-gray-200 text-gray-500 hover:text-[#0F6E56] hover:border-[#0F6E56] transition-all shadow-sm relative">
          <Bell size={16} />
        </button>
      </div>
    </div>
  );
}
