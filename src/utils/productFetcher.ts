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

/**
 * Fetch HTML via direct request first, falling back to public CORS proxies if blocked by browser CORS.
 */
async function fetchHtmlWithFallback(targetUrl: string): Promise<string> {
  // 1. Direct fetch with timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (res.ok) {
      const text = await res.text();
      if (text && text.length > 300) return text;
    }
  } catch (e) {
    console.warn(`Direct fetch failed for ${targetUrl}, trying CORS proxies...`);
  }

  // 2. CORS Proxy fallbacks
  const proxyConstructors = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  ];

  for (const getProxyUrl of proxyConstructors) {
    try {
      const proxyUrl = getProxyUrl(targetUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(proxyUrl, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const text = await res.text();
        if (text && text.length > 300) {
          return text;
        }
      }
    } catch (err) {
      console.warn(`CORS proxy failed for ${targetUrl}:`, err);
    }
  }

  throw new Error(`Unable to fetch HTML for ${targetUrl} directly or via proxies.`);
}

/**
 * Robustly extract window.__STORE__ or window.__INITIAL_STATE__ JSON object from HTML
 */
function extractStoreJson(html: string): any | null {
  // Pattern 1: window.__STORE__ = {...}</script>
  const storeRegex = /window\.__STORE__\s*=\s*({[\s\S]*?});?\s*<\/(?:script|body)/i;
  const match = html.match(storeRegex);
  if (match && match[1]) {
    try {
      return JSON.parse(match[1]);
    } catch (e) {
      // Ignore parse error
    }
  }

  // Pattern 2: Search for window.__STORE__ marker and parse script contents
  const marker = "window.__STORE__";
  const markerIdx = html.indexOf(marker);
  if (markerIdx !== -1) {
    const equalsIdx = html.indexOf("=", markerIdx);
    if (equalsIdx !== -1) {
      const jsonStart = html.indexOf("{", equalsIdx);
      if (jsonStart !== -1) {
        const scriptEnd = html.indexOf("</script>", jsonStart);
        if (scriptEnd !== -1) {
          let candidate = html.substring(jsonStart, scriptEnd).trim();
          if (candidate.endsWith(";")) {
            candidate = candidate.slice(0, -1).trim();
          }
          try {
            return JSON.parse(candidate);
          } catch (e) {
            // Ignore
          }
        }
      }
    }
  }

  // Pattern 3: Alternative state markers
  const altRegex = /window\.(?:__INITIAL_STATE__|__NEXT_DATA__)\s*=\s*({[\s\S]*?});?\s*<\/(?:script|body)/i;
  const altMatch = html.match(altRegex);
  if (altMatch && altMatch[1]) {
    try {
      return JSON.parse(altMatch[1]);
    } catch (e) {}
  }

  return null;
}

