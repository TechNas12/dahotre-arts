"use client";

import { Order } from "@/app/actions/orders";

type BookingsPrintViewProps = {
  orders: Order[];
  searchQuery: string;
  filterStatus: string;
  filterPaymentMode: string;
};

const formatINR = (n: number) =>
  `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const statusColors: Record<string, { bg: string; text: string }> = {
  COMPLETED: { bg: "#e8f5e9", text: "#1b5e20" },
  PENDING: { bg: "#fff8e1", text: "#8a6d00" },
  CANCELLED: { bg: "#fdecea", text: "#a12622" },
};

export function BookingsPrintView({
  orders,
  searchQuery,
  filterStatus,
  filterPaymentMode,
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

  const pageDue = pageTotal - pagePaid;

  const printedAt = new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const fontStack = "'Inter', -apple-system, Helvetica, Arial, sans-serif";

  return (
    <div
      id="bookings-print-root"
      style={{
        fontFamily: fontStack,
        color: "#1a1a1a",
        maxWidth: "1100px",
        margin: "0 auto",
        padding: "24px",
      }}
    >
      {/* Print-only page rules */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 14mm 12mm; }
          #bookings-print-root { padding: 0 !important; }
          tr { break-inside: avoid; }
          thead { display: table-header-group; }
          tfoot { display: table-footer-group; }
        }
      `}</style>

      {/* Letterhead */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "3px solid #111",
          paddingBottom: "14px",
          marginBottom: "18px",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "26px",
              fontWeight: 800,
              letterSpacing: "0.5px",
            }}
          >
            DAHOTRE ARTS
          </h1>
          <div
            style={{
              marginTop: "4px",
              fontSize: "13px",
              fontWeight: 600,
              color: "#555",
              textTransform: "uppercase",
              letterSpacing: "1px",
            }}
          >
            Bookings List
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: "12px", color: "#666" }}>Printed on</div>
          <div style={{ fontSize: "14px", fontWeight: 600 }}>{printedAt}</div>
          <div style={{ fontSize: "12px", color: "#666", marginTop: "2px" }}>
            {orders.length} {orders.length === 1 ? "record" : "records"}
          </div>
        </div>
      </div>

      {/* Filter context bar */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          marginBottom: "16px",
        }}
      >
        {[
          ["Status", filterStatus],
          ["Payment", filterPaymentMode],
          ["Search", searchQuery || "—"],
        ].map(([label, value]) => (
          <div
            key={label}
            style={{
              fontSize: "11px",
              padding: "4px 10px",
              borderRadius: "999px",
              background: "#f2f2f2",
              color: "#444",
              border: "1px solid #e0e0e0",
            }}
          >
            <span style={{ fontWeight: 700, color: "#111" }}>{label}: </span>
            {value}
          </div>
        ))}
      </div>

      {/* Table */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "13px",
        }}
      >
        <thead>
          <tr
            style={{
              borderTop: "2px solid #111",
              borderBottom: "2px solid #111",
              textAlign: "left",
              background: "#fafafa",
            }}
          >
            {[
              ["ORDER NO", "13%", "left"],
              ["PRODUCT(S)", "25%", "left"],
              ["CUSTOMER", "16%", "left"],
              ["PHONE", "11%", "left"],
              ["TOTAL", "9%", "right"],
              ["PAID", "9%", "right"],
              ["DUE", "9%", "right"],
              ["STATUS", "8%", "left"],
            ].map(([label, width, align]) => (
              <th
                key={label}
                style={{
                  padding: "9px 8px",
                  width,
                  textAlign: align as "left" | "right",
                  fontSize: "11px",
                  fontWeight: 700,
                  letterSpacing: "0.4px",
                  color: "#333",
                }}
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orders.length === 0 ? (
            <tr>
              <td
                colSpan={8}
                style={{
                  padding: "32px",
                  textAlign: "center",
                  color: "#888",
                  fontSize: "13px",
                }}
              >
                No bookings found for current filters.
              </td>
            </tr>
          ) : (
            orders.map((order, i) => {
              const total = order.total_amount || 0;
              const paid =
                order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
              const due = total - paid;

              const productLines =
                order.items?.map((item) => {
                  let variantLabel = "";
                  if (
                    item.variant_index != null &&
                    item.product?.variants &&
                    (item.product.variants as any[])[item.variant_index]
                  ) {
                    variantLabel = `(${(item.product.variants as any[])[item.variant_index].label
                      })`;
                  } else if (item.product?.height) {
                    variantLabel = `(H-${item.product.height}${item.product.base ? ` B-${item.product.base}` : ""
                      })`;
                  }
                  return `${item.product?.name || "Unknown"} ${variantLabel} ×${item.quantity}`;
                }) || [];

              const badge = statusColors[order.status] || {
                bg: "#f0f0f0",
                text: "#444",
              };

              return (
                <tr
                  key={order.id}
                  style={{
                    borderBottom: "1px solid #e5e5e5",
                    background: i % 2 === 1 ? "#fafafa" : "transparent",
                  }}
                >
                  <td style={{ padding: "9px 8px", verticalAlign: "top", fontWeight: 600 }}>
                    {order.order_no}
                  </td>
                  <td style={{ padding: "9px 8px", verticalAlign: "top", lineHeight: 1.5 }}>
                    {productLines.map((pl, idx) => (
                      <div key={idx}>{pl}</div>
                    ))}
                  </td>
                  <td style={{ padding: "9px 8px", verticalAlign: "top" }}>
                    {order.customer?.name || "-"}
                  </td>
                  <td style={{ padding: "9px 8px", verticalAlign: "top", color: "#555" }}>
                    {order.customer?.phone || "-"}
                  </td>
                  <td
                    style={{
                      padding: "9px 8px",
                      verticalAlign: "top",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatINR(total)}
                  </td>
                  <td
                    style={{
                      padding: "9px 8px",
                      verticalAlign: "top",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatINR(paid)}
                  </td>
                  <td
                    style={{
                      padding: "9px 8px",
                      verticalAlign: "top",
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                      fontWeight: due > 0 && order.status !== "CANCELLED" ? 700 : 400,
                      color: due > 0 && order.status !== "CANCELLED" ? "#b3261e" : "#1a1a1a",
                    }}
                  >
                    {order.status === "CANCELLED" ? "-" : formatINR(due)}
                  </td>
                  <td style={{ padding: "9px 8px", verticalAlign: "top" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "11px",
                        fontWeight: 700,
                        background: badge.bg,
                        color: badge.text,
                      }}
                    >
                      {order.status}
                    </span>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
        {orders.length > 0 && (
          <tfoot>
            <tr
              style={{
                borderTop: "2px solid #111",
                borderBottom: "3px double #111",
                fontWeight: 700,
                background: "#f5f5f5",
              }}
            >
              <td colSpan={4} style={{ padding: "10px 8px", textAlign: "right" }}>
                PAGE TOTALS
              </td>
              <td style={{ padding: "10px 8px", textAlign: "right" }}>
                {formatINR(pageTotal)}
              </td>
              <td style={{ padding: "10px 8px", textAlign: "right" }}>
                {formatINR(pagePaid)}
              </td>
              <td style={{ padding: "10px 8px", textAlign: "right", color: "#b3261e" }}>
                {formatINR(pageDue)}
              </td>
              <td></td>
            </tr>
          </tfoot>
        )}
      </table>

      <div
        style={{
          marginTop: "20px",
          fontSize: "10px",
          color: "#999",
          textAlign: "center",
          borderTop: "1px solid #eee",
          paddingTop: "8px",
        }}
      >
        Dahotre Arts — Generated report, not a tax invoice
      </div>
    </div>
  );
}