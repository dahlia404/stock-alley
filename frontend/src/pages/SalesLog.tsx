import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { addDays, format, parseISO } from "date-fns";
import { toast } from "sonner";
import { CalendarDays, ChevronLeft, ChevronRight, Coins, Download, PackageMinus, PackagePlus, ReceiptText, Undo2 } from "lucide-react";
import { apiGet } from "@/lib/api";
import { KIND_LABELS, errorMessage, formatDateLong, formatMoney, formatTime, useSettings, useUndoMovement } from "@/lib/hooks";
import type { Movement, SalesDay } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

function shift(date: string, days: number) {
  return format(addDays(parseISO(date), days), "yyyy-MM-dd");
}

function csvCell(v: string | number) {
  const s = String(v);
  return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function SalesLog() {
  const { settings } = useSettings();
  const [date, setDate] = useState<string | undefined>(undefined);
  const sales = useQuery({
    queryKey: ["sales", date ?? "today"],
    queryFn: () => apiGet<SalesDay>(date ? `/sales?date=${date}` : "/sales"),
  });
  const undo = useUndoMovement();
  const data = sales.isError ? undefined : sales.data;
  const money = (v: number) => formatMoney(v, settings.currency);

  const exportCsv = () => {
    if (!data) return;
    const rows: (string | number)[][] = [["Fecha", "Hora", "Tipo", "Producto", "Tipo producto", "Fandom", "Cantidad", "Precio ud", "Total", "Nota"]];
    for (const m of [...data.movements].reverse()) {
      rows.push([m.date, formatTime(m.created_at, settings.timezone), KIND_LABELS[m.kind], m.product_name, m.product_type, m.product_fandom, m.qty, m.unit_price.toFixed(2), m.total.toFixed(2), m.note]);
    }
    const csv = "\ufeff" + rows.map((r) => r.map(csvCell).join(";")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `ventas-${data.date}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const undoMovement = (m: Movement) =>
    undo.mutate(m.id, { onSuccess: () => toast.info(`${KIND_LABELS[m.kind]} anulada`), onError: (e) => toast.error(errorMessage(e)) });

  const isToday = data ? data.date === data.today : true;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900">Registro de ventas</h1>
          <p className="mt-1 text-sm text-slate-600 first-letter:uppercase" data-testid="sales-date-label">
            {data ? `${formatDateLong(data.date)}${isToday ? " · hoy" : ""}` : "Hoy"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" disabled={!data} onClick={() => data && setDate(shift(data.date, -1))} aria-label="Día anterior" data-testid="sales-prev-day-button">
            <ChevronLeft />
          </Button>
          <div className="relative">
            <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input type="date" value={data?.date ?? ""} max={data?.today} onChange={(e) => e.target.value && setDate(e.target.value)} className="h-9 w-44 pl-9" data-testid="sales-date-input" />
          </div>
          <Button variant="outline" size="icon" disabled={!data || isToday} onClick={() => data && setDate(shift(data.date, 1))} aria-label="Día siguiente" data-testid="sales-next-day-button">
            <ChevronRight />
          </Button>
          {!isToday && (
            <Button variant="ghost" onClick={() => setDate(undefined)} data-testid="sales-today-button">Hoy</Button>
          )}
          <Button variant="secondary" onClick={exportCsv} disabled={!data || data.movements.length === 0} data-testid="sales-export-csv-button">
            <Download /> CSV
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Unidades vendidas", value: String(data?.total_units ?? 0), icon: ReceiptText, cls: "text-emerald-600", testid: "sales-total-units" },
          { label: "Ingresos", value: money(data?.total_revenue ?? 0), icon: Coins, cls: "text-indigo-600", testid: "sales-total-revenue" },
          { label: "Entradas de stock", value: String(data?.restock_units ?? 0), icon: PackagePlus, cls: "text-sky-600", testid: "sales-restock-units" },
          { label: "Retiradas / merma", value: String(data?.adjust_units ?? 0), icon: PackageMinus, cls: "text-slate-600", testid: "sales-adjust-units" },
        ].map(({ label, value, icon: Icon, cls, testid }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <Icon className={cn("size-4", cls)} /> {label}
            </div>
            <div className="mt-2 font-mono text-3xl font-bold text-slate-900" data-testid={testid}>{value}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="products">
        <TabsList>
          <TabsTrigger value="products" data-testid="sales-tab-products">Por producto</TabsTrigger>
          <TabsTrigger value="movements" data-testid="sales-tab-movements">Todos los movimientos</TabsTrigger>
        </TabsList>

        <TabsContent value="products" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            {!data || data.items.length === 0 ? (
              <p className="py-14 text-center text-slate-500" data-testid="sales-empty-state">
                {sales.isLoading ? "Cargando…" : "No hay ventas registradas este día."}
              </p>
            ) : (
              <Table data-testid="sales-products-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="hidden sm:table-cell">Tipo · Fandom</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right">Importe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.items.map((it) => (
                    <TableRow key={it.product_id} data-testid={`sales-item-${it.product_id}`}>
                      <TableCell className="font-semibold">
                        <Link to={`/productos/${it.product_id}`} className="hover:text-indigo-600 hover:underline">{it.product_name}</Link>
                      </TableCell>
                      <TableCell className="hidden text-slate-500 sm:table-cell">{[it.product_type, it.product_fandom].filter(Boolean).join(" · ")}</TableCell>
                      <TableCell className="text-right font-mono text-lg font-bold" data-testid={`sales-item-${it.product_id}-qty`}>{it.qty}</TableCell>
                      <TableCell className="text-right font-mono">{money(it.revenue)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-slate-50 font-bold">
                    <TableCell>Total</TableCell>
                    <TableCell className="hidden sm:table-cell" />
                    <TableCell className="text-right font-mono text-lg">{data.total_units}</TableCell>
                    <TableCell className="text-right font-mono">{money(data.total_revenue)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>

        <TabsContent value="movements" className="mt-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            {!data || data.movements.length === 0 ? (
              <p className="py-10 text-center text-slate-500">Sin movimientos este día.</p>
            ) : (
              <ol className="relative space-y-3 border-l-2 border-indigo-100 pl-5" data-testid="sales-movements-list">
                {data.movements.map((m) => (
                  <li key={m.id} className="relative" data-testid={`movement-item-${m.id}`}>
                    <span className={cn("absolute -left-[27px] top-3 size-3 rounded-full ring-4 ring-white", m.kind === "sale" ? "bg-emerald-500" : m.kind === "restock" ? "bg-indigo-500" : "bg-slate-400")} />
                    <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
                      <span className="w-12 font-mono text-sm text-slate-500">{formatTime(m.created_at, settings.timezone)}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-800">
                          {m.kind === "restock" ? "+" : "−"}{m.qty} × {m.product_name}
                        </p>
                        <p className="truncate text-xs text-slate-500">
                          {KIND_LABELS[m.kind]}
                          {m.kind === "sale" && ` · ${money(m.total)}`}
                          {m.note && ` · ${m.note}`}
                        </p>
                      </div>
                      <Button variant="ghost" size="sm" disabled={undo.isPending} onClick={() => undoMovement(m)} data-testid={`movement-undo-${m.id}`}>
                        <Undo2 /> Anular
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
