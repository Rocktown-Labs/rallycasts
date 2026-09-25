import { env } from "@rallycaststv/env/web";

const API_BASE = "https://storefront-api.fourthwall.com/v1";
const DEFAULT_CURRENCY = "USD";
const PAGE_SIZE = 50;

export interface FwMoney {
  currency: string;
  value: number;
}

export interface FwImage {
  height: number;
  transformedUrl?: string;
  url: string;
  width: number;
}

export interface FwVariant {
  attributes: {
    color?: { name: string };
    description: string;
    size?: { name: string };
  };
  compareAtPrice?: FwMoney;
  id: string;
  images: FwImage[];
  name: string;
  sku: string;
  unitPrice: FwMoney;
}

export interface FwProduct {
  description: string;
  id: string;
  images: FwImage[];
  name: string;
  slug: string;
  state: { type: "AVAILABLE" | "SOLD_OUT" };
  type: "PRODUCT";
  variants: FwVariant[];
}

export interface FwBundle {
  compareAtPrice?: FwMoney;
  id: string;
  name: string;
  offers: FwProduct[];
  price: FwMoney;
  pricingStrategy:
    | { discountPercentage: number; type: "DISCOUNT_BASED" }
    | { price: FwMoney; type: "FIXED_PRICE" }
    | { type: "SAME_AS_INDIVIDUAL" };
  slug: string;
  state: { type: "AVAILABLE" | "SOLD_OUT" };
  type: "BUNDLE";
}

export type FwOffer = FwBundle | FwProduct;

export interface FwCartItem {
  groupedBy?: { bundleId: string; groupedId: string; type: "BUNDLE" };
  quantity: number;
  variant: FwVariant & { product: { id: string; name: string; slug: string } };
}

export interface FwCart {
  id: string;
  items: FwCartItem[];
}

export interface FwCartRequestItem {
  bundleId?: string;
  quantity: number;
  variantId: string;
}

interface FwPage<T> {
  paging: {
    hasNextPage: boolean;
  };
  results: T[];
}

export const isFourthwallEnabled = () =>
  Boolean(env.VITE_FOURTHWALL_STOREFRONT_TOKEN);

const storefrontUrl = (path: string) => {
  const token = env.VITE_FOURTHWALL_STOREFRONT_TOKEN;
  if (!token) {
    throw new Error("Fourthwall storefront token is not configured");
  }
  const separator = path.includes("?") ? "&" : "?";
  return `${API_BASE}${path}${separator}storefront_token=${token}&currency=${DEFAULT_CURRENCY}`;
};

const request = async <T>(path: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(storefrontUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    throw new Error(`Fourthwall request failed: ${response.status}`);
  }
  return (await response.json()) as T;
};

/** Fetch every public product via the built-in `all` collection. */
export const fetchAllProducts = async (): Promise<FwOffer[]> => {
  const offers: FwOffer[] = [];
  let page = 0;
  let hasNextPage = true;
  while (hasNextPage) {
    const data = await request<FwPage<FwOffer>>(
      `/collections/all/products?page=${page}&size=${PAGE_SIZE}`
    );
    offers.push(...data.results);
    ({ hasNextPage } = data.paging);
    page += 1;
  }
  return offers;
};

const cartRequest = (path: string, items: FwCartRequestItem[]) =>
  request<FwCart>(path, { body: JSON.stringify({ items }), method: "POST" });

export const createCart = (items: FwCartRequestItem[] = []) =>
  cartRequest("/carts", items);

export const getCart = (cartId: string) => request<FwCart>(`/carts/${cartId}`);

export const addToCart = (cartId: string, items: FwCartRequestItem[]) =>
  cartRequest(`/carts/${cartId}/add`, items);

export const changeCartQuantity = (
  cartId: string,
  items: FwCartRequestItem[]
) => cartRequest(`/carts/${cartId}/change`, items);

export const removeFromCart = (cartId: string, variantIds: string[]) =>
  cartRequest(
    `/carts/${cartId}/remove`,
    variantIds.map((variantId) => ({ quantity: 0, variantId }))
  );

/** Hosted-checkout handoff for an existing cart. */
export const checkoutUrlFor = (
  cartId: string,
  storefront: string | undefined = env.VITE_FOURTHWALL_STOREFRONT_URL
): string => {
  if (!storefront) {
    throw new Error("Fourthwall storefront URL is not configured");
  }
  const host = new URL(storefront).hostname;
  const params = new URLSearchParams({
    cartId,
    currency: DEFAULT_CURRENCY,
  });
  return `https://${host}/cart/checkout?${params.toString()}`;
};

export const formatMoney = (money: FwMoney): string =>
  new Intl.NumberFormat("en-US", {
    currency: money.currency,
    style: "currency",
  }).format(money.value);

export const imageUrlFor = (image?: FwImage): string | undefined =>
  image?.transformedUrl ?? image?.url;

/** Cheapest variant price for a product card; bundle price for bundles. */
export const displayPriceFor = (offer: FwOffer): FwMoney | undefined => {
  if (offer.type === "BUNDLE") {
    return offer.price;
  }
  let cheapest: FwMoney | undefined;
  for (const variant of offer.variants) {
    if (!cheapest || variant.unitPrice.value < cheapest.value) {
      cheapest = variant.unitPrice;
    }
  }
  return cheapest;
};

/** Cart request items for an offer: one variant, or one per bundled product. */
export const cartItemsFor = (
  offer: FwOffer,
  variantId?: string,
  quantity = 1
): FwCartRequestItem[] => {
  if (offer.type === "BUNDLE") {
    return offer.offers.flatMap((product) => {
      const [variant] = product.variants;
      return variant
        ? [{ bundleId: offer.id, quantity, variantId: variant.id }]
        : [];
    });
  }
  const [firstVariant] = offer.variants;
  const variant =
    offer.variants.find((candidate) => candidate.id === variantId) ??
    firstVariant;
  return variant ? [{ quantity, variantId: variant.id }] : [];
};
