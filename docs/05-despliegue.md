# Guía de Despliegue — SIVAPRE

Cómo pasar SIVAPRE de tu máquina local a un servidor de producción. Cubre el backend (FastAPI + PostgreSQL), el dashboard (React) y la app móvil (APK para Android).

---

## Índice

1. [Resumen del proceso](#1-resumen-del-proceso)
2. [Requisitos del servidor](#2-requisitos-del-servidor)
3. [Preparar el servidor](#3-preparar-el-servidor)
4. [Desplegar el backend](#4-desplegar-el-backend)
5. [Desplegar el dashboard](#5-desplegar-el-dashboard)
6. [Configurar Nginx + SSL](#6-configurar-nginx--ssl)
7. [Crear el primer administrador](#7-crear-el-primer-administrador)
8. [Publicar la app móvil](#8-publicar-la-app-móvil)
9. [Variables de entorno — referencia completa](#9-variables-de-entorno--referencia-completa)
10. [Checklist pre-lanzamiento](#10-checklist-pre-lanzamiento)
11. [Monitoreo y mantenimiento](#11-monitoreo-y-mantenimiento)

---

## 1. Resumen del proceso

```
Tu máquina local → Git Push → Servidor VPS
                                   │
                                   ├── Backend (FastAPI + PostgreSQL)
                                   │   └── Docker Compose → puerto 8000 (interno)
                                   │
                                   ├── Dashboard (React build estático)
                                   │   └── Nginx sirve dist/ → puerto 3000 (interno)
                                   │
                                   └── Nginx (reverse proxy + SSL)
                                       ├── api.sivapre.gob.pe → puerto 8000
                                       └── dashboard.sivapre.gob.pe → puerto 3000
```

---

## 2. Requisitos del servidor

| Recurso | Mínimo recomendado |
|---|---|
| CPU | 2 vCores |
| RAM | 2 GB |
| Disco | 20 GB SSD |
| OS | Ubuntu 22.04 LTS |
| Puertos abiertos | 22 (SSH), 80 (HTTP), 443 (HTTPS) |

Proveedores recomendados: DigitalOcean, Linode/Akamai, Render, Railway, o un servidor del MINSA.

---

## 3. Preparar el servidor

```bash
# Actualizar paquetes
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Instalar Node.js 20 (para construir el dashboard)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Instalar Nginx
sudo apt install -y nginx

# Instalar Certbot (para SSL con Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx

# Clonar el repositorio
git clone https://github.com/tu-org/sivapre.git /opt/sivapre
cd /opt/sivapre
```

---

## 4. Desplegar el backend

### 4.1 — Configurar variables de entorno

```bash
cd /opt/sivapre/backend
cp .env.example .env
nano .env
```

Rellena todos los campos (ver sección [9. Variables de entorno](#9-variables-de-entorno--referencia-completa)).

**Genera claves seguras:**
```bash
# JWT_SECRET_KEY
python3 -c "import secrets; print(secrets.token_hex(32))"

# ADMIN_SECRET_KEY
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4.2 — Ajustar el docker-compose para producción

El `docker-compose.yml` de la raíz tiene `--reload` en el CMD del Dockerfile (hot-reload de desarrollo). Para producción, crea un override:

```bash
# /opt/sivapre/docker-compose.prod.yml
cat > /opt/sivapre/docker-compose.prod.yml << 'EOF'
services:
  backend:
    command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
    environment:
      APP_ENV: production
      DEBUG: "False"
    volumes: []  # Sin hot-reload en producción
EOF
```

### 4.3 — Levantar los servicios

```bash
cd /opt/sivapre

# Construir y levantar backend + base de datos
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# Verificar que están corriendo
docker compose ps

# Ver logs del backend
docker compose logs -f backend
```

### 4.4 — Aplicar migraciones

Las migraciones se aplican automáticamente al iniciar el contenedor (via `entrypoint.sh`). Para verificarlo:

```bash
docker exec sivapre_backend alembic current
```

Para aplicar manualmente si algo falla:
```bash
docker exec sivapre_backend alembic upgrade head
```

### 4.5 — Verificar que el backend responde

```bash
curl http://localhost:8000/api/v1/health
# Debe devolver: {"status": "ok"}
```

---

## 5. Desplegar el dashboard

### 5.1 — Construir el bundle de producción

```bash
cd /opt/sivapre/dashboard
npm install
npm run build
# Genera dist/ con los archivos estáticos
```

### 5.2 — Copiar al directorio de Nginx

```bash
sudo mkdir -p /var/www/sivapre-dashboard
sudo cp -r /opt/sivapre/dashboard/dist/* /var/www/sivapre-dashboard/
sudo chown -R www-data:www-data /var/www/sivapre-dashboard
```

---

## 6. Configurar Nginx + SSL

### 6.1 — Configuración de Nginx

Crea dos archivos de configuración:

**API (backend):**
```bash
sudo nano /etc/nginx/sites-available/sivapre-api
```

```nginx
server {
    listen 80;
    server_name api.sivapre.gob.pe;

    client_max_body_size 10M;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Dashboard (frontend):**
```bash
sudo nano /etc/nginx/sites-available/sivapre-dashboard
```

```nginx
server {
    listen 80;
    server_name dashboard.sivapre.gob.pe;

    root /var/www/sivapre-dashboard;
    index index.html;

    # React Router — todas las rutas sirven index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache para assets estáticos (Vite los genera con hash en el nombre)
    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 6.2 — Habilitar los sitios

```bash
sudo ln -s /etc/nginx/sites-available/sivapre-api /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/sivapre-dashboard /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Recargar Nginx
sudo systemctl reload nginx
```

### 6.3 — Obtener certificado SSL (HTTPS)

```bash
# Para el backend
sudo certbot --nginx -d api.sivapre.gob.pe

# Para el dashboard
sudo certbot --nginx -d dashboard.sivapre.gob.pe
```

Certbot modifica automáticamente los archivos de Nginx para activar HTTPS y redirigir HTTP → HTTPS. Los certificados se renuevan automáticamente (crontab de certbot).

### 6.4 — CORS en el backend

En producción, el backend solo debe aceptar peticiones del dominio del dashboard. Edita `backend/.env`:

```env
ALLOWED_ORIGINS=https://dashboard.sivapre.gob.pe
```

---

## 7. Crear el primer administrador

El backend tiene un endpoint de configuración inicial protegido por una clave secreta. Solo funciona si no existe ningún administrador aún.

```bash
curl -X POST https://api.sivapre.gob.pe/api/v1/auth/setup \
  -H "Content-Type: application/json" \
  -d '{
    "admin_secret": "TU_ADMIN_SECRET_KEY",
    "nombre": "Administrador SIVAPRE",
    "email": "admin@sivapre.gob.pe",
    "password": "contraseña-muy-segura-2025"
  }'
```

La clave `admin_secret` debe coincidir con `ADMIN_SECRET_KEY` en el `.env` del backend.

Después del primer login en el dashboard, el administrador puede crear las cuentas de inspectores desde **Gestión de Personal**.

---

## 8. Publicar la app móvil

### 8.1 — Preparar la URL de producción

Edita `mobile/eas.json` y pon la URL real del backend en el perfil `production`:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.sivapre.gob.pe/api/v1"
      }
    }
  }
}
```

### 8.2 — Construir el APK/AAB de producción

```bash
cd mobile
npm install -g eas-cli   # si no está instalado
eas login                # con tu cuenta expo.dev

# Android App Bundle (para Google Play Store)
eas build --platform android --profile production

# APK directo (para distribución manual o Play Store abierta)
# Cambiar en eas.json: "buildType": "apk" en el perfil production
eas build --platform android --profile production
```

El proceso tarda ~10-15 minutos y corre en los servidores de Expo (no en tu máquina). Al terminar, EAS proporciona un enlace de descarga.

### 8.3 — Publicar en Google Play Store

1. Ve a [play.google.com/console](https://play.google.com/console)
2. Crea una nueva aplicación con el paquete `pe.gob.sivapre`
3. Sube el `.aab` generado por EAS
4. Completa los formularios de descripción, capturas de pantalla y clasificación de contenido
5. Envía para revisión (Google tarda 1-3 días hábiles en la primera publicación)

### 8.4 — Actualizaciones sin rebuild (Expo Updates / OTA)

Para cambios solo en código TypeScript (sin nuevos paquetes nativos ni cambios en `app.json`), puedes publicar una actualización OTA sin pasar por el Play Store:

```bash
cd mobile
eas update --branch production --message "Descripción del cambio"
```

Los usuarios recibirán la actualización la próxima vez que abran la app con conexión a internet.

---

## 9. Variables de entorno — referencia completa

### Backend (`backend/.env`)

| Variable | Requerida | Descripción |
|---|---|---|
| `APP_ENV` | Sí | `production` en producción |
| `DEBUG` | Sí | `False` en producción |
| `POSTGRES_USER` | Sí | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | Sí | Contraseña de PostgreSQL |
| `POSTGRES_DB` | Sí | Nombre de la base de datos |
| `POSTGRES_HOST` | Sí | `db` (Docker) o IP del servidor |
| `POSTGRES_PORT` | Sí | `5432` (interno Docker) |
| `DATABASE_URL` | Sí | `postgresql+asyncpg://user:pass@host:port/db` |
| `JWT_SECRET_KEY` | Sí | Clave aleatoria de 64 caracteres hex |
| `JWT_ALGORITHM` | Sí | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Sí | `30` (minutos) |
| `CLOUDINARY_CLOUD_NAME` | Sí | Nombre del cloud en Cloudinary |
| `CLOUDINARY_API_KEY` | Sí | API Key de Cloudinary |
| `CLOUDINARY_API_SECRET` | Sí | API Secret de Cloudinary |
| `ADMIN_SECRET_KEY` | Sí | Clave para el endpoint `/auth/setup` |
| `ALLOWED_ORIGINS` | Sí | URL del dashboard en producción |
| `PGADMIN_EMAIL` | No | Solo para pgAdmin (desarrollo) |
| `PGADMIN_PASSWORD` | No | Solo para pgAdmin (desarrollo) |

### App móvil (`mobile/eas.json`)

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_API_URL` | URL completa de la API, incluyendo `/api/v1` |

Las variables `EXPO_PUBLIC_*` se insertan en el bundle JavaScript en el momento del build — no son secretas y son visibles en el código compilado.

---

## 10. Checklist pre-lanzamiento

### Seguridad
- [ ] `JWT_SECRET_KEY` es una clave aleatoria larga y única
- [ ] `ADMIN_SECRET_KEY` es una clave aleatoria larga y única
- [ ] `DEBUG=False` en el `.env` de producción
- [ ] `ALLOWED_ORIGINS` tiene solo el dominio del dashboard (no `*`)
- [ ] Las contraseñas de la base de datos son largas y únicas
- [ ] pgAdmin no está expuesto en producción (remover o poner detrás de firewall)
- [ ] El endpoint `/api/v1/docs` (Swagger) está deshabilitado en producción (o protegido)

### Backend
- [ ] `docker compose ps` muestra todos los servicios como `healthy`
- [ ] `alembic current` muestra la migración más reciente
- [ ] `curl https://api.sivapre.gob.pe/api/v1/health` devuelve `{"status": "ok"}`
- [ ] HTTPS funciona correctamente (candado en el navegador)

### Dashboard
- [ ] El build (`npm run build`) no tiene errores de TypeScript
- [ ] El login funciona con las credenciales del administrador
- [ ] El mapa carga y muestra datos
- [ ] Cambiar el estado de un reporte funciona

### App móvil
- [ ] El APK de producción se conecta a `https://api.sivapre.gob.pe/api/v1`
- [ ] El login funciona desde un dispositivo físico
- [ ] Las notificaciones push llegan al cambiar el estado de un reporte
- [ ] El registro de nuevos ciudadanos funciona

---

## 11. Monitoreo y mantenimiento

### Ver logs en tiempo real

```bash
# Backend
docker compose logs -f backend

# Nginx
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Reiniciar servicios

```bash
# Reiniciar solo el backend (después de un cambio de código)
docker compose restart backend

# Reiniciar todo
docker compose down && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Actualizar el backend (después de un git pull)

```bash
cd /opt/sivapre
git pull origin main

# Reconstruir la imagen si hay cambios en requirements.txt o Dockerfile
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build backend

# Si solo hay cambios de código Python (hot-reload no está activo en producción)
docker compose restart backend
```

### Actualizar el dashboard (después de un git pull)

```bash
cd /opt/sivapre/dashboard
git pull origin main
npm install
npm run build
sudo cp -r dist/* /var/www/sivapre-dashboard/
```

### Backup de la base de datos

```bash
# Crear backup
docker exec sivapre_db pg_dump -U sivapre sivapre_db > backup_$(date +%Y%m%d).sql

# Restaurar backup
cat backup_20251201.sql | docker exec -i sivapre_db psql -U sivapre -d sivapre_db
```

Se recomienda programar backups automáticos diarios con un crontab:

```bash
# crontab -e
0 2 * * * docker exec sivapre_db pg_dump -U sivapre sivapre_db > /opt/backups/sivapre_$(date +\%Y\%m\%d).sql
```

### Renovación de certificados SSL

Certbot instala un timer de systemd que renueva automáticamente. Para verificarlo:

```bash
sudo certbot renew --dry-run
```
