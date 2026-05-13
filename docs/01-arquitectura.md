# Arquitectura del Sistema — SIVAPRE

Sistema de Vigilancia y Prevención de Enfermedades. Permite a ciudadanos reportar criaderos de mosquitos desde un celular y a inspectores de salud gestionar esos reportes desde un navegador web.

---

## Índice

1. [Actores del sistema](#1-actores-del-sistema)
2. [Flujo de datos general](#2-flujo-de-datos-general)
3. [Infraestructura en producción](#3-infraestructura-en-producción)
4. [Arquitectura offline-first — app móvil](#4-arquitectura-offline-first--app-móvil)
5. [Backend — FastAPI](#5-backend--fastapi)
6. [Base de datos — PostgreSQL](#6-base-de-datos--postgresql)
7. [API: endpoints completos](#7-api-endpoints-completos)
8. [Autenticación y sesión](#8-autenticación-y-sesión)
9. [Seguridad](#9-seguridad)
10. [Almacenamiento de fotos](#10-almacenamiento-de-fotos)
11. [Notificaciones push](#11-notificaciones-push)
12. [App móvil — navegación y pantallas](#12-app-móvil--navegación-y-pantallas)
13. [Dashboard web](#13-dashboard-web)
14. [Stack tecnológico completo](#14-stack-tecnológico-completo)
15. [Variables de entorno](#15-variables-de-entorno)
16. [Migraciones de base de datos](#16-migraciones-de-base-de-datos)
17. [Limitaciones del piloto y escalado](#17-limitaciones-del-piloto-y-escalado)

---

## 1. Actores del sistema

| Actor | Herramienta | Qué puede hacer |
|---|---|---|
| **Ciudadano** | App móvil Android | Registrarse, reportar criaderos (foto + GPS), ver sus reportes, recibir notificaciones push |
| **Inspector de salud** | Dashboard web | Ver mapa de reportes, gestionar estados, ver KPIs y tendencias |
| **Administrador** | Dashboard web | Todo lo del inspector + gestionar cuentas de personal |

---

## 2. Flujo de datos general

```
CIUDADANO (App móvil — Android)
    │
    │  1. Captura foto del criadero con cámara
    │  2. GPS obtiene coordenadas + geocodificación inversa (offline)
    │  3. Completa el formulario (tipo lugar, objeto, larvas, dengue)
    │  4. → reporte guardado en SQLite local SIEMPRE (con o sin señal)
    │  5. Sync engine envía al backend cuando hay conexión
    │  6. Recibe push notification cuando el inspector cambia el estado (*)
    │
    ▼
NGINX (puerto 80 — único punto de entrada al VPS)
    │
    ├── /api/*      → proxy → backend:8000 (FastAPI)
    ├── /uploads/*  → proxy → backend:8000 (fotos estáticas)
    └── /*          → archivos estáticos del dashboard (dist/)
    │
    ▼
FASTAPI BACKEND (interno: puerto 8000)
    │
    ├── Recibe reporte + foto
    ├── Comprime foto → WebP (Pillow) y guarda en /app/uploads
    ├── Guarda reporte en PostgreSQL con coordenadas PostGIS
    ├── Verifica idempotencia (device_id + local_id → no duplicados)
    ├── Al cambiar estado → notificación push via Expo Push API (*)
    │
    ├── Sirve datos al Dashboard
    └── Sirve datos a la App móvil
    │
    ▼
POSTGRESQL + POSTGIS (interno: puerto 5432)
    ├── Tabla usuarios
    ├── Tabla reportes_app (con índice geoespacial)
    ├── Tabla casos_noti
    └── Tabla casos_netlab
    │
REDIS (interno: puerto 6379)
    └── Rate limiting (SlowAPI)

(*) Push notifications requieren configuración Firebase — pendiente de implementar.
```

---

## 3. Infraestructura en producción

### VPS: 161.132.53.226

```
docker-compose.yml (raíz del repositorio)
│
├── sivapre_dashboard  (nginx:alpine)
│     Puerto público: 80:80
│     ├── Sirve dashboard/dist/ como archivos estáticos
│     ├── Proxy /api/* → backend:8000
│     └── Proxy /uploads/* → backend:8000
│
├── sivapre_backend  (Python 3.11 + FastAPI)
│     Puerto: solo interno en red Docker (8000)
│     Volumen: uploads_data → /app/uploads  ← fotos de reportes
│     Health check: GET /health cada 30s
│
├── sivapre_db  (postgis/postgis:16-3.4)
│     Puerto: solo interno en red Docker (5432)
│     Volumen: postgres_data → /var/lib/postgresql/data
│     Health check: pg_isready cada 10s
│
└── sivapre_redis  (redis:7-alpine)
      Puerto: solo interno en red Docker (6379)
      Volumen: redis_data → /data
      Persistencia: guarda cada 60s si hubo ≥1 cambio
```

Todos los contenedores están en la red interna `sivapre-network` (bridge). El único puerto expuesto al exterior es el **80** de nginx.

### Flujo de una petición desde la app

```
App (cel) → HTTP :80 → nginx → proxy → backend:8000 → FastAPI → PostgreSQL
```

### Volúmenes críticos

| Volumen | Contenido | Consecuencia si se borra |
|---|---|---|
| `postgres_data` | Todos los reportes, usuarios, datos | Pérdida total de datos ⚠️ |
| `uploads_data` | Fotos comprimidas de reportes | URLs rotas en toda la app ⚠️ |
| `redis_data` | Contadores de rate limiting | Se regeneran solos, no crítico |

> `docker compose down` es seguro — no borra volúmenes.
> `docker compose down -v` ⚠️ BORRA VOLÚMENES — solo usar en entorno local.

---

## 4. Arquitectura offline-first — app móvil

La app **nunca** depende de la red para guardar un reporte. La red solo se necesita para sincronizar con el servidor.

### Cola SQLite local (`sivapre.db`)

```
Usuario presiona "ENVIAR REPORTE"
          ↓
  insertPendingReport()  ← siempre succeeds
  SQLite local (sivapre.db)
          ↓
  syncPendingReports()   ← fire-and-forget

  ┌─ Hay señal ─────────────────────────────────────────────────────┐
  │  1. Sube foto si hay foto_local_uri y no hay foto_url aún       │
  │  2. POST /reportes al backend                                   │
  │  3. markAsSent() → estado = 'enviado'                           │
  │  4. Borra archivo de foto local (best-effort)                   │
  └─────────────────────────────────────────────────────────────────┘

  ┌─ Sin señal / Error ──────────────────────────────────────────────┐
  │  markAsFailed() → estado = 'fallido', retry_count++             │
  │                                                                  │
  │  3 mecanismos de reintento automático:                           │
  │  1. NetInfo listener → detecta cuando vuelve la conexión        │
  │  2. AppState listener → cuando la app vuelve a primer plano     │
  │  3. BackgroundFetch → periódico (mínimo 15 min, iOS/Android     │
  │     throttle esto — es suplementario, no principal)             │
  └─────────────────────────────────────────────────────────────────┘
```

### Estados de un reporte en SQLite

| Estado | Significado |
|---|---|
| `pendiente` | Guardado localmente, no enviado aún |
| `enviando` | En proceso de sincronización activa |
| `enviado` | Confirmado por el backend |
| `fallido` | Error al enviar — se reintenta automáticamente |

**Límite de reintentos**: `MAX_RETRY_COUNT = 10`. Un reporte con `retry_count >= 10` deja de procesarse (un error 422 de validación nunca se va a resolver solo). Queda en SQLite para debugging y se limpia a los 7 días.

**Recuperación de crash**: si la app crashea con un reporte en estado `enviando`, al siguiente inicio `initDb()` lo resetea a `pendiente` para que no quede abandonado.

**Idempotencia en el backend**: cada reporte lleva `device_id` (UUID del dispositivo) + `local_id` (UUID del reporte generado localmente). Si el backend ya recibió ese par, devuelve HTTP 409 y la app lo marca como `enviado` sin crear duplicado.

### Campos de la tabla SQLite

```sql
CREATE TABLE pending_reports (
  id                          INTEGER PRIMARY KEY AUTOINCREMENT,
  local_id                    TEXT    NOT NULL UNIQUE,
  device_id                   TEXT    NOT NULL,
  latitud                     REAL    NOT NULL,
  longitud                    REAL    NOT NULL,
  direccion                   TEXT,                        -- geocodificación inversa
  foto_local_uri              TEXT,                        -- path local del archivo
  foto_url                    TEXT,                        -- URL del servidor (post-upload)
  tipo_lugar                  TEXT    NOT NULL,
  tipo_objeto                 TEXT    NOT NULL,
  observa_larvas              TEXT    NOT NULL,
  conocimiento_dengue_cercano TEXT,
  comentarios                 TEXT,
  estado                      TEXT    NOT NULL DEFAULT 'pendiente',
  created_at                  TEXT    NOT NULL,
  updated_at                  TEXT    NOT NULL,
  last_sync_attempt           TEXT,
  http_status                 INTEGER,                     -- solo para debugging
  server_response             TEXT,                        -- solo para debugging
  retry_count                 INTEGER NOT NULL DEFAULT 0
);
```

### Nota técnica — null en expo-sqlite v15 (Android)

`runSync` y `runAsync` en expo-sqlite v15 usan el mismo código nativo de binding en Kotlin. Cuando se pasa `null` como valor en el objeto de parámetros, el bridge JS→Kotlin lo serializa como `ReadableMap` vacío en vez de null primitivo, causando `"Cannot convert '[object Object]' to a Kotlin type"`.

**Solución implementada**: los campos opcionales (`direccion`, `comentarios`, etc.) se omiten del objeto de params cuando son null. SQLite trata automáticamente los parámetros nombrados no enlazados como `NULL`. Este comportamiento es estándar del motor SQLite y no depende del bridge.

```typescript
// ✗ Causa crash en Android:
{ $comentarios: null }

// ✓ Correcto — SQLite infiere NULL para $comentarios:
{ $local_id: "...", $device_id: "..." }  // $comentarios ausente
```

---

## 5. Backend — FastAPI

### Estructura de carpetas

```
backend/
├── app/
│   ├── main.py              # FastAPI app, CORS, rate limiter, archivos estáticos, health
│   ├── api/v1/
│   │   ├── __init__.py      # Registra todos los routers en /api/v1
│   │   └── routes/
│   │       ├── usuarios.py  # Auth: login, registro, refresh, perfil, push token
│   │       ├── reportes.py  # CRUD reportes + subida de fotos (idempotente)
│   │       └── dashboard.py # KPIs, mapa, feed, tendencias, personal
│   ├── core/
│   │   ├── config.py        # Settings con Pydantic (valida variables de entorno)
│   │   ├── database.py      # Pool async PostgreSQL (pool_size=10, max_overflow=20)
│   │   ├── limiter.py       # Rate limiter global (SlowAPI + Redis)
│   │   └── security.py      # JWT, bcrypt, get_current_user
│   ├── models/              # SQLAlchemy ORM
│   │   ├── usuario.py
│   │   ├── reporte.py       # Incluye campo GEOMETRY para PostGIS
│   │   ├── caso_noti.py
│   │   └── caso_netlab.py
│   ├── schemas/             # Pydantic (validación de entrada y serialización de salida)
│   │   ├── auth.py
│   │   ├── usuario.py
│   │   ├── reporte.py       # ReporteCreate incluye device_id y local_id
│   │   ├── enums.py         # RolEnum, EstadoReporteEnum, TipoLugarEnum, etc.
│   │   └── responses.py     # ApiResponse, PaginatedData, FotoResponse
│   └── services/
│       ├── notifications.py # Push via Expo Push API
│       └── storage/
│           ├── base.py            # Interfaz abstracta StorageBackend
│           ├── local_storage.py   # Implementación disco (Pillow → WebP)
│           └── __init__.py        # Factory: elige backend según STORAGE_BACKEND
├── alembic/
│   ├── env.py
│   └── versions/            # Migraciones cronológicas
├── Dockerfile
└── requirements.txt
```

### Configuración de la aplicación (`main.py`)

- **Swagger UI**: deshabilitado en producción (`DEBUG=False`). Solo disponible en desarrollo en `/docs`.
- **CORS**: `allow_credentials=False`. Métodos: GET, POST, PUT, PATCH, DELETE, OPTIONS.
- **Archivos estáticos**: `/uploads` montado en `UPLOAD_DIR` para servir las fotos.
- **Middleware de logging**: registra método, ruta, status HTTP y tiempo de respuesta en ms para cada request.
- **Health check** (`/health`): hace un `SELECT 1` real a PostgreSQL. Devuelve 503 si la BD no responde.
- **Redis fail-open**: si Redis cae, el rate limiter se desactiva temporalmente (devuelve 503 en lugar de crashear todo).

---

## 6. Base de datos — PostgreSQL

### Tabla `usuarios`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `nombre` | VARCHAR(150) | |
| `apellido` | VARCHAR(100) | Opcional |
| `email` | VARCHAR(255) | UNIQUE, usado para login |
| `telefono` | VARCHAR(20) | Opcional |
| `departamento` / `provincia` / `distrito` | VARCHAR(100) | Ubigeo del usuario |
| `rol` | VARCHAR(50) | `ciudadano`, `inspector`, `admin` |
| `hashed_password` | VARCHAR(255) | bcrypt |
| `push_token` | VARCHAR(200) | Expo Push Token (último dispositivo) |
| `es_activo` | BOOLEAN | Si puede iniciar sesión |
| `fecha_registro` | TIMESTAMPTZ | |
| `ultimo_acceso` | TIMESTAMPTZ | Actualizado en cada login |

### Tabla `reportes_app`

| Campo | Tipo | Notas |
|---|---|---|
| `id` | UUID | PK |
| `usuario_id` | UUID | FK → usuarios |
| `device_id` | VARCHAR(64) | UUID del dispositivo (idempotencia) |
| `local_id` | VARCHAR(64) | UUID del reporte en el dispositivo (idempotencia) |
| `latitud` / `longitud` | FLOAT | Coordenadas GPS |
| `ubicacion` | GEOMETRY(Point, 4326) | Columna PostGIS para consultas geoespaciales |
| `direccion` | VARCHAR(300) | Dirección postal (geocodificación inversa) |
| `foto_url` | VARCHAR(500) | URL pública de la foto WebP |
| `tipo_lugar` | VARCHAR(100) | Vivienda / Vía Pública / Terreno Abandonado / Mercado / Colegio / Otro |
| `tipo_objeto` | VARCHAR(100) | Llantas / Baldes / Plantas / Botellas / Canales / Otro |
| `observa_larvas` | VARCHAR(50) | "Sí, claramente" / "No estoy seguro" / "No" |
| `conocimiento_dengue_cercano` | VARCHAR(50) | "Sí" / "No lo sé" / "No" |
| `comentarios` | TEXT | Opcional |
| `estado` | VARCHAR(50) | `enviado`, `en_revision`, `resuelto`, `rechazado`, `cancelado` |
| `fecha_reporte` | TIMESTAMPTZ | |
| `fecha_actualizacion` | TIMESTAMPTZ | |

**Índices especiales:**
- `ix_reportes_device_id`: índice en `device_id` para búsquedas de idempotencia rápidas.
- `uq_reportes_device_local` (UNIQUE PARTIAL): `(device_id, local_id) WHERE device_id IS NOT NULL AND local_id IS NOT NULL`. Garantiza unicidad a nivel de BD incluso en condiciones de carrera.

### Tabla `casos_noti` y `casos_netlab`

Datos epidemiológicos externos (sistemas de vigilancia del MINSA). Se visualizan en el mapa del dashboard superpuestos con los reportes ciudadanos.

- **NOTI**: casos sospechosos reportados a nivel provincia (sin coordenadas GPS exactas).
- **NETLAB**: casos confirmados por PCR con serotipo de dengue.

Ambas tablas usan código UBIGEO para la ubicación. El dashboard los posiciona en el mapa usando una tabla estática `UBIGEO_CENTROIDS` con las coordenadas aproximadas de los 25 departamentos.

### Audit log

Tabla `audit_log` (migración `2026_05_12_0001`) que registra quién cambió qué en la base de datos. Incluye `actor_nombre` (migración `2026_05_11_0003`).

---

## 7. API: endpoints completos

Base URL en producción: `http://161.132.53.226/api/v1`

Documentación Swagger disponible en `http://localhost:8000/docs` (solo en desarrollo con `DEBUG=True`).

### Autenticación (`/auth`)

| Método | Ruta | Rate limit | Auth | Descripción |
|---|---|---|---|---|
| POST | `/auth/setup` | — | No | Crear primer admin (solo funciona si no hay admins) |
| POST | `/auth/register` | 5/min por IP | No | Registrar nuevo ciudadano |
| POST | `/auth/login` | 10/min por IP | No | Login → devuelve `token` + `refreshToken` |
| POST | `/auth/refresh` | — | No | Renovar access token con refresh token |
| POST | `/auth/logout` | — | Sí | Cerrar sesión |
| GET | `/auth/perfil` | — | Sí | Ver perfil propio |
| PATCH | `/auth/perfil` | — | Sí | Actualizar nombre, apellido, teléfono, ubigeo |
| POST | `/auth/perfil/password` | — | Sí | Cambiar contraseña |
| POST | `/auth/push-token` | — | Sí | Registrar Expo Push Token del dispositivo |

**Respuesta de login:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "usuario": {
    "id": "uuid",
    "nombre": "Ana Quispe",
    "apellido": "López",
    "email": "ana@email.com",
    "rol": "ciudadano",
    "departamento": "LORETO",
    "provincia": "MAYNAS",
    "distrito": "IQUITOS"
  }
}
```

### Reportes (`/reportes`)

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| POST | `/reportes/foto` | Sí | Subir foto (multipart) → devuelve URL pública |
| POST | `/reportes` | Sí | Crear reporte (idempotente con device_id + local_id) |
| GET | `/reportes/mis-reportes` | Sí | Listar reportes propios (paginado) |
| GET | `/reportes/alertas-zona` | Sí | Alertas de criaderos en la zona del usuario |
| GET | `/reportes/{id}` | Sí | Detalle de un reporte |
| PATCH | `/reportes/{id}/cancelar` | Sí | Cancelar un reporte propio |
| PATCH | `/reportes/{id}/foto` | Sí | Adjuntar o reemplazar foto en reporte existente |

**Idempotencia en `POST /reportes`**: si se recibe la misma combinación `(device_id, local_id)` más de una vez (reintento del sync engine), el backend devuelve el reporte ya existente con HTTP 201, sin crear duplicado. Tres capas de defensa: consulta previa, índice UNIQUE PARTIAL, y catch de IntegrityError para condición de carrera.

### Dashboard (`/dashboard`) — requiere rol `inspector` o `admin`

Todos los endpoints aceptan filtros opcionales: `fecha_desde`, `fecha_hasta`, `departamento`, `provincia`, `distrito`.

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/dashboard/kpis` | 4 métricas calculadas en paralelo (asyncio.gather) |
| GET | `/dashboard/mapa/reportes` | Puntos GPS de reportes ciudadanos (máx. 2000) |
| GET | `/dashboard/mapa/noti` | Casos NOTI agrupados por provincia |
| GET | `/dashboard/mapa/netlab` | Casos NETLAB confirmados con serotipo |
| GET | `/dashboard/feed` | Últimos reportes con detalle completo |
| GET | `/dashboard/tendencias` | Series de tiempo semanales (últimas 12 semanas) |
| GET | `/dashboard/ubicaciones` | Departamentos disponibles para filtros |
| PATCH | `/dashboard/reportes/{id}/estado` | Cambiar estado + dispara push notification |
| GET | `/dashboard/personal` | Listar inspectores y admins (solo admin) |
| POST | `/dashboard/personal` | Crear inspector o admin (solo admin) |
| PATCH | `/dashboard/personal/{id}/estado` | Activar/desactivar cuenta de personal |

---

## 8. Autenticación y sesión

### Dos tipos de token

| Token | Duración | Uso |
|---|---|---|
| `access_token` | 30 minutos | Se envía en cada request como `Authorization: Bearer ...` |
| `refresh_token` | 30 días | Solo se usa en `POST /auth/refresh` para obtener un nuevo par |

Cada token lleva el claim `"type": "access"` o `"type": "refresh"`. El endpoint `/auth/refresh` rechaza tokens de tipo `access` aunque no hayan expirado.

### Flujo de refresh silencioso (app móvil)

```
Request normal con access_token válido → OK

Access token expirado:
  App → request → 401
  App → POST /auth/refresh (con refreshToken)
  Backend → nuevo access_token + nuevo refreshToken
  App → reintenta request original → OK
  (invisible para el usuario)

Refresh token también expirado (>30 días sin actividad):
  POST /auth/refresh → 401
  App → logout automático → pantalla de login
```

El flag `isRefreshing` y la cola `pendingQueue` en `api.ts` evitan que múltiples requests simultáneos que fallan con 401 generen múltiples llamadas a `/refresh`. Solo se hace un refresh; los demás esperan en cola.

### Almacenamiento de tokens en el dispositivo

Los tokens se guardan en **SecureStore** (no en AsyncStorage):
- **Android**: Android Keystore / EncryptedSharedPreferences
- **iOS**: iOS Keychain

AsyncStorage es texto plano legible en dispositivos rooteados. SecureStore usa el keystore del SO.

---

## 9. Seguridad

### Rate limiting

| Endpoint | Límite | Razón |
|---|---|---|
| `POST /auth/login` | 10 intentos/min por IP | Previene fuerza bruta de contraseñas |
| `POST /auth/register` | 5 registros/min por IP | Previene creación masiva de cuentas |

El límite de login es generoso (10/min) porque municipios y centros de salud pueden tener muchos usuarios bajo una misma IP pública (NAT compartido).

Si Redis cae, el rate limiter falla en modo "open" (no bloquea requests) — es mejor servir sin rate limiting brevemente que devolver 500 a todos los usuarios mientras Docker reinicia el contenedor.

### CORS

```
ALLOWED_ORIGINS=["http://161.132.53.226"]
allow_credentials=False
```

`allow_credentials=False` porque los tokens van en el header `Authorization`, no en cookies. Esto simplifica la configuración CORS sin comprometer seguridad.

### Contraseñas

Hasheadas con **bcrypt**. Nunca se guarda el texto plano. El backend no tiene forma de recuperar una contraseña — solo de verificarla o cambiarla.

### Validación de fotos

Antes de guardar cualquier imagen:
- Verificación de tipo MIME real (no solo extensión del archivo)
- Tamaño máximo 5 MB
- Redimensión y recompresión con Pillow (WebP) elimina posibles payloads maliciosos en metadata EXIF

### Swagger UI

Deshabilitado en producción (`DEBUG=False`). No se expone `/docs`, `/redoc` ni `/openapi.json`.

---

## 10. Almacenamiento de fotos

### Flujo actual (`STORAGE_BACKEND=local`)

```
App → POST /reportes/foto (multipart, hasta 5 MB)
        ↓
Backend (Pillow):
  - Valida tipo MIME
  - Redimensiona a máx 1200px (proporcional)
  - Convierte a WebP quality 75
  - Guarda en /app/uploads/YYYY/MM/DD/<uuid>.webp
        ↓
Backend → devuelve { "url": "http://161.132.53.226/uploads/2026/05/13/abc.webp" }
        ↓
App → guarda esa URL en SQLite (campo foto_url)
        ↓
Sync engine → incluye foto_url en el POST /reportes
```

Una foto típica de celular (~4 MB JPEG, 12 MP) queda en ~200-400 KB WebP después de la compresión.

### Volumen Docker

Las fotos viven en el volumen `uploads_data`. nginx hace proxy de `/uploads/*` → `backend:8000` para servirlas públicamente.

### Migración futura a MinIO/S3

El módulo `services/storage/` usa una interfaz abstracta `StorageBackend`. Para migrar solo hay que:
1. Implementar `MinioStorageBackend` con la misma interfaz
2. Cambiar `STORAGE_BACKEND=minio` en `.env`
3. No hay que tocar endpoints, modelos ni app móvil

Las URLs históricas que apuntan al disco local necesitarán una migración de datos.

---

## 11. Notificaciones push

Cuando el inspector cambia el estado de un reporte desde el dashboard, el backend notifica al ciudadano.

### Flujo

```
1. App hace login
        ↓
2. App registra Expo Push Token → POST /auth/push-token
        ↓
3. Backend guarda token en usuarios.push_token
        ↓
4. Inspector cambia estado en dashboard
        ↓
5. Backend: PATCH /dashboard/reportes/{id}/estado
        ↓
6. Backend lee push_token del dueño del reporte
        ↓
7. POST https://exp.host/push/send
        ↓
8. Expo entrega notificación al celular del ciudadano
   (funciona con la app cerrada)
```

### Mensajes según estado

| Estado | Título | Cuerpo |
|---|---|---|
| `en_revision` | 🔍 Reporte en revisión | Un inspector está revisando tu reporte |
| `resuelto` | ✅ Reporte resuelto | ¡Tu criadero ha sido controlado. Gracias! |
| `rechazado` | ℹ️ Reporte no procesado | No pudo ser verificado en campo |
| `cancelado` | Reporte cancelado | Tu reporte fue cancelado |

### Estado actual y limitaciones

- **Push token**: se almacena uno por usuario. Si el ciudadano reinstala la app o tiene dos teléfonos, solo el último dispositivo recibe notificaciones.
- **Firebase Cloud Messaging**: pendiente de configurar. Las notificaciones push en Android standalone requieren `google-services.json` y configuración en Firebase Console. Actualmente no está implementado.
- **Notificaciones de escritorio en el dashboard**: requieren HTTPS. El dashboard en HTTP puro no puede solicitar permiso de notificación al navegador (API restringida a contextos seguros).

---

## 12. App móvil — navegación y pantallas

### Estructura de navegación

```
RootNavigator
├── Splash  ← verifica sesión guardada en SecureStore
│
├── Auth Stack  (sin sesión)
│   ├── Welcome
│   ├── Login
│   └── Register
│
└── Main Stack  (con sesión)
    ├── Tabs (tab bar inferior)
    │   ├── Inicio (HomeScreen)
    │   ├── Reportar (ReportScreen)
    │   ├── Mis reportes (MyReportsScreen)
    │   └── Información (InfoScreen)
    │
    ├── ReporteDetalle  (slide desde la derecha)
    ├── Perfil
    ├── EditarPerfil
    └── CambiarPassword
```

### Pantallas principales

| Pantalla | Descripción |
|---|---|
| **SplashScreen** | Logo SVG animado, verifica sesión activa (1.8 seg) |
| **WelcomeScreen** | Primera pantalla para usuarios nuevos |
| **LoginScreen** | Email + contraseña, banner de éxito si viene de registro |
| **RegisterScreen** | Nombre, email, contraseña, selector de ubigeo con búsqueda |
| **HomeScreen** | KPIs personales + alertas de criaderos en la zona del usuario |
| **ReportScreen** | Formulario offline-first: foto obligatoria, GPS obligatorio, tipo de lugar, tipo de objeto, larvas, dengue cercano, comentarios (opcional) |
| **MyReportsScreen** | Historial paginado de reportes con badge de estado |
| **ReporteDetalleScreen** | Foto, todos los campos, botón de cancelar |
| **InfoScreen** | Información sobre dengue, mitos, contactos de emergencia |
| **PerfilScreen** | Datos del usuario + 3 centros de salud más cercanos (offline, distancia Haversine) |
| **EditarPerfilScreen** | Edición de perfil, solo muestra guardar si hay cambios |
| **CambiarPasswordScreen** | Contraseña actual + nueva + confirmación, validación en tiempo real |

### Campos obligatorios en el formulario de reporte

| Campo | Obligatorio | Sin conexión |
|---|---|---|
| Foto | ✅ | Sí — se guarda local, sube después |
| GPS / Ubicación | ✅ | Sí — satélite, no necesita internet |
| Tipo de lugar | ✅ | — |
| Tipo de objeto | ✅ | — |
| ¿Observas larvas? | ✅ | — |
| ¿Casos de dengue cercano? | ✅ | — |
| Comentarios | No | — |

### Hospitales offline

`PerfilScreen` calcula los 3 centros de salud más cercanos al usuario usando la fórmula Haversine sobre un dataset de **617 establecimientos de salud de todo el Perú** embebido en el APK (`src/data/hospitales.json`). Funciona 100% offline.

### Gestión del estado

| Herramienta | Qué gestiona |
|---|---|
| `AuthContext` | Sesión global (isAuthenticated, datos del usuario) — persiste en AsyncStorage |
| `React Query` | Datos del servidor (reportes, alertas) — caché, loading, errores, invalidación |
| `SecureStore` | Tokens JWT — almacenamiento cifrado por el SO |
| `AsyncStorage` | Datos de sesión del usuario (nombre, rol, etc.) |

### Variables de entorno de la app

Se inyectan en el bundle en tiempo de build por EAS (`eas.json`):

| Perfil | `EXPO_PUBLIC_API_URL` |
|---|---|
| `development` | `http://10.211.180.205:8000/api/v1` |
| `preview` | `http://161.132.53.226/api/v1` |
| `production` | `https://api.sivapre.gob/api/v1` (futuro) |

Son visibles en el código compilado — no usar para secretos.

### Cuándo necesitas reconstruir el APK

- Al cambiar `EXPO_PUBLIC_API_URL`
- Al instalar un paquete con módulo nativo
- Al cambiar `app.json` (íconos, permisos, plugins)

Para cambios solo en código TypeScript: no se necesita rebuild (Expo OTA Updates).

---

## 13. Dashboard web

### Arquitectura

React SPA servida como archivos estáticos (`dist/`) por nginx. En producción no hay servidor Node — nginx sirve el `index.html` para todas las rutas (SPA fallback) y hace proxy de `/api/` al backend.

```
Browser → nginx:80
  /login, /       → dist/index.html  (React Router toma el control)
  /api/v1/*       → backend:8000
  /uploads/*      → backend:8000
```

### Componentes principales

| Componente | Descripción |
|---|---|
| `KpiCards` | 4 métricas: total reportes, reportes con larvas, casos NOTI, casos NETLAB. Refresco cada 60 seg. Skeleton loaders. |
| `MapaVigilancia` | Leaflet. 3 capas: reportes ciudadanos (GPS exacto), NOTI (centroide departamento), NETLAB (centroide departamento). Marcadores con popup. Control de visibilidad por capa. 2 modos de coloreo: por estado o por larvas. |
| `FeedAcciones` | Últimos 20 reportes. Tarjeta colapsable con foto, datos completos y botones de cambio de estado. Refresco cada 60 seg. |
| `TendenciasChart` | Recharts AreaChart. 12 semanas: reportes ciudadanos (verde) vs confirmados NETLAB (rojo). |
| `FiltrosBar` | 5 filtros globales (fecha desde/hasta, departamento, provincia, distrito). Todos los componentes los consumen. |
| `Sidebar` | Navegación, menú "Gestión de Personal" solo visible para admins, logout. |
| `TopBar` | Título + fecha + campana de alertas (requiere HTTPS para activar notificaciones). |

### Estado global

| Herramienta | Qué gestiona |
|---|---|
| `Zustand` (`auth.ts`) | Sesión del inspector — token, datos de usuario, persiste en localStorage |
| `React Query` | Datos del servidor — caché 30s por defecto, refresco cada 60s en KPIs y Feed |

### Proxy en desarrollo

Vite hace proxy de `/api` → `http://localhost:8000`. No hay CORS en desarrollo. El backend debe correr localmente con Docker.

---

## 14. Stack tecnológico completo

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| Python | 3.11 | Lenguaje base |
| FastAPI | latest | Framework web async |
| SQLAlchemy | 2.x (async) | ORM con soporte async |
| asyncpg | latest | Driver PostgreSQL async |
| Alembic | latest | Migraciones de BD |
| Pydantic v2 | latest | Validación y settings |
| bcrypt | latest | Hash de contraseñas |
| PyJWT | latest | Tokens JWT |
| Pillow | latest | Compresión de fotos a WebP |
| SlowAPI | latest | Rate limiting |
| redis-py | latest | Cliente Redis para rate limiter |
| httpx | latest | HTTP async (push notifications) |
| GeoAlchemy2 | latest | Columnas PostGIS en SQLAlchemy |
| uvicorn | latest | ASGI server |

### Base de datos
| Tecnología | Versión | Rol |
|---|---|---|
| PostgreSQL | 16 | Base de datos principal |
| PostGIS | 3.4 | Extensión geoespacial |
| Redis | 7 | Rate limiting |

### App móvil
| Tecnología | Versión | Rol |
|---|---|---|
| React Native | 0.76 | Framework base |
| Expo SDK | 54 | Plataforma de build y APIs nativas |
| TypeScript | 5.x | Lenguaje |
| expo-sqlite | 15.1.2 | Cola SQLite offline |
| expo-location | latest | GPS + geocodificación inversa |
| expo-image-picker | latest | Cámara con compresión |
| expo-secure-store | latest | Almacenamiento seguro de tokens |
| expo-build-properties | latest | `usesCleartextTraffic: true` en Android |
| expo-background-fetch | latest | Sync en background |
| expo-task-manager | latest | Gestión de tareas en background |
| @react-native-community/netinfo | latest | Detección de conectividad |
| @tanstack/react-query | 5.x | Caché y gestión de datos del servidor |
| React Navigation | 6.x | Navegación entre pantallas |
| Axios | latest | Cliente HTTP con interceptores |
| expo-crypto | latest | UUID generation |
| expo-font | latest | Montserrat + Inter |

### Dashboard web
| Tecnología | Versión | Rol |
|---|---|---|
| React | 18 | Framework UI |
| Vite | 8.x | Build tool |
| TypeScript | 5.x | Lenguaje |
| Tailwind CSS | 4.x | Estilos |
| Leaflet | latest | Mapa interactivo |
| react-leaflet | latest | Wrapper React para Leaflet |
| Recharts | latest | Gráficos |
| Zustand | latest | Estado global |
| @tanstack/react-query | 5.x | Datos del servidor |
| Axios | latest | Cliente HTTP |
| date-fns | latest | Formateo de fechas |
| lucide-react | latest | Iconos |

### Infraestructura
| Tecnología | Rol |
|---|---|
| Docker | Contenedores |
| Docker Compose | Orquestación en un solo VPS |
| nginx (alpine) | Reverse proxy + servidor de estáticos |
| EAS Build (Expo) | Build del APK en la nube |

---

## 15. Variables de entorno

### Backend (`backend/.env`)

```env
# Entorno
APP_ENV=production
DEBUG=False

# PostgreSQL
POSTGRES_USER=sivapre
POSTGRES_PASSWORD=<secreto>
POSTGRES_DB=sivapre_db
POSTGRES_HOST=db           # nombre del servicio Docker
POSTGRES_PORT=5432
DATABASE_URL=postgresql+asyncpg://sivapre:<pass>@db:5432/sivapre_db

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET_KEY=<hex 64 caracteres>
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=30

# Admin inicial
ADMIN_SECRET_KEY=<secreto>    # para POST /auth/setup

# Almacenamiento
STORAGE_BACKEND=local
UPLOAD_DIR=/app/uploads
MEDIA_BASE_URL=http://161.132.53.226    # URL base pública para las fotos

# CORS
ALLOWED_ORIGINS=["http://161.132.53.226"]
```

**Variables críticas de seguridad:**

| Variable | Riesgo si queda en default |
|---|---|
| `JWT_SECRET_KEY` | Tokens se pueden forjar con la clave pública del repo |
| `ADMIN_SECRET_KEY` | `/auth/setup` accesible con clave conocida |
| `POSTGRES_PASSWORD` | BD accesible con contraseña pública |
| `MEDIA_BASE_URL` | URLs de fotos rotas o apuntando a localhost |

### App móvil — `eas.json`

```json
"preview": {
  "env": { "EXPO_PUBLIC_API_URL": "http://161.132.53.226/api/v1" }
}
```

---

## 16. Migraciones de base de datos

Las migraciones se ejecutan automáticamente al iniciar el contenedor del backend. Para ejecutar manualmente:

```bash
docker exec sivapre_backend alembic upgrade head
```

### Historial de migraciones

| Archivo | Cambio |
|---|---|
| `2026_04_15 — initial_schema` | Tablas iniciales: usuarios, reportes, casos_noti, casos_netlab |
| `2026_04_21_0001 — add_apellido_rol` | Agrega `apellido` y `rol` a usuarios |
| `2026_04_21_0002 — ampliar_campos_varchar50` | Amplía campos de tipo y estado en reportes |
| `2026_04_21_0003 — es_activo_server_default` | Default `TRUE` para `es_activo` en usuarios |
| `2026_04_28_0001 — add_ubigeo` | Agrega `departamento`, `provincia`, `distrito` a usuarios |
| `2026_04_29_0001 — add_push_token` | Agrega `push_token` a usuarios |
| `2026_04_29_0002 — add_idempotency` | Agrega `device_id`, `local_id`, índice UNIQUE PARTIAL a reportes |
| `2026_04_30_0001 — fix_cascade_add_indexes` | Índices adicionales y corrección de cascadas |
| `2026_05_11_0002 — add_direccion` | Agrega columna `direccion` a reportes (geocodificación inversa) |
| `2026_05_11_0003 — audit_log_actor_nombre` | Agrega `actor_nombre` al log de auditoría |
| `2026_05_12_0001 — audit_log` | Tabla `audit_log` completa |

---

## 17. Limitaciones del piloto y escalado

El sistema está correctamente diseñado para un piloto. Las limitaciones son conocidas y tienen soluciones concretas cuando el volumen lo justifique.

| Limitación | Cuándo se vuelve problema | Solución |
|---|---|---|
| **VPS único** — sin alta disponibilidad | ~200-300 usuarios simultáneos | Segundo VPS + load balancer |
| **Fotos en disco local** — no escala a múltiples servidores | Miles de reportes o 2+ VPS | Migrar a MinIO / Cloudflare R2 / S3 |
| **Sin backups automáticos** — pérdida total si el disco falla | Ya es riesgo ahora | `pg_dump` en crontab + enviar a almacenamiento externo |
| **HTTP sin HTTPS** — notificaciones de escritorio bloqueadas | Ya es limitación ahora | Dominio + Let's Encrypt (requiere dominio, no solo IP) |
| **Docker Compose (un nodo)** — sin migración automática | Necesitas cero downtime | Docker Swarm o ECS |
| **Push token único por usuario** — si reinstala app, el anterior queda huérfano | Con usuarios reales | Tabla `push_tokens` (1:N con usuarios) |
| **Firebase no configurado** — push notifications no funcionan en APK standalone | Ya es limitación | Crear proyecto Firebase + agregar `google-services.json` |

### Camino de escalado

```
AHORA (piloto)               FASE 2 (~1k usuarios)         FASE 3 (~10k+)
────────────────────────     ────────────────────────       ──────────────────
1 VPS + Docker Compose       Dominio + HTTPS                2+ VPS con LB
Fotos en disco local         Fotos en Cloudflare R2         CDN para imágenes
Sin backups                  pg_dump diario a S3            PostgreSQL réplica
Push no configurado          Firebase configurado           Redis cluster
```
