export type Category =
  | "Utilidades"
  | "Eletronicos"
  | "Presentes"
  | "Acessorios"
  | "Organizacao"
  | "Skincare"
  | "Sazonais"
  | "Promocoes";

export type ProductTag = "featured" | "bestSeller" | "promotion" | "new";

export type UserRole = "ADMIN" | "CUSTOMER";
export type PaymentMethodChoice = "PIX" | "CARD";
/** Entrega pela transportadora vs retirada na loja (sem frete). */
export type FulfillmentType = "SHIP" | "PICKUP";

export type Product = {
  id: string;
  slug: string;
  name: string;
  category: Category;
  price: number;
  /** Custo unitario (CMV), quando cadastrado no admin — usado em relatorios. */
  cost?: number;
  originalPrice?: number;
  pixDiscountPercent: number;
  installment: {
    quantity: number;
    amount: number;
  };
  stock: number;
  rating: number;
  reviews: number;
  shortDescription: string;
  description: string;
  features: string[];
  badge?: string;
  sku: string;
  coverImage?: string;
  images: string[];
  tags: ProductTag[];
  /** Presente em produtos vindos do admin / Prisma; vitrine pode ignorar. */
  published?: boolean;
  /** ISO 8601 — Oferta Relâmpago ativa até este instante (null = sem oferta). */
  flashSaleEndsAt?: string | null;
  /** Percentual exibido na Oferta Relâmpago (1–99), definido no admin; null = usar preços ou legado. */
  flashSaleDiscountPercent?: number | null;
  /** Embalagem fechada (cm/kg) para Melhor Envio; null = SHIPPING_DEFAULT_* no .env. */
  packageWidthCm?: number | null;
  packageHeightCm?: number | null;
  packageLengthCm?: number | null;
  packageWeightKg?: number | null;
};

export type Testimonial = {
  id: string;
  name: string;
  city: string;
  quote: string;
  rating: number;
  reviewedAt?: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
};

export type CatalogFilters = {
  categories: Category[];
  priceRanges: { label: string; min: number; max: number | null }[];
  sortOptions: { value: string; label: string }[];
};
