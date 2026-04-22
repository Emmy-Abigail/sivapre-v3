from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.caso_netlab import CasoNetlab
from app.models.usuario import Usuario
from app.schemas.caso_netlab import CasoNetlabResponse

router = APIRouter(tags=["Casos NETLAB"])

_RANGO_DIAS: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90}


@router.get("", response_model=list[CasoNetlabResponse])
async def listar_casos_netlab(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    distrito: str | None = Query(None, description="Nombre del distrito (IQUITOS, PUNCHANA, BELEN) o 'todos'"),
    rango: str | None = Query(None, pattern="^(7d|30d|90d)$", description="Rango temporal: 7d, 30d o 90d"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = select(CasoNetlab)
    if distrito and distrito.lower() != "todos":
        query = query.where(CasoNetlab.distrito_paciente == distrito.upper())
    if rango and (dias := _RANGO_DIAS.get(rango)):
        since = datetime.now(timezone.utc) - timedelta(days=dias)
        query = query.where(CasoNetlab.fecha_creacion >= since)
    query = query.order_by(CasoNetlab.fecha_creacion.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()
