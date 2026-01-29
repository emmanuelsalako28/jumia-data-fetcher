export interface JumiaCountry {
  code: string;
  name: string;
  domain: string;
}

export interface ProductData {
  sn: number;
  sku: string;
  name: string;
  image: string;
  url: string;
  oldPrice: string;
  newPrice: string;
}

export interface ProductBrief extends ProductData {
  brief: string;
}

export const JUMIA_COUNTRIES: JumiaCountry[] = [
  { code: "NG", name: "Nigeria", domain: ".com.ng" },
];
