import { useRef, useState } from "react";
import { Link2, Trash2, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fileToDataUrl } from "@/lib/image";

interface ImagePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  testIdPrefix: string;
  maxSize?: number;
  mime?: string;
}

// Upload from device (downsized, stored as data URL) or paste a public image URL.
export default function ImagePicker({ value, onChange, testIdPrefix, maxSize = 600, mime = "image/jpeg" }: ImagePickerProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [url, setUrl] = useState("");

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      onChange(await fileToDataUrl(file, maxSize, mime));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cargar la imagen");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        data-testid={`${testIdPrefix}-file-input`}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} data-testid={`${testIdPrefix}-upload-button`}>
          <Upload /> Subir imagen
        </Button>
        {value && (
          <Button type="button" variant="ghost" className="text-red-600 hover:text-red-700" onClick={() => onChange(null)} data-testid={`${testIdPrefix}-remove-button`}>
            <Trash2 /> Quitar
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        <Input
          placeholder="…o pega la URL de una imagen"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          data-testid={`${testIdPrefix}-url-input`}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={!/^https?:\/\//.test(url.trim())}
          onClick={() => {
            onChange(url.trim());
            setUrl("");
          }}
          data-testid={`${testIdPrefix}-url-apply-button`}
        >
          <Link2 /> Usar
        </Button>
      </div>
    </div>
  );
}
