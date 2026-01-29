import { useLocation, useNavigate } from "react-router-dom";
import { ProductBrief } from "@/types/product";
import { ProductCard } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function ViewProduct() {
    const location = useLocation();
    const navigate = useNavigate();
    const products = (location.state?.products as ProductBrief[]) || [];

    return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" onClick={() => navigate("/")}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back to Fetcher
                    </Button>
                    <h1 className="text-2xl font-bold text-slate-900">Fetched Products</h1>
                    <span className="text-slate-500 text-sm">({products.length} items)</span>
                </div>

                {products.length === 0 ? (
                    <div className="text-center py-20 text-slate-500">
                        No products to display. Go back and fetch some data.
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {products.map((product, index) => (
                            <ProductCard
                                key={`${product.sku}-${index}`}
                                product={product}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
