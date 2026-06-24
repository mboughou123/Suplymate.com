"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSession } from "next-auth/react";

export type CartItem = {
  id: string;
  productId: string | null;
  productName: string;
  supplierId: string;
  supplierName: string;
  imageUrl: string | null;
  unit: string | null;
  quantity: number;
  moq: number | null;
  basePrice: number | null;
  currency: string | null;
  note: string | null;
  sourceUrl: string | null;
};

export type Cart = {
  id: string;
  items: CartItem[];
  itemCount: number;
  supplierCount: number;
};

export type AddInput = {
  productId?: string | null;
  productName: string;
  supplierId: string;
  supplierName: string;
  imageUrl?: string | null;
  unit?: string | null;
  quantity?: number | null;
  moq?: number | null;
  basePrice?: number | null;
  currency?: string | null;
  sourceUrl?: string | null;
};

const GUEST_KEY = "suplymate.guestCart.v1";

type CartContextValue = {
  cart: Cart;
  loading: boolean;
  isOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  add: (input: AddInput) => Promise<void>;
  updateQuantity: (itemId: string, quantity: number) => Promise<void>;
  remove: (itemId: string) => Promise<void>;
  clear: () => Promise<void>;
  refresh: () => Promise<void>;
};

const EMPTY: Cart = { id: "guest", items: [], itemCount: 0, supplierCount: 0 };

const CartContext = createContext<CartContextValue | null>(null);

function readGuest(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(GUEST_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeGuest(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_KEY, JSON.stringify(items));
  } catch {
    // ignore quota errors
  }
}

function recompute(items: CartItem[]): Cart {
  return {
    id: "guest",
    items,
    itemCount: items.reduce((a, i) => a + i.quantity, 0),
    supplierCount: new Set(items.map((i) => i.supplierId)).size,
  };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { status } = useSession();
  const [cart, setCart] = useState<Cart>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const mergedRef = useRef(false);

  const loadServer = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/cart");
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart as Cart);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGuest = useCallback(() => {
    setCart(recompute(readGuest()));
  }, []);

  // On auth state change: merge guest cart then load server; or load guest.
  useEffect(() => {
    if (status === "authenticated") {
      const guest = readGuest();
      if (guest.length > 0 && !mergedRef.current) {
        mergedRef.current = true;
        fetch("/api/cart/merge", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: guest }),
        })
          .then((r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.cart) setCart(data.cart as Cart);
            writeGuest([]);
          })
          .catch(() => {})
          .finally(() => loadServer());
      } else {
        loadServer();
      }
    } else if (status === "unauthenticated") {
      mergedRef.current = false;
      loadGuest();
    }
  }, [status, loadServer, loadGuest]);

  const add = useCallback(
    async (input: AddInput) => {
      if (status === "authenticated") {
        setLoading(true);
        try {
          const res = await fetch("/api/cart", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(input),
          });
          if (res.ok) {
            const data = await res.json();
            setCart(data.cart as Cart);
          }
        } finally {
          setLoading(false);
        }
      } else {
        // Guest: dedupe by productId+supplier in localStorage.
        const items = readGuest();
        const moq = input.moq && input.moq > 0 ? Math.floor(input.moq) : null;
        const qty = Math.max(1, input.quantity ?? moq ?? 1);
        const existing = input.productId
          ? items.find(
              (i) => i.productId === input.productId && i.supplierId === input.supplierId
            )
          : undefined;
        if (existing) {
          existing.quantity = Math.max(existing.quantity, qty);
        } else {
          items.push({
            id: `guest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            productId: input.productId ?? null,
            productName: input.productName,
            supplierId: input.supplierId,
            supplierName: input.supplierName,
            imageUrl: input.imageUrl ?? null,
            unit: input.unit ?? null,
            quantity: qty,
            moq,
            basePrice: input.basePrice ?? null,
            currency: input.currency ?? null,
            note: null,
            sourceUrl: input.sourceUrl ?? null,
          });
        }
        writeGuest(items);
        setCart(recompute(items));
      }
      setIsOpen(true);
    },
    [status]
  );

  const updateQuantity = useCallback(
    async (itemId: string, quantity: number) => {
      const qty = Math.max(1, Math.floor(quantity || 1));
      if (status === "authenticated") {
        const res = await fetch(`/api/cart/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quantity: qty }),
        });
        if (res.ok) setCart((await res.json()).cart as Cart);
      } else {
        const items = readGuest().map((i) => (i.id === itemId ? { ...i, quantity: qty } : i));
        writeGuest(items);
        setCart(recompute(items));
      }
    },
    [status]
  );

  const remove = useCallback(
    async (itemId: string) => {
      if (status === "authenticated") {
        const res = await fetch(`/api/cart/items/${itemId}`, { method: "DELETE" });
        if (res.ok) setCart((await res.json()).cart as Cart);
      } else {
        const items = readGuest().filter((i) => i.id !== itemId);
        writeGuest(items);
        setCart(recompute(items));
      }
    },
    [status]
  );

  const clear = useCallback(async () => {
    if (status === "authenticated") {
      const res = await fetch("/api/cart", { method: "DELETE" });
      if (res.ok) setCart((await res.json()).cart as Cart);
    } else {
      writeGuest([]);
      setCart(EMPTY);
    }
  }, [status]);

  const refresh = useCallback(async () => {
    if (status === "authenticated") await loadServer();
    else loadGuest();
  }, [status, loadServer, loadGuest]);

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      loading,
      isOpen,
      openDrawer: () => setIsOpen(true),
      closeDrawer: () => setIsOpen(false),
      add,
      updateQuantity,
      remove,
      clear,
      refresh,
    }),
    [cart, loading, isOpen, add, updateQuantity, remove, clear, refresh]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
