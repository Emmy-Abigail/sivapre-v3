from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Entorno
    APP_ENV: str = "development"
    DEBUG: bool = True

    # PostgreSQL
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_HOST: str = "db"
    POSTGRES_PORT: int = 5432

    # SQLAlchemy async
    DATABASE_URL: str

    # JWT
    JWT_SECRET_KEY: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # ─── Storage de fotos ──────────────────────────────────────────────────────
    # STORAGE_BACKEND: 'local' hoy. Mañana podría ser 'minio'.
    # Para cambiar de backend: solo cambiar esta variable y reiniciar.
    STORAGE_BACKEND: str = "local"

    # Carpeta local donde se guardan las fotos (relativa al directorio de trabajo del backend).
    # En Docker apunta al volumen montado en /app/uploads.
    UPLOAD_DIR: str = "uploads"

    # URL base pública del backend (sin barra final).
    # Debe coincidir con la URL que usan los clientes (app móvil, dashboard).
    # En desarrollo: http://localhost:8000
    # Con ngrok:      https://tu-tunnel.ngrok-free.dev
    MEDIA_BASE_URL: str = "http://localhost:8000"

    # ─── Cloudinary (DEPRECADO — mantenido para compatibilidad) ───────────────
    # Ya no se usa en el código principal. El backend usa storage local.
    # Se puede eliminar estas variables del .env cuando se confirme la migración.
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    # Clave secreta para crear el primer admin (setup inicial del sistema)
    ADMIN_SECRET_KEY: str = "cambiar-en-produccion"

    # CORS — en producción definir una lista separada por comas, p.ej.:
    # ALLOWED_ORIGINS=https://app.sivapre.gob,https://admin.sivapre.gob
    ALLOWED_ORIGINS: list[str] = ["*"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
    )


settings = Settings()
