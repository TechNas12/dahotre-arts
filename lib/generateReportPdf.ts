import { jsPDF } from "jspdf";
import { BILL_CONFIG } from "./billConfig";

const GRAY_MUTED: [number, number, number] = [100, 100, 100];
const BLACK: [number, number, number] = [20, 20, 20];
const ORANGE_ACCENT: [number, number, number] = [249, 115, 22];

interface ReportConfig {
  title: string;
  dateFrom?: string;
  dateTo?: string;
  categoryName?: string;
}

// -----------------------------------------------------------------------------
// Shared Helpers
// -----------------------------------------------------------------------------

async function createReportDoc(config: ReportConfig) {
  const savedSize = typeof window !== "undefined" ? localStorage.getItem("printerPageSize") : "a5";
  const format = savedSize === "a4" ? "a4" : "a5";

  const resolvedConfig = typeof window !== "undefined" ? {
    businessName: localStorage.getItem("settings_businessName") ?? BILL_CONFIG.businessName,
    address: localStorage.getItem("settings_businessAddress") ?? BILL_CONFIG.address,
    phone: localStorage.getItem("settings_businessPhone") ?? BILL_CONFIG.phone,
    gstNo: localStorage.getItem("settings_gstin") ?? BILL_CONFIG.gstNo,
    tagline: BILL_CONFIG.tagline,
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

  const loadLogo = (): Promise<{ imgData: string, width: number, height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 400;
        let w = img.width;
        let h = img.height;
        if (w > MAX_DIM || h > MAX_DIM) {
          if (w > h) { h = Math.round((h * MAX_DIM) / w); w = MAX_DIM; } 
          else { w = Math.round((w * MAX_DIM) / h); h = MAX_DIM; }
        }
        const canvas = document.createElement("canvas");
        canvas.width = w; canvas.height = h;
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

  const setFont = (style: "normal" | "bold" | "italic" = "normal", size = 10, color: [number, number, number] = BLACK) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
  };

  const drawLine = (y: number, color: [number, number, number] = [220, 220, 220], width = 0.3) => {
    doc.setDrawColor(...color);
    doc.setLineWidth(width);
    doc.line(leftMargin, y, rightMargin, y);
    return y + 5;
  };

  let y = isA5 ? 15 : 20;

  // Header Logo
  let logoOffset = 0;
  if (logo) {
    const imgWidth = isA5 ? 20 : 25;
    const imgHeight = imgWidth * (logo.height / logo.width);
    doc.addImage(logo.imgData, 'PNG', leftMargin, y - 5, imgWidth, imgHeight);
    logoOffset = imgWidth + 6;
  }

  const textLeftMargin = leftMargin + logoOffset;

  // Report Title (Right aligned)
  setFont("bold", isA5 ? 16 : 20, ORANGE_ACCENT);
  doc.text(config.title.toUpperCase(), rightMargin, y, { align: "right" });

  // Business Name
  setFont("bold", isA5 ? 16 : 20, BLACK);
  doc.text(resolvedConfig.businessName.toUpperCase(), textLeftMargin, y);
  y += isA5 ? 5 : 7;

  // Business Details
  setFont("normal", isA5 ? 8 : 10, GRAY_MUTED);
  const details = [resolvedConfig.address, `Ph: ${resolvedConfig.phone}`];
  if (resolvedConfig.gstNo) details.push(`GST: ${resolvedConfig.gstNo}`);
  doc.text(details.join(" | "), textLeftMargin, y);
  
  y += isA5 ? 6 : 8;
  y = drawLine(y);

  // Report Metadata
  setFont("bold", isA5 ? 9 : 10, BLACK);
  const periodText = config.dateFrom || config.dateTo 
    ? `Period: ${config.dateFrom || 'Start'} to ${config.dateTo || 'End'}`
    : "Period: All Time";
  const categoryText = config.categoryName && config.categoryName !== "All Categories" && config.categoryName !== "ALL"
    ? ` | Cat: ${config.categoryName}`
    : "";
  doc.text(`${periodText}${categoryText}`, leftMargin, y);
  
  setFont("normal", isA5 ? 8 : 9, GRAY_MUTED);
  const generatedText = `Generated: ${new Date().toLocaleString('en-IN')}`;
  doc.text(generatedText, rightMargin, y, { align: "right" });
  
  y += isA5 ? 8 : 10;

  return { doc, isA5, leftMargin, rightMargin, contentWidth, pageHeight, y, setFont, drawLine };
}

function drawKpiBoxes(
  doc: jsPDF,
  kpis: {label: string, value: string}[],
  startY: number,
  config: { isA5: boolean, leftMargin: number, contentWidth: number, setFont: any }
) {
  let y = startY;
  const { isA5, leftMargin, contentWidth, setFont } = config;
  const boxHeight = isA5 ? 16 : 22;
  const gap = isA5 ? 4 : 6;
  const cols = 2; // Always 2 columns for KPIs for a structured grid
  const rows = Math.ceil(kpis.length / cols);
  const boxWidth = (contentWidth - gap * (cols - 1)) / cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= kpis.length) break;
      
      const boxX = leftMargin + c * (boxWidth + gap);
      const boxY = y + r * (boxHeight + gap);

      // Box background
      doc.setFillColor(252, 252, 252);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, "FD");

      // Orange Accent Bar
      doc.setDrawColor(...ORANGE_ACCENT);
      doc.setLineWidth(1);
      doc.line(boxX + 2, boxY + 2, boxX + 8, boxY + 2);

      // Label
      setFont("bold", isA5 ? 7 : 8, GRAY_MUTED);
      doc.text(kpis[i].label.toUpperCase(), boxX + 4, boxY + 7);

      // Value
      setFont("bold", isA5 ? 12 : 16, BLACK);
      doc.text(kpis[i].value, boxX + 4, boxY + 14);
    }
  }

  return y + rows * (boxHeight + gap) + 6;
}

