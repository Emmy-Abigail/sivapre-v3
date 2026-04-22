Aqui ingresare todos mis archivos
# 🚀 Cómo activar el proyecto y ver el dashboard

Para visualizar tu dashboard en el navegador, sigue estos pasos:

---

## 1. Configurar variables de entorno

Existe un archivo base llamado `.env.local.example`. Debes crear una copia de este archivo con el nombre `.env.local`.

Ejecuta en la terminal (dentro de la carpeta `dashboard`):

```bash
cp .env.local.example .env.local
```

El archivo `.env.local` solo necesita:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

* `NEXT_PUBLIC_API_BASE_URL`: apunta a tu backend local.

El mapa usa **OpenStreetMap + CartoDB Dark Matter** — es 100% open source y no requiere ningún token.

---

## 2. Iniciar el frontend (dashboard)

Ubícate en la carpeta `dashboard`:

```bash
cd /home/matias/Github/sivapre-v3/dashboard
```

Ejecuta el servidor de desarrollo:

```bash
npm run dev
```

Esto levantará la aplicación en:

```
http://localhost:3000
```

Abre esa URL en tu navegador para ver el dashboard.

---

## 3. Levantar el backend (Docker)

Para que el frontend pueda consumir datos, necesitas tener el backend corriendo.

Desde la raíz del proyecto:

```bash
cd /home/matias/Github/sivapre-v3
```

Ejecuta:

```bash
docker compose up -d
```

Esto iniciará los contenedores en segundo plano.

---

## ✅ Resultado esperado

* Frontend corriendo en: `http://localhost:3000`
* Backend disponible en: `http://localhost:8000`
* Mapa de Iquitos visible inmediatamente (tiles CartoDB Dark Matter vía OSM, sin token)

---

## ⚠️ Problemas comunes

* **Pantalla en blanco**: revisa la consola del navegador.
* **Error de conexión al backend**: verifica que Docker esté corriendo.
* **Mapa no carga**: verifica conexión a internet (los tiles se sirven desde `basemaps.cartocdn.com`).

---
