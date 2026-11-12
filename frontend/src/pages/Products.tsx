import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { toast } from "sonner";
import { AlertTriangle, ChevronRight, Minus, Plus, Search, X } from "lucide-react";
import { errorMessage, formatMoney, stockStatus, useProducts, useSettings, useStockChange, useUndoMovement, type StockStatus } from "@/lib/hooks";
import type { Product } from "@/lib/types";
import StockBadge from "@/components/StockBadge";
import ProductThumb from "@/components/ProductThumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

type StatusFilter = "all" | StockStatus | "alert";
type SortKey = "name" | "stock_asc" | "stock_desc" | "price_asc" | "price_desc" | "sold";

const STATUS_CHIPS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "ok", label: "En stock" },
  { value: "alert", label: "Avisos (pocas + sin stock)" },
  { value: "low", label: "Pocas unidades" },
  { value: "out", label: "Sin stock" },
];

const SORT_LABELS: Record<SortKey, string> = {
  name: "Nombre (A-Z)",
  stock_asc: "Menos stock primero",
  stock_desc: "Más stock primero",
  price_asc: "Precio: menor a mayor",
  price_desc: "Precio: mayor a menor",
  sold: "Más vendidos",
};

function union(base: string[], extra: string[]): string[] {
  return Array.from(new Set([...base, ...extra.filter(Boolean)]));
}