function extractSellerName(item: any, rootStore: any, html?: string): string | undefined {
  let name: string | undefined = undefined;

  // 1. Check item & root store properties
  if (typeof item?.seller === "string") name = item.seller;
  else if (typeof item?.seller?.name === "string") name = item.seller.name;
  else if (typeof item?.seller?.displayName === "string") name = item.seller.displayName;
  else if (typeof item?.sellerEntity?.name === "string") name = item.sellerEntity.name;
  else if (typeof item?.sellerName === "string") name = item.sellerName;
  else if (typeof item?.sellerInformation?.name === "string") name = item.sellerInformation.name;
  else if (typeof rootStore?.seller?.name === "string") name = rootStore.seller.name;
  else if (typeof rootStore?.seller === "string") name = rootStore.seller;
  else if (typeof rootStore?.product?.seller?.name === "string") name = rootStore.product.seller.name;
  else if (typeof rootStore?.product?.seller === "string") name = rootStore.product.seller;

  // 2. Check if global flags exist in object
  const isGlobalFlag =
    item?.isGlobal === true ||
    item?.isShippedFromAbroad === true ||
    rootStore?.product?.isGlobal === true ||
    rootStore?.product?.isShippedFromAbroad === true ||
    (Array.isArray(item?.badges) && item.badges.some((b: any) => /global|abroad|shipped from/i.test(b.text || "")));

  // 3. Fallback: Parse directly from HTML markup
  if (!name && html) {
    const sellerHeaderIdx = html.indexOf("SELLER INFORMATION");
    if (sellerHeaderIdx !== -1) {
      const snippet = html.substring(sellerHeaderIdx, sellerHeaderIdx + 1500);
      const match = snippet.match(/<-?\s*p[^>]*>([^<]+)<\/p>/i) ||
                    snippet.match(/class=["'][^"']*seller[^"']*["'][^>]*>([^<]+)<\//i) ||
                    snippet.match(/<-?\s*a[^>]*href=["']\/([^"']*-cod)["']/i);
      if (match && match[1] && match[1].trim().length > 0 && !match[1].includes("Seller Score")) {
        name = match[1].trim();
      }
    }

    if (!name) {
      const codMatch = html.match(/>([A-Za-z0-9\s_.\-&]+?-COD)</i) ||
                       html.match(/"seller"\s*:\s*{"name"\s*:\s*"([^"]+)"/i) ||
                       html.match(/"sellerName"\s*:\s*"([^"]+)"/i);
      if (codMatch && codMatch[1]) {
        name = codMatch[1].trim();
      }
    }
  }

  if (name) {
    if (isGlobalFlag && !name.toUpperCase().includes("-COD")) {
      name = `${name}-COD`;
    }
    return name;
  }

  if (isGlobalFlag) {
    return "Global Seller-COD";
  }

  return undefined;
}

/**
 * Fallback parser using schema.org JSON-LD scripts
 */
function parseJsonLdProduct(html: string, baseUrl: string): Partial<ProductData>[] {
  const products: Partial<ProductData>[] = [];
  const ldJsonRegex = /<script\s+type=["']application\/ld\+json["']>([\s\S]*?)<\/script>/gi;
  const extractedSeller = extractSellerName(null, null, html);

  let match;
  while ((match = ldJsonRegex.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        if (item["@type"] === "Product" || item["@type"] === "http://schema.org/Product") {
          const offer = Array.isArray(item.offers) ? item.offers[0] : item.offers;
          const price = offer?.price || offer?.lowPrice || "";
          const currency = offer?.priceCurrency || "₦";
          const formattedPrice = price ? `${currency} ${price}` : "";

          products.push({
            sku: item.sku || item.productID || "",
            name: item.name || "",
            image: Array.isArray(item.image)
              ? item.image[0]
              : typeof item.image === "string"
              ? item.image
              : item.image?.url || "",
            url: item.url ? (item.url.startsWith("http") ? item.url : baseUrl + item.url) : "",
            newPrice: formattedPrice,
            oldPrice: "",
            rating: item.aggregateRating?.ratingValue ? parseFloat(item.aggregateRating.ratingValue) : undefined,
            reviews: item.aggregateRating?.reviewCount ? `(${item.aggregateRating.reviewCount})` : undefined,
            seller: offer?.seller?.name || extractedSeller || undefined,
            outOfStock: offer?.availability?.includes("OutOfStock") ?? false,
            category: item.category || "",
          });
        }
      }
    } catch (e) {}
  }
  return products;
}

/**
 * Fallback parser using OpenGraph and meta tags
 */
function parseMetaProduct(html: string, baseUrl: string): Partial<ProductData>[] {
  const getMeta = (prop: string) => {
    const match =
      html.match(new RegExp(`<meta\\s+(?:property|name)=["']${prop}["']\\s+content=["'](.*?)["']`, "i")) ||
      html.match(new RegExp(`<meta\\s+content=["'](.*?)["']\\s+(?:property|name)=["']${prop}["']`, "i"));
    return match ? match[1] : "";
  };

  const title = getMeta("og:title") || getMeta("twitter:title");
  const image = getMeta("og:image") || getMeta("twitter:image");
  const url = getMeta("og:url") || getMeta("twitter:url");
  const price = getMeta("product:price:amount") || getMeta("og:price:amount");
  const currency = getMeta("product:price:currency") || getMeta("og:price:currency") || "₦";
  const extractedSeller = extractSellerName(null, null, html);

  if (title || image) {
    return [
      {
        sku: "",
        name: title,
        image: image,
        url: url ? (url.startsWith("http") ? url : baseUrl + url) : "",
        newPrice: price ? `${currency} ${price}` : "",
        oldPrice: "",
        seller: extractedSeller || undefined,
        outOfStock: false,
      },
    ];
  }

  return [];
}

export function parseProductFromHtml(
  html: string,
  domain: string
): Partial<ProductData>[] {
  const baseUrl = BASE_URL + domain;

  // Attempt 1: window.__STORE__ JSON extraction
  try {
    const parsed = extractStoreJson(html);
    if (parsed) {
      const products: Partial<ProductData>[] = [];

      // Check if it's a catalog/search results page
      if (parsed.products && Array.isArray(parsed.products) && parsed.products.length > 0) {
        const limit = Math.min(parsed.products.length, 40);
        for (let i = 0; i < limit; i++) {
          const item = parsed.products[i];
          const isOutOfStock = item.isSim
            ? false
            : item.isOutOfStock === true ||
              item.outOfStock === true ||
              !item.displayName ||
              !item.image ||
              !item.prices?.price ||
              !item.url;

          let discount: string | undefined = undefined;

          if (item.prices?.oldPrice && item.prices?.price) {
            try {
              const oldPriceStr = String(item.prices.oldPrice).replace(/[^0-9.]/g, "");
              const newPriceStr = String(item.prices.price).replace(/[^0-9.]/g, "");
              const oldPriceNum = parseFloat(oldPriceStr);
              const newPriceNum = parseFloat(newPriceStr);

              if (!isNaN(oldPriceNum) && !isNaN(newPriceNum) && oldPriceNum > newPriceNum) {
                const discountPercent = Math.round(((oldPriceNum - newPriceNum) / oldPriceNum) * 100);
                discount = `-${discountPercent}%`;
              }
            } catch (e) {
              console.warn("Error calculating discount:", e);
            }
          }
          products.push({
            sku: item.sku || "",
            name: item.displayName || "",
            image: item.image || "",
            url: item.url ? (item.url.startsWith("http") ? item.url : baseUrl + item.url) : "",
            oldPrice: item.prices?.oldPrice || "",
            newPrice: item.prices?.price || "",
            discount: discount,
            rating: item.rating?.average || undefined,
            reviews: item.rating?.totalRatings ? `(${item.rating.totalRatings})` : undefined,
            seller: extractSellerName(item, parsed, html),
            isOfficialStore: Array.isArray(item.badges)
              ? item.badges.some((b: any) => b.text?.toLowerCase().includes("official"))
              : undefined,
            isExpress: Array.isArray(item.badges)
              ? item.badges.some((b: any) => b.text?.toLowerCase().includes("express"))
              : undefined,
            outOfStock: isOutOfStock,
            category: item.categories?.[0]?.name || "",
          });
        }
        if (products.length > 0) return products;
      }
      // Check if it's a direct product page
      else if (parsed.product) {
        const item = parsed.product;
        const isOutOfStock = item.isSim
          ? false
          : item.isOutOfStock === true ||
            item.outOfStock === true ||
            !item.displayName ||
            !item.image ||
            !item.prices?.price ||
            !item.url;

        let discount: string | undefined = undefined;

        if (item.prices?.oldPrice && item.prices?.price) {
          try {
            const oldPriceStr = String(item.prices.oldPrice).replace(/[^0-9.]/g, "");
            const newPriceStr = String(item.prices.price).replace(/[^0-9.]/g, "");
            const oldPriceNum = parseFloat(oldPriceStr);
            const newPriceNum = parseFloat(newPriceStr);

            if (!isNaN(oldPriceNum) && !isNaN(newPriceNum) && oldPriceNum > newPriceNum) {
              const discountPercent = Math.round(((oldPriceNum - newPriceNum) / oldPriceNum) * 100);
              discount = `-${discountPercent}%`;
            }
          } catch (e) {
            console.warn("Error calculating discount:", e);
          }
        }
        return [
          {
            sku: item.sku || "",
            name: item.displayName || "",
            image: item.image || "",
            url: item.url ? (item.url.startsWith("http") ? item.url : baseUrl + item.url) : "",
            oldPrice: item.prices?.oldPrice || "",
            newPrice: item.prices?.price || "",
            discount: discount,
            rating: item.rating?.average || undefined,
            reviews: item.rating?.totalRatings ? `(${item.rating.totalRatings})` : undefined,
            seller: extractSellerName(item, parsed, html),
            isOfficialStore: Array.isArray(item.badges)
              ? item.badges.some((b: any) => b.text?.toLowerCase().includes("official"))
              : undefined,
            isExpress: Array.isArray(item.badges)
              ? item.badges.some((b: any) => b.text?.toLowerCase().includes("express"))
              : undefined,
            outOfStock: isOutOfStock,
            category: item.categories?.[0]?.name || "",
          },
        ];
      }
    }
  } catch (error) {
    console.warn("Store JSON extraction failed:", error);
  }

  // Attempt 2: JSON-LD Schema
  const jsonLdProducts = parseJsonLdProduct(html, baseUrl);
  if (jsonLdProducts.length > 0) return jsonLdProducts;

  // Attempt 3: OpenGraph / Meta tags
  const metaProducts = parseMetaProduct(html, baseUrl);
  if (metaProducts.length > 0) return metaProducts;

  return [];
}

export async function fetchProductByUrl(
  url: string,
  domain: string
): Promise<ProductBrief[]> {
  try {
    const html = await fetchHtmlWithFallback(url);
    const productDataList = parseProductFromHtml(html, domain);

    if (productDataList.length === 0) return [];

    const urlHasCod = url.toUpperCase().includes("-COD") || url.toUpperCase().includes("COD");

    return productDataList.map((productData) => {
      let finalSku = productData.sku || "N/A";
      let finalSeller = productData.seller;

      if (urlHasCod || isGlobalSku(finalSeller, finalSku, productData.name, url)) {
        if (finalSku !== "N/A" && !finalSku.toUpperCase().includes("-COD")) {
          finalSku = `${finalSku}-COD`;
        }
        if (!finalSeller || !finalSeller.toUpperCase().includes("-COD")) {
          finalSeller = finalSeller ? `${finalSeller}-COD` : "Global Seller-COD";
        }
      }

      const product: ProductData = {
        ...productData,
        sn: 0, // This will be set by the caller
        sku: finalSku,
        seller: finalSeller,
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
        brief: generateBrief(product),
      };
    });
  } catch (error) {
    console.error(`Error fetching URL ${url}:`, error);
    const urlHasCod = url.toUpperCase().includes("-COD");
    const product: ProductData = {
      sn: 0,
      sku: "N/A",
      seller: urlHasCod ? "Global Seller-COD" : undefined,
      name: "Fetch Failed",
      image: "",
      url: url,
      oldPrice: "",
      newPrice: "",
      outOfStock: true,
    };
    return [
      {
        ...product,
        brief: generateBrief(product),
      },
    ];
  }
}

export async function fetchProductData(
  skus: string[],
  domain: string
): Promise<ProductBrief[]> {
  const baseUrl = BASE_URL + domain;

  const promises = skus.map(async (rawSku, i) => {
    // Normalize SKU input
    const sku = rawSku.trim().replace(/^sku:\s*/i, "");
    if (!sku) return null;

    const hasCod = sku.toUpperCase().includes("-COD") || sku.toUpperCase().includes("COD");

    try {
      const catalogUrl = `${baseUrl}/catalog/?q=${encodeURIComponent(sku)}`;
      const html = await fetchHtmlWithFallback(catalogUrl);
      const productDataList = parseProductFromHtml(html, domain);

      // Smart SKU matching: Find product that matches requested SKU string
      let matched = productDataList.find(
        (p) =>
          p.sku?.toLowerCase() === sku.toLowerCase() ||
          p.sku?.toLowerCase().includes(sku.toLowerCase()) ||
          sku.toLowerCase().includes(p.sku?.toLowerCase() || "")
      );

      if (!matched && productDataList.length > 0) {
        matched = productDataList[0];
      }

      const productData = matched || null;

      // Preserve -COD on SKU if input SKU or fetched data contained -COD
      let finalSku = productData?.sku || sku;
      if (hasCod && !finalSku.toUpperCase().includes("-COD")) {
        finalSku = sku.toUpperCase().includes("-COD") ? sku : `${finalSku}-COD`;
      }

      // Preserve -COD on seller if SKU or input has -COD
      let finalSeller = productData?.seller;
      if (hasCod && (!finalSeller || !finalSeller.toUpperCase().includes("-COD"))) {
        finalSeller = finalSeller ? `${finalSeller}-COD` : "Global Seller-COD";
      }

      const product: ProductData = {
        ...productData,
        sn: i + 1,
        sku: finalSku,
        seller: finalSeller,
        name: productData?.name || (productData ? "Unknown Product" : "Fetch Failed"),
        image: productData?.image || "",
        url: productData?.url || "",
        oldPrice: productData?.oldPrice || "",
        newPrice: productData?.newPrice || "",
        outOfStock: productData ? productData.outOfStock ?? false : true,
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
        seller: hasCod ? "Global Seller-COD" : undefined,
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

export function isGlobalSku(seller?: string, sku?: string, name?: string, url?: string): boolean {
  const check = (val?: string) => {
    if (!val) return false;
    const upper = val.toUpperCase().trim();
    return (
      upper.includes("-COD") ||
      upper.includes("_COD") ||
      upper.endsWith(" - COD") ||
      upper.endsWith(" COD") ||
      upper.endsWith("-COD") ||
      upper.endsWith("COD")
    );
  };

  return check(seller) || check(sku) || check(name) || check(url);
}

export function createMockProducts(skus: string[]): ProductBrief[] {
  return skus
    .filter((sku) => sku.trim().length > 0)
    .map((rawSku, index) => {
      const cleanSku = rawSku.trim().replace(/^sku:\s*/i, "");
      const isGlobalMock = cleanSku.toUpperCase().includes("COD") || cleanSku.toUpperCase().includes("-COD") || index % 2 === 1;
      const finalSku = isGlobalMock && !cleanSku.toUpperCase().includes("-COD") ? `${cleanSku}-COD` : cleanSku;
      const product: ProductData = {
        sn: index + 1,
        sku: finalSku,
        name: `Product ${cleanSku}`,
        image: "https://via.placeholder.com/150",
        url: `https://www.jumia.com.ng/catalog/?q=${cleanSku}`,
        oldPrice: "₦ 10,000",
        newPrice: "₦ 8,000",
        rating: 4,
        isOfficialStore: true,
        isExpress: true,
        discount: "-20%",
        seller: isGlobalMock ? "Jumia Global Store-COD" : "Jumia Local Store",
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

  const headers = [
    "S/N",
    "SKU",
    "Name",
    "Image",
    "URL",
    "Old Price",
    "New Price",
    "Category",
    "Out of Stock",
  ];

  const rows = products.map((p) => [
    p.sn,
    p.sku,
    `"${(p.name || "").replace(/"/g, '""')}"`,
    p.image,
    p.url,
    p.oldPrice,
    p.newPrice,
    p.category || "",
    p.outOfStock ? "Yes" : "No",
  ]);

  const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);

  link.setAttribute("href", url);
  link.setAttribute("download", `jumia_products_${new Date().toISOString().split("T")[0]}.csv`);
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
