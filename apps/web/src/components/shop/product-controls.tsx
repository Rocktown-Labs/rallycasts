import { Button } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { useMemo } from "react";

import { useCart } from "@/lib/cart";
import { cartItemsFor, productOptionsFor } from "@/lib/fourthwall";
import type { FwOffer, FwProduct, FwProductOption } from "@/lib/fourthwall";

export function VariantSelector({
  product,
  selectedOptions,
  onSelect,
}: {
  product: FwProduct;
  selectedOptions: { color?: string; size?: string };
  onSelect: (id: "color" | "size", value: string) => void;
}) {
  const options = useMemo(() => productOptionsFor(product), [product]);

  const isAvailable = (id: "color" | "size", value: string) =>
    product.variants.some((variant) => {
      const candidate = { ...selectedOptions, [id]: value };
      const colorMatch =
        !candidate.color || variant.attributes.color?.name === candidate.color;
      const sizeMatch =
        !candidate.size || variant.attributes.size?.name === candidate.size;
      return colorMatch && sizeMatch;
    });

  return (
    <div className="space-y-3">
      {options.map((option) => (
        <div key={option.id}>
          <p className="text-xs font-semibold text-muted-foreground">
            {option.name}
          </p>
          <div className="mt-1.5 flex flex-wrap gap-2">
            {option.values.map((value) => {
              const active = selectedOptions[option.id] === value.value;
              const available = isAvailable(option.id, value.value);

              return (
                <OptionButton
                  active={active}
                  available={available}
                  key={value.value}
                  option={option}
                  value={value.value}
                  swatch={value.swatch}
                  onSelect={() => onSelect(option.id, value.value)}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function OptionButton({
  active,
  available,
  option,
  swatch,
  value,
  onSelect,
}: {
  active: boolean;
  available: boolean;
  option: FwProductOption;
  swatch?: string;
  value: string;
  onSelect: () => void;
}) {
  const isColor = option.id === "color";
  const safeSwatch = isColor && swatch ? swatch : undefined;

  return (
    <button
      className={cn(
        "flex min-w-[40px] items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-background text-foreground hover:border-primary/60",
        !available &&
          "relative cursor-not-allowed overflow-hidden bg-muted text-muted-foreground before:absolute before:inset-x-0 before:h-px before:-rotate-45 before:bg-muted-foreground/40"
      )}
      disabled={!available}
      onClick={onSelect}
      title={
        isColor
          ? `Color ${value}`
          : `Size ${value}${available ? "" : " (unavailable)"}`
      }
      type="button"
    >
      {safeSwatch ? (
        <span
          aria-hidden="true"
          className="inline-block size-3.5 rounded-full border border-black/10"
          style={{ backgroundColor: safeSwatch }}
        />
      ) : null}
      <span>{value}</span>
    </button>
  );
}

/**
 * Add-to-cart row: a primary add button next to a quantity stepper that
 * reflects (and adjusts) the variant's quantity in the cart. Bundles get a
 * single full-width button because they expand into multiple line items.
 */
export function AddToCartControls({
  offer,
  soldOut,
  variantId,
}: {
  offer: FwOffer;
  soldOut: boolean;
  variantId?: string;
}) {
  const { addItems, pending, quantityFor, updateQuantity } = useCart();
  const isBundle = offer.type === "BUNDLE";

  const handleAdd = () => {
    void addItems(cartItemsFor(offer, variantId));
  };

  let label: string;
  if (soldOut) {
    label = "Sold out";
  } else if (isBundle) {
    label = "Add bundle";
  } else {
    label = "Add to cart";
  }

  if (isBundle || !variantId) {
    return (
      <Button
        className="mt-5 w-full rounded-lg"
        disabled={soldOut || pending}
        onClick={handleAdd}
      >
        <ShoppingBag className="size-4" />
        {label}
      </Button>
    );
  }

  const quantity = quantityFor(variantId);

  const increase = () => {
    if (quantity === 0) {
      handleAdd();
      return;
    }
    void updateQuantity(variantId, quantity + 1);
  };

  const decrease = () => {
    void updateQuantity(variantId, Math.max(quantity - 1, 0));
  };

  return (
    <div className="mt-5 flex gap-2">
      <Button
        className="flex-1 rounded-lg"
        disabled={soldOut || pending}
        onClick={handleAdd}
      >
        <ShoppingBag className="size-4" />
        {label}
      </Button>
      <div className="flex shrink-0 items-center rounded-lg border">
        <button
          aria-label={`Remove one ${offer.name}`}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          disabled={soldOut || pending || quantity === 0}
          onClick={decrease}
          type="button"
        >
          <Minus className="size-3.5" />
        </button>
        <span
          aria-label={`${quantity} in cart`}
          className="w-7 text-center text-sm font-semibold tabular-nums"
        >
          {quantity}
        </span>
        <button
          aria-label={`Add one more ${offer.name}`}
          className="grid size-9 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40"
          disabled={soldOut || pending}
          onClick={increase}
          type="button"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
