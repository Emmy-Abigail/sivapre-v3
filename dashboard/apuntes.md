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

Luego abre el archivo `.env.local` y verifica las siguientes variables:

```env
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_MAPBOX_TOKEN=
```

* `NEXT_PUBLIC_API_BASE_URL`: ya apunta a tu backend local.
* `NEXT_PUBLIC_MAPBOX_TOKEN`: debes colocar aquí un token gratuito de Mapbox para habilitar el mapa.
  Puedes dejarlo vacío temporalmente, pero el mapa no renderizará.

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
* Dashboard visible (sin mapa si no configuras Mapbox)

---

## ⚠️ Problemas comunes

* **Pantalla en blanco**: revisa la consola del navegador.
* **Error de conexión al backend**: verifica que Docker esté corriendo.
* **Mapa no carga**: falta el `NEXT_PUBLIC_MAPBOX_TOKEN`.

---
