import { Button } from "@rallycaststv/ui/components/button";
import { cn } from "@rallycaststv/ui/lib/utils";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";

import {
  addToCart,
  changeCartQuantity,
  checkoutUrlFor,
  createCart,
  formatMoney,
  getCart,
  imageUrlFor,
  isFourthwallEnabled,
  removeFromCart,
} from "@/lib/fourthwall";
import type { FwCart, FwCartRequestItem } from "@/lib/fourthwall";

const CART_STORAGE_KEY = "rallycasts.fw.cartId";

interface CartContextValue {
  addItems: (items: FwCartRequestItem[]) => Promise<void>;
  cart: FwCart | null;
  checkout: () => void;
  closeCart: () => void;
  enabled: boolean;
  isOpen: boolean;
  itemCount: number;
  openCart: () => void;
  pending: boolean;
  quantityFor: (variantId: string) => number;
  removeItem: (variantId: string) => Promise<void>;
  subtotal: number;
  updateQuantity: (variantId: string, quantity: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | null>(null);

const readStoredCartId = () => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(CART_STORAGE_KEY);
};

const storeCartId = (cartId: string | null) => {
  if (typeof window === "undefined") {
    return;
  }
  if (cartId) {
    window.localStorage.setItem(CART_STORAGE_KEY, cartId);
  } else {
    window.localStorage.removeItem(CART_STORAGE_KEY);
  }
};

export function CartProvider({ children }: { children: ReactNode }) {
  const enabled = isFourthwallEnabled();
  const [cart, setCart] = useState<FwCart | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const cartIdRef = useRef<string | null>(null);
  const ensureRef = useRef<Promise<string> | null>(null);

  // Restore a previous cart; drop it if Fourthwall no longer knows it.
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const storedId = readStoredCartId();
    if (!storedId) {
      return;
    }
    const loadCart = async () => {
      try {
        const existing = await getCart(storedId);
        cartIdRef.current = existing.id;
        setCart(existing);
      } catch {
        storeCartId(null);
      }
    };
    void loadCart();
  }, [enabled]);

  const ensureCartId = useCallback(async (): Promise<string> => {
    if (cartIdRef.current) {
      return cartIdRef.current;
    }
    if (ensureRef.current) {
      return await ensureRef.current;
    }
    const create = async () => {
      try {
        const created = await createCart();
        cartIdRef.current = created.id;
        storeCartId(created.id);
        setCart(created);
        return created.id;
      } finally {
        ensureRef.current = null;
      }
    };
    ensureRef.current = create();
    return await ensureRef.current;
  }, []);

  const runMutation = useCallback(
    async (mutate: (cartId: string) => Promise<FwCart>) => {
      setPending(true);
      try {
        const cartId = await ensureCartId();
        const updated = await mutate(cartId);
        setCart(updated);
      } catch {
        toast.error("Something went wrong updating your cart");
        throw new Error("Cart mutation failed");
      } finally {
        setPending(false);
      }
    },
    [ensureCartId]
  );

  const addItems = useCallback(
    async (items: FwCartRequestItem[]) => {
      if (items.length === 0) {
        return;
      }
      try {
        await runMutation((cartId) => addToCart(cartId, items));
        setIsOpen(true);
      } catch {
        // Error already toasted by runMutation.
      }
    },
    [runMutation]
  );

  const updateQuantity = useCallback(
    async (variantId: string, quantity: number) => {
      try {
        await runMutation((cartId) =>
          quantity <= 0
            ? removeFromCart(cartId, [variantId])
            : changeCartQuantity(cartId, [{ quantity, variantId }])
        );
      } catch {
        // Error already toasted by runMutation.
      }
    },
    [runMutation]
  );

  const removeItem = useCallback(
    async (variantId: string) => {
      try {
        await runMutation((cartId) => removeFromCart(cartId, [variantId]));
      } catch {
        // Error already toasted by runMutation.
      }
    },
    [runMutation]
  );

  const checkout = useCallback(() => {
    if (!cartIdRef.current) {
      return;
    }
    window.location.assign(checkoutUrlFor(cartIdRef.current));
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const items = cart?.items ?? [];
    return {
      addItems,
      cart,
      checkout,
      closeCart: () => setIsOpen(false),
      enabled,
      isOpen,
      itemCount: items.reduce((total, item) => total + item.quantity, 0),
      openCart: () => setIsOpen(true),
      pending,
      quantityFor: (variantId: string) => {
        let total = 0;
        for (const item of items) {
          if (item.variant.id === variantId) {
            total += item.quantity;
          }
        }
        return total;
      },
      removeItem,
      subtotal: items.reduce(
        (total, item) => total + item.variant.unitPrice.value * item.quantity,
        0
      ),
      updateQuantity,
    };
  }, [
    addItems,
    cart,
    checkout,
    enabled,
    isOpen,
    pending,
    removeItem,
    updateQuantity,
  ]);

  return (
    <CartContext.Provider value={value}>
      {children}
      <CartDrawer />
    </CartContext.Provider>
  );
}

