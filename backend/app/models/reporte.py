import uuid
from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base


class Reporte(Base):
    __tablename__ = "reportes_app"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    usuario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("usuarios.id", ondelete="CASCADE"), index=True
    )

    # Coordenadas planas (para consultas rápidas sin PostGIS)
    latitud: Mapped[float] = mapped_column(Float)
    longitud: Mapped[float] = mapped_column(Float)

    # Columna geoespacial PostGIS — SRID 4326 (WGS 84)
    ubicacion: Mapped[str | None] = mapped_column(
        Geometry(geometry_type="POINT", srid=4326), nullable=True
    )

    foto_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    tipo_lugar: Mapped[str] = mapped_column(String(100))
    tipo_objeto: Mapped[str] = mapped_column(String(100))
    observa_larvas: Mapped[str] = mapped_column(String(50))
    conocimiento_dengue_cercano: Mapped[str | None] = mapped_column(
        String(50), nullable=True
    )
    comentarios: Mapped[str | None] = mapped_column(Text, nullable=True)
    estado: Mapped[str] = mapped_column(String(50), default="enviado")
    fecha_reporte: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    fecha_actualizacion: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relación con Usuario
    usuario: Mapped["Usuario"] = relationship(
        "Usuario", back_populates="reportes", lazy="select"
    )
