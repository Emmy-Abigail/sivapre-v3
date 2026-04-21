import { z } from 'zod'

// Refleja la respuesta actual de GET /api/v1/dashboard/kpis
export const KpiResumenSchema = z.object({
  total_reportes: z.number().int().min(0),
  reportes_con_larvas: z.number().int().min(0),
  casos_sospechosos: z.number().int().min(0),
  casos_confirmados: z.number().int().min(0),
})

export type KpiResumen = z.infer<typeof KpiResumenSchema>

// Tipo enriquecido para el UI (deltas calculados en el frontend con datos de períodos anteriores)
export interface KpiResumenUI {
  total_reportes: { valor: number; delta_pct: number }
  reportes_con_larvas: { valor: number; tendencia: 'alerta' | 'estable' | 'mejora' }
  casos_sospechosos: { valor: number; nuevos_hoy: number }
  casos_confirmados: { valor: number; nuevos_hoy: number }
}
