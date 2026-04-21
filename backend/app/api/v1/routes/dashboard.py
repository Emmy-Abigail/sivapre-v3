from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.caso_netlab import CasoNetlab
from app.models.caso_noti import CasoNoti
from app.models.reporte import Reporte
from app.models.usuario import Usuario
from app.schemas.enums import ObservaLarvasEnum

router = APIRouter(tags=["Dashboard"])


@router.get("/kpis", summary="KPIs globales del sistema de vigilancia")
async def get_kpis(
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    total_reportes, reportes_con_larvas, casos_sospechosos, casos_confirmados = (
        await db.scalar(select(func.count()).select_from(Reporte)),
        await db.scalar(
            select(func.count())
            .select_from(Reporte)
            .where(Reporte.observa_larvas == ObservaLarvasEnum.SI_CLARAMENTE.value)
        ),
        await db.scalar(select(func.count()).select_from(CasoNoti)),
        await db.scalar(
            select(func.count())
            .select_from(CasoNetlab)
            .where(CasoNetlab.dx_molecular_dengue == "Positivo")
        ),
    )

    return {
        "total_reportes": total_reportes or 0,
        "reportes_con_larvas": reportes_con_larvas or 0,
        "casos_sospechosos": casos_sospechosos or 0,
        "casos_confirmados": casos_confirmados or 0,
    }
