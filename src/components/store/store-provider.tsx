"use client";

import {
  useCallback,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { products } from "@/lib/site-data";
import type { CartItem, Product } from "@/lib/types";
import { AddToCartModal } from "@/components/store/add-to-cart-modal";

type Coupon = {
  code: string;
  type: string;
  valuePercent: number | null;
  valueInCents: number | null;
  minSubtotalInCents: number;
};

type StoreContextValue = {
  cart: CartItem[];
  favorites: string[];
  coupon: Coupon | null;
  lastRecoveredAt: string | null;
  viewerId: string | null;
  isAuthenticated: boolean;
  visitedProductIds: string[];
  priceAlertProductIds: string[];
  markProductVisited: (productId: string) => void;
  addToCart: (
    productId: string,
    quantity?: number,
    options?: { suppressAddToCartModal?: boolean },
  ) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  toggleFavorite: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  togglePriceAlert: (productId: string) => void;
  hasPriceAlert: (productId: string) => boolean;
  cartProducts: Array<Product & { quantity: number }>;
  cartCount: number;
  subtotal: number;
  discountAmount: number;
  shipping: number;
  total: number;
  applyCoupon: (code: string) => Promise<{ ok: boolean; error?: string }>;
  setShippingByCep: (
    cep: string,
  ) => Promise<{ ok: boolean; error?: string; shippingSource?: string }>;
};

const StoreContext = createContext<StoreContextValue | null>(null);

const STORAGE_KEYS = {
  cart: "stock-center-cart",
  favorites: "stock-center-favorites",
  recoveredAt: "stock-center-recovered-at",
  visited: "stock-center-visited-products",
  alerts: "stock-center-price-stock-alerts",
};

type StoreProviderProps = {
  children: ReactNode;
  viewerId: string | null;
  initialCart: CartItem[];
  initialFavorites: string[];
  initialLastRecoveredAt: string | null;
  initialVisitedProductIds: string[];
};

function readLocalCart() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEYS.cart);
  return raw ? (JSON.parse(raw) as CartItem[]) : [];
}

function readLocalFavorites() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEYS.favorites);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

function readRecoveredAt() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem(STORAGE_KEYS.recoveredAt);
}

function readLocalVisitedProducts() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEYS.visited);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

function readLocalAlerts() {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = localStorage.getItem(STORAGE_KEYS.alerts);
  return raw ? (JSON.parse(raw) as string[]) : [];
}

function mergeVisitedProducts(base: string[], incoming: string[]) {
  return Array.from(new Set([...base, ...incoming])).slice(0, 100);
}

