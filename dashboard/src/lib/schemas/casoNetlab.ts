import { z } from 'zod'

// Refleja los campos del modelo CasoNetlab del backend
export const CasoNetlabSchema = z.object({
  id: z.string().uuid(),
  id_muestra_netlab: z.string().max(100),
  fecha_corte: z.string().datetime({ offset: true }),

  // Ubicación del paciente
  departamento_paciente: z.string().max(100),
  provincia_paciente: z.string().max(100),
  distrito_paciente: z.string().max(100),
  ubigeo_paciente: z.string().max(10),

  // Datos del paciente
  edad_paciente: z.number().int().min(0).max(120),
  sexo_paciente: z.enum(['M', 'F']),

  // Resultados de laboratorio
  nombre_examen: z.string().max(200),
  dx_molecular_dengue: z.enum(['Positivo', 'Negativo']).nullable(),
  serotipo_dengue: z.enum(['DENV-1', 'DENV-2', 'DENV-3', 'DENV-4']).nullable(),
  elisa_ns1: z.enum(['Reactivo', 'No Reactivo']).nullable(),
  fecha_validado: z.string().datetime({ offset: true }).nullable(),
})

export type CasoNetlab = z.infer<typeof CasoNetlabSchema>

export const CasoNetlabListSchema = z.array(CasoNetlabSchema)
