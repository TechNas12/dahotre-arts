"use client";

import { useMemo, Fragment } from "react";
import { Order } from "@/app/actions/orders";
import { BookedProductSummary } from "@/app/actions/bookings";
import { getOptimizedImageUrl } from "@/lib/cloudinary";

export type PrintReportType = "PRODUCTS" | "BOOKINGS";

export type BookingsPrintConfig = {
  reportType: PrintReportType;
  dateFrom?: string;
  dateTo?: string;
  groupByDate: boolean;
  groupByProduct?: boolean;
  includeOrders?: boolean;
  sortOrder: "ASC" | "DESC";
  pageSize: "A4" | "A5";
  showPhotos?: boolean;
  rowsPerPage?: number;
};

type BookingsPrintViewProps = {
  config: BookingsPrintConfig;
  orders: Order[];
  productsSummary: BookedProductSummary[];
  searchQuery?: string;
  filterStatus?: string;
  filterPaymentMode?: string;
  filterFulfillment?: string;
  filterPrefix?: string;
};

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const getLocalDateKey = (dateStr: string): string => {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "Unknown Date";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getFormattedDate = (dateKey: string): string => {
  if (dateKey === "Unknown Date") return dateKey;
  try {
    const [y, m, d] = dateKey.split("-").map(Number);
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString("en-IN", {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateKey;
  }
};

/**
 * Generates an optimized Cloudinary URL for printing at high DPI.
 * When rowsPerPage is small (e.g. 4 rows), photos scale up significantly,
 * so we request higher resolution assets to prevent pixelation on paper.
 */
export const getPrintPhotoUrl = (rawUrl?: string | null, targetPixelSize = 80) => {
  if (!rawUrl) return null;
  // Request 2x density for crystal clear print output
  const fetchSize = Math.max(160, Math.min(600, Math.round(targetPixelSize * 2.2)));
  return getOptimizedImageUrl(rawUrl, { width: fetchSize, height: fetchSize, crop: "fill" });
};

const getCategoryName = (cat: any): string => {
  if (!cat) return "-";
  if (typeof cat === "string") return cat;
  if (Array.isArray(cat) && cat.length > 0) return cat[0]?.name || "-";
  if (typeof cat === "object" && cat.name) return String(cat.name);
  return "-";
};

export function BookingsPrintView({
  config,
  orders,
  productsSummary,
  searchQuery = "",
  filterStatus = "ALL",
  filterPaymentMode = "ALL",
  filterFulfillment = "ALL",
  filterPrefix = "",
}: BookingsPrintViewProps) {
  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  const printedAt = useMemo(() => {
    return new Date().toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  }, [config]);

  // ──────────────────────────────────────────────────────────────────────────
  // DYNAMIC ROW & PHOTO SCALING METRICS
  // Dynamically scales cell padding, font size, thumbnail dimensions, and row
  // height according to the chosen rowsPerPage and pageSize so that any custom
  // row count (e.g. 4 rows per page) keeps all details and scales the photo
  // to fill the generous proportion of the page.
  // ──────────────────────────────────────────────────────────────────────────
  const rowMetrics = useMemo(() => {
    const rpp = config.rowsPerPage && config.rowsPerPage > 0 ? config.rowsPerPage : 12;
    const isA5 = config.pageSize === "A5";

    if (isA5) {
      if (rpp <= 3) {
        return {
          cellPadding: "12px 8px",
          fontSize: "12px",
          codeFontSize: "11.5px",
          nameFontSize: "13px",
          photoSize: 100,
          minRowHeight: "130px",
          checkboxSize: "16px",
          headerPadding: "6px 8px",
          headerFontSize: "10.5px",
        };
      }
      if (rpp <= 5) {
        return {
          cellPadding: "8px 6px",
          fontSize: "11px",
          codeFontSize: "10.5px",
          nameFontSize: "12px",
          photoSize: 72,
          minRowHeight: "85px",
          checkboxSize: "14px",
          headerPadding: "5px 6px",
          headerFontSize: "10px",
        };
      }
      if (rpp <= 8) {
        return {
          cellPadding: "5px 5px",
          fontSize: "10px",
          codeFontSize: "9.5px",
          nameFontSize: "10.5px",
          photoSize: 46,
          minRowHeight: "52px",
          checkboxSize: "13px",
          headerPadding: "4px 5px",
          headerFontSize: "9.5px",
        };
      }
      return {
        cellPadding: "3px 4px",
        fontSize: "9px",
        codeFontSize: "8.5px",
        nameFontSize: "9.5px",
        photoSize: 26,
        minRowHeight: "32px",
        checkboxSize: "11px",
        headerPadding: "4px 4px",
        headerFontSize: "8.5px",
      };
    }

    // Standard A4 Portrait (Printable body ~960px)
    if (rpp <= 3) {
      return {
        cellPadding: "24px 12px",
        fontSize: "14px",
        codeFontSize: "13.5px",
        nameFontSize: "16px",
        photoSize: 155,
        minRowHeight: "260px",
        checkboxSize: "18px",
        headerPadding: "10px 10px",
        headerFontSize: "12px",
      };
    }
    if (rpp <= 4) {
      // Tailored specifically for 4 rows occupying the whole A4 page
      return {
        cellPadding: "18px 10px",
        fontSize: "13px",
        codeFontSize: "12.5px",
        nameFontSize: "14.5px",
        photoSize: 125,
        minRowHeight: "205px",
        checkboxSize: "16px",
        headerPadding: "9px 10px",
        headerFontSize: "11.5px",
      };
    }
    if (rpp <= 6) {
      return {
        cellPadding: "14px 8px",
        fontSize: "12px",
        codeFontSize: "11.5px",
        nameFontSize: "13.5px",
        photoSize: 92,
        minRowHeight: "135px",
        checkboxSize: "15px",
        headerPadding: "8px 8px",
        headerFontSize: "11px",
      };
    }
    if (rpp <= 8) {
      return {
        cellPadding: "11px 8px",
        fontSize: "11.5px",
        codeFontSize: "11px",
        nameFontSize: "12.5px",
        photoSize: 68,
        minRowHeight: "98px",
        checkboxSize: "14px",
        headerPadding: "7px 8px",
        headerFontSize: "10.5px",
      };
    }
    if (rpp <= 10) {
      return {
        cellPadding: "9px 8px",
        fontSize: "11px",
        codeFontSize: "10.5px",
        nameFontSize: "12px",
        photoSize: 50,
        minRowHeight: "72px",
        checkboxSize: "13px",
        headerPadding: "6px 8px",
        headerFontSize: "10px",
      };
    }
    if (rpp <= 12) {
      return {
        cellPadding: "7px 7px",
        fontSize: "10.5px",
        codeFontSize: "10px",
        nameFontSize: "11.5px",
        photoSize: 40,
        minRowHeight: "56px",
        checkboxSize: "13px",
        headerPadding: "5px 7px",
        headerFontSize: "9.5px",
      };
    }
    if (rpp <= 15) {
      return {
        cellPadding: "5px 6px",
        fontSize: "10px",
        codeFontSize: "9.5px",
        nameFontSize: "10.5px",
        photoSize: 32,
        minRowHeight: "42px",
        checkboxSize: "12px",
        headerPadding: "5px 6px",
        headerFontSize: "9px",
      };
    }
    if (rpp <= 20) {
      return {
        cellPadding: "4px 5px",
        fontSize: "9.5px",
        codeFontSize: "9px",
        nameFontSize: "10px",
        photoSize: 26,
        minRowHeight: "32px",
        checkboxSize: "11px",
        headerPadding: "4px 5px",
        headerFontSize: "8.5px",
      };
    }
    return {
      cellPadding: "3px 4px",
      fontSize: "9px",
      codeFontSize: "8.5px",
      nameFontSize: "9.5px",
      photoSize: 22,
      minRowHeight: "26px",
      checkboxSize: "10px",
      headerPadding: "3px 4px",
      headerFontSize: "8px",
    };
  }, [config.rowsPerPage, config.pageSize]);

  // ──────────────────────────────────────────────────────────────────────────
  // 1. DATA PREPARATION: PRODUCTS REPORT
  // ──────────────────────────────────────────────────────────────────────────
  const sortedProducts = useMemo(() => {
    let prods = [...productsSummary];
    const cleanPrefix = (filterPrefix || "").trim().toUpperCase();
    if (cleanPrefix) {
      prods = prods.filter((p) => p.productCode.toUpperCase().startsWith(cleanPrefix));
    }
    prods.sort((a, b) => {
      const codeA = a.productCode.toLowerCase();
      const codeB = b.productCode.toLowerCase();
      if (codeA !== codeB) {
        return config.sortOrder === "ASC"
          ? codeA.localeCompare(codeB)
          : codeB.localeCompare(codeA);
      }
      return config.sortOrder === "ASC"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name);
    });
    return prods;
  }, [productsSummary, config.sortOrder, filterPrefix]);

  const totalProductsQty = useMemo(() => {
    return sortedProducts.reduce((sum, p) => sum + p.totalBookedQty, 0);
  }, [sortedProducts]);

  // Chunk products into pages if rowsPerPage is configured
  const productPages = useMemo(() => {
    const rpp = config.rowsPerPage && config.rowsPerPage > 0 ? config.rowsPerPage : 0;
    if (rpp === 0 || sortedProducts.length === 0) {
      return [sortedProducts];
    }
    const pages: (typeof sortedProducts)[] = [];
    for (let i = 0; i < sortedProducts.length; i += rpp) {
      pages.push(sortedProducts.slice(i, i + rpp));
    }
    return pages;
  }, [sortedProducts, config.rowsPerPage]);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. DATA PREPARATION: BOOKINGS ORDERS REPORT
  // ──────────────────────────────────────────────────────────────────────────
  const sortedOrders = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      const dateA = new Date(a.order_date).getTime();
      const dateB = new Date(b.order_date).getTime();
      if (dateA !== dateB) {
        return config.sortOrder === "ASC" ? dateA - dateB : dateB - dateA;
      }
      return config.sortOrder === "ASC"
        ? a.order_no.localeCompare(b.order_no)
        : b.order_no.localeCompare(a.order_no);
    });
    return list;
  }, [orders, config.sortOrder]);

  // Grand Totals for Orders Report (accumulating per-order clamped dues)
  const grandTotals = useMemo(() => {
    let totalAmt = 0;
    let totalPaid = 0;
    let totalDue = 0;

    sortedOrders.forEach((order) => {
      if (order.status !== "CANCELLED") {
        const oTotal = Number(order.total_amount || 0);
        const oPaid = order.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
        totalAmt += oTotal;
        totalPaid += oPaid;
        totalDue += Math.max(0, oTotal - oPaid);
      }
    });

    return { totalAmt, totalPaid, totalDue };
  }, [sortedOrders]);

  // Chunk orders into pages if rowsPerPage is configured
  const orderPages = useMemo(() => {
    const rpp = config.rowsPerPage && config.rowsPerPage > 0 ? config.rowsPerPage : 0;
    if (rpp === 0 || sortedOrders.length === 0) {
      return [sortedOrders];
    }
    const pages: Order[][] = [];
    for (let i = 0; i < sortedOrders.length; i += rpp) {
      pages.push(sortedOrders.slice(i, i + rpp));
    }
    return pages;
  }, [sortedOrders, config.rowsPerPage]);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. DATA PREPARATION: PRODUCT-GROUPED BOOKINGS REPORT
  // ──────────────────────────────────────────────────────────────────────────
  const productBookingGroups = useMemo(() => {
    if (!config.groupByProduct) return [];

    const map = new Map<
      string,
      {
        key: string;
        productId: number;
        productCode: string;
        productName: string;
        category: string;
        variantLabel: string;
        photoUrl: string | null;
        totalBookedQty: number;
        totalBookedValue: number;
        bookings: {
          order: Order;
          item?: NonNullable<Order["items"]>[number];
          qty: number;
          subtotal: number;
          variantLabel: string;
        }[];
      }
    >();

    const ordersWithoutItems: Order[] = [];
    const cleanPrefix = (filterPrefix || "").trim().toUpperCase();

    sortedOrders.forEach((order) => {
      const items = order.items || [];
      if (items.length === 0) {
        ordersWithoutItems.push(order);
        return;
      }

      items.forEach((item) => {
        const prod = item.product;
        const code = prod?.product_code || "";
        if (cleanPrefix && !code.toUpperCase().startsWith(cleanPrefix)) {
          return;
        }

        let variantLabel = "";
        if (
          item.variant_index != null &&
          prod?.variants &&
          (prod.variants as any[])[item.variant_index]
        ) {
          variantLabel = `(${(prod.variants as any[])[item.variant_index].label})`;
        } else if (prod?.height) {
          variantLabel = `(H-${prod.height}${prod.base ? ` B-${prod.base}` : ""})`;
        }

        const rawPhotoUrl =
          prod?.photo_urls && prod.photo_urls.length > 0 ? prod.photo_urls[0] : null;

        const key = `${prod?.id ?? "unknown"}_${item.variant_index ?? "none"}`;

        if (!map.has(key)) {
          map.set(key, {
            key,
            productId: prod?.id ?? 0,
            productCode: code || "-",
            productName: typeof prod?.name === "string" ? prod.name : (prod?.name as any)?.name || "Unspecified Product",
            category: getCategoryName((prod as any)?.category),
            variantLabel,
            photoUrl: rawPhotoUrl,
            totalBookedQty: 0,
            totalBookedValue: 0,
            bookings: [],
          });
        }

        const group = map.get(key)!;
        const qty = Number(item.quantity || 1);
        const subtotal = Number(item.subtotal || item.selling_price || 0);

        group.totalBookedQty += qty;
        group.totalBookedValue += subtotal;
        group.bookings.push({
          order,
          item,
          qty,
          subtotal,
          variantLabel,
        });
      });
    });

    const groups = Array.from(map.values());

    // Sort product groups: by productCode / name
    groups.sort((a, b) => {
      if (config.sortOrder === "ASC") {
        return a.productCode.localeCompare(b.productCode) || a.productName.localeCompare(b.productName);
      } else {
        return b.productCode.localeCompare(a.productCode) || b.productName.localeCompare(a.productName);
      }
    });

    // Within each product group, sort bookings by order_date
    groups.forEach((g) => {
      g.bookings.sort((a, b) => {
        const dateA = new Date(a.order.order_date).getTime();
        const dateB = new Date(b.order.order_date).getTime();
        if (dateA !== dateB) {
          return config.sortOrder === "ASC" ? dateA - dateB : dateB - dateA;
        }
        return config.sortOrder === "ASC"
          ? a.order.order_no.localeCompare(b.order.order_no)
          : b.order.order_no.localeCompare(a.order.order_no);
      });
    });

    // If there are orders without items, group them under "Other / Unspecified"
    if (ordersWithoutItems.length > 0) {
      groups.push({
        key: "unspecified",
        productId: 0,
        productCode: "OTHER",
        productName: "Other Bookings / Custom Fees",
        category: "-",
        variantLabel: "",
        photoUrl: null,
        totalBookedQty: ordersWithoutItems.length,
        totalBookedValue: ordersWithoutItems.reduce(
          (sum, o) => sum + Number(o.total_amount || 0),
          0
        ),
        bookings: ordersWithoutItems.map((o) => ({
          order: o,
          item: undefined,
          qty: 1,
          subtotal: Number(o.total_amount || 0),
          variantLabel: "",
        })),
      });
    }

    return groups;
  }, [sortedOrders, config.groupByProduct, config.sortOrder, filterPrefix]);

  const totalGroupedProductsQty = useMemo(() => {
    return productBookingGroups.reduce((sum, g) => sum + g.totalBookedQty, 0);
  }, [productBookingGroups]);

  const flatProductEntries = useMemo(() => {
    if (!config.groupByProduct) return [];
    const list: {
      group: (typeof productBookingGroups)[number];
      booking: (typeof productBookingGroups)[number]["bookings"][number];
      indexInGroup: number;
      isFirstInGroup: boolean;
      isLastInGroup: boolean;
      globalIndex: number;
    }[] = [];

    let gIdx = 0;
    productBookingGroups.forEach((group) => {
      group.bookings.forEach((booking, idx) => {
        gIdx++;
        list.push({
          group,
          booking,
          indexInGroup: idx,
          isFirstInGroup: idx === 0,
          isLastInGroup: idx === group.bookings.length - 1,
          globalIndex: gIdx,
        });
      });
    });
    return list;
  }, [productBookingGroups, config.groupByProduct]);

  const productGroupPages = useMemo(() => {
    const rpp = config.rowsPerPage && config.rowsPerPage > 0 ? config.rowsPerPage : 0;
    if (rpp === 0 || flatProductEntries.length === 0) {
      return [flatProductEntries];
    }
    const pages: (typeof flatProductEntries)[] = [];
    for (let i = 0; i < flatProductEntries.length; i += rpp) {
      pages.push(flatProductEntries.slice(i, i + rpp));
    }
    return pages;
  }, [flatProductEntries, config.rowsPerPage]);

  return (
    <div
      id="bookings-print-root"
      style={{
        fontFamily: fontStack,
        color: "#111111",
        width: "100%",
        maxWidth: "100%",
        margin: "0",
        padding: "0",
        background: "#ffffff",
      }}
    >
      {/* Print-only CSS rules */}
      <style>{`
        @media print {
          @page {
            size: ${config.pageSize === "A5" ? "A5 landscape" : "A4 portrait"};
            margin: 6mm 5mm 6mm 5mm;
          }
          *, *::before, *::after {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          html, body {
            background: #ffffff !important;
            color: #000000 !important;
            margin: 0 !important;
            padding: 0 !important;
            width: 100% !important;
          }
          #bookings-print-root {
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            page-break-after: always !important;
            break-after: page !important;
            width: 100% !important;
            box-sizing: border-box !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print-page:last-child {
            page-break-after: auto !important;
            break-after: auto !important;
          }
          .no-print-page-separator {
            display: none !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            table-layout: fixed !important;
          }
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-row-group !important;
          }
        }
      `}</style>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* OPTION 1: BOOKED PRODUCTS LIST REPORT                               */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {config.reportType === "PRODUCTS" ? (
        productPages.map((pageItems, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === productPages.length - 1;
          const totalPages = productPages.length;
          const startIdx = pageIdx * (config.rowsPerPage || pageItems.length);

          return (
            <div
              key={`prod_page_${pageIdx}`}
              className="print-page"
              style={{
                width: "100%",
                pageBreakAfter: isLastPage ? "auto" : "always",
                breakAfter: isLastPage ? "auto" : "page",
                marginBottom: isLastPage ? "0" : "24px",
              }}
            >
              {/* Header: Full Letterhead on Page 1; Compact Running Header on Subsequent Pages */}
              {isFirstPage ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      borderBottom: "2px solid #111111",
                      paddingBottom: "6px",
                      marginBottom: "8px",
                      width: "100%",
                    }}
                  >
                    <div>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          lineHeight: 1.1,
                        }}
                      >
                        DAHOTRE ARTS
                      </h1>
                      <div
                        style={{
                          marginTop: "2px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: "#333333",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                        }}
                      >
                        Booked Products Summary Report
                      </div>
                    </div>
                    <div style={{ textAlign: "right", lineHeight: 1.25 }}>
                      <div style={{ fontSize: "10px", color: "#555555" }}>
                        Printed: <strong>{printedAt}</strong>
                        {totalPages > 1 && (
                          <span style={{ color: "#c2410c", fontWeight: 700 }}>
                            {" "}&bull; Page 1 of {totalPages}
                          </span>
                        )}
                        {" "}&bull; Total: <strong>{sortedProducts.length} items</strong> ({totalProductsQty} pcs)
                      </div>
                      <div style={{ fontSize: "9px", color: "#777777", marginTop: "1px" }}>
                        Sort: {config.sortOrder === "ASC" ? "Ascending" : "Descending"}
                        {config.showPhotos && " • Photos Included"}
                        {config.rowsPerPage && config.rowsPerPage > 0 && ` • ${config.rowsPerPage} rows/page`}
                      </div>
                    </div>
                  </div>

                  {/* Filter Context Tags Bar */}
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                      fontSize: "9.5px",
                    }}
                  >
                    <div
                      style={{
                        padding: "2px 6px",
                        borderRadius: "3px",
                        background: "#f3f4f6",
                        color: "#374151",
                        border: "1px solid #d1d5db",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#111827" }}>Scope: </span>
                      All Active Bookings
                    </div>
                    {filterPrefix && (
                      <div
                        style={{
                          padding: "2px 6px",
                          borderRadius: "3px",
                          background: "#fff7ed",
                          color: "#c2410c",
                          border: "1px solid #fed7aa",
                          fontWeight: 700,
                        }}
                      >
                        Prefix: {filterPrefix.toUpperCase()}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    borderBottom: "1.5px solid #111111",
                    paddingBottom: "4px",
                    marginBottom: "8px",
                    fontSize: "10px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800, fontSize: "12px", letterSpacing: "0.5px" }}>
                      DAHOTRE ARTS
                    </span>
                    <span style={{ margin: "0 6px", color: "#9ca3af" }}>&bull;</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#4b5563",
                        textTransform: "uppercase",
                        fontSize: "9.5px",
                      }}
                    >
                      Booked Products Summary (Cont.)
                    </span>
                  </div>
                  <div style={{ textAlign: "right", color: "#555555" }}>
                    Printed: <strong>{printedAt}</strong> &bull;{" "}
                    <span style={{ color: "#c2410c", fontWeight: 800, fontSize: "10.5px" }}>
                      Page {pageIdx + 1} of {totalPages}
                    </span>
                  </div>
                </div>
              )}

              {/* Table - Occupying 100% width with rowMetrics scaling */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: rowMetrics.fontSize,
                  tableLayout: "fixed",
                  border: "1.5px solid #111111",
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "5%",
                        textAlign: "center",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "14%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      PRODUCT CODE
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "69%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      PRODUCT NAME &amp; DETAILS
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "12%",
                        textAlign: "right",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      BOOKED QTY
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "#6b7280",
                          fontSize: "11px",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        No reserved products found.
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((prod, i) => {
                      const globalIndex = startIdx + i + 1;
                      const rawPhotoUrl =
                        prod.photoUrl || (prod.photoUrls && prod.photoUrls.length > 0 ? prod.photoUrls[0] : null);
                      const photoUrl = getPrintPhotoUrl(rawPhotoUrl, rowMetrics.photoSize);

                      return (
                        <tr
                          key={`${prod.productId}_${prod.variantIndex ?? "null"}`}
                          style={{
                            background: i % 2 === 1 ? "#fafafa" : "#ffffff",
                            pageBreakInside: "avoid",
                            height: rowMetrics.minRowHeight,
                          }}
                        >
                          {/* Index */}
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: rowMetrics.cellPadding,
                              textAlign: "center",
                              fontWeight: 700,
                              color: "#6b7280",
                              fontSize: rowMetrics.fontSize,
                              verticalAlign: "middle",
                            }}
                          >
                            {globalIndex}
                          </td>

                          {/* Product Code */}
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: rowMetrics.cellPadding,
                              fontWeight: 700,
                              fontFamily: "monospace",
                              color: "#c2410c",
                              fontSize: rowMetrics.codeFontSize,
                              verticalAlign: "middle",
                            }}
                          >
                            <span
                              style={{
                                background: "#fff7ed",
                                padding: "2px 6px",
                                borderRadius: "3px",
                                border: "1px solid #fed7aa",
                                display: "inline-block",
                              }}
                            >
                              {prod.productCode || "-"}
                            </span>
                          </td>

                          {/* Product Name & Variant/Category with Scaled Photo */}
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: rowMetrics.cellPadding,
                              lineHeight: 1.35,
                              wordBreak: "break-word",
                              verticalAlign: "middle",
                            }}
                          >
                            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                              {config.showPhotos &&
                                (photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={prod.name || prod.productCode}
                                    loading="eager"
                                    style={{
                                      width: `${rowMetrics.photoSize}px`,
                                      height: `${rowMetrics.photoSize}px`,
                                      objectFit: "cover",
                                      borderRadius: "4px",
                                      border: "1.5px solid #d1d5db",
                                      flexShrink: 0,
                                      background: "#f9fafb",
                                    }}
                                  />
                                ) : (
                                  <div
                                    style={{
                                      width: `${rowMetrics.photoSize}px`,
                                      height: `${rowMetrics.photoSize}px`,
                                      borderRadius: "4px",
                                      border: "1.5px dashed #d1d5db",
                                      flexShrink: 0,
                                      background: "#f9fafb",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: rowMetrics.photoSize > 60 ? "10px" : "8px",
                                      fontWeight: 600,
                                      color: "#9ca3af",
                                      textAlign: "center",
                                      lineHeight: 1.1,
                                    }}
                                  >
                                    No Image
                                  </div>
                                ))}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div
                                  style={{
                                    fontWeight: 700,
                                    color: "#111827",
                                    fontSize: rowMetrics.nameFontSize,
                                    marginBottom: "4px",
                                  }}
                                >
                                  {prod.name}
                                </div>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                                  {prod.sizeOrVariant && prod.sizeOrVariant !== "-" && (
                                    <span
                                      style={{
                                        fontSize: rowMetrics.fontSize,
                                        fontWeight: 700,
                                        color: "#b45309",
                                        background: "#fef3c7",
                                        padding: "1px 6px",
                                        borderRadius: "3px",
                                        border: "1px solid #fde68a",
                                      }}
                                    >
                                      {prod.sizeOrVariant}
                                    </span>
                                  )}
                                  {getCategoryName(prod.category) && (
                                    <span
                                      style={{
                                        fontSize: "0.85em",
                                        color: "#4b5563",
                                        background: "#f3f4f6",
                                        padding: "1px 6px",
                                        borderRadius: "3px",
                                        border: "1px solid #e5e7eb",
                                      }}
                                    >
                                      {getCategoryName(prod.category)}
                                    </span>
                                  )}
                                </div>

                                {config.includeOrders && prod.orders && prod.orders.length > 0 && (
                                  <div
                                    style={{
                                      marginTop: "8px",
                                      paddingTop: "6px",
                                      borderTop: "1px dashed #d1d5db",
                                    }}
                                  >
                                    <div
                                      style={{
                                        fontSize: "9px",
                                        fontWeight: 800,
                                        color: "#4b5563",
                                        textTransform: "uppercase",
                                        letterSpacing: "0.5px",
                                        marginBottom: "4px",
                                      }}
                                    >
                                      Contributing Bookings ({prod.orders.length} {prod.orders.length === 1 ? "order" : "orders"}):
                                    </div>
                                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                                      {prod.orders.map((ord) => (
                                        <div
                                          key={ord.orderId}
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            fontSize: "9.5px",
                                            background: "#f9fafb",
                                            padding: "3px 6px",
                                            borderRadius: "3px",
                                            border: "1px solid #e5e7eb",
                                          }}
                                        >
                                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span style={{ fontFamily: "monospace", fontWeight: 800, color: "#c2410c" }}>
                                              {ord.orderNo}
                                            </span>
                                            <span style={{ color: "#111827", fontWeight: 600 }}>
                                              {ord.customerName}
                                            </span>
                                          </div>
                                          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#374151" }}>
                                              Qty: {ord.qty}
                                            </span>
                                            <span
                                              style={{
                                                fontSize: "8.5px",
                                                padding: "1px 4px",
                                                borderRadius: "2px",
                                                fontWeight: 700,
                                                background: ord.status === "COMPLETED" ? "#dcfce7" : "#fef3c7",
                                                color: ord.status === "COMPLETED" ? "#15803d" : "#b45309",
                                              }}
                                            >
                                              {ord.status}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Booked Quantity */}
                          <td
                            style={{
                              border: "1px solid #d1d5db",
                              padding: rowMetrics.cellPadding,
                              textAlign: "right",
                              fontFamily: "monospace",
                              fontSize: rowMetrics.nameFontSize,
                              fontWeight: 800,
                              color: "#111827",
                              verticalAlign: "middle",
                            }}
                          >
                            {prod.totalBookedQty}{" "}
                            <span style={{ fontSize: "0.8em", fontWeight: 600, color: "#6b7280" }}>pcs</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>

                {/* Final Grand Total - Displayed ONLY on the final page (never per-page) */}
                {isLastPage && sortedProducts.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                      <td
                        colSpan={3}
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          textAlign: "right",
                          letterSpacing: "0.5px",
                          fontSize: rowMetrics.fontSize,
                        }}
                      >
                        FINAL GRAND TOTAL ({sortedProducts.length} {sortedProducts.length === 1 ? "ITEM" : "ITEMS"})
                      </td>
                      <td
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          textAlign: "right",
                          fontFamily: "monospace",
                          fontSize: rowMetrics.nameFontSize,
                          fontWeight: 800,
                          color: "#c2410c",
                        }}
                      >
                        {totalProductsQty} pcs
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* On-screen visual page separator (hidden during actual printing) */}
              {!isLastPage && (
                <div
                  className="no-print-page-separator"
                  style={{
                    margin: "16px 0",
                    borderTop: "2px dashed #d1d5db",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "10px",
                    letterSpacing: "1px",
                  }}
                >
                  ─── PAGE {pageIdx + 1} END / NEXT PAGE ───
                </div>
              )}

              {/* Disclaimer on the final page */}
              {isLastPage && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "9px",
                    color: "#9ca3af",
                    textAlign: "center",
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: "4px",
                  }}
                >
                  Dahotre Arts &bull; Internal Bookings Summary Report (Generated Automatically)
                </div>
              )}
            </div>
          );
        })
      ) : config.groupByProduct ? (
        /* ─────────────────────────────────────────────────────────────────── */
        /* OPTION 2B: BOOKINGS LIST GROUPED BY PRODUCT                         */
        /* ─────────────────────────────────────────────────────────────────── */
        productGroupPages.map((pageEntries, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === productGroupPages.length - 1;
          const totalPages = productGroupPages.length;

          return (
            <div
              key={`product_group_page_${pageIdx}`}
              className="print-page"
              style={{
                width: "100%",
                pageBreakAfter: isLastPage ? "auto" : "always",
                breakAfter: isLastPage ? "auto" : "page",
                marginBottom: isLastPage ? "0" : "24px",
              }}
            >
              {/* Header: Full Letterhead on Page 1; Compact Running Header on Subsequent Pages */}
              {isFirstPage ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      borderBottom: "2px solid #111111",
                      paddingBottom: "6px",
                      marginBottom: "8px",
                      width: "100%",
                    }}
                  >
                    <div>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          lineHeight: 1.1,
                        }}
                      >
                        DAHOTRE ARTS
                      </h1>
                      <div
                        style={{
                          marginTop: "2px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: "#333333",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                        }}
                      >
                        Bookings Report &bull; Grouped by Product
                      </div>
                    </div>
                    <div style={{ textAlign: "right", lineHeight: 1.25 }}>
                      <div style={{ fontSize: "10px", color: "#555555" }}>
                        Printed: <strong>{printedAt}</strong>
                        {totalPages > 1 && (
                          <span style={{ color: "#c2410c", fontWeight: 700 }}>
                            {" "}&bull; Page 1 of {totalPages}
                          </span>
                        )}
                        {" "}&bull; Total: <strong>{sortedOrders.length} bookings</strong> &bull; <strong>{productBookingGroups.length} products</strong> ({totalGroupedProductsQty} pcs)
                      </div>
                      <div style={{ fontSize: "9px", color: "#777777", marginTop: "1px" }}>
                        Sort: {config.sortOrder === "ASC" ? "Ascending" : "Descending"}
                        {" • Grouped by Product"}
                        {config.showPhotos && " • Photos Included"}
                        {config.rowsPerPage && config.rowsPerPage > 0 && ` • ${config.rowsPerPage} rows/page`}
                      </div>
                    </div>
                  </div>

                  {/* Filter Context Tags Bar */}
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                      fontSize: "9.5px",
                    }}
                  >
                    {[
                      [
                        "Date Range",
                        config.dateFrom && config.dateTo
                          ? `${config.dateFrom} to ${config.dateTo}`
                          : config.dateFrom
                          ? `From ${config.dateFrom}`
                          : config.dateTo
                          ? `Until ${config.dateTo}`
                          : "All Time",
                      ],
                      ["Status", filterStatus !== "ALL" ? filterStatus : null],
                      ["Payment", filterPaymentMode !== "ALL" ? filterPaymentMode : null],
                      [
                        "Fulfillment",
                        filterFulfillment && filterFulfillment !== "ALL" ? filterFulfillment : null,
                      ],
                      ["Prefix", filterPrefix ? filterPrefix.toUpperCase() : null],
                      ["Search", searchQuery ? searchQuery : null],
                    ]
                      .filter((item): item is [string, string] => Boolean(item[1]))
                      .map(([label, value]) => (
                        <div
                          key={label}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#111827" }}>{label}: </span>
                          {value}
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    borderBottom: "1.5px solid #111111",
                    paddingBottom: "4px",
                    marginBottom: "8px",
                    fontSize: "10px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800, fontSize: "12px", letterSpacing: "0.5px" }}>
                      DAHOTRE ARTS
                    </span>
                    <span style={{ margin: "0 6px", color: "#9ca3af" }}>&bull;</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#4b5563",
                        textTransform: "uppercase",
                        fontSize: "9.5px",
                      }}
                    >
                      Bookings Report - Grouped by Product (Cont.)
                    </span>
                  </div>
                  <div style={{ textAlign: "right", color: "#555555" }}>
                    Printed: <strong>{printedAt}</strong> &bull;{" "}
                    <span style={{ color: "#c2410c", fontWeight: 800, fontSize: "10.5px" }}>
                      Page {pageIdx + 1} of {totalPages}
                    </span>
                  </div>
                </div>
              )}

              {/* Table */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  tableLayout: "fixed",
                  fontSize: rowMetrics.fontSize,
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6", color: "#111111" }}>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "3.5%",
                        textAlign: "center",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      &#9633;
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "3.5%",
                        textAlign: "center",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "14%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      ORDER NO &amp; DATE
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "22%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      RESERVED QTY &amp; DETAILS
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "26%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      CUSTOMER NAME &amp; ADDRESS
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "13%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      PHONE NUMBER
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "18%",
                        textAlign: "right",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      TOTAL / PAID / DUE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageEntries.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "#6b7280",
                          fontSize: "11px",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        No bookings found for current selection.
                      </td>
                    </tr>
                  ) : (
                    pageEntries.map((entry, idx) => {
                      let renderProductHeader = false;
                      let isContinuation = false;

                      if (idx === 0) {
                        renderProductHeader = true;
                        if (pageIdx > 0 && productGroupPages[pageIdx - 1]?.length > 0) {
                          const prevPageEntries = productGroupPages[pageIdx - 1];
                          const lastPrevEntry = prevPageEntries[prevPageEntries.length - 1];
                          if (lastPrevEntry.group.key === entry.group.key) {
                            isContinuation = true;
                          }
                        }
                      } else {
                        const prevEntry = pageEntries[idx - 1];
                        if (prevEntry.group.key !== entry.group.key) {
                          renderProductHeader = true;
                        }
                      }

                      const order = entry.booking.order;
                      const totalAmt = Number(order.total_amount || 0);
                      const paidAmt = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                      const dueAmt = Math.max(0, totalAmt - paidAmt);
                      const photoUrl = entry.group.photoUrl
                        ? getPrintPhotoUrl(entry.group.photoUrl, 48)
                        : null;

                      return (
                        <Fragment key={`${entry.group.key}_${order.id}_${entry.indexInGroup}`}>
                          {renderProductHeader && (
                            <tr
                              style={{
                                background: "#e5e7eb",
                                pageBreakInside: "avoid",
                              }}
                            >
                              <td
                                colSpan={7}
                                style={{
                                  border: "1.5px solid #111111",
                                  padding: "5px 8px",
                                  fontSize: "10px",
                                }}
                              >
                                <div
                                  style={{
                                    display: "flex",
                                    justifyContent: "space-between",
                                    alignItems: "center",
                                    gap: "8px",
                                  }}
                                >
                                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                                    {config.showPhotos &&
                                      (photoUrl ? (
                                        <img
                                          src={photoUrl}
                                          alt={entry.group.productName}
                                          loading="eager"
                                          style={{
                                            width: `${Math.min(48, Math.max(30, rowMetrics.photoSize))}px`,
                                            height: `${Math.min(48, Math.max(30, rowMetrics.photoSize))}px`,
                                            objectFit: "cover",
                                            borderRadius: "3px",
                                            border: "1px solid #9ca3af",
                                            flexShrink: 0,
                                            background: "#f9fafb",
                                          }}
                                        />
                                      ) : (
                                        <div
                                          style={{
                                            width: "30px",
                                            height: "30px",
                                            border: "1px dashed #9ca3af",
                                            borderRadius: "3px",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontSize: "8px",
                                            color: "#6b7280",
                                            flexShrink: 0,
                                            background: "#f9fafb",
                                          }}
                                        >
                                          No Img
                                        </div>
                                      ))}
                                    <div>
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "6px",
                                          flexWrap: "wrap",
                                        }}
                                      >
                                        <span
                                          style={{
                                            fontFamily: "monospace",
                                            fontWeight: 800,
                                            color: "#c2410c",
                                            background: "#fff7ed",
                                            padding: "1px 5px",
                                            borderRadius: "3px",
                                            border: "1px solid #fed7aa",
                                            fontSize: rowMetrics.codeFontSize,
                                          }}
                                        >
                                          {entry.group.productCode}
                                        </span>
                                        <span
                                          style={{
                                            fontWeight: 800,
                                            fontSize: rowMetrics.nameFontSize,
                                            color: "#111827",
                                          }}
                                        >
                                          {entry.group.productName}
                                        </span>
                                        {entry.group.variantLabel && (
                                          <span
                                            style={{
                                              fontSize: "10px",
                                              color: "#b45309",
                                              background: "#fef3c7",
                                              padding: "1px 5px",
                                              borderRadius: "3px",
                                              border: "1px solid #fde68a",
                                              fontWeight: 700,
                                            }}
                                          >
                                            {entry.group.variantLabel}
                                          </span>
                                        )}
                                        {entry.group.category && entry.group.category !== "-" && (
                                          <span
                                            style={{
                                              fontSize: "9px",
                                              color: "#4b5563",
                                              background: "#ffffff",
                                              padding: "1px 5px",
                                              borderRadius: "3px",
                                              border: "1px solid #d1d5db",
                                            }}
                                          >
                                            {entry.group.category}
                                          </span>
                                        )}
                                        {isContinuation && (
                                          <span
                                            style={{
                                              fontSize: "10px",
                                              fontWeight: 700,
                                              color: "#4b5563",
                                              marginLeft: "4px",
                                            }}
                                          >
                                            (Continued from previous page)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                                    <span
                                      style={{
                                        fontSize: "10.5px",
                                        fontWeight: 800,
                                        color: "#111827",
                                        fontFamily: "monospace",
                                        background: "#ffffff",
                                        padding: "2px 6px",
                                        borderRadius: "3px",
                                        border: "1px solid #d1d5db",
                                      }}
                                    >
                                      TOTAL RESERVED:{" "}
                                      <strong style={{ color: "#c2410c" }}>
                                        {entry.group.totalBookedQty} pcs
                                      </strong>{" "}
                                      ({entry.group.bookings.length}{" "}
                                      {entry.group.bookings.length === 1 ? "booking" : "bookings"})
                                    </span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}

                          {/* Individual Booking Row */}
                          <tr
                            style={{
                              background: entry.indexInGroup % 2 === 1 ? "#fafafa" : "#ffffff",
                              pageBreakInside: "avoid",
                              height: rowMetrics.minRowHeight,
                            }}
                          >
                            {/* Checkbox */}
                            <td
                              style={{
                                border: "1px solid #d1d5db",
                                padding: rowMetrics.cellPadding,
                                verticalAlign: "middle",
                                textAlign: "center",
                              }}
                            >
                              <div
                                style={{
                                  width: rowMetrics.checkboxSize,
                                  height: rowMetrics.checkboxSize,
                                  border: "1.5px solid #222222",
                                  borderRadius: "2px",
                                  margin: "0 auto",
                                  background: "#ffffff",
                                }}
                              />
                            </td>

                            {/* # Index */}
                            <td
                              style={{
                                border: "1px solid #d1d5db",
                                padding: rowMetrics.cellPadding,
                                verticalAlign: "middle",
                                textAlign: "center",
                                fontWeight: 700,
                                color: "#6b7280",
                                fontSize: rowMetrics.fontSize,
                              }}
                            >
                              {entry.globalIndex}
                            </td>

                            {/* Order No & Date */}
                            <td
                              style={{
                                border: "1px solid #d1d5db",
                                padding: rowMetrics.cellPadding,
                                verticalAlign: "middle",
                                fontWeight: 700,
                                fontFamily: "monospace",
                                fontSize: rowMetrics.codeFontSize,
                              }}
                            >
                              <div
                                style={{
                                  color: "#111827",
                                  letterSpacing: "0.3px",
                                  fontWeight: 800,
                                }}
                              >
                                {order.order_no}
                              </div>
                              <div
                                style={{
                                  fontSize: "0.85em",
                                  fontWeight: 500,
                                  color: "#6b7280",
                                  marginTop: "2px",
                                  fontFamily: "sans-serif",
                                }}
                              >
                                {new Date(order.order_date).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </div>
                            </td>

                            {/* Booked Qty & Details */}
                            <td
                              style={{
                                border: "1px solid #d1d5db",
                                padding: rowMetrics.cellPadding,
                                verticalAlign: "middle",
                                lineHeight: 1.35,
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "6px",
                                  flexWrap: "wrap",
                                }}
                              >
                                <span
                                  style={{
                                    fontWeight: 800,
                                    color: "#ea580c",
                                    fontSize: rowMetrics.nameFontSize,
                                    fontFamily: "monospace",
                                  }}
                                >
                                  &times;{entry.booking.qty} pcs
                                </span>
                                {entry.booking.variantLabel && (
                                  <span
                                    style={{
                                      color: "#b45309",
                                      fontSize: rowMetrics.fontSize,
                                      fontWeight: 700,
                                      background: "#fef3c7",
                                      padding: "1px 5px",
                                      borderRadius: "3px",
                                      border: "1px solid #fde68a",
                                    }}
                                  >
                                    {entry.booking.variantLabel}
                                  </span>
                                )}
                              </div>
                              {entry.booking.subtotal > 0 && (
                                <div
                                  style={{
                                    fontSize: "9.5px",
                                    color: "#4b5563",
                                    marginTop: "2px",
                                    fontFamily: "monospace",
                                  }}
                                >
                                  Item: {formatINR(entry.booking.subtotal)}
                                </div>
                              )}
                              {order.notes && (
                                <div
                                  style={{
                                    marginTop: "4px",
                                    padding: "3px 6px",
                                    background: "#fffbeb",
                                    border: "1px solid #d97706",
                                    borderRadius: "3px",
                                    fontSize: "9px",
                                    color: "#1e293b",
                                    fontWeight: 500,
                                    lineHeight: 1.3,
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 800,
                                      color: "#b45309",
                                      marginRight: "3px",
                                    }}
                                  >
                                    📝 NOTE:
                                  </span>
                                  {order.notes}
                                </div>
                              )}
                            </td>

                            {/* Customer Name & Address */}
                            <td
                              style={{
                                border: "1px solid #d1d5db",
                                padding: rowMetrics.cellPadding,
                                verticalAlign: "middle",
                                fontWeight: 700,
                                wordBreak: "break-word",
                                fontSize: rowMetrics.nameFontSize,
                                color: "#111827",
                              }}
                            >
                              <div>{typeof order.customer?.name === "string" ? order.customer.name : (order.customer?.name as any)?.name || "Unknown"}</div>
                              {order.customer?.address && (
                                <div
                                  style={{
                                    fontSize: "0.8em",
                                    fontWeight: 400,
                                    color: "#6b7280",
                                    marginTop: "2px",
                                    lineHeight: 1.25,
                                  }}
                                >
                                  {typeof order.customer.address === "string" ? order.customer.address : String(order.customer.address)}
                                </div>
                              )}
                            </td>

                            {/* Phone Number */}
                            <td
                              style={{
                                border: "1px solid #d1d5db",
                                padding: rowMetrics.cellPadding,
                                verticalAlign: "middle",
                                fontFamily: "monospace",
                                color: "#1f2937",
                                fontSize: rowMetrics.codeFontSize,
                                fontWeight: 600,
                              }}
                            >
                              {order.customer?.phone || "-"}
                            </td>

                            {/* Total / Paid / Due */}
                            <td
                              style={{
                                border: "1px solid #d1d5db",
                                padding: rowMetrics.cellPadding,
                                verticalAlign: "middle",
                                textAlign: "right",
                                fontFamily: "monospace",
                                lineHeight: 1.35,
                                fontSize: rowMetrics.fontSize,
                              }}
                            >
                              <div style={{ color: "#111827", fontWeight: 700 }}>
                                Tot: {formatINR(totalAmt)}
                              </div>
                              <div
                                style={{
                                  color: "#16a34a",
                                  fontSize: "0.95em",
                                  fontWeight: 700,
                                }}
                              >
                                Paid: {formatINR(paidAmt)}
                              </div>
                              {order.status === "CANCELLED" ? (
                                <div
                                  style={{
                                    color: "#9ca3af",
                                    fontSize: "0.9em",
                                    fontWeight: 700,
                                  }}
                                >
                                  CANCELLED
                                </div>
                              ) : (
                                <div
                                  style={{
                                    fontWeight: 800,
                                    color: dueAmt > 0 ? "#dc2626" : "#4b5563",
                                    fontSize: "0.95em",
                                  }}
                                >
                                  Due: {formatINR(dueAmt)}
                                </div>
                              )}
                            </td>
                          </tr>

                          {/* Product Group Subtotal Row */}
                          {entry.isLastInGroup && (
                            <tr
                              style={{
                                background: "#f9fafb",
                                pageBreakInside: "avoid",
                              }}
                            >
                              <td
                                colSpan={3}
                                style={{
                                  border: "1px solid #d1d5db",
                                  padding: "4px 8px",
                                  textAlign: "right",
                                  fontSize: "9.5px",
                                  color: "#4b5563",
                                  textTransform: "uppercase",
                                  fontWeight: 700,
                                }}
                              >
                                Subtotal for {entry.group.productCode} ({entry.group.bookings.length}{" "}
                                {entry.group.bookings.length === 1 ? "booking" : "bookings"}):
                              </td>
                              <td
                                style={{
                                  border: "1px solid #d1d5db",
                                  padding: "4px 8px",
                                  fontFamily: "monospace",
                                  fontWeight: 800,
                                  color: "#c2410c",
                                  fontSize: "10px",
                                }}
                              >
                                {entry.group.totalBookedQty} pcs
                              </td>
                              <td
                                colSpan={2}
                                style={{
                                  border: "1px solid #d1d5db",
                                  padding: "4px 8px",
                                }}
                              />
                              <td
                                style={{
                                  border: "1px solid #d1d5db",
                                  padding: "4px 8px",
                                  textAlign: "right",
                                  fontFamily: "monospace",
                                  fontSize: "9.5px",
                                  color: "#374151",
                                  fontWeight: 700,
                                }}
                              >
                                Item Tot: {formatINR(entry.group.totalBookedValue)}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })
                  )}
                </tbody>

                {/* Final Grand Total - Rendered ONLY on the final page */}
                {isLastPage && flatProductEntries.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                      <td
                        colSpan={3}
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          textAlign: "right",
                          letterSpacing: "0.5px",
                          fontSize: rowMetrics.fontSize,
                        }}
                      >
                        FINAL GRAND TOTAL ({sortedOrders.length}{" "}
                        {sortedOrders.length === 1 ? "BOOKING" : "BOOKINGS"} ACROSS{" "}
                        {productBookingGroups.length}{" "}
                        {productBookingGroups.length === 1 ? "PRODUCT" : "PRODUCTS"})
                      </td>
                      <td
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          fontFamily: "monospace",
                          fontSize: rowMetrics.nameFontSize,
                          fontWeight: 800,
                          color: "#c2410c",
                        }}
                      >
                        {totalGroupedProductsQty} pcs
                      </td>
                      <td
                        colSpan={2}
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          textAlign: "right",
                          fontSize: "10px",
                          color: "#4b5563",
                          letterSpacing: "0.3px",
                        }}
                      >
                        GRAND FINANCIAL TOTALS:
                      </td>
                      <td
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          textAlign: "right",
                          fontFamily: "monospace",
                          lineHeight: 1.35,
                          fontSize: rowMetrics.fontSize,
                        }}
                      >
                        <div style={{ color: "#111827", fontWeight: 800 }}>
                          Tot: {formatINR(grandTotals.totalAmt)}
                        </div>
                        <div style={{ color: "#16a34a", fontWeight: 800 }}>
                          Paid: {formatINR(grandTotals.totalPaid)}
                        </div>
                        <div style={{ color: "#dc2626", fontWeight: 800 }}>
                          Due: {formatINR(grandTotals.totalDue)}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* On-screen visual page separator */}
              {!isLastPage && (
                <div
                  className="no-print-page-separator"
                  style={{
                    margin: "16px 0",
                    borderTop: "2px dashed #d1d5db",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "10px",
                    letterSpacing: "1px",
                  }}
                >
                  ─── PAGE {pageIdx + 1} END / NEXT PAGE ───
                </div>
              )}

              {/* Disclaimer on the final page */}
              {isLastPage && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "9px",
                    color: "#9ca3af",
                    textAlign: "center",
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: "4px",
                  }}
                >
                  Dahotre Arts &bull; Internal Bookings Summary Report (Generated Automatically)
                </div>
              )}
            </div>
          );
        })
      ) : (
        /* ─────────────────────────────────────────────────────────────────── */
        /* OPTION 2: BOOKINGS LIST (ORDERS) REPORT                             */
        /* ─────────────────────────────────────────────────────────────────── */
        orderPages.map((pageOrders, pageIdx) => {
          const isFirstPage = pageIdx === 0;
          const isLastPage = pageIdx === orderPages.length - 1;
          const totalPages = orderPages.length;
          const startIdx = pageIdx * (config.rowsPerPage || pageOrders.length);

          return (
            <div
              key={`order_page_${pageIdx}`}
              className="print-page"
              style={{
                width: "100%",
                pageBreakAfter: isLastPage ? "auto" : "always",
                breakAfter: isLastPage ? "auto" : "page",
                marginBottom: isLastPage ? "0" : "24px",
              }}
            >
              {/* Header: Full Letterhead on Page 1; Compact Running Header on Subsequent Pages */}
              {isFirstPage ? (
                <>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-end",
                      borderBottom: "2px solid #111111",
                      paddingBottom: "6px",
                      marginBottom: "8px",
                      width: "100%",
                    }}
                  >
                    <div>
                      <h1
                        style={{
                          margin: 0,
                          fontSize: "18px",
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                          lineHeight: 1.1,
                        }}
                      >
                        DAHOTRE ARTS
                      </h1>
                      <div
                        style={{
                          marginTop: "2px",
                          fontSize: "10.5px",
                          fontWeight: 700,
                          color: "#333333",
                          textTransform: "uppercase",
                          letterSpacing: "0.8px",
                        }}
                      >
                        Bookings &amp; Reservations Summary Report
                      </div>
                    </div>
                    <div style={{ textAlign: "right", lineHeight: 1.25 }}>
                      <div style={{ fontSize: "10px", color: "#555555" }}>
                        Printed: <strong>{printedAt}</strong>
                        {totalPages > 1 && (
                          <span style={{ color: "#c2410c", fontWeight: 700 }}>
                            {" "}&bull; Page 1 of {totalPages}
                          </span>
                        )}
                        {" "}&bull; Total: <strong>{sortedOrders.length} records</strong>
                      </div>
                      <div style={{ fontSize: "9px", color: "#777777", marginTop: "1px" }}>
                        Sort: {config.sortOrder === "ASC" ? "Ascending" : "Descending"}
                        {config.groupByDate && " • Grouped by Date"}
                        {config.showPhotos && " • Photos Included"}
                        {config.rowsPerPage && config.rowsPerPage > 0 && ` • ${config.rowsPerPage} rows/page`}
                      </div>
                    </div>
                  </div>

                  {/* Filter Context Tags Bar */}
                  <div
                    style={{
                      display: "flex",
                      gap: "6px",
                      flexWrap: "wrap",
                      marginBottom: "8px",
                      fontSize: "9.5px",
                    }}
                  >
                    {[
                      [
                        "Date Range",
                        config.dateFrom && config.dateTo
                          ? `${config.dateFrom} to ${config.dateTo}`
                          : config.dateFrom
                          ? `From ${config.dateFrom}`
                          : config.dateTo
                          ? `Until ${config.dateTo}`
                          : "All Time",
                      ],
                      ["Status", filterStatus !== "ALL" ? filterStatus : null],
                      ["Payment", filterPaymentMode !== "ALL" ? filterPaymentMode : null],
                      [
                        "Fulfillment",
                        filterFulfillment && filterFulfillment !== "ALL" ? filterFulfillment : null,
                      ],
                      ["Prefix", filterPrefix ? filterPrefix.toUpperCase() : null],
                      ["Search", searchQuery ? searchQuery : null],
                    ]
                      .filter((item): item is [string, string] => Boolean(item[1]))
                      .map(([label, value]) => (
                        <div
                          key={label}
                          style={{
                            padding: "2px 6px",
                            borderRadius: "3px",
                            background: "#f3f4f6",
                            color: "#374151",
                            border: "1px solid #d1d5db",
                          }}
                        >
                          <span style={{ fontWeight: 700, color: "#111827" }}>{label}: </span>
                          {value}
                        </div>
                      ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    borderBottom: "1.5px solid #111111",
                    paddingBottom: "4px",
                    marginBottom: "8px",
                    fontSize: "10px",
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 800, fontSize: "12px", letterSpacing: "0.5px" }}>
                      DAHOTRE ARTS
                    </span>
                    <span style={{ margin: "0 6px", color: "#9ca3af" }}>&bull;</span>
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#4b5563",
                        textTransform: "uppercase",
                        fontSize: "9.5px",
                      }}
                    >
                      Bookings Summary (Cont.)
                    </span>
                  </div>
                  <div style={{ textAlign: "right", color: "#555555" }}>
                    Printed: <strong>{printedAt}</strong> &bull;{" "}
                    <span style={{ color: "#c2410c", fontWeight: 800, fontSize: "10.5px" }}>
                      Page {pageIdx + 1} of {totalPages}
                    </span>
                  </div>
                </div>
              )}

              {/* Table - Occupying 100% width with rowMetrics scaling */}
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: rowMetrics.fontSize,
                  tableLayout: "fixed",
                  border: "1.5px solid #111111",
                }}
              >
                <thead>
                  <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "3.5%",
                        textAlign: "center",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      &#9633;
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "3.5%",
                        textAlign: "center",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      #
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "14%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      ORDER NO &amp; DATE
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "43%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      PRODUCT(S) &amp; VARIANTS
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "14%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      CUSTOMER NAME
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "10%",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      PHONE NUMBER
                    </th>
                    <th
                      style={{
                        border: "1px solid #111111",
                        padding: rowMetrics.headerPadding,
                        width: "12%",
                        textAlign: "right",
                        fontSize: rowMetrics.headerFontSize,
                        fontWeight: 800,
                      }}
                    >
                      TOTAL / PAID / DUE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageOrders.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          padding: "20px",
                          textAlign: "center",
                          color: "#6b7280",
                          fontSize: "11px",
                          border: "1px solid #d1d5db",
                        }}
                      >
                        No bookings found for current selection.
                      </td>
                    </tr>
                  ) : (
                    pageOrders.map((order, idx) => {
                      const globalIndex = startIdx + idx + 1;
                      const dateKey = order.order_date
                        ? getLocalDateKey(order.order_date)
                        : "Unknown Date";

                      // Check if a date section header should precede this row
                      let renderDateHeader = false;
                      let isContinuation = false;

                      if (config.groupByDate) {
                        if (idx === 0) {
                          renderDateHeader = true;
                          if (pageIdx > 0 && orderPages[pageIdx - 1]?.length > 0) {
                            const prevPageOrders = orderPages[pageIdx - 1];
                            const lastPrevOrder = prevPageOrders[prevPageOrders.length - 1];
                            const lastPrevDateKey = lastPrevOrder.order_date
                              ? getLocalDateKey(lastPrevOrder.order_date)
                              : "Unknown Date";
                            if (lastPrevDateKey === dateKey) {
                              isContinuation = true;
                            }
                          }
                        } else {
                          const prevOrder = pageOrders[idx - 1];
                          const prevDateKey = prevOrder.order_date
                            ? getLocalDateKey(prevOrder.order_date)
                            : "Unknown Date";
                          if (prevDateKey !== dateKey) {
                            renderDateHeader = true;
                          }
                        }
                      }

                      return (
                        <Fragment key={order.id}>
                          {renderDateHeader && (
                            <tr
                              style={{
                                background: "#e5e7eb",
                                pageBreakInside: "avoid",
                              }}
                            >
                              <td
                                colSpan={7}
                                style={{
                                  border: "1px solid #111111",
                                  padding: "5px 8px",
                                  fontSize: "10.5px",
                                  fontWeight: 800,
                                  color: "#111827",
                                  letterSpacing: "0.4px",
                                }}
                              >
                                📅 {getFormattedDate(dateKey).toUpperCase()}
                                {isContinuation && (
                                  <span style={{ color: "#4b5563", fontWeight: 600, marginLeft: "6px" }}>
                                    (Continued from previous page)
                                  </span>
                                )}
                              </td>
                            </tr>
                          )}
                          <OrderRow
                            order={order}
                            index={globalIndex}
                            showPhotos={config.showPhotos}
                            rowMetrics={rowMetrics}
                          />
                        </Fragment>
                      );
                    })
                  )}
                </tbody>

                {/* Final Grand Total - Rendered ONLY on the final page (never per-page) */}
                {isLastPage && sortedOrders.length > 0 && (
                  <tfoot>
                    <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                      <td
                        colSpan={6}
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          textAlign: "right",
                          letterSpacing: "0.5px",
                          fontSize: rowMetrics.fontSize,
                        }}
                      >
                        FINAL GRAND TOTAL ({sortedOrders.length}{" "}
                        {sortedOrders.length === 1 ? "RECORD" : "RECORDS"})
                      </td>
                      <td
                        style={{
                          border: "1px solid #111111",
                          padding: "8px 10px",
                          textAlign: "right",
                          fontFamily: "monospace",
                          lineHeight: 1.3,
                          fontSize: rowMetrics.fontSize,
                        }}
                      >
                        <div style={{ color: "#111827", fontWeight: 700 }}>
                          TOTAL: {formatINR(grandTotals.totalAmt)}
                        </div>
                        <div style={{ color: "#16a34a", fontSize: "0.9em", fontWeight: 700 }}>
                          PAID: {formatINR(grandTotals.totalPaid)}
                        </div>
                        <div style={{ color: "#dc2626", fontWeight: 800, fontSize: "0.95em" }}>
                          DUE: {formatINR(grandTotals.totalDue)}
                        </div>
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* On-screen visual page separator (hidden during actual printing) */}
              {!isLastPage && (
                <div
                  className="no-print-page-separator"
                  style={{
                    margin: "16px 0",
                    borderTop: "2px dashed #d1d5db",
                    textAlign: "center",
                    color: "#9ca3af",
                    fontSize: "10px",
                    letterSpacing: "1px",
                  }}
                >
                  ─── PAGE {pageIdx + 1} END / NEXT PAGE ───
                </div>
              )}

              {/* Disclaimer on the final page */}
              {isLastPage && (
                <div
                  style={{
                    marginTop: "8px",
                    fontSize: "9px",
                    color: "#9ca3af",
                    textAlign: "center",
                    borderTop: "1px solid #e5e7eb",
                    paddingTop: "4px",
                  }}
                >
                  Dahotre Arts &bull; Internal Bookings Summary Report (Generated Automatically)
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponent: Single Order Table Row with Proportional Scaling
// ────────────────────────────────────────────────────────────────────────────
function OrderRow({
  order,
  index,
  showPhotos = false,
  rowMetrics,
}: {
  order: Order;
  index: number;
  showPhotos?: boolean;
  rowMetrics: {
    cellPadding: string;
    fontSize: string;
    codeFontSize: string;
    nameFontSize: string;
    photoSize: number;
    minRowHeight: string;
    checkboxSize: string;
    headerPadding: string;
    headerFontSize: string;
  };
}) {
  const total = Number(order.total_amount || 0);
  const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
  const due = Math.max(0, total - paid);
  const items = order.items || [];

  // Adapt photo size if order contains multiple items
  const itemPhotoSize = useMemo(() => {
    if (items.length <= 1) return rowMetrics.photoSize;
    if (items.length === 2) return Math.max(34, Math.round(rowMetrics.photoSize * 0.7));
    return Math.max(28, Math.round(rowMetrics.photoSize * 0.5));
  }, [items.length, rowMetrics.photoSize]);

  return (
    <tr
      style={{
        background: index % 2 === 1 ? "#fafafa" : "#ffffff",
        pageBreakInside: "avoid",
        height: rowMetrics.minRowHeight,
      }}
    >
      {/* Printable Checkbox */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: rowMetrics.cellPadding,
          verticalAlign: "middle",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: rowMetrics.checkboxSize,
            height: rowMetrics.checkboxSize,
            border: "1.5px solid #222222",
            borderRadius: "2px",
            margin: "0 auto",
            background: "#ffffff",
          }}
        />
      </td>

      {/* # Index */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: rowMetrics.cellPadding,
          verticalAlign: "middle",
          textAlign: "center",
          fontWeight: 700,
          color: "#6b7280",
          fontSize: rowMetrics.fontSize,
        }}
      >
        {index}
      </td>

      {/* Order No & Date */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: rowMetrics.cellPadding,
          verticalAlign: "middle",
          fontWeight: 700,
          fontFamily: "monospace",
          fontSize: rowMetrics.codeFontSize,
        }}
      >
        <div
          style={{
            color: "#111827",
            letterSpacing: "0.3px",
            fontWeight: 800,
          }}
        >
          {order.order_no}
        </div>
        <div
          style={{
            fontSize: "0.85em",
            fontWeight: 500,
            color: "#6b7280",
            marginTop: "3px",
            fontFamily: "sans-serif",
          }}
        >
          {new Date(order.order_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </td>

      {/* Products & Variants with Proportional Scaled Photos */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: rowMetrics.cellPadding,
          verticalAlign: "middle",
          lineHeight: 1.35,
          wordBreak: "break-word",
        }}
      >
        {items.length === 0 ? (
          <span style={{ color: "#9ca3af" }}>No items listed</span>
        ) : (
          items.map((item, idx) => {
            const prod = item.product;
            const prodCode = prod?.product_code || "";
            const rawPhotoUrl =
              prod?.photo_urls && prod.photo_urls.length > 0 ? prod.photo_urls[0] : null;
            const photoUrl = getPrintPhotoUrl(rawPhotoUrl, itemPhotoSize);

            let variantLabel = "";
            if (
              item.variant_index != null &&
              prod?.variants &&
              (prod.variants as any[])[item.variant_index]
            ) {
              variantLabel = `(${(prod.variants as any[])[item.variant_index].label})`;
            } else if (prod?.height) {
              variantLabel = `(H-${prod.height}${prod.base ? ` B-${prod.base}` : ""})`;
            }

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: itemPhotoSize > 50 ? "10px" : "6px",
                  marginBottom: idx < items.length - 1 ? "6px" : "0",
                }}
              >
                {showPhotos &&
                  (photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={prod?.name || prodCode}
                      loading="eager"
                      style={{
                        width: `${itemPhotoSize}px`,
                        height: `${itemPhotoSize}px`,
                        objectFit: "cover",
                        borderRadius: "4px",
                        border: "1.5px solid #d1d5db",
                        flexShrink: 0,
                        background: "#f9fafb",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: `${itemPhotoSize}px`,
                        height: `${itemPhotoSize}px`,
                        borderRadius: "4px",
                        border: "1.5px dashed #d1d5db",
                        flexShrink: 0,
                        background: "#f9fafb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: itemPhotoSize > 60 ? "10px" : "7.5px",
                        fontWeight: 600,
                        color: "#9ca3af",
                        textAlign: "center",
                        lineHeight: 1.1,
                      }}
                    >
                      No Image
                    </div>
                  ))}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ marginBottom: "2px" }}>
                    {prodCode && (
                      <span
                        style={{
                          fontWeight: 700,
                          fontFamily: "monospace",
                          color: "#c2410c",
                          marginRight: "6px",
                          fontSize: rowMetrics.codeFontSize,
                          background: "#fff7ed",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          border: "1px solid #fed7aa",
                        }}
                      >
                        {prodCode}
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: 700,
                        color: "#111827",
                        fontSize: rowMetrics.nameFontSize,
                      }}
                    >
                      {prod?.name || "Product"}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                    {variantLabel && (
                      <span
                        style={{
                          color: "#b45309",
                          fontSize: rowMetrics.fontSize,
                          fontWeight: 700,
                          background: "#fef3c7",
                          padding: "1px 5px",
                          borderRadius: "3px",
                          border: "1px solid #fde68a",
                        }}
                      >
                        {variantLabel}
                      </span>
                    )}
                    <span
                      style={{
                        fontWeight: 800,
                        color: "#ea580c",
                        fontSize: rowMetrics.fontSize,
                      }}
                    >
                      &times;{item.quantity}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
        {order.notes && (
          <div
            style={{
              marginTop: "6px",
              padding: "5px 8px",
              background: "#fffbeb",
              border: "1.5px solid #d97706",
              borderRadius: "4px",
              fontSize: "0.9em",
              lineHeight: "1.35",
              color: "#1e293b",
              fontWeight: 500,
              wordBreak: "break-word",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "#b45309",
                fontSize: "0.85em",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>📝 SPECIAL NOTE:</span>
            </div>
            <div style={{ color: "#0f172a", fontWeight: 600 }}>
              {order.notes}
            </div>
          </div>
        )}
      </td>

      {/* Customer Name */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: rowMetrics.cellPadding,
          verticalAlign: "middle",
          fontWeight: 700,
          wordBreak: "break-word",
          fontSize: rowMetrics.nameFontSize,
          color: "#111827",
        }}
      >
        <div>{typeof order.customer?.name === "string" ? order.customer.name : (order.customer?.name as any)?.name || "Unknown"}</div>
        {order.customer?.address && (
          <div
            style={{
              fontSize: "0.8em",
              fontWeight: 400,
              color: "#6b7280",
              marginTop: "3px",
              lineHeight: 1.25,
            }}
          >
            {typeof order.customer.address === "string" ? order.customer.address : String(order.customer.address)}
          </div>
        )}
      </td>

      {/* Phone Number */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: rowMetrics.cellPadding,
          verticalAlign: "middle",
          fontFamily: "monospace",
          color: "#1f2937",
          fontSize: rowMetrics.codeFontSize,
          fontWeight: 600,
        }}
      >
        {order.customer?.phone || "-"}
      </td>

      {/* Total / Paid / Due Stack */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: rowMetrics.cellPadding,
          verticalAlign: "middle",
          textAlign: "right",
          fontFamily: "monospace",
          lineHeight: 1.35,
          fontSize: rowMetrics.fontSize,
        }}
      >
        <div style={{ color: "#111827", fontWeight: 700 }}>
          Tot: {formatINR(total)}
        </div>
        <div style={{ color: "#16a34a", fontSize: "0.95em", fontWeight: 700 }}>
          Paid: {formatINR(paid)}
        </div>
        {order.status === "CANCELLED" ? (
          <div style={{ color: "#9ca3af", fontSize: "0.9em", fontWeight: 700 }}>
            CANCELLED
          </div>
        ) : (
          <div
            style={{
              fontWeight: 800,
              color: due > 0 ? "#dc2626" : "#4b5563",
              fontSize: "0.95em",
            }}
          >
            Due: {formatINR(due)}
          </div>
        )}
      </td>
    </tr>
  );
}