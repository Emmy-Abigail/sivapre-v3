import uuid
import os
import shutil
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.models.reporte import Reporte
from app.models.usuario import Usuario
from app.schemas.reporte import ReporteCreate, ReporteResponse, ReporteUpdate

router = APIRouter(tags=["Reportes"])

_RANGO_DIAS: dict[str, int] = {"7d": 7, "30d": 30, "90d": 90}

@router.post("/foto")
async def subir_foto(
    foto: UploadFile = File(...),
    _: Usuario = Depends(get_current_user),
):
    ext = foto.filename.split(".")[-1] if foto.filename and "." in foto.filename else "jpg"
    filename = f"{uuid.uuid4()}.{ext}"
    filepath = os.path.join("static", "uploads", filename)
    
    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(foto.file, buffer)
        
    return {"data": {"url": f"http://172.28.19.126:8000/static/uploads/{filename}"}}

@router.post(
    "",
    response_model=ReporteResponse,
    status_code=status.HTTP_201_CREATED,
)
async def crear_reporte(
    data: ReporteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    # Construir punto PostGIS desde latitud/longitud
    punto = WKTElement(
        f"POINT({data.longitud} {data.latitud})", srid=4326
    )

    reporte = Reporte(
        usuario_id=current_user.id,
        latitud=data.latitud,
        longitud=data.longitud,
        ubicacion=punto,
        foto_url=data.foto_url,
        tipo_lugar=data.tipo_lugar,
        tipo_objeto=data.tipo_objeto,
        observa_larvas=data.observa_larvas,
        conocimiento_dengue_cercano=data.conocimiento_dengue_cercano,
        comentarios=data.comentarios,
    )
    db.add(reporte)
    await db.flush()
    await db.refresh(reporte)
    return reporte


@router.get("", response_model=list[ReporteResponse])
async def listar_reportes(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    estado: str | None = Query(None),
    rango: str | None = Query(None, pattern="^(7d|30d|90d)$", description="Rango temporal: 7d, 30d o 90d"),
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    query = select(Reporte)
    if estado:
        query = query.where(Reporte.estado == estado)
    if rango and (dias := _RANGO_DIAS.get(rango)):
        since = datetime.now(timezone.utc) - timedelta(days=dias)
        query = query.where(Reporte.fecha_reporte >= since)
    query = query.order_by(Reporte.fecha_reporte.desc()).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()


@router.get("/{reporte_id}", response_model=ReporteResponse)
async def obtener_reporte(
    reporte_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")
    return reporte


@router.patch("/{reporte_id}/estado", response_model=ReporteResponse)
async def actualizar_estado(
    reporte_id: uuid.UUID,
    data: ReporteUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")
    if data.estado is not None:
        reporte.estado = data.estado
    await db.flush()
    await db.refresh(reporte)
    return reporte


@router.patch("/{reporte_id}/asignar", response_model=ReporteResponse)
async def asignar_reporte(
    reporte_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()
    if not reporte:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Reporte no encontrado")
    if reporte.estado != "enviado":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"El reporte ya tiene estado '{reporte.estado}' y no puede asignarse",
        )
    reporte.estado = "en_revision"
    await db.flush()
    await db.refresh(reporte)
    return reporte