export default function Products() {
  const { settings } = useSettings();
  const products = useProducts();
  const stock = useStockChange();
  const undo = useUndoMovement();

  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [fandom, setFandom] = useState("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [sort, setSort] = useState<SortKey>("name");

  const list = useMemo(() => (products.isError ? [] : (products.data ?? [])), [products.isError, products.data]);
  const t = settings.low_stock_threshold;
  const types = union(settings.product_types, list.map((p) => p.type));
  const fandoms = union(settings.fandoms, list.map((p) => p.fandom));

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    const res = list.filter((p) => {
      const st = stockStatus(p.stock, t);
      if (term && !`${p.name} ${p.type} ${p.fandom} ${p.notes}`.toLowerCase().includes(term)) return false;
      if (type !== "all" && p.type !== type) return false;
      if (fandom !== "all" && p.fandom !== fandom) return false;
      if (status === "alert") return st !== "ok";
      if (status !== "all" && st !== status) return false;
      return true;
    });
    const cmp: Record<SortKey, (a: Product, b: Product) => number> = {
      name: (a, b) => a.name.localeCompare(b.name, "es"),
      stock_asc: (a, b) => a.stock - b.stock,
      stock_desc: (a, b) => b.stock - a.stock,
      price_asc: (a, b) => a.price - b.price,
      price_desc: (a, b) => b.price - a.price,
      sold: (a, b) => b.sold_total - a.sold_total,
    };
    return [...res].sort(cmp[sort]);
  }, [list, q, type, fandom, status, sort, t]);

  const counts = {
    out: list.filter((p) => p.stock <= 0).length,
    low: list.filter((p) => stockStatus(p.stock, t) === "low").length,
  };
  const hasFilters = q || type !== "all" || fandom !== "all" || status !== "all";

  const sellOne = (p: Product) => {
    stock.mutate(
      { id: p.id, change: { kind: "sale", qty: 1 } },
      {
        onSuccess: (r) =>
          toast.success(`Vendido 1 × ${p.name}`, {
            description: `${formatMoney(r.movement.total, settings.currency)} · quedan ${r.product.stock}`,
            action: {
              label: "Deshacer",
              onClick: () =>
                undo.mutate(r.movement.id, {
                  onSuccess: () => toast.info("Venta deshecha"),
                  onError: (e) => toast.error(errorMessage(e)),
                }),
            },
          }),
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Productos</h1>
          <p className="mt-1 text-sm text-slate-600">
            {list.length} productos ·{" "}
            <span className="font-semibold text-red-600" data-testid="products-out-count">{counts.out} sin stock</span> ·{" "}
            <span className="font-semibold text-amber-600" data-testid="products-low-count">{counts.low} con pocas unidades</span>
          </p>
        </div>
        <Link to="/productos/nuevo" className={cn(buttonVariants({ size: "lg" }), "h-11 px-5")} data-testid="new-product-button">
          <Plus /> Nuevo producto
        </Link>
      </div>

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1.6fr_1fr_1fr_1fr]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, fandom, notas…" className="h-10 pl-9" data-testid="products-search-input" />
          </div>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 w-full" data-testid="filter-type-select">
              <SelectValue>{(v: string) => (v === "all" ? "Todos los tipos" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              {types.map((x) => (
                <SelectItem key={x} value={x}>{x}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={fandom} onValueChange={setFandom}>
            <SelectTrigger className="h-10 w-full" data-testid="filter-fandom-select">
              <SelectValue>{(v: string) => (v === "all" ? "Todos los fandoms" : v)}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los fandoms</SelectItem>
              {fandoms.map((x) => (
                <SelectItem key={x} value={x}>{x}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sort} onValueChange={(v: string) => setSort(v as SortKey)}>
            <SelectTrigger className="h-10 w-full" data-testid="sort-select">
              <SelectValue>{(v: string) => SORT_LABELS[v as SortKey]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
                <SelectItem key={k} value={k}>{SORT_LABELS[k]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_CHIPS.map((c) => (
            <button
              key={c.value}
              type="button"
              aria-pressed={status === c.value}
              onClick={() => setStatus(c.value)}
              data-testid={`filter-status-${c.value}`}
              className={cn(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200",
                status === c.value ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700",
              )}
            >
              {c.label}
            </button>
          ))}
          {hasFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setQ("");
                setType("all");
                setFandom("all");
                setStatus("all");
              }}
              data-testid="filters-clear-button"
            >
              <X /> Limpiar filtros
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2.5" data-testid="products-list">
        {products.isLoading && <p className="py-10 text-center text-slate-500">Cargando productos…</p>}
        {!products.isLoading && filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 py-14 text-center" data-testid="products-empty-state">
            <p className="text-lg font-semibold text-slate-700">No hay productos que coincidan</p>
            <p className="mt-1 text-sm text-slate-500">Prueba con otros filtros o crea un producto nuevo.</p>
          </div>
        )}
        {filtered.map((p, i) => {
          const st = stockStatus(p.stock, t);
          const pending = stock.isPending && stock.variables?.id === p.id;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.02, 0.3) }}
              data-testid={`product-row-${p.id}`}
              data-stock-status={st}
              className={cn(
                "flex items-center gap-3 rounded-2xl border p-3 shadow-sm transition-colors duration-200 sm:gap-4",
                st === "out" && "border-red-200 bg-red-50/80 border-l-4 border-l-red-500",
                st === "low" && "border-amber-200 bg-amber-50/80 border-l-4 border-l-amber-500",
                st === "ok" && "border-slate-200 bg-white hover:border-indigo-200",
              )}
            >
              <Link to={`/productos/${p.id}`} className="shrink-0" data-testid={`product-row-${p.id}-image-link`}>
                <ProductThumb src={p.image} alt={p.name} className="size-14 rounded-xl sm:size-16" />
              </Link>
              <div className="min-w-0 flex-1">
                <Link
                  to={`/productos/${p.id}`}
                  data-testid={`product-row-${p.id}-name`}
                  className={cn("block truncate font-heading text-base font-bold hover:underline sm:text-lg", st === "out" ? "text-red-900 line-through decoration-red-400" : "text-slate-900")}
                >
                  {p.name}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {p.type && <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-800">{p.type}</span>}
                  {p.fandom && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">{p.fandom}</span>}
                  <span className="sm:hidden"><StockBadge stock={p.stock} threshold={t} /></span>
                </div>
              </div>
              <div className="hidden w-24 text-right font-mono text-base font-semibold text-slate-800 md:block" data-testid={`product-row-${p.id}-price`}>
                {formatMoney(p.price, settings.currency)}
              </div>
              <div className="hidden w-36 flex-col items-end gap-1 sm:flex">
                <span className={cn("flex items-center gap-1 font-mono text-2xl font-bold", st === "out" ? "text-red-600" : st === "low" ? "text-amber-600" : "text-slate-900")} data-testid={`product-row-${p.id}-stock`}>
                  {st === "low" && <AlertTriangle className="size-4 animate-soft-pulse" />}
                  {p.stock}
                  <span className="text-xs font-medium text-slate-400">uds</span>
                </span>
                <StockBadge stock={p.stock} threshold={t} testId={`product-row-${p.id}-status-badge`} />
              </div>
              <span className="font-mono text-lg font-bold sm:hidden" data-testid={`product-row-${p.id}-stock-mobile`}>{p.stock}</span>
              <motion.div whileTap={{ scale: 0.92 }}>
                <Button
                  onClick={() => sellOne(p)}
                  disabled={p.stock <= 0 || pending}
                  className="h-12 min-w-[84px] bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700 disabled:bg-slate-300"
                  data-testid={`product-row-${p.id}-quick-sale`}
                  aria-label={`Vender una unidad de ${p.name}`}
                >
                  <Minus className="size-4" /> 1
                </Button>
              </motion.div>
              <Link to={`/productos/${p.id}`} aria-label="Ver ficha" className="hidden rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600 md:block" data-testid={`product-row-${p.id}-detail-link`}>
                <ChevronRight className="size-5" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
