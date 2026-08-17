"use client";

import { Order } from "@/app/actions/orders";

type BookingsPrintViewProps = {
  orders: Order[];
  searchQuery: string;
  filterStatus: string;
  filterPaymentMode: string;
};

export function BookingsPrintView({
  orders,
  searchQuery,
  filterStatus,
  filterPaymentMode,
}: BookingsPrintViewProps) {
  // Calculate totals
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

  return (
    <div id="bookings-print-root">
      <div style={{ marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", borderBottom: "2px solid #000", paddingBottom: "10px", marginBottom: "15px" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "24px", fontWeight: "bold" }}>DAHOTRE ARTS</h1>
            <h2 style={{ margin: "5px 0 0 0", fontSize: "18px", fontWeight: "normal" }}>Bookings List</h2>
          </div>
          <div style={{ textAlign: "right", fontSize: "12px" }}>
            <div>Printed: {printedAt}</div>
          </div>
        </div>

        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", fontFamily: "'Inter', Arial, sans-serif" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #000", textAlign: "left" }}>
              <th style={{ padding: "8px 4px", width: "14%" }}>ORDER NO</th>
              <th style={{ padding: "8px 4px", width: "24%" }}>PRODUCT(S)</th>
              <th style={{ padding: "8px 4px", width: "16%" }}>CUSTOMER NAME</th>
              <th style={{ padding: "8px 4px", width: "10%" }}>PHONE</th>
              <th style={{ padding: "8px 4px", width: "8%", textAlign: "right" }}>TOTAL</th>
              <th style={{ padding: "8px 4px", width: "8%", textAlign: "right" }}>PAID</th>
              <th style={{ padding: "8px 4px", width: "8%", textAlign: "right" }}>DUE</th>
              <th style={{ padding: "8px 4px", width: "12%" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "20px", textAlign: "center" }}>No bookings found for current filters.</td>
              </tr>
            ) : (
              orders.map((order) => {
                const total = order.total_amount || 0;
                const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
                const due = total - paid;
                
                // Construct products string
                const productLines = order.items?.map(item => {
                   let variantLabel = "";
                   if (item.variant_index != null && item.product?.variants && (item.product.variants as any[])[item.variant_index]) {
                      variantLabel = `(${(item.product.variants as any[])[item.variant_index].label})`;
                   } else if (item.product?.height) {
                      variantLabel = `(H-${item.product.height}${item.product.base ? ` B-${item.product.base}` : ''})`;
                   }
                   return `${item.product?.name || "Unknown"} ${variantLabel} ×${item.quantity}`;
                }) || [];

                return (
                  <tr key={order.id} style={{ borderBottom: "1px solid #ccc" }}>
                    <td style={{ padding: "8px 4px", verticalAlign: "top" }}>{order.order_no}</td>
                    <td style={{ padding: "8px 4px", verticalAlign: "top" }}>
                       {productLines.map((pl, idx) => (
                         <div key={idx}>{pl}</div>
                       ))}
                    </td>
                    <td style={{ padding: "8px 4px", verticalAlign: "top" }}>{order.customer?.name || "-"}</td>
                    <td style={{ padding: "8px 4px", verticalAlign: "top" }}>{order.customer?.phone || "-"}</td>
                    <td style={{ padding: "8px 4px", verticalAlign: "top", textAlign: "right" }}>{total.toLocaleString('en-IN')}</td>
                    <td style={{ padding: "8px 4px", verticalAlign: "top", textAlign: "right" }}>{paid.toLocaleString('en-IN')}</td>
                    <td style={{ padding: "8px 4px", verticalAlign: "top", textAlign: "right" }}>{order.status === 'CANCELLED' ? '-' : due.toLocaleString('en-IN')}</td>
                    <td style={{ padding: "8px 4px", verticalAlign: "top" }}>{order.status}</td>
                  </tr>
                );
              })
            )}
          </tbody>
          {orders.length > 0 && (
             <tfoot>
                <tr style={{ borderTop: "2px solid #000", borderBottom: "2px solid #000", fontWeight: "bold" }}>
                   <td colSpan={4} style={{ padding: "8px 4px", textAlign: "right" }}>PAGE TOTALS</td>
                   <td style={{ padding: "8px 4px", textAlign: "right" }}>{pageTotal.toLocaleString('en-IN')}</td>
                   <td style={{ padding: "8px 4px", textAlign: "right" }}>{pagePaid.toLocaleString('en-IN')}</td>
                   <td style={{ padding: "8px 4px", textAlign: "right" }}>{pageDue.toLocaleString('en-IN')}</td>
                   <td></td>
                </tr>
             </tfoot>
          )}
        </table>

        <div style={{ marginTop: "15px", fontSize: "10px", color: "#333", borderTop: "1px dashed #ccc", paddingTop: "5px" }}>
          Filter context: Status={filterStatus} &middot; Payment={filterPaymentMode} &middot; Search="{searchQuery}"
        </div>
      </div>
    </div>
  );
}
