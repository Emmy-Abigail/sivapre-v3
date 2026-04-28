from datetime import timezone, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    hash_password,
    verify_password,
)
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest, Token
from app.schemas.usuario import UsuarioCreate, UsuarioResponse

router = APIRouter(tags=["Auth"])


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    # Verificar email único
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
        )

    user = Usuario(
        nombre=data.nombre,
        email=data.email,
        telefono=data.telefono,
        distrito=data.distrito,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    
    token = create_access_token(data={"sub": user.email})
    return {
        "token": token,
        "refreshToken": token,
        "usuario": {
            "id": str(user.id),
            "nombre": user.nombre,
            "apellido": user.nombre,
            "email": user.email,
            "telefono": user.telefono,
            "rol": "ciudadano",
            "creadoEn": str(user.fecha_registro)
        }
    }


@router.post("/login")
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales incorrectas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.es_activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo",
        )

    # Actualizar último acceso
    user.ultimo_acceso = datetime.now(timezone.utc)

    token = create_access_token(data={"sub": user.email})
    return {
        "token": token,
        "refreshToken": token,
        "usuario": {
            "id": str(user.id),
            "nombre": user.nombre,
            "apellido": user.nombre,
            "email": user.email,
            "telefono": user.telefono,
            "rol": "ciudadano",
            "creadoEn": str(user.fecha_registro)
        }
    }
