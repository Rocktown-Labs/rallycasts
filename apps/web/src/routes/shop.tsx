import { env } from "@rallycaststv/env/web";
import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Package,
  ShoppingBag,
  Sparkles,
  Trophy,
} from "lucide-react";
import { useState } from "react";

import { useCart } from "@/lib/cart";
import {
  cartItemsFor,
  displayPriceFor,
  fetchAllProducts,
  formatMoney,
  imageUrlFor,
  isFourthwallEnabled,
} from "@/lib/fourthwall";
import type { FwOffer, FwProduct } from "@/lib/fourthwall";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
  loader: async (): Promise<{ offers: FwOffer[] | null }> => {
    if (!isFourthwallEnabled()) {
      return { offers: null };
    }
    try {
      return { offers: await fetchAllProducts() };
    } catch {
      return { offers: null };
    }
  },
  staleTime: 60_000,
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
  const { offers } = Route.useLoaderData();
  const storefrontUrl = env.VITE_FOURTHWALL_STOREFRONT_URL;

  return (
    <main className="mx-auto max-w-7xl space-y-10 px-4 py-6">
      <section className="overflow-hidden rounded-3xl border bg-[radial-gradient(circle_at_top_right,hsl(78_100%_60%/.22),transparent_36%),linear-gradient(135deg,hsl(142_100%_18%),hsl(142_80%_8%))] p-8 text-white md:p-12">
        <div className="max-w-3xl">
          <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-[#bcdf21]">
            <Sparkles className="size-4" /> RallyCasts supply
          </p>
          <h1 className="mt-4 text-4xl font-black tracking-tight md:text-6xl">
            Wear the rally.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-white/75 md:text-base">
            Merch for the people playing, filming, and building pickleball
            culture. Orders are fulfilled through our connected commerce
            partner, so RallyCasts never stores card details.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            {storefrontUrl ? (
              <a
                className={cn(
                  buttonVariants(),
                  "bg-[#bcdf21] text-black hover:bg-[#d3f34b]"
                )}
                href={storefrontUrl}
                rel="noopener noreferrer"
                target="_blank"
              >
                Visit storefront <ArrowUpRight className="size-4" />
              </a>
            ) : (
              <Button className="bg-white/15 text-white" disabled>
                Storefront launching soon
              </Button>
            )}
            <Link
              className={cn(
                buttonVariants({ variant: "outline" }),
                "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              )}
              to="/events"
            >
              <Trophy className="size-4" /> Find an event
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
              {offers ? "The shop" : "First drop preview"}
            </p>
            <h2 className="mt-1 text-2xl font-black">Built for court days</h2>
          </div>
          <ShoppingBag className="size-6 text-primary" />
        </div>
        {offers ? <ProductGrid offers={offers} /> : <PreviewGrid />}
      </section>
    </main>
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

function ProductGrid({ offers }: { offers: FwOffer[] }) {
  if (offers.length === 0) {
    return (
      <div className="grid place-items-center rounded-2xl border border-dashed py-16 text-center">
        <Package className="size-8 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">
          No products yet — the first drop is on its way.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer) => (
        <ProductCard key={offer.id} offer={offer} />
      ))}
    </div>
  );
}

// oxlint-disable-next-line complexity
function ProductCard({ offer }: { offer: FwOffer }) {
  const { addItems, pending } = useCart();
  const isBundle = offer.type === "BUNDLE";
  const product = isBundle ? null : (offer as FwProduct);
  const [selectedVariantId, setSelectedVariantId] = useState(
    product?.variants[0]?.id
  );

  const soldOut = offer.state.type === "SOLD_OUT";
  const price = displayPriceFor(offer);
  const imageUrl = isBundle
    ? imageUrlFor(offer.offers[0]?.images[0])
    : imageUrlFor(offer.images[0]);
  const selectedVariant = product?.variants.find(
    (variant) => variant.id === selectedVariantId
  );

  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border bg-card">
      <div className="relative aspect-[4/3] bg-muted">
        {imageUrl ? (
          <img
            alt={offer.name}
            className="absolute inset-0 size-full object-cover"
            loading="lazy"
            src={imageUrl}
          />
        ) : (
          <div className="grid size-full place-items-center">
            <Package className="size-10 text-muted-foreground" />
          </div>
        )}
        <div className="absolute left-3 top-3 flex gap-2">
          {isBundle ? (
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
      <div className="flex flex-1 flex-col p-5">
        <h3 className="font-bold">{offer.name}</h3>
        <div className="mt-1 flex items-baseline gap-2">
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
          <label className="mt-3 block text-xs font-semibold text-muted-foreground">
            Option
            <select
              className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm text-foreground"
              onChange={(event) => setSelectedVariantId(event.target.value)}
              value={selectedVariantId}
            >
              {product.variants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name} — {formatMoney(variant.unitPrice)}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <Button
          className="mt-4 w-full"
          disabled={soldOut || pending}
          onClick={() => addItems(cartItemsFor(offer, selectedVariantId))}
        >
          <ShoppingBag className="size-4" />
          {soldOut && "Sold out"}
          {!soldOut && isBundle && "Add bundle"}
          {!soldOut && !isBundle && "Add to cart"}
        </Button>
      </div>
    </article>
  );
}
