import { Button } from "@rallycaststv/ui/components/button";
import { ShoppingBag } from "lucide-react";

import { useCart } from "@/lib/cart";

export default function CartButton() {
  const { enabled, itemCount, openCart } = useCart();

  if (!enabled) {
    return null;
  }

  return (
    <Button
      aria-label={`Open cart, ${itemCount} items`}
      className="relative"
      onClick={openCart}
      size="icon"
      variant="ghost"
    >
      <ShoppingBag className="size-5" />
      {itemCount > 0 ? (
        <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Button>
  );
}
