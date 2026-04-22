import { useQuery } from '@tanstack/react-query'
import { fetchCasosNetlab } from '@/lib/api/endpoints'
import type { FiltrosDashboard } from '@/types'

export function useCasosNetlab(filtros: FiltrosDashboard) {
  return useQuery({
    queryKey: ['casos-netlab', filtros.distrito, filtros.rango],
    queryFn: () => fetchCasosNetlab(filtros),
  })
}
