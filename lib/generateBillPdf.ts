import { jsPDF } from "jspdf";
import { BILL_CONFIG } from "./billConfig";
import { Order } from "@/app/actions/orders";

// Pure black-on-white. No fills — thermal printers hate large solid black areas
// (slow, ink/heat heavy, and they can bleed). Emphasis comes from bold weight,
// rules, and bordered boxes instead of filled rectangles.
const GRAY_MUTED: [number, number, number] = [90, 90, 90];

export async function generateBillPdf(order: Order) {
  // Read saved printer setting, default to a5
  const savedSize = typeof window !== "undefined" ? localStorage.getItem("printerPageSize") : "a5";
  const format = savedSize === "a4" ? "a4" : "a5";

  // Resolve business config from localStorage (saved in Settings), fallback to BILL_CONFIG
  const resolvedConfig = typeof window !== "undefined" ? {
    businessName: localStorage.getItem("settings_businessName") ?? BILL_CONFIG.businessName,
    address: localStorage.getItem("settings_businessAddress") ?? BILL_CONFIG.address,
    phone: localStorage.getItem("settings_businessPhone") ?? BILL_CONFIG.phone,
    gstNo: localStorage.getItem("settings_gstin") ?? BILL_CONFIG.gstNo,
    tagline: BILL_CONFIG.tagline,
    footerMessage: BILL_CONFIG.footerMessage,
  } : BILL_CONFIG;

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: format,
  });

  const isA5 = format === "a5";
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const leftMargin = isA5 ? 12 : 20;
  const rightMargin = pageWidth - (isA5 ? 12 : 20);
  const contentWidth = rightMargin - leftMargin;

  // ---------- Load Optional Logo ----------
  const loadLogo = (): Promise<{ imgData: string, width: number, height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 400; // Cap logo at 400px to prevent PDF engine crashes
        let w = img.width;
        let h = img.height;

        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) {
            h = Math.round((h * MAX_DIM) / w);
            w = MAX_DIM;
          } else {
            w = Math.round((w * MAX_DIM) / h);
            h = MAX_DIM;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, w, h);
          resolve({ imgData: canvas.toDataURL("image/png"), width: w, height: h });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = '/logo.png';
    });
  };
  const logo = await loadLogo();

  // ---------- Helpers ----------
  const setFont = (style: "normal" | "bold" | "italic" = "normal", size = 10, color: [number, number, number] = [0, 0, 0]) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const drawLine = (y: number, color: [number, number, number] = [200, 200, 200]) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y, rightMargin, y);
    return y + 5;
  };

  let y = isA5 ? 15 : 20;

  // ---------- HEADER ----------
  let logoOffset = 0;
  if (logo) {
    const imgWidth = isA5 ? 20 : 25;
    const imgHeight = imgWidth * (logo.height / logo.width);
    doc.addImage(logo.imgData, 'PNG', leftMargin, y - 5, imgWidth, imgHeight);
    logoOffset = imgWidth + 5;
  }

  const textLeftMargin = leftMargin + logoOffset;

  // Determine Bill Title based on order type and payment status
  let billTitle = "INVOICE";
  if (order.order_type === "BOOKING") {
    const paid = order.payments?.reduce((acc, p) => acc + Number(p.amount), 0) || 0;
    const total = (Number(order.total_amount) || 0) - (Number(order.discount) || 0);
    if (paid >= total && paid > 0) {
      billTitle = "FINAL RECEIPT";
    } else {
      billTitle = "BOOKING RECEIPT";
    }
  }

  // Right: INVOICE title
  setFont("bold", isA5 ? (billTitle.length > 10 ? 16 : 20) : 28, [150, 150, 150]); // Light Grey
  const titleWidth = doc.getTextWidth(billTitle);
  doc.text(billTitle, rightMargin, y, { align: "right" });

  // Left: Business Name & Details
  let bizNameSize = isA5 ? 18 : 24;
  setFont("bold", bizNameSize, [0, 0, 0]); // Pure Black
  let bizName = resolvedConfig.businessName.toUpperCase();
  const maxBizNameWidth = contentWidth - titleWidth - logoOffset - 10;
  
  while (doc.getTextWidth(bizName) > maxBizNameWidth && bizNameSize > 10) {
    bizNameSize--;
    setFont("bold", bizNameSize, [0, 0, 0]);
  }
  
  // If still too wide, truncate
  if (doc.getTextWidth(bizName) > maxBizNameWidth) {
    while (doc.getTextWidth(bizName + "...") > maxBizNameWidth && bizName.length > 0) {
      bizName = bizName.slice(0, -1);
    }
    bizName += "...";
  }
  doc.text(bizName, textLeftMargin, y);

  y += 6;

  setFont("normal", isA5 ? 9 : 10, [80, 80, 80]); // Grey

  const headerTextWidth = rightMargin - textLeftMargin - 30; // Leave room for INVOICE text

  if (resolvedConfig.tagline) {
    const lines = doc.splitTextToSize(resolvedConfig.tagline, headerTextWidth);
    doc.text(lines, textLeftMargin, y);
    y += 5 * lines.length;
  }

  if (resolvedConfig.address) {
    const lines = doc.splitTextToSize(resolvedConfig.address, headerTextWidth);
    doc.text(lines, textLeftMargin, y);
    y += 5 * lines.length;
  }

  if (resolvedConfig.phone || resolvedConfig.gstNo) {
    const contact = [
      resolvedConfig.phone ? `Phone: ${resolvedConfig.phone}` : '',
      resolvedConfig.gstNo ? `GSTIN: ${resolvedConfig.gstNo}` : ''
    ].filter(Boolean).join("  |  ");
    const lines = doc.splitTextToSize(contact, headerTextWidth);
    doc.text(lines, textLeftMargin, y);
    y += 5 * lines.length + 3;
  } else {
    y += 3;
  }

  // Ensure y is below logo if logo is taller than text
  if (logo) {
    const imgHeight = (isA5 ? 20 : 25) * (logo.height / logo.width);
    const logoBottom = (isA5 ? 15 : 20) - 5 + imgHeight;
    if (logoBottom + 5 > y) {
      y = logoBottom + 5;
    }
  }

  y = drawLine(y, [200, 200, 200]);
  y += 4;

  // ---------- INVOICE & CUSTOMER INFO ----------
  // 2-column layout
  const midPoint = leftMargin + (contentWidth / 2);

  // Left Column: Bill To
  setFont("bold", 10, [120, 120, 120]);
  doc.text("BILL TO", leftMargin, y);

  setFont("bold", 11, [0, 0, 0]);
  const custName = order.customer?.name || "Walk-in Customer";
  doc.text(custName, leftMargin, y + 6);

  setFont("normal", 10, [80, 80, 80]);
  let custY = y + 11;
  if (order.customer?.phone) {
    doc.text(`Phone: ${order.customer.phone}`, leftMargin, custY);
    custY += 5;
  }
  if (order.customer?.email) {
    doc.text(`Email: ${order.customer.email}`, leftMargin, custY);
  }

  // Right Column: Order Details
  setFont("bold", 10, [120, 120, 120]);
  doc.text("ORDER DETAILS", midPoint, y);

  setFont("normal", 10, [80, 80, 80]);
  doc.text("Order No:", midPoint, y + 6);
  setFont("bold", 10, [0, 0, 0]);
  doc.text(order.order_no, midPoint + 25, y + 6);

  const dateStr = new Date(order.order_date).toLocaleDateString("en-US", {
    day: "2-digit", month: "short", year: "numeric",
  });
  setFont("normal", 10, [80, 80, 80]);
  doc.text("Date:", midPoint, y + 11);
  setFont("bold", 10, [0, 0, 0]);
  doc.text(dateStr, midPoint + 25, y + 11);

  setFont("normal", 10, [80, 80, 80]);
  doc.text("Status:", midPoint, y + 16);
  setFont("bold", 10, [0, 0, 0]);
  doc.text(order.status, midPoint + 25, y + 16);

  y = Math.max(custY + 5, y + 22);
  y += 5;

  // ---------- ITEMS TABLE ----------
  // Table Header
  const headerHeight = 8;
  doc.setFillColor(245, 245, 245); // Light B&W Grey
  doc.setDrawColor(220, 220, 220); // Border Grey
  doc.roundedRect(leftMargin, y, contentWidth, headerHeight, 1, 1, "FD");

  const cIndex = leftMargin + 3;
  const cItem = leftMargin + (isA5 ? 12 : 15);
  const cQty = rightMargin - (isA5 ? 45 : 60);
  const cPrice = rightMargin - (isA5 ? 22 : 30);
  const cTotal = rightMargin - 3;

  const thY = y + 5.5;
  setFont("bold", 9, [100, 100, 100]);
  doc.text("#", cIndex, thY);
  doc.text("ITEM DESCRIPTION", cItem, thY);
  doc.text("QTY", cQty, thY, { align: "right" });
  doc.text("PRICE", cPrice, thY, { align: "right" });
  doc.text("TOTAL", cTotal, thY, { align: "right" });

  y += headerHeight + 6;

  // Table Rows
  let subtotal = 0;
  setFont("normal", 10, [50, 50, 50]);

  if (order.items && order.items.length > 0) {
    order.items.forEach((item, index) => {
      const sp = Number(item.selling_price) || 0;
      const qty = Number(item.quantity) || 0;
      const t = sp * qty;
      subtotal += t;

      const code = item.product?.product_code || "";
      const name = item.product?.name || "Unknown Item";
      
      let dims = "";
      if (item.variant_index != null && item.product?.variants) {
         dims = ` (${item.product.variants[item.variant_index].label})`;
      } else if (item.product?.height) {
        dims = item.product.base ? ` (H-${item.product.height} B-${item.product.base})` : ` (H-${item.product.height})`;
      }
      const fullName = code ? `[${code}] ${name}${dims}` : `${name}${dims}`;

      const nameWidth = cQty - cItem - 10;
      const splitName = doc.splitTextToSize(fullName, nameWidth);

      setFont("normal", 9, [100, 100, 100]);
      doc.text(`${index + 1}`, cIndex, y);

      setFont("bold", 10, [0, 0, 0]);
      doc.text(splitName[0], cItem, y); // first line bold

      if (splitName.length > 1) {
        setFont("normal", 9, [80, 80, 80]);
        doc.text(splitName.slice(1).join(" "), cItem, y + 4);
      }

      setFont("normal", 10, [40, 40, 40]);
      doc.text(qty.toString(), cQty, y, { align: "right" });
      // Removed Rs. unit for item rows
      doc.text(`${sp.toFixed(2)}`, cPrice, y, { align: "right" });

      setFont("bold", 10, [0, 0, 0]);
      doc.text(`${t.toFixed(2)}`, cTotal, y, { align: "right" });

      const lastTextY = y + (splitName.length - 1) * 4;

      // Row separator
      if (index < order.items!.length - 1) {
        doc.setDrawColor(230, 230, 230);
        const lineY = lastTextY + 4;
        doc.line(leftMargin, lineY, rightMargin, lineY);
        y = lineY + 5; // Start next row below the line
      } else {
        y = lastTextY + 5;
      }
    });
  } else {
    subtotal = Number(order.total_amount) || 0;
  }

  y += 2;
  y = drawLine(y, [220, 220, 220]);
  y += 2;

  // ---------- TOTALS ----------
  const discount = Number(order.discount) || 0;
  const total = subtotal;
  const displaySubtotal = subtotal + discount;

  const totalsLeft = rightMargin - (isA5 ? 65 : 80);

  setFont("normal", 10, [80, 80, 80]);
  doc.text("Subtotal:", totalsLeft, y);
  setFont("bold", 10, [0, 0, 0]);
  doc.text(`Rs. ${displaySubtotal.toFixed(2)}`, cTotal, y, { align: "right" });
  y += 6;

  if (discount > 0) {
    setFont("normal", 10, [80, 80, 80]);
    doc.text("Discount:", totalsLeft, y);
    setFont("bold", 10, [0, 0, 0]);
    doc.text(`- Rs. ${discount.toFixed(2)}`, cTotal, y, { align: "right" });
    y += 6;
  }

  // Large Total Box
  y += 2;
  doc.setFillColor(245, 245, 245);
  doc.roundedRect(totalsLeft - 5, y, rightMargin - totalsLeft + 5, 12, 1, 1, "F");

  setFont("bold", 12, [0, 0, 0]);
  doc.text("GRAND TOTAL:", totalsLeft, y + 8);
  setFont("bold", 14, [0, 0, 0]); // black instead of green
  doc.text(`Rs. ${total.toFixed(2)}`, cTotal, y + 8.5, { align: "right" });
  y += 18;

  // ---------- PAYMENT DETAILS ----------
  let paid = 0;
  if (order.payments && order.payments.length > 0) {
    paid = order.payments.reduce((acc, p) => acc + Number(p.amount), 0);
  }
  const balance = Math.max(0, total - paid);

  // Payments Block
  setFont("bold", 9, [100, 100, 100]);
  doc.text("PAYMENT INFO", leftMargin, y);
  y += 5;

  setFont("normal", 9, [80, 80, 80]);
  if (order.payments && order.payments.length > 0) {
    order.payments.forEach((p) => {
      const pMode = p.payment_mode || "CASH";
      const pType = p.payment_type || "PAYMENT";
      doc.text(`${pType} via ${pMode}: Rs. ${Number(p.amount).toFixed(2)}`, leftMargin, y);
      y += 4;
    });
  } else {
    doc.text("No payments recorded.", leftMargin, y);
    y += 4;
  }

  if (balance > 0) {
    y += 2;
    setFont("bold", 14, [0, 0, 0]);

    const text = `Outstanding Balance: Rs. ${balance.toFixed(2)}`;
    doc.text(text, leftMargin, y);

    // Calculate text width
    const textWidth = doc.getTextWidth(text);

    // Draw underline
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(leftMargin, y + 0.5, leftMargin + textWidth, y + 0.5);
  }

  // ---------- FOOTER ----------
  // Positioned at the bottom
  const footerY = pageHeight - (isA5 ? 15 : 20);

  drawLine(footerY - 8, [230, 230, 230]);

  setFont("italic", 9, [120, 120, 120]);
  const textWidthMsg = doc.getTextWidth(resolvedConfig.footerMessage);
  doc.text(resolvedConfig.footerMessage, (pageWidth - textWidthMsg) / 2, footerY);

  setFont("normal", 8, [150, 150, 150]);
  const thanks = "Jai Ganesh.";
  const thanksW = doc.getTextWidth(thanks);
  doc.text(thanks, (pageWidth - thanksW) / 2, footerY + 4);

  // Open PDF in a new tab and trigger print automatically
  doc.autoPrint();
  const pdfBlobUrl = URL.createObjectURL(doc.output("blob"));
  window.open(pdfBlobUrl, "_blank");
}