import { useState, useMemo } from "react";
import { Product, Category } from "@/app/actions/products";

export function usePOSProducts(initialProducts: Product[], categories: Category[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<number | "ALL">("ALL");
  const [viewMode, setViewMode] = useState<"GRID" | "LIST">("GRID");

  // Fast counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<number | "ALL", number> = { ALL: initialProducts.length };
    categories.forEach((c) => {
      counts[c.id] = 0;
    });

    initialProducts.forEach((p) => {
      if (p.category_id && counts[p.category_id] !== undefined) {
        counts[p.category_id]++;
      }
    });

    return counts;
  }, [initialProducts, categories]);

  // High-performance product search & filter
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const normalizedQ = q.replace(/[\s\-_]/g, "");
    const numQ =
      !isNaN(Number(q.replace(/[₹,\s]/g, ""))) && q.replace(/[₹,\s]/g, "") !== ""
        ? Number(q.replace(/[₹,\s]/g, ""))
        : null;

    return initialProducts.filter((p) => {
      const matchesCategory = activeCategoryId === "ALL" || p.category_id === activeCategoryId;
      if (!matchesCategory) return false;

      if (!q) return true;

      const codeNormalized = p.product_code.toLowerCase().replace(/[\s\-_]/g, "");
      const matchesCode =
        p.product_code.toLowerCase().includes(q) ||
        (normalizedQ ? codeNormalized.includes(normalizedQ) : false);
      const matchesName = p.name.toLowerCase().includes(q);
      const matchesCategoryName = p.category_name ? p.category_name.toLowerCase().includes(q) : false;
      const matchesDimensions =
        (p.base != null && `${p.base}ft`.includes(q)) ||
        (p.height != null && `${p.height}ft`.includes(q)) ||
        (p.base != null && p.height != null && `${p.height}x${p.base}`.toLowerCase().includes(q)) ||
        (p.base != null && p.height != null && `${p.base}x${p.height}`.toLowerCase().includes(q));
      const matchesPrice =
        numQ !== null && (p.default_selling_price === numQ || p.cost_price === numQ);

      const matchesVariants = (p.variants || []).some(
        (v) =>
          (v.label && v.label.toLowerCase().includes(q)) || (numQ !== null && v.selling_price === numQ)
      );

      return (
        matchesCode ||
        matchesName ||
        matchesCategoryName ||
        matchesDimensions ||
        matchesPrice ||
        matchesVariants
      );
    });
  }, [initialProducts, searchQuery, activeCategoryId]);

  // Search exact match for barcode scanner or enter key quick-add
  const findExactProduct = (query: string): Product | null => {
    const cleanQ = query.trim().toLowerCase();
    if (!cleanQ) return null;

    const exactMatch = initialProducts.find(
      (p) =>
        p.product_code.toLowerCase() === cleanQ ||
        p.product_code.toLowerCase().replace(/[\s\-_]/g, "") === cleanQ.replace(/[\s\-_]/g, "")
    );

    return exactMatch || null;
  };

  return {
    searchQuery,
    setSearchQuery,
    activeCategoryId,
    setActiveCategoryId,
    viewMode,
    setViewMode,
    filteredProducts,
    categoryCounts,
    findExactProduct,
  };
}
