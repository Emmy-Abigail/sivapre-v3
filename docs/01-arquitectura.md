# Arquitectura del Sistema — SIVAPRE

---

## ¿Cómo funciona SIVAPRE en términos simples?

Tres actores principales:

1. **El ciudadano** — usa la app en su celular para reportar un criadero de mosquitos. Toma una foto, el GPS registra dónde está, y envía el reporte. Funciona aunque no tenga señal en ese momento.

2. **El inspector de salud** — entra al dashboard desde cualquier navegador, ve un mapa con todos los reportes, filtra por zona y fecha, y actualiza el estado de cada reporte.

3. **El backend** — es el intermediario invisible. Recibe los datos de la app, los guarda en la base de datos, sirve datos al dashboard, y gestiona las fotos subidas.

---

## Diagrama de flujo de datos

```
CIUDADANO (App móvil)
    │
    │  1. Reporta criadero (foto + GPS obligatorios)
    │  2. SQLite guarda el reporte localmente (siempre, con o sin señal)
    │  3. Sync engine lo envía al backend cuando hay conexión
    │  4. Ve el estado de sus reportes
    │  5. Recibe notificación push cuando cambia el estado (*)
    ▼
NGINX (puerto 80 — único punto de entrada)
    │
    ├── /api/v1/*  → FastAPI backend (interno: 8000)
    └── /*         → Dashboard web (archivos estáticos)
    ▼
BACKEND (FastAPI — interno puerto 8000)
    │
    ├── Guarda reporte en PostgreSQL
    ├── Guarda foto en disco local (/app/uploads)
    ├── Sirve imágenes en /uploads/*
    ├── Envía notificaciones via Expo Push API (*)
    │
    ├── Sirve datos al Dashboard
    └── Sirve datos a la App móvil

(*) Push notifications requieren configuración Firebase (pendiente)
```

---

## Arquitectura offline-first (app móvil)

La app nunca depende de la red para guardar un reporte. El flujo siempre es:

```
Usuario presiona "Enviar reporte"
        ↓
SQLite local (sivapre.db) ← reporte guardado aquí primero, siempre
        ↓
Sync engine intenta enviar al backend inmediatamente
        │
        ├── Hay señal → backend recibe el reporte → SQLite marcado 'enviado'
        │
        └── Sin señal → SQLite queda en 'pendiente'
                            ↓
                   3 mecanismos de reintento:
                   1. NetInfo listener (detecta cuando vuelve la conexión)
                   2. AppState listener (cuando la app vuelve a primer plano)
                   3. BackgroundFetch (periódico, 15 min mínimo — iOS/Android throttling)
```

### Estados de un reporte en SQLite

| Estado | Significado |
|---|---|
| `pendiente` | Guardado localmente, no enviado aún |
| `enviando` | En proceso de sincronización |
| `enviado` | Confirmado por el backend |
| `fallido` | Error al enviar (se reintenta hasta 10 veces) |

Los registros `enviado` se eliminan automáticamente a los 7 días (limpieza de debug).

---

## Tecnologías y por qué se eligieron

### Backend
| Tecnología | Por qué |
|---|---|
| **FastAPI (Python)** | Rápido de desarrollar, documentación automática (Swagger), async nativo |
| **PostgreSQL + PostGIS** | Base de datos robusta con soporte geoespacial para coordenadas GPS |
| **SQLAlchemy async** | Maneja muchas peticiones simultáneas sin bloquear el servidor |
| **Alembic** | Control de versiones de la base de datos |
| **JWT (tokens)** | Autenticación sin estado — acceso 30 min, refresh 30 días |
| **Almacenamiento local** | Fotos guardadas en `/app/uploads` del VPS (volumen Docker persistente) |
| **Redis** | Caché y rate limiting |
| **httpx** | Cliente HTTP asíncrono para enviar notificaciones push a Expo |

### App Móvil
| Tecnología | Por qué |
|---|---|
| **React Native + Expo SDK 54** | Una base de código para Android e iOS |
| **expo-sqlite v15** | Cola offline local — reportes guardados en SQLite antes de enviarse |
| **expo-location** | GPS con geocodificación inversa (dirección postal offline en mayoría de dispositivos) |
| **expo-image-picker** | Cámara con compresión automática (~400 KB por foto) |
| **expo-build-properties** | Habilita `usesCleartextTraffic` en Android para conexión HTTP al VPS |
| **React Query** | Caché de datos remotos, estados de carga y errores |
| **React Navigation** | Navegación entre pantallas con animaciones nativas |
| **NetInfo + BackgroundFetch** | Detección de conectividad y sincronización en background |
| **617 hospitales offline** | Establecimientos de salud del Perú embebidos en el APK (sin red) |

