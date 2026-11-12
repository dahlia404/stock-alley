import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatMoney } from "@/lib/hooks";
import type { PackRule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface PackEditorProps {
  packs: PackRule[];
  types: string[];
  currency: string;
  onChange: (packs: PackRule[]) => void;
}

// Per-type pack prices: "3 Llaveros (mezclando diseños) por 8 €".
export default function PackEditor({ packs, types, currency, onChange }: PackEditorProps) {
  const [type, setType] = useState(types[0] ?? "");
  const [qty, setQty] = useState("3");
  const [price, setPrice] = useState("");

  const add = () => {
    const q = Math.floor(Number(qty));
    const p = Number(price.replace(",", "."));
    if (!type) return toast.error("Elige un tipo de producto");
    if (!q || q < 2) return toast.error("Un pack necesita al menos 2 unidades");
    if (!price.trim() || Number.isNaN(p) || p < 0) return toast.error("Precio del pack no válido");
    if (packs.some((x) => x.type === type && x.qty === q)) return toast.error("Ya existe un pack con ese tipo y cantidad");
    onChange([...packs, { id: crypto.randomUUID(), type, qty: q, price: p }]);
    setPrice("");
  };

  const sorted = [...packs].sort((a, b) => a.type.localeCompare(b.type, "es") || a.qty - b.qty);

  return (
    <div className="space-y-4">
      {sorted.length === 0 ? (
        <p className="text-sm text-slate-500" data-testid="packs-empty">Aún no hay packs. Ejemplo: 3 Llaveros por 8 €.</p>
      ) : (
        <ul className="space-y-2" data-testid="packs-list">
          {sorted.map((p) => (
            <li key={p.id} className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 animate-pop-in" data-testid={`pack-item-${p.id}`}>
              <span className="rounded-full bg-pink-100 px-2 py-0.5 text-xs font-semibold text-pink-800">{p.type}</span>
              <span className="flex-1 text-sm font-semibold text-slate-800">
                {p.qty} uds por <span className="font-mono">{formatMoney(p.price, currency)}</span>
              </span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Quitar pack" onClick={() => onChange(packs.filter((x) => x.id !== p.id))} data-testid={`pack-remove-${p.id}`}>
                <Trash2 />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div className="grid gap-3 sm:grid-cols-[1.4fr_0.7fr_0.9fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label>Tipo</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="h-10 w-full" data-testid="pack-type-select">
              <SelectValue>{(v: string) => v || "Elige tipo"}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {types.map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pack-qty">Unidades</Label>
          <Input id="pack-qty" type="number" min={2} value={qty} onChange={(e) => setQty(e.target.value)} className="h-10 font-mono" data-testid="pack-qty-input" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pack-price">Precio pack</Label>
          <Input id="pack-price" inputMode="decimal" placeholder="8" value={price} onChange={(e) => setPrice(e.target.value)} className="h-10 font-mono" data-testid="pack-price-input" />
        </div>
        <Button type="button" variant="secondary" className="h-10" onClick={add} data-testid="pack-add-button">
          <Plus /> Añadir pack
        </Button>
      </div>
      <p className="text-xs text-slate-500">Se pueden mezclar diseños del mismo tipo. En Caja se aplica siempre la combinación más barata para el cliente.</p>
    </div>
  );
}
