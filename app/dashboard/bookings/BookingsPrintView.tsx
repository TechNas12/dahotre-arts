"use client";

import { Order } from "@/app/actions/orders";

type BookingsPrintViewProps = {
  orders: Order[];
  searchQuery: string;
  filterStatus: string;
  filterPaymentMode: string;
  filterFulfillment?: string;
  filterDateFrom?: string;
  filterDateTo?: string;
};

const formatINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function BookingsPrintView({
  orders,
  searchQuery,
  filterStatus,
  filterPaymentMode,
  filterFulfillment = "ALL",
  filterDateFrom,
  filterDateTo,
}: BookingsPrintViewProps) {
  let pageTotal = 0;
  let pagePaid = 0;

  orders.forEach((order) => {
    if (order.status !== "CANCELLED") {
      pageTotal += Number(order.total_amount || 0);
      order.payments?.forEach((p) => {
        pagePaid += Number(p.amount);
      });
    }
  });

  const pageDue = Math.max(0, pageTotal - pagePaid);

  const printedAt = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

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
            size: auto;
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

      {/* Compact Letterhead */}
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
              fontSize: "10px",
              fontWeight: 700,
              color: "#444444",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            Bookings & Reservations Summary Report
          </div>
        </div>
        <div style={{ textAlign: "right", lineHeight: 1.2 }}>
          <div style={{ fontSize: "10px", color: "#555555" }}>
            Printed: <strong>{printedAt}</strong> &bull; Total: <strong>{orders.length} records</strong>
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
          ["Date Range", filterDateFrom && filterDateTo ? `${filterDateFrom} to ${filterDateTo}` : (filterDateFrom ? `From ${filterDateFrom}` : (filterDateTo ? `Until ${filterDateTo}` : null))],
          ["Status", filterStatus !== "ALL" ? filterStatus : null],
          ["Payment", filterPaymentMode !== "ALL" ? filterPaymentMode : null],
          ["Fulfillment", filterFulfillment && filterFulfillment !== "ALL" ? filterFulfillment : null],
          ["Search", searchQuery ? searchQuery : null],
        ].filter((item): item is [string, string] => Boolean(item[1])).map(([label, value]) => (
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

      {/* Main Full-Width Table with Full Borders */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "14px",
          tableLayout: "fixed",
          border: "1.5px solid #111111",
        }}
      >
        <thead>
          <tr
            style={{
              background: "#f3f4f6",
              textAlign: "left",
            }}
          >
            <th style={{ border: "1px solid #111111", padding: "5px 2px", width: "3.5%", textAlign: "center", fontSize: "9px", fontWeight: 800 }}>
              &#9633;
            </th>
            <th style={{ border: "1px solid #111111", padding: "5px 3px", width: "3.5%", textAlign: "center", fontSize: "9.5px", fontWeight: 800 }}>
              #
            </th>
            <th style={{ border: "1px solid #111111", padding: "5px 6px", width: "15%", fontSize: "9.5px", fontWeight: 800 }}>
              ORDER NO
            </th>
            <th style={{ border: "1px solid #111111", padding: "5px 6px", width: "34%", fontSize: "9.5px", fontWeight: 800 }}>
              PRODUCT(S) & VARIANTS
            </th>
            <th style={{ border: "1px solid #111111", padding: "5px 6px", width: "17%", fontSize: "9.5px", fontWeight: 800 }}>
              CUSTOMER NAME
            </th>
            <th style={{ border: "1px solid #111111", padding: "5px 6px", width: "12%", fontSize: "9.5px", fontWeight: 800 }}>
              PHONE NUMBER
            </th>
            <th style={{ border: "1px solid #111111", padding: "5px 6px", width: "15%", textAlign: "right", fontSize: "9.5px", fontWeight: 800 }}>
              TOTAL / PAID / DUE
            </th>
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
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
            orders.map((order, i) => {
              const total = Number(order.total_amount || 0);
              const paid =
                order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const due = Math.max(0, total - paid);

              const items = order.items || [];

              return (
                <tr
                  key={order.id}
                  style={{
                    background: i % 2 === 1 ? "#fafafa" : "#ffffff",
                    pageBreakInside: "avoid",
                  }}
                >
                  {/* Printable Checkbox */}
                  <td style={{ border: "1px solid #d1d5db", padding: "4px 2px", verticalAlign: "middle", textAlign: "center" }}>
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
                  <td style={{ border: "1px solid #d1d5db", padding: "4px 3px", verticalAlign: "top", textAlign: "center", fontWeight: 600, color: "#6b7280", fontSize: "10px" }}>
                    {i + 1}
                  </td>

                  {/* Order No */}
                  <td style={{ border: "1px solid #d1d5db", padding: "4px 6px", verticalAlign: "top", fontWeight: 700, fontFamily: "monospace", fontSize: "10.5px" }}>
                    <div>{order.order_no}</div>
                    <div style={{ fontSize: "9px", fontWeight: 500, color: "#6b7280", marginTop: "1px" }}>
                      {new Date(order.order_date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                    </div>
                  </td>

                  {/* Products */}
                  <td style={{ border: "1px solid #d1d5db", padding: "4px 6px", verticalAlign: "top", lineHeight: 1.3, wordBreak: "break-word" }}>
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
                              <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#ea580c", marginRight: "4px" }}>
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
                  </td>

                  {/* Customer Name */}
                  <td style={{ border: "1px solid #d1d5db", padding: "4px 6px", verticalAlign: "top", fontWeight: 600, wordBreak: "break-word" }}>
                    {order.customer?.name || "Unknown"}
                  </td>

                  {/* Phone Number */}
                  <td style={{ border: "1px solid #d1d5db", padding: "4px 6px", verticalAlign: "top", fontFamily: "monospace", color: "#374151", fontSize: "10px" }}>
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
                    <div style={{ color: "#111827", fontWeight: 600 }}>
                      Tot: {formatINR(total)}
                    </div>
                    <div style={{ color: "#16a34a", fontSize: "9.5px" }}>
                      Paid: {formatINR(paid)}
                    </div>
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
            })
          )}
        </tbody>

        {/* Footer Summary with Borders */}
        {orders.length > 0 && (
          <tfoot>
            <tr
              style={{
                background: "#f3f4f6",
                fontWeight: 700,
              }}
            >
              <td colSpan={6} style={{ border: "1px solid #111111", padding: "6px 6px", textAlign: "right", letterSpacing: "0.4px", fontSize: "10px" }}>
                REPORT PAGE TOTALS ({orders.length} RECORDS)
              </td>
              <td style={{ border: "1px solid #111111", padding: "6px 6px", textAlign: "right", fontFamily: "monospace", lineHeight: 1.25, fontSize: "10.5px" }}>
                <div style={{ color: "#111827" }}>TOTAL: {formatINR(pageTotal)}</div>
                <div style={{ color: "#16a34a", fontSize: "10px" }}>PAID: {formatINR(pagePaid)}</div>
                <div style={{ color: "#dc2626", fontWeight: 800, fontSize: "10px" }}>DUE: {formatINR(pageDue)}</div>
              </td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* Report Disclaimer */}
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
        Dahotre Arts &bull; Internal Bookings & Dues Summary Report (Generated Automatically)
      </div>
    </div>
  );
}