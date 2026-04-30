# Arquitectura del Sistema — SIVAPRE

---

## ¿Cómo funciona SIVAPRE en términos simples?

Imagina tres actores principales:

1. **El ciudadano** — usa la app en su celular para reportar un criadero de mosquitos cerca de su casa. Toma una foto, el GPS registra dónde está, y envía el reporte.

2. **El inspector de salud** — entra al dashboard desde cualquier navegador, ve un mapa con todos los reportes, puede filtrar por zona y fecha, y actualiza el estado de cada reporte. Cuando lo hace, el ciudadano recibe una notificación en su celular.

3. **El backend** — es el intermediario invisible. Recibe los datos de la app, los guarda en la base de datos, los sirve al dashboard, y envía notificaciones push cuando corresponde.

---

## Diagrama de flujo de datos

```
CIUDADANO (App móvil)
    │
    │  1. Reporta criadero (foto + GPS)
    │  2. Ve el estado de sus reportes
    │  3. Recibe notificación push cuando cambia el estado
    ▼
BACKEND (FastAPI — puerto 8000)
    │
    ├── Guarda reporte en PostgreSQL
    ├── Sube foto a Cloudinary
    ├── Lee datos de NOTI y NETLAB
    ├── Envía notificaciones via Expo Push API
    │
    ├── Sirve datos al Dashboard
    └── Sirve datos a la App móvil
    ▲
    │
INSPECTOR (Dashboard Web — puerto 3000)
    │  1. Ve mapa con reportes + casos NOTI + NETLAB
    │  2. Filtra por fecha, departamento, provincia, distrito
    │  3. Cambia estado de reportes (enviado → en revisión → resuelto)
    │  4. Crea cuentas de nuevos inspectores
    └── Ve tendencias semanales en gráficos
```

---

## Tecnologías y por qué se eligieron

### Backend
| Tecnología | Por qué |
|---|---|
| **FastAPI (Python)** | Rápido de desarrollar, documentación automática (Swagger), ideal para APIs |
| **PostgreSQL + PostGIS** | Base de datos robusta con soporte para coordenadas GPS |
| **SQLAlchemy async** | Permite manejar muchas peticiones al mismo tiempo sin bloquear el servidor |
| **Alembic** | Control de versiones de la base de datos (como Git pero para tablas) |
| **JWT (tokens)** | Autenticación sin estado — el servidor no guarda sesiones |
| **Cloudinary** | Almacenamiento de fotos en la nube, no en el servidor propio |
| **httpx** | Cliente HTTP asíncrono para enviar notificaciones push a Expo |

### App Móvil
| Tecnología | Por qué |
|---|---|
| **React Native + Expo** | Una sola base de código para Android e iOS |
| **Expo SDK 54** | Acceso a GPS, cámara, notificaciones push sin configuración nativa compleja |
| **React Query** | Maneja caché de datos, estados de carga y errores de forma elegante |
| **React Navigation** | Navegación entre pantallas con animaciones nativas |
| **react-native-svg** | Logo y gráficos vectoriales que se ven nítidos en cualquier pantalla |

### Dashboard
| Tecnología | Por qué |
|---|---|
| **React + Vite** | Desarrollo rápido, build optimizado |
| **Tailwind CSS** | Estilos sin escribir CSS desde cero, consistencia visual |
| **Leaflet** | Mapa interactivo open-source, sin costo ni API key |
| **Recharts** | Gráficos de tendencias responsivos |
| **Zustand** | Estado global simple para la sesión del usuario |

---

## Infraestructura en desarrollo (Docker)

```
docker-compose.yml
│
├── sivapre_backend   → FastAPI en puerto 8000
│                       (con hot-reload: cambios en código se aplican solos)
│
├── sivapre_db        → PostgreSQL + PostGIS en puerto 5433
│                       (datos persistidos en volumen Docker)
│
└── sivapre_pgadmin   → Interfaz visual de la BD en puerto 5050
```

Todo corre con un solo comando: `docker compose up -d`

---

## Roles de usuario

| Rol | Descripción | Acceso |
|---|---|---|
| `ciudadano` | Usuario de la app móvil | Solo sus propios reportes |
| `inspector` | Personal de salud | Dashboard completo (solo lectura y cambio de estados) |
| `admin` | Administrador del sistema | Dashboard + gestión de personal |

---

## Seguridad

- **Contraseñas**: hasheadas con bcrypt (nunca se guarda la contraseña en texto plano)
- **Autenticación**: tokens JWT con expiración de 30 minutos + refresh token de 30 días
- **Autorización**: cada endpoint verifica el rol del usuario antes de responder
- **CORS**: configurado para aceptar solo los orígenes autorizados en producción
- **Imágenes**: validación de tipo MIME y tamaño máximo (5 MB) antes de subir
- **Dashboard**: acceso restringido a inspectores y admins únicamente

---

## Flujo de notificaciones push

```
1. Usuario hace login en la app
        ↓
2. App solicita permiso de notificaciones al sistema operativo
        ↓
3. Expo genera un token único para ese dispositivo
   (formato: ExponentPushToken[xxxxxxx])
        ↓
4. App envía el token al backend → POST /api/v1/auth/push-token
        ↓
5. Backend guarda el token en la tabla usuarios (campo push_token)
        ↓
6. Inspector cambia el estado de un reporte en el dashboard
        ↓
7. Backend lee el push_token del dueño del reporte
        ↓
8. Backend llama a https://exp.host/push/send con el token y el mensaje
        ↓
9. Expo entrega la notificación al dispositivo del ciudadano
   (funciona aunque la app esté cerrada)
```