export const useCart = (): CartContextValue => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
};

function CartDrawer() {
  const {
    cart,
    checkout,
    closeCart,
    isOpen,
    pending,
    removeItem,
    subtotal,
    updateQuantity,
  } = useCart();

  if (!isOpen) {
    return null;
  }

  const items = cart?.items ?? [];
  const currency = items[0]?.variant.unitPrice.currency ?? "USD";

  return (
    <dialog
      open
      aria-label="Shopping cart"
      className="fixed inset-0 z-50 m-0 h-full max-h-none w-full max-w-none border-0 bg-transparent p-0 text-foreground"
    >
      <button
        aria-label="Close cart"
        className="absolute inset-0 bg-black/60"
        onClick={closeCart}
        type="button"
      />
      <aside className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col border-l bg-background shadow-xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <h2 className="flex items-center gap-2 text-lg font-black">
            <ShoppingBag className="size-5" /> Your cart
          </h2>
          <Button
            className="rounded-lg"
            onClick={closeCart}
            size="icon"
            variant="ghost"
          >
            <X className="size-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-muted-foreground">
              Your cart is empty. Grab some court-day gear.
            </p>
          ) : (
            <ul className="space-y-4">
              {items.map((item) => {
                const imageUrl = imageUrlFor(item.variant.images[0]);
                return (
                  <li
                    className="flex gap-3 rounded-xl border p-3"
                    key={`${item.variant.id}-${item.groupedBy?.groupedId ?? ""}`}
                  >
                    {imageUrl ? (
                      <img
                        alt={item.variant.product.name}
                        className="size-16 rounded-lg object-cover"
                        src={imageUrl}
                      />
                    ) : (
                      <div className="grid size-16 place-items-center rounded-lg bg-muted">
                        <ShoppingBag className="size-5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">
                        {item.variant.product.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.variant.name}
                      </p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatMoney(item.variant.unitPrice)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Button
                          aria-label="Decrease quantity"
                          className="rounded-lg"
                          disabled={pending}
                          onClick={() =>
                            updateQuantity(item.variant.id, item.quantity - 1)
                          }
                          size="icon"
                          variant="outline"
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {item.quantity}
                        </span>
                        <Button
                          aria-label="Increase quantity"
                          className="rounded-lg"
                          disabled={pending}
                          onClick={() =>
                            updateQuantity(item.variant.id, item.quantity + 1)
                          }
                          size="icon"
                          variant="outline"
                        >
                          <Plus className="size-3" />
                        </Button>
                        <Button
                          aria-label="Remove item"
                          className="ml-auto rounded-lg"
                          disabled={pending}
                          onClick={() => removeItem(item.variant.id)}
                          size="icon"
                          variant="ghost"
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="border-t px-5 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-lg font-black">
              {formatMoney({ currency, value: subtotal })}
            </span>
          </div>
          <Button
            className={cn("w-full rounded-lg")}
            disabled={items.length === 0 || pending}
            onClick={checkout}
          >
            Checkout with Fourthwall
          </Button>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            Shipping and taxes are calculated at checkout. RallyCasts never
            stores card details.
          </p>
        </div>
      </aside>
    </dialog>
  );
}
