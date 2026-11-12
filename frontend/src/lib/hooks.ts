import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { AppSettings, Product, StockChange, StockChangeResult, MovementKind } from "@/lib/types";

export const DEFAULT_SETTINGS: AppSettings = {
  store_name: "Mi Stand",
  event_name: "",
  logo_url: null,
  currency: "EUR",
  low_stock_threshold: 3,
  timezone: "Europe/Madrid",
  product_types: ["Chapa", "Print A4", "Print A5", "Sticker", "Stand acrílico", "Llavero", "Marcapáginas"],
  fandoms: ["Dragon Ball", "One Piece", "Naruto", "Genshin Impact", "Studio Ghibli", "Spy x Family", "Original"],
  payment_methods: ["Efectivo", "Tarjeta", "Bizum"],
  packs: [],
};

export function isCashMethod(method: string): boolean {
  return /efectivo|cash|met[aá]lico/i.test(method);
}

export function packLabel(qty: number, price: number, type: string, currency: string): string {
  return `${qty} × ${type} por ${formatMoney(price, currency)}`;
}

export function useSettings() {
  const q = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiGet<AppSettings>("/settings"),
    staleTime: 60_000,
  });
  return { ...q, settings: q.data ?? DEFAULT_SETTINGS };
}

export function useProducts() {
  return useQuery({ queryKey: ["products"], queryFn: () => apiGet<Product[]>("/products") });
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}

export function formatTime(iso: string, timeZone: string): string {
  try {
    return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", timeZone });
  } catch {
    return new Date(iso).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
  }
}

export function formatDateLong(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export type StockStatus = "out" | "low" | "ok";

export function stockStatus(stock: number, threshold: number): StockStatus {
  if (stock <= 0) return "out";
  if (stock <= threshold) return "low";
  return "ok";
}

export const KIND_LABELS: Record<MovementKind, string> = {
  sale: "Venta",
  restock: "Entrada de stock",
  adjust: "Retirada / merma",
};

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const body = err.body as { detail?: unknown } | null;
    const detail = body?.detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail) && detail.length) {
      const first = detail[0] as { msg?: string; loc?: unknown[] };
      return `Dato no válido${first.loc ? ` (${String(first.loc[first.loc.length - 1])})` : ""}: ${first.msg ?? ""}`;
    }
    if (err.status === 401) return "Sesión caducada, vuelve a entrar";
    return `Error del servidor (${err.status})`;
  }
  return "No se pudo conectar con el servidor";
}

export function invalidateStock(qc: QueryClient) {
  for (const key of ["products", "product", "sales", "movements", "quote"]) {
    void qc.invalidateQueries({ queryKey: [key] });
  }
}

export function useStockChange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, change }: { id: string; change: StockChange }) =>
      apiPost<StockChangeResult>(`/products/${id}/stock`, change),
    onSuccess: () => invalidateStock(qc),
  });
}

export function useUndoMovement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (movementId: string) => apiPost<StockChangeResult>(`/movements/${movementId}/undo`),
    onSuccess: () => invalidateStock(qc),
  });
}