function drawTable(
  doc: jsPDF, 
  headers: string[], 
  rows: string[][], 
  startY: number, 
  colWidths: number[], 
  config: { 
    isA5: boolean, 
    leftMargin: number, 
    pageHeight: number, 
    setFont: any,
    drawLine: any 
  },
  alignments?: ("left" | "right" | "center")[]
) {
  let y = startY;
  const rowHeight = config.isA5 ? 8 : 10;
  const { isA5, leftMargin, pageHeight, setFont } = config;

  const checkPageBreak = (currentY: number, neededSpace: number) => {
    if (currentY + neededSpace > pageHeight - 20) {
      doc.addPage();
      return isA5 ? 15 : 20;
    }
    return currentY;
  };

  // Header Background
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y, colWidths.reduce((a,b)=>a+b, 0), rowHeight, "F");

  // Headers
  setFont("bold", isA5 ? 8 : 9, BLACK);
  let currentX = leftMargin;
  headers.forEach((header, i) => {
    const align = alignments?.[i] || "left";
    const textX = align === "right" ? currentX + colWidths[i] - 3 : currentX + 3;
    doc.text(header, textX, y + (rowHeight - 3), { align });
    currentX += colWidths[i];
  });
  y += rowHeight;
  
  // Header Bottom Border
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.line(leftMargin, y, currentX, y);
  
  y += 2;

  // Rows
  setFont("normal", isA5 ? 8 : 9, BLACK);
  rows.forEach((row, rowIndex) => {
    y = checkPageBreak(y, rowHeight);
    
    // Alternating row background
    if (rowIndex % 2 !== 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(leftMargin, y - 2, colWidths.reduce((a,b)=>a+b, 0), rowHeight, "F");
    }

    currentX = leftMargin;
    row.forEach((cell, i) => {
      const align = alignments?.[i] || "left";
      const cellWidth = colWidths[i] - 6;
      const textLines = doc.splitTextToSize(cell?.toString() || "-", cellWidth);
      const textX = align === "right" ? currentX + colWidths[i] - 3 : currentX + 3;
      doc.text(textLines, textX, y + 4.5, { align });
      currentX += colWidths[i];
    });
    
    // Subtle row bottom border
    doc.setDrawColor(240, 240, 240);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, y + rowHeight - 2, currentX, y + rowHeight - 2);
    
    y += rowHeight;
  });

  return y + 5;
}

const formatCurrency = (val: number) => `Rs. ${val.toLocaleString('en-IN')}`;

// -----------------------------------------------------------------------------
// Report Generators
// -----------------------------------------------------------------------------

