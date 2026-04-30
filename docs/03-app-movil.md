# App Móvil — SIVAPRE

Aplicación React Native (Expo SDK 54) para ciudadanos. Disponible para Android e iOS desde un solo código fuente.

---

## Índice

1. [¿Qué puede hacer el usuario?](#1-qué-puede-hacer-el-usuario)
2. [Estructura del proyecto](#2-estructura-del-proyecto)
3. [Pantallas](#3-pantallas)
4. [Navegación](#4-navegación)
5. [Manejo del estado](#5-manejo-del-estado)
6. [Llamadas al backend (servicios)](#6-llamadas-al-backend-servicios)
7. [Notificaciones push](#7-notificaciones-push)
8. [Temas y estilos](#8-temas-y-estilos)
9. [Variables de entorno](#9-variables-de-entorno)
10. [Cómo construir el APK](#10-cómo-construir-el-apk)

---

## 1. ¿Qué puede hacer el usuario?

- **Registrarse e iniciar sesión** con email y contraseña
- **Reportar criaderos de mosquitos**: toma una foto, el GPS registra la ubicación automáticamente, elige el tipo de lugar y objeto, y envía el reporte
- **Ver sus reportes** anteriores con el estado actual (enviado, en revisión, resuelto...)
- **Ver alertas de su zona**: los reportes más recientes de otros ciudadanos cercanos, ordenados por nivel de riesgo (Alto / Medio / Bajo)
- **Editar su perfil**: nombre, teléfono y ubicación (departamento/provincia/distrito)
- **Cambiar su contraseña**
- **Recibir notificaciones push** cuando un inspector cambia el estado de su reporte

---

## 2. Estructura del proyecto

```
mobile/
├── app.json           # Configuración de Expo (nombre, íconos, plugins)
├── eas.json           # Perfiles de build para EAS (development/preview/production)
├── assets/
│   └── sivapre-logo.png   # Ícono y splash de la app
└── src/
    ├── components/
    │   ├── SivapreLogo.tsx    # Logo SVG vectorial (nítido en cualquier pantalla)
    │   └── UbigeoSelector.tsx # Selector de ubicación con búsqueda en tiempo real
    ├── hooks/
    │   ├── useAuth.ts         # Login, registro, perfil, logout
    │   └── useReportes.ts     # CRUD de reportes con React Query
    ├── navigation/
    │   └── index.tsx          # Toda la navegación del app (stacks + tab navigator)
    ├── screens/
    │   ├── SplashScreen.tsx       # Pantalla de carga animada
    │   ├── WelcomeScreen.tsx      # Bienvenida (antes de login)
    │   ├── LoginScreen.tsx        # Inicio de sesión
    │   ├── RegisterScreen.tsx     # Registro de nueva cuenta
    │   ├── HomeScreen.tsx         # Inicio: KPIs + alertas de zona
    │   ├── ReportScreen.tsx       # Formulario para nuevo reporte
    │   ├── MyReportsScreen.tsx    # Historial de reportes propios
    │   ├── ReporteDetalleScreen.tsx # Detalle de un reporte
    │   ├── InfoScreen.tsx         # Centro de información sobre dengue
    │   ├── PerfilScreen.tsx       # Ver perfil + centros de salud cercanos
    │   ├── EditarPerfilScreen.tsx # Editar nombre, teléfono, ubicación
    │   └── CambiarPasswordScreen.tsx # Cambiar contraseña
    ├── services/
    │   ├── api.ts             # Cliente axios con interceptores (token + 401)
    │   ├── auth.ts            # Funciones de autenticación
    │   ├── reportes.ts        # Funciones de reportes
    │   └── notifications.ts  # Registro de push token con Expo
    ├── store/
    │   ├── auth-context.tsx   # Contexto global: isAuthenticated, usuario
    │   ├── auth-signal.ts     # Señal para cerrar sesión desde el interceptor axios
    │   └── storage.ts         # Wrapper de AsyncStorage con claves tipadas
    ├── theme/
    │   └── index.ts           # Colores, tipografía, sombras (light/dark mode)
    └── types/
        └── index.ts           # Tipos TypeScript de toda la app
```

---

## 3. Pantallas

### SplashScreen
- Logo SVG animado con barra de progreso
- Se muestra mientras se verifica si el usuario tiene sesión activa
- Dura 1.8 segundos y luego navega a `Welcome` o `Main` según el estado de auth

### WelcomeScreen
- Primera pantalla que ve el usuario nuevo
- Botones para ir a Login o Register

### LoginScreen
- Campos de email y contraseña
- Muestra un banner verde de éxito si viene del registro
- Maneja errores de credenciales incorrectas o cuenta inactiva

### RegisterScreen
- Nombre, email, contraseña
- Selectores de departamento, provincia y distrito con búsqueda en tiempo real (`UbigeoSelector`)
- Al registrarse, redirige a Login con mensaje de éxito (no hace auto-login)

### HomeScreen
- Saludo con primer nombre del usuario y avatar con inicial
- Botón prominente "Reportar un criadero ahora"
- **KPIs personales**: reportes enviados, en revisión, resueltos
- **Alertas en tu zona**: conectadas al backend, muestran las zonas con más reportes recientes. Si el usuario no tiene ubicación configurada, muestra un CTA para ir al perfil.

### ReportScreen
- **Paso 1 — Foto**: Cámara o galería (sube a Cloudinary, muestra preview)
- **Paso 2 — Ubicación**: GPS automático con fallback manual
- **Paso 3 — Detalles**: tipo de lugar, tipo de objeto, presencia de larvas, dengue cercano, comentarios
- Validación en cada paso antes de avanzar

### MyReportsScreen
- Lista paginada de los reportes del usuario
- Badge de estado coloreado para cada reporte
- Tap en un reporte → navega a `ReporteDetalle`

### ReporteDetalleScreen
- Foto del criadero (si existe)
- Todos los datos del reporte
- Estado con color e ícono
- Botón para cancelar (solo si está en estado `enviado`)

### InfoScreen
- Información educativa sobre dengue y el zancudo Aedes aegypti
- Sección de mitos y verdades
- Contactos de emergencia

### PerfilScreen
- Datos del usuario (nombre, email, teléfono, ubicación)
- **GPS rápido**: usa la última posición conocida primero (instantáneo), luego actualiza con posición fresca si es necesario
- **3 centros de salud más cercanos**: calculados con la fórmula Haversine, muestra la distancia en km/m
- Acceso a editar perfil y cambiar contraseña

### EditarPerfilScreen
- Campos pre-llenados con la información actual
- Email es solo lectura (no se puede cambiar)
- `UbigeoSelector` para departamento, provincia y distrito
- Solo muestra el botón guardar si hay cambios reales (detecta diferencias)

### CambiarPasswordScreen
- Contraseña actual, nueva contraseña y confirmación
- Validación en tiempo real: avisa si no coinciden o son muy cortas
- Ícono de ojo para mostrar/ocultar cada campo

---

## 4. Navegación

La app usa tres stacks anidados:

```
RootNavigator
├── Splash (solo se muestra antes de verificar la sesión)
├── Auth (cuando no hay sesión)
│   ├── Welcome
│   ├── Login
│   └── Register
└── Main (cuando hay sesión)
    ├── Tabs (tab bar inferior)
    │   ├── Home
    │   ├── Report
    │   ├── MyReports
    │   └── Info
    ├── ReporteDetalle (slide desde la derecha)
    ├── Perfil
    ├── EditarPerfil
    └── CambiarPassword
```

La lógica de decisión (qué stack mostrar) está en `RootNavigator` y depende del estado `isAuthenticated` y `splashShown` del `AuthContext`.

---

## 5. Manejo del estado

### AuthContext (`src/store/auth-context.tsx`)
Estado global de autenticación. Persiste en `AsyncStorage` para que la sesión sobreviva a cerrar la app.

```typescript
// Disponible en toda la app con:
const { isAuthenticated, usuario, setUsuario, setIsAuthenticated } = useAuthContext();
```

Campos:
- `isAuthenticated`: boolean — si hay sesión activa
- `splashShown`: boolean — si ya pasó la pantalla de splash
- `usuario`: objeto con los datos del usuario logueado
- `setUsuario()`: actualiza el usuario (ej. después de editar perfil)

### React Query (`@tanstack/react-query`)
Para los datos del servidor (reportes, alertas de zona). Maneja automáticamente:
- Estado de carga (`isLoading`)
- Estado de error (`isError`)
- Caché (no vuelve a pedir si los datos son recientes)
- Invalidación (actualiza la lista después de crear o cancelar un reporte)

### AsyncStorage + `storage.ts`
Para persistir datos entre sesiones (token JWT, datos del usuario). Las claves están tipadas en `StorageKeys`:

```typescript
export const StorageKeys = {
  AUTH_TOKEN: 'sivapre_auth_token',
  REFRESH_TOKEN: 'sivapre_refresh_token',
  USER_DATA: 'sivapre_user_data',
};
```

---

## 6. Llamadas al backend (servicios)

### `src/services/api.ts`
Crea el cliente Axios con:
- `baseURL` desde la variable de entorno `EXPO_PUBLIC_API_URL`
- Interceptor de request: agrega el token JWT en cada petición
- Interceptor de response: si el servidor devuelve 401, cierra la sesión automáticamente

```typescript
export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://10.211.180.205:8000/api/v1';
```

### `src/services/auth.ts`
- `login(email, password)` → guarda token y datos del usuario en AsyncStorage
- `register(...)` → solo registra, no hace login automático
- `logout()` → llama al backend y limpia AsyncStorage
- `updatePerfil(...)` → actualiza perfil y refresca AsyncStorage
- `changePassword(...)` → cambia contraseña

### `src/services/reportes.ts`
- `listarMisReportes(pagina)` → reportes del usuario con paginación
- `obtenerPorId(id)` → detalle de un reporte
- `crear(payload)` → nuevo reporte
- `cancelar(id)` → cancelar un reporte propio
- `obtenerAlertasZona()` → alertas de la zona del usuario

### `src/hooks/useAuth.ts`
Expone los servicios de auth con `useMutation` de React Query:

```typescript
const { login, register, logout, updatePerfil, changePassword, isLoggingIn, loginError } = useAuth();
```

### `src/hooks/useReportes.ts`
Expone las queries y mutaciones de reportes:

```typescript
const { data, isLoading } = useMisReportes();
const { mutate: crearReporte } = useCrearReporte();
const { data: alertas } = useAlertasZona();
```

---

## 7. Notificaciones push

### Cómo se activan
Al hacer login, la app automáticamente:
1. Pide permiso de notificaciones al sistema operativo (un popup del sistema, no se puede personalizar)
2. Crea el canal de Android "reportes" con prioridad alta y color verde SIVAPRE
3. Obtiene el Expo Push Token del dispositivo
4. Lo envía al backend: `POST /api/v1/auth/push-token`

El código está en `src/services/notifications.ts`.

### Mensajes que recibe el usuario
| Evento | Notificación |
|---|---|
| Inspector marca "En revisión" | "🔍 Reporte en revisión" |
| Inspector marca "Resuelto" | "✅ Reporte resuelto — ¡Gracias!" |
| Inspector marca "Rechazado" | "ℹ️ Reporte no procesado" |

### Limitación importante
Las notificaciones push **solo funcionan en dispositivos físicos**. No funcionan en el emulador de Android ni en el simulador de iOS.

---

## 8. Temas y estilos

### Colores principales

| Variable | Color | Uso |
|---|---|---|
| `primary` | `#0F6E56` | Verde SIVAPRE — botones, highlights, avatares |
| `background` | `#F5FAF8` | Fondo de pantallas |
| `surface` | `#FFFFFF` | Fondo de cards |
| `text` | `#1A2E25` | Texto principal |
| `textSecondary` | `#6B8C7A` | Texto secundario |
| `error` | `#EF4444` | Errores, alertas altas |
| `warning` | `#F59E0B` | Alertas medias |
| `success` | `#10B981` | Alertas bajas, éxito |

### Fuentes
- **Montserrat ExtraBold**: títulos, números grandes, labels activos del tab
- **Inter Regular**: cuerpo de texto, descripciones, labels inactivos

Las fuentes se cargan con `expo-font` al inicio de la app.

---

## 9. Variables de entorno

Las variables `EXPO_PUBLIC_*` se hornean en el bundle al momento del build. No son secretas — son visibles en el código compilado.

Se configuran en `eas.json` por perfil de build:

```json
{
  "build": {
    "development": {
      "env": { "EXPO_PUBLIC_API_URL": "http://192.168.1.100:8000/api/v1" }
    },
    "preview": {
      "env": { "EXPO_PUBLIC_API_URL": "https://tu-tunnel.ngrok-free.dev/api/v1" }
    },
    "production": {
      "env": { "EXPO_PUBLIC_API_URL": "https://api.sivapre.gob.pe/api/v1" }
    }
  }
}
```

---

## 10. Cómo construir el APK

### Requisitos
- Cuenta en [expo.dev](https://expo.dev) (gratis)
- EAS CLI instalado: `npm install -g eas-cli`
- Login: `eas login`

### APK de prueba (preview)

```bash
cd mobile

# 1. Actualizar la URL del backend en eas.json (perfil "preview")
# 2. Construir
eas build --platform android --profile preview

# Al finalizar, EAS muestra un enlace QR para instalar directamente
```

### APK de producción (Play Store)

```bash
eas build --platform android --profile production
# Genera un .aab (Android App Bundle) para subir a Google Play
```

### Cuándo reconstruir
- Cuando cambias la URL del backend (`EXPO_PUBLIC_API_URL`)
- Cuando instalas un nuevo paquete nativo (ej. `expo-notifications`, `expo-camera`)
- Cuando cambias algo en `app.json` (íconos, permisos, plugins)
- Para cambios solo en código TypeScript, no necesitas reconstruir si usas Expo Updates (OTA)
