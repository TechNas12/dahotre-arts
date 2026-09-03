"use client";

import { EodReportData } from "@/app/actions/reports";

type EodPrintViewProps = {
  eodData: EodReportData;
  eodDate?: string;
  eodDateFrom?: string;
  eodDateTo?: string;
  categoryName?: string;
};

const formatINR = (n: number) =>
  `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

export function EodPrintView({ eodData, eodDate, eodDateFrom, eodDateTo, categoryName }: EodPrintViewProps) {
  const printedAt = new Date().toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const startDate = eodDateFrom || eodDate || eodData.dateFrom || eodData.date || new Date().toISOString().split("T")[0];
  const endDate = eodDateTo || eodDate || eodData.dateTo || startDate;
  const isRange = startDate !== endDate;

  const formattedDateStr = isRange
    ? `${new Date(startDate + "T12:00:00Z").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })} – ${new Date(endDate + "T12:00:00Z").toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })}`
    : new Date(startDate + "T12:00:00Z").toLocaleDateString("en-IN", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });

  const cashPct =
    eodData.financials.totalCollected > 0
      ? Math.round((eodData.financials.totalCashCollected / eodData.financials.totalCollected) * 100)
      : 0;
  const onlinePct = eodData.financials.totalCollected > 0 ? 100 - cashPct : 0;

  const fontStack = "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif";

  return (
    <div
      id="eod-print-root"
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
      {/* Print-specific CSS */}
      <style>{`
        @media print {
          @page {
            size: auto;
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
          #eod-print-root {
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

      {/* 1. Header & Letterhead */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          borderBottom: "2.5px solid #111111",
          paddingBottom: "6px",
          marginBottom: "10px",
          width: "100%",
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "19px",
              fontWeight: 800,
              letterSpacing: "0.5px",
              lineHeight: 1.1,
              color: "#ea580c",
            }}
          >
            DAHOTRE ARTS
          </h1>
          <div
            style={{
              marginTop: "2px",
              fontSize: "11px",
              fontWeight: 700,
              color: "#111827",
              textTransform: "uppercase",
              letterSpacing: "0.8px",
            }}
          >
            {isRange ? "Settlement & Audit Report (Date Range)" : "End of Day (EOD) Settlement & Audit Report"}
          </div>
          <div style={{ fontSize: "9.5px", color: "#4b5563", marginTop: "1px" }}>
            Settlement Period: <strong>{formattedDateStr}</strong>
            {categoryName && categoryName !== "All Categories" && categoryName !== "ALL" && (
              <span> &bull; Category: <strong style={{ color: "#ea580c" }}>{categoryName}</strong></span>
            )}
          </div>
        </div>

        <div style={{ textAlign: "right", lineHeight: 1.3 }}>
          <div style={{ fontSize: "10px", color: "#374151" }}>
            Total Orders: <strong>{eodData.financials.totalOrdersCount}</strong> &bull; Total Sales:{" "}
            <strong>{formatINR(eodData.financials.totalSales)}</strong>
          </div>
          <div style={{ fontSize: "9px", color: "#6b7280" }}>
            Printed: {printedAt} (IST)
          </div>
        </div>
      </div>

      {/* 2. Top 4 KPI Summary Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        {/* Card 1: Total Sales */}
        <div
          style={{
            border: "1.5px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#ea580c", textTransform: "uppercase" }}>
            Total Gross Sales
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#111827", margin: "2px 0", fontFamily: "monospace" }}>
            {formatINR(eodData.financials.totalSales)}
          </div>
          <div style={{ fontSize: "8px", color: "#6b7280", lineHeight: 1.3 }}>
            <div>{eodData.financials.totalOrdersCount} Orders ({eodData.financials.directOrdersCount} Direct + {eodData.financials.bookingOrdersCount} Bookings)</div>
            <div style={{ color: "#4b5563", marginTop: "2px", fontWeight: 600 }}>
              Retail: {formatINR(eodData.financials.retailSales || 0)} ({eodData.financials.retailOrdersCount || 0}) &bull; Wholesale: {formatINR(eodData.financials.wholesaleSales || 0)} ({eodData.financials.wholesaleOrdersCount || 0})
            </div>
          </div>
        </div>

        {/* Card 2: Cash Collected */}
        <div
          style={{
            border: "1.5px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#16a34a", textTransform: "uppercase" }}>
            Cash Collected
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#16a34a", margin: "2px 0", fontFamily: "monospace" }}>
            {formatINR(eodData.financials.totalCashCollected)}
          </div>
          <div style={{ fontSize: "8px", color: "#6b7280" }}>
            Physical Cash Received in Register
          </div>
        </div>

        {/* Card 3: Online Collected */}
        <div
          style={{
            border: "1.5px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#2563eb", textTransform: "uppercase" }}>
            Online / UPI Collected
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#2563eb", margin: "2px 0", fontFamily: "monospace" }}>
            {formatINR(eodData.financials.totalOnlineCollected)}
          </div>
          <div style={{ fontSize: "8px", color: "#6b7280" }}>
            UPI, QR & Bank Transfers
          </div>
        </div>

        {/* Card 4: New Dues Created */}
        <div
          style={{
            border: "1.5px solid #d1d5db",
            borderRadius: "6px",
            padding: "8px",
            background: "#fafafa",
          }}
        >
          <div style={{ fontSize: "8.5px", fontWeight: 700, color: "#dc2626", textTransform: "uppercase" }}>
            New Dues Created
          </div>
          <div style={{ fontSize: "16px", fontWeight: 800, color: "#dc2626", margin: "2px 0", fontFamily: "monospace" }}>
            {formatINR(eodData.financials.totalDuesCreated)}
          </div>
          <div style={{ fontSize: "8px", color: "#6b7280" }}>
            Uncollected Balances on Pickups
          </div>
        </div>
      </div>

      {/* 3. Middle Section: Cash Register Settlement & Day-over-Day Performance */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
          marginBottom: "10px",
        }}
      >
        {/* Register Settlement Table */}
        <div
          style={{
            border: "1.5px solid #111111",
            borderRadius: "6px",
            padding: "8px",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: "9.5px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "4px",
              marginBottom: "6px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>Cash Register & Collections Breakdown</span>
            <span style={{ color: "#16a34a", fontSize: "8.5px" }}>Audit Ready</span>
          </div>

          <table style={{ width: "100%", fontSize: "9.5px", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "3px 0", color: "#4b5563" }}>(+) Cash Sales & Advances</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 700, color: "#16a34a", fontFamily: "monospace" }}>
                  +{formatINR(eodData.financials.totalCashCollected)}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "3px 0", color: "#4b5563" }}>(+) Online & UPI Collections</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 700, color: "#2563eb", fontFamily: "monospace" }}>
                  +{formatINR(eodData.financials.totalOnlineCollected)}
                </td>
              </tr>
              <tr style={{ borderTop: "1.5px solid #111111" }}>
                <td style={{ padding: "4px 0", fontWeight: 800, color: "#111827", textTransform: "uppercase" }}>
                  (=) Total Settlement Collected
                </td>
                <td style={{ padding: "4px 0", textAlign: "right", fontWeight: 900, fontSize: "12px", color: "#ea580c", fontFamily: "monospace" }}>
                  {formatINR(eodData.financials.totalCollected)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Day-over-Day & Payment Share */}
        <div
          style={{
            border: "1.5px solid #111111",
            borderRadius: "6px",
            padding: "8px",
            background: "#ffffff",
          }}
        >
          <div
            style={{
              fontSize: "9.5px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              borderBottom: "1px solid #e5e7eb",
              paddingBottom: "4px",
              marginBottom: "6px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{isRange ? `Performance Comparison vs ${eodData.prevPeriodLabel || "Previous Period"}` : `Day-over-Day Performance vs Yesterday (${eodData.prevDate})`}</span>
            <span
              style={{
                color: eodData.growth.salesGrowthPct >= 0 ? "#16a34a" : "#dc2626",
                fontWeight: 700,
                fontSize: "8.5px",
              }}
            >
              {eodData.growth.salesGrowthPct >= 0 ? "+" : ""}
              {eodData.growth.salesGrowthPct.toFixed(1)}% {isRange ? "vs Prev Period" : "vs Yesterday"}
            </span>
          </div>

          <table style={{ width: "100%", fontSize: "9.5px", borderCollapse: "collapse" }}>
            <tbody>
              <tr>
                <td style={{ padding: "3px 0", color: "#4b5563" }}>{isRange ? "Period Gross Sales" : "Today Gross Sales"}</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 700, fontFamily: "monospace" }}>
                  {formatINR(eodData.growth.todaySales)} ({eodData.growth.todayOrders} Orders)
                </td>
              </tr>
              <tr>
                <td style={{ padding: "3px 0", color: "#4b5563" }}>{isRange ? "Prev Period Gross Sales" : "Yesterday Gross Sales"}</td>
                <td style={{ padding: "3px 0", textAlign: "right", color: "#6b7280", fontFamily: "monospace" }}>
                  {formatINR(eodData.growth.yesterdaySales)} ({eodData.growth.yesterdayOrders} Orders)
                </td>
              </tr>
              <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: "3px 0", color: "#4b5563" }}>Payment Mode Share</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 700 }}>
                  <span style={{ color: "#16a34a" }}>Cash {cashPct}% ({formatINR(eodData.financials.totalCashCollected)})</span> &bull;{" "}
                  <span style={{ color: "#2563eb" }}>Online {onlinePct}% ({formatINR(eodData.financials.totalOnlineCollected)})</span>
                </td>
              </tr>
              <tr style={{ borderTop: "1px solid #e5e7eb" }}>
                <td style={{ padding: "3px 0", color: "#4b5563" }}>Channel Split</td>
                <td style={{ padding: "3px 0", textAlign: "right", fontWeight: 700 }}>
                  <span style={{ color: "#d97706" }}>Retail {formatINR(eodData.financials.retailSales || 0)} ({eodData.financials.retailOrdersCount || 0} ord)</span> &bull;{" "}
                  <span style={{ color: "#2563eb" }}>Wholesale {formatINR(eodData.financials.wholesaleSales || 0)} ({eodData.financials.wholesaleOrdersCount || 0} ord)</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Sales Distribution Bar (Daily if Range, Hourly if Single Day) */}
      <div
        style={{
          border: "1px solid #d1d5db",
          borderRadius: "6px",
          padding: "6px 8px",
          marginBottom: "10px",
          background: "#f9fafb",
        }}
      >
        <div style={{ fontSize: "8.5px", fontWeight: 800, textTransform: "uppercase", color: "#374151", marginBottom: "4px" }}>
          {isRange && eodData.dailyActivity ? "Daily Sales Activity (Date Range)" : "Hourly Sales Distribution (Store Hours IST)"}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", fontSize: "8px" }}>
          {isRange && eodData.dailyActivity
            ? eodData.dailyActivity.map((d, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    padding: "2px 5px",
                    background: d.sales > 0 ? "#fff7ed" : "#ffffff",
                    borderLeft: d.sales > 0 ? "2px solid #ea580c" : "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#111827" }}>{d.dateLabel}: </span>
                  <span style={{ fontWeight: d.sales > 0 ? 800 : 500, color: d.sales > 0 ? "#ea580c" : "#9ca3af", fontFamily: "monospace" }}>
                    {d.sales > 0 ? formatINR(d.sales) : "₹0"}
                  </span>
                  {d.orders > 0 && <span style={{ color: "#6b7280", marginLeft: "2px" }}>({d.orders})</span>}
                </div>
              ))
            : eodData.hourlyActivity.map((h, i) => (
                <div
                  key={i}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "4px",
                    padding: "2px 5px",
                    background: h.sales > 0 ? "#fff7ed" : "#ffffff",
                    borderLeft: h.sales > 0 ? "2px solid #ea580c" : "1px solid #e5e7eb",
                  }}
                >
                  <span style={{ fontWeight: 700, color: "#111827" }}>{h.hourLabel}: </span>
                  <span style={{ fontWeight: h.sales > 0 ? 800 : 500, color: h.sales > 0 ? "#ea580c" : "#9ca3af", fontFamily: "monospace" }}>
                    {h.sales > 0 ? formatINR(h.sales) : "₹0"}
                  </span>
                  {h.orders > 0 && <span style={{ color: "#6b7280", marginLeft: "2px" }}>({h.orders})</span>}
                </div>
              ))}
        </div>
      </div>

      {/* 5. Today's Bookings & Product Reservations Table (if any) */}
      {eodData.bookings && eodData.bookings.bookedProducts && eodData.bookings.bookedProducts.length > 0 && (
        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              fontSize: "9.5px",
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
              marginBottom: "4px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span>{isRange ? "Product Reservations & Bookings" : "Today's Bookings & Product Reservations"} ({eodData.bookings.totalCount} Bookings)</span>
            <span style={{ fontSize: "8.5px", color: "#4b5563" }}>
              Total Value: <strong style={{ color: "#ea580c" }}>{formatINR(eodData.bookings.totalValue)}</strong> &bull; Advance:{" "}
              <strong style={{ color: "#16a34a" }}>{formatINR(eodData.bookings.totalAdvance)}</strong> &bull; Due:{" "}
              <strong style={{ color: "#dc2626" }}>{formatINR(eodData.bookings.totalDue)}</strong>
            </span>
          </div>

          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "9.5px",
              border: "1.5px solid #111111",
            }}
          >
            <thead>
              <tr style={{ background: "#f3f4f6", textAlign: "left", fontWeight: 800 }}>
                <th style={{ border: "1px solid #111111", padding: "4px 5px", width: "14%" }}>CODE</th>
                <th style={{ border: "1px solid #111111", padding: "4px 5px", width: "36%" }}>PRODUCT NAME</th>
                <th style={{ border: "1px solid #111111", padding: "4px 5px", width: "16%" }}>CATEGORY</th>
                <th style={{ border: "1px solid #111111", padding: "4px 5px", width: "16%" }}>SIZE / VARIANT</th>
                <th style={{ border: "1px solid #111111", padding: "4px 5px", width: "8%", textAlign: "center" }}>QTY</th>
                <th style={{ border: "1px solid #111111", padding: "4px 5px", width: "10%", textAlign: "right" }}>TOTAL VALUE</th>
              </tr>
            </thead>
            <tbody>
              {eodData.bookings.bookedProducts.map((p, idx) => (
                <tr key={idx} style={{ background: idx % 2 === 1 ? "#fafafa" : "#ffffff" }}>
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 5px", fontFamily: "monospace", fontWeight: 700, color: "#ea580c" }}>
                    {p.productCode || "-"}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 5px", fontWeight: 600 }}>{p.name}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 5px", color: "#4b5563" }}>{p.category}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 5px", color: "#374151" }}>{p.sizeOrVariant}</td>
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 5px", textAlign: "center", fontWeight: 800, color: "#ea580c" }}>
                    {p.qty}
                  </td>
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 5px", textAlign: "right", fontFamily: "monospace", fontWeight: 700 }}>
                    {formatINR(p.totalValue)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ background: "#f3f4f6", fontWeight: 800 }}>
                <td colSpan={4} style={{ border: "1px solid #111111", padding: "4px 5px", textAlign: "right" }}>
                  RESERVED TOTALS:
                </td>
                <td style={{ border: "1px solid #111111", padding: "4px 5px", textAlign: "center", fontWeight: 900, color: "#ea580c" }}>
                  {eodData.bookings.bookedProducts.reduce((sum, p) => sum + p.qty, 0)}
                </td>
                <td style={{ border: "1px solid #111111", padding: "4px 5px", textAlign: "right", fontFamily: "monospace", fontWeight: 900 }}>
                  {formatINR(eodData.bookings.totalValue)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* 6. Today's Detailed Order Transactions Table */}
      <div style={{ marginBottom: "10px" }}>
        <div
          style={{
            fontSize: "9.5px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            marginBottom: "4px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{isRange ? "Order Transactions Log" : "Today's Order Transactions"} ({eodData.orders.length} Records)</span>
          <span style={{ fontSize: "8.5px", color: "#6b7280" }}>Comprehensive Audit Log</span>
        </div>

        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            fontSize: "9px",
            border: "1.5px solid #111111",
          }}
        >
          <thead>
            <tr style={{ background: "#f3f4f6", textAlign: "left", fontWeight: 800 }}>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "16%" }}>ORDER & TIME</th>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "16%" }}>CUSTOMER & PHONE</th>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "8%", textAlign: "center" }}>TYPE</th>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "22%" }}>ITEMS SUMMARY</th>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "15%" }}>PAYMENT SPLIT</th>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "8%", textAlign: "right" }}>TOTAL</th>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "9%", textAlign: "right" }}>PAID / DUE</th>
              <th style={{ border: "1px solid #111111", padding: "4px 4px", width: "6%", textAlign: "center" }}>STATUS</th>
            </tr>
          </thead>
          <tbody>
            {eodData.orders.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ padding: "16px", textAlign: "center", color: "#6b7280", border: "1px solid #d1d5db" }}>
                  No orders recorded for this date.
                </td>
              </tr>
            ) : (
              eodData.orders.map((o, idx) => (
                <tr key={o.id} style={{ background: idx % 2 === 1 ? "#fafafa" : "#ffffff", pageBreakInside: "avoid" }}>
                  {/* Order No & Time */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", verticalAlign: "top" }}>
                    <div style={{ fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>{o.orderNo}</div>
                    <div style={{ fontSize: "8px", color: "#6b7280" }}>
                      {o.timeStr} &bull; {o.userName}
                    </div>
                  </td>

                  {/* Customer */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", verticalAlign: "top" }}>
                    <div style={{ fontWeight: 600, color: "#111827" }}>{o.customerName}</div>
                    {o.customerPhone && o.customerPhone !== "-" && (
                      <div style={{ fontSize: "8px", fontFamily: "monospace", color: "#4b5563" }}>{o.customerPhone}</div>
                    )}
                  </td>

                  {/* Type */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", textAlign: "center", verticalAlign: "top" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "2px", alignItems: "center" }}>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          fontSize: "7.5px",
                          fontWeight: 700,
                          background: o.orderType === "BOOKING" ? "#ffedd5" : "#f3e8ff",
                          color: o.orderType === "BOOKING" ? "#c2410c" : "#7e22ce",
                          border: `1px solid ${o.orderType === "BOOKING" ? "#fdba74" : "#d8b4fe"}`,
                        }}
                      >
                        {o.orderType}
                      </span>
                      <span
                        style={{
                          display: "inline-block",
                          padding: "1px 4px",
                          borderRadius: "3px",
                          fontSize: "7px",
                          fontWeight: 700,
                          background: o.saleType === "WHOLESALE" ? "#dbeafe" : "#f3f4f6",
                          color: o.saleType === "WHOLESALE" ? "#1d4ed8" : "#374151",
                          border: `1px solid ${o.saleType === "WHOLESALE" ? "#93c5fd" : "#d1d5db"}`,
                        }}
                      >
                        {o.saleType || "RETAIL"}
                      </span>
                    </div>
                  </td>

                  {/* Items */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", verticalAlign: "top", lineHeight: 1.25 }}>
                    {o.items.length === 0 ? (
                      <span style={{ color: "#9ca3af" }}>No items</span>
                    ) : (
                      o.items.map((it, itIdx) => (
                        <div key={itIdx} style={{ marginBottom: itIdx < o.items.length - 1 ? "1px" : "0" }}>
                          {it.productCode && (
                            <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#ea580c", marginRight: "3px" }}>
                              [{it.productCode}]
                            </span>
                          )}
                          <span style={{ fontWeight: 600 }}>{it.productName}</span>{" "}
                          <span style={{ color: "#ea580c", fontWeight: 700 }}>&times;{it.quantity}</span>
                        </div>
                      ))
                    )}
                  </td>

                  {/* Payments */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", verticalAlign: "top" }}>
                    {o.payments.length === 0 ? (
                      <span style={{ color: "#9ca3af" }}>-</span>
                    ) : (
                      o.payments.map((p, pIdx) => (
                        <div
                          key={pIdx}
                          style={{
                            fontFamily: "monospace",
                            fontSize: "8px",
                            fontWeight: 600,
                            color: p.paymentMode === "CASH" ? "#16a34a" : "#2563eb",
                          }}
                        >
                          {p.paymentMode}: {formatINR(p.amount)}
                        </div>
                      ))
                    )}
                  </td>

                  {/* Total */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", textAlign: "right", fontFamily: "monospace", fontWeight: 700, verticalAlign: "top" }}>
                    {formatINR(o.totalAmount)}
                  </td>

                  {/* Paid / Due */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", textAlign: "right", fontFamily: "monospace", verticalAlign: "top" }}>
                    <div style={{ color: "#16a34a", fontWeight: 600 }}>{formatINR(o.paidAmount)}</div>
                    {o.dueAmount > 0 && <div style={{ color: "#dc2626", fontWeight: 800, fontSize: "8px" }}>Due: {formatINR(o.dueAmount)}</div>}
                  </td>

                  {/* Status */}
                  <td style={{ border: "1px solid #d1d5db", padding: "3.5px 4px", textAlign: "center", verticalAlign: "top" }}>
                    <span
                      style={{
                        display: "inline-block",
                        padding: "1px 4px",
                        borderRadius: "3px",
                        fontSize: "7.5px",
                        fontWeight: 700,
                        background:
                          o.status === "COMPLETED" ? "#dcfce7" : o.status === "PENDING" ? "#fef3c7" : "#fee2e2",
                        color:
                          o.status === "COMPLETED" ? "#15803d" : o.status === "PENDING" ? "#b45309" : "#b91c1c",
                      }}
                    >
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
          {eodData.orders.length > 0 && (
            <tfoot>
              <tr style={{ background: "#f3f4f6", fontWeight: 800 }}>
                <td colSpan={5} style={{ border: "1px solid #111111", padding: "4px 4px", textAlign: "right" }}>
                  TRANSACTION TOTALS:
                </td>
                <td style={{ border: "1px solid #111111", padding: "4px 4px", textAlign: "right", fontFamily: "monospace", fontWeight: 900 }}>
                  {formatINR(eodData.financials.totalSales)}
                </td>
                <td style={{ border: "1px solid #111111", padding: "4px 4px", textAlign: "right", fontFamily: "monospace", fontWeight: 900 }}>
                  <div style={{ color: "#16a34a" }}>{formatINR(eodData.financials.totalCollected)}</div>
                  {eodData.financials.totalDuesCreated > 0 && (
                    <div style={{ color: "#dc2626", fontSize: "8px" }}>Due: {formatINR(eodData.financials.totalDuesCreated)}</div>
                  )}
                </td>
                <td style={{ border: "1px solid #111111", padding: "4px 4px", textAlign: "center", fontSize: "8px" }}>
                  {eodData.orders.length} Orders
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {/* 7. Verification Signatures Block */}
      <div
        style={{
          marginTop: "12px",
          paddingTop: "8px",
          borderTop: "1.5px solid #111111",
          display: "flex",
          justifyContent: "space-between",
          fontSize: "9px",
          color: "#374151",
        }}
      >
      </div>
    </div>
  );
}
