import type { ReactNode } from "react";
import { BookOpen, Cloud, Database, Rocket, ShoppingBag, Store } from "lucide-react";

interface Step {
  title: string;
  body: ReactNode;
}
interface Part {
  id: string;
  title: string;
  icon: typeof BookOpen;
  intro: string;
  steps: Step[];
}

const Code = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[13px] text-indigo-700">{children}</code>
);

const PARTS: Part[] = [
  {
    id: "uso",
    title: "1. Primeros pasos en la app",
    icon: Store,
    intro: "Lo que tienes que hacer la primera vez que entras.",
    steps: [
      { title: "Entra con el usuario por defecto", body: <>Usuario <Code>admin</Code> y contraseña <Code>1234</Code>. Después ve a <b>Configuración → Acceso</b> y cámbialos.</> },
      { title: "Personaliza tu stand", body: <>En <b>Configuración</b> escribe el nombre del stand o sube tu logo (si hay logo, el nombre no se muestra y queda como texto alternativo). Elige la <b>moneda</b>, el <b>aviso de pocas unidades</b> (p. ej. 3) y tu <b>zona horaria</b>. Pulsa <b>Guardar configuración</b>.</> },
      { title: "Crea tus listas", body: <>En la misma página añade o quita <b>tipos de producto</b> (chapa, print, sticker…) y <b>fandoms</b> (Dragon Ball, One Piece…). Se usarán en los filtros y fichas.</> },
      { title: "Da de alta tus productos", body: <>En <b>Productos → Nuevo producto</b> rellena nombre, tipo, fandom, precio, foto (subida desde el móvil/ordenador o por URL) y stock inicial.</> },
    ],
  },
  {
    id: "evento",
    title: "2. Durante el evento",
    icon: ShoppingBag,
    intro: "Flujo rápido para vender sin perder la cuenta.",
    steps: [
      { title: "Venta rápida", body: <>En <b>Productos</b> pulsa el botón verde <b>−1</b> de la fila: resta una unidad y la apunta como venta. Si te equivocas, pulsa <b>Deshacer</b> en el aviso que aparece.</> },
      { title: "Encuentra productos al vuelo", body: <>Usa el buscador y los filtros por <b>tipo</b>, <b>fandom</b> y <b>estado</b> (en stock, pocas unidades, sin stock). Puedes ordenar por stock, precio o más vendidos.</> },
      { title: "Colores de aviso", body: <>Las filas en <b className="text-amber-600">ámbar</b> tienen pocas unidades (según tu umbral) y las <b className="text-red-600">rojas</b> están agotadas. En <b>Inicio</b> verás la lista de avisos.</> },
      { title: "Ventas múltiples, regalos y reposición", body: <>En la <b>ficha del producto</b> indica una cantidad y pulsa <b>Vender</b> (puedes poner un precio especial por unidad para packs), <b>Retirar (merma)</b> para regalos/roturas (no cuenta como venta) o <b>Añadir stock</b>.</> },
    ],
  },
  {
    id: "cierre",
    title: "3. Cierre del día",
    icon: BookOpen,
    intro: "Comprueba qué has vendido y cuánto has ingresado.",
    steps: [
      { title: "Registro de ventas", body: <>En <b>Ventas</b> ves las unidades vendidas, los ingresos, cada producto vendido y cuántas unidades. Cambia de día con las flechas o el calendario.</> },
      { title: "Anula errores", body: <>En la pestaña <b>Todos los movimientos</b> puedes <b>Anular</b> cualquier movimiento: el stock se corrige solo.</> },
      { title: "Exporta", body: <>Pulsa <b>CSV</b> para descargar el día y abrirlo en Excel o Google Sheets.</> },
    ],
  },
  {
    id: "db",
    title: "4. Base de datos gratis (MongoDB Atlas)",
    icon: Database,
    intro: "Aquí se guardan productos, ventas y configuración.",
    steps: [
      { title: "Crea la cuenta", body: <>Entra en <b>mongodb.com/cloud/atlas</b>, regístrate y crea un clúster <b>M0 (Free)</b>. Elige una región cercana (p. ej. Frankfurt o Madrid).</> },
      { title: "Crea un usuario de base de datos", body: <>En <b>Database Access → Add New Database User</b> crea un usuario y contraseña (guárdalos).</> },
      { title: "Permite conexiones", body: <>En <b>Network Access → Add IP Address</b> elige <b>Allow access from anywhere</b> (<Code>0.0.0.0/0</Code>), necesario para Render.</> },
      { title: "Copia la cadena de conexión", body: <>En <b>Database → Connect → Drivers</b> copia algo como <Code>mongodb+srv://usuario:contraseña@cluster0.xxxx.mongodb.net/</Code>. Esa será tu <Code>MONGO_URL</Code>.</> },
    ],
  },
  {
    id: "backend",
    title: "5. Servidor (backend) en Render",
    icon: Cloud,
    intro: "Netlify solo sirve la web; la API en Python vive en Render (plan gratuito).",
    steps: [
      { title: "Sube el código a GitHub", body: <>Guarda este proyecto en un repositorio de GitHub (botón «Save to GitHub» de Emergent o manualmente).</> },
      { title: "Crea el servicio", body: <>En <b>render.com</b> → <b>New → Blueprint</b> y elige tu repositorio: Render leerá el archivo <Code>render.yaml</Code> automáticamente. (Alternativa manual: <b>New → Web Service</b>, Root Directory <Code>backend</Code>, Build <Code>pip install -r requirements-deploy.txt</Code>, Start <Code>uvicorn server:app --host 0.0.0.0 --port $PORT</Code>).</> },
      { title: "Variables de entorno", body: <><Code>MONGO_URL</Code> = tu cadena de Atlas · <Code>DB_NAME</Code> = <Code>alleystock</Code> · <Code>CORS_ORIGINS</Code> = <Code>*</Code> · <Code>COOKIE_SECURE</Code> = <Code>true</Code>.</> },
      { title: "Comprueba", body: <>Cuando termine, abre <Code>https://TU-SERVICIO.onrender.com/api/</Code>: debe responder <Code>AlleyStock API OK</Code>. El usuario <Code>admin / 1234</Code> se crea solo la primera vez. Nota: en el plan gratis el servidor «se duerme» y tarda ~1 min en despertar.</> },
    ],
  },
  {
    id: "netlify",
    title: "6. Web (frontend) en Netlify",
    icon: Rocket,
    intro: "La web pública que usarás desde el móvil o la tablet.",
    steps: [
      { title: "Importa el proyecto", body: <>En <b>app.netlify.com</b> → <b>Add new site → Import an existing project</b> → GitHub → tu repositorio. Netlify detecta el archivo <Code>netlify.toml</Code> (carpeta <Code>frontend</Code>, comando y carpeta de publicación ya configurados).</> },
      { title: "Añade la variable BACKEND_URL", body: <>En <b>Site configuration → Environment variables</b> crea <Code>BACKEND_URL</Code> con la URL de Render, sin barra final: <Code>https://TU-SERVICIO.onrender.com</Code>.</> },
      { title: "Despliega", body: <>Pulsa <b>Deploy</b>. Netlify redirige automáticamente <Code>/api/*</Code> a tu backend, así el login funciona sin configurar nada más.</> },
      { title: "¡Listo!", body: <>Abre tu URL de Netlify, entra con <Code>admin / 1234</Code> y cambia la contraseña en Configuración. Si cambias la URL del backend, actualiza <Code>BACKEND_URL</Code> y vuelve a desplegar.</> },
    ],
  },
];

export default function Manual() {
  return (
    <div className="grid gap-8 lg:grid-cols-[220px_1fr]">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">Contenido</p>
        <nav className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
          {PARTS.map((p) => (
            <a key={p.id} href={`#${p.id}`} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700" data-testid={`manual-toc-${p.id}`}>
              {p.title}
            </a>
          ))}
        </nav>
      </aside>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900" data-testid="manual-title">Manual paso a paso</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Cómo usar la app en tu stand y cómo publicarla gratis con <b>Netlify</b> (web) + <b>Render</b> (servidor) + <b>MongoDB Atlas</b> (base de datos).</p>
        </div>
        {PARTS.map(({ id, title, icon: Icon, intro, steps }) => (
          <section key={id} id={id} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" data-testid={`manual-section-${id}`}>
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 text-white">
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                <p className="text-sm text-slate-500">{intro}</p>
              </div>
            </div>
            <ol className="space-y-4">
              {steps.map((s, i) => (
                <li key={s.title} className="flex gap-4">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 font-mono text-sm font-bold text-indigo-700">{i + 1}</span>
                  <div>
                    <p className="font-semibold text-slate-900">{s.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">{s.body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
