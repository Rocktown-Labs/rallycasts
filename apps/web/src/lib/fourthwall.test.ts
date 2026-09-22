import { describe, expect, it } from "vitest";

import {
  cartItemsFor,
  checkoutUrlFor,
  displayPriceFor,
  formatMoney,
  imageUrlFor,
} from "./fourthwall";
import type { FwBundle, FwProduct } from "./fourthwall";

const usd = (value: number) => ({ currency: "USD", value });

const product: FwProduct = {
  description: "Court-ready tee",
  id: "offer-1",
  images: [
    {
      height: 600,
      transformedUrl: "https://cdn.fourthwall.com/tee-small.png",
      url: "https://cdn.fourthwall.com/tee.png",
      width: 800,
    },
  ],
  name: "RallyCasts court tee",
  slug: "rallycasts-court-tee",
  state: { type: "AVAILABLE" },
  type: "PRODUCT",
  variants: [
    {
      attributes: { description: "Black, M" },
      id: "variant-m",
      images: [],
      name: "Black / M",
      sku: "TEE-BLK-M",
      unitPrice: usd(32),
    },
    {
      attributes: { description: "Black, 3XL" },
      compareAtPrice: usd(40),
      id: "variant-3xl",
      images: [],
      name: "Black / 3XL",
      sku: "TEE-BLK-3XL",
      unitPrice: usd(36),
    },
  ],
};

const bundle: FwBundle = {
  id: "bundle-1",
  name: "Match day bundle",
  offers: [product],
  price: usd(50),
  pricingStrategy: { discountPercentage: 10, type: "DISCOUNT_BASED" },
  slug: "match-day-bundle",
  state: { type: "AVAILABLE" },
  type: "BUNDLE",
};

describe("formatMoney", () => {
  it("formats USD amounts", () => {
    expect(formatMoney(usd(32))).toBe("$32.00");
    expect(formatMoney(usd(21.42))).toBe("$21.42");
  });
});

describe("imageUrlFor", () => {
  it("prefers the transformed URL and falls back to the original", () => {
    expect(imageUrlFor(product.images[0])).toBe(
      "https://cdn.fourthwall.com/tee-small.png"
    );
    expect(
      imageUrlFor({ height: 1, url: "https://x.test/a.png", width: 1 })
    ).toBe("https://x.test/a.png");
    expect(imageUrlFor()).toBeUndefined();
  });
});

describe("displayPriceFor", () => {
  it("returns the cheapest variant price for products", () => {
    expect(displayPriceFor(product)).toEqual(usd(32));
  });

  it("returns the bundle price for bundles", () => {
    expect(displayPriceFor(bundle)).toEqual(usd(50));
  });
});

describe("cartItemsFor", () => {
  it("uses the selected variant when provided", () => {
    expect(cartItemsFor(product, "variant-3xl", 2)).toEqual([
      { quantity: 2, variantId: "variant-3xl" },
    ]);
  });

  it("falls back to the first variant", () => {
    expect(cartItemsFor(product)).toEqual([
      { quantity: 1, variantId: "variant-m" },
    ]);
  });

  it("expands bundles into one item per bundled product", () => {
    expect(cartItemsFor(bundle)).toEqual([
      { bundleId: "bundle-1", quantity: 1, variantId: "variant-m" },
    ]);
  });
});

describe("checkoutUrlFor", () => {
  it("builds the hosted checkout handoff URL from the storefront host", () => {
    expect(
      checkoutUrlFor("cart-123", "https://shop.rallycasts.com/some/path")
    ).toBe(
      "https://shop.rallycasts.com/cart/checkout?cartId=cart-123&currency=USD"
    );
  });

  it("throws when the storefront URL is missing", () => {
    expect(() => checkoutUrlFor("cart-123")).toThrow(
      "storefront URL is not configured"
    );
  });
});
