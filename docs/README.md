# SIVAPRE — Documentación del Proyecto

**Sistema Integrado de Vigilancia y Predicción en Salud**

SIVAPRE es un ecosistema digital para la vigilancia epidemiológica del dengue en el Perú. Integra tres fuentes de datos: reportes ciudadanos de criaderos de zancudos (Aedes aegypti), notificaciones clínicas del sistema NOTI y diagnósticos de laboratorio del sistema NETLAB.

---

## Componentes del sistema

| Componente | Tecnología | Descripción |
|---|---|---|
| **App móvil** | React Native + Expo | Para ciudadanos — reportar criaderos |
| **Backend (API)** | FastAPI + PostgreSQL | Servidor central que conecta todo |
| **Dashboard** | React + Vite | Para inspectores y autoridades sanitarias |

---

## Documentación disponible

| Documento | Contenido |
|---|---|
| [01-arquitectura.md](01-arquitectura.md) | Visión general del sistema, flujo de datos, infraestructura |
| [02-backend.md](02-backend.md) | API REST, modelos de datos, endpoints, autenticación |
| [03-app-movil.md](03-app-movil.md) | App React Native, pantallas, hooks, notificaciones push |
| [04-dashboard.md](04-dashboard.md) | Panel de gestión, mapa multicapa, feed de acción |
| [05-despliegue.md](05-despliegue.md) | Cómo poner el sistema en producción paso a paso |

---

## Inicio rápido (desarrollo local)

### Requisitos previos

- Docker y Docker Compose
- Node.js 20+
- Expo CLI (`npm install -g expo-cli`)
- EAS CLI (`npm install -g eas-cli`)

### 1 — Clonar y configurar el backend

```bash
cd backend
cp .env.example .env   # Editar con tus credenciales
docker compose up -d
docker exec sivapre_backend alembic upgrade head
```

### 2 — Crear el primer administrador

```bash
curl -X POST http://localhost:8000/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "TU_ADMIN_SECRET_KEY",
    "nombre": "Admin SIVAPRE",
    "email": "admin@sivapre.gob.pe",
    "password": "contraseña-segura"
  }'
```

### 3 — Iniciar el dashboard

```bash
cd dashboard
npm install
npm run dev   # http://localhost:3000
```

### 4 — Iniciar la app móvil

```bash
cd mobile
npm install
npx expo start
```

---

## Credenciales de ejemplo (solo desarrollo)

| Sistema | Usuario | Contraseña |
|---|---|---|
| Dashboard | admin@sivapre.gob.pe | Sivapre2025! |
| API Docs | http://localhost:8000/docs | — |
| pgAdmin | http://localhost:5050 | (ver .env) |

> ⚠️ Cambiar todas las credenciales antes de poner en producción.

---

## Estructura del repositorio

```
sivapre/
├── backend/          # API FastAPI
│   ├── app/
│   │   ├── api/      # Endpoints (rutas)
│   │   ├── core/     # Config, DB, seguridad
│   │   ├── models/   # Tablas de la BD
│   │   ├── schemas/  # Validación de datos
│   │   └── services/ # Lógica reutilizable (notificaciones, etc.)
│   ├── alembic/      # Migraciones de BD
│   └── requirements.txt
├── mobile/           # App React Native (Expo)
│   ├── src/
│   │   ├── screens/  # Pantallas
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/ # Llamadas a la API
│   │   ├── store/    # Estado global
│   │   └── navigation/
│   └── app.json
├── dashboard/        # Panel web React
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── hooks/
│   │   └── api/
│   └── vite.config.ts
└── docs/             # Esta documentación
```