export async function generateRevenuePdf(data: any, dateFrom?: string, dateTo?: string, categoryName?: string) {
  const { doc, isA5, leftMargin, contentWidth, pageHeight, y: startY, setFont, drawLine } = await createReportDoc({
    title: "Revenue Report",
    dateFrom,
    dateTo,
    categoryName
  });

  let y = startY;

  const kpis = [
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue) },
    { label: "Cash Received", value: formatCurrency(data.cashRev) },
    { label: "Online Received", value: formatCurrency(data.upiRev) },
    { label: "Outstanding Dues", value: formatCurrency(data.outstandingDues) },
  ];
  
  y = drawKpiBoxes(doc, kpis, y, { isA5, leftMargin, contentWidth, setFont });
  y = drawLine(y);

  setFont("bold", isA5 ? 10 : 12, BLACK);
  doc.text("DAILY REVENUE BREAKDOWN", leftMargin, y);
  y += 6;

  const colWidths = [contentWidth * 0.3, contentWidth * 0.2, contentWidth * 0.25, contentWidth * 0.25];
  const alignments: ("left"|"right")[] = ["left", "right", "right", "right"];
  
  const headers = ["Date", "Cash", "Online", "Total"];
  const rows = data.chartData.map((d: any) => [
    d.date,
    formatCurrency(d.cash),
    formatCurrency(d.upi),
    formatCurrency(d.total)
  ]);

  rows.push([
    "TOTAL",
    formatCurrency(data.cashRev),
    formatCurrency(data.upiRev),
    formatCurrency(data.totalRevenue)
  ]);

  y = drawTable(doc, headers, rows, y, colWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, alignments);

  // Page 2: Transactions
  doc.addPage();
  let y2 = isA5 ? 15 : 20;
  
  setFont("bold", isA5 ? 12 : 14, BLACK);
  doc.text("PAYMENT TRANSACTIONS", leftMargin, y2);
  y2 += 8;

  const tColWidths = isA5 
    ? [contentWidth * 0.22, contentWidth * 0.2, contentWidth * 0.33, contentWidth * 0.1, contentWidth * 0.15]
    : [contentWidth * 0.15, contentWidth * 0.2, contentWidth * 0.4, contentWidth * 0.1, contentWidth * 0.15];
  const tAlignments: ("left"|"right")[] = ["left", "left", "left", "left", "right"];

  const tHeaders = ["Date", "Order No", "Customer", "Mode", "Amount"];
  const tRows = data.transactions?.map((t: any) => [
    t.date,
    t.orderNo,
    t.customer,
    t.mode,
    formatCurrency(t.amount)
  ]) || [];

  drawTable(doc, tHeaders, tRows, y2, tColWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, tAlignments);

  doc.save(`dahotre-revenue-${new Date().getTime()}.pdf`);
}


export async function generateSalesPdf(data: any, dateFrom?: string, dateTo?: string, categoryName?: string) {
  const { doc, isA5, leftMargin, contentWidth, pageHeight, y: startY, setFont, drawLine } = await createReportDoc({
    title: "Sales Report",
    dateFrom,
    dateTo,
    categoryName
  });

  let y = startY;

  const kpis = [
    { label: "Total Orders", value: data.totalOrders.toString() },
    { label: "Avg Order Value", value: formatCurrency(data.avgOrderValue) },
    { label: "Items Sold", value: data.itemsSold.toString() },
    { label: "Cancelled Orders", value: data.cancelledOrders.toString() },
  ];
  
  y = drawKpiBoxes(doc, kpis, y, { isA5, leftMargin, contentWidth, setFont });
  y = drawLine(y);

  setFont("bold", isA5 ? 10 : 12, BLACK);
  doc.text("TOP PRODUCTS", leftMargin, y);
  y += 6;

  const colWidths = [contentWidth * 0.6, contentWidth * 0.15, contentWidth * 0.25];
  const alignments: ("left"|"right")[] = ["left", "right", "right"];

  const headers = ["Product Name", "Qty Sold", "Revenue"];
  const rows = data.topProducts.map((p: any) => [
    p.name,
    p.qty.toString(),
    formatCurrency(p.revenue)
  ]);

  y = drawTable(doc, headers, rows, y, colWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, alignments);

  doc.save(`dahotre-sales-${new Date().getTime()}.pdf`);
}

