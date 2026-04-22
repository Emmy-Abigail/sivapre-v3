from fastapi import APIRouter

from app.api.v1.routes import usuarios, reportes, dashboard, casos_noti, casos_netlab

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(usuarios.router,     prefix="/auth")
api_router.include_router(reportes.router,     prefix="/reportes")
api_router.include_router(dashboard.router,    prefix="/dashboard")
api_router.include_router(casos_noti.router,   prefix="/casos-noti")
api_router.include_router(casos_netlab.router, prefix="/casos-netlab")
