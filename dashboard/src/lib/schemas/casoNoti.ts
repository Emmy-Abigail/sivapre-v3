import { z } from 'zod'

// Refleja los campos del modelo CasoNoti del backend
export const CasoNotiSchema = z.object({
  id: z.string().uuid(),
  id_caso_noti: z.string().max(100),

  // Ubicación administrativa
  departamento: z.string().max(100),
  provincia: z.string().max(100),
  distrito: z.string().max(100),
  ubigeo: z.string().max(10),

  // Datos epidemiológicos
  enfermedad: z.string().max(150),
  ano_epidemiologico: z.number().int().min(2000).max(2100),
  semana_epidemiologica: z.number().int().min(1).max(53),
  // 'C'=confirmado, 'P'=probable, 'S'=sospechoso
  tipo_diagnostico: z.enum(['C', 'P', 'S']),
  diresa_notifica: z.string().max(150),

  // Datos del paciente
  edad: z.number().int().min(0).max(120),
  sexo: z.enum(['M', 'F']),
})

export type CasoNoti = z.infer<typeof CasoNotiSchema>

export const CasoNotiListSchema = z.array(CasoNotiSchema)
