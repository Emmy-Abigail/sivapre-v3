# Backend — SIVAPRE

Documentación técnica completa del servidor de SIVAPRE.  
Cualquier persona con conocimientos básicos de programación puede usar este documento para entender, modificar o mantener el backend.

---

## Índice

1. [¿Qué hace el backend?](#1-qué-hace-el-backend)
2. [Tecnologías usadas](#2-tecnologías-usadas)
3. [Estructura de carpetas](#3-estructura-de-carpetas)
4. [Configuración y variables de entorno](#4-configuración-y-variables-de-entorno)
5. [Base de datos](#5-base-de-datos)
6. [Modelos (tablas)](#6-modelos-tablas)
7. [Schemas (validación de datos)](#7-schemas-validación-de-datos)
8. [Endpoints de la API](#8-endpoints-de-la-api)
9. [Autenticación y seguridad](#9-autenticación-y-seguridad)
10. [Subida de imágenes con Cloudinary](#10-subida-de-imágenes-con-cloudinary)
11. [Migraciones de base de datos](#11-migraciones-de-base-de-datos)
12. [Cómo correr el proyecto](#12-cómo-correr-el-proyecto)

---

## 1. ¿Qué hace el backend?

El backend es el servidor que recibe las peticiones de la app móvil, procesa la lógica del negocio y guarda o devuelve datos. Está construido con **FastAPI**, un framework moderno de Python para crear APIs web.

Sus responsabilidades concretas son:

- **Registrar y autenticar usuarios** — guarda cuentas, verifica contraseñas, emite tokens JWT.
- **Recibir reportes de criaderos** — cuando un ciudadano reporta un posible criadero de mosquitos desde la app, el backend lo guarda en la base de datos junto con la ubicación GPS y la foto.
- **Almacenar imágenes** — sube las fotos a Cloudinary (servicio en la nube) y guarda solo el enlace en la base de datos.
- **Servir los reportes** — permite a la app consultar los reportes propios del usuario con paginación.
- **Exponer indicadores (KPIs)** — calcula estadísticas globales para el panel de vigilancia.
- **Gestionar casos epidemiológicos** — almacena datos de notificaciones (NOTI) y resultados de laboratorio (NETLAB) importados desde fuentes oficiales.

---

## 2. Tecnologías usadas

| Tecnología | Versión | Para qué se usa |
|---|---|---|
| **Python** | 3.11 | Lenguaje de programación |
| **FastAPI** | 0.115.5 | Framework web para construir la API |
| **Uvicorn** | 0.32.1 | Servidor que ejecuta FastAPI |
| **SQLAlchemy** | 2.0.36 | ORM: traduce objetos Python a consultas SQL |
| **asyncpg** | 0.30.0 | Driver de PostgreSQL para operaciones asíncronas (en tiempo real) |
| **psycopg2** | 2.9.10 | Driver de PostgreSQL para migraciones (sincrónico) |
| **GeoAlchemy2** | 0.15.2 | Extiende SQLAlchemy para columnas geoespaciales (PostGIS) |
| **Alembic** | 1.14.0 | Gestiona cambios en la estructura de la base de datos |
| **Pydantic v2** | 2.10.3 | Valida y serializa datos de entrada y salida |
| **pydantic-settings** | 2.6.1 | Carga variables de entorno en un objeto tipado |
| **python-jose** | 3.3.0 | Crea y verifica tokens JWT para autenticación |
| **passlib + bcrypt** | 1.7.4 / 4.2.1 | Hashea contraseñas de forma segura |
| **Cloudinary** | 1.41.0 | Almacena y sirve imágenes en la nube |
| **python-multipart** | 0.0.20 | Permite recibir archivos (fotos) en endpoints FastAPI |
| **PostgreSQL + PostGIS** | (Docker) | Base de datos relacional con soporte geoespacial |

---

## 3. Estructura de carpetas

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── __init__.py          ← registra todos los routers en /api/v1
│   │       └── routes/
│   │           ├── usuarios.py      ← endpoints de auth (registro, login, logout)
│   │           ├── reportes.py      ← endpoints de reportes y subida de fotos
│   │           └── dashboard.py     ← endpoint de KPIs
│   ├── core/
│   │   ├── config.py                ← lee variables de entorno (.env)
│   │   ├── database.py              ← crea la conexión a PostgreSQL
│   │   └── security.py              ← JWT, bcrypt, dependencia get_current_user
│   ├── models/
│   │   ├── __init__.py
│   │   ├── usuario.py               ← tabla "usuarios"
│   │   ├── reporte.py               ← tabla "reportes_app"
│   │   ├── caso_noti.py             ← tabla "casos_noti"
│   │   └── caso_netlab.py           ← tabla "casos_netlab"
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── enums.py                 ← valores permitidos para campos específicos
│   │   ├── responses.py             ← formato estándar de respuesta ApiResponse<T>
│   │   ├── auth.py                  ← esquemas para login
│   │   ├── usuario.py               ← esquemas de usuario y respuestas de auth
│   │   ├── reporte.py               ← esquemas de creación y respuesta de reportes
│   │   └── caso_noti.py             ← esquemas de casos de notificación
│   └── main.py                      ← punto de entrada: crea la app, CORS, errores
├── alembic/
│   ├── env.py                       ← configuración de las migraciones
│   ├── script.py.mako               ← plantilla para nuevos archivos de migración
│   └── versions/
│       ├── ...0d75a9572da8_initial_schema.py
│       ├── ...a1b2c3d4e5f6_add_apellido_rol.py
│       ├── ...b2c3d4e5f6a7_ampliar_campos_reporte.py
│       └── ...c3d4e5f6a7b8_es_activo_server_default.py
├── alembic.ini                      ← configuración base de Alembic
├── Dockerfile                       ← imagen Docker del backend
├── entrypoint.sh                    ← ejecuta migraciones antes de iniciar el servidor
└── requirements.txt                 ← dependencias Python
```

---

## 4. Configuración y variables de entorno

El archivo `backend/.env` contiene todas las configuraciones sensibles. **Nunca debe subirse a GitHub.**

```
# Entorno
APP_ENV=development        # "development" o "production"
DEBUG=true                 # true: muestra logs SQL y docs en /docs

# PostgreSQL
POSTGRES_USER=sivapre
POSTGRES_PASSWORD=tu_contraseña
POSTGRES_DB=sivapre
POSTGRES_HOST=db           # nombre del servicio en docker-compose
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://sivapre:tu_contraseña@db:5432/sivapre

# JWT
JWT_SECRET_KEY=una_clave_muy_larga_y_aleatoria
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Cloudinary (para subir fotos)
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# CORS (orígenes permitidos, separados por coma)
# Dejar vacío o con "*" para desarrollo
# ALLOWED_ORIGINS=https://app.sivapre.gob,https://admin.sivapre.gob
```

### Cómo se leen estas variables

El archivo `app/core/config.py` usa `pydantic-settings` para cargar automáticamente cada variable:

```python
class Settings(BaseSettings):
    APP_ENV: str = "development"
    DEBUG: bool = True
    POSTGRES_USER: str
    # ... etc
    ALLOWED_ORIGINS: list[str] = ["*"]

settings = Settings()  # Lee el .env al importar
```

En cualquier parte del código se accede con `from app.core.config import settings` y luego `settings.JWT_SECRET_KEY`, etc.

---

## 5. Base de datos

### Motor de conexión

`app/core/database.py` crea la conexión a PostgreSQL usando SQLAlchemy asíncrono:

```
Configuración del pool de conexiones:
  - pool_size=10      → mantiene 10 conexiones abiertas permanentemente
  - max_overflow=20   → puede abrir hasta 20 conexiones extra en momentos de alta demanda
  - pool_pre_ping=True → verifica que la conexión sigue viva antes de usarla
  - echo=DEBUG        → en desarrollo, imprime todas las consultas SQL en el log
```

### Sesiones por request

Cada petición HTTP recibe su propia sesión de base de datos aislada mediante la dependencia `get_db()`:

```
Petición entrante
    ↓
FastAPI llama a get_db()
    ↓
Se abre una sesión (BEGIN)
    ↓
El endpoint hace consultas
    ↓
Si todo OK → COMMIT (guarda cambios)
Si hay error → ROLLBACK (deshace cambios)
    ↓
La sesión se cierra
```

Esto garantiza que si un endpoint falla a mitad de camino, ningún cambio parcial queda guardado en la base de datos.

### PostGIS

La extensión PostGIS añade soporte geoespacial a PostgreSQL. Se usa para guardar la columna `ubicacion` de los reportes como un punto geográfico `POINT(longitud latitud)` con el sistema de coordenadas WGS 84 (SRID 4326), el mismo que usa el GPS.

---

## 6. Modelos (tablas)

Los modelos son clases Python que representan tablas en la base de datos. SQLAlchemy los traduce automáticamente a SQL.

---

### Tabla `usuarios`

**Archivo:** `app/models/usuario.py`

Guarda la cuenta de cada persona registrada en la app.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único generado automáticamente |
| `nombre` | VARCHAR(150) | Nombre del usuario |
| `apellido` | VARCHAR(100) | Apellido (opcional) |
| `email` | VARCHAR(255) | Correo electrónico, único e indexado |
| `telefono` | VARCHAR(20) | Teléfono (opcional) |
| `distrito` | VARCHAR(100) | Distrito del usuario (opcional) |
| `rol` | VARCHAR(50) | Rol en el sistema: `ciudadano`, `inspector` o `admin` |
| `hashed_password` | VARCHAR(255) | Contraseña encriptada con bcrypt |
| `es_activo` | BOOLEAN | `true` = cuenta activa, `false` = bloqueada |
| `fecha_registro` | TIMESTAMP TZ | Fecha/hora de registro (automática) |
| `ultimo_acceso` | TIMESTAMP TZ | Último login (actualizado en cada login) |

**Relación:** Un usuario tiene muchos reportes (`reportes_app`).

---

### Tabla `reportes_app`

**Archivo:** `app/models/reporte.py`

Guarda cada reporte de criadero enviado por un ciudadano.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador único generado automáticamente |
| `usuario_id` | UUID | FK → `usuarios.id`. Se borra el reporte si se borra el usuario |
| `latitud` | FLOAT | Latitud GPS del criadero |
| `longitud` | FLOAT | Longitud GPS del criadero |
| `ubicacion` | GEOMETRY(POINT, 4326) | Punto geoespacial PostGIS (índice espacial automático) |
| `foto_url` | VARCHAR(500) | URL de la foto en Cloudinary (opcional) |
| `tipo_lugar` | VARCHAR(100) | Tipo de lugar: `Vivienda`, `Mercado`, `Colegio`, etc. |
| `tipo_objeto` | VARCHAR(100) | Objeto con agua estancada: `Llantas`, `Baldes`, etc. |
| `observa_larvas` | VARCHAR(50) | Si vio larvas: `Sí, claramente`, `No estoy seguro`, `No` |
| `conocimiento_dengue_cercano` | VARCHAR(50) | Si conoce casos de dengue cerca: `Sí`, `No lo sé`, `No` |
| `comentarios` | TEXT | Descripción libre (opcional) |
| `estado` | VARCHAR(50) | Estado actual: `enviado`, `en_revision`, `resuelto`, `rechazado`, `cancelado` |
| `fecha_reporte` | TIMESTAMP TZ | Fecha/hora de creación (automática) |
| `fecha_actualizacion` | TIMESTAMP TZ | Se actualiza automáticamente cada vez que se modifica el registro |

**Relación:** Cada reporte pertenece a un usuario.

---

### Tabla `casos_noti`

**Archivo:** `app/models/caso_noti.py`

Almacena notificaciones epidemiológicas importadas del sistema oficial de salud (CDC Perú). Son casos sospechosos o confirmados de enfermedades reportados por centros de salud.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador interno |
| `id_caso_noti` | VARCHAR(100) | ID del caso en el sistema oficial (único) |
| `departamento` | VARCHAR(100) | Departamento donde se notificó |
| `provincia` | VARCHAR(100) | Provincia |
| `distrito` | VARCHAR(100) | Distrito |
| `ubigeo` | VARCHAR(10) | Código UBIGEO del INEI |
| `enfermedad` | VARCHAR(150) | Nombre de la enfermedad (dengue, etc.) |
| `ano_epidemiologico` | INTEGER | Año epidemiológico |
| `semana_epidemiologica` | INTEGER | Semana epidemiológica (1–52) |
| `tipo_diagnostico` | VARCHAR(50) | Tipo: `confirmado`, `probable`, etc. |
| `diresa_notifica` | VARCHAR(150) | DIRESA que notificó el caso |
| `edad` | INTEGER | Edad del paciente |
| `sexo` | VARCHAR(1) | Sexo: `M` o `F` |
| `fecha_creacion` | TIMESTAMP TZ | Fecha de importación al sistema |

---

### Tabla `casos_netlab`

**Archivo:** `app/models/caso_netlab.py`

Almacena resultados de laboratorio molecular del NETLAB (Red Nacional de Laboratorios). Son las pruebas diagnósticas que confirman o descartan dengue.

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | Identificador interno |
| `id_muestra_netlab` | VARCHAR(100) | ID de la muestra en NETLAB (único) |
| `fecha_corte` | TIMESTAMP TZ | Fecha de corte del reporte |
| `departamento_paciente` | VARCHAR(100) | Departamento del paciente |
| `provincia_paciente` | VARCHAR(100) | Provincia |
| `distrito_paciente` | VARCHAR(100) | Distrito |
| `ubigeo_paciente` | VARCHAR(10) | Código UBIGEO |
| `edad_paciente` | INTEGER | Edad del paciente |
| `sexo_paciente` | VARCHAR(1) | Sexo: `M` o `F` |
| `nombre_examen` | VARCHAR(200) | Nombre del examen realizado |
| `dx_molecular_dengue` | VARCHAR(50) | Resultado molecular: `Positivo`, `Negativo`, `Indeterminado` |
| `serotipo_dengue` | VARCHAR(20) | Serotipo identificado (DENV-1, DENV-2, etc.) |
| `elisa_ns1` | VARCHAR(50) | Resultado del test ELISA NS1 |
| `fecha_validado` | TIMESTAMP TZ | Fecha de validación del resultado |
| `fecha_creacion` | TIMESTAMP TZ | Fecha de importación |

---

## 7. Schemas (validación de datos)

Los schemas son la "aduana" del backend: definen exactamente qué datos pueden entrar y qué datos salen. Usan **Pydantic v2**.

### Enums — `app/schemas/enums.py`

Definen los únicos valores válidos para campos específicos. Si la app envía un valor que no está en la lista, el backend rechaza la petición con error 422.

| Enum | Valores permitidos |
|---|---|
| `RolEnum` | `ciudadano`, `inspector`, `admin` |
| `EstadoReporteEnum` | `enviado`, `en_revision`, `resuelto`, `rechazado`, `cancelado` |
| `TipoLugarEnum` | `Vivienda`, `Vía Pública`, `Terreno Abandonado`, `Mercado`, `Colegio`, `Otro` |
| `TipoObjetoEnum` | `Llantas`, `Baldes`, `Plantas`, `Botellas`, `Canales`, `Otro` |
| `ObservaLarvasEnum` | `Sí, claramente`, `No estoy seguro`, `No` |
| `ConocimientoDengueEnum` | `Sí`, `No lo sé`, `No` |

### Formato estándar de respuesta — `app/schemas/responses.py`

Todos los endpoints de reportes responden con esta estructura uniforme:

```json
{
  "data": { ... },
  "exito": true,
  "mensaje": null
}
```

Para listas paginadas (como "mis reportes"), el campo `data` tiene esta estructura:

```json
{
  "data": {
    "data": [ ...lista de reportes... ],
    "total": 42,
    "pagina": 1,
    "porPagina": 20
  },
  "exito": true,
  "mensaje": null
}
```

Los endpoints de autenticación (`/auth/login`, `/auth/register`) responden directamente sin este wrapper, por compatibilidad con el cliente móvil.

### Schemas de usuario — `app/schemas/usuario.py`

**`UsuarioCreate`** — datos para registrarse:
```json
{
  "nombre": "Ana",
  "apellido": "López",
  "email": "ana@ejemplo.com",
  "password": "minimo8chars",
  "telefono": "987654321",    ← opcional
  "distrito": "Miraflores"    ← opcional
}
```

**`UsuarioResponse`** — datos del usuario que devuelve la API (sin contraseña):
```json
{
  "id": "uuid",
  "nombre": "Ana",
  "apellido": "López",
  "email": "ana@ejemplo.com",
  "telefono": "987654321",
  "rol": "ciudadano",
  "creadoEn": "2026-04-21T10:00:00Z"
}
```
> Nota: el campo se llama `creadoEn` en la API (camelCase) pero en la base de datos es `fecha_registro`. El schema hace la conversión automáticamente.

**`AuthResponse`** — respuesta al registrarse o iniciar sesión:
```json
{
  "token": "eyJhbGciOiJIUzI1NiJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiJ9...",
  "usuario": { ...UsuarioResponse... }
}
```

### Schemas de reporte — `app/schemas/reporte.py`

**`ReporteCreate`** — datos para crear un reporte:
```json
{
  "latitud": -12.0217725,
  "longitud": -77.0548273,
  "foto_url": "https://res.cloudinary.com/...",   ← opcional
  "tipo_lugar": "Mercado",
  "tipo_objeto": "Baldes",
  "observa_larvas": "Sí, claramente",
  "conocimiento_dengue_cercano": "No",             ← opcional
  "comentarios": "Hay agua estancada debajo..."    ← opcional
}
```

**`ReporteResponse`** — datos del reporte que devuelve la API:
```json
{
  "id": "uuid",
  "usuario_id": "uuid",
  "latitud": -12.0217725,
  "longitud": -77.0548273,
  "foto_url": "https://res.cloudinary.com/...",
  "tipo_lugar": "Mercado",
  "tipo_objeto": "Baldes",
  "observa_larvas": "Sí, claramente",
  "conocimiento_dengue_cercano": "No",
  "comentarios": "Hay agua estancada...",
  "estado": "enviado",
  "fecha_reporte": "2026-04-21T15:30:00Z",
  "fecha_actualizacion": "2026-04-21T15:30:00Z"
}
```

---

## 8. Endpoints de la API

La URL base es `/api/v1`. En desarrollo los docs interactivos están en `http://localhost:8000/docs`.

### Autenticación — `/api/v1/auth`

---

#### `POST /auth/register` — Registrar usuario

Crea una cuenta nueva. No requiere estar autenticado.

**Request:**
```json
{
  "nombre": "Ana",
  "apellido": "López",
  "email": "ana@ejemplo.com",
  "password": "minimo8chars"
}
```

**Respuesta exitosa (201 Created):**
```json
{
  "token": "eyJ...",
  "refreshToken": "eyJ...",
  "usuario": { "id": "...", "nombre": "Ana", "rol": "ciudadano", ... }
}
```

**Posibles errores:**
- `409 Conflict` — el email ya está registrado

---

#### `POST /auth/login` — Iniciar sesión

Verifica credenciales y devuelve tokens JWT.

**Request:**
```json
{
  "email": "ana@ejemplo.com",
  "password": "minimo8chars"
}
```

**Respuesta exitosa (200 OK):** igual que register.

**Posibles errores:**
- `401 Unauthorized` — email o contraseña incorrectos
- `403 Forbidden` — cuenta desactivada

**Efecto adicional:** actualiza el campo `ultimo_acceso` del usuario.

---

#### `POST /auth/logout` — Cerrar sesión

Valida que el token sea válido y confirma el cierre de sesión. La app móvil también borra el token guardado localmente.

**Headers requeridos:** `Authorization: Bearer <token>`

**Respuesta exitosa (200 OK):**
```json
{ "mensaje": "Sesión cerrada correctamente." }
```

---

### Reportes — `/api/v1/reportes`

Todos los endpoints de reportes requieren autenticación (`Authorization: Bearer <token>`).

---

#### `POST /reportes/foto` — Subir foto

Recibe una imagen, la optimiza y la sube a Cloudinary. Devuelve la URL pública.

**Request:** `multipart/form-data` con el campo `foto` (archivo JPEG, PNG o WebP, máximo 5 MB).

**Respuesta exitosa (201 Created):**
```json
{
  "data": { "url": "https://res.cloudinary.com/sivapre/image/upload/..." },
  "exito": true,
  "mensaje": null
}
```

**Proceso interno:**
1. Valida tipo MIME (solo JPEG, PNG, WebP)
2. Valida tamaño (máximo 5 MB)
3. Sube a Cloudinary en la carpeta `sivapre/reportes/`
4. Aplica optimización automática: redimensiona a máximo 1024×1024, calidad automática, convierte a WebP
5. Devuelve la URL HTTPS segura

**Posibles errores:**
- `415 Unsupported Media Type` — formato de imagen no permitido
- `413 Request Entity Too Large` — imagen mayor a 5 MB
- `502 Bad Gateway` — fallo al comunicarse con Cloudinary

---

#### `POST /reportes` — Crear reporte

Registra un nuevo reporte de criadero para el usuario autenticado.

**Request:**
```json
{
  "latitud": -12.0217725,
  "longitud": -77.0548273,
  "tipo_lugar": "Mercado",
  "tipo_objeto": "Baldes",
  "observa_larvas": "Sí, claramente",
  "foto_url": "https://res.cloudinary.com/...",
  "conocimiento_dengue_cercano": "No",
  "comentarios": "Texto libre"
}
```

**Respuesta exitosa (201 Created):**
```json
{
  "data": { ...ReporteResponse... },
  "exito": true,
  "mensaje": null
}
```

**Proceso interno:**
1. Valida todos los campos con los enums definidos
2. Construye un punto `POINT(longitud latitud)` para PostGIS
3. Asocia el reporte al usuario autenticado
4. Guarda con estado inicial `enviado`

---

#### `GET /reportes/mis-reportes` — Listar mis reportes

Devuelve los reportes del usuario autenticado, paginados.

**Query params:**

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `pagina` | integer | 1 | Número de página (desde 1) |
| `porPagina` | integer | 20 | Reportes por página (máximo 100) |

**Respuesta exitosa (200 OK):**
```json
{
  "data": {
    "data": [ ...lista de ReporteResponse... ],
    "total": 42,
    "pagina": 1,
    "porPagina": 20
  },
  "exito": true,
  "mensaje": null
}
```

**Proceso interno:** el conteo total y la lista de reportes se consultan en paralelo con `asyncio.gather` para reducir el tiempo de respuesta.

---

#### `GET /reportes/{reporte_id}` — Obtener reporte por ID

Devuelve el detalle de un reporte específico.

**Parámetro de ruta:** `reporte_id` (UUID)

**Respuesta exitosa (200 OK):**
```json
{
  "data": { ...ReporteResponse... },
  "exito": true,
  "mensaje": null
}
```

**Posibles errores:**
- `404 Not Found` — reporte no existe

---

#### `PATCH /reportes/{reporte_id}/cancelar` — Cancelar reporte

Permite al ciudadano cancelar un reporte propio. Solo funciona si el reporte está en estado `enviado`.

**Reglas:**
- Solo el autor del reporte puede cancelarlo
- Solo se pueden cancelar reportes en estado `enviado` (no los que ya están siendo revisados)

**Respuesta exitosa (200 OK):** devuelve el reporte con estado `cancelado`.

**Posibles errores:**
- `403 Forbidden` — el reporte pertenece a otro usuario
- `404 Not Found` — reporte no existe
- `409 Conflict` — el reporte no está en estado `enviado`

---

#### `PATCH /reportes/{reporte_id}/estado` — Actualizar estado

Endpoint para uso interno (inspectores o administradores). Cambia el estado de cualquier reporte.

**Request:**
```json
{ "estado": "en_revision" }
```

Los estados posibles son: `enviado`, `en_revision`, `resuelto`, `rechazado`, `cancelado`.

---

### Dashboard — `/api/v1/dashboard`

Requiere autenticación.

---

#### `GET /dashboard/kpis` — Indicadores globales

Devuelve contadores para el panel de vigilancia epidemiológica.

**Respuesta exitosa (200 OK):**
```json
{
  "total_reportes": 150,
  "reportes_con_larvas": 43,
  "casos_sospechosos": 280,
  "casos_confirmados": 37
}
```

| Campo | Descripción |
|---|---|
| `total_reportes` | Total de reportes ciudadanos en el sistema |
| `reportes_con_larvas` | Reportes donde el ciudadano indicó `"Sí, claramente"` en larvas |
| `casos_sospechosos` | Total de registros en la tabla `casos_noti` (notificaciones epidemiológicas) |
| `casos_confirmados` | Registros en `casos_netlab` con diagnóstico molecular `"Positivo"` |

---

### Rutas base

| Endpoint | Descripción |
|---|---|
| `GET /` | Info básica de la API (versión, entorno) |
| `GET /health` | Health check: devuelve `{"status": "ok"}`. Usado por Docker para verificar que el servidor está vivo |

---

## 9. Autenticación y seguridad

**Archivo:** `app/core/security.py`

### ¿Cómo funciona el JWT?

JWT (JSON Web Token) es un token firmado digitalmente que el servidor emite al usuario al iniciar sesión. El usuario lo envía en cada petición y el servidor verifica la firma sin consultar la base de datos.

```
Usuario hace login
    ↓
Servidor verifica email + contraseña (bcrypt)
    ↓
Servidor crea un token JWT firmado con JWT_SECRET_KEY
    ↓
Token contiene: { "sub": "ana@ejemplo.com", "exp": timestamp_de_expiración }
    ↓
Cliente guarda el token y lo envía en cada petición:
    Header: Authorization: Bearer eyJhbGciOiJIUzI1NiJ9...
    ↓
Servidor verifica la firma y extrae el email
    ↓
Servidor busca al usuario en la base de datos
    ↓
Si el usuario existe y está activo → petición permitida
```

### Dos tipos de tokens

| Token | Duración | Uso |
|---|---|---|
| `token` (access token) | 30 minutos | Se envía en cada petición autenticada |
| `refreshToken` | 30 días | Para obtener un nuevo access token sin volver a hacer login |

### Encriptación de contraseñas

Las contraseñas nunca se guardan en texto plano. Se usa **bcrypt**, que aplica una función de hash unidireccional con "sal" (un valor aleatorio único por usuario):

```
Contraseña: "mi_contraseña_segura"
    ↓  bcrypt hash
Guardado en BD: "$2b$12$eImiTXuWVxfM37uY4JANjQ..."
```

Para verificar, se aplica el mismo algoritmo y se compara el hash resultante.

### Dependencia `get_current_user`

Esta función se inyecta en los endpoints que requieren autenticación:

```python
async def endpoint(current_user: Usuario = Depends(get_current_user)):
    ...
```

FastAPI la ejecuta automáticamente antes del endpoint. Si el token no es válido o el usuario no existe, devuelve `401 Unauthorized` antes de que el endpoint llegue a ejecutarse.

---

## 10. Subida de imágenes con Cloudinary

**Archivo:** `app/api/v1/routes/reportes.py`

Cloudinary es un servicio en la nube especializado en imágenes. SIVAPRE lo usa para no almacenar imágenes en el servidor propio (lo que sería costoso y difícil de escalar).

### Flujo completo

```
App móvil toma foto
    ↓
POST /reportes/foto (multipart/form-data)
    ↓
Backend valida: tipo MIME + tamaño
    ↓
asyncio.to_thread(cloudinary.uploader.upload, ...)
(se ejecuta en un hilo separado para no bloquear el servidor)
    ↓
Cloudinary optimiza: redimensiona a 1024x1024, convierte a WebP, comprime
    ↓
Cloudinary devuelve secure_url: "https://res.cloudinary.com/..."
    ↓
Backend devuelve la URL a la app
    ↓
App incluye la URL al crear el reporte
    ↓
POST /reportes con foto_url incluida
    ↓
Backend guarda la URL en reportes_app.foto_url
```

### ¿Por qué `asyncio.to_thread`?

La librería oficial de Cloudinary es sincrónica (bloquea el hilo mientras sube la imagen). Si FastAPI la llama directamente en un endpoint `async`, bloquearía el servidor completo durante la subida. `asyncio.to_thread` corre el upload en un hilo del sistema operativo separado, liberando el servidor para atender otras peticiones mientras la foto se sube.

---

## 11. Migraciones de base de datos

Las migraciones registran cada cambio en la estructura de la base de datos (agregar columnas, cambiar tipos, etc.) como archivos versionados. Esto permite aplicar los mismos cambios en cualquier entorno (desarrollo, producción) sin perder datos.

### Historial de migraciones

| Archivo | Qué hace |
|---|---|
| `0d75a9572da8_initial_schema` | Crea las 4 tablas iniciales: `casos_netlab`, `casos_noti`, `usuarios`, `reportes_app` |
| `a1b2c3d4e5f6_add_apellido_rol` | Agrega columnas `apellido` y `rol` a `usuarios` |
| `b2c3d4e5f6a7_ampliar_campos_reporte` | Amplía `observa_larvas` y `conocimiento_dengue_cercano` de `VARCHAR(10)` a `VARCHAR(50)` |
| `c3d4e5f6a7b8_es_activo_server_default` | Agrega `server_default=true` a `es_activo` y activa cuentas que quedaron inactivas por error |

### Comandos útiles

```bash
# Aplicar todas las migraciones pendientes
docker exec sivapre_backend alembic upgrade head

# Ver el estado actual (qué migración está aplicada)
docker exec sivapre_backend alembic current

# Ver el historial completo
docker exec sivapre_backend alembic history

# Revertir la última migración
docker exec sivapre_backend alembic downgrade -1
```

### Cómo crear una nueva migración

Cuando modificas un modelo en Python (agregas o cambias una columna), debes crear una migración:

```bash
# Genera automáticamente el archivo de migración comparando
# el modelo Python con la base de datos real
docker exec sivapre_backend alembic revision --autogenerate -m "descripcion del cambio"
```

Alembic detecta las diferencias y genera el archivo en `alembic/versions/`. Revísalo antes de aplicarlo.

---

## 12. Cómo correr el proyecto

### Requisitos previos

- Docker Desktop instalado
- Git
- Un archivo `backend/.env` con las variables de entorno (ver sección 4)

### Iniciar el proyecto completo

```bash
# 1. Clonar el repositorio
git clone https://github.com/Emmy-Abigail/sivapre-v3.git
cd sivapre-v3

# 2. Crear el archivo .env en backend/
cp backend/.env.example backend/.env
# Editar backend/.env con tus valores reales

# 3. Construir e iniciar todos los servicios
docker-compose up --build

# El entrypoint.sh corre automáticamente las migraciones antes de iniciar el servidor
```

### Servicios disponibles después de iniciar

| Servicio | URL | Descripción |
|---|---|---|
| Backend API | http://localhost:8000 | La API principal |
| Documentación interactiva | http://localhost:8000/docs | Swagger UI (solo en `DEBUG=true`) |
| Documentación alternativa | http://localhost:8000/redoc | ReDoc (solo en `DEBUG=true`) |
| Base de datos | localhost:5432 | PostgreSQL (puerto local) |
| pgAdmin | http://localhost:5050 | Panel web para ver la base de datos |

### Verificar que todo funciona

```bash
# Health check
curl http://localhost:8000/health
# Respuesta esperada: {"status":"ok"}

# Ver logs del backend
docker logs sivapre_backend --follow
```

### En producción

Antes de lanzar a producción, cambiar en `backend/.env`:

```env
APP_ENV=production
DEBUG=false
ALLOWED_ORIGINS=https://app.sivapre.gob
JWT_SECRET_KEY=clave_larga_aleatoria_de_al_menos_32_caracteres
```

Con `DEBUG=false`:
- La documentación (`/docs`, `/redoc`) queda desactivada
- Los logs SQL dejan de imprimirse
- Solo los orígenes definidos en `ALLOWED_ORIGINS` pueden hacer peticiones