export async function generateInventoryPdf(data: any, categoryName?: string) {
  const { doc, isA5, leftMargin, contentWidth, pageHeight, y: startY, setFont, drawLine } = await createReportDoc({
    title: "Inventory Report",
    categoryName
  });

  let y = startY;

  const kpis = [
    { label: "Total SKUs", value: data.totalSkus.toString() },
    { label: "Total Stock Qty", value: data.totalStockQty.toString() },
    { label: "Stock Value", value: formatCurrency(data.stockValue) },
    { label: "Out of Stock", value: `${data.outOfStock} items` },
  ];
  
  y = drawKpiBoxes(doc, kpis, y, { isA5, leftMargin, contentWidth, setFont });
  y = drawLine(y);

  setFont("bold", isA5 ? 10 : 12, BLACK);
  doc.text("FAST MOVING PRODUCTS (Last 90 Days)", leftMargin, y);
  y += 6;

  const colWidths = [contentWidth * 0.8, contentWidth * 0.2];
  const alignments: ("left"|"right")[] = ["left", "right"];
  
  let headers = ["Product Name", "Qty Sold"];
  let rows = data.fastMoving.map((p: any) => [p.name, p.qtySold.toString()]);
  y = drawTable(doc, headers, rows, y, colWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, alignments);

  y += 5;
  
  setFont("bold", isA5 ? 10 : 12, BLACK);
  doc.text("DEAD STOCK (0 Sales in 90 Days)", leftMargin, y);
  y += 6;

  headers = ["Product Name", "Current Stock"];
  rows = data.deadStock.map((p: any) => [p.name, p.stock.toString()]);
  drawTable(doc, headers, rows, y, colWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, alignments);

  doc.save(`dahotre-inventory-${new Date().getTime()}.pdf`);
}

export async function generateCustomersPdf(data: any, dateFrom?: string, dateTo?: string, categoryName?: string) {
  const { doc, isA5, leftMargin, contentWidth, pageHeight, y: startY, setFont, drawLine } = await createReportDoc({
    title: "Customers Report",
    dateFrom,
    dateTo,
    categoryName
  });

  let y = startY;

  const kpis = [
    { label: "Total Customers", value: data.totalCustomers.toString() },
    { label: "New in Period", value: data.newCustomers.toString() },
    { label: "Repeat Customers", value: data.repeatCustomers.toString() },
    { label: "Avg Lifetime Value", value: formatCurrency(data.avgLifetimeValue) },
  ];
  
  y = drawKpiBoxes(doc, kpis, y, { isA5, leftMargin, contentWidth, setFont });
  y = drawLine(y);

  setFont("bold", isA5 ? 10 : 12, BLACK);
  doc.text("TOP SPENDERS", leftMargin, y);
  y += 6;

  const colWidths = [contentWidth * 0.7, contentWidth * 0.3];
  const alignments: ("left"|"right")[] = ["left", "right"];
  
  let headers = ["Customer Name", "Total Spend"];
  let rows = data.topCustomers.map((c: any) => [c.name, formatCurrency(c.spend)]);
  y = drawTable(doc, headers, rows, y, colWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, alignments);

  y += 5;

  setFont("bold", isA5 ? 10 : 12, BLACK);
  doc.text("TOP OUTSTANDING DUES", leftMargin, y);
  y += 6;

  headers = ["Customer Name", "Amount Owed"];
  rows = data.topOutstanding.map((c: any) => [c.name, formatCurrency(c.owed)]);
  drawTable(doc, headers, rows, y, colWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, alignments);

  doc.save(`dahotre-customers-${new Date().getTime()}.pdf`);
}

export async function generateProfitPdf(data: any, dateFrom?: string, dateTo?: string, categoryName?: string) {
  const { doc, isA5, leftMargin, contentWidth, pageHeight, y: startY, setFont, drawLine } = await createReportDoc({
    title: "Profit Report",
    dateFrom,
    dateTo,
    categoryName
  });

  let y = startY;

  const kpis = [
    { label: "Gross Profit", value: `${formatCurrency(data.grossProfit)} (${data.grossMargin.toFixed(1)}%)` },
    { label: "Net Profit", value: `${formatCurrency(data.netProfit)} (${data.netMargin.toFixed(1)}%)` },
    { label: "Total Revenue", value: formatCurrency(data.totalRevenue) },
    { label: "Total Expenses", value: formatCurrency(data.totalExpenses) },
  ];
  
  y = drawKpiBoxes(doc, kpis, y, { isA5, leftMargin, contentWidth, setFont });
  y = drawLine(y);

  setFont("bold", isA5 ? 10 : 12, BLACK);
  doc.text("EXPENSE BREAKDOWN", leftMargin, y);
  y += 6;

  const colWidths = [contentWidth * 0.7, contentWidth * 0.3];
  const alignments: ("left"|"right")[] = ["left", "right"];
  
  const headers = ["Category", "Amount"];
  const rows = data.expenseBreakdown.map((e: any) => [e.name, formatCurrency(e.value)]);
  rows.push(["TOTAL", formatCurrency(data.totalExpenses)]);

  drawTable(doc, headers, rows, y, colWidths, { isA5, leftMargin, pageHeight, setFont, drawLine }, alignments);

  doc.save(`dahotre-profit-${new Date().getTime()}.pdf`);
}

