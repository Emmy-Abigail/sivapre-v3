import { useQuery } from '@tanstack/react-query'
import { fetchCasosNoti } from '@/lib/api/endpoints'
import type { FiltrosDashboard } from '@/types'

export function useCasosNoti(filtros: FiltrosDashboard) {
  return useQuery({
    queryKey: ['casos-noti', filtros.distrito, filtros.rango],
    queryFn: () => fetchCasosNoti(filtros),
  })
}
