import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, BookOpen, Boxes, Coins, Package, PackageX, ReceiptText, Settings, ShoppingBag, ShoppingCart } from "lucide-react";
import { apiGet } from "@/lib/api";
import { formatDateLong, formatMoney, stockStatus, useProducts, useSettings } from "@/lib/hooks";
import type { Me, SalesDay } from "@/lib/types";
import StockBadge from "@/components/StockBadge";
import ProductThumb from "@/components/ProductThumb";

const SHORTCUTS = [
  { to: "/caja", label: "Caja rápida", desc: "Carrito, packs y cambio", icon: ShoppingCart, cls: "from-sky-500 to-indigo-600", testid: "home-shortcut-caja" },
  { to: "/productos", label: "Productos", desc: "Lista, filtros y venta rápida", icon: Package, cls: "from-indigo-500 to-indigo-700", testid: "home-shortcut-productos" },
  { to: "/ventas", label: "Registro de ventas", desc: "Qué y cuánto has vendido hoy", icon: ReceiptText, cls: "from-pink-500 to-rose-600", testid: "home-shortcut-ventas" },
  { to: "/configuracion", label: "Configuración", desc: "Logo, moneda, avisos, listas", icon: Settings, cls: "from-amber-500 to-orange-600", testid: "home-shortcut-configuracion" },
  { to: "/manual", label: "Manual", desc: "Paso a paso y despliegue", icon: BookOpen, cls: "from-emerald-500 to-teal-600", testid: "home-shortcut-manual" },
];

export default function Home() {
  const { settings } = useSettings();
  const products = useProducts();
  const sales = useQuery({ queryKey: ["sales", "today"], queryFn: () => apiGet<SalesDay>("/sales") });
  const me = useQuery({ queryKey: ["me"], queryFn: () => apiGet<Me>("/auth/me"), retry: false });

  const list = products.isError ? [] : (products.data ?? []);
  const t = settings.low_stock_threshold;
  const out = list.filter((p) => stockStatus(p.stock, t) === "out");
  const low = list.filter((p) => stockStatus(p.stock, t) === "low").sort((a, b) => a.stock - b.stock);
  const units = list.reduce((s, p) => s + p.stock, 0);
  const today = sales.isError ? undefined : sales.data;

  const metrics = [
    { label: "Productos", value: String(list.length), icon: Boxes, testid: "metric-products-count" },
    { label: "Unidades en stock", value: String(units), icon: ShoppingBag, testid: "metric-units-in-stock" },
    { label: "Vendidas hoy", value: String(today?.total_units ?? 0), icon: ReceiptText, testid: "metric-today-units" },
    { label: "Ingresos hoy", value: formatMoney(today?.total_revenue ?? 0, settings.currency), icon: Coins, testid: "metric-today-revenue" },
  ];

  return (
    <div className="space-y-10">
      <section className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600" data-testid="home-today-date">
            {today ? formatDateLong(today.today) : "Hoy"}
          </p>
          <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl" data-testid="home-welcome-title">
            ¡Hola{me.data ? `, ${me.data.username}` : ""}! Bienvenid@ a <span className="bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent">{settings.store_name}</span>
          </h1>
          <p className="mt-3 max-w-xl text-base text-slate-600">
            {settings.event_name ? <>Evento actual: <b>{settings.event_name}</b>. </> : null}
            Aquí tienes el resumen de tu stand y los productos que necesitan atención.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {metrics.map(({ label, value, icon: Icon, testid }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <Icon className="size-4 text-indigo-500" /> {label}
              </div>
              <div className="mt-2 font-mono text-2xl font-bold text-slate-900" data-testid={testid}>
                {value}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_1.15fr]">
        <div className="grid gap-4 sm:grid-cols-2">
          {SHORTCUTS.map(({ to, label, desc, icon: Icon, cls, testid }) => (
            <Link
              key={to}
              to={to}
              data-testid={testid}
              className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-[transform,box-shadow] duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <div className={`mb-4 inline-flex size-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow ${cls}`}>
                <Icon className="size-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">{label}</h3>
              <p className="mt-1 text-sm text-slate-500">{desc}</p>
              <ArrowRight className="absolute right-5 top-6 size-5 text-slate-300 transition-transform duration-200 group-hover:translate-x-1 group-hover:text-indigo-500" />
            </Link>
          ))}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="stock-alerts-panel">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <AlertTriangle className="size-5 text-amber-500" /> Avisos de stock
            </h2>
            <span className="text-xs font-medium text-slate-500">Aviso a partir de ≤ {t} uds</span>
          </div>
          {out.length === 0 && low.length === 0 ? (
            <p className="rounded-xl bg-emerald-50 px-4 py-6 text-center text-sm font-medium text-emerald-700" data-testid="stock-alerts-empty">
              Todo en orden: ningún producto con pocas unidades.
            </p>
          ) : (
            <ul className="max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {[...out, ...low].map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/productos/${p.id}`}
                    data-testid={`stock-alert-item-${p.id}`}
                    className={`flex items-center gap-3 rounded-xl border p-2.5 transition-colors duration-200 ${
                      p.stock <= 0 ? "border-red-200 bg-red-50 hover:bg-red-100" : "border-amber-200 bg-amber-50 hover:bg-amber-100"
                    }`}
                  >
                    <ProductThumb src={p.image} alt={p.name} className="size-10 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-semibold ${p.stock <= 0 ? "text-red-900 line-through" : "text-amber-900"}`}>{p.name}</p>
                      <p className="truncate text-xs text-slate-500">{[p.type, p.fandom].filter(Boolean).join(" · ")}</p>
                    </div>
                    <StockBadge stock={p.stock} threshold={t} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {out.length > 0 && (
            <p className="mt-3 flex items-center gap-2 text-xs text-red-700">
              <PackageX className="size-4" /> {out.length} producto(s) agotado(s)
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
