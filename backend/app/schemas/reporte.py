import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.enums import (
    ConocimientoDengueEnum,
    EstadoReporteEnum,
    ObservaLarvasEnum,
    TipoLugarEnum,
    TipoObjetoEnum,
)


class ReporteBase(BaseModel):
    tipo_lugar: TipoLugarEnum
    tipo_objeto: TipoObjetoEnum
    observa_larvas: ObservaLarvasEnum
    conocimiento_dengue_cercano: ConocimientoDengueEnum | None = None
    comentarios: str | None = None


class ReporteCreate(ReporteBase):
    latitud: float = Field(..., ge=-90, le=90)
    longitud: float = Field(..., ge=-180, le=180)
    foto_url: str | None = Field(None, max_length=500)


class ReporteResponse(ReporteBase):
    id: uuid.UUID
    usuario_id: uuid.UUID
    latitud: float
    longitud: float
    foto_url: str | None
    estado: EstadoReporteEnum
    fecha_reporte: datetime
    fecha_actualizacion: datetime

    model_config = {"from_attributes": True}


class ReporteUpdate(BaseModel):
    estado: EstadoReporteEnum | None = None
