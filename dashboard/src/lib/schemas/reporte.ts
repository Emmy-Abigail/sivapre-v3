import { z } from 'zod'

// Refleja exactamente los campos de ReporteResponse del backend FastAPI
export const ReporteSchema = z.object({
  id: z.string().uuid(),
  usuario_id: z.string().uuid(),
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  foto_url: z.string().url().nullable(),
  tipo_lugar: z.string().max(100),
  tipo_objeto: z.string().max(100),
  // Backend now stores actual phrases sent by the mobile app
  observa_larvas: z.string(),
  conocimiento_dengue_cercano: z.string().nullable(),
  comentarios: z.string().nullable(),
  estado: z.enum(['enviado', 'en_revision', 'verificado', 'resuelto']),
  fecha_reporte: z.string().datetime({ offset: true }),
})

export type Reporte = z.infer<typeof ReporteSchema>

export const ReporteListSchema = z.array(ReporteSchema)
