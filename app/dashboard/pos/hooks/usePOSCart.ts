import { useState, useMemo, useEffect, useRef } from "react";
import { Product } from "@/app/actions/products";
import { CartItem } from "../types";

export const POS_DRAFT_STORAGE_KEY = "dahotre_pos_active_draft";

export function usePOSCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const isHydrated = useRef(false);

  // Restore cart from session storage on initial client mount
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(POS_DRAFT_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.cart && Array.isArray(parsed.cart)) {
          setCart(parsed.cart);
        }
      }
    } catch (e) {
      console.error("Failed to restore cart from session storage:", e);
    } finally {
      isHydrated.current = true;
    }
  }, []);

  const toggleCartItem = (product: Product, variantIndex?: number) => {
    const stock =
      variantIndex != null && product.variants
        ? product.variants[variantIndex].stock_qty
        : product.stock_qty;

    if (stock <= 0) return;

    setCart((prev) => {
      const existing = prev.find(
        (item) => item.product.id === product.id && item.variantIndex === variantIndex
      );
      if (existing) {
        return prev.filter(
          (item) => !(item.product.id === product.id && item.variantIndex === variantIndex)
        );
      }
      const sellingPrice =
        variantIndex != null && product.variants
          ? product.variants[variantIndex].selling_price
          : product.default_selling_price;

      return [...prev, { product, quantity: 1, sellingPrice, variantIndex }];
    });
  };

  const addToCart = (product: Product, variantIndex?: number, qty: number = 1) => {
    const stock =
      variantIndex != null && product.variants
        ? product.variants[variantIndex].stock_qty
        : product.stock_qty;

    if (stock <= 0) return;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) => item.product.id === product.id && item.variantIndex === variantIndex
      );
      if (existingIndex >= 0) {
        const updated = [...prev];
        const currentQty = updated[existingIndex].quantity;
        const newQty = Math.min(currentQty + qty, stock);
        updated[existingIndex] = { ...updated[existingIndex], quantity: newQty };
        return updated;
      }

      const sellingPrice =
        variantIndex != null && product.variants
          ? product.variants[variantIndex].selling_price
          : product.default_selling_price;

      return [...prev, { product, quantity: Math.min(qty, stock), sellingPrice, variantIndex }];
    });
  };

  const updateCartItemQty = (productId: number, delta: number, variantIndex?: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.variantIndex === variantIndex) {
          const stock =
            variantIndex != null && item.product.variants
              ? item.product.variants[variantIndex].stock_qty
              : item.product.stock_qty;
          const newQty = Math.max(1, Math.min(item.quantity + delta, stock));
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const setCartItemQty = (productId: number, rawQty: number, variantIndex?: number) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId && item.variantIndex === variantIndex) {
          const stock =
            variantIndex != null && item.product.variants
              ? item.product.variants[variantIndex].stock_qty
              : item.product.stock_qty;
          const validQty = Math.max(1, Math.min(rawQty, stock));
          return { ...item, quantity: validQty };
        }
        return item;
      })
    );
  };

  const updateCartItemPrice = (productId: number, priceStr: string, variantIndex?: number) => {
    const val = priceStr === "" ? "" : parseFloat(priceStr);
    if (typeof val === "number" && (isNaN(val) || val < 0)) return;
    setCart((prev) =>
      prev.map((item) =>
        item.product.id === productId && item.variantIndex === variantIndex
          ? { ...item, sellingPrice: val }
          : item
      )
    );
  };

  const removeCartItem = (productId: number, variantIndex?: number) => {
    setCart((prev) =>
      prev.filter((item) => !(item.product.id === productId && item.variantIndex === variantIndex))
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const isInCart = (productId: number) => {
    return cart.some((item) => item.product.id === productId);
  };

  const { subtotal, totalDiscount, totalPieces } = useMemo(() => {
    let sub = 0;
    let disc = 0;
    let pieces = 0;

    cart.forEach((item) => {
      const sp = typeof item.sellingPrice === "number" ? item.sellingPrice : 0;
      sub += sp * item.quantity;
      pieces += item.quantity;

      const originalPrice =
        item.variantIndex != null && item.product.variants
          ? item.product.variants[item.variantIndex].selling_price
          : item.product.default_selling_price;

      if (sp > 0 && sp < originalPrice) {
        disc += (originalPrice - sp) * item.quantity;
      }
    });

    return { subtotal: sub, totalDiscount: disc, totalPieces: pieces };
  }, [cart]);

  return {
    cart,
    setCart,
    isHydrated,
    toggleCartItem,
    addToCart,
    updateCartItemQty,
    setCartItemQty,
    updateCartItemPrice,
    removeCartItem,
    clearCart,
    isInCart,
    subtotal,
    totalDiscount,
    totalPieces,
  };
}
