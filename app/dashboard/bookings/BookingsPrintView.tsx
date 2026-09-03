"use client";

import { useMemo } from "react";
import { Order } from "@/app/actions/orders";
import { BookedProductSummary } from "@/app/actions/bookings";

export type PrintReportType = "PRODUCTS" | "BOOKINGS";

export type BookingsPrintConfig = {
  reportType: PrintReportType;
  dateFrom?: string;
  dateTo?: string;
  groupByDate: boolean;
  sortOrder: "ASC" | "DESC";
  pageSize: "A4" | "A5";
};

type BookingsPrintViewProps = {
  config: BookingsPrintConfig;
  orders: Order[];
  productsSummary: BookedProductSummary[];
  searchQuery?: string;
  filterStatus?: string;
  filterPaymentMode?: string;
  filterFulfillment?: string;
};

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function BookingsPrintView({
  config,
  orders,
  productsSummary,
  searchQuery = "",
  filterStatus = "ALL",
  filterPaymentMode = "ALL",
  filterFulfillment = "ALL",
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
  // 1. DATA PREPARATION: PRODUCTS REPORT
  // ──────────────────────────────────────────────────────────────────────────
  const sortedProducts = useMemo(() => {
    const prods = [...productsSummary];
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
  }, [productsSummary, config.sortOrder]);

  const totalProductsQty = useMemo(() => {
    return sortedProducts.reduce((sum, p) => sum + p.totalBookedQty, 0);
  }, [sortedProducts]);

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

  // Grouped by date structure if groupByDate is enabled
  const dateGroups = useMemo(() => {
    if (!config.groupByDate) return [];

    const getLocalDateKey = (dateStr: string): string => {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "Unknown Date";
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    const map = new Map<string, Order[]>();

    sortedOrders.forEach((order) => {
      const dateKey = order.order_date
        ? getLocalDateKey(order.order_date)
        : "Unknown Date";
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(order);
    });

    const groups: { dateKey: string; formattedDate: string; orders: Order[]; subtotal: number; paid: number; due: number }[] = [];

    map.forEach((grpOrders, dateKey) => {
      let subtotal = 0;
      let paid = 0;
      let due = 0;

      grpOrders.forEach((o) => {
        if (o.status !== "CANCELLED") {
          const oTotal = Number(o.total_amount || 0);
          const oPaid = o.payments?.reduce((sum, p) => sum + Number(p.amount), 0) || 0;
          subtotal += oTotal;
          paid += oPaid;
          due += Math.max(0, oTotal - oPaid);
        }
      });

      let formattedDate = dateKey;
      if (dateKey !== "Unknown Date") {
        try {
          const [y, m, d] = dateKey.split("-").map(Number);
          const dateObj = new Date(y, m - 1, d);
          formattedDate = dateObj.toLocaleDateString("en-IN", {
            weekday: "short",
            day: "numeric",
            month: "short",
            year: "numeric",
          });
        } catch {
          formattedDate = dateKey;
        }
      }

      groups.push({
        dateKey,
        formattedDate,
        orders: grpOrders,
        subtotal,
        paid,
        due,
      });
    });

    return groups;
  }, [sortedOrders, config.groupByDate]);

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
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          thead {
            display: table-header-group !important;
          }
          tfoot {
            display: table-footer-group !important;
          }
        }
      `}</style>

      {/* ── Compact Letterhead ── */}
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
            {config.reportType === "PRODUCTS"
              ? "Booked Products Summary Report"
              : "Bookings & Reservations Summary Report"}
          </div>
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.25 }}>
          <div style={{ fontSize: "10px", color: "#555555" }}>
            Printed: <strong>{printedAt}</strong> &bull;{" "}
            {config.reportType === "PRODUCTS" ? (
              <span>
                Total: <strong>{sortedProducts.length} items</strong> ({totalProductsQty} pcs)
              </span>
            ) : (
              <span>
                Total: <strong>{sortedOrders.length} records</strong>
              </span>
            )}
          </div>
          <div style={{ fontSize: "9px", color: "#777777", marginTop: "1px" }}>
            Sort: {config.sortOrder === "ASC" ? "Ascending" : "Descending"}
            {config.reportType === "BOOKINGS" && config.groupByDate && " • Grouped by Date"}
          </div>
        </div>
      </div>

      {/* ── Filter Context Tags Bar ── */}
      <div
        style={{
          display: "flex",
          gap: "6px",
          flexWrap: "wrap",
          marginBottom: "8px",
          fontSize: "9.5px",
        }}
      >
        {config.reportType === "PRODUCTS" ? (
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
        ) : (
          [
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
            ["Fulfillment", filterFulfillment && filterFulfillment !== "ALL" ? filterFulfillment : null],
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
            ))
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────────── */}
      {/* OPTION 1: BOOKED PRODUCTS LIST TABLE LAYOUT                         */}
      {/* ─────────────────────────────────────────────────────────────────── */}
      {config.reportType === "PRODUCTS" ? (
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            tableLayout: "fixed",
            border: "1.5px solid #111111",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "6px 4px",
                  width: "5%",
                  textAlign: "center",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                #
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "6px 8px",
                  width: "20%",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                PRODUCT CODE
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "6px 8px",
                  width: "55%",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                PRODUCT NAME & DETAILS
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "6px 8px",
                  width: "20%",
                  textAlign: "right",
                  fontSize: "10px",
                  fontWeight: 800,
                }}
              >
                BOOKED QUANTITY
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.length === 0 ? (
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
              sortedProducts.map((prod, i) => {
                return (
                  <tr
                    key={`${prod.productId}_${prod.variantIndex ?? "null"}`}
                    style={{
                      background: i % 2 === 1 ? "#fafafa" : "#ffffff",
                      pageBreakInside: "avoid",
                    }}
                  >
                    {/* Index */}
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 4px",
                        textAlign: "center",
                        fontWeight: 600,
                        color: "#6b7280",
                        fontSize: "10.5px",
                      }}
                    >
                      {i + 1}
                    </td>

                    {/* Product Code */}
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 8px",
                        fontWeight: 700,
                        fontFamily: "monospace",
                        color: "#c2410c",
                        fontSize: "11px",
                      }}
                    >
                      {prod.productCode || "-"}
                    </td>

                    {/* Product Name & Variant/Category */}
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 8px",
                        lineHeight: 1.3,
                        wordBreak: "break-word",
                      }}
                    >
                      <span style={{ fontWeight: 700, color: "#111827", fontSize: "11.5px" }}>
                        {prod.name}
                      </span>
                      {prod.sizeOrVariant && prod.sizeOrVariant !== "-" && (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "10.5px",
                            fontWeight: 600,
                            color: "#b45309",
                          }}
                        >
                          ({prod.sizeOrVariant})
                        </span>
                      )}
                      {prod.category && prod.category !== "-" && (
                        <span
                          style={{
                            marginLeft: "6px",
                            fontSize: "9.5px",
                            color: "#6b7280",
                            background: "#f3f4f6",
                            padding: "1px 4px",
                            borderRadius: "3px",
                            border: "1px solid #e5e7eb",
                          }}
                        >
                          {prod.category}
                        </span>
                      )}
                    </td>

                    {/* Booked Quantity */}
                    <td
                      style={{
                        border: "1px solid #d1d5db",
                        padding: "5px 8px",
                        textAlign: "right",
                        fontFamily: "monospace",
                        fontSize: "12px",
                        fontWeight: 800,
                        color: "#111827",
                      }}
                    >
                      {prod.totalBookedQty}{" "}
                      <span style={{ fontSize: "10px", fontWeight: 600, color: "#6b7280" }}>pcs</span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>

          {/* Footer Summary */}
          {sortedProducts.length > 0 && (
            <tfoot>
              <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                <td
                  colSpan={3}
                  style={{
                    border: "1px solid #111111",
                    padding: "6px 8px",
                    textAlign: "right",
                    letterSpacing: "0.4px",
                    fontSize: "10.5px",
                  }}
                >
                  TOTAL BOOKED PRODUCTS ({sortedProducts.length} ITEMS)
                </td>
                <td
                  style={{
                    border: "1px solid #111111",
                    padding: "6px 8px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    fontSize: "12px",
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
      ) : (
        /* ─────────────────────────────────────────────────────────────────── */
        /* OPTION 2: BOOKINGS LIST (ORDERS) TABLE LAYOUT                       */
        /* ─────────────────────────────────────────────────────────────────── */
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "12px",
            tableLayout: "fixed",
            border: "1.5px solid #111111",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left" }}>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "5px 2px",
                  width: "3.5%",
                  textAlign: "center",
                  fontSize: "9px",
                  fontWeight: 800,
                }}
              >
                &#9633;
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "5px 3px",
                  width: "3.5%",
                  textAlign: "center",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                #
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "5px 6px",
                  width: "15%",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                ORDER NO & DATE
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "5px 6px",
                  width: "34%",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                PRODUCT(S) & VARIANTS
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "5px 6px",
                  width: "17%",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                CUSTOMER NAME
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "5px 6px",
                  width: "12%",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                PHONE NUMBER
              </th>
              <th
                style={{
                  border: "1px solid #111111",
                  padding: "5px 6px",
                  width: "15%",
                  textAlign: "right",
                  fontSize: "9.5px",
                  fontWeight: 800,
                }}
              >
                TOTAL / PAID / DUE
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedOrders.length === 0 ? (
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
            ) : config.groupByDate ? (
              /* Grouped by Date rendering */
              dateGroups.map((grp, grpIdx) => {
                return (
                  <DateGroupRows
                    key={grp.dateKey || grpIdx}
                    group={grp}
                    startIndex={
                      dateGroups
                        .slice(0, grpIdx)
                        .reduce((acc, g) => acc + g.orders.length, 0) + 1
                    }
                  />
                );
              })
            ) : (
              /* Flat list rendering */
              sortedOrders.map((order, i) => (
                <OrderRow key={order.id} order={order} index={i + 1} />
              ))
            )}
          </tbody>

          {/* Grand Footer Summary */}
          {sortedOrders.length > 0 && (
            <tfoot>
              <tr style={{ background: "#f3f4f6", fontWeight: 700 }}>
                <td
                  colSpan={6}
                  style={{
                    border: "1px solid #111111",
                    padding: "6px 6px",
                    textAlign: "right",
                    letterSpacing: "0.4px",
                    fontSize: "10px",
                  }}
                >
                  GRAND TOTAL ({sortedOrders.length} RECORDS)
                </td>
                <td
                  style={{
                    border: "1px solid #111111",
                    padding: "6px 6px",
                    textAlign: "right",
                    fontFamily: "monospace",
                    lineHeight: 1.25,
                    fontSize: "10.5px",
                  }}
                >
                  <div style={{ color: "#111827" }}>TOTAL: {formatINR(grandTotals.totalAmt)}</div>
                  <div style={{ color: "#16a34a", fontSize: "10px" }}>
                    PAID: {formatINR(grandTotals.totalPaid)}
                  </div>
                  <div style={{ color: "#dc2626", fontWeight: 800, fontSize: "10px" }}>
                    DUE: {formatINR(grandTotals.totalDue)}
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      )}

      {/* ── Report Disclaimer ── */}
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
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponent: Date Group with Header and Subtotal Row
// ────────────────────────────────────────────────────────────────────────────
function DateGroupRows({
  group,
  startIndex,
}: {
  group: {
    dateKey: string;
    formattedDate: string;
    orders: Order[];
    subtotal: number;
    paid: number;
    due: number;
  };
  startIndex: number;
}) {
  return (
    <>
      {/* Date Section Header */}
      <tr style={{ background: "#e5e7eb", pageBreakInside: "avoid" }}>
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
          📅 {group.formattedDate.toUpperCase()} &mdash;{" "}
          <span style={{ fontWeight: 600, color: "#4b5563" }}>
            {group.orders.length} {group.orders.length === 1 ? "booking" : "bookings"}
          </span>
        </td>
      </tr>

      {/* Orders in this Date */}
      {group.orders.map((order, idx) => (
        <OrderRow key={order.id} order={order} index={startIndex + idx} />
      ))}

      {/* Subtotal Row for Date Group */}
      <tr style={{ background: "#f9fafb", fontWeight: 700, pageBreakInside: "avoid" }}>
        <td
          colSpan={6}
          style={{
            border: "1px solid #d1d5db",
            padding: "4px 8px",
            textAlign: "right",
            fontSize: "9.5px",
            color: "#374151",
            fontStyle: "italic",
          }}
        >
          Subtotal ({group.formattedDate}):
        </td>
        <td
          style={{
            border: "1px solid #d1d5db",
            padding: "4px 6px",
            textAlign: "right",
            fontFamily: "monospace",
            fontSize: "9.5px",
            lineHeight: 1.2,
          }}
        >
          <div style={{ color: "#111827" }}>Tot: {formatINR(group.subtotal)}</div>
          <div style={{ color: "#16a34a", fontSize: "9px" }}>Paid: {formatINR(group.paid)}</div>
          <div
            style={{
              color: group.due > 0 ? "#dc2626" : "#4b5563",
              fontWeight: group.due > 0 ? 800 : 500,
              fontSize: "9px",
            }}
          >
            Due: {formatINR(group.due)}
          </div>
        </td>
      </tr>
    </>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Subcomponent: Single Order Table Row
// ────────────────────────────────────────────────────────────────────────────
function OrderRow({ order, index }: { order: Order; index: number }) {
  const total = Number(order.total_amount || 0);
  const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
  const due = Math.max(0, total - paid);
  const items = order.items || [];

  return (
    <tr
      style={{
        background: index % 2 === 1 ? "#fafafa" : "#ffffff",
        pageBreakInside: "avoid",
      }}
    >
      {/* Printable Checkbox */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: "4px 2px",
          verticalAlign: "middle",
          textAlign: "center",
        }}
      >
        <div
          style={{
            width: "12px",
            height: "12px",
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
          padding: "4px 3px",
          verticalAlign: "top",
          textAlign: "center",
          fontWeight: 600,
          color: "#6b7280",
          fontSize: "10px",
        }}
      >
        {index}
      </td>

      {/* Order No & Date */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: "4px 6px",
          verticalAlign: "top",
          fontWeight: 700,
          fontFamily: "monospace",
          fontSize: "10.5px",
        }}
      >
        <div>{order.order_no}</div>
        <div style={{ fontSize: "9px", fontWeight: 500, color: "#6b7280", marginTop: "1px" }}>
          {new Date(order.order_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
          })}
        </div>
      </td>

      {/* Products */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: "4px 6px",
          verticalAlign: "top",
          lineHeight: 1.3,
          wordBreak: "break-word",
        }}
      >
        {items.length === 0 ? (
          <span style={{ color: "#9ca3af" }}>No items listed</span>
        ) : (
          items.map((item, idx) => {
            const prod = item.product;
            const prodCode = prod?.product_code || "";
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
              <div key={idx} style={{ marginBottom: idx < items.length - 1 ? "2px" : "0" }}>
                {prodCode && (
                  <span
                    style={{
                      fontWeight: 700,
                      fontFamily: "monospace",
                      color: "#ea580c",
                      marginRight: "4px",
                    }}
                  >
                    [{prodCode}]
                  </span>
                )}
                <span style={{ fontWeight: 600, color: "#111827" }}>{prod?.name || "Product"}</span>{" "}
                {variantLabel && <span style={{ color: "#4b5563", fontSize: "11px" }}>{variantLabel}</span>}{" "}
                <span style={{ fontWeight: 700, color: "#ea580c" }}>&times;{item.quantity}</span>
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
              fontSize: "11px",
              lineHeight: "1.4",
              color: "#1e293b",
              fontWeight: 500,
              wordBreak: "break-word",
            }}
          >
            <div
              style={{
                fontWeight: 800,
                color: "#b45309",
                fontSize: "10px",
                letterSpacing: "0.5px",
                textTransform: "uppercase",
                marginBottom: "2px",
                display: "flex",
                alignItems: "center",
                gap: "3px",
              }}
            >
              <span>📝 NOTE / INSTRUCTIONS:</span>
            </div>
            <div style={{ color: "#0f172a", fontWeight: 600, fontSize: "11px" }}>
              {order.notes}
            </div>
          </div>
        )}
      </td>

      {/* Customer Name */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: "4px 6px",
          verticalAlign: "top",
          fontWeight: 600,
          wordBreak: "break-word",
        }}
      >
        {order.customer?.name || "Unknown"}
      </td>

      {/* Phone Number */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: "4px 6px",
          verticalAlign: "top",
          fontFamily: "monospace",
          color: "#374151",
          fontSize: "10px",
        }}
      >
        {order.customer?.phone || "-"}
      </td>

      {/* Total / Paid / Due Stack */}
      <td
        style={{
          border: "1px solid #d1d5db",
          padding: "4px 6px",
          verticalAlign: "top",
          textAlign: "right",
          fontFamily: "monospace",
          lineHeight: 1.25,
          fontSize: "10px",
        }}
      >
        <div style={{ color: "#111827", fontWeight: 600 }}>Tot: {formatINR(total)}</div>
        <div style={{ color: "#16a34a", fontSize: "9.5px" }}>Paid: {formatINR(paid)}</div>
        {order.status === "CANCELLED" ? (
          <div style={{ color: "#9ca3af", fontSize: "9.5px" }}>CANCELLED</div>
        ) : (
          <div
            style={{
              fontWeight: due > 0 ? 800 : 500,
              color: due > 0 ? "#dc2626" : "#4b5563",
              fontSize: "9.5px",
            }}
          >
            Due: {formatINR(due)}
          </div>
        )}
      </td>
    </tr>
  );
}