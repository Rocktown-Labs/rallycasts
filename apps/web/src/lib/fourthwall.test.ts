import { describe, expect, it, vi } from "vitest";

import {
  cartItemsFor,
  checkoutUrlFor,
  displayPriceFor,
  fetchCollectionProducts,
  fetchCollections,
  fetchProductBySlug,
  findVariantByOptions,
  formatMoney,
  imageUrlFor,
  isVariantOutOfStock,
  offerImagesFor,
  productOptionsFor,
} from "./fourthwall";
import type { FwBundle, FwProduct } from "./fourthwall";

vi.mock("@rallycaststv/env/web", () => ({
  env: {
    VITE_FOURTHWALL_STOREFRONT_TOKEN: "test-token",
  },
}));

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

const productWithOptions: FwProduct = {
  description: "Court-ready tee",
  id: "offer-2",
  images: [],
  name: "RallyCasts option tee",
  slug: "rallycasts-option-tee",
  state: { type: "AVAILABLE" },
  type: "PRODUCT",
  variants: [
    {
      attributes: {
        color: { name: "Black", swatch: "#000000" },
        description: "Black, M",
        size: { name: "M" },
      },
      id: "variant-black-m",
      images: [],
      name: "Black / M",
      sku: "TEE-BLK-M",
      unitPrice: usd(32),
    },
    {
      attributes: {
        color: { name: "White", swatch: "#ffffff" },
        description: "White, L",
        size: { name: "L" },
      },
      id: "variant-white-l",
      images: [],
      name: "White / L",
      sku: "TEE-WHT-L",
      unitPrice: usd(34),
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

describe("fetchCollections", () => {
  it("paginates through collections", async () => {
    const collection = {
      description: "",
      id: "col-1",
      name: "Launch",
      slug: "launch",
    };

    global.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          paging: { hasNextPage: true },
          results: [collection],
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          paging: { hasNextPage: false },
          results: [],
        })
      );

    const result = await fetchCollections();

    expect(result).toEqual([collection]);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});

describe("fetchCollectionProducts", () => {
  it("fetches a single page for the requested collection", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(
      Response.json({
        paging: { hasNextPage: false },
        results: [product],
      })
    );

    const result = await fetchCollectionProducts("launch", 1);

    expect(result.results).toEqual([product]);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/collections/launch/products?page=1"),
      expect.any(Object)
    );
  });
});
describe("productOptionsFor", () => {
  it("derives color and size options from variants", () => {
    const options = productOptionsFor(productWithOptions);

    expect(options).toHaveLength(2);
    expect(options[0]).toEqual({
      id: "color",
      name: "Color",
      values: [
        { swatch: "#000000", value: "Black" },
        { swatch: "#ffffff", value: "White" },
      ],
    });
    expect(options[1]).toEqual({
      id: "size",
      name: "Size",
      values: [{ value: "M" }, { value: "L" }],
    });
  });

  it("returns an empty array when a product has only default variants", () => {
    expect(productOptionsFor(product)).toEqual([]);
  });
});

describe("findVariantByOptions", () => {
  it("finds the variant matching the selected color and size", () => {
    const variant = findVariantByOptions(productWithOptions, {
      color: "White",
      size: "L",
    });

    expect(variant?.id).toBe("variant-white-l");
  });
  it("returns undefined when no variant matches the combination", () => {
    const variant = findVariantByOptions(productWithOptions, {
      color: "White",
      size: "XL",
    });

    expect(variant).toBeUndefined();
  });
});

describe("isVariantOutOfStock", () => {
  it("marks LIMITED stock with none left as out of stock", () => {
    expect(
      isVariantOutOfStock({ stock: { inStock: 0, type: "LIMITED" } })
    ).toBe(true);
  });

  it("keeps LIMITED stock with units and UNLIMITED stock available", () => {
    expect(
      isVariantOutOfStock({ stock: { inStock: 2, type: "LIMITED" } })
    ).toBe(false);
    expect(isVariantOutOfStock({ stock: { type: "UNLIMITED" } })).toBe(false);
  });

  it("treats a missing variant or stock as available", () => {
    expect(isVariantOutOfStock(null)).toBe(false);
    expect(isVariantOutOfStock({})).toBe(false);
  });
});

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

  it("builds the URL from the configured env storefront", () => {
    expect(checkoutUrlFor("cart-123", "https://shop.example.com")).toBe(
      "https://shop.example.com/cart/checkout?cartId=cart-123&currency=USD"
    );
  });

  it("throws when the storefront URL is missing", () => {
    expect(() => checkoutUrlFor("cart-123")).toThrow(
      "storefront URL is not configured"
    );
  });
});

describe("fetchProductBySlug", () => {
  it("fetches a product by its encoded slug", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(Response.json(product));

    const result = await fetchProductBySlug("rallycasts-court-tee");

    expect(result).toEqual(product);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(
        "/products/rallycasts-court-tee?storefront_token=test-token&currency=USD"
      ),
      expect.any(Object)
    );
  });

  it("encodes slugs that contain special characters", async () => {
    global.fetch = vi.fn().mockResolvedValueOnce(Response.json(product));

    await fetchProductBySlug("tee / hat");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/products/tee%20%2F%20hat"),
      expect.any(Object)
    );
  });
});

describe("offerImagesFor", () => {
  const variantImages = [
    {
      height: 600,
      url: "https://cdn.fourthwall.com/tee-white.png",
      width: 800,
    },
  ];

  const variantProduct: FwProduct = {
    ...product,
    variants: [
      { ...product.variants[0], images: [] },
      { ...product.variants[1], images: variantImages },
    ],
  };

  it("returns the selected variant images when the variant has photos", () => {
    expect(offerImagesFor(variantProduct, "variant-3xl")).toEqual(
      variantImages
    );
  });

  it("falls back to product images when the variant has none", () => {
    expect(offerImagesFor(variantProduct, "variant-m")).toEqual(product.images);
  });

  it("falls back to product images when the variant is missing", () => {
    expect(offerImagesFor(product, "nope")).toEqual(product.images);
  });

  it("uses bundle images or the first bundled product for bundles", () => {
    expect(offerImagesFor(bundle)).toEqual(product.images);
    expect(offerImagesFor({ ...bundle, images: variantImages })).toEqual(
      variantImages
    );
  });
});
