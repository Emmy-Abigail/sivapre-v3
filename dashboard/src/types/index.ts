// ──────────────────────────────────────────────────────────────────────────────
// Tipos inferidos desde los schemas Zod — no duplicar aquí, importar desde schemas
// Este archivo solo expone re-exports y tipos auxiliares no derivados de schemas
// ──────────────────────────────────────────────────────────────────────────────

export type { Reporte } from '@/lib/schemas/reporte'
export type { CasoNoti } from '@/lib/schemas/casoNoti'
export type { CasoNetlab } from '@/lib/schemas/casoNetlab'
export type { KpiResumen } from '@/lib/schemas/kpi'

// ── Valores de enum usados en el UI ───────────────────────────────────────────

export type EstadoReporte = 'enviado' | 'en_revision' | 'verificado' | 'resuelto'

export type TipoLugar = 'Vivienda' | 'Vía Pública' | 'Terreno Abandonado'

export type TipoObjeto = 'Llantas' | 'Baldes' | 'Plantas' | 'Otro'

export type ObservaLarvas = 'si' | 'no' | 'no_seguro'

export type TipoDiagnostico = 'C' | 'P' | 'S'

export type SerotipoDengue = 'DENV-1' | 'DENV-2' | 'DENV-3' | 'DENV-4'

export type ResultadoLab = 'Positivo' | 'Negativo'

export type ResultadoElisa = 'Reactivo' | 'No Reactivo'

// ── Tipos de UI (no vienen del backend) ───────────────────────────────────────

export type PrioridadReporte = 'alta' | 'media' | 'baja'

export type TendenciaKpi = 'alerta' | 'estable' | 'mejora'

export interface FiltrosDashboard {
  departamento: string
  provincia: string
  distrito: string
  rango: '7d' | '30d' | '90d'
}

// ── Constante helper: derivar prioridad desde observa_larvas ──────────────────
export function derivarPrioridad(observaLarvas: string): PrioridadReporte {
  if (observaLarvas === 'si') return 'alta'
  if (observaLarvas === 'no_seguro') return 'media'
  return 'baja'
}

// ── Labels para la UI ─────────────────────────────────────────────────────────
export const OBSERVA_LARVAS_LABELS: Record<string, string> = {
  si: 'Sí, claramente',
  no_seguro: 'No estoy seguro',
  no: 'No',
}

export const ESTADO_REPORTE_LABELS: Record<string, string> = {
  enviado: 'Enviado',
  en_revision: 'En revisión',
  verificado: 'Verificado',
  resuelto: 'Resuelto',
}
