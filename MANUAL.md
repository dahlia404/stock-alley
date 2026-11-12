# AlleyStock — Manual paso a paso

App web para controlar el stock y las ventas de tu stand de **Artist Alley**.

- **Web (frontend):** React → se publica en **Netlify**
- **Servidor (backend/API):** Python FastAPI → se publica en **Render** (gratis)
- **Base de datos:** **MongoDB Atlas** (gratis)

> Acceso por defecto: usuario **admin**, contraseña **1234** (cámbiala en Configuración → Acceso).

---

## Parte A · Usar la app

### 1. Primera vez
1. Entra con `admin` / `1234`.
2. Ve a **Configuración**:
   - **Nombre del stand** o **logo** (si subes logo, el nombre no se ve y queda como texto alternativo del logo).
   - **Moneda** (€, $, £…).
   - **Aviso de pocas unidades**: nº de unidades a partir del cual un producto se marca en ámbar (p. ej. 3).
   - **Zona horaria** (para saber qué ventas son "de hoy").
   - **Tipos de producto** (chapa, print, sticker…) y **fandoms** (Dragon Ball, One Piece, Naruto…).
   - Pulsa **Guardar configuración**.
3. En **Configuración → Acceso** cambia usuario y contraseña.
4. En **Productos → Nuevo producto** da de alta cada artículo: nombre, tipo, fandom, precio, foto (subida o URL) y stock inicial.

### 2. Durante el evento
1. **Venta rápida:** en **Productos** pulsa el botón verde **−1** de la fila. Resta una unidad y la registra como venta. Si te equivocas, pulsa **Deshacer** en el aviso.
2. **Filtros:** buscador + tipo + fandom + estado (en stock / pocas unidades / sin stock / avisos) + ordenación (menos stock, precio, más vendidos).
3. **Colores:** ámbar = pocas unidades, rojo = sin stock. En **Inicio** aparecen todos los avisos.
4. **Ficha de producto** (pulsa el nombre): editar nombre, precio, foto, tipo, fandom, notas; y gestionar stock:
   - **Vender** (cantidad libre y precio especial opcional, p. ej. packs) → cuenta como venta.
   - **Retirar (merma)** → regalos, roturas… no cuenta como venta.
   - **Añadir stock** → reposición.
   - Historial con botón para deshacer cada movimiento.

### 3. Cierre del día
1. **Ventas** muestra unidades vendidas, ingresos y la lista de productos vendidos con su cantidad.
2. Navega por días con las flechas o el calendario.
3. Pestaña **Todos los movimientos** → **Anular** corrige errores (el stock se ajusta solo).
4. **CSV** descarga el día para Excel / Google Sheets.

---

## Parte B · Publicar la app (Netlify + Render + MongoDB Atlas)

### Paso 0 · Sube el código a GitHub
Usa el botón **"Save to GitHub"** de Emergent (o súbelo manualmente). El repositorio contiene:
`frontend/`, `backend/`, `netlify.toml`, `render.yaml`.

### Paso 1 · Base de datos (MongoDB Atlas)
1. Entra en https://www.mongodb.com/cloud/atlas y crea una cuenta.
2. **Create** → clúster **M0 (Free)** → región cercana.
3. **Database Access → Add New Database User**: crea usuario + contraseña.
4. **Network Access → Add IP Address → Allow access from anywhere** (`0.0.0.0/0`).
5. **Database → Connect → Drivers** → copia la cadena:
   `mongodb+srv://USUARIO:CONTRASEÑA@cluster0.xxxxx.mongodb.net/`
   (sustituye la contraseña; si tiene símbolos como `@` o `#`, codifícalos, p. ej. `@` → `%40`).

### Paso 2 · Servidor (Render)
1. Entra en https://render.com y conecta tu GitHub.
2. **New → Blueprint** → elige el repositorio. Render lee `render.yaml`.
   - Alternativa manual: **New → Web Service**
     - Root Directory: `backend`
     - Runtime: Python 3
     - Build Command: `pip install -r requirements-deploy.txt`
     - Start Command: `uvicorn server:app --host 0.0.0.0 --port $PORT`
3. Variables de entorno:

   | Variable | Valor |
   |---|---|
   | `MONGO_URL` | cadena de Atlas del paso 1 |
   | `DB_NAME` | `alleystock` |
   | `CORS_ORIGINS` | `*` |
   | `COOKIE_SECURE` | `true` |
   | `PYTHON_VERSION` | `3.11.9` |

4. Despliega y abre `https://TU-SERVICIO.onrender.com/api/` → debe decir `AlleyStock API OK`.
   El usuario `admin / 1234` y la configuración inicial se crean solos en el primer arranque.
5. (Opcional) Productos de ejemplo: en Render → **Shell** ejecuta `python seed.py`.

> En el plan gratuito, Render "duerme" el servidor tras 15 min sin uso; la primera petición tarda ~1 min. Abre la app unos minutos antes del evento.

### Paso 3 · Web (Netlify)
1. Entra en https://app.netlify.com → **Add new site → Import an existing project** → GitHub → tu repositorio.
2. Netlify lee `netlify.toml` (no cambies nada):
   - Base directory: `frontend`
   - Build command: `yarn build && node scripts/netlify-redirects.mjs`
   - Publish directory: `dist`
3. **Site configuration → Environment variables → Add variable**:
   - `BACKEND_URL` = `https://TU-SERVICIO.onrender.com` (sin `/` final)
4. **Deploys → Trigger deploy**.
5. Abre tu URL `https://TU-SITIO.netlify.app`, entra con `admin / 1234` y cambia la contraseña.

**¿Cómo funciona?** El script genera `_redirects` para que Netlify reenvíe `/api/*` a tu servidor de Render. Así la web y la API comparten dominio y la sesión (cookie) funciona sin más configuración.

### Problemas frecuentes
| Síntoma | Solución |
|---|---|
| El build de Netlify falla con "Falta la variable BACKEND_URL" | Añade `BACKEND_URL` y vuelve a desplegar |
| "No se pudo conectar con el servidor" | Render está despertando (espera 1 min) o `BACKEND_URL` es incorrecta |
| Render: error de conexión a Mongo | Revisa `MONGO_URL`, la contraseña y que Atlas permita `0.0.0.0/0` |
| No recuerdo la contraseña | En Atlas → Browse Collections → borra el documento de la colección `users`; al reiniciar Render se recrea `admin / 1234` |

### Desarrollo local (opcional)
```bash
# backend
cd backend && pip install -r requirements-deploy.txt
# crea backend/.env con MONGO_URL, DB_NAME, CORS_ORIGINS
uvicorn server:app --port 8001 --reload
# frontend (proxy /api → :8001)
cd frontend && yarn && yarn dev
```
