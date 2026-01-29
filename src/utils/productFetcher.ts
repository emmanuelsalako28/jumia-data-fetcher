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
        products.push({
          sku: item.sku || "",
          name: item.displayName || "",
          image: item.image || "",
          url: item.url ? (item.url.startsWith('http') ? item.url : baseUrl + item.url) : "",
          oldPrice: item.prices?.oldPrice || "",
          newPrice: item.prices?.price || "",
          outOfStock: item.isSim ? false : (item.quantity === 0 || item.isOutOfStock === true),
        });
      }
    }
    // Check if it's a direct product page
    else if (parsed.product) {
      const item = parsed.product;
      products.push({
        sku: item.sku || "",
        name: item.displayName || "",
        image: item.image || "",
        url: item.url ? (item.url.startsWith('http') ? item.url : baseUrl + item.url) : "",
        oldPrice: item.prices?.oldPrice || "",
        newPrice: item.prices?.price || "",
        outOfStock: item.isSim ? false : (item.quantity === 0 || item.isOutOfStock === true),
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
        sn: 0, // This will be set by the caller
        sku: productData.sku || "N/A",
        name: productData.name || "Unknown Product",
        image: productData.image || "",
        url: productData.url || url,
        oldPrice: productData.oldPrice || "",
        newPrice: productData.newPrice || "",
      };

      return {
        ...product,
        brief: generateBrief(product)
      };
    });
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    return [];
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
        sn: i + 1,
        sku: productData?.sku || sku,
        name: productData?.name || "",
        image: productData?.image || "",
        url: productData?.url || "",
        oldPrice: productData?.oldPrice || "",
        newPrice: productData?.newPrice || "",
      };

      return {
        ...product,
        brief: generateBrief(product),
      };
    } catch (error) {
      console.error(`Error fetching SKU ${sku}:`, error);
      const product: ProductData = {
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
}

export function downloadCSV(products: ProductBrief[]) {
  if (products.length === 0) return;

  const headers = ["S/N", "SKU", "Name", "Image", "URL", "Old Price", "New Price"];

  const csvRows = products.map((p) => {
    return [
      p.sn,
      `"${p.sku}"`, // Force as string in excel
      `"${(p.name || "").replace(/"/g, '""')}"`,
      `"${(p.image || "").replace(/"/g, '""')}"`,
      `"${(p.url || "").replace(/"/g, '""')}"`,
      `"${(p.oldPrice || "").replace(/"/g, '""')}"`,
      `"${(p.newPrice || "").replace(/"/g, '""')}"`,
    ].join(",");
  });

  const csvContent = [headers.join(","), ...csvRows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", `jumia_products_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
