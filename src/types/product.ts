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
  logo: string;
  desktop: string;
  mobile: string;
}

export interface ProductBrief extends ProductData {
  brief: string;
}

export const JUMIA_COUNTRIES: JumiaCountry[] = [
  { code: "NG", name: "Nigeria", domain: ".com.ng" },
  { code: "DZ", name: "Algeria", domain: ".dz" },
  { code: "EG", name: "Egypt", domain: ".com.eg" },
  { code: "GH", name: "Ghana", domain: ".com.gh" },
  { code: "CI", name: "Ivory Coast", domain: ".ci" },
  { code: "KE", name: "Kenya", domain: ".co.ke" },
  { code: "MA", name: "Morocco", domain: ".ma" },
  { code: "SN", name: "Senegal", domain: ".sn" },
  { code: "TN", name: "Tunisia", domain: ".com.tn" },
  { code: "UG", name: "Uganda", domain: ".ug" },
];
