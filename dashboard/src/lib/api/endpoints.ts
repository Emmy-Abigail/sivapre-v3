import { apiClient } from './client'
import { ReporteListSchema, ReporteSchema } from '@/lib/schemas/reporte'
import { CasoNotiListSchema } from '@/lib/schemas/casoNoti'
import { CasoNetlabListSchema } from '@/lib/schemas/casoNetlab'
import { KpiResumenSchema } from '@/lib/schemas/kpi'
import type { FiltrosDashboard } from '@/types'

export async function fetchKpis() {
  const { data } = await apiClient.get('/api/v1/dashboard/kpis')
  return KpiResumenSchema.parse(data)
}

export async function fetchReportes(filtros: FiltrosDashboard) {
  const params: Record<string, string> = { rango: filtros.rango }
  const { data } = await apiClient.get('/api/v1/reportes', { params })
  return ReporteListSchema.parse(data)
}

export async function fetchCasosNoti(filtros: FiltrosDashboard) {
  const params: Record<string, string> = { rango: filtros.rango }
  if (filtros.distrito !== 'todos') params.distrito = filtros.distrito
  const { data } = await apiClient.get('/api/v1/casos-noti', { params })
  return CasoNotiListSchema.parse(data)
}

export async function fetchCasosNetlab(filtros: FiltrosDashboard) {
  const params: Record<string, string> = { rango: filtros.rango }
  if (filtros.distrito !== 'todos') params.distrito = filtros.distrito
  const { data } = await apiClient.get('/api/v1/casos-netlab', { params })
  return CasoNetlabListSchema.parse(data)
}

export async function asignarReporte(id: string) {
  const { data } = await apiClient.patch(`/api/v1/reportes/${id}/asignar`)
  return ReporteSchema.parse(data)
}
