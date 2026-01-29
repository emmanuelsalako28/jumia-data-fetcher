import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Package, Copy, Check } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface SkuInputProps {
  value: string;
  onChange: (value: string) => void;
}

export function SkuInput({ value, onChange }: SkuInputProps) {
  const [copied, setCopied] = useState(false);
  
  const skuCount = value
    .split("\n")
    .filter((sku) => sku.trim().length > 0).length;

  // Convert newline-separated to comma-separated
  const commaSeparated = value
    .split("\n")
    .map((sku) => sku.trim())
    .filter((sku) => sku.length > 0)
    .join(",");

  // Handle comma input change - convert to newlines
  const handleCommaInputChange = (commaValue: string) => {
    const newlineValue = commaValue
      .split(",")
      .map((sku) => sku.trim())
      .join("\n");
    onChange(newlineValue);
  };

  const copyCommaSeparated = () => {
    if (!commaSeparated) {
      toast.error("No SKUs to copy");
      return;
    }
    navigator.clipboard.writeText(commaSeparated);
    setCopied(true);
    toast.success("SKUs copied in comma format!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Newline input */}
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
          className="min-h-[120px] font-mono text-sm bg-card resize-y"
        />
      </div>

      {/* Comma-separated input/output */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-foreground">
            Comma-separated format
          </label>
          <Button
            variant="outline"
            size="sm"
            onClick={copyCommaSeparated}
            disabled={!commaSeparated}
          >
            {copied ? (
              <Check className="w-4 h-4 mr-1 text-green-500" />
            ) : (
              <Copy className="w-4 h-4 mr-1" />
            )}
            Copy
          </Button>
        </div>
        <Textarea
          value={commaSeparated}
          onChange={(e) => handleCommaInputChange(e.target.value)}
          placeholder="AE140HA7KQHIMNAFAMZ,AE140HA6XIKXANAFAMZ,..."
          className="min-h-[80px] font-mono text-xs bg-card resize-y"
        />
      </div>
    </div>
  );
}
