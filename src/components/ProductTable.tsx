import { ProductBrief } from "@/types/product";
import { Button } from "@/components/ui/button";
import { Copy, Check, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProductTableProps {
  products: ProductBrief[];
  sortOrder?: string;
  onSortChange?: (sort: string) => void;
}

export function ProductTable({ products, sortOrder = "default", onSortChange }: ProductTableProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [copiedLinkIndex, setCopiedLinkIndex] = useState<number | null>(null);

  const selectAllBriefs = () => {
    const allBriefs = products.map((p) => p.brief).join("\n\n");
    navigator.clipboard.writeText(allBriefs);
    toast.success("All briefs copied to clipboard!");
  };

  const selectAllRows = () => {
    // Create header row
    const headers = ["S/N", "SKU", "Name", "Image", "URL", "Old Price", "New Price"];
    
    // Create data rows
    const rows = products.map((p) => [
      p.sn,
      p.sku,
      p.name,
      p.image,
      p.url,
      p.oldPrice || "",
      p.newPrice || ""
    ].join("\t")); // Join columns with tabs

    const content = [headers.join("\t"), ...rows].join("\n");
    navigator.clipboard.writeText(content);
    toast.success("All rows copied to clipboard (Tab-separated)!");
  };

  const copyBrief = (brief: string, index: number) => {
    navigator.clipboard.writeText(brief);
    setCopiedIndex(index);
    toast.success("Brief copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const copyUrl = (url: string, index: number) => {
    navigator.clipboard.writeText(url);
    setCopiedLinkIndex(index);
    toast.success("Product URL copied!");
    setTimeout(() => setCopiedLinkIndex(null), 2000);
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">
          Results ({products.length} product{products.length !== 1 ? "s" : ""})
        </h2>
        <div className="flex items-center gap-2 flex-wrap">
          {onSortChange && (
            <div className="flex items-center gap-1.5 text-sm bg-background border rounded-md px-2.5 py-1.5 shadow-sm">
              <ArrowUpDown className="w-4 h-4 text-orange-600" />
              <span className="text-xs font-medium text-muted-foreground hidden sm:inline">Sort:</span>
              <select
                value={sortOrder}
                onChange={(e) => onSortChange(e.target.value)}
                className="bg-transparent text-xs font-semibold focus:outline-none cursor-pointer text-foreground"
              >
                <option value="default">Default Order</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating-desc">Highest Rated</option>
                <option value="discount-desc">Biggest Discount</option>
              </select>
            </div>
          )}
          <Button onClick={selectAllRows} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Select Rows
          </Button>
          <Button onClick={selectAllBriefs} variant="outline" size="sm">
            <Copy className="w-4 h-4 mr-2" />
            Select Briefs
          </Button>
        </div>
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
              <th
                className="data-cell text-left cursor-pointer hover:bg-muted/80 select-none group transition-colors"
                onClick={() => {
                  if (onSortChange) {
                    onSortChange(sortOrder === "price-asc" ? "price-desc" : "price-asc");
                  }
                }}
                title="Click to sort by Price Low to High / High to Low"
              >
                <div className="flex items-center gap-1">
                  <span>New Price</span>
                  {sortOrder === "price-asc" ? (
                    <ArrowUp className="w-3.5 h-3.5 text-orange-600" />
                  ) : sortOrder === "price-desc" ? (
                    <ArrowDown className="w-3.5 h-3.5 text-orange-600" />
                  ) : (
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  )}
                </div>
              </th>
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
                    <div className="flex items-center gap-2">
                      <a
                        href={product.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span className="truncate max-w-[100px]">Link</span>
                      </a>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => copyUrl(product.url, index)}
                      >
                        {copiedLinkIndex === index ? (
                          <Check className="w-3 h-3 text-success" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </Button>
                    </div>
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
