# Dashboard Web — SIVAPRE

Panel de gestión epidemiológica para inspectores y autoridades sanitarias. Construido con React + Vite, accesible desde cualquier navegador moderno.

---

## Índice

1. [¿Qué puede hacer el inspector?](#1-qué-puede-hacer-el-inspector)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Páginas](#3-páginas)
4. [Componentes](#4-componentes)
5. [Manejo del estado](#5-manejo-del-estado)
6. [Llamadas al backend (API)](#6-llamadas-al-backend-api)
7. [Filtros globales](#7-filtros-globales)
8. [Temas y estilos](#8-temas-y-estilos)
9. [Cómo correr en desarrollo](#9-cómo-correr-en-desarrollo)
10. [Cómo construir para producción](#10-cómo-construir-para-producción)

---

## 1. ¿Qué puede hacer el inspector?

- **Iniciar sesión** con email y contraseña (no hay registro público — las cuentas las crea el administrador)
- **Ver KPIs en tiempo real**: total de reportes ciudadanos, reportes con larvas, casos sospechosos NOTI, casos confirmados NETLAB
- **Explorar el mapa multicapa**: reportes ciudadanos (GPS exacto), casos NOTI (nivel provincia) y confirmados NETLAB (PCR positivo), todos en el mismo mapa con capas activables
- **Filtrar toda la vista** por rango de fechas, departamento, provincia y distrito
- **Gestionar reportes** desde el Feed de Acción: ver detalle completo de cada reporte (foto, datos, ubicación) y cambiar su estado (enviado → en revisión → resuelto / rechazado)
- **Ver tendencias semanales**: gráfico de área comparando reportes ciudadanos vs. confirmados NETLAB en las últimas 12 semanas
- **Gestionar personal** *(solo admins)*: crear nuevas cuentas de inspector o admin, activar/desactivar cuentas existentes

---

## 2. Estructura del proyecto

```
dashboard/
├── index.html
├── vite.config.ts         # Proxy de /api → localhost:8000, puerto 3000
├── package.json
└── src/
    ├── main.tsx           # Punto de entrada — monta App con StrictMode
    ├── App.tsx            # Router + QueryClient + ProtectedRoute
    ├── index.css          # Fuentes Google + Tailwind CSS v4
    ├── api/
    │   ├── client.ts      # Axios con interceptores (JWT + 401)
    │   └── endpoints.ts   # Funciones tipadas para cada endpoint del backend
    ├── components/
    │   ├── FiltrosBar.tsx        # Barra de filtros globales
    │   ├── KpiCards.tsx          # 4 tarjetas de métricas
    │   ├── MapaVigilancia.tsx    # Mapa Leaflet multicapa
    │   ├── FeedAcciones.tsx      # Lista de reportes con cambio de estado
    │   ├── TendenciasChart.tsx   # Gráfico de área semanal (Recharts)
    │   ├── layout/
    │   │   ├── Sidebar.tsx       # Menú lateral con navegación y logout
    │   │   └── TopBar.tsx        # Encabezado de página con título y fecha
    │   └── ui/
    │       └── Badge.tsx         # Componente de etiqueta coloreada
    ├── hooks/
    │   └── useDashboard.ts       # React Query hooks para todos los datos
    ├── pages/
    │   ├── LoginPage.tsx         # Pantalla de inicio de sesión
    │   ├── DashboardPage.tsx     # Página principal (compone todos los componentes)
    │   └── PersonalPage.tsx      # Gestión de personal (solo admin)
    ├── store/
    │   └── auth.ts               # Estado global de autenticación (Zustand)
    └── types/
        └── index.ts              # Tipos TypeScript de toda la app
```

---

## 3. Páginas

### LoginPage (`/login`)
- Formulario de email y contraseña
- Llama a `POST /api/v1/auth/login`
- Al autenticarse, guarda el token y datos del usuario en `localStorage` a través del `useAuthStore`
- Redirige a `/` (dashboard) si el login es exitoso
- Si ya hay token válido, redirige directamente a `/`

### DashboardPage (`/`)
- Página principal del sistema — protegida con `ProtectedRoute` (redirige a `/login` si no hay token)
- Compone todos los componentes de vigilancia en un layout de dos columnas en pantallas grandes
- Tiene dos modos: `'dashboard'` (por defecto) y `'personal'` (solo visible para admins)
- La navegación entre modos es manejada por el `Sidebar`

Layout en modo dashboard:
```
TopBar (título + fecha)
FiltrosBar (filtros globales)
KpiCards (4 tarjetas)
[MapaVigilancia (60%)] [FeedAcciones (40%)]
TendenciasChart
```

### PersonalPage (vista dentro de DashboardPage)
- Formulario para crear nuevas cuentas: nombre, email, contraseña inicial, rol (inspector/admin)
- Lista del personal registrado con estado activo/inactivo
- Botón de toggle para activar o desactivar una cuenta
- Solo es accesible para usuarios con `rol === 'admin'` (el Sidebar oculta la opción para inspectores)

---

## 4. Componentes

### `FiltrosBar`
Barra de 5 campos sincronizados con el estado `filtros` de `DashboardPage`. Todos los demás componentes reciben los filtros como prop y los pasan a sus respectivos hooks.

| Campo | Tipo | Backend |
|---|---|---|
| Desde | `date` | `fecha_desde` |
| Hasta | `date` | `fecha_hasta` |
| Departamento | `select` (cargado del backend) | `departamento` |
| Provincia | `text` | `provincia` |
| Distrito | `text` | `distrito` |

Muestra un botón "Limpiar" cuando hay algún filtro activo.

### `KpiCards`
Cuatro tarjetas que se refrescan automáticamente cada 60 segundos.

| Tarjeta | Color | Fuente |
|---|---|---|
| Total Reportes Ciudadanos | Verde SIVAPRE | Tabla `reportes` |
| Reportes con Larvas | Naranja | Reportes donde `observa_larvas = 'Sí, claramente'` |
| Casos Sospechosos (NOTI) | Amarillo | Tabla `noti` |
| Casos Confirmados (NETLAB) | Rojo | Tabla `netlab` |

Muestra skeleton loaders mientras carga.

### `MapaVigilancia`
Mapa interactivo Leaflet centrado en Perú (`-9.19, -75.01`, zoom 5).

**Tres capas independientes** (cada una puede ocultarse/mostrarse con el control en la esquina superior derecha del mapa):

| Capa | Color | Datos | Posición |
|---|---|---|---|
| Reportes ciudadanos | Verde / Naranja / Gris | `CircleMarker` radio fijo 7px | GPS exacto del reporte |
| Casos NOTI | Azul | `CircleMarker` radio proporcional a `sqrt(total)` | Centroide del departamento (tabla UBIGEO_CENTROIDS) |
| Confirmados NETLAB | Rojo punteado | `CircleMarker` radio proporcional, ligeramente desplazado | Centroide del departamento |

**Dos modos de coloreo** para la capa de reportes:
- **Por estado**: verde (enviado), amarillo (en revisión), gris (resuelto), rojo (rechazado)
- **Por larvas**: rojo (con larvas), amarillo (incierto), verde (sin larvas)

Cada marcador tiene un **popup** al hacer clic con: foto (si existe), tipo de lugar/objeto, nombre del ciudadano, fecha, estado y larvas.

**Nota técnica**: Los datos de NOTI y NETLAB no incluyen coordenadas GPS — solo código UBIGEO. El componente usa una tabla estática `UBIGEO_CENTROIDS` con las coordenadas aproximadas de los 25 departamentos del Perú para posicionarlos en el mapa.

### `FeedAcciones`
Lista de los últimos 20 reportes, refrescada cada 60 segundos.

Cada reporte se muestra como una tarjeta colapsable:
- **Cabecera** (siempre visible): miniatura de la foto, tipo de lugar/objeto, badge de larvas, badge de estado, nombre del ciudadano, fecha
- **Detalle expandido** (al hacer clic): foto grande, todos los campos del reporte, coordenadas, comentario del ciudadano
- **Botones de cambio de estado**: aparecen todos los estados posibles excepto el actual. Al hacer clic llama a `PATCH /dashboard/reportes/{id}/estado`, lo que también dispara una notificación push al ciudadano

### `TendenciasChart`
Gráfico de área doble (Recharts `AreaChart`) con las últimas 12 semanas.

- **Línea verde**: reportes ciudadanos por semana
- **Línea roja**: casos confirmados NETLAB por semana
- Los datos de NOTI se omiten del gráfico porque tienen formato diferente (semana epidemiológica, no fecha ISO)
- Tooltip personalizado al hacer hover

### `Sidebar`
Menú lateral fijo de 256px, fondo verde oscuro (`#0a4535`).

- Logo SIVAPRE
- Ítem "Vigilancia" → siempre visible
- Ítem "Gestión de Personal" → **solo visible si `user.rol === 'admin'`**
- Panel inferior con avatar, nombre, rol y botón de logout

### `TopBar`
Encabezado de la página principal. Solo muestra el título y subtítulo (fecha en modo dashboard, descripción en modo personal).

### `Badge`
Componente reutilizable de etiqueta coloreada.

```typescript
// Variantes disponibles:
type Variant = 'green' | 'yellow' | 'gray' | 'red' | 'blue';
type Size = 'sm' | 'md';
```

---

## 5. Manejo del estado

### Autenticación — Zustand (`src/store/auth.ts`)
Estado global simple con persistencia en `localStorage`.

```typescript
const { token, user, login, logout } = useAuthStore();
// token: string | null
// user: { nombre, email, rol } | null
```

La inicialización lee de `localStorage` directamente para que la sesión persista al recargar la página.

### Datos del servidor — React Query (`src/hooks/useDashboard.ts`)
Todos los datos del backend se gestionan con React Query. Los hooks disponibles son:

```typescript
// Se refrescan automáticamente cada 60 segundos
const { data, isLoading } = useKpis(filtros);
const { data } = useFeed(filtros);

// Cache de 30 segundos
const { data } = useMapaReportes(filtros);

// Cache de 60 segundos
const { data } = useMapaNoti(filtros);
const { data } = useMapaNetlab(filtros);

// Cache de 5 minutos
const { data } = useTendencias(filtros);

// Cache permanente (no cambia en sesión)
const { data } = useUbicaciones();

// Mutación — invalida feed, mapa y kpis al completar
const { mutate } = useActualizarEstado();
```

Configuración global del `QueryClient`:
- `retry: 1` — un solo reintento en caso de error de red
- `staleTime: 30_000` — 30 segundos por defecto

---

## 6. Llamadas al backend (API)

### `src/api/client.ts`
Cliente Axios con:
- `baseURL: '/api/v1'` — el proxy de Vite redirige `/api` → `http://localhost:8000` en desarrollo
- `timeout: 15_000` ms
- **Interceptor de request**: agrega el token JWT en el header `Authorization: Bearer ...`
- **Interceptor de response**: si el servidor devuelve 401, limpia el localStorage y redirige a `/login`

### `src/api/endpoints.ts`
Funciones tipadas para cada endpoint del dashboard:

```typescript
dashboardApi.login(email, password)           // POST /auth/login
dashboardApi.kpis(filtros)                    // GET /dashboard/kpis
dashboardApi.mapaReportes(filtros)            // GET /dashboard/mapa/reportes
dashboardApi.mapaNoti(filtros)                // GET /dashboard/mapa/noti
dashboardApi.mapaNetlab(filtros)              // GET /dashboard/mapa/netlab
dashboardApi.feed(filtros, limit?)            // GET /dashboard/feed
dashboardApi.tendencias(filtros)              // GET /dashboard/tendencias
dashboardApi.ubicaciones()                    // GET /dashboard/ubicaciones
dashboardApi.actualizarEstado(id, estado)     // PATCH /dashboard/reportes/{id}/estado
```

Los filtros se convierten a query params de forma automática, omitiendo los campos vacíos.

---

## 7. Filtros globales

Todos los endpoints del dashboard aceptan los mismos parámetros opcionales:

| Parámetro | Formato | Ejemplo |
|---|---|---|
| `fecha_desde` | `YYYY-MM-DD` | `2025-01-01` |
| `fecha_hasta` | `YYYY-MM-DD` | `2025-12-31` |
| `departamento` | string | `LORETO` |
| `provincia` | string | `MAYNAS` |
| `distrito` | string | `IQUITOS` |

Los filtros son gestionados como estado en `DashboardPage` y pasados como prop a todos los componentes hijos. Cada componente los pasa a su hook correspondiente, que los incluye en la `queryKey` de React Query — garantizando que cambiar un filtro invalida automáticamente todos los datos y provoca un refetch.

---

## 8. Temas y estilos

El dashboard usa **Tailwind CSS v4** (integrado con el plugin de Vite `@tailwindcss/vite`).

### Colores principales

| Color | Hex | Uso |
|---|---|---|
| Verde SIVAPRE | `#0F6E56` | Botones, highlights, íconos activos |
| Verde oscuro | `#0a4535` | Fondo del Sidebar |
| Fondo general | `#f0f4f2` | Fondo de la página principal |
| Surface | `#FFFFFF` | Fondo de cards |
| Texto | `#1A2E25` | Títulos |
| Texto secundario | `#6B7280` | Subtítulos, labels |
| Rojo | `#EF4444` | Alertas, casos NETLAB, larvas confirmadas |
| Amarillo | `#F59E0B` | En revisión, casos inciertos |

### Fuentes
Las fuentes se cargan desde Google Fonts en `src/index.css`:
- **Montserrat ExtraBold** (`font-black`): títulos de sección, cifras grandes, nombre del logo
- **Inter**: texto general, labels, descripciones

### Responsive
El layout usa **CSS Grid** de Tailwind:
- Pantallas pequeñas: una columna
- `xl` (≥1280px): mapa 3/5 del ancho + feed 2/5

Los KPI cards van de 2 columnas (móvil) a 4 columnas (xl).

---

## 9. Cómo correr en desarrollo

```bash
cd dashboard
npm install
npm run dev   # http://localhost:3000
```

El servidor de Vite tiene configurado un proxy:

```typescript
// vite.config.ts
server: {
  port: 3000,
  proxy: {
    '/api': {
      target: 'http://localhost:8000',
      changeOrigin: true,
    },
  },
},
```

Esto significa que todas las llamadas a `/api/v1/...` se redirigen al backend de FastAPI en el puerto 8000. **No hay CORS en desarrollo** gracias a esto.

El backend debe estar corriendo para que el dashboard funcione:
```bash
cd backend
docker compose up -d
```

---

## 10. Cómo construir para producción

```bash
cd dashboard
npm run build
```

Genera una carpeta `dist/` con archivos estáticos optimizados. Este directorio se puede servir con:
- **Nginx** (ver `docs/05-despliegue.md`)
- **Caddy**
- Cualquier servidor de archivos estáticos

En producción el proxy de Vite no existe, por lo que el servidor debe estar configurado para enrutar `/api/v1/...` al backend. Con Nginx:

```nginx
location /api/ {
    proxy_pass http://localhost:8000;
}

location / {
    root /var/www/sivapre-dashboard;
    try_files $uri $uri/ /index.html;
}
```

El bloque `try_files` es necesario para que React Router funcione correctamente con rutas como `/login` — sin él, recargar la página daría un 404.
