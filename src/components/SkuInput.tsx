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
  const [copiedNewlines, setCopiedNewlines] = useState(false);
  const [copiedComma, setCopiedComma] = useState(false);

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

  const copyNewlines = () => {
    if (!value.trim()) {
      toast.error("No SKUs to copy");
      return;
    }
    navigator.clipboard.writeText(value);
    setCopiedNewlines(true);
    toast.success("SKUs copied!");
    setTimeout(() => setCopiedNewlines(false), 2000);
  };

  const copyCommaSeparated = () => {
    if (!commaSeparated) {
      toast.error("No SKUs to copy");
      return;
    }
    navigator.clipboard.writeText(commaSeparated);
    setCopiedComma(true);
    toast.success("SKUs copied in comma format!");
    setTimeout(() => setCopiedComma(false), 2000);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Newline input */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Enter SKUs (one per line)
            </label>
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {skuCount}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs gap-1.5 hover:bg-muted"
            onClick={copyNewlines}
            disabled={skuCount === 0}
          >
            {copiedNewlines ? (
              <Check className="w-3.5 h-3.5 text-green-500" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            Copy
          </Button>
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
            {copiedComma ? (
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