function drawRichKpiBoxes(
  doc: jsPDF,
  kpis: { label: string; value: string; subtext?: string }[],
  startY: number,
  config: { isA5: boolean; leftMargin: number; contentWidth: number; setFont: (style?: "normal" | "bold" | "italic", size?: number, color?: [number, number, number]) => void }
) {
  const y = startY;
  const { isA5, leftMargin, contentWidth, setFont } = config;
  const boxHeight = isA5 ? 19 : 24;
  const gap = isA5 ? 4 : 5;
  const cols = 2; // 2x2 grid for clean presentation
  const rows = Math.ceil(kpis.length / cols);
  const boxWidth = (contentWidth - gap * (cols - 1)) / cols;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const i = r * cols + c;
      if (i >= kpis.length) break;

      const boxX = leftMargin + c * (boxWidth + gap);
      const boxY = y + r * (boxHeight + gap);

      // Box background
      doc.setFillColor(252, 252, 252);
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.3);
      doc.roundedRect(boxX, boxY, boxWidth, boxHeight, 2, 2, "FD");

      // Orange Accent Bar
      doc.setDrawColor(...ORANGE_ACCENT);
      doc.setLineWidth(1.2);
      doc.line(boxX + 2, boxY + 2, boxX + 10, boxY + 2);

      // Label
      setFont("bold", isA5 ? 6.5 : 7.5, GRAY_MUTED);
      doc.text(kpis[i].label.toUpperCase(), boxX + 4, boxY + 6.5);

      // Value
      setFont("bold", isA5 ? 11 : 14, BLACK);
      doc.text(kpis[i].value, boxX + 4, boxY + (isA5 ? 12 : 14.5));

      // Subtext
      if (kpis[i].subtext) {
        setFont("normal", isA5 ? 6 : 7, GRAY_MUTED);
        const subLines = doc.splitTextToSize(kpis[i].subtext!, boxWidth - 8);
        doc.text(subLines[0] || "", boxX + 4, boxY + (isA5 ? 16.5 : 20));
      }
    }
  }

  return y + rows * (boxHeight + gap) + 4;
}