### Dashboard
| Tecnología | Por qué |
|---|---|
| **React + Vite** | Build optimizado, desarrollo rápido |
| **Tailwind CSS** | Estilos consistentes sin CSS desde cero |
| **Leaflet** | Mapa interactivo open-source, sin costo ni API key |
| **Recharts** | Gráficos de tendencias responsivos |
| **Zustand** | Estado global simple para la sesión del usuario |

### Infraestructura
| Tecnología | Por qué |
|---|---|
| **Docker Compose** | Orquestación de todos los servicios en un solo VPS |
| **nginx** | Reverse proxy — unifica API y dashboard en el puerto 80 |

---

## Infraestructura en producción

```
VPS (161.132.53.226)
│
└── docker-compose.yml
    │
    ├── sivapre_dashboard (nginx)  → puerto 80 público
    │     ├── /*          sirve el dashboard (archivos estáticos dist/)
    │     └── /api/v1/*   proxy → backend:8000
    │
    ├── sivapre_backend (FastAPI)  → interno, puerto 8000
    │     └── /uploads/*  sirve fotos subidas
    │
    ├── sivapre_db (PostgreSQL + PostGIS)  → interno, puerto 5432
    │     └── volumen postgres_data (persistente)
    │
    └── sivapre_redis (Redis)  → interno, puerto 6379
          └── volumen redis_data (persistente)
```

Todo el tráfico externo entra por el puerto 80. Los demás puertos son internos a la red Docker `sivapre-network`.

---

## Roles de usuario

| Rol | Descripción | Acceso |
|---|---|---|
| `ciudadano` | Usuario de la app móvil | Solo sus propios reportes |
| `inspector` | Personal de salud | Dashboard completo (lectura + cambio de estados) |
| `admin` | Administrador del sistema | Dashboard + gestión de cuentas |

---

## Seguridad

- **Contraseñas**: hasheadas con bcrypt
- **Autenticación**: JWT — access token 30 min, refresh token 30 días
- **Autorización**: cada endpoint verifica el rol antes de responder
- **CORS**: solo acepta `http://161.132.53.226` en producción
- **Imágenes**: validación de tipo MIME y tamaño máximo (5 MB) antes de guardar
- **Rate limiting**: Redis en el backend (previene abuso de endpoints)
- **Idempotencia**: el backend rechaza reportes duplicados por `local_id` (HTTP 409)

---

## Flujo de notificaciones push (*)

```
1. Usuario hace login en la app
        ↓
2. App solicita permiso de notificaciones al SO
        ↓
3. Expo genera un token único para ese dispositivo
   (formato: ExponentPushToken[xxxxxxx])
        ↓
4. App envía el token al backend → POST /api/v1/auth/push-token
        ↓
5. Backend guarda el token en la tabla usuarios
        ↓
6. Inspector cambia el estado de un reporte en el dashboard
        ↓
7. Backend lee el push_token del dueño del reporte
        ↓
8. Backend llama a https://exp.host/push/send
        ↓
9. Expo entrega la notificación al dispositivo (funciona con app cerrada)
```

(*) Requiere configurar Firebase Cloud Messaging y añadir `google-services.json` al proyecto. Pendiente de implementar.

---

## Limitaciones conocidas (piloto)

| Limitación | Impacto | Solución futura |
|---|---|---|
| VPS único | Sin alta disponibilidad | Segundo VPS + load balancer |
| Fotos en disco local | Espacio limitado, no escalable a múltiples servidores | Migrar a S3 / Cloudflare R2 |
| Sin backups automáticos | Pérdida de datos si el disco falla | pg_dump periódico a almacenamiento externo |
| HTTP (sin HTTPS) | Notificaciones de escritorio deshabilitadas en el navegador | Dominio + Let's Encrypt |
| Docker Compose (un nodo) | Sin migración automática de contenedores | Docker Swarm o ECS |
