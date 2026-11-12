import { ImageOff } from "lucide-react";
import { cn } from "@/lib/utils";

export default function ProductThumb({
  src,
  alt,
  className,
}: {
  src: string | null;
  alt: string;
  className?: string;
}) {
  if (src) {
    return <img src={src} alt={alt} loading="lazy" className={cn("object-cover bg-slate-100", className)} />;
  }
  return (
    <div className={cn("flex items-center justify-center bg-gradient-to-br from-indigo-50 to-pink-50 text-indigo-300", className)}>
      <ImageOff className="size-1/3" />
    </div>
  );
}
