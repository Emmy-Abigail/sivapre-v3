import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field


class UsuarioBase(BaseModel):
    nombre: str = Field(..., max_length=150)
    email: EmailStr
    telefono: str | None = Field(None, max_length=20)
    distrito: str | None = Field(None, max_length=100)


class UsuarioCreate(UsuarioBase):
    password: str = Field(..., min_length=8)


class UsuarioResponse(UsuarioBase):
    id: uuid.UUID
    es_activo: bool
    fecha_registro: datetime

    model_config = {"from_attributes": True}
