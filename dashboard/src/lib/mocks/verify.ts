// Archivo de verificación — solo se usa en desarrollo para validar mocks
// No importar en código de producción

import { ReporteListSchema } from '@/lib/schemas/reporte'
import { CasoNotiListSchema } from '@/lib/schemas/casoNoti'
import { CasoNetlabListSchema } from '@/lib/schemas/casoNetlab'
import { REPORTES_MOCK } from './reportes'
import { CASOS_NOTI_MOCK } from './casosNoti'
import { CASOS_NETLAB_MOCK } from './casosNetlab'

export function verificarMocks() {
  const reportesResult = ReporteListSchema.safeParse(REPORTES_MOCK)
  const notiResult = CasoNotiListSchema.safeParse(CASOS_NOTI_MOCK)
  const netlabResult = CasoNetlabListSchema.safeParse(CASOS_NETLAB_MOCK)

  return {
    reportes: { ok: reportesResult.success, count: REPORTES_MOCK.length, errores: reportesResult.error?.issues },
    casosNoti: { ok: notiResult.success, count: CASOS_NOTI_MOCK.length, errores: notiResult.error?.issues },
    casosNetlab: { ok: netlabResult.success, count: CASOS_NETLAB_MOCK.length, errores: netlabResult.error?.issues },
  }
}
