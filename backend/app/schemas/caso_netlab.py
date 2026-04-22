import uuid
from datetime import datetime

from pydantic import BaseModel


class CasoNetlabBase(BaseModel):
    id_muestra_netlab: str
    fecha_corte: datetime
    departamento_paciente: str
    provincia_paciente: str
    distrito_paciente: str
    ubigeo_paciente: str
    edad_paciente: int
    sexo_paciente: str
    nombre_examen: str
    dx_molecular_dengue: str | None
    serotipo_dengue: str | None
    elisa_ns1: str | None
    fecha_validado: datetime | None


class CasoNetlabResponse(CasoNetlabBase):
    id: uuid.UUID
    fecha_creacion: datetime

    model_config = {"from_attributes": True}
