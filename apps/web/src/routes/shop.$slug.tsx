import { buttonVariants } from "@rallycaststv/ui/components/button";
import { Skeleton } from "@rallycaststv/ui/components/skeleton";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import { Check, ChevronLeft, Package, Ruler, ShoppingBag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import {
  AddToCartControls,
  VariantSelector,
} from "@/components/shop/product-controls";
import {
  displayPriceFor,
  findVariantByOptions,
  formatMoney,
  imageUrlFor,
  isFourthwallEnabled,
  isVariantOutOfStock,
  offerImagesFor,
} from "@/lib/fourthwall";
import type { FwOffer, FwProduct } from "@/lib/fourthwall";
import { useShopProduct } from "@/lib/hooks/use-shop";

export const Route = createFileRoute("/shop/$slug")({
  component: ProductDetailPage,
  loader: () => ({ enabled: isFourthwallEnabled() }),
  staleTime: 60_000,
});

function ProductDetailPage() {
  const { slug } = Route.useParams();
  const { enabled } = Route.useLoaderData();

  if (!enabled) {
    return <LaunchingSoon slug={slug} />;
  }

  return <ProductDetail slug={slug} />;
}

function LaunchingSoon({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 text-center">
      <Package className="mx-auto size-10 text-muted-foreground" />
      <h1 className="mt-4 text-2xl font-black">{slug}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        The storefront is launching soon. Check back to see this product.
      </p>
      <Link
        className={cn(
          buttonVariants({ variant: "outline" }),
          "mt-6 rounded-lg"
        )}
        to="/shop"
      >
        <ChevronLeft className="size-4" /> Back to shop
      </Link>
    </main>
  );
}

function ProductDetail({ slug }: { slug: string }) {
  const { data: offer, error, isLoading } = useShopProduct(slug);
  const [selectedOptions, setSelectedOptions] = useState<{
    color?: string;
    size?: string;
  }>({});

  const product: FwProduct | null =
    offer && offer.type === "PRODUCT" ? offer : null;

  const selectedVariant = useMemo(() => {
    if (!product) {
      return;
    }
    const [firstVariant] = product.variants;
    return findVariantByOptions(product, selectedOptions) ?? firstVariant;
  }, [product, selectedOptions]);

  // Seed the selector with the first variant once the offer arrives.
  useEffect(() => {
    if (!product) {
      return;
    }
    const [firstVariant] = product.variants;
    setSelectedOptions((prev) => {
      const seeded = {
        color: prev.color ?? firstVariant?.attributes.color?.name,
        size: prev.size ?? firstVariant?.attributes.size?.name,
      };
      const matchesCurrent =
        seeded.color === prev.color && seeded.size === prev.size;
      return matchesCurrent ? prev : seeded;
    });
  }, [product]);

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !offer) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <Package className="mx-auto size-10 text-muted-foreground" />
        <h1 className="mt-4 text-2xl font-black">Product not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This product may have sold out or moved. Browse the shop for the
          latest drop.
        </p>
        <Link
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-6 rounded-lg"
          )}
          to="/shop"
        >
          <ChevronLeft className="size-4" /> Back to shop
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Link
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
        to="/shop"
      >
        <ChevronLeft className="size-4" /> Back to shop
      </Link>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <ProductGallery offer={offer} variantId={selectedVariant?.id} />
        <ProductInfo
          offer={offer}
          product={product}
          selectedOptions={selectedOptions}
          selectedVariant={selectedVariant}
          onSelectOption={(id, value) =>
            setSelectedOptions((prev) => ({ ...prev, [id]: value }))
          }
        />
      </div>
    </main>
  );
}

