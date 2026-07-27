import { ProductData, ProductBrief } from "@/types/product";

const BASE_URL = "https://www.jumia";

export function generateBrief(product: ProductData): string {
  const lines = [
    `"**S/N #*${product.sn}*`,
    "",
    `SKU: ${product.sku}`,
    "",
    `Name: ${product.name}`,
    "",
    `Image: ${product.image}`,
    "",
    `URL: ${product.url}`,
    "",
    `Old Price: ${product.oldPrice}`,
    "",
    `New Price: ${product.newPrice}`,
  ];
  return lines.join("\n");
}

export function parseProductFromHtml(
  html: string,
  domain: string
): Partial<ProductData>[] {
  try {
    const startIdx = html.indexOf("window.__STORE__=") + 17;
    const endIdx = html.indexOf("};</scr") + 1;

    if (startIdx === 16 || endIdx === 0) {
      return [];
    }

    const objStr = html.substring(startIdx, endIdx);
    const parsed = JSON.parse(objStr);
    const baseUrl = BASE_URL + domain;
    const products: Partial<ProductData>[] = [];

    // Check if it's a catalog/search results page
    if (parsed.products && parsed.products.length > 0) {
      // Extract up to 40 products from the results
      const limit = Math.min(parsed.products.length, 40);
      for (let i = 0; i < limit; i++) {
        const item = parsed.products[i];
        const isOutOfStock = item.isSim ? false : (
          item.isOutOfStock === true ||
          item.outOfStock === true ||
          !item.displayName ||
          !item.image ||
          !item.prices?.price ||
          !item.url
        );

        // Calculate discount percentage if both prices exist
        let discount: string | undefined = undefined;

        if (item.prices?.oldPrice && item.prices?.price) {
          try {
            const oldPriceStr = String(item.prices.oldPrice).replace(/[^0-9.]/g, '');
            const newPriceStr = String(item.prices.price).replace(/[^0-9.]/g, '');
            const oldPriceNum = parseFloat(oldPriceStr);
            const newPriceNum = parseFloat(newPriceStr);

            if (!isNaN(oldPriceNum) && !isNaN(newPriceNum) && oldPriceNum > newPriceNum) {
              const discountPercent = Math.round(((oldPriceNum - newPriceNum) / oldPriceNum) * 100);
              discount = `-${discountPercent}%`;
            }
          } catch (e) {
            console.warn('Error calculating discount:', e);
          }
        }
        products.push({
          sku: item.sku || "",
          name: item.displayName || "",
          image: item.image || "",
          url: item.url ? (item.url.startsWith('http') ? item.url : baseUrl + item.url) : "",
          oldPrice: item.prices?.oldPrice || "",
          newPrice: item.prices?.price || "",
          discount: discount,
          rating: item.rating?.average || undefined,
          reviews: item.rating?.totalRatings ? `(${item.rating.totalRatings})` : undefined,
          seller: item.seller || undefined,
          isOfficialStore: Array.isArray(item.badges) ? item.badges.some((b: any) => b.text?.toLowerCase().includes('official')) : undefined,
          isExpress: Array.isArray(item.badges) ? item.badges.some((b: any) => b.text?.toLowerCase().includes('express')) : undefined,
          outOfStock: isOutOfStock,
          category: item.categories?.[0]?.name || "",
        });
      }
    }
    // Check if it's a direct product page
    else if (parsed.product) {
      const item = parsed.product;
      const isOutOfStock = item.isSim ? false : (
        item.isOutOfStock === true ||
        item.outOfStock === true ||
        !item.displayName ||
        !item.image ||
        !item.prices?.price ||
        !item.url
      );

      // Calculate discount percentage if both prices exist
      let discount: string | undefined = undefined;

      if (item.prices?.oldPrice && item.prices?.price) {
        try {
          const oldPriceStr = String(item.prices.oldPrice).replace(/[^0-9.]/g, '');
          const newPriceStr = String(item.prices.price).replace(/[^0-9.]/g, '');
          const oldPriceNum = parseFloat(oldPriceStr);
          const newPriceNum = parseFloat(newPriceStr);

          if (!isNaN(oldPriceNum) && !isNaN(newPriceNum) && oldPriceNum > newPriceNum) {
            const discountPercent = Math.round(((oldPriceNum - newPriceNum) / oldPriceNum) * 100);
            discount = `-${discountPercent}%`;
          }
        } catch (e) {
          console.warn('Error calculating discount:', e);
        }
      }
      products.push({
        sku: item.sku || "",
        name: item.displayName || "",
        image: item.image || "",
        url: item.url ? (item.url.startsWith('http') ? item.url : baseUrl + item.url) : "",
        oldPrice: item.prices?.oldPrice || "",
        newPrice: item.prices?.price || "",
        discount: discount,
        rating: item.rating?.average || undefined,
        reviews: item.rating?.totalRatings ? `(${item.rating.totalRatings})` : undefined,
        seller: item.seller || undefined,
        isOfficialStore: Array.isArray(item.badges) ? item.badges.some((b: any) => b.text?.toLowerCase().includes('official')) : undefined,
        isExpress: Array.isArray(item.badges) ? item.badges.some((b: any) => b.text?.toLowerCase().includes('express')) : undefined,
        outOfStock: isOutOfStock,
        category: item.categories?.[0]?.name || "",
      });
    }

    return products;
  } catch (error) {
    console.error("Error parsing product data:", error);
    return [];
  }
}

