import { cn } from "@/lib/utils";

interface BrandProps {
  storeName: string;
  logoUrl: string | null;
  className?: string;
  size?: "sm" | "lg";
}

// Logo if configured (store name becomes its alt text, no visible text); otherwise the written name.
export default function Brand({ storeName, logoUrl, className, size = "sm" }: BrandProps) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={storeName}
        data-testid="brand-logo-image"
        className={cn("w-auto object-contain", size === "lg" ? "h-20 max-w-[260px]" : "h-10 max-w-[180px]", className)}
      />
    );
  }
  return (
    <span
      data-testid="brand-store-name"
      className={cn(
        "font-heading font-extrabold tracking-tight bg-gradient-to-r from-indigo-600 to-pink-500 bg-clip-text text-transparent",
        size === "lg" ? "text-4xl" : "text-xl",
        className,
      )}
    >
      {storeName}
    </span>
  );
}
