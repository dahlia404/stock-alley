import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { toast } from "sonner";
import { Banknote, CheckCircle2, Minus, Plus, Search, ShoppingCart, Sparkles, Trash2, X } from "lucide-react";
import { apiPost } from "@/lib/api";
import { errorMessage, formatMoney, invalidateStock, isCashMethod, packLabel, stockStatus, useProducts, useSettings } from "@/lib/hooks";
import type { CartItem, CheckoutRequest, Product, Quote, Ticket } from "@/lib/types";
import ProductThumb from "@/components/ProductThumb";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const QUICK_CASH = [5, 10, 20, 50];

export default function Checkout() {
  const qc = useQueryClient();
  const { settings } = useSettings();
  const products = useProducts();
  const money = (v: number) => formatMoney(v, settings.currency);

  const [cart, setCart] = useState<Record<string, number>>({});
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const [method, setMethod] = useState("");
  const [cash, setCash] = useState("");
  const [lastTicket, setLastTicket] = useState<Ticket | null>(null);

  const list = useMemo(() => (products.isError ? [] : (products.data ?? [])), [products.isError, products.data]);
  const byId = useMemo(() => new Map(list.map((p) => [p.id, p])), [list]);
  const types = Array.from(new Set(list.map((p) => p.type).filter(Boolean)));
  const filtered = list.filter((p) => {
    const term = q.trim().toLowerCase();
    if (term && !`${p.name} ${p.fandom} ${p.type}`.toLowerCase().includes(term)) return false;
    return type === "all" || p.type === type;
  });

  const items: CartItem[] = Object.entries(cart)
    .filter(([, n]) => n > 0)
    .map(([product_id, qty]) => ({ product_id, qty }));
  const units = items.reduce((s, i) => s + i.qty, 0);

  const quote = useQuery({
    queryKey: ["quote", items],
    queryFn: () => apiPost<Quote>("/checkout/quote", { items }),
    enabled: items.length > 0,
    placeholderData: keepPreviousData,
  });
  const qd = items.length > 0 && !quote.isError ? quote.data : undefined;
  const total = qd?.total ?? 0;

  const payMethod = settings.payment_methods.includes(method) ? method : (settings.payment_methods[0] ?? "");
  const cashMode = isCashMethod(payMethod);
  const received = cash.trim() ? Number(cash.replace(",", ".")) : null;
  const change = cashMode && received !== null && !Number.isNaN(received) ? received - total : null;
  const insufficient = change !== null && change < -0.0001;

  const add = (p: Product, delta: number) =>
    setCart((c) => {
      const next = Math.max(0, Math.min(p.stock, (c[p.id] ?? 0) + delta));
      const copy = { ...c };
      if (next === 0) delete copy[p.id];
      else copy[p.id] = next;
      return copy;
    });

  const pay = useMutation({
    mutationFn: (body: CheckoutRequest) => apiPost<Ticket>("/checkout", body),
    onSuccess: (t) => {
      invalidateStock(qc);
      setLastTicket(t);
      setCart({});
      setCash("");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const charge = () => {
    if (!items.length) return;
    pay.mutate({ items, payment_method: payMethod, cash_received: cashMode && received !== null && !Number.isNaN(received) ? received : null });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Caja rápida</h1>
          <p className="mt-1 text-sm text-slate-600">Toca los productos para añadirlos. Los packs se aplican solos.</p>
        </div>
        {settings.packs.length > 0 && (
          <div className="flex flex-wrap gap-2" data-testid="checkout-pack-hints">
            {settings.packs.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                <Sparkles className="size-3.5" /> {packLabel(p.qty, p.price, p.type, settings.currency)}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
        {/* Catalogue */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar producto o fandom…" className="h-11 bg-white pl-9" data-testid="checkout-search-input" />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {["all", ...types].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                data-testid={`checkout-type-chip-${t === "all" ? "all" : t.toLowerCase().replace(/\s+/g, "-")}`}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors duration-200",
                  type === t ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300",
                )}
              >
                {t === "all" ? "Todos" : t}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" data-testid="checkout-product-grid">
            {filtered.map((p) => {
              const inCart = cart[p.id] ?? 0;
              const st = stockStatus(p.stock, settings.low_stock_threshold);
              const disabled = p.stock <= 0 || inCart >= p.stock;
              return (
                <motion.button
                  key={p.id}
                  type="button"
                  whileTap={disabled ? undefined : { scale: 0.95 }}
                  onClick={() => add(p, 1)}
                  disabled={disabled}
                  data-testid={`checkout-product-${p.id}`}
                  className={cn(
                    "relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-[border-color,box-shadow] duration-200",
                    disabled ? "cursor-not-allowed opacity-50" : "hover:border-indigo-300 hover:shadow-md",
                    inCart > 0 ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-slate-200",
                  )}
                >
                  <ProductThumb src={p.image} alt={p.name} className="aspect-[4/3] w-full" />
                  {inCart > 0 && (
                    <span className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-indigo-600 font-mono text-sm font-bold text-white shadow animate-pop-in" data-testid={`checkout-product-${p.id}-count`}>
                      {inCart}
                    </span>
                  )}
                  <div className="p-2.5">
                    <p className="line-clamp-2 text-sm font-semibold leading-tight text-slate-900">{p.name}</p>
                    <div className="mt-1.5 flex items-center justify-between">
                      <span className="font-mono text-sm font-bold text-slate-800">{money(p.price)}</span>
                      <span className={cn("text-xs font-semibold", st === "out" ? "text-red-600" : st === "low" ? "text-amber-600" : "text-slate-400")}>
                        {p.stock <= 0 ? "Agotado" : `${p.stock - inCart} uds`}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
            {filtered.length === 0 && <p className="col-span-full py-10 text-center text-slate-500">No hay productos.</p>}
          </div>
        </div>

        {/* Cart */}
        <aside id="cart" className="lg:sticky lg:top-24 lg:self-start" data-testid="checkout-cart">
          <div className="rounded-2xl border border-slate-200 bg-white/95 shadow-lg shadow-slate-200/60 backdrop-blur">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                <ShoppingCart className="size-5 text-indigo-600" /> Carrito
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 font-mono text-xs text-indigo-700" data-testid="cart-units-count">{units}</span>
              </h2>
              {units > 0 && (
                <Button variant="ghost" size="sm" onClick={() => setCart({})} data-testid="cart-clear-button">
                  <X /> Vaciar
                </Button>
              )}
            </div>

            <div className="max-h-[38vh] space-y-2 overflow-y-auto px-5 py-3">
              {items.length === 0 && <p className="py-8 text-center text-sm text-slate-500" data-testid="cart-empty">Toca un producto para empezar.</p>}
              <AnimatePresence initial={false}>
                {items.map(({ product_id, qty }) => {
                  const p = byId.get(product_id);
                  if (!p) return null;
                  const line = qd?.lines.find((l) => l.product_id === product_id);
                  const discounted = line && line.total < line.subtotal - 0.001;
                  return (
                    <motion.div
                      key={product_id}
                      layout
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="flex items-center gap-2"
                      data-testid={`cart-line-${product_id}`}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-500">
                          {money(p.price)} / ud
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon-sm" onClick={() => add(p, -1)} aria-label="Quitar una" data-testid={`cart-line-${product_id}-minus`}>
                          <Minus />
                        </Button>
                        <span className="w-6 text-center font-mono text-sm font-bold" data-testid={`cart-line-${product_id}-qty`}>{qty}</span>
                        <Button variant="outline" size="icon-sm" onClick={() => add(p, 1)} disabled={qty >= p.stock} aria-label="Añadir una" data-testid={`cart-line-${product_id}-plus`}>
                          <Plus />
                        </Button>
                      </div>
                      <div className="w-20 text-right">
                        {discounted && <p className="font-mono text-xs text-slate-400 line-through">{money(line.subtotal)}</p>}
                        <p className={cn("font-mono text-sm font-bold", discounted ? "text-emerald-700" : "text-slate-900")}>{money(line?.total ?? p.price * qty)}</p>
                      </div>
                      <Button variant="ghost" size="icon-sm" onClick={() => add(p, -qty)} aria-label="Eliminar" data-testid={`cart-line-${product_id}-remove`}>
                        <Trash2 className="text-slate-400" />
                      </Button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <div className="space-y-4 border-t border-slate-100 px-5 py-4">
              {qd && qd.packs.length > 0 && (
                <div className="space-y-1.5" data-testid="cart-packs-applied">
                  {qd.packs.map((pk) => (
                    <div key={pk.type} className="flex items-center justify-between rounded-lg bg-amber-50 px-3 py-1.5 text-sm text-amber-900">
                      <span className="flex items-center gap-1.5 font-semibold">
                        <Sparkles className="size-4" />
                        {pk.uses.map((u) => `${u.times > 1 ? `${u.times}× ` : ""}pack ${u.qty} ${pk.type}`).join(" + ")}
                      </span>
                      <span className="font-mono font-bold">−{money(pk.saving)}</span>
                    </div>
                  ))}
                </div>
              )}
              {qd && qd.errors.length > 0 && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700" data-testid="cart-errors">{qd.errors[0]}</p>
              )}
              <div className="space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span className="font-mono" data-testid="cart-subtotal">{money(qd?.subtotal ?? 0)}</span>
                </div>
                {(qd?.discount ?? 0) > 0 && (
                  <div className="flex justify-between font-semibold text-emerald-700">
                    <span>Descuento packs</span>
                    <span className="font-mono" data-testid="cart-discount">−{money(qd?.discount ?? 0)}</span>
                  </div>
                )}
                <div className="flex items-end justify-between pt-1">
                  <span className="text-base font-bold text-slate-900">Total</span>
                  <span className="font-mono text-3xl font-bold text-slate-900" data-testid="cart-total">{money(total)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Método de pago</p>
                <div className="grid grid-cols-3 gap-2">
                  {settings.payment_methods.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMethod(m)}
                      aria-pressed={payMethod === m}
                      data-testid={`payment-method-${m.toLowerCase().replace(/\s+/g, "-")}`}
                      className={cn(
                        "truncate rounded-xl border px-2 py-2.5 text-sm font-semibold transition-colors duration-200",
                        payMethod === m ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300",
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {cashMode && (
                <div className="space-y-2 rounded-xl bg-slate-50 p-3" data-testid="cash-panel">
                  <div className="flex items-center gap-2">
                    <Banknote className="size-4 text-emerald-600" />
                    <Input inputMode="decimal" placeholder="Entregado" value={cash} onChange={(e) => setCash(e.target.value)} className="h-10 bg-white font-mono" data-testid="cash-received-input" />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Button variant="outline" size="sm" className="bg-white" onClick={() => setCash(total.toFixed(2))} disabled={!total} data-testid="cash-exact-button">Exacto</Button>
                    {QUICK_CASH.map((b) => (
                      <Button key={b} variant="outline" size="sm" className="bg-white font-mono" onClick={() => setCash(String(b))} data-testid={`cash-quick-${b}`}>
                        {money(b)}
                      </Button>
                    ))}
                  </div>
                  {change !== null && (
                    <div className={cn("flex items-end justify-between rounded-lg px-3 py-2", insufficient ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-800")}>
                      <span className="text-sm font-semibold">{insufficient ? "Falta" : "Cambio"}</span>
                      <span className="font-mono text-2xl font-bold" data-testid="cash-change-value">{money(Math.abs(change))}</span>
                    </div>
                  )}
                </div>
              )}

              <Button
                onClick={charge}
                disabled={!items.length || pay.isPending || insufficient || (qd?.errors.length ?? 0) > 0 || quote.isFetching}
                className="h-14 w-full bg-emerald-600 text-lg font-bold text-white hover:bg-emerald-700"
                data-testid="checkout-charge-button"
              >
                <CheckCircle2 /> {pay.isPending ? "Cobrando…" : `Cobrar ${money(total)}`}
              </Button>
            </div>
          </div>
        </aside>
      </div>

      {units > 0 && (
        <a
          href="#cart"
          className="fixed inset-x-4 bottom-4 z-30 flex items-center justify-between rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white shadow-xl lg:hidden"
          data-testid="checkout-mobile-cart-bar"
        >
          <span className="flex items-center gap-2"><ShoppingCart className="size-5" /> {units} uds</span>
          <span className="font-mono text-lg">{money(total)}</span>
        </a>
      )}

      <Dialog open={!!lastTicket} onOpenChange={(o) => !o && setLastTicket(null)}>
        <DialogContent data-testid="checkout-success-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-emerald-700">
              <CheckCircle2 className="size-6" /> Venta cobrada
            </DialogTitle>
            <DialogDescription>
              {lastTicket?.payment_method} · {lastTicket?.lines.reduce((s, l) => s + l.qty, 0)} uds
            </DialogDescription>
          </DialogHeader>
          {lastTicket && (
            <div className="space-y-3">
              <div className="flex items-end justify-between">
                <span className="text-slate-600">Total</span>
                <span className="font-mono text-2xl font-bold" data-testid="success-total">{money(lastTicket.total)}</span>
              </div>
              {lastTicket.discount > 0 && (
                <p className="text-sm font-semibold text-emerald-700">Ahorro por packs: {money(lastTicket.discount)}</p>
              )}
              {lastTicket.change !== null && (
                <div className="rounded-xl bg-emerald-100 px-4 py-3 text-emerald-900">
                  <p className="text-sm font-semibold">Entregado {money(lastTicket.cash_received ?? 0)} · Cambio a devolver</p>
                  <p className="font-mono text-4xl font-bold" data-testid="success-change">{money(lastTicket.change)}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Link to="/ventas" className="text-sm font-semibold text-indigo-600 hover:underline" data-testid="success-view-sales-link">Ver registro</Link>
            <Button onClick={() => setLastTicket(null)} data-testid="success-new-sale-button">Nueva venta</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
