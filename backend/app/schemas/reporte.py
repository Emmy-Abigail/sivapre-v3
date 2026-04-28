import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ReporteBase(BaseModel):
    tipo_lugar: str = Field(..., max_length=100)
    tipo_objeto: str = Field(..., max_length=100)
    observa_larvas: str = Field(..., max_length=50)
    conocimiento_dengue_cercano: str | None = Field(None, max_length=50)
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
    estado: str
    fecha_reporte: datetime

    model_config = {"from_attributes": True}


class ReporteUpdate(BaseModel):
    estado: str | None = Field(None, max_length=50)
