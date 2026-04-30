import asyncio
import io
import uuid
from datetime import date
from pathlib import Path

from PIL import Image

from .base import StorageBackend

# Dimensión máxima en cualquier lado. Una foto de 12 MP queda en ~200-400 KB.
_MAX_DIM = 1200
_WEBP_QUALITY = 75


class LocalStorageBackend(StorageBackend):
    """Almacena fotos en disco local organizadas por fecha.

    Estructura: <upload_dir>/YYYY/MM/DD/<uuid>.webp
    URL pública: <media_base_url>/uploads/YYYY/MM/DD/<uuid>.webp

    Para migrar a MinIO en el futuro: crear MinioStorageBackend con la misma
    interfaz y cambiar STORAGE_BACKEND en settings. El resto del código no cambia.
    """

    def __init__(self, upload_dir: str, media_base_url: str) -> None:
        self._base = Path(upload_dir)
        self._media_base_url = media_base_url.rstrip("/")

    async def guardar(self, contenido: bytes, content_type: str) -> str:
        return await asyncio.to_thread(self._guardar_sync, contenido)

    def _guardar_sync(self, contenido: bytes) -> str:
        hoy = date.today()
        subdir = self._base / str(hoy.year) / f"{hoy.month:02d}" / f"{hoy.day:02d}"
        subdir.mkdir(parents=True, exist_ok=True)

        img = Image.open(io.BytesIO(contenido))

        # Pillow no puede guardar WEBP con canal alfa directamente como JPEG.
        # Convertir modos con transparencia a RGB antes de comprimir.
        if img.mode in ("RGBA", "P", "LA"):
            img = img.convert("RGB")

        # Redimensiona conservando proporción. No agranda fotos pequeñas.
        img.thumbnail((_MAX_DIM, _MAX_DIM), Image.LANCZOS)

        file_id = uuid.uuid4().hex
        filepath = subdir / f"{file_id}.webp"
        img.save(filepath, "WEBP", quality=_WEBP_QUALITY, method=4)

        # Ruta relativa desde upload_dir para construir la URL
        rel = filepath.relative_to(self._base)
        return f"{self._media_base_url}/uploads/{rel}"

    async def eliminar(self, url: str) -> None:
        prefix = f"{self._media_base_url}/uploads/"
        if not url.startswith(prefix):
            return
        rel = url[len(prefix):]
        path = self._base / rel
        await asyncio.to_thread(path.unlink, missing_ok=True)
