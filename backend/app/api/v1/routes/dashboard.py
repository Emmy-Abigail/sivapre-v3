from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.caso_netlab import CasoNetlab
from app.models.caso_noti import CasoNoti
from app.models.reporte import Reporte
from app.models.usuario import Usuario

router = APIRouter(tags=["Dashboard"])


@router.get("/kpis")
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    # Total de reportes ciudadanos
    total_reportes = await db.scalar(select(func.count()).select_from(Reporte))

    # Reportes donde se observaron larvas
    reportes_con_larvas = await db.scalar(
        select(func.count()).select_from(Reporte).where(Reporte.observa_larvas == "si")
    )

    # Casos sospechosos (total en notificaciones epidemiológicas)
    casos_sospechosos = await db.scalar(select(func.count()).select_from(CasoNoti))

    # Casos confirmados por diagnóstico molecular positivo en Netlab
    casos_confirmados = await db.scalar(
        select(func.count())
        .select_from(CasoNetlab)
        .where(CasoNetlab.dx_molecular_dengue == "Positivo")
    )

    return {
        "total_reportes": total_reportes or 0,
        "reportes_con_larvas": reportes_con_larvas or 0,
        "casos_sospechosos": casos_sospechosos or 0,
        "casos_confirmados": casos_confirmados or 0,
    }
