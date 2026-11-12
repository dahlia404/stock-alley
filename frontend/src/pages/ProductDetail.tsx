import { useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Minus, PackageMinus, PackagePlus, Save, Trash2, Undo2 } from "lucide-react";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api";
import {
  KIND_LABELS,
  errorMessage,
  formatMoney,
  formatTime,
  invalidateStock,
  stockStatus,
  useSettings,
  useStockChange,
  useUndoMovement,
} from "@/lib/hooks";
import type { AppSettings, Movement, MovementKind, OkResponse, Product, ProductCreate } from "@/lib/types";
import StockBadge from "@/components/StockBadge";
import ProductThumb from "@/components/ProductThumb";
import ImagePicker from "@/components/ImagePicker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NONE = "__none__";

function OptionSelect({ value, options, onChange, placeholder, testId }: { value: string; options: string[]; onChange: (v: string) => void; placeholder: string; testId: string }) {
  const all = value && !options.includes(value) ? [value, ...options] : options;
  return (
    <Select value={value || NONE} onValueChange={(v: string) => onChange(v === NONE ? "" : v)}>
      <SelectTrigger className="h-10 w-full" data-testid={testId}>
        <SelectValue>{(v: string) => (v === NONE ? placeholder : v)}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {all.map((o) => (
          <SelectItem key={o} value={o}>{o}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

interface FormProps {
  initial: ProductCreate;
  isNew: boolean;
  settings: AppSettings;
  saving: boolean;
  onSubmit: (data: ProductCreate) => void;
}

function ProductForm({ initial, isNew, settings, saving, onSubmit }: FormProps) {
  const [form, setForm] = useState<ProductCreate>(initial);
  const [price, setPrice] = useState(String(initial.price));
  const set = <K extends keyof ProductCreate>(k: K, v: ProductCreate[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const p = Number(price.replace(",", "."));
    if (!form.name.trim()) return toast.error("El nombre es obligatorio");
    if (Number.isNaN(p) || p < 0) return toast.error("Precio no válido");
    onSubmit({ ...form, name: form.name.trim(), price: p });
  };

  return (
    <form onSubmit={submit} className="space-y-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6" data-testid="product-form">
      <div className="grid gap-6 sm:grid-cols-[180px_1fr]">
        <div className="space-y-3">
          <ProductThumb src={form.image} alt={form.name || "Producto"} className="aspect-square w-full rounded-2xl border border-slate-200" />
        </div>
        <div className="space-y-2">
          <Label>Foto</Label>
          <ImagePicker value={form.image} onChange={(v) => set("image", v)} testIdPrefix="product-image" />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="p-name">Nombre</Label>
          <Input id="p-name" value={form.name} onChange={(e) => set("name", e.target.value)} className="h-10" placeholder="Ej. Chapa Goku SSJ" data-testid="product-name-input" />
        </div>
        <div className="space-y-2">
          <Label>Tipo</Label>
          <OptionSelect value={form.type} options={settings.product_types} onChange={(v) => set("type", v)} placeholder="Sin tipo" testId="product-type-select" />
        </div>
        <div className="space-y-2">
          <Label>Fandom</Label>
          <OptionSelect value={form.fandom} options={settings.fandoms} onChange={(v) => set("fandom", v)} placeholder="Sin fandom" testId="product-fandom-select" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="p-price">Precio ({settings.currency})</Label>
          <Input id="p-price" inputMode="decimal" value={price} onChange={(e) => setPrice(e.target.value)} className="h-10 font-mono" data-testid="product-price-input" />
        </div>
        {isNew && (
          <div className="space-y-2">
            <Label htmlFor="p-stock">Stock inicial</Label>
            <Input id="p-stock" type="number" min={0} value={form.stock} onChange={(e) => set("stock", Math.max(0, Number(e.target.value) || 0))} className="h-10 font-mono" data-testid="product-initial-stock-input" />
          </div>
        )}
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="p-notes">Notas</Label>
          <Textarea id="p-notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Tamaño, acabado, proveedor…" data-testid="product-notes-input" />
        </div>
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="lg" className="h-11 px-6" disabled={saving} data-testid="product-save-button">
          <Save /> {saving ? "Guardando…" : isNew ? "Crear producto" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function StockPanel({ product, settings }: { product: Product; settings: AppSettings }) {
  const [qty, setQty] = useState("1");
  const [note, setNote] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const stock = useStockChange();
  const st = stockStatus(product.stock, settings.low_stock_threshold);

  const run = (kind: MovementKind) => {
    const n = Math.floor(Number(qty));
    if (!n || n < 1) return toast.error("Indica una cantidad válida");
    const up = unitPrice.trim() ? Number(unitPrice.replace(",", ".")) : null;
    if (up !== null && (Number.isNaN(up) || up < 0)) return toast.error("Precio por unidad no válido");
    stock.mutate(
      { id: product.id, change: { kind, qty: n, note: note.trim(), unit_price: kind === "sale" ? up : null } },
      {
        onSuccess: (r) => {
          toast.success(`${KIND_LABELS[kind]}: ${n} ud(s)`, { description: `Stock actual: ${r.product.stock}` });
          setQty("1");
          setNote("");
          setUnitPrice("");
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  return (
    <div
      className={cn(
        "rounded-2xl border p-5 shadow-sm",
        st === "out" ? "border-red-200 bg-red-50" : st === "low" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white",
      )}
      data-testid="stock-panel"
    >
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Stock actual</p>
      <div className="mt-1 flex items-end justify-between gap-3">
        <span className={cn("font-mono text-6xl font-bold", st === "out" ? "text-red-600" : st === "low" ? "text-amber-600" : "text-slate-900")} data-testid="stock-current-value">
          {product.stock}
        </span>
        <StockBadge stock={product.stock} threshold={settings.low_stock_threshold} testId="stock-status-badge" />
      </div>
      <p className="mt-1 text-sm text-slate-500">
        {product.sold_total} vendidas en total · {formatMoney(product.price, settings.currency)} / ud
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="s-qty">Cantidad</Label>
          <Input id="s-qty" type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} className="h-11 bg-white font-mono text-lg" data-testid="stock-qty-input" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="s-price">Precio venta/ud (opcional)</Label>
          <Input id="s-price" inputMode="decimal" placeholder={String(product.price)} value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} className="h-11 bg-white font-mono" data-testid="stock-unit-price-input" />
        </div>
        <div className="col-span-2 space-y-1.5">
          <Label htmlFor="s-note">Nota (opcional)</Label>
          <Input id="s-note" placeholder="Ej. pack 3x2, regalo, dañado…" value={note} onChange={(e) => setNote(e.target.value)} className="h-10 bg-white" data-testid="stock-note-input" />
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <Button onClick={() => run("sale")} disabled={stock.isPending || product.stock <= 0} className="h-12 bg-emerald-600 text-base font-bold text-white hover:bg-emerald-700" data-testid="stock-sell-button">
          <Minus /> Vender (retirar por venta)
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => run("adjust")} disabled={stock.isPending || product.stock <= 0} className="h-11 bg-white" data-testid="stock-remove-button">
            <PackageMinus /> Retirar (merma)
          </Button>
          <Button variant="outline" onClick={() => run("restock")} disabled={stock.isPending} className="h-11 border-indigo-300 bg-white text-indigo-700 hover:bg-indigo-50" data-testid="stock-add-button">
            <PackagePlus /> Añadir stock
          </Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500">"Vender" suma al registro de ventas. "Retirar" descuenta sin contar como venta (regalos, roturas…).</p>
    </div>
  );
}

function History({ productId, settings }: { productId: string; settings: AppSettings }) {
  const movements = useQuery({ queryKey: ["movements", productId], queryFn: () => apiGet<Movement[]>(`/products/${productId}/movements`) });
  const undo = useUndoMovement();
  const list = movements.isError ? [] : (movements.data ?? []);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="product-history">
      <h3 className="mb-3 text-lg font-bold text-slate-900">Historial de movimientos</h3>
      {list.length === 0 ? (
        <p className="text-sm text-slate-500">Sin movimientos todavía.</p>
      ) : (
        <ul className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {list.map((m) => (
            <li key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 text-sm" data-testid={`history-item-${m.id}`}>
              <span className={cn("font-mono font-bold", m.kind === "restock" ? "text-indigo-600" : m.kind === "sale" ? "text-emerald-600" : "text-slate-600")}>
                {m.kind === "restock" ? "+" : "−"}
                {m.qty}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-slate-800">
                  {KIND_LABELS[m.kind]}
                  {m.kind === "sale" && <span className="ml-1 font-mono text-slate-500">{formatMoney(m.total, settings.currency)}</span>}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {m.date.split("-").reverse().join("/")} {formatTime(m.created_at, settings.timezone)}
                  {m.note && ` · ${m.note}`}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Deshacer movimiento"
                title="Deshacer"
                disabled={undo.isPending}
                onClick={() => undo.mutate(m.id, { onSuccess: () => toast.info("Movimiento deshecho"), onError: (e) => toast.error(errorMessage(e)) })}
                data-testid={`history-undo-${m.id}`}
              >
                <Undo2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function ProductDetail() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { settings } = useSettings();

  const product = useQuery({
    queryKey: ["product", id],
    queryFn: () => apiGet<Product>(`/products/${id}`),
    enabled: !isNew,
  });

  const save = useMutation({
    mutationFn: (data: ProductCreate) => {
      if (isNew) return apiPost<Product>("/products", data);
      const { stock: _stock, ...update } = data;
      return apiPut<Product>(`/products/${id}`, update);
    },
    onSuccess: (p) => {
      invalidateStock(qc);
      toast.success(isNew ? "Producto creado" : "Cambios guardados");
      if (isNew) navigate(`/productos/${p.id}`, { replace: true });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: () => apiDelete<OkResponse>(`/products/${id}`),
    onSuccess: () => {
      invalidateStock(qc);
      toast.success("Producto eliminado");
      navigate("/productos");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const p = product.isError ? undefined : product.data;
  const initial: ProductCreate = p
    ? { name: p.name, type: p.type, fandom: p.fandom, price: p.price, image: p.image, notes: p.notes, stock: p.stock }
    : { name: "", type: settings.product_types[0] ?? "", fandom: "", price: 0, image: null, notes: "", stock: 0 };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link to="/productos" className="mb-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline" data-testid="back-to-products-link">
            <ArrowLeft className="size-4" /> Volver a productos
          </Link>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl" data-testid="product-detail-title">
            {isNew ? "Nuevo producto" : (p?.name ?? "Ficha de producto")}
          </h1>
        </div>
        {!isNew && p && (
          <Dialog>
            <DialogTrigger render={<Button variant="outline" className="text-red-600 hover:bg-red-50 hover:text-red-700" data-testid="product-delete-button" />}>
              <Trash2 /> Eliminar
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>¿Eliminar "{p.name}"?</DialogTitle>
                <DialogDescription>El producto desaparecerá del catálogo. Las ventas ya registradas se conservan en el log.</DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <DialogClose render={<Button variant="outline" data-testid="product-delete-cancel-button" />}>Cancelar</DialogClose>
                <Button variant="destructive" onClick={() => remove.mutate()} disabled={remove.isPending} data-testid="product-delete-confirm-button">
                  Sí, eliminar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!isNew && product.isLoading && <p className="text-slate-500">Cargando…</p>}
      {!isNew && product.isError && (
        <p className="rounded-xl bg-red-50 p-4 text-red-700" data-testid="product-not-found">No se ha podido cargar este producto.</p>
      )}

      {(isNew || p) && (
        <div className={cn("grid gap-6", !isNew && "lg:grid-cols-[1.5fr_1fr]")}>
          <ProductForm key={p?.updated_at ?? "new"} initial={initial} isNew={isNew} settings={settings} saving={save.isPending} onSubmit={(d) => save.mutate(d)} />
          {!isNew && p && (
            <div className="space-y-6">
              <StockPanel product={p} settings={settings} />
              <History productId={p.id} settings={settings} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
