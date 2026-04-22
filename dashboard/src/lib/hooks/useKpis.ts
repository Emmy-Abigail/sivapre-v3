import { useQuery } from '@tanstack/react-query'
import { fetchKpis } from '@/lib/api/endpoints'

export function useKpis() {
  return useQuery({
    queryKey: ['kpis'],
    queryFn: fetchKpis,
    refetchInterval: 30_000,
  })
}
