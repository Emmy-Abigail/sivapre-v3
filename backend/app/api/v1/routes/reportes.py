import asyncio
import uuid

import cloudinary
import cloudinary.uploader
from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from geoalchemy2.elements import WKTElement
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.reporte import Reporte
from app.models.usuario import Usuario
from app.schemas.enums import EstadoReporteEnum
from app.schemas.responses import ApiResponse, FotoResponse, PaginatedData
from app.schemas.reporte import ReporteCreate, ReporteResponse, ReporteUpdate

router = APIRouter(tags=["Reportes"])

# Inicializa Cloudinary una sola vez al cargar el módulo
cloudinary.config(
    cloud_name=settings.CLOUDINARY_CLOUD_NAME,
    api_key=settings.CLOUDINARY_API_KEY,
    api_secret=settings.CLOUDINARY_API_SECRET,
    secure=True,
)

_FOTO_MAX_BYTES = 5 * 1024 * 1024  # 5 MB
_FOTO_MIME_PERMITIDOS = {"image/jpeg", "image/png", "image/webp"}


# ─── Subida de foto ───────────────────────────────────────────────────────────

@router.post(
    "/foto",
    response_model=ApiResponse[FotoResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Sube una foto y retorna su URL en Cloudinary",
)
async def subir_foto(
    foto: UploadFile = File(...),
    _: Usuario = Depends(get_current_user),
):
    if foto.content_type not in _FOTO_MIME_PERMITIDOS:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Formato no permitido. Use JPEG, PNG o WebP.",
        )

    contenido = await foto.read()

    if len(contenido) > _FOTO_MAX_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="La imagen no puede superar los 5 MB.",
        )

    try:
        resultado = await asyncio.to_thread(
            cloudinary.uploader.upload,
            contenido,
            folder="sivapre/reportes",
            resource_type="image",
            transformation=[
                {"width": 1024, "height": 1024, "crop": "limit"},
                {"quality": "auto:good"},
                {"format": "webp"},
            ],
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="No se pudo subir la imagen. Intente nuevamente.",
        )

    return ApiResponse(data=FotoResponse(url=resultado["secure_url"]))


# ─── Crear reporte ────────────────────────────────────────────────────────────

@router.post(
    "",
    response_model=ApiResponse[ReporteResponse],
    status_code=status.HTTP_201_CREATED,
    summary="Crea un nuevo reporte de criadero",
)
async def crear_reporte(
    data: ReporteCreate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    punto = WKTElement(f"POINT({data.longitud} {data.latitud})", srid=4326)

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

    return ApiResponse(data=ReporteResponse.model_validate(reporte))


# ─── Mis reportes (paginado) ──────────────────────────────────────────────────

@router.get(
    "/mis-reportes",
    response_model=ApiResponse[PaginatedData[ReporteResponse]],
    summary="Lista los reportes del usuario autenticado con paginación",
)
async def mis_reportes(
    pagina: int = Query(1, ge=1),
    porPagina: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    filtro = Reporte.usuario_id == current_user.id
    offset = (pagina - 1) * porPagina

    total, items = await asyncio.gather(
        db.scalar(select(func.count()).select_from(Reporte).where(filtro)),
        db.execute(
            select(Reporte)
            .where(filtro)
            .order_by(Reporte.fecha_reporte.desc())
            .offset(offset)
            .limit(porPagina)
        ),
    )

    reportes = [ReporteResponse.model_validate(r) for r in items.scalars().all()]

    return ApiResponse(
        data=PaginatedData(
            data=reportes,
            total=total or 0,
            pagina=pagina,
            porPagina=porPagina,
        )
    )


# ─── Obtener reporte por ID ───────────────────────────────────────────────────

@router.get(
    "/{reporte_id}",
    response_model=ApiResponse[ReporteResponse],
    summary="Obtiene un reporte por su ID",
)
async def obtener_reporte(
    reporte_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()
    if not reporte:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado.",
        )
    return ApiResponse(data=ReporteResponse.model_validate(reporte))


# ─── Cancelar reporte (solo el dueño) ────────────────────────────────────────

@router.patch(
    "/{reporte_id}/cancelar",
    response_model=ApiResponse[ReporteResponse],
    summary="Cancela un reporte propio (solo el autor puede cancelarlo)",
)
async def cancelar_reporte(
    reporte_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()

    if not reporte:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado.",
        )
    if reporte.usuario_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No tienes permiso para cancelar este reporte.",
        )
    if reporte.estado not in (EstadoReporteEnum.ENVIADO, EstadoReporteEnum.ENVIADO.value):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Solo se pueden cancelar reportes en estado 'enviado'.",
        )

    reporte.estado = EstadoReporteEnum.CANCELADO.value
    await db.flush()
    await db.refresh(reporte)

    return ApiResponse(data=ReporteResponse.model_validate(reporte))


# ─── Actualizar estado (inspector / admin) ────────────────────────────────────

@router.patch(
    "/{reporte_id}/estado",
    response_model=ApiResponse[ReporteResponse],
    summary="Actualiza el estado de un reporte (uso interno)",
)
async def actualizar_estado(
    reporte_id: uuid.UUID,
    data: ReporteUpdate,
    db: AsyncSession = Depends(get_db),
    _: Usuario = Depends(get_current_user),
):
    result = await db.execute(select(Reporte).where(Reporte.id == reporte_id))
    reporte = result.scalar_one_or_none()
    if not reporte:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Reporte no encontrado.",
        )
    if data.estado is not None:
        reporte.estado = data.estado.value
    await db.flush()
    await db.refresh(reporte)

    return ApiResponse(data=ReporteResponse.model_validate(reporte))
