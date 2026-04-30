import os

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded

from app.api.v1 import api_router
from app.core.config import settings
from app.core.limiter import limiter

app = FastAPI(
    title="SIVAPRE API",
    version="1.0.0",
    description=(
        "API del Sistema de Vigilancia y Prevención de Enfermedades (SIVAPRE). "
        "Gestiona reportes epidemiológicos, usuarios, casos y visualización geoespacial."
    ),
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# ─── Rate limiting ────────────────────────────────────────────────────────────
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# ─── Archivos estáticos (fotos de reportes) ───────────────────────────────────
# Crea la carpeta si no existe (primera vez que arranca el servidor).
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")


# ─── Manejo de errores de validación ─────────────────────────────────────────
@app.exception_handler(RequestValidationError)
async def validation_exception_handler(_: Request, exc: RequestValidationError):
    errores: dict[str, list[str]] = {}
    for error in exc.errors():
        campo = ".".join(str(loc) for loc in error["loc"] if loc != "body")
        errores.setdefault(campo, []).append(error["msg"])

    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "mensaje": "Los datos enviados no son válidos.",
            "errores": errores,
        },
    )


# ─── Routers ──────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ─── Rutas base ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Bienvenido a SIVAPRE API",
        "version": app.version,
        "environment": settings.APP_ENV,
        "docs": "/docs" if settings.DEBUG else None,
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
