import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.api.v1 import api_router
from app.core.config import settings

# Crear carpeta para fotos locales si no existe
os.makedirs("static/uploads", exist_ok=True)

app = FastAPI(
    title="SIVAPRE API",
    version="1.0.0",
    description=(
        "API del Sistema de Vigilancia y Prevención de Enfermedades (SIVAPRE). "
        "Gestiona reportes epidemiológicos, usuarios, casos y visualización geoespacial."
    ),
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

# ─── Static Files ────────────────────────────────────────────────────────────
app.mount("/static", StaticFiles(directory="static"), name="static")

# ─── CORS ────────────────────────────────────────────────────────────────────
# En producción reemplazar allow_origins con los dominios reales
origins = ["*"] if settings.DEBUG else []

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Routers ─────────────────────────────────────────────────────────────────
app.include_router(api_router)


# ─── Rutas base ───────────────────────────────────────────────────────────────
@app.get("/", tags=["Health"])
async def root():
    return {
        "message": "Bienvenido a SIVAPRE API",
        "version": app.version,
        "environment": settings.APP_ENV,
        "docs": "/docs",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "ok"}
