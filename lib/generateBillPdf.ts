import { jsPDF } from "jspdf";
import { BILL_CONFIG } from "./billConfig";
import { Order } from "@/app/actions/orders";

// Pure black-on-white. No fills — thermal printers hate large solid black areas
// (slow, ink/heat heavy, and they can bleed). Emphasis comes from bold weight,
// rules, and bordered boxes instead of filled rectangles.
const GRAY_MUTED: [number, number, number] = [90, 90, 90];

export function generateBillPdf(order: Order) {
  // A4 size: 210 x 297 mm
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const leftMargin = 15;
  const rightMargin = pageWidth - 15;

  // ---------- helpers ----------
  const black = () => doc.setTextColor(0, 0, 0);
  const gray = () => doc.setTextColor(...GRAY_MUTED);

  const centerText = (text: string, yPos: number, size = 10, style = "normal", muted = false) => {
    doc.setFontSize(size);
    doc.setFont("courier", style);
    muted ? gray() : black();
    const textWidth = doc.getTextWidth(text);
    doc.text(text, (pageWidth - textWidth) / 2, yPos);
    black();
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
  };

  const rule = (yPos: number, weight = 0.5) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(weight);
    doc.setLineDashPattern([], 0);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    doc.setLineWidth(0.2);
    return yPos + 5;
  };

  const doubleRule = (yPos: number) => {
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.6);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    doc.line(leftMargin, yPos + 1, rightMargin, yPos + 1);
    doc.setLineWidth(0.2);
    return yPos + 6;
  };

  const dashedRule = (yPos: number) => {
    doc.setDrawColor(160, 160, 160);
    doc.setLineDashPattern([1, 1.2], 0);
    doc.line(leftMargin, yPos, rightMargin, yPos);
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0, 0, 0);
    return yPos + 5;
  };

  const sectionLabel = (label: string, yPos: number) => {
    doc.setFont("courier", "bold");
    doc.setFontSize(9);
    doc.text(label.toUpperCase(), leftMargin, yPos);
    doc.setFont("courier", "normal");
    doc.setFontSize(10);
    return yPos + 5;
  };

  let y = 0;

  // ---------- HEADER (no fill — just type + rules) ----------
  y = 18;
  centerText(BILL_CONFIG.businessName, y, 18, "bold");
  y += 6;
  if (BILL_CONFIG.tagline) {
    centerText(BILL_CONFIG.tagline, y, 9, "italic", true);
    y += 5;
  }
  if (BILL_CONFIG.address) {
    centerText(BILL_CONFIG.address, y, 8, "normal", true);
    y += 4.5;
  }

  const contactBits: string[] = [];
  if (BILL_CONFIG.phone) contactBits.push(`Phone: ${BILL_CONFIG.phone}`);
  if (BILL_CONFIG.gstNo) contactBits.push(`GSTIN: ${BILL_CONFIG.gstNo}`);
  if (contactBits.length) {
    y += 1;
    centerText(contactBits.join("   |   "), y, 9, "normal", true);
    y += 5;
  }

  y += 2;
  y = doubleRule(y);

  centerText("INVOICE / BILL", y, 12, "bold");
  y += 7;

  y = rule(y);

  // --- ORDER INFO ---
  doc.setFont("courier", "bold");
  doc.text(`Order No : ${order.order_no}`, leftMargin, y);
  const dateStr = new Date(order.order_date).toLocaleDateString("en-US", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  doc.text(`Date: ${dateStr}`, rightMargin, y, { align: "right" });
  y += 5;
  doc.setFont("courier", "normal");
  doc.text(`Status   : `, leftMargin, y);
  doc.setFont("courier", "bold");
  doc.text(`${order.status}`, leftMargin + 22, y);
  y += 6;

  y = dashedRule(y);

  // --- BILL TO ---
  y = sectionLabel("Bill To", y);
  doc.setFont("courier", "normal");
  const custName = order.customer?.name || "Walk-in Customer";
  doc.text(`Name  : ${custName}`, leftMargin, y);
  y += 5;
  if (order.customer?.phone) {
    doc.text(`Phone : ${order.customer.phone}`, leftMargin, y);
    y += 5;
  }
  if (order.customer?.email) {
    doc.text(`Email : ${order.customer.email}`, leftMargin, y);
    y += 5;
  }
  y += 1;

  y = rule(y);

  // --- ITEMS TABLE ---
  // All numeric columns are RIGHT-aligned with generous spacing so values
  // of any size (e.g. Rs.12,500.00) never collide with the next column.
  const cIndex = leftMargin;
  const cItem = leftMargin + 10;
  const cQty = rightMargin - 55;
  const cPrice = rightMargin - 28;
  const cTotal = rightMargin;

  doc.setFont("courier", "bold");
  doc.setFontSize(9);
  doc.text("#", cIndex, y);
  doc.text("Item", cItem, y);
  doc.text("Qty", cQty, y, { align: "right" });
  doc.text("Price", cPrice, y, { align: "right" });
  doc.text("Total", cTotal, y, { align: "right" });
  doc.setFontSize(10);
  y += 2;
  y = rule(y, 0.6);

  doc.setFont("courier", "normal");
  let subtotal = 0;

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, index) => {
      const sp = Number(item.selling_price) || 0;
      const qty = Number(item.quantity) || 0;
      const t = sp * qty;
      subtotal += t;

      const code = item.product?.product_code || "-";
      const name = item.product?.name || "Unknown Item";
      const nameWidth = cQty - 30 - cItem;
      const splitName = doc.splitTextToSize(name, nameWidth);

      doc.text(`${index + 1}`, cIndex, y);
      doc.text(code, cItem, y);
      doc.text(qty.toString(), cQty, y, { align: "right" });
      doc.text(`Rs.${sp}`, cPrice, y, { align: "right" });
      doc.text(`Rs.${t}`, cTotal, y, { align: "right" });
      y += 4;

      doc.text(splitName, cItem, y);
      y += 4 * splitName.length + 2;

      // thin dotted separator between items (not on the very last row)
      if (index < order.items!.length - 1) {
        doc.setDrawColor(200, 200, 200);
        doc.setLineDashPattern([0.5, 1], 0);
        doc.line(leftMargin, y - 1.5, rightMargin, y - 1.5);
        doc.setLineDashPattern([], 0);
        doc.setDrawColor(0, 0, 0);
      }
    });
  } else {
    subtotal = (Number(order.total_amount) || 0) + (Number(order.discount) || 0);
  }

  y = rule(y);

  // --- TOTALS ---
  const discount = Number(order.discount) || 0;
  const total = subtotal - discount;
  const totalLblX = rightMargin - 40;

  doc.setFont("courier", "normal");
  doc.text("Subtotal :", totalLblX, y);
  doc.text(`Rs.${subtotal}`, cTotal, y, { align: "right" });
  y += 5;

  if (discount > 0) {
    doc.text("Discount :", totalLblX, y);
    doc.text(`- Rs.${discount}`, cTotal, y, { align: "right" });
    y += 5;
  }

  // TOTAL emphasized with a bordered box + larger bold type — no fill
  y += 1;
  const totalBoxY = y - 5;
  const totalBoxHeight = 9;
  doc.setLineWidth(0.6);
  doc.setDrawColor(0, 0, 0);
  doc.rect(totalLblX - 3, totalBoxY, rightMargin - (totalLblX - 3), totalBoxHeight);
  doc.setLineWidth(0.2);
  doc.setFont("courier", "bold");
  doc.setFontSize(12);
  doc.text("TOTAL", totalLblX, y + 1);
  doc.text(`Rs.${total}`, cTotal, y + 1, { align: "right" });
  doc.setFontSize(10);
  y += totalBoxHeight + 2;

  y = dashedRule(y);

  // --- PAYMENT DETAILS ---
  let paid = 0;
  if (order.payments && order.payments.length > 0) {
    paid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
  }
  const balance = Math.max(0, total - paid);

  if (balance > 0) {
    y += 2;
    doc.setFont("courier", "bold");
    doc.setFontSize(10);
    centerText(`*** OUTSTANDING BALANCE: Rs.${balance} ***`, y, 10, "bold");
    doc.setFont("courier", "normal");
    y += 8;
  }

  y = sectionLabel("Payment Details", y);
  doc.setFont("courier", "normal");

  if (order.payments && order.payments.length > 1) {
    order.payments.forEach((p) => {
      const pMode = p.payment_mode || "CASH";
      const pType = p.payment_type || "PAYMENT";
      // e.g., "ADVANCE (ONLINE)"
      const label = `${pType} (${pMode})`.padEnd(17, " ");
      doc.text(`${label}: Rs.${p.amount}`, leftMargin, y);
      y += 5;
    });
    
    // separator
    doc.setDrawColor(200, 200, 200);
    doc.setLineDashPattern([0.5, 1], 0);
    doc.line(leftMargin, y - 2, leftMargin + 60, y - 2);
    doc.setLineDashPattern([], 0);
    doc.setDrawColor(0, 0, 0);

    const totalLabel = "Total Paid".padEnd(17, " ");
    doc.text(`${totalLabel}: Rs.${paid}`, leftMargin, y);
    y += 5;
  } else if (order.payments && order.payments.length === 1) {
    const p = order.payments[0];
    const pMode = p.payment_mode || "CASH";
    doc.text(`Mode             : ${pMode}`, leftMargin, y);
    doc.text(`Paid             : Rs.${paid}`, leftMargin, y + 5);
    y += 10;
  } else {
    doc.text(`Mode             : -`, leftMargin, y);
    doc.text(`Paid             : Rs.0`, leftMargin, y + 5);
    y += 10;
  }


  doc.setFont("courier", "bold");
  const balLabel = "Balance".padEnd(17, " ");
  doc.text(`${balLabel}: Rs.${balance}`, leftMargin, y);
  doc.setFont("courier", "normal");
  y += 5;

  y = rule(y);

  // --- FOOTER ---
  const staff = order.user?.name || "Staff";
  doc.setFontSize(9);
  gray();
  doc.text(`Served by: ${staff}`, leftMargin, y);
  black();
  doc.setFontSize(10);
  y += 8;

  centerText(BILL_CONFIG.footerMessage, y, 10, "italic");
  y += 5;
  centerText("Thank you for supporting handmade art", y, 8, "normal", true);

  // Save the PDF
  doc.save(`${order.order_no}.pdf`);
}