function drawDynamicTable(
  doc: jsPDF, 
  headers: string[], 
  rows: (string | string[])[][], 
  startY: number, 
  colWidths: number[], 
  config: { 
    isA5: boolean; 
    leftMargin: number; 
    pageHeight: number; 
    setFont: (style?: "normal" | "bold" | "italic", size?: number, color?: [number, number, number]) => void;
    drawLine: (y: number, color?: [number, number, number], width?: number) => number;
  },
  alignments?: ("left" | "right" | "center")[],
  footerRow?: (string | string[])[]
) {
  let y = startY;
  const { isA5, leftMargin, pageHeight, setFont } = config;
  const baseLineHeight = isA5 ? 3.3 : 4.2;
  const headerHeight = isA5 ? 6.5 : 8;
  const totalTableWidth = colWidths.reduce((a, b) => a + b, 0);

  const checkPageBreak = (currentY: number, neededSpace: number) => {
    if (currentY + neededSpace > pageHeight - 16) {
      doc.addPage();
      const newY = isA5 ? 12 : 16;
      // Re-draw header on new page
      doc.setFillColor(240, 240, 240);
      doc.rect(leftMargin, newY, totalTableWidth, headerHeight, "F");
      setFont("bold", isA5 ? 7 : 8, BLACK);
      let curX = leftMargin;
      headers.forEach((header, i) => {
        const align = alignments?.[i] || "left";
        const textX = align === "right" ? curX + colWidths[i] - 2 : align === "center" ? curX + colWidths[i] / 2 : curX + 2;
        doc.text(header, textX, newY + (headerHeight - 2), { align });
        curX += colWidths[i];
      });
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(leftMargin, newY + headerHeight, curX, newY + headerHeight);
      return newY + headerHeight + 1;
    }
    return currentY;
  };

  // Draw Header
  y = checkPageBreak(y, headerHeight + 10);
  doc.setFillColor(240, 240, 240);
  doc.rect(leftMargin, y, totalTableWidth, headerHeight, "F");

  setFont("bold", isA5 ? 7 : 8, BLACK);
  let currentX = leftMargin;
  headers.forEach((header, i) => {
    const align = alignments?.[i] || "left";
    const textX = align === "right" ? currentX + colWidths[i] - 2 : align === "center" ? currentX + colWidths[i] / 2 : currentX + 2;
    doc.text(header, textX, y + (headerHeight - 2), { align });
    currentX += colWidths[i];
  });
  y += headerHeight;
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.4);
  doc.line(leftMargin, y, currentX, y);
  y += 1;

  // Draw Rows
  rows.forEach((row, rowIndex) => {
    setFont("normal", isA5 ? 6.5 : 7.5, BLACK);
    const cellLinesList: string[][] = row.map((cell, i) => {
      const cellWidth = colWidths[i] - 4;
      if (Array.isArray(cell)) {
        const flatLines: string[] = [];
        cell.forEach((line) => {
          if (line) {
            const split = doc.splitTextToSize(line.toString(), cellWidth);
            flatLines.push(...split);
          }
        });
        return flatLines.length > 0 ? flatLines : ["-"];
      }
      return doc.splitTextToSize(cell?.toString() || "-", cellWidth);
    });

    const maxLines = Math.max(...cellLinesList.map((lines) => lines.length), 1);
    const calculatedRowHeight = Math.max(isA5 ? 5.5 : 7, maxLines * baseLineHeight + (isA5 ? 2.5 : 3));

    y = checkPageBreak(y, calculatedRowHeight);

    // Alternating background
    if (rowIndex % 2 !== 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(leftMargin, y - 0.5, totalTableWidth, calculatedRowHeight, "F");
    }

    currentX = leftMargin;
    cellLinesList.forEach((lines, i) => {
      const align = alignments?.[i] || "left";
      const textX = align === "right" ? currentX + colWidths[i] - 2 : align === "center" ? currentX + colWidths[i] / 2 : currentX + 2;
      doc.text(lines, textX, y + (isA5 ? 2.6 : 3.2), { align });
      currentX += colWidths[i];
    });

    // Row bottom border
    doc.setDrawColor(235, 235, 235);
    doc.setLineWidth(0.2);
    doc.line(leftMargin, y + calculatedRowHeight - 0.5, currentX, y + calculatedRowHeight - 0.5);

    y += calculatedRowHeight;
  });

  // Draw Footer Row if provided
  if (footerRow && footerRow.length > 0) {
    y = checkPageBreak(y, headerHeight);
    doc.setFillColor(242, 242, 242);
    doc.rect(leftMargin, y, totalTableWidth, headerHeight, "F");
    setFont("bold", isA5 ? 7 : 8, BLACK);
    let curX = leftMargin;
    footerRow.forEach((cell, i) => {
      const align = alignments?.[i] || "left";
      const textX = align === "right" ? curX + colWidths[i] - 2 : align === "center" ? curX + colWidths[i] / 2 : curX + 2;
      const textVal = Array.isArray(cell) ? cell.join(" ") : cell?.toString() || "";
      doc.text(textVal, textX, y + (headerHeight - 2), { align });
      curX += colWidths[i];
    });
    doc.setDrawColor(180, 180, 180);
    doc.setLineWidth(0.4);
    doc.line(leftMargin, y + headerHeight, curX, y + headerHeight);
    y += headerHeight;
  }

  return y + 3;
}