function ProductGallery({
  offer,
  variantId,
}: {
  offer: FwOffer;
  variantId?: string;
}) {
  const images = useMemo(
    () => offerImagesFor(offer, variantId),
    [offer, variantId]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  // New variant means a new gallery: reset the index. Adjusting state
  // during render is the sanctioned React pattern: no stale frame, no
  // extra effect.
  const [previousImages, setPreviousImages] = useState(images);
  if (previousImages !== images) {
    setPreviousImages(images);
    setActiveIndex(0);
  }

  const activeImage = images[activeIndex] ?? images[0];
  const activeImageUrl = imageUrlFor(activeImage);
  const soldOut = offer.state.type === "SOLD_OUT";

  return (
    <div className="space-y-3">
      <div className="relative aspect-square overflow-hidden rounded-2xl border bg-muted">
        {activeImageUrl ? (
          <img
            alt={offer.name}
            className="absolute inset-0 size-full object-cover"
            src={activeImageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center">
            <Package className="size-12 text-muted-foreground" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {offer.type === "BUNDLE" ? (
            <span className="rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-primary-foreground">
              Bundle
            </span>
          ) : null}
          {soldOut ? (
            <span className="rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-destructive-foreground">
              Sold out
            </span>
          ) : null}
        </div>
      </div>

      {images.length > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((image, index) => {
            const url = imageUrlFor(image);
            if (!url) {
              return null;
            }
            return (
              <button
                aria-label={`View image ${index + 1} of ${images.length}`}
                className={cn(
                  "size-20 shrink-0 overflow-hidden rounded-lg border transition-all",
                  index === activeIndex
                    ? "border-primary ring-2 ring-primary/60"
                    : "border-border opacity-70 hover:opacity-100"
                )}
                key={image.id ?? url}
                onClick={() => setActiveIndex(index)}
                type="button"
              >
                <img
                  alt=""
                  className="size-full object-cover"
                  loading="lazy"
                  src={url}
                />
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

function ProductInfo({
  offer,
  product,
  selectedOptions,
  selectedVariant,
  onSelectOption,
}: {
  offer: FwOffer;
  product: FwProduct | null;
  selectedOptions: { color?: string; size?: string };
  selectedVariant: ReturnType<typeof findVariantByOptions>;
  onSelectOption: (id: "color" | "size", value: string) => void;
}) {
  const isBundle = offer.type === "BUNDLE";
  const soldOut = offer.state.type === "SOLD_OUT";
  const outOfStock = isVariantOutOfStock(selectedVariant);

  const price = isBundle ? displayPriceFor(offer) : selectedVariant?.unitPrice;
  const compareAtPrice = isBundle
    ? offer.compareAtPrice
    : selectedVariant?.compareAtPrice;

  return (
    <div>
      <h1 className="text-3xl font-black tracking-tight md:text-4xl">
        {offer.name}
      </h1>

      <div className="mt-3 flex items-baseline gap-2">
        {price ? (
          <span className="text-2xl font-black">{formatMoney(price)}</span>
        ) : null}
        {compareAtPrice ? (
          <span className="text-sm text-muted-foreground line-through">
            {formatMoney(compareAtPrice)}
          </span>
        ) : null}
      </div>

      {offer.description ? (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">
          {offer.description}
        </p>
      ) : null}

      {product && product.variants.length > 1 ? (
        <div className="mt-6">
          <VariantSelector
            product={product}
            selectedOptions={selectedOptions}
            onSelect={onSelectOption}
          />
        </div>
      ) : null}

      <StockLine selectedVariant={selectedVariant} />

      <AddToCartControls
        offer={offer}
        soldOut={soldOut || outOfStock}
        variantId={selectedVariant?.id}
      />

      {isBundle && offer.offers.length > 0 ? (
        <BundleContents offers={offer.offers} />
      ) : null}

      <ProductDetailsSections offer={offer} />
    </div>
  );
}

function StockLine({
  selectedVariant,
}: {
  selectedVariant: ReturnType<typeof findVariantByOptions>;
}) {
  const stock = selectedVariant?.stock;
  if (!stock) {
    return null;
  }

  const inStock = stock.type === "LIMITED" ? (stock.inStock ?? 0) : null;

  let message = "In stock";
  let tone = "muted";
  if (inStock !== null && inStock <= 0) {
    message = "Sold out in this option";
    tone = "error";
  } else if (inStock !== null && inStock <= 10) {
    message = `Only ${inStock} left in this option`;
    tone = "warn";
  }

  return (
    <p
      className={cn(
        "mt-3 text-xs font-semibold",
        tone === "error" && "text-destructive",
        tone === "warn" && "text-amber-600 dark:text-amber-400",
        tone === "muted" && "text-muted-foreground"
      )}
    >
      {message}
    </p>
  );
}

function BundleContents({ offers }: { offers: FwProduct[] }) {
  return (
    <div className="mt-8">
      <h2 className="text-sm font-black uppercase tracking-[0.14em] text-primary">
        What’s included
      </h2>
      <ul className="mt-3 space-y-2">
        {offers.map((bundled) => {
          const bundledImageUrl = imageUrlFor(bundled.images[0]);
          const bundledPrice = displayPriceFor(bundled);
          return (
            <li
              className="flex items-center gap-3 rounded-lg border bg-card p-3"
              key={bundled.id}
            >
              {bundledImageUrl ? (
                <img
                  alt={bundled.name}
                  className="size-12 rounded-md object-cover"
                  loading="lazy"
                  src={bundledImageUrl}
                />
              ) : (
                <div className="grid size-12 place-items-center rounded-md bg-muted">
                  <ShoppingBag className="size-4 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{bundled.name}</p>
                <p className="text-xs text-muted-foreground">
                  {bundledPrice ? formatMoney(bundledPrice) : "—"}
                </p>
              </div>
              <Check className="size-4 shrink-0 text-primary" />
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/**
 * Fourthwall product descriptions are merchant-authored HTML. Sanitize
 * before injecting; the section renders client-side only, so DOMPurify's
 * browser DOM is always available here.
 */
const sanitizeMerchantHtml = (html: string | null | undefined): string => {
  if (!html || typeof window === "undefined") {
    return "";
  }
  return DOMPurify.sanitize(html);
};

function ProductDetailsSections({ offer }: { offer: FwOffer }) {
  return (
    <>
      {offer.additionalInformation?.length ? (
        <div className="mt-8 space-y-4">
          {offer.additionalInformation.map((section) => (
            <div key={`${section.type}-${section.title}`}>
              <h2 className="text-sm font-black">{section.title}</h2>
              {/* Merchant-authored HTML from Fourthwall product details,
                  sanitized client-side before injection. */}
              <div
                className="mt-2 text-sm leading-6 text-muted-foreground [&_a]:text-primary [&_a]:underline"
                dangerouslySetInnerHTML={{
                  __html: sanitizeMerchantHtml(section.bodyHtml),
                }}
              />
            </div>
          ))}
        </div>
      ) : null}

      {offer.sizeGuide?.previewUrl ? (
        <a
          className={cn(
            buttonVariants({ variant: "outline" }),
            "mt-8 rounded-lg"
          )}
          href={offer.sizeGuide.previewUrl}
          rel="noopener noreferrer"
          target="_blank"
        >
          <Ruler className="size-4" /> Size guide
        </a>
      ) : null}
    </>
  );
}

function ProductDetailSkeleton() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <Skeleton className="h-4 w-24" />
      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <Skeleton className="aspect-square w-full rounded-2xl" />
        <div className="space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-9 w-full" />
        </div>
      </div>
    </main>
  );
}
