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

  // 2. Multi-tier CORS Proxy fallbacks
  const proxyConstructors = [
    (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
    (url: string) => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`,
    (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
    (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
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

function isValidSellerName(str: any): str is string {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  if (trimmed.length === 0) return false;
  // If it's a pure numeric string (like "10429" or "98123"), it's a seller ID, NOT a seller name
  if (/^\d+$/.test(trimmed)) return false;
  if (/^(seller information|seller score|seller performance|shipping speed|quality score|customer rating|cancellation rate|successful delivery|order fulfillment|ratings|reviews|product details|follow|details)$/i.test(trimmed)) return false;
  return true;
}

function extractSellerName(item: any, rootStore: any, html?: string): string | undefined {
  let name: string | undefined = undefined;

  const checkCandidate = (val: any) => {
    if (isValidSellerName(val)) return val.trim();
    if (typeof val === "object" && val !== null) {
      if (isValidSellerName(val.name)) return val.name.trim();
      if (isValidSellerName(val.displayName)) return val.displayName.trim();
      if (isValidSellerName(val.sellerName)) return val.sellerName.trim();
    }
    return undefined;
  };

  // 1. Direct HTML markup under "Seller Information" card (The #1 DOM Source of Truth on Jumia product detail page!)
  if (html) {
    const sellerHeaderIdx = html.search(/Seller Information/i);
    if (sellerHeaderIdx !== -1) {
      const snippet = html.substring(sellerHeaderIdx, sellerHeaderIdx + 1200);

      const patterns = [
        // Exact Jumia Seller Card structure: <div class="-hr -pam"><p class="-m -pbm">SellerName</p>
        /<div[^>]*class=["'][^"']*-hr[^"']*["'][^>]*>\s*<p[^>]*class=["'][^"']*-pbm[^"']*["'][^>]*>\s*([^<]+)\s*<\/p>/i,
        /<p[^>]*class=["'][^"']*-pbm[^"']*["'][^>]*>\s*([^<]+)\s*<\/p>/i,
        /<div[^>]*class=["'][^"']*-hr[^"']*["'][^>]*>\s*<a[^>]*>\s*([^<]+)\s*<\/a>/i,
        /<a[^>]*class=["'][^"']*-emu[^"']*["'][^>]*>\s*([^<]+)\s*<\/a>/i,
        /<h2[^>]*>Seller Information<\/h2>[\s\S]*?<(?:p|a)[^>]*>\s*([^<]+)\s*<\/(?:p|a)>/i,
        /Seller Information[\s\S]*?<(?:p|a|div)[^>]*>\s*([^<]+)\s*<\/(?:p|a|div)>/i,
      ];

      for (const pattern of patterns) {
        const m = snippet.match(pattern);
        if (m && m[1] && isValidSellerName(m[1])) {
          name = m[1].trim();
          break;
        }
      }
    }
  }

  // 2. Direct object or string properties on item object from store JSON
  if (!name && item) {
    name = checkCandidate(item?.seller) ||
           checkCandidate(item?.sellerName) ||
           checkCandidate(item?.sellerEntity) ||
           checkCandidate(item?.sellerInformation) ||
           checkCandidate(item?.supplierName);
  }

  // 3. Lookup seller by numeric ID or key in rootStore dictionary
  if (!name && item?.seller && rootStore?.sellers) {
    const sellerObj = rootStore.sellers[item.seller] || rootStore.sellers[String(item.seller)];
    name = checkCandidate(sellerObj);
  }
  if (!name && item?.sellerId && rootStore?.sellers) {
    const sellerObj = rootStore.sellers[item.sellerId] || rootStore.sellers[String(item.sellerId)];
    name = checkCandidate(sellerObj);
  }

  // 4. Root store product / seller properties
  if (!name && rootStore) {
    name = checkCandidate(rootStore?.seller) ||
           checkCandidate(rootStore?.product?.seller) ||
           checkCandidate(rootStore?.product?.sellerName) ||
           checkCandidate(rootStore?.product?.sellerInformation) ||
           checkCandidate(rootStore?.mainSeller);
  }

  // 5. Fallback: Parse JSON script strings directly from HTML markup
  if (!name && html) {
    const jsonMatches = [
      html.match(/"seller"\s*:\s*{\s*"name"\s*:\s*"([^"]+)"/i),
      html.match(/"sellerName"\s*:\s*"([^"]+)"/i),
      html.match(/"seller_name"\s*:\s*"([^"]+)"/i),
      html.match(/"supplierName"\s*:\s*"([^"]+)"/i),
      html.match(/{"@type":"Organization","name":"([^"]+)"}/i),
      html.match(/>([A-Za-z0-9\s_.\-&]+?-COD)</i),
    ];
    for (const m of jsonMatches) {
      if (m && m[1] && isValidSellerName(m[1])) {
        name = m[1].trim();
        break;
      }
    }
  }

  return name;
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

    const isGlobalSkuPattern = /-(?:AO|COD)$|^NAFAMZ-/i.test(url);

    return productDataList.map((productData) => {
      let finalSku = productData.sku || "N/A";
      // Respect the actual extracted seller name directly without mutating it
      let finalSeller = productData.seller;

      if (!finalSeller) {
        if (isGlobalSkuPattern || /-(?:AO|COD)$|^NAFAMZ-/i.test(finalSku)) {
          finalSeller = "Jumia Global Store-COD";
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
    const isGlobalSkuPattern = /-(?:AO|COD)$|^NAFAMZ-/i.test(url);
    const product: ProductData = {
      sn: 0,
      sku: "N/A",
      seller: isGlobalSkuPattern ? "Jumia Global Store-COD" : undefined,
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

    const isGlobalSkuPattern = /-(?:AO|COD)$|^NAFAMZ-/i.test(sku);

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

      let productData = matched ? { ...matched } : null;

      // If product was found from catalog search but seller name is missing, fetch product detail page directly!
      if (productData && !productData.seller && productData.url && productData.url.startsWith("http")) {
        try {
          const detailHtml = await fetchHtmlWithFallback(productData.url);
          const detailProducts = parseProductFromHtml(detailHtml, domain);
          if (detailProducts.length > 0) {
            const detailObj = detailProducts[0];
            if (detailObj.seller) {
              productData.seller = detailObj.seller;
            }
            if (detailObj.rating && !productData.rating) productData.rating = detailObj.rating;
            if (detailObj.reviews && !productData.reviews) productData.reviews = detailObj.reviews;
            if (detailObj.category && !productData.category) productData.category = detailObj.category;
          }
        } catch (detailErr) {
          console.warn(`Could not fetch detail page for seller extraction on ${productData.url}:`, detailErr);
        }
      }

      let finalSku = productData?.sku || sku;
      // Respect the actual extracted seller name directly without mutating it
      let finalSeller = productData?.seller;

      if (!finalSeller) {
        if (isGlobalSkuPattern || /-(?:AO|COD)$|^NAFAMZ-/i.test(finalSku)) {
          finalSeller = "Jumia Global Store-COD";
        }
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
        seller: isGlobalSkuPattern ? "Jumia Global Store-COD" : undefined,
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

export function isGlobalSku(seller?: any): boolean {
  if (!seller) return false;
  const str = typeof seller === "string" ? seller : typeof seller === "object" ? (seller.name || seller.displayName || String(seller)) : String(seller);
  return str.trim().toUpperCase().endsWith("-COD");
}

export function createMockProducts(skus: string[]): ProductBrief[] {
  return skus
    .filter((sku) => sku.trim().length > 0)
    .map((rawSku, index) => {
      const cleanSku = rawSku.trim().replace(/^sku:\s*/i, "");
      const isGlobalMock = /-(?:AO|COD)$|^NAFAMZ-/i.test(cleanSku);
      const product: ProductData = {
        sn: index + 1,
        sku: cleanSku,
        name: `Product ${cleanSku}`,
        image: "https://via.placeholder.com/150",
        url: `https://www.jumia.com.ng/catalog/?q=${cleanSku}`,
        oldPrice: "₦ 10,000",
        newPrice: "₦ 8,000",
        rating: 4,
        isOfficialStore: true,
        isExpress: true,
        discount: "-20%",
        seller: isGlobalMock ? "Global Seller-COD" : "Official Jumia Store",
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
