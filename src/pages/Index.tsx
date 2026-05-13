import { useState } from "react";
import { CountrySelector } from "@/components/CountrySelector";
import { SkuInput } from "@/components/SkuInput";
import { ProductTable } from "@/components/ProductTable";
import { ProductBrief } from "@/types/product";
import { generateBrief, downloadCSV, fetchProductByUrl, fetchProductData } from "@/utils/productFetcher";
import { Button } from "@/components/ui/button";
import { Download, Loader2, AlertCircle, FileSpreadsheet, Link as LinkIcon, Copy, Shuffle, Star } from "lucide-react";
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
  const [filterOutOfStock, setFilterOutOfStock] = useState(false);
  const [filterLive, setFilterLive] = useState(false);
  const [ratingFilter, setRatingFilter] = useState("all");
  const [discountFilter, setDiscountFilter] = useState("all");

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
      const results = await fetchProductData(skus, country);

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
      const promises = urls.map(url => fetchProductByUrl(url, country));
      const resultsLists = await Promise.all(promises);
      const results = resultsLists.flat();

      if (results.length === 0) {
        toast.warning("No products found for the given link(s)");
      } else {
        // Re-assign SN sequentially for all results
        const finalResults = results.map((r, idx) => ({
          ...r,
          sn: idx + 1
        }));
        setProducts(finalResults);

        // Sync SKUs to input fields
        const fetchedSkus = finalResults
          .map(r => r.sku)
          .filter(sku => sku && sku !== "N/A");

        if (fetchedSkus.length > 0) {
          setSkuInput(fetchedSkus.join("\n"));
        }

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

    // Also remove from skuInput
    setSkuInput((prev) => {
      const lines = prev.split("\n");
      const filteredLines = lines.filter(line => line.trim() !== sku);
      return filteredLines.join("\n");
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

  const handleShuffle = () => {
    if (products.length <= 1) return;

    const shuffled = [...products];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Re-sequence SN after shuffle
    const reSequenced = shuffled.map((p, idx) => ({
      ...p,
      sn: idx + 1
    }));

    setProducts(reSequenced);
    toast.success("Products shuffled!");
  };

  const getFilteredProducts = () => {
    return products.filter((p) => {
      // Stock filters
      if (filterOutOfStock && !p.outOfStock) return false;
      if (filterLive && p.outOfStock) return false;

      // Rating filter
      if (ratingFilter !== "all") {
        if (ratingFilter === "none") {
          if (p.rating !== undefined && p.rating !== null) return false;
        } else {
          const targetRating = parseFloat(ratingFilter);
          if (p.rating === undefined || p.rating === null || Math.floor(p.rating) !== targetRating) return false;
        }
      }

      // Discount filter
      if (discountFilter !== "all") {
        if (discountFilter === "none") {
          if (p.discount) return false;
        } else {
          const minDiscount = parseInt(discountFilter);
          if (!p.discount) return false;
          const currentDiscount = parseInt(p.discount.replace(/[^0-9]/g, ""));
          if (currentDiscount < minDiscount) return false;
        }
      }

      return true;
    });
  };

  const filteredProducts = getFilteredProducts();

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
          <TabsList className="grid w-full grid-cols-2 mb-8">
            <TabsTrigger value="fetch">Fetch Products</TabsTrigger>
            <TabsTrigger value="view">View Products</TabsTrigger>
          </TabsList>

          <TabsContent value="fetch" className="space-y-8">
            {/* Controls Card */}
            <div className="bg-card rounded-lg shadow-sm border p-6 space-y-6">
              <div className="grid md:grid-cols-[auto_1fr] gap-6">
                <CountrySelector value={country} onChange={setCountry} />
                <SkuInput
                  value={skuInput}
                  onChange={setSkuInput}
                  linkValue={linkInput}
                  onLinkChange={setLinkInput}
                  onLinkFetch={handleLinkFetch}
                  isLoading={isLoading}
                />
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


          <TabsContent value="view" className="space-y-8">
            {products.length === 0 ? (
              <div className="text-center py-20 text-slate-500 bg-card rounded-lg border">
                No products to display. Go back to the Fetch tab and load some data.
              </div>
            ) : (
              <>
                {/* Comma-separated format section at top */}
                <div className="grid md:grid-cols-2 gap-4">
                  {/* Comma-separated format section */}
                  <div className="bg-white rounded border border-gray-200 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-medium text-gray-700">
                        Comma-separated SKUs
                      </h3>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 border border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                          onClick={handleShuffle}
                        >
                          <Shuffle className="w-3.5 h-3.5 mr-2" />
                          Shuffle
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 border border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                          onClick={() => {
                            const skuList = filteredProducts
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
                    </div>
                    <Textarea
                      readOnly
                      className="min-h-[80px] font-mono text-xs bg-gray-50/30 border-gray-100 focus-visible:ring-0 resize-none"
                      value={filteredProducts
                        .map(p => p.sku)
                        .filter(sku => sku && sku !== "N/A")
                        .join(",")}
                    />
                  </div>

                  {/* Product Links section */}
                  <div className="bg-white rounded border border-gray-200 shadow-sm p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-md font-medium text-gray-700">
                        Product Links (Row format)
                      </h3>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 px-3 border border-gray-100 bg-gray-50/50 hover:bg-gray-100"
                        onClick={() => {
                          const linkList = filteredProducts
                            .map(p => p.url)
                            .filter(url => url && url.startsWith("http"))
                            .join("\n");
                          navigator.clipboard.writeText(linkList);
                          toast.success("Product links copied!");
                        }}
                      >
                        <Copy className="w-3.5 h-3.5 mr-2" />
                        Copy All
                      </Button>
                    </div>
                    <Textarea
                      readOnly
                      className="min-h-[80px] font-mono text-xs bg-gray-50/30 border-gray-100 focus-visible:ring-0 resize-none"
                      value={filteredProducts
                        .map(p => p.url)
                        .filter(url => url && url.startsWith("http"))
                        .join("\n")}
                    />
                  </div>
                </div>

                <div className="flex flex-col md:flex-row gap-6 mt-8">
                  {/* Filter Sidebar */}
                  <div className="bg-white rounded border border-gray-200 shadow-sm p-4 flex flex-col gap-6 w-full md:w-[260px] h-fit md:sticky md:top-4 overflow-y-auto max-h-[calc(100vh-100px)]">
                    {/* Rating Filter */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">Rating</h3>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: "All products", value: "all" },
                          { label: "", value: "5" },
                          { label: "", value: "4" },
                          { label: "", value: "3" },
                          { label: "", value: "2" },
                          { label: "", value: "1" },
                          { label: "No rating", value: "none" },
                        ].map((option) => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="rating"
                              className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                              checked={ratingFilter === option.value}
                              onChange={() => setRatingFilter(option.value)}
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900 flex items-center gap-1">
                              {option.label}
                              {option.label === "" && option.value !== "all" && (
                                <div className="flex">
                                  {[...Array(5)].map((_, i) => (
                                    <Star
                                      key={i}
                                      className={`w-4 h-4 ${i < parseInt(option.value) ? "fill-orange-400 text-orange-400" : "text-gray-100"}`}
                                    />
                                  ))}
                                </div>
                              )}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* Shipping Filter */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">Express Delivery</h3>
                      <div className="flex flex-col gap-2">
                        <label className="flex items-center gap-2 cursor-pointer group">
                          <input
                            type="checkbox"
                            className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-gray-300"
                            checked={filterLive}
                            onChange={(e) => {
                              setFilterLive(e.target.checked);
                              if (e.target.checked) setFilterOutOfStock(false);
                            }}
                          />
                          <span className="text-sm text-gray-700 group-hover:text-gray-900 flex items-center justify-between w-full">
                            <span>Live only</span>
                            <span className="text-xs text-muted-foreground mr-2">({products.filter(p => !p.outOfStock).length})</span>
                          </span>
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="out-of-stock-filter"
                            className="w-4 h-4 rounded text-red-600 focus:ring-red-500 border-gray-300"
                            checked={filterOutOfStock}
                            onChange={(e) => {
                              setFilterOutOfStock(e.target.checked);
                              if (e.target.checked) setFilterLive(false);
                            }}
                          />
                          <label htmlFor="out-of-stock-filter" className="text-sm font-medium text-gray-700 cursor-pointer flex justify-between w-full">
                            <span>Out of stock only</span>
                            <span className="text-xs text-muted-foreground mr-2">({products.filter(p => p.outOfStock).length})</span>
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Discount Filter */}
                    <div className="space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900 border-b pb-1">Discount Percentage</h3>
                      <div className="flex flex-col gap-2">
                        {[
                          { label: "All products", value: "all" },
                          { label: "50% or more", value: "50" },
                          { label: "40% or more", value: "40" },
                          { label: "30% or more", value: "30" },
                          { label: "20% or more", value: "20" },
                          { label: "10% or more", value: "10" },
                          { label: "No discount", value: "none" },
                        ].map((option) => (
                          <label key={option.value} className="flex items-center gap-2 cursor-pointer group">
                            <input
                              type="radio"
                              name="discount"
                              className="w-4 h-4 text-orange-600 focus:ring-orange-500 border-gray-300"
                              checked={discountFilter === option.value}
                              onChange={() => setDiscountFilter(option.value)}
                            />
                            <span className="text-sm text-gray-700 group-hover:text-gray-900">{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Product Cards Grid */}
                  <div className="flex-1">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                      {filteredProducts.map((product, index) => (
                        <ProductCard
                          key={`${product.sku}-${index}`}
                          product={product}
                          onDelete={() => handleDelete(product.sku)}
                        />
                      ))}
                    </div>
                  </div>
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
    </div >
  );
};

export default Index;
