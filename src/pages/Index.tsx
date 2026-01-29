import { useState } from "react";
import { CountrySelector } from "@/components/CountrySelector";
import { SkuInput } from "@/components/SkuInput";
import { ProductTable } from "@/components/ProductTable";
import { ProductBrief } from "@/types/product";
import { generateBrief, downloadCSV, fetchProductByUrl, fetchProductData } from "@/utils/productFetcher";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle, FileSpreadsheet, Link as LinkIcon, Copy } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProductCard } from "@/components/ProductCard";
import { Textarea } from "@/components/ui/textarea";

const Index = () => {
  const [country, setCountry] = useState(".com.ng");
  const [skuInput, setSkuInput] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [products, setProducts] = useState<ProductBrief[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleFetch = async () => {
    const skus = skuInput
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    if (skus.length === 0) {
      toast.error("Please enter at least one SKU");
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      console.time("fetchProductData");
      const results = await fetchProductData(skus, country);
      console.timeEnd("fetchProductData");

      setProducts(results);

      if (results.some((p) => p.name)) {
        toast.success(`Fetched ${results.length} product(s)`);
      } else {
        setHasError(true);
        toast.warning("Products loaded but data may be blocked by CORS");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setHasError(true);
      toast.error("Failed to fetch products.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleLinkFetch = async () => {
    const urls = linkInput
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.startsWith("http"));

    if (urls.length === 0) {
      toast.error("Please enter at least one valid Jumia URL");
      return;
    }

    setIsLoading(true);
    setHasError(false);

    try {
      console.time("handleLinkFetch_parallel");
      const promises = urls.map(url => fetchProductByUrl(url, country));
      const resultsLists = await Promise.all(promises);
      const results = resultsLists.flat();
      console.timeEnd("handleLinkFetch_parallel");

      if (results.length === 0) {
        toast.warning("No products found for the given link(s)");
      } else {
        // Re-assign SN sequentially for all results
        const finalResults = results.map((r, idx) => ({
          ...r,
          sn: idx + 1
        }));
        setProducts(finalResults);
        toast.success(`Fetched ${finalResults.length} product(s) by link`);
      }
    } catch (error) {
      console.error("Link fetch error:", error);
      setHasError(true);
      toast.error("Failed to fetch products by link.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectTable = () => {
    const table = document.getElementById("product-table");
    if (!table) return;

    const range = document.createRange();
    const selection = window.getSelection();
    if (!selection) return;

    selection.removeAllRanges();
    range.selectNodeContents(table);
    selection.addRange(range);

    toast.success("Table selected! Press Ctrl+C to copy");
  };

  const handleDelete = (sku: string) => {
    setProducts((prev) => {
      const filtered = prev.filter((p) => p.sku !== sku);
      // Re-sequence SN after deletion
      return filtered.map((p, idx) => ({
        ...p,
        sn: idx + 1
      }));
    });
    toast.success("Product removed");
  };

  const copySkus = () => {
    const skus = products
      .map((p) => p.sku)
      .filter((sku) => sku && sku !== "N/A")
      .join(",");

    if (!skus) {
      toast.error("No valid SKUs to copy");
      return;
    }

    navigator.clipboard.writeText(skus);
    toast.success("SKUs copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-primary py-6 px-4 shadow-md">
        <div className="container max-w-7xl mx-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-primary-foreground">
            Jumia Product Data Fetcher
          </h1>
          <p className="text-primary-foreground/80 mt-1">
            Fetch product information from Jumia and generate formatted briefs
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-7xl mx-auto py-8 px-4 space-y-8">
        <Tabs defaultValue="fetch" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="fetch">Fetch by SKU</TabsTrigger>
            <TabsTrigger value="link">Fetch by Link</TabsTrigger>
            <TabsTrigger value="view">View Product</TabsTrigger>
          </TabsList>

          <TabsContent value="fetch" className="space-y-8">
            {/* Controls Card */}
            <div className="bg-card rounded-lg shadow-sm border p-6 space-y-6">
              <div className="grid md:grid-cols-[auto_1fr] gap-6">
                <CountrySelector value={country} onChange={setCountry} />
                <SkuInput value={skuInput} onChange={setSkuInput} />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleFetch}
                  disabled={isLoading}
                  className="min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Fetch Data
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => downloadCSV(products)}
                  disabled={products.length === 0}
                  className="min-w-[140px]"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>
              </div>

              {hasError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>CORS Limitation</AlertTitle>
                  <AlertDescription>
                    Direct browser requests to Jumia are blocked by CORS. For
                    full functionality, you'll need a backend proxy server. The
                    SKUs have been loaded but product data couldn't be fetched.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Results Table */}
            <div className="bg-card rounded-lg shadow-sm border p-6">
              <ProductTable products={products} />
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-8">
            <div className="bg-card rounded-lg shadow-sm border p-6 space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <LinkIcon className="w-4 h-4" />
                  Paste Jumia Product URLs (one per line)
                </label>
                <Textarea
                  placeholder="https://www.jumia.com.ng/..."
                  className="min-h-[150px] font-mono text-sm"
                  value={linkInput}
                  onChange={(e) => setLinkInput(e.target.value)}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleLinkFetch}
                  disabled={isLoading}
                  className="min-w-[140px]"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Fetching...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      Fetch by Link
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => downloadCSV(products)}
                  disabled={products.length === 0}
                  className="min-w-[140px]"
                >
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Download CSV
                </Button>

                <Button
                  variant="outline"
                  onClick={copySkus}
                  disabled={products.length === 0}
                  className="min-w-[140px]"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy SKUs
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="view" className="space-y-8">
            {products.length === 0 ? (
              <div className="text-center py-20 text-slate-500 bg-card rounded-lg border">
                No products to display. Go back to the Fetch tab and load some data.
              </div>
            ) : (
              <>
                {/* Comma-separated format section */}
                <div className="bg-white rounded border border-gray-200 shadow-sm p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-md font-medium text-gray-700">
                      Comma-separated format
                    </h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 px-3 border border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                      onClick={() => {
                        const skuList = products
                          .map(p => p.sku)
                          .filter(sku => sku && sku !== "N/A")
                          .join(",");
                        navigator.clipboard.writeText(skuList);
                        toast.success("Comma-separated SKUs copied!");
                      }}
                    >
                      <Copy className="w-3.5 h-3.5 mr-2" />
                      Copy
                    </Button>
                  </div>
                  <Textarea
                    readOnly
                    className="min-h-[80px] font-mono text-xs bg-gray-50/30 border-gray-100 focus-visible:ring-0 resize-none"
                    value={products
                      .map(p => p.sku)
                      .filter(sku => sku && sku !== "N/A")
                      .join(",")}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {products.map((product, index) => (
                    <ProductCard
                      key={`${product.sku}-${index}`}
                      product={product}
                      onDelete={() => handleDelete(product.sku)}
                    />
                  ))}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </main>

      {/* Footer */}
      <footer className="border-t py-4 px-4 mt-8">
        <div className="container max-w-7xl mx-auto text-center text-sm text-muted-foreground">
          Jumia Product Data Fetcher • Paste formatted briefs directly into
          spreadsheets
        </div>
      </footer>
    </div>
  );
};

export default Index;
