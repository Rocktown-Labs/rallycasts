import { env } from "@rallycaststv/env/web";
import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { Skeleton } from "@rallycaststv/ui/components/skeleton";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowUpRight, Package, ShoppingBag, Trophy } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { z } from "zod";

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
} from "@/lib/fourthwall";
import type {
  FwCollection,
  FwImage,
  FwOffer,
  FwProduct,
} from "@/lib/fourthwall";
import { useShopCollections, useShopOffers } from "@/lib/hooks/use-shop";

const shopSearchSchema = z.object({
  collection: z.string().optional(),
});

export const Route = createFileRoute("/shop/")({
  component: ShopPage,
  loader: () => ({ enabled: isFourthwallEnabled() }),
  staleTime: 60_000,
  validateSearch: shopSearchSchema,
});

const merchPreview = [
  {
    description: "Court-ready heavyweight tee with the RallyCasts mark.",
    label: "RallyCasts court tee",
  },
  {
    description: "A clean lid for open play, league night, and tournament day.",
    label: "Baseline cap",
  },
  {
    description: "The post-match layer for players, casters, and organizers.",
    label: "After-rally hoodie",
  },
] as const;

function ShopPage() {
  const { enabled } = Route.useLoaderData();
  const { collection } = Route.useSearch();
  const selectedSlug = collection ?? "all";

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-6">
      <HeroSection hasOffers={enabled} />
      {enabled ? <ShopSection selectedSlug={selectedSlug} /> : <PreviewGrid />}
    </main>
  );
}

function HeroSection({ hasOffers }: { hasOffers: boolean }) {
  const storefrontUrl = env.VITE_FOURTHWALL_STOREFRONT_URL;

  return (
    <section className="relative overflow-hidden rounded-2xl bg-primary p-6 text-white shadow-xl sm:p-8">
      <div className="relative z-10 max-w-2xl space-y-2">
        <div className="inline-flex items-center gap-1.5 rounded-md bg-secondary/20 px-2.5 py-1 text-xs font-semibold text-[#bcdf21]">
          <span>RallyCasts supply</span>
        </div>
        <h1 className="text-3xl font-logo sm:text-4xl tracking-wide lowercase">
          shop
        </h1>
        <p className="text-sm text-gray-200 sm:text-base leading-relaxed">
          Merch for the people playing, filming, and building pickleball
          culture. Orders are fulfilled through our connected commerce partner,
          so RallyCasts never stores card details.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {hasOffers ? (
            <a
              className={cn(
                buttonVariants(),
                "rounded-lg bg-[#bcdf21] font-semibold text-black hover:bg-[#d3f34b]"
              )}
              href="#shop-gallery"
            >
              <ShoppingBag className="size-4" /> Browse products
            </a>
          ) : (
            <Button className="rounded-lg bg-white/15 text-white" disabled>
              Storefront launching soon
            </Button>
          )}
          {storefrontUrl && (
            <a
              className={cn(
                buttonVariants({ variant: "outline" }),
                "rounded-lg border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              )}
              href={storefrontUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Visit storefront <ArrowUpRight className="size-4" />
            </a>
          )}
          <Link
            className={cn(
              buttonVariants({ variant: "outline" }),
              "rounded-lg border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            )}
            to="/events"
          >
            <Trophy className="size-4" /> Find an event
          </Link>
        </div>
      </div>
    </section>
  );
}

function ShopSection({ selectedSlug }: { selectedSlug: string }) {
  const {
    data: collections,
    error: collectionsError,
    isLoading: collectionsLoading,
  } = useShopCollections();

  let filterContent: ReactNode;
  if (collectionsLoading) {
    filterContent = <FilterSkeleton />;
  } else if (collectionsError) {
    filterContent = (
      <p className="text-sm text-destructive">
        Couldn’t load collections. Try reloading the page.
      </p>
    );
  } else {
    filterContent = (
      <CollectionFilter
        collections={collections ?? []}
        selectedSlug={selectedSlug}
      />
    );
  }

  return (
    <section id="shop-gallery">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
            The shop
          </p>
          <h2 className="mt-1 text-2xl font-black">Built for court days</h2>
        </div>
        <ShoppingBag className="size-6 text-primary" />
      </div>

      {filterContent}

      <ProductGallery selectedSlug={selectedSlug} />
    </section>
  );
}

function FilterSkeleton() {
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton className="h-9 w-24 rounded-lg" key={index} />
      ))}
    </div>
  );
}

function CollectionFilter({
  collections,
  selectedSlug,
}: {
  collections: FwCollection[];
  selectedSlug: string;
}) {
  const navigate = useNavigate({ from: "/shop/" });

  const tabs = useMemo(
    () => [{ id: "all", name: "All", slug: "all" }, ...collections],
    [collections]
  );

  const selectCollection = (slug: string) => {
    void navigate({
      search: (prev: { collection?: string }) => ({
        ...prev,
        collection: slug === "all" ? undefined : slug,
      }),
    });
  };

  return (
    <div className="mb-6 flex flex-wrap gap-2">
      {tabs.map((collection) => {
        const active = collection.slug === selectedSlug;
        return (
          <Button
            className={cn(
              "rounded-lg transition-colors",
              active
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "border bg-background text-foreground hover:bg-muted"
            )}
            key={collection.slug}
            onClick={() => selectCollection(collection.slug)}
            variant={active ? "default" : "outline"}
          >
            {collection.name}
          </Button>
        );
      })}
    </div>
  );
}

function ProductGallery({ selectedSlug }: { selectedSlug: string }) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useShopOffers(selectedSlug);

  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = sentinelRef.current;
    if (!element || !hasNextPage) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "200px" }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const offers = useMemo(
    () => data?.pages.flatMap((page) => page.results) ?? [],
    [data]
  );

  if (isLoading) {
    return <ProductSkeleton />;
  }

  if (error) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed py-16 text-center">
        <Package className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          Couldn’t load products. Try again in a moment.
        </p>
      </div>
    );
  }

  if (offers.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed py-16 text-center">
        <Package className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No products in this collection yet — the next drop is on its way.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {offers.map((offer) => (
          <ProductCard key={`${selectedSlug}-${offer.id}`} offer={offer} />
        ))}
      </div>
      <div aria-hidden="true" className="h-4" ref={sentinelRef} />
      {isFetchingNextPage && <ProductSkeleton count={3} />}
    </>
  );
}

function ProductSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, index) => (
        <div
          className="flex flex-col overflow-hidden rounded-2xl border bg-card"
          key={index}
        >
          <Skeleton className="aspect-[4/3] w-full" />
          <div className="space-y-3 p-5">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

function PreviewGrid() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {merchPreview.map((item, index) => (
        <article
          className="overflow-hidden rounded-2xl border bg-card"
          key={item.label}
        >
          <div className="grid aspect-[4/3] place-items-center bg-[linear-gradient(145deg,hsl(var(--muted)),hsl(142_100%_18%/.2))]">
            <span className="font-logo text-5xl text-primary/70">
              {String(index + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="p-5">
            <h3 className="font-bold">{item.label}</h3>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {item.description}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

function ProductCard({ offer }: { offer: FwOffer }) {
  const isBundle = offer.type === "BUNDLE";
  const product = isBundle ? null : (offer as FwProduct);

  const firstVariant = product?.variants[0];
  const initialOptions = useMemo(
    () => ({
      color: firstVariant?.attributes.color?.name,
      size: firstVariant?.attributes.size?.name,
    }),
    [firstVariant]
  );
  const [selectedOptions, setSelectedOptions] = useState(initialOptions);
  // Reset the selection when the product's option set changes. Adjusting
  // state during render is the sanctioned React pattern: no stale frame,
  // no extra effect.
  const [previousInitialOptions, setPreviousInitialOptions] =
    useState(initialOptions);
  if (previousInitialOptions !== initialOptions) {
    setPreviousInitialOptions(initialOptions);
    setSelectedOptions(initialOptions);
  }

  const selectedVariant = product
    ? (findVariantByOptions(product, selectedOptions) ?? firstVariant)
    : undefined;

  const soldOut =
    offer.state.type === "SOLD_OUT" || isVariantOutOfStock(selectedVariant);
  const price = isBundle ? displayPriceFor(offer) : selectedVariant?.unitPrice;

  // Prefer the selected variant's photos so color choices swap the image.
  const coverImage = useMemo(() => {
    if (offer.type === "BUNDLE") {
      return offer.offers[0]?.images[0];
    }
    return selectedVariant?.images[0] ?? offer.images[0];
  }, [offer, selectedVariant]);

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <Link
        aria-label={`${offer.name} details`}
        className="group"
        params={{ slug: offer.slug }}
        to="/shop/$slug"
      >
        <ProductImage image={coverImage} name={offer.name} offer={offer} />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-bold">
          <Link
            className="hover:underline"
            params={{ slug: offer.slug }}
            to="/shop/$slug"
          >
            {offer.name}
          </Link>
        </h3>
        {offer.description ? (
          <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
            {offer.description}
          </p>
        ) : null}
        <div className="mt-2 flex items-baseline gap-2">
          {price ? (
            <span className="text-lg font-black">{formatMoney(price)}</span>
          ) : null}
          {selectedVariant?.compareAtPrice ? (
            <span className="text-sm text-muted-foreground line-through">
              {formatMoney(selectedVariant.compareAtPrice)}
            </span>
          ) : null}
        </div>
        {product && product.variants.length > 1 ? (
          <div className="mt-4">
            <VariantSelector
              product={product}
              selectedOptions={selectedOptions}
              onSelect={(id, value) =>
                setSelectedOptions((prev) => ({ ...prev, [id]: value }))
              }
            />
          </div>
        ) : null}
        <AddToCartControls
          offer={offer}
          soldOut={soldOut}
          variantId={selectedVariant?.id}
        />
      </div>
    </article>
  );
}

function ProductImage({
  image,
  name,
  offer,
}: {
  image?: FwImage;
  name: string;
  offer: FwOffer;
}) {
  const imageUrl = imageUrlFor(image);
  const soldOut = offer.state.type === "SOLD_OUT";

  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-muted">
      {imageUrl ? (
        <img
          alt={name}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
          src={imageUrl}
        />
      ) : (
        <div className="grid size-full place-items-center">
          <Package className="size-10 text-muted-foreground" />
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
  );
}
