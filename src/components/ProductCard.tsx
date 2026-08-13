import { ProductData } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, Star, Globe, Pin, Store, Copy, ExternalLink } from "lucide-react";
import { isGlobalSku, generateBrief } from "@/utils/productFetcher";
import { toast } from "sonner";

interface ProductCardProps {
    product: ProductData;
    onDelete?: () => void;
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
    const isGlobal = isGlobalSku(product.seller);

    const handleCopySku = () => {
        if (product.sku) {
            navigator.clipboard.writeText(product.sku);
            toast.success(`SKU "${product.sku}" copied to clipboard!`);
        }
    };

    const handleCopyBrief = () => {
        const brief = generateBrief(product);
        navigator.clipboard.writeText(brief);
        toast.success("Product brief copied to clipboard!");
    };

    return (
        <Card className="overflow-hidden group hover:shadow-xl transition-all duration-300 relative bg-[#1e1e24] border border-zinc-800/80 rounded-2xl">
            {/* Badges Overlay */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {product.outOfStock && (
                    <Badge variant="destructive" className="bg-red-600 hover:bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-md uppercase font-extrabold shadow">
                        Out of Stock
                    </Badge>
                )}
            </div>

            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                {product.isOfficialStore && (
                    <div className="bg-pink-950/80 text-pink-300 text-[10px] uppercase font-bold px-2 py-0.5 rounded-md border border-pink-700/60 shadow">
                        Official Store
                    </div>
                )}
            </div>

            {/* Product Image Container */}
            <div className="relative aspect-[4/3] p-4 flex items-center justify-center bg-white overflow-hidden">
                <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="object-contain w-full h-full mix-blend-multiply group-hover:scale-105 transition-transform duration-300"
                />

                {/* Discount Badge on Bottom-Left of Image */}
                {product.discount && !product.outOfStock && (
                    <div className="absolute bottom-2 left-2 z-10 bg-[#18181c]/90 text-white font-extrabold text-xs px-2.5 py-1 rounded-lg border border-white/10 shadow-md">
                        {product.discount}
                    </div>
                )}
            </div>

            <CardContent className="p-4 space-y-2.5">
                {/* Category Badge */}
                {product.category ? (
                    <div>
                        <span className="inline-block bg-white text-zinc-900 font-semibold text-xs px-2.5 py-1 rounded-md shadow-sm">
                            {product.category}
                        </span>
                    </div>
                ) : (
                    <div>
                        <span className="inline-block bg-white text-zinc-900 font-semibold text-xs px-2.5 py-1 rounded-md shadow-sm">
                            Product Item
                        </span>
                    </div>
                )}

                {/* Product Title */}
                <h3 className="text-sm font-bold text-white line-clamp-2 leading-snug tracking-tight h-10" title={product.name}>
                    {product.name}
                </h3>

                {/* Seller & Location Tag */}
                {product.seller && (
                    <div className="flex items-center gap-2 flex-wrap text-xs">
                        <span className="text-[#f08819] font-semibold">Seller: {product.seller}</span>
                        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${
                            isGlobal
                                ? "bg-purple-950/70 text-purple-300 border-purple-800/60"
                                : "bg-[#143326] text-[#34d399] border-[#1d5c43]"
                        }`}>
                            {isGlobal ? <Globe className="w-3 h-3 text-purple-400" /> : <Store className="w-3 h-3 text-[#34d399]" />}
                            {isGlobal ? "LOCAL" : "LOCAL"}
                        </span>
                    </div>
                )}

                {/* Main SKU Section (as requested) */}
                <div
                    onClick={handleCopySku}
                    className="flex items-center gap-1.5 text-xs font-black text-[#f08819] uppercase tracking-wide cursor-pointer hover:opacity-85 transition-opacity"
                    title="Click to copy SKU"
                >
                    <Pin className="w-3.5 h-3.5 rotate-45 shrink-0 fill-[#f08819]/20 text-[#f08819]" />
                    <span className="truncate">{product.sku}</span>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2 pt-0.5">
                    <span className="text-xl font-black text-white tracking-tight">{product.newPrice}</span>
                    {product.oldPrice && (
                        <span className="text-xs text-zinc-400 line-through font-normal">{product.oldPrice}</span>
                    )}
                </div>

                {/* Rating & JUMIA EXPRESS */}
                <div className="space-y-1 pt-1 border-t border-zinc-800/80">
                    <div className="flex justify-between items-center">
                        {product.rating ? (
                            <div className="flex items-center gap-1 text-xs">
                                <div className="flex text-amber-400">
                                    {[...Array(5)].map((_, i) => (
                                        <Star
                                            key={i}
                                            className={`w-3.5 h-3.5 ${i < Math.round(product.rating!) ? "fill-amber-400 text-amber-400" : "text-zinc-700"}`}
                                        />
                                    ))}
                                </div>
                                <span className="font-bold text-white text-xs ml-0.5">{product.rating}</span>
                                {product.reviews && <span className="text-zinc-400 text-xs">{product.reviews}</span>}
                            </div>
                        ) : (
                            <span className="text-xs text-zinc-500 italic">No rating</span>
                        )}

                        {product.isExpress && (
                            <div className="text-[11px] font-extrabold italic tracking-wider flex items-center gap-0.5">
                                <span className="text-white">JUMIA</span>
                                <span className="text-[#f08819] ml-0.5">🚀 EXPRESS</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end items-center gap-2 pt-2">
                    <Button
                        size="icon"
                        className="h-10 w-10 bg-[#f08819] hover:bg-[#d97706] text-white rounded-xl shadow-md transition-colors"
                        onClick={handleCopyBrief}
                        title="Copy Brief"
                    >
                        <Copy className="h-4 w-4" />
                    </Button>
                    <Button
                        size="icon"
                        className="h-10 w-10 bg-[#f08819] hover:bg-[#d97706] text-white rounded-xl shadow-md transition-colors"
                        onClick={() => window.open(product.url, '_blank')}
                        title="Open Product Page"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </Button>
                    {onDelete && (
                        <Button
                            size="icon"
                            className="h-10 w-10 bg-[#f08819] hover:bg-[#d97706] text-white rounded-xl shadow-md transition-colors"
                            onClick={onDelete}
                            title="Delete Product"
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