export async function fetchProductByUrl(
  url: string,
  domain: string
): Promise<ProductBrief[]> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const productDataList = parseProductFromHtml(html, domain);

    if (productDataList.length === 0) return [];

    return productDataList.map((productData, index) => {
      const product: ProductData = {
        ...productData,
        sn: 0, // This will be set by the caller
        sku: productData.sku || "N/A",
        name: productData.name || "Unknown Product",
        image: productData.image || "",
        url: productData.url || url,
        oldPrice: productData.oldPrice || "",
        newPrice: productData.newPrice || "",
        outOfStock: productData.outOfStock || false,
        category: productData.category || "",
      } as ProductData;

      return {
        ...product,
        brief: generateBrief(product)
      };
    });
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    const product: ProductData = {
      sn: 0,
      sku: "N/A",
      name: "Fetch Failed",
      image: "",
      url: url,
      oldPrice: "",
      newPrice: "",
      outOfStock: true,
    };
    return [{
      ...product,
      brief: generateBrief(product)
    }];
  }
}

export async function fetchProductData(
  skus: string[],
  domain: string
): Promise<ProductBrief[]> {
  const baseUrl = BASE_URL + domain;
  const catalogUrl = baseUrl + "/catalog/?q=";

  const promises = skus.map(async (rawSku, i) => {
    const sku = rawSku.trim();
    if (!sku) return null;

    try {
      const response = await fetch(catalogUrl + sku);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const html = await response.text();
      const productDataList = parseProductFromHtml(html, domain);
      const productData = productDataList.length > 0 ? productDataList[0] : null;

      const product: ProductData = {
        ...productData,
        sn: i + 1,
        sku: productData?.sku || sku,
        name: productData?.name || "",
        image: productData?.image || "",
        url: productData?.url || "",
        oldPrice: productData?.oldPrice || "",
        newPrice: productData?.newPrice || "",
        outOfStock: productData?.outOfStock ?? true,
        category: productData?.category || "",
      } as ProductData;

      return {
        ...product,
        brief: generateBrief(product),
      };
    } catch (error) {
      console.error(`Error fetching SKU ${sku}:`, error);
      const product: ProductData = {
        sn: i + 1,
        sku,
        name: "Fetch Failed",
        image: "",
        url: "",
        oldPrice: "",
        newPrice: "",
        outOfStock: true,
      };
      return {
        ...product,
        brief: generateBrief(product),
      };
    }
  });

  const rawResults = await Promise.all(promises);
  return rawResults.filter((res): res is ProductBrief => res !== null);
}

// For demo purposes, create mock data since CORS will block direct fetching
export function createMockProducts(skus: string[]): ProductBrief[] {
  return skus
    .filter((sku) => sku.trim().length > 0)
    .map((sku, index) => {
      const product: ProductData = {
        sn: index + 1,
        sku: sku.trim(),
        name: `Product ${sku.trim()}`,
        image: "https://via.placeholder.com/150",
        url: `https://www.jumia.com.ng/catalog/?q=${sku.trim()}`,
        oldPrice: "₦ 10,000",
        newPrice: "₦ 8,000",
        rating: 4,
        isOfficialStore: true,
        isExpress: true,
        discount: "-20%",
        seller: "Jumia Store",
        outOfStock: false,
        category: "Electronics",
      };
      return {
        ...product,
        brief: generateBrief(product),
      };
    });
}

export function downloadCSV(products: ProductData[]): void {
  if (products.length === 0) {
    console.warn("No products to download");
    return;
  }

  // CSV Headers
  const headers = [
    "S/N",
    "SKU",
    "Name",
    "Image",
    "URL",
    "Old Price",
    "New Price",
    "Category",
    "Out of Stock"
  ];

  // Convert products to CSV rows
  const rows = products.map(p => [
    p.sn,
    p.sku,
    `"${(p.name || "").replace(/"/g, '""')}"`, // Escape quotes in name
    p.image,
    p.url,
    p.oldPrice,
    p.newPrice,
    p.category || "",
    p.outOfStock ? "Yes" : "No"
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `jumia_products_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function parsePriceNumber(priceStr?: string): number {
  if (!priceStr) return Number.MAX_VALUE;
  const cleaned = priceStr.replace(/,/g, "").replace(/[^0-9.]/g, "");
  if (!cleaned) return Number.MAX_VALUE;
  const val = parseFloat(cleaned);
  return isNaN(val) ? Number.MAX_VALUE : val;
}

export function parseDiscountNumber(discountStr?: string): number {
  if (!discountStr) return 0;
  const cleaned = discountStr.replace(/[^0-9]/g, "");
  if (!cleaned) return 0;
  const val = parseInt(cleaned, 10);
  return isNaN(val) ? 0 : val;
}

