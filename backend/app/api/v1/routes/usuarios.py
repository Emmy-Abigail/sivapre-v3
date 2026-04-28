from datetime import timezone, datetime

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import (
    create_access_token,
    create_refresh_token,
    get_current_user,
    hash_password,
    verify_password,
)
from app.models.usuario import Usuario
from app.schemas.auth import LoginRequest
from app.schemas.responses import ApiResponse
from app.schemas.usuario import AuthResponse, UsuarioCreate, UsuarioResponse, UsuarioUpdate

router = APIRouter(tags=["Auth"])


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
)
async def register(data: UsuarioCreate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Usuario).where(Usuario.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="El email ya está registrado",
        )

    user = Usuario(
        nombre=data.nombre,
        apellido=data.apellido,
        email=data.email,
        telefono=data.telefono,
        departamento=data.departamento,
        provincia=data.provincia,
        distrito=data.distrito,
        hashed_password=hash_password(data.password),
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    return AuthResponse(
        token=create_access_token({"sub": user.email}),
        refreshToken=create_refresh_token({"sub": user.email}),
        usuario=UsuarioResponse.model_validate(user),
    )


@router.post("/login", response_model=AuthResponse)
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

    user.ultimo_acceso = datetime.now(timezone.utc)

    return AuthResponse(
        token=create_access_token({"sub": user.email}),
        refreshToken=create_refresh_token({"sub": user.email}),
        usuario=UsuarioResponse.model_validate(user),
    )


@router.post(
    "/logout",
    status_code=status.HTTP_200_OK,
    summary="Cierra la sesión del usuario autenticado",
)
async def logout(_: Usuario = Depends(get_current_user)):
    return {"mensaje": "Sesión cerrada correctamente."}


@router.get(
    "/perfil",
    response_model=ApiResponse[UsuarioResponse],
    summary="Retorna el perfil del usuario autenticado",
)
async def obtener_perfil(current_user: Usuario = Depends(get_current_user)):
    return ApiResponse(data=UsuarioResponse.model_validate(current_user))


@router.patch(
    "/perfil",
    response_model=ApiResponse[UsuarioResponse],
    summary="Actualiza nombre, teléfono y ubigeo del usuario autenticado",
)
async def actualizar_perfil(
    data: UsuarioUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: Usuario = Depends(get_current_user),
):
    cambios = data.model_dump(exclude_none=True)
    for campo, valor in cambios.items():
        setattr(current_user, campo, valor)
    await db.flush()
    await db.refresh(current_user)
    return ApiResponse(data=UsuarioResponse.model_validate(current_user))
