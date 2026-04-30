# Backend — SIVAPRE

API REST construida con FastAPI (Python). Es el núcleo del sistema: recibe datos de la app móvil, los guarda en PostgreSQL, sirve datos al dashboard y envía notificaciones push.

---

## Índice

1. [Estructura de carpetas](#1-estructura-de-carpetas)
2. [Variables de entorno](#2-variables-de-entorno)
3. [Base de datos — Tablas](#3-base-de-datos--tablas)
4. [Endpoints de la API](#4-endpoints-de-la-api)
5. [Autenticación y sesión](#5-autenticación-y-sesión)
6. [Seguridad implementada](#6-seguridad-implementada)
7. [Almacenamiento de fotos](#7-almacenamiento-de-fotos)
8. [Notificaciones push](#8-notificaciones-push)
9. [Migraciones](#9-migraciones)
10. [Comandos útiles](#10-comandos-útiles)

---

## 1. Estructura de carpetas

```
backend/
├── app/
│   ├── main.py              # Punto de entrada: FastAPI, rate limiter, CORS, static files
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py  # Registra todos los routers en /api/v1
│   │       └── routes/
│   │           ├── usuarios.py   # Auth: login, registro, refresh, perfil, push token
│   │           ├── reportes.py   # CRUD de reportes + subida de fotos (idempotente)
│   │           └── dashboard.py  # KPIs, mapa, feed, tendencias, personal
│   ├── core/
│   │   ├── config.py        # Variables de entorno con Pydantic Settings
│   │   ├── database.py      # Conexión PostgreSQL async (pool_size=10, max_overflow=20)
│   │   ├── limiter.py       # Rate limiter global (SlowAPI)
│   │   └── security.py      # JWT (access + refresh), bcrypt, get_current_user
│   ├── models/
│   │   ├── usuario.py       # Tabla usuarios
│   │   ├── reporte.py       # Tabla reportes_app (con idempotencia device_id/local_id)
│   │   ├── caso_noti.py     # Tabla casos_noti (datos NOTI)
│   │   └── caso_netlab.py   # Tabla casos_netlab (datos NETLAB)
│   ├── schemas/
│   │   ├── auth.py          # LoginRequest
│   │   ├── usuario.py       # UsuarioCreate, UsuarioResponse, AuthResponse...
│   │   ├── reporte.py       # ReporteCreate (con device_id/local_id), ReporteResponse...
│   │   ├── enums.py         # RolEnum, EstadoReporteEnum, TipoLugarEnum...
│   │   └── responses.py     # ApiResponse, PaginatedData, FotoResponse
│   └── services/
│       ├── notifications.py # Push notifications vía Expo
│       └── storage/         # Almacenamiento de fotos (local → MinIO en el futuro)
│           ├── base.py      # Interfaz abstracta StorageBackend
│           ├── local_storage.py  # Implementación en disco (Pillow → WebP)
│           └── __init__.py  # Factory: elige backend según STORAGE_BACKEND
├── alembic/
│   ├── env.py               # Configuración Alembic
│   └── versions/            # Migraciones en orden cronológico
├── Dockerfile
├── requirements.txt
└── .env                     # Variables de entorno (NO subir a Git)
```

---

## 2. Variables de entorno

El archivo `backend/.env` contiene toda la configuración sensible. Nunca debe subirse a Git.

```env
# ── Entorno ───────────────────────────────────────────────────
APP_ENV=development       # "development" o "production"
DEBUG=True                # False en producción (oculta /docs y /redoc)

# ── PostgreSQL ─────────────────────────────────────────────────
POSTGRES_USER=sivapre
POSTGRES_PASSWORD=sivapre_secret
POSTGRES_DB=sivapre_db
POSTGRES_HOST=db          # Nombre del servicio Docker
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://sivapre:sivapre_secret@db:5432/sivapre_db

# ── JWT ────────────────────────────────────────────────────────
JWT_SECRET_KEY=clave-super-secreta-de-64-caracteres-minimo
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30   # Access token: 30 minutos
# Refresh token: 30 días (fijo en código, no configurable por env)

# ── Almacenamiento de fotos ────────────────────────────────────
STORAGE_BACKEND=local     # "local" hoy. En producción: "minio" (próximamente)
UPLOAD_DIR=uploads        # Carpeta local. En Docker: volumen "uploads_data"
MEDIA_BASE_URL=https://tu-tunnel.ngrok-free.dev  # URL base pública del backend

# ── CORS ───────────────────────────────────────────────────────
# En producción, reemplazar con los dominios reales:
ALLOWED_ORIGINS=["https://dashboard.sivapre.gob.pe","https://app.sivapre.gob.pe"]
# En desarrollo: ALLOWED_ORIGINS=["*"]

# ── Setup del primer administrador ─────────────────────────────
ADMIN_SECRET_KEY=clave-para-crear-primer-admin   # CAMBIAR en producción
```

### Variables que NO deben tener valor por defecto en producción

| Variable | Riesgo si no se cambia |
|---|---|
| `JWT_SECRET_KEY` | Tokens firmados con clave conocida → forgery |
| `ADMIN_SECRET_KEY` | El endpoint `/auth/setup` queda accesible con la clave del repo |
| `POSTGRES_PASSWORD` | Base de datos accesible con contraseña pública |
| `MEDIA_BASE_URL` | URLs de fotos apuntan a localhost, rompiendo imágenes en la app |

---

## 3. Base de datos — Tablas

### `usuarios`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único |
| `nombre` | VARCHAR(150) | Nombre del usuario |
| `apellido` | VARCHAR(100) | Apellido (opcional) |
| `email` | VARCHAR(255) | Correo único, usado para login |
| `telefono` | VARCHAR(20) | Teléfono (opcional) |
| `departamento` / `provincia` / `distrito` | VARCHAR(100) | Ubigeo del usuario |
| `rol` | VARCHAR(50) | `ciudadano`, `inspector` o `admin` |
| `hashed_password` | VARCHAR(255) | Contraseña hasheada con bcrypt |
| `push_token` | VARCHAR(200) | Expo push token (último dispositivo registrado) |
| `es_activo` | BOOLEAN | Si el usuario puede iniciar sesión |
| `fecha_registro` | TIMESTAMPTZ | Cuándo se registró |
| `ultimo_acceso` | TIMESTAMPTZ | Último login exitoso |

### `reportes_app`

| Campo | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único |
| `usuario_id` | UUID | FK → usuarios |
| `device_id` | VARCHAR(64) | UUID del dispositivo (idempotencia offline) |
| `local_id` | VARCHAR(64) | UUID del reporte en el dispositivo (idempotencia offline) |
| `latitud` / `longitud` | FLOAT | Coordenadas GPS |
| `ubicacion` | GEOMETRY | Punto PostGIS (SRID 4326) |
| `foto_url` | VARCHAR(500) | URL pública de la foto comprimida |
| `tipo_lugar` | VARCHAR(100) | Vivienda, Vía Pública, Terreno Abandonado... |
| `tipo_objeto` | VARCHAR(100) | Llantas, Baldes, Plantas, Botellas... |
| `observa_larvas` | VARCHAR(50) | "Sí, claramente" / "No estoy seguro" / "No" |
| `conocimiento_dengue_cercano` | VARCHAR(50) | "Sí" / "No lo sé" / "No" |
| `comentarios` | TEXT | Notas adicionales del ciudadano |
| `estado` | VARCHAR(50) | `enviado`, `en_revision`, `resuelto`, `rechazado`, `cancelado` |
| `fecha_reporte` | TIMESTAMPTZ | Cuándo se envió |
| `fecha_actualizacion` | TIMESTAMPTZ | Última modificación |

**Índices especiales en `reportes_app`:**
- `ix_reportes_device_id`: índice en `device_id` para búsquedas de idempotencia rápidas.
- `uq_reportes_device_local` (UNIQUE PARTIAL): `(device_id, local_id)` donde ambos `IS NOT NULL`. Garantiza a nivel de base de datos que no existan dos reportes con el mismo origen de dispositivo, incluso en condiciones de carrera.

---

## 4. Endpoints de la API

Documentación interactiva disponible en `http://localhost:8000/docs` (solo en desarrollo).

### Autenticación (`/api/v1/auth/`)

| Método | Ruta | Rate limit | Descripción |
|---|---|---|---|
| POST | `/auth/register` | 5/min por IP | Registrar nuevo ciudadano |
| POST | `/auth/login` | 10/min por IP | Iniciar sesión, obtiene tokens JWT |
| POST | `/auth/refresh` | Sin límite | Renovar access token con refresh token |
| POST | `/auth/logout` | — | Cerrar sesión (requiere auth) |
| GET | `/auth/perfil` | — | Ver perfil propio |
| PATCH | `/auth/perfil` | — | Actualizar nombre, teléfono, ubigeo |
| POST | `/auth/perfil/password` | — | Cambiar contraseña |
| POST | `/auth/push-token` | — | Guardar Expo push token del dispositivo |
| POST | `/auth/setup` | — | Crear primer admin (solo funciona una vez) |

**Ejemplo — Login:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "usuario@email.com", "password": "micontraseña"}'
```

**Respuesta:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": { "id": "uuid", "nombre": "Juan Pérez", "email": "...", "rol": "ciudadano" }
}
```

**Ejemplo — Refresh token:**
```bash
curl -X POST http://localhost:8000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refresh_token": "eyJhbGciOiJIUzI1NiIs..."}'
```

Retorna el mismo formato que login: nuevo `token` + nuevo `refreshToken`.

---

### Reportes (`/api/v1/reportes/`)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/reportes/foto` | Subir foto, obtiene URL pública |
| POST | `/reportes` | Crear reporte (idempotente con device_id + local_id) |
| GET | `/reportes/mis-reportes` | Listar reportes propios (paginado) |
| GET | `/reportes/alertas-zona` | Alertas de criaderos en la zona del usuario |
| GET | `/reportes/{id}` | Ver detalle de un reporte |
| PATCH | `/reportes/{id}/cancelar` | Cancelar un reporte propio |
| PATCH | `/reportes/{id}/foto` | Adjuntar o reemplazar foto de un reporte existente |

**Ejemplo — Crear reporte con idempotencia:**
```bash
curl -X POST http://localhost:8000/api/v1/reportes \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "latitud": -12.046374,
    "longitud": -77.042793,
    "tipo_lugar": "Vivienda",
    "tipo_objeto": "Baldes",
    "observa_larvas": "Sí, claramente",
    "foto_url": "http://localhost:8000/uploads/2026/04/29/abc123.webp",
    "device_id": "550e8400-e29b-41d4-a716-446655440000",
    "local_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7"
  }'
```

Si se reenvía la misma combinación `(device_id, local_id)`, el backend devuelve el reporte existente con HTTP 201 — sin crear duplicado.

---

### Dashboard (`/api/v1/dashboard/`)

Todos los endpoints del dashboard requieren rol `inspector` o `admin`.

**Filtros comunes:**

| Parámetro | Tipo | Descripción |
|---|---|---|
| `fecha_desde` | date | Filtrar desde esta fecha (YYYY-MM-DD) |
| `fecha_hasta` | date | Filtrar hasta esta fecha |
| `departamento` | string | Filtrar por departamento |
| `provincia` | string | Filtrar por provincia |
| `distrito` | string | Filtrar por distrito |

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/kpis` | 4 métricas en paralelo (asyncio.gather) |
| GET | `/dashboard/mapa/reportes` | Puntos GPS de reportes ciudadanos (máx. 2000) |
| GET | `/dashboard/mapa/noti` | Casos NOTI agrupados por provincia |
| GET | `/dashboard/mapa/netlab` | Casos NETLAB confirmados con serotipo |
| GET | `/dashboard/feed` | Últimos reportes con detalle completo |
| GET | `/dashboard/tendencias` | Series de tiempo semanales |
| GET | `/dashboard/ubicaciones` | Departamentos disponibles para filtros |
| PATCH | `/dashboard/reportes/{id}/estado` | Cambiar estado + push notification |
| GET | `/dashboard/personal` | Inspectores y admins (solo admin) |
| POST | `/dashboard/personal` | Crear inspector o admin |
| PATCH | `/dashboard/personal/{id}/estado` | Activar/desactivar personal |

---

## 5. Autenticación y sesión

### Flujo de tokens

```
Login exitoso
  → access_token  (expira en 30 minutos)
  → refresh_token (expira en 30 días)

Durante la sesión normal:
  App → request con access_token → OK

Cuando el access_token expira (silencioso, invisible para el usuario):
  App → request → 401
  App → POST /auth/refresh con refresh_token
  Backend → nuevo access_token + nuevo refresh_token
  App → reintenta el request original con el nuevo token → OK

Cuando el refresh_token también expira (después de 30 días sin actividad):
  POST /auth/refresh → 401
  App → logout automático → pantalla de login
```

### Por qué dos tipos de token

Un único token de larga duración (por ejemplo, 30 días) sería más simple, pero representa un riesgo mayor: si se filtra, el atacante tiene acceso por 30 días. Con el sistema de dos tokens:
- El access token es de corta vida (30 min) → si se filtra, el daño es limitado.
- El refresh token nunca viaja en las peticiones normales (solo se usa en `/auth/refresh`) → menor exposición.

### Diferenciación de tipos de token

Cada token lleva el claim `"type": "access"` o `"type": "refresh"`. El endpoint `/auth/refresh` rechaza tokens de tipo `access` aunque no hayan expirado. Esto evita que un access token interceptado pueda usarse para obtener nuevos tokens.

### Roles y permisos

```
ciudadano  → /auth/* y /reportes/* (solo sus propios datos)
inspector  → todo lo anterior + /dashboard/* (lectura y cambio de estados)
admin      → todo lo anterior + /dashboard/personal (crear/gestionar usuarios)
```

### Crear el primer administrador

```bash
curl -X POST http://localhost:8000/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "valor-de-ADMIN_SECRET_KEY-en-env",
    "nombre": "Admin Principal",
    "email": "admin@sivapre.gob.pe",
    "password": "contraseña-segura-minimo-8-chars"
  }'
```

Solo funciona si no existe ningún admin en la base de datos. Una vez creado, los demás usuarios del personal se crean desde el dashboard.

---

## 6. Seguridad implementada

### Rate limiting (SlowAPI)

| Endpoint | Límite | Razón |
|---|---|---|
| `POST /auth/login` | 10 intentos/min por IP | Protección contra fuerza bruta de contraseñas |
| `POST /auth/register` | 5 registros/min por IP | Previene creación masiva de cuentas falsas |

El límite de login es generoso (10/min) porque zonas con NAT compartido (municipios, centros de salud) pueden tener muchos usuarios bajo la misma IP pública.

Si se supera el límite, el servidor responde con HTTP 429 Too Many Requests.

### Tokens seguros en el dispositivo

En la app móvil, los tokens JWT se almacenan en **SecureStore** (no en AsyncStorage):
- **iOS**: iOS Keychain (hardware-backed en dispositivos con Secure Enclave).
- **Android**: Android Keystore / EncryptedSharedPreferences.

AsyncStorage en Android es texto plano en `/data/data/[app]/`. Un dispositivo rooteado puede leerlo sin permisos. SecureStore requiere acceso al keystore del SO.

### Idempotencia y condición de carrera

El endpoint `POST /reportes` maneja tres capas de defensa contra duplicados:

1. **Consulta previa**: Si `(device_id, local_id)` ya existe, retorna el reporte existente sin tocar la BD.
2. **Índice único parcial** en PostgreSQL: `WHERE device_id IS NOT NULL AND local_id IS NOT NULL`. Garantiza unicidad a nivel de BD.
3. **Catch de IntegrityError**: Si dos requests simultáneos pasan la consulta previa antes de que ninguno haya hecho el INSERT (condición de carrera real), el segundo recibirá un IntegrityError. Se hace rollback y se retorna el reporte ya creado por el primero.

### CORS

En desarrollo: `ALLOWED_ORIGINS=["*"]` (aceptable porque no hay credenciales de sesión en cookies).

**En producción debe cambiarse** a la lista explícita de dominios del sistema:
```env
ALLOWED_ORIGINS=["https://dashboard.sivapre.gob.pe","https://app.sivapre.gob.pe"]
```

---

## 7. Almacenamiento de fotos

### Flujo actual (STORAGE_BACKEND=local)

```
App móvil → POST /reportes/foto (multipart) → Pillow comprime → disco local
URL devuelta: https://api.sivapre.gob.pe/uploads/2026/04/29/abc123.webp
```

La compresión aplica:
- Redimensión a máximo 1200px en cualquier lado (proporcional).
- Conversión a WebP quality 75.
- Una foto de 12 MP (~4 MB JPEG) queda en ~200-400 KB WebP.

### Persistencia del volumen

Las fotos se guardan en el volumen Docker `uploads_data`, definido en `docker-compose.yml`. **Este volumen es crítico**: si se eliminara, todas las `foto_url` en la BD quedarían rotas (archivo referenciado pero inexistente).

```bash
# Ver cuánto espacio ocupa el volumen de fotos
docker system df -v | grep uploads_data

# Nunca hacer esto si hay datos en producción:
docker compose down -v   ⚠️ BORRA VOLÚMENES (base de datos + fotos)
```

### Migración futura a MinIO

El módulo `app/services/storage/` usa una interfaz abstracta `StorageBackend`. Para migrar a MinIO:
1. Crear `MinioStorageBackend` en `app/services/storage/minio_storage.py` implementando la misma interfaz.
2. Agregar `'minio'` como opción en `app/services/storage/__init__.py`.
3. Cambiar `STORAGE_BACKEND=minio` en `.env` y reiniciar.
4. El resto del código (endpoints, modelos) no cambia.

**Nota**: La migración a MinIO implicará que las `foto_url` históricas (que apuntan al servidor local) quedarán rotas. Se necesita una migración de datos para actualizar las URLs.

---

## 8. Notificaciones push

Cuando el dashboard cambia el estado de un reporte, el backend envía automáticamente una notificación al ciudadano vía Expo Push Service.

### Cómo funciona

1. La app registra el **Expo Push Token** del dispositivo al hacer login (endpoint `/auth/push-token`).
2. El backend lo guarda en `usuarios.push_token`.
3. Al cambiar el estado (`PATCH /dashboard/reportes/{id}/estado`), el backend llama `https://exp.host/push/send`.

### Mensajes según el estado

| Estado | Título | Cuerpo |
|---|---|---|
| `en_revision` | 🔍 Reporte en revisión | Un inspector está revisando tu reporte |
| `resuelto` | ✅ Reporte resuelto | ¡Tu criadero ha sido controlado. Gracias! |
| `rechazado` | ℹ️ Reporte no procesado | No pudo ser verificado en campo |
| `cancelado` | Reporte cancelado | Tu reporte fue cancelado |

### Limitación conocida

`push_token` almacena un solo token por usuario. Si el ciudadano tiene dos teléfonos o reinstala la app, el token anterior queda huérfano y solo el último dispositivo recibe notificaciones.

---

## 9. Migraciones

Las migraciones registran cambios en la estructura de la base de datos. Se aplican en orden usando Alembic.

### Aplicar migraciones pendientes

```bash
docker exec sivapre_backend alembic upgrade head
```

### Crear una nueva migración

```bash
docker exec sivapre_backend alembic revision --autogenerate -m "descripcion del cambio"
# Revisar el archivo generado en alembic/versions/ antes de aplicar
docker exec sivapre_backend alembic upgrade head
```

### Historial de migraciones

| Archivo | Cambio |
|---|---|
| `0d75a9572da8_initial_schema` | Esquema inicial: usuarios, reportes, NOTI, NETLAB |
| `0001-add_apellido_rol` | Agrega `apellido` y `rol` a usuarios |
| `0002-ampliar_campos_varchar50` | Amplía campos de tipo y estado en reportes |
| `0003-es_activo_server_default` | Agrega valor por defecto a `es_activo` |
| `2026_04_28_0001-add_ubigeo` | Agrega `departamento`, `provincia`, `distrito` a usuarios |
| `2026_04_29_0001-add_push_token` | Agrega `push_token` a usuarios |
| `2026_04_29_0002-add_idempotency` | Agrega `device_id`, `local_id` e índices a reportes |

---

## 10. Comandos útiles

```bash
# Ver logs del backend en tiempo real
docker logs sivapre_backend -f

# Acceder a la shell del backend
docker exec -it sivapre_backend bash

# Reiniciar el backend (necesario después de cambiar .env)
docker restart sivapre_backend

# Ver todos los contenedores y su estado
docker ps

# Detener todo (SIN borrar volúmenes)
docker compose down

# Detener Y borrar volúmenes (borra BD + fotos) ⚠️ IRREVERSIBLE
docker compose down -v
```

### Acceso a la base de datos

```bash
# Desde terminal
docker exec -it sivapre_db psql -U sivapre -d sivapre_db

# Ver reportes recientes
SELECT id, estado, device_id, local_id, fecha_reporte FROM reportes_app ORDER BY fecha_reporte DESC LIMIT 10;

# Ver usuarios registrados
SELECT id, email, rol, es_activo, fecha_registro FROM usuarios ORDER BY fecha_registro DESC;
```

### pgAdmin (interfaz visual)

Abrir `http://localhost:5050` — credenciales en las variables `PGADMIN_EMAIL` y `PGADMIN_PASSWORD` del `docker-compose.yml`.
