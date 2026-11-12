import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { stockStatus } from "@/lib/hooks";
import { cn } from "@/lib/utils";

interface StockBadgeProps {
  stock: number;
  threshold: number;
  testId?: string;
}

export default function StockBadge({ stock, threshold, testId }: StockBadgeProps) {
  const status = stockStatus(stock, threshold);
  const base = "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap";
  if (status === "out") {
    return (
      <span data-testid={testId} className={cn(base, "bg-red-100 text-red-800")}>
        <XCircle className="size-3.5" /> Sin stock
      </span>
    );
  }
  if (status === "low") {
    return (
      <span data-testid={testId} className={cn(base, "bg-amber-100 text-amber-800")}>
        <AlertTriangle className="size-3.5 animate-soft-pulse" />
        {stock === 1 ? "Última unidad" : `Últimas ${stock} uds`}
      </span>
    );
  }
  return (
    <span data-testid={testId} className={cn(base, "bg-emerald-50 text-emerald-700")}>
      <CheckCircle2 className="size-3.5" /> En stock
    </span>
  );
}
