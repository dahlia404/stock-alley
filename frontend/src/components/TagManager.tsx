import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface TagManagerProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder: string;
  testIdPrefix: string;
  tone: "pink" | "violet" | "emerald";
}

export default function TagManager({ values, onChange, placeholder, testIdPrefix, tone }: TagManagerProps) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (!values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
  };
  const toneCls = { pink: "bg-pink-100 text-pink-800", violet: "bg-violet-100 text-violet-800", emerald: "bg-emerald-100 text-emerald-800" }[tone];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" data-testid={`${testIdPrefix}-list`}>
        {values.length === 0 && <p className="text-sm text-muted-foreground">Aún no hay ninguno.</p>}
        {values.map((v) => (
          <span key={v} className={`inline-flex items-center gap-1 rounded-full py-1 pl-3 pr-1 text-sm font-medium animate-pop-in ${toneCls}`}>
            {v}
            <button
              type="button"
              aria-label={`Quitar ${v}`}
              onClick={() => onChange(values.filter((x) => x !== v))}
              className="rounded-full p-0.5 transition-colors hover:bg-black/10"
              data-testid={`${testIdPrefix}-remove-${v.toLowerCase().replace(/\s+/g, "-")}`}
            >
              <X className="size-3.5" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft}
          placeholder={placeholder}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          data-testid={`${testIdPrefix}-input`}
        />
        <Button type="button" variant="secondary" onClick={add} data-testid={`${testIdPrefix}-add-button`}>
          <Plus /> Añadir
        </Button>
      </div>
    </div>
  );
}
