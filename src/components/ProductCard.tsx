import { ProductData } from "@/types/product";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2, FileText, Star } from "lucide-react";

interface ProductCardProps {
    product: ProductData;
    onDelete?: () => void;
}

export function ProductCard({ product, onDelete }: ProductCardProps) {
    // Mock data for UI if not present
    const discount = product.discount || "-20%";
    const rating = product.rating || 4;
    const isOfficial = product.isOfficialStore ?? true; // Default to true based on screenshot

    return (
        <Card className="overflow-hidden group hover:shadow-lg transition-shadow duration-300 relative bg-white">
            {/* Badges Overlay */}
            <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
                {discount && !product.outOfStock && (
                    <Badge variant="destructive" className="bg-slate-800 hover:bg-slate-800 text-white text-xs px-1.5 rounded-sm">
                        {discount}
                    </Badge>
                )}
                {product.outOfStock && (
                    <Badge variant="destructive" className="bg-red-600 hover:bg-red-600 text-white text-xs px-1.5 rounded-sm uppercase font-bold">
                        Out of Stock
                    </Badge>
                )}
            </div>

            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1 items-end">
                {isOfficial && (
                    <div className="bg-pink-100 text-pink-600 text-[10px] uppercase font-bold px-1 rounded-sm border border-pink-200">
                        Official Store
                    </div>
                )}
                <div className="bg-amber-100 text-amber-700 text-[10px] uppercase font-bold px-1 rounded-sm border border-amber-200">
                    1 Year Warranty
                </div>
            </div>

            {/* Product Image */}
            <div className="relative aspect-square p-4 flex items-center justify-center bg-white">
                <img
                    src={product.image || "/placeholder.svg"}
                    alt={product.name}
                    className="object-contain w-full h-full mix-blend-multiply"
                />
                {/* Capacity/Size Badge (Mocked) */}
                <Badge className="absolute bottom-2 right-2 bg-slate-900 text-white text-xs px-1 rounded-sm hover:bg-slate-900">
                    ITEM
                </Badge>
            </div>

            <CardContent className="p-3 space-y-2">
                {/* Tags */}
                <div className="flex gap-1 flex-wrap">
                    {isOfficial && <span className="text-[10px] bg-sky-700 text-white px-1 py-0.5 rounded-sm">Official Store</span>}
                    {product.category && (
                        <span className="text-[10px] bg-slate-800 text-white px-1 py-0.5 rounded-sm">{product.category}</span>
                    )}
                </div>

                {/* Title */}
                <h3 className="text-sm text-slate-700 line-clamp-2 h-10 leading-tight" title={product.name}>
                    {product.name}
                </h3>

                <div className="text-xs text-orange-500">Seller: {product.seller || "Jumia"}</div>


                {/* Price */}
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-slate-900">{product.newPrice}</span>
                        {product.oldPrice && (
                            <span className="text-xs text-slate-400 line-through">{product.oldPrice}</span>
                        )}
                    </div>
                </div>

                {/* Footer: Rating & Express */}
                <div className="flex justify-between items-center">
                    <div className="flex text-amber-400 text-xs">
                        {[...Array(5)].map((_, i) => (
                            <Star key={i} className={`w-3 h-3 ${i < rating ? "fill-current" : "text-slate-200"}`} />
                        ))}
                    </div>
                    {product.isExpress !== false && (
                        <span className="text-[10px] font-bold text-orange-600 italic">JUMIA EXPRESS</span>
                    )}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                    <Button
                        size="icon"
                        className="h-8 w-8 bg-orange-500 hover:bg-orange-600 rounded-md"
                        onClick={() => window.open(product.url, '_blank')}
                    >
                        <FileText className="h-4 w-4 text-white" />
                    </Button>
                    {onDelete && (
                        <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 bg-orange-400 hover:bg-orange-500 rounded-md"
                            onClick={onDelete}
                        >
                            <Trash2 className="h-4 w-4 text-white" />
                        </Button>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}
