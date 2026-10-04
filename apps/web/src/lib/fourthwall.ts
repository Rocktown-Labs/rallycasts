import { env } from "@rallycaststv/env/web";

const API_BASE = "https://storefront-api.fourthwall.com/v1";
const DEFAULT_CURRENCY = "USD";
const PAGE_SIZE = 50;

export interface FwCollection {
  description: string;
  id: string;
  name: string;
  slug: string;
}

export interface FwMoney {
  currency: string;
  value: number;
}

export interface FwImage {
  height: number;
  id?: string;
  transformedUrl?: string;
  url: string;
  width: number;
}

export interface FwStock {
  inStock?: number;
  type: string;
}

export interface FwAdditionalInformation {
  bodyHtml: string;
  title: string;
  type: string;
}

export interface FwSizeGuide {
  description?: string;
  fileUrl?: string;
  fitGuideDescription?: string;
  fitGuideUrls?: string[];
  previewUrl?: string;
}

export interface FwVariant {
  attributes: {
    color?: { name: string; swatch?: string };
    description: string;
    size?: { name: string };
  };
  compareAtPrice?: FwMoney;
  id: string;
  images: FwImage[];
  name: string;
  sku: string;
  stock?: FwStock;
  unitPrice: FwMoney;
}

export interface FwProduct {
  access?: { type: string };
  additionalInformation?: FwAdditionalInformation[];
  description: string;
  id: string;
  images: FwImage[];
  name: string;
  sizeGuide?: FwSizeGuide;
  slug: string;
  state: { type: "AVAILABLE" | "SOLD_OUT" };
  type: "PRODUCT";
  variants: FwVariant[];
}

export interface FwBundle {
  access?: { type: string };
  additionalInformation?: FwAdditionalInformation[];
  compareAtPrice?: FwMoney;
  description?: string;
  id: string;
  images?: FwImage[];
  name: string;
  offers: FwProduct[];
  price: FwMoney;
  pricingStrategy:
    | { discountPercentage: number; type: "DISCOUNT_BASED" }
    | { price: FwMoney; type: "FIXED_PRICE" }
    | { type: "SAME_AS_INDIVIDUAL" };
  sizeGuide?: FwSizeGuide;
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

export type { FwPage };

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

/** Fetch every public collection. */
export const fetchCollections = async (): Promise<FwCollection[]> => {
  const collections: FwCollection[] = [];
  let page = 0;
  let hasNextPage = true;
  while (hasNextPage) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- pagination: each page's existence depends on the previous response
    const data = await request<FwPage<FwCollection>>(
      `/collections?page=${page}&size=${PAGE_SIZE}`
    );
    collections.push(...data.results);
    ({ hasNextPage } = data.paging);
    page += 1;
  }
  return collections;
};

/** Fetch one page of products from a collection (or the built-in `all` collection). */
export const fetchCollectionProducts = (
  slug: string,
  page = 0
): Promise<FwPage<FwOffer>> =>
  request<FwPage<FwOffer>>(
    `/collections/${encodeURIComponent(slug)}/products?page=${page}&size=${PAGE_SIZE}`
  );

/** Fetch every public product via the built-in `all` collection. */
export const fetchAllProducts = async (): Promise<FwOffer[]> => {
  const offers: FwOffer[] = [];
  let page = 0;
  let hasNextPage = true;
  while (hasNextPage) {
    // oxlint-disable-next-line eslint/no-await-in-loop -- pagination: each page's existence depends on the previous response
    const data = await fetchCollectionProducts("all", page);
    offers.push(...data.results);
    ({ hasNextPage } = data.paging);
    page += 1;
  }
  return offers;
};

/** Fetch one product or bundle by its URL slug. */
export const fetchProductBySlug = (slug: string): Promise<FwOffer> =>
  request<FwOffer>(`/products/${encodeURIComponent(slug)}`);

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

/** Gallery images for an offer: the selected variant's photos when available. */
export const offerImagesFor = (
  offer: FwOffer,
  variantId?: string
): FwImage[] => {
  if (offer.type === "PRODUCT") {
    const variant = offer.variants.find(
      (candidate) => candidate.id === variantId
    );
    if (variant?.images.length) {
      return variant.images;
    }
    return offer.images;
  }
  if (offer.images?.length) {
    return offer.images;
  }
  return offer.offers[0]?.images ?? [];
};

export interface FwProductOption {
  id: "color" | "size";
  name: string;
  values: { swatch?: string; value: string }[];
}

export const productOptionsFor = (product: FwProduct): FwProductOption[] => {
  const colors = new Map<string, string | undefined>();
  const sizes = new Set<string>();

  for (const variant of product.variants) {
    if (variant.attributes.color) {
      colors.set(
        variant.attributes.color.name,
        variant.attributes.color.swatch
      );
    }
    if (variant.attributes.size) {
      sizes.add(variant.attributes.size.name);
    }
  }

  const options: FwProductOption[] = [];
  if (colors.size > 0) {
    options.push({
      id: "color",
      name: "Color",
      values: [...colors].map(([value, swatch]) => ({ swatch, value })),
    });
  }
  if (sizes.size > 0) {
    options.push({
      id: "size",
      name: "Size",
      values: [...sizes].map((value) => ({ value })),
    });
  }
  return options;
};

export const findVariantByOptions = (
  product: FwProduct,
  selected: { color?: string; size?: string }
): FwVariant | undefined =>
  product.variants.find((variant) => {
    const colorMatch =
      !selected.color || variant.attributes.color?.name === selected.color;
    const sizeMatch =
      !selected.size || variant.attributes.size?.name === selected.size;
    return colorMatch && sizeMatch;
  });

/** True when a variant is tracked as LIMITED stock and has none left. */
export const isVariantOutOfStock = (
  variant: Pick<FwVariant, "stock"> | undefined | null
): boolean => {
  const stock = variant?.stock;
  return stock?.type === "LIMITED" && (stock.inStock ?? 0) <= 0;
};

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
