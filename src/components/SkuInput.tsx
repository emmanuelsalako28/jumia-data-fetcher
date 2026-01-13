import { Textarea } from "@/components/ui/textarea";
import { Package } from "lucide-react";

interface SkuInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SkuInput({ value, onChange }: SkuInputProps) {
  const skuCount = value
    .split("\n")
    .filter((sku) => sku.trim().length > 0).length;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-foreground flex items-center gap-2">
          <Package className="w-4 h-4" />
          Enter SKUs (one per line)
        </label>
        <span className="text-xs text-muted-foreground">
          {skuCount} SKU{skuCount !== 1 ? "s" : ""}
        </span>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="OR537EA7MRK&#10;SI905HA7R716&#10;..."
        className="min-h-[150px] font-mono text-sm bg-card resize-y"
      />
    </div>
  );
}
