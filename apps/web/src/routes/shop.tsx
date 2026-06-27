import { env } from "@rallycaststv/env/web";
import { Button, buttonVariants } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowUpRight, ShoppingBag, Sparkles, Trophy } from "lucide-react";

export const Route = createFileRoute("/shop")({
  component: ShopPage,
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
            culture. Orders will be fulfilled through our connected commerce
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
              First drop preview
            </p>
            <h2 className="mt-1 text-2xl font-black">Built for court days</h2>
          </div>
          <ShoppingBag className="size-6 text-primary" />
        </div>
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
      </section>
    </main>
  );
}