function mergeCarts(base: CartItem[], incoming: CartItem[]) {
  const merged = new Map<string, number>();

  [...base, ...incoming].forEach((item) => {
    merged.set(item.productId, (merged.get(item.productId) || 0) + item.quantity);
  });

  return Array.from(merged.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

function calculateCouponDiscountReais(coupon: Coupon | null, subtotal: number) {
  if (!coupon) {
    return 0;
  }

  const subtotalInCents = Math.max(0, Math.round(subtotal * 100));

  if (coupon.type === "FIXED") {
    return Math.min(Math.max(coupon.valueInCents || 0, 0), subtotalInCents) / 100;
  }

  const percent = Math.min(Math.max(coupon.valuePercent || 0, 0), 100);
  return Math.min(Math.round(subtotalInCents * (percent / 100)), subtotalInCents) / 100;
}

export function StoreProvider({
  children,
  viewerId,
  initialCart,
  initialFavorites,
  initialLastRecoveredAt,
  initialVisitedProductIds,
}: StoreProviderProps) {
  const isAuthenticated = Boolean(viewerId);
  const mergedGuestSyncDone = useRef(false);
  const guestBootstrapDone = useRef(false);
  const [cart, setCart] = useState<CartItem[]>(initialCart);
  const [favorites, setFavorites] = useState<string[]>(initialFavorites);
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [visitedProductIds, setVisitedProductIds] = useState<string[]>(
    initialVisitedProductIds,
  );
  const [priceAlertProductIds, setPriceAlertProductIds] = useState<string[]>([]);
  const [shipping, setShipping] = useState(0);
  const [lastRecoveredAt, setLastRecoveredAt] = useState<string | null>(
    initialLastRecoveredAt,
  );
  const [addToCartModal, setAddToCartModal] = useState<{
    productId: string;
    quantityAdded: number;
  } | null>(null);

  useEffect(() => {
    if (isAuthenticated || guestBootstrapDone.current) {
      return;
    }

    setCart(readLocalCart());
    setFavorites(readLocalFavorites());
    setVisitedProductIds(readLocalVisitedProducts());
    setPriceAlertProductIds(readLocalAlerts());
    setLastRecoveredAt(readRecoveredAt());
    guestBootstrapDone.current = true;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!guestBootstrapDone.current) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.cart, JSON.stringify(cart));
      return;
    }

    fetch("/api/store/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: cart }),
    }).catch(() => null);
  }, [cart, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!guestBootstrapDone.current) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.favorites, JSON.stringify(favorites));
      return;
    }

    if (!mergedGuestSyncDone.current) {
      return;
    }
  }, [favorites, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      if (!guestBootstrapDone.current) {
        return;
      }
      localStorage.setItem(STORAGE_KEYS.visited, JSON.stringify(visitedProductIds));
    }
  }, [isAuthenticated, visitedProductIds]);

  useEffect(() => {
    if (!isAuthenticated && !guestBootstrapDone.current) {
      return;
    }
    localStorage.setItem(STORAGE_KEYS.alerts, JSON.stringify(priceAlertProductIds));
  }, [isAuthenticated, priceAlertProductIds]);

  useEffect(() => {
    if (!isAuthenticated || mergedGuestSyncDone.current) {
      return;
    }

    const guestCart = readLocalCart();
    const guestFavorites = readLocalFavorites();
    const guestRecoveredAt = readRecoveredAt();
    const guestVisited = readLocalVisitedProducts();
    const mergedCart = mergeCarts(initialCart, guestCart);
    const mergedFavorites = Array.from(
      new Set([...initialFavorites, ...guestFavorites]),
    );
    const mergedVisited = mergeVisitedProducts(
      initialVisitedProductIds,
      guestVisited,
    );

    setCart(mergedCart);
    setFavorites(mergedFavorites);
    setLastRecoveredAt(guestRecoveredAt || initialLastRecoveredAt || new Date().toISOString());
    setVisitedProductIds(mergedVisited);
    mergedGuestSyncDone.current = true;

    fetch("/api/store/cart", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: mergedCart }),
    }).catch(() => null);

    guestFavorites
      .filter((productId) => !initialFavorites.includes(productId))
      .forEach((productId) => {
        fetch("/api/store/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId }),
        }).catch(() => null);
      });

    guestVisited.forEach((productId) => {
      fetch("/api/store/visits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      }).catch(() => null);
    });

    localStorage.removeItem(STORAGE_KEYS.cart);
    localStorage.removeItem(STORAGE_KEYS.favorites);
    localStorage.removeItem(STORAGE_KEYS.visited);
  }, [
    initialCart,
    initialFavorites,
    initialLastRecoveredAt,
    initialVisitedProductIds,
    isAuthenticated,
  ]);

  const fallbackCartProducts = useMemo(
    () =>
      cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          return product ? { ...product, quantity: item.quantity } : null;
        })
        .filter((item): item is Product & { quantity: number } => Boolean(item)),
    [cart],
  );

  const [resolvedCartProducts, setResolvedCartProducts] = useState<
    Array<Product & { quantity: number }>
  >([]);

  useEffect(() => {
    if (cart.length === 0) {
      setResolvedCartProducts([]);
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/store/cart/resolve", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items: cart }),
        });
        if (!res.ok || cancelled) {
          if (!cancelled) {
            setResolvedCartProducts([]);
          }
          return;
        }
        const data = (await res.json()) as {
          products?: Array<Product & { quantity: number }>;
        };
        if (!cancelled) {
          setResolvedCartProducts(Array.isArray(data.products) ? data.products : []);
        }
      } catch {
        if (!cancelled) {
          setResolvedCartProducts([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [cart]);

  const cartProducts =
    resolvedCartProducts.length > 0 ? resolvedCartProducts : fallbackCartProducts;

  const subtotal = cartProducts.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0,
  );
  const discountAmount = calculateCouponDiscountReais(coupon, subtotal);
  const total = subtotal - discountAmount + shipping;
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const markProductVisited = useCallback(
    (productId: string) => {
      setVisitedProductIds((current) => {
        const next = [productId, ...current.filter((id) => id !== productId)].slice(0, 100);

        if (isAuthenticated) {
          fetch("/api/store/visits", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          }).catch(() => null);
        }

        return next;
      });
    },
    [isAuthenticated],
  );

  function touchRecovery() {
    const timestamp = new Date().toISOString();
    setLastRecoveredAt(timestamp);

    if (!isAuthenticated) {
      localStorage.setItem(STORAGE_KEYS.recoveredAt, timestamp);
    }
  }

  const value: StoreContextValue = {
    cart,
    favorites,
    coupon,
    lastRecoveredAt,
    viewerId,
    isAuthenticated,
    visitedProductIds,
    priceAlertProductIds,
    markProductVisited,
    addToCart(productId, quantity = 1, options?: { suppressAddToCartModal?: boolean }) {
      touchRecovery();
      setCart((current) => {
        const existing = current.find((item) => item.productId === productId);
        if (existing) {
          return current.map((item) =>
            item.productId === productId
              ? { ...item, quantity: item.quantity + quantity }
              : item,
          );
        }

        return [...current, { productId, quantity }];
      });
      if (!options?.suppressAddToCartModal) {
        setAddToCartModal({ productId, quantityAdded: quantity });
      }
    },
    updateQuantity(productId, quantity) {
      touchRecovery();
      if (quantity <= 0) {
        setCart((current) => current.filter((item) => item.productId !== productId));
        return;
      }

      setCart((current) =>
        current.map((item) =>
          item.productId === productId ? { ...item, quantity } : item,
        ),
      );
    },
    removeFromCart(productId) {
      touchRecovery();
      setCart((current) => current.filter((item) => item.productId !== productId));
    },
    toggleFavorite(productId) {
      setFavorites((current) => {
        const nextFavorites = current.includes(productId)
          ? current.filter((item) => item !== productId)
          : [...current, productId];

        if (isAuthenticated) {
          fetch("/api/store/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId }),
          }).catch(() => null);
        }

        return nextFavorites;
      });
    },
    isFavorite(productId) {
      return favorites.includes(productId);
    },
    togglePriceAlert(productId) {
      setPriceAlertProductIds((current) =>
        current.includes(productId)
          ? current.filter((id) => id !== productId)
          : [...current, productId],
      );
    },
    hasPriceAlert(productId) {
      return priceAlertProductIds.includes(productId);
    },
    cartProducts,
    cartCount,
    subtotal,
    discountAmount,
    shipping,
    total,
    async applyCoupon(code) {
      const normalized = code.trim().toUpperCase();

      if (!normalized) {
        setCoupon(null);
        return { ok: false, error: "Informe um cupom." };
      }

      try {
        const response = await fetch("/api/coupons/validate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            code: normalized,
            subtotalInCents: Math.round(subtotal * 100),
          }),
        });
        const payload = (await response.json()) as {
          coupon?: Coupon;
          error?: string;
        };

        if (!response.ok || !payload.coupon) {
          setCoupon(null);
          return {
            ok: false,
            error: payload.error || "Cupom invalido.",
          };
        }

        setCoupon(payload.coupon);
        return { ok: true };
      } catch {
        setCoupon(null);
        return {
          ok: false,
          error: "Erro de rede ao validar cupom.",
        };
      }
    },
    async setShippingByCep(cep) {
      const digits = cep.replace(/\D/g, "");
      if (digits.length !== 8) {
        return { ok: false, error: "CEP precisa ter 8 digitos." };
      }

      try {
        const res = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cep: digits, items: cart }),
        });
        const data = (await res.json()) as {
          shippingReais?: number;
          shippingSource?: string;
          error?: string;
        };

        if (!res.ok) {
          return {
            ok: false,
            error: data.error || "CEP nao encontrado.",
          };
        }

        if (typeof data.shippingReais !== "number") {
          return { ok: false, error: "Resposta invalida da cotacao de frete." };
        }

        setShipping(data.shippingReais);
        return { ok: true, shippingSource: data.shippingSource };
      } catch {
        return { ok: false, error: "Erro de rede ao cotar frete." };
      }
    },
  };

  return (
    <StoreContext.Provider value={value}>
      {children}
      {addToCartModal ? (
        <AddToCartModal
          productId={addToCartModal.productId}
          quantityAdded={addToCartModal.quantityAdded}
          visitedProductIds={visitedProductIds}
          onClose={() => setAddToCartModal(null)}
        />
      ) : null}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);

  if (!context) {
    throw new Error("useStore must be used within StoreProvider");
  }

  return context;
}
