import { useState } from "react";
import { CountrySelector } from "@/components/CountrySelector";
import { SkuInput } from "@/components/SkuInput";
import { ProductTable } from "@/components/ProductTable";
import { ProductBrief } from "@/types/product";
import { generateBrief } from "@/utils/productFetcher";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle, FileText } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const [country, setCountry] = useState(".com.ng");
  const [skuInput, setSkuInput] = useState("");
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

    const baseUrl = `https://www.jumia${country}`;
    const catalogUrl = `${baseUrl}/catalog/?q=`;

    const results: ProductBrief[] = [];

    try {
      for (let i = 0; i < skus.length; i++) {
        const sku = skus[i];
        try {
          const response = await fetch(catalogUrl + sku);
          const html = await response.text();

          // Parse the __STORE__ data
          const startIdx = html.indexOf("window.__STORE__=") + 17;
          const endIdx = html.indexOf("};</scr") + 1;

          let productData: any = {};

          if (startIdx > 16 && endIdx > 0) {
            const objStr = html.substring(startIdx, endIdx);
            const parsed = JSON.parse(objStr);
            if (parsed.products && parsed.products.length > 0) {
              productData = parsed.products[0];
            }
          }

          const product = {
            sn: i + 1,
            sku: productData.sku || sku,
            name: productData.displayName || "",
            image: productData.image || "",
            url: productData.url ? baseUrl + productData.url : "",
            oldPrice: productData.prices?.oldPrice || "",
            newPrice: productData.prices?.price || "",
          };

          results.push({
            ...product,
            brief: generateBrief(product),
          });
        } catch (error) {
          console.error(`Error fetching SKU ${sku}:`, error);
          const product = {
            sn: i + 1,
            sku,
            name: "",
            image: "",
            url: "",
            oldPrice: "",
            newPrice: "",
          };
          results.push({
            ...product,
            brief: generateBrief(product),
          });
        }
      }

      setProducts(results);

      if (results.some(p => p.name)) {
        toast.success(`Fetched ${results.length} product(s)`);
      } else {
        setHasError(true);
        toast.warning("Products loaded but data may be blocked by CORS");
      }
    } catch (error) {
      console.error("Fetch error:", error);
      setHasError(true);
      toast.error("Failed to fetch products. CORS may be blocking requests.");

      // Still create entries for the SKUs
      const fallbackResults = skus.map((sku, i) => {
        const product = {
          sn: i + 1,
          sku,
          name: "",
          image: "",
          url: "",
          oldPrice: "",
          newPrice: "",
        };
        return {
          ...product,
          brief: generateBrief(product),
        };
      });
      setProducts(fallbackResults);
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
              onClick={() => navigate("/view-product", { state: { products } })}
              disabled={products.length === 0}
              className="min-w-[140px]"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Product
            </Button>
          </div>

          {hasError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>CORS Limitation</AlertTitle>
              <AlertDescription>
                Direct browser requests to Jumia are blocked by CORS. For full
                functionality, you'll need a backend proxy server. The SKUs have
                been loaded but product data couldn't be fetched.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Results Table */}
        <div className="bg-card rounded-lg shadow-sm border p-6">
          <ProductTable products={products} />
        </div>
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
