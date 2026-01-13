import { ProductBrief } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProductTableProps {
  products: ProductBrief[];
  onSelectTable: () => void;
}

export function ProductTable({ products, onSelectTable }: ProductTableProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyBrief = (brief: string, index: number) => {
    navigator.clipboard.writeText(brief);
    setCopiedIndex(index);
    toast.success("Brief copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (products.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
        <Package className="w-12 h-12 mb-4 opacity-50" />
        <p className="text-lg font-medium">No products loaded</p>
        <p className="text-sm">Enter SKUs above and click "Fetch Data"</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          Results ({products.length} product{products.length !== 1 ? "s" : ""})
        </h2>
        <Button onClick={onSelectTable} variant="outline" size="sm">
          <Copy className="w-4 h-4 mr-2" />
          Select Table
        </Button>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-card">
        <table id="product-table" className="w-full text-sm">
          <thead>
            <tr className="table-header">
              <th className="data-cell text-left">S/N</th>
              <th className="data-cell text-left">SKU</th>
              <th className="data-cell text-left min-w-[300px]">Name</th>
              <th className="data-cell text-left">Image</th>
              <th className="data-cell text-left">URL</th>
              <th className="data-cell text-left">Old Price</th>
              <th className="data-cell text-left">New Price</th>
              <th className="data-cell text-left min-w-[300px]">Brief</th>
            </tr>
          </thead>
          <tbody>
            {products.map((product, index) => (
              <tr
                key={product.sn}
                className={`border-t border-[hsl(var(--table-border))] hover:bg-muted/50 transition-colors ${
                  index % 2 === 1 ? "table-row-alt" : ""
                }`}
              >
                <td className="data-cell font-medium">{product.sn}</td>
                <td className="data-cell font-mono text-xs">{product.sku}</td>
                <td className="data-cell">{product.name}</td>
                <td className="data-cell">
                  {product.image && (
                    <a
                      href={product.image}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate block max-w-[200px]"
                    >
                      {product.image}
                    </a>
                  )}
                </td>
                <td className="data-cell">
                  {product.url && (
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate max-w-[150px]">Link</span>
                    </a>
                  )}
                </td>
                <td className="data-cell text-muted-foreground">
                  {product.oldPrice || "-"}
                </td>
                <td className="data-cell font-medium">{product.newPrice || "-"}</td>
                <td className="data-cell">
                  <div className="flex items-start gap-2">
                    <pre className="brief-box flex-1 max-w-[280px] max-h-[120px] overflow-auto">
                      {product.brief}
                    </pre>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="shrink-0 h-8 w-8"
                      onClick={() => copyBrief(product.brief, index)}
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-success" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Package({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="m7.5 4.27 9 5.15" />
      <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
      <path d="m3.3 7 8.7 5 8.7-5" />
      <path d="M12 22V12" />
    </svg>
  );
}