export async function generateEodReportPdf(data: any, dateStr?: string, categoryName?: string, dateToStr?: string) {
  const targetDateFrom = dateStr || data.dateFrom || data.date || new Date().toISOString().split("T")[0];
  const targetDateTo = dateToStr || data.dateTo || targetDateFrom;
  const isRange = targetDateFrom !== targetDateTo;

  const { doc, isA5, leftMargin, rightMargin, contentWidth, pageHeight, y: startY, setFont, drawLine } = await createReportDoc({
    title: isRange ? "Settlement Audit Report" : "EOD Settlement",
    dateFrom: targetDateFrom,
    dateTo: targetDateTo,
    categoryName
  });

  let y = startY;

  // 1. Top 4 KPI Summary Cards (Matching Screen Cards)
  const kpis = [
    {
      label: "Total Gross Sales",
      value: formatCurrency(data.financials.totalSales),
      subtext: `${data.financials.totalOrdersCount} Orders (${data.financials.directOrdersCount} Direct + ${data.financials.bookingOrdersCount} Bookings)`,
    },
    {
      label: "Cash Collected",
      value: formatCurrency(data.financials.totalCashCollected),
      subtext: "Physical Cash in Register",
    },
    {
      label: "Online / UPI Collected",
      value: formatCurrency(data.financials.totalOnlineCollected),
      subtext: "UPI, QR & Bank Transfers",
    },
    {
      label: "New Dues Created",
      value: formatCurrency(data.financials.totalDuesCreated),
      subtext: "Uncollected Balances",
    },
  ];

  y = drawRichKpiBoxes(doc, kpis, y, { isA5, leftMargin, contentWidth, setFont });
  y = drawLine(y);

  // 2. Middle Section: Cash Register & Collections Settlement (No Expenses)
  setFont("bold", isA5 ? 8.5 : 10.5, BLACK);
  doc.text("REGISTER SETTLEMENT & RECONCILIATION", leftMargin, y);
  y += 4;

  const cashPct = data.financials.totalCollected > 0
    ? Math.round((data.financials.totalCashCollected / data.financials.totalCollected) * 100)
    : 0;
  const onlinePct = data.financials.totalCollected > 0 ? 100 - cashPct : 0;

  const comparisonLabel = isRange
    ? `Comparison vs ${data.prevPeriodLabel || "Previous Period"}`
    : `Day-over-Day Comparison vs Yesterday (${data.prevDate})`;

  const summaryCols = [contentWidth * 0.65, contentWidth * 0.35];
  const summaryHeaders = ["Settlement Metric", "Amount / Share"];
  const summaryRows = [
    ["(+) Cash Sales & Advances Collected", formatCurrency(data.financials.totalCashCollected)],
    ["(+) Online & UPI Collections", formatCurrency(data.financials.totalOnlineCollected)],
    [`(=) Total Settlement Collected ${isRange ? "in Period" : "Today"}`, formatCurrency(data.financials.totalCollected)],
    [
      comparisonLabel,
      `${(data.growth?.salesGrowthPct ?? 0) >= 0 ? "+" : ""}${(data.growth?.salesGrowthPct ?? 0).toFixed(1)}% (${formatCurrency(data.growth?.todaySales ?? 0)} vs ${formatCurrency(data.growth?.yesterdaySales ?? 0)})`,
    ],
    [
      "Payment Mode Share",
      `Cash ${cashPct}% (${formatCurrency(data.financials.totalCashCollected)}) | Online ${onlinePct}% (${formatCurrency(data.financials.totalOnlineCollected)})`,
    ],
  ];

  y = drawDynamicTable(
    doc,
    summaryHeaders,
    summaryRows,
    y,
    summaryCols,
    { isA5, leftMargin, pageHeight, setFont, drawLine },
    ["left", "right"]
  );
  y += 3;

  // 3. Bookings Summary (Matching Screen)
  if (data.bookings && data.bookings.bookedProducts && data.bookings.bookedProducts.length > 0) {
    if (y + 35 > pageHeight - 20) {
      doc.addPage();
      y = isA5 ? 12 : 16;
    }

    const bookingsHeading = isRange ? "PRODUCT RESERVATIONS & BOOKINGS" : "TODAY'S PRODUCT RESERVATIONS";
    setFont("bold", isA5 ? 8.5 : 10.5, BLACK);
    doc.text(
      `${bookingsHeading} (${data.bookings.totalCount} Bookings • Value: ${formatCurrency(data.bookings.totalValue)} • Adv: ${formatCurrency(data.bookings.totalAdvance)} • Due: ${formatCurrency(data.bookings.totalDue)})`,
      leftMargin,
      y
    );
    y += 4;

    const bCols = [
      contentWidth * 0.15, // Code
      contentWidth * 0.35, // Name
      contentWidth * 0.16, // Category
      contentWidth * 0.14, // Size/Variant
      contentWidth * 0.08, // Qty
      contentWidth * 0.12, // Value
    ];
    const bHeaders = ["CODE", "PRODUCT NAME", "CATEGORY", "SIZE/VARIANT", "QTY", "VALUE"];
    const bRows = data.bookings.bookedProducts.map((p: any) => [
      p.productCode || "-",
      p.name,
      p.category || "-",
      p.sizeOrVariant || "-",
      String(p.qty),
      formatCurrency(p.totalValue),
    ]);

    const totalQty = data.bookings.bookedProducts.reduce((sum: number, p: any) => sum + p.qty, 0);
    const bFooter = ["TOTAL", "", "", "", String(totalQty), formatCurrency(data.bookings.totalValue)];

    y = drawDynamicTable(
      doc,
      bHeaders,
      bRows,
      y,
      bCols,
      { isA5, leftMargin, pageHeight, setFont, drawLine },
      ["left", "left", "left", "left", "center", "right"],
      bFooter
    );
    y += 3;
  }

  // 4. Detailed Orders Transactions Table (Matching Screen Table Same to Same)
  if (data.orders && data.orders.length > 0) {
    if (y + 35 > pageHeight - 20) {
      doc.addPage();
      y = isA5 ? 12 : 16;
    }

    const ordersHeading = isRange ? "ORDER TRANSACTIONS LOG" : "TODAY'S ORDER TRANSACTIONS";
    const ordersSub = isRange ? `${targetDateFrom} to ${targetDateTo}` : targetDateFrom;
    setFont("bold", isA5 ? 8.5 : 10.5, BLACK);
    doc.text(`${ordersHeading} (${data.orders.length} Orders Placed: ${ordersSub})`, leftMargin, y);
    y += 4;

    const oCols = [
      contentWidth * 0.16, // Order No & Time
      contentWidth * 0.16, // Customer & Phone
      contentWidth * 0.09, // Type
      contentWidth * 0.20, // Items Summary
      contentWidth * 0.13, // Payment Split
      contentWidth * 0.09, // Total
      contentWidth * 0.10, // Paid / Due
      contentWidth * 0.07, // Status
    ];

    const oAlignments: ("left" | "left" | "center" | "left" | "left" | "right" | "right" | "center")[] = [
      "left",
      "left",
      "center",
      "left",
      "left",
      "right",
      "right",
      "center",
    ];

    const oHeaders = ["ORDER & TIME", "CUSTOMER", "TYPE", "ITEMS SUMMARY", "PAYMENTS", "TOTAL", "PAID / DUE", "STATUS"];

    const oRows = data.orders.map((o: any) => {
      // Order No & Time / User
      const orderCell = [o.orderNo, `${o.timeStr} • ${o.userName}`];

      // Customer & Phone
      const customerCell = [o.customerName, o.customerPhone && o.customerPhone !== "-" ? o.customerPhone : ""];

      // Type
      const typeCell = o.orderType || "PURCHASE";

      // Items summary
      const firstItemName = o.items[0]?.productCode 
        ? `[${o.items[0].productCode}] ${o.items[0].productName}`
        : o.items[0]?.productName || "Product";
      const itemsCell =
        o.items.length === 0
          ? ["No items"]
          : o.items.length === 1
          ? [`${firstItemName} ×${o.items[0].quantity}`]
          : [`${firstItemName} ×${o.items[0].quantity}`, `+${o.items.length - 1} more item(s)`];

      // Payments split
      const paymentsCell =
        o.payments.length === 0
          ? ["-"]
          : o.payments.map((p: any) => `${p.paymentMode}: ${formatCurrency(p.amount)}`);

      // Total
      const totalCell = formatCurrency(o.totalAmount);

      // Paid / Due
      const paidDueCell =
        o.dueAmount > 0
          ? [formatCurrency(o.paidAmount), `Due: ${formatCurrency(o.dueAmount)}`]
          : [formatCurrency(o.paidAmount)];

      // Status
      const statusCell = o.status;

      return [orderCell, customerCell, typeCell, itemsCell, paymentsCell, totalCell, paidDueCell, statusCell];
    });

    const oFooter = [
      "TOTALS",
      "",
      "",
      "",
      "",
      formatCurrency(data.financials.totalSales),
      `${formatCurrency(data.financials.totalCollected)}${data.financials.totalDuesCreated > 0 ? ` (Due: ${formatCurrency(data.financials.totalDuesCreated)})` : ""}`,
      `${data.orders.length} Orders`,
    ];

    y = drawDynamicTable(
      doc,
      oHeaders,
      oRows,
      y,
      oCols,
      { isA5, leftMargin, pageHeight, setFont, drawLine },
      oAlignments,
      oFooter
    );
    y += 4;
  }

  // 5. Verification & Signature Block
  if (y + 20 > pageHeight - 16) {
    doc.addPage();
    y = isA5 ? 12 : 16;
  }

  y = drawLine(y);
  setFont("normal", isA5 ? 7.5 : 8.5, GRAY_MUTED);
  doc.text("Counter Staff Signature: _______________________", leftMargin, y + 5);
  doc.save(
    isRange
      ? `dahotre-settlement-${targetDateFrom}-to-${targetDateTo}.pdf`
      : `dahotre-eod-settlement-${targetDateFrom}.pdf`
  );
}

