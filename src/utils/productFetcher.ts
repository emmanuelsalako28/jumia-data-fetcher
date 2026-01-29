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
): Partial<ProductData> | null {
  try {
    const startIdx = html.indexOf("window.__STORE__=") + 17;
    const endIdx = html.indexOf("};</scr") + 1;

    if (startIdx === 16 || endIdx === 0) {
      return null;
    }

    const objStr = html.substring(startIdx, endIdx);
    const parsed = JSON.parse(objStr);

    if (!parsed.products || parsed.products.length === 0) {
      return null;
    }

    const product = parsed.products[0];
    const baseUrl = BASE_URL + domain;

    return {
      sku: product.sku || "",
      name: product.displayName || "",
      image: product.image || "",
      url: product.url ? baseUrl + product.url : "",
      oldPrice: product.prices?.oldPrice || "",
      newPrice: product.prices?.price || "",
    };
  } catch (error) {
    console.error("Error parsing product data:", error);
    return null;
  }
}

export async function fetchProductData(
  skus: string[],
  domain: string
): Promise<ProductBrief[]> {
  const baseUrl = BASE_URL + domain;
  const catalogUrl = baseUrl + "/catalog/?q=";

  const results: ProductBrief[] = [];

  for (let i = 0; i < skus.length; i++) {
    const sku = skus[i].trim();
    if (!sku) continue;

    try {
      const response = await fetch(catalogUrl + sku);
      const html = await response.text();
      const productData = parseProductFromHtml(html, domain);

      const product: ProductData = {
        sn: i + 1,
        sku: productData?.sku || sku,
        name: productData?.name || "",
        image: productData?.image || "",
        url: productData?.url || "",
        oldPrice: productData?.oldPrice || "",
        newPrice: productData?.newPrice || "",
      };

      results.push({
        ...product,
        brief: generateBrief(product),
      });
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
      results.push({
        ...product,
        brief: generateBrief(product),
      });
    }
  }

  return results;
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
