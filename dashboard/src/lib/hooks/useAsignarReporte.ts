import { useMutation, useQueryClient } from '@tanstack/react-query'
import { asignarReporte } from '@/lib/api/endpoints'

export function useAsignarReporte() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: asignarReporte,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reportes'] })
    },
  })
}
