import { useQuery } from '@tanstack/react-query'
import { fetchReportes } from '@/lib/api/endpoints'
import type { FiltrosDashboard } from '@/types'

export function useReportes(filtros: FiltrosDashboard) {
  return useQuery({
    queryKey: ['reportes', filtros.rango],
    queryFn: () => fetchReportes(filtros),
    refetchInterval: 15_000,
  })
}
