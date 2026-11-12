import { useState, type FormEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, Save } from "lucide-react";
import { apiPut } from "@/lib/api";
import { errorMessage, formatMoney, useSettings } from "@/lib/hooks";
import type { AppSettings, CredentialsUpdate, Me } from "@/lib/types";
import Brand from "@/components/Brand";
import ImagePicker from "@/components/ImagePicker";
import TagManager from "@/components/TagManager";
import PackEditor from "@/components/PackEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENCIES: Record<string, string> = {
  EUR: "Euro (€)",
  USD: "Dólar estadounidense ($)",
  GBP: "Libra esterlina (£)",
  MXN: "Peso mexicano ($)",
  ARS: "Peso argentino ($)",
  CLP: "Peso chileno ($)",
  COP: "Peso colombiano ($)",
  PEN: "Sol peruano (S/)",
  JPY: "Yen japonés (¥)",
};

const TIMEZONES = [
  "Europe/Madrid",
  "Atlantic/Canary",
  "Europe/London",
  "America/Mexico_City",
  "America/Bogota",
  "America/Lima",
  "America/Santiago",
  "America/Argentina/Buenos_Aires",
  "America/New_York",
  "Asia/Tokyo",
  "UTC",
];

function Section({ title, desc, children }: { title: string; desc: string; children: ReactNode }) {
  return (
    <section className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[240px_1fr] md:gap-8 sm:p-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{desc}</p>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function SettingsForm({ initial }: { initial: AppSettings }) {
  const qc = useQueryClient();
  const [s, setS] = useState<AppSettings>(initial);
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  const save = useMutation({
    mutationFn: (body: AppSettings) => apiPut<AppSettings>("/settings", body),
    onSuccess: (data) => {
      qc.setQueryData(["settings"], data);
      toast.success("Configuración guardada");
    },
    onError: (e) => toast.error(errorMessage(e)),
  });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!s.store_name.trim()) return toast.error("El nombre del stand es obligatorio");
    if (s.payment_methods.length === 0) return toast.error("Añade al menos un método de pago");
    save.mutate(s);
  };

  const tzOptions = TIMEZONES.includes(s.timezone) ? TIMEZONES : [s.timezone, ...TIMEZONES];
  const curOptions = s.currency in CURRENCIES ? CURRENCIES : { [s.currency]: s.currency, ...CURRENCIES };

  return (
    <form onSubmit={submit} className="space-y-6" data-testid="settings-form">
      <Section title="Identidad del stand" desc="Si subes un logo, se mostrará en lugar del nombre (el nombre queda como texto alternativo del logo).">
        <div className="flex min-h-24 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4" data-testid="settings-brand-preview">
          <Brand storeName={s.store_name || "Mi Stand"} logoUrl={s.logo_url} size="lg" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="store-name">Nombre del stand</Label>
            <Input id="store-name" value={s.store_name} onChange={(e) => set("store_name", e.target.value)} className="h-10" data-testid="settings-store-name-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="event-name">Evento actual (opcional)</Label>
            <Input id="event-name" value={s.event_name} placeholder="Ej. Japan Weekend Madrid" onChange={(e) => set("event_name", e.target.value)} className="h-10" data-testid="settings-event-name-input" />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Logo</Label>
          <ImagePicker value={s.logo_url} onChange={(v) => set("logo_url", v)} testIdPrefix="settings-logo" maxSize={400} mime="image/png" />
        </div>
      </Section>

      <Section title="Moneda y avisos" desc="Moneda de los precios, cuándo avisar de pocas unidades y zona horaria para el cierre del día.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Moneda</Label>
            <Select value={s.currency} onValueChange={(v: string) => set("currency", v)}>
              <SelectTrigger className="h-10 w-full" data-testid="settings-currency-select">
                <SelectValue>{(v: string) => curOptions[v] ?? v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {Object.entries(curOptions).map(([code, label]) => (
                  <SelectItem key={code} value={code}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="font-mono text-xs text-slate-500">Ejemplo: {formatMoney(12.5, s.currency)}</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="threshold">Aviso de pocas unidades (≤)</Label>
            <Input id="threshold" type="number" min={0} value={s.low_stock_threshold} onChange={(e) => set("low_stock_threshold", Math.max(0, Number(e.target.value) || 0))} className="h-10 font-mono" data-testid="settings-threshold-input" />
            <p className="text-xs text-slate-500">Con {s.low_stock_threshold} o menos uds se marcará en ámbar.</p>
          </div>
          <div className="space-y-2">
            <Label>Zona horaria</Label>
            <Select value={s.timezone} onValueChange={(v: string) => set("timezone", v)}>
              <SelectTrigger className="h-10 w-full" data-testid="settings-timezone-select">
                <SelectValue>{(v: string) => v}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tzOptions.map((tz) => (
                  <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Section>

      <Section title="Tipos de producto" desc="Aparecen en los filtros y al crear productos (chapa, print, sticker…).">
        <TagManager values={s.product_types} onChange={(v) => set("product_types", v)} placeholder="Nuevo tipo, ej. Tote bag" testIdPrefix="settings-types" tone="pink" />
      </Section>

      <Section title="Fandoms" desc="Series o temáticas de tus diseños (Dragon Ball, One Piece, Naruto…).">
        <TagManager values={s.fandoms} onChange={(v) => set("fandoms", v)} placeholder="Nuevo fandom, ej. Jujutsu Kaisen" testIdPrefix="settings-fandoms" tone="violet" />
      </Section>

      <Section title="Packs por tipo" desc="Precio especial al comprar varias unidades del mismo tipo, mezclando diseños (ej. 3 llaveros por 8 €). Se aplican en Caja.">
        <PackEditor packs={s.packs} types={s.product_types} currency={s.currency} onChange={(v) => set("packs", v)} />
      </Section>

      <Section title="Métodos de pago" desc="Los que aceptas en el stand. Aparecen en Caja; con «Efectivo» se calcula el cambio.">
        <TagManager values={s.payment_methods} onChange={(v) => set("payment_methods", v)} placeholder="Nuevo método, ej. PayPal" testIdPrefix="settings-payments" tone="emerald" />
      </Section>

      <div className="sticky bottom-4 z-10 flex justify-end">
        <Button type="submit" size="lg" className="h-12 px-6 shadow-lg shadow-indigo-600/30" disabled={save.isPending} data-testid="settings-save-button">
          <Save /> {save.isPending ? "Guardando…" : "Guardar configuración"}
        </Button>
      </div>
    </form>
  );
}

function CredentialsForm() {
  const qc = useQueryClient();
  const [form, setForm] = useState<CredentialsUpdate>({ current_password: "", new_username: "admin", new_password: "" });
  const save = useMutation({
    mutationFn: (body: CredentialsUpdate) => apiPut<Me>("/auth/credentials", body),
    onSuccess: (me) => {
      qc.setQueryData(["me"], me);
      toast.success("Acceso actualizado. Usa los nuevos datos la próxima vez.");
      setForm({ current_password: "", new_username: me.username, new_password: "" });
    },
    onError: (e) => toast.error(errorMessage(e)),
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (form.new_password.length < 4) return toast.error("La nueva contraseña debe tener al menos 4 caracteres");
        save.mutate(form);
      }}
    >
      <Section title="Acceso" desc="Cambia el usuario y la contraseña por defecto (admin / 1234). Recomendado antes de publicar la app.">
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="cur-pass">Contraseña actual</Label>
            <Input id="cur-pass" type="password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} className="h-10" data-testid="credentials-current-password-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-user">Nuevo usuario</Label>
            <Input id="new-user" value={form.new_username} onChange={(e) => setForm({ ...form, new_username: e.target.value })} className="h-10" data-testid="credentials-new-username-input" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pass">Nueva contraseña</Label>
            <Input id="new-pass" type="password" value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} className="h-10" data-testid="credentials-new-password-input" />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="outline" disabled={save.isPending} data-testid="credentials-save-button">
            <KeyRound /> Cambiar acceso
          </Button>
        </div>
      </Section>
    </form>
  );
}

export default function Settings() {
  const { data, isLoading, settings } = useSettings();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Configuración</h1>
        <p className="mt-1 text-sm text-slate-600">Personaliza tu stand: logo, moneda, avisos de stock y listas.</p>
      </div>
      {isLoading ? <p className="text-slate-500">Cargando…</p> : <SettingsForm key={data ? "loaded" : "default"} initial={settings} />}
      <CredentialsForm />
    </div>
  );
}
