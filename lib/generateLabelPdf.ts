import { jsPDF } from "jspdf";
import { Product } from "@/app/actions/products";

export type LabelPrintItem = {
  product: Product;
  variantIndex?: number;
  count: number;
};

// ---------------------------------------------------------------------------
// Unique code generator (unchanged logic)
// ---------------------------------------------------------------------------
const generateUniqueCode = (product: Product, variantIndex?: number): string => {
  const pCode = product.product_code.toUpperCase();

  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let r1 = "";
  for (let i = 0; i < 2; i++) {
    r1 += letters.charAt(Math.floor(Math.random() * letters.length));
  }

  const sp = variantIndex != null && product.variants ? product.variants[variantIndex].selling_price : product.default_selling_price;
  const cp = variantIndex != null && product.variants ? product.variants[variantIndex].cost_price : product.cost_price;

  const spStr = String(Math.floor(sp)).padStart(2, '0').slice(0, 2);
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  let rAlpha = "";
  for (let i = 0; i < 3; i++) {
    rAlpha += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const cpStr = String(Math.floor(cp)).padStart(2, '0').slice(0, 2);

  return `${pCode}${r1}${spStr}${rAlpha}${cpStr}`;
};

// ---------------------------------------------------------------------------
// Small styling helpers — everything here is designed to read cleanly with
// pure black / white / gray fills, since these labels are meant for a
// black & white printer (no color is ever load-bearing for meaning).
// ---------------------------------------------------------------------------

// Adds manual letter-spacing to short "eyebrow" labels, e.g. "PRODUCT" -> "P R O D U C T"
const tracked = (text: string): string => text.toUpperCase().split("").join(" ");

// Truncates text to fit a max width, appending an ellipsis if needed.
const fitText = (doc: jsPDF, text: string, maxWidth: number): string => {
  if (doc.getTextWidth(text) <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && doc.getTextWidth(truncated + "…") > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + "…";
};

// Small "viewfinder" corner brackets around the photo box — a print-shop /
// camera-frame detail that only needs black ink.
const drawCornerBrackets = (doc: jsPDF, x: number, y: number, w: number, h: number, len = 6) => {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.7);
  const corners: [number, number, number, number][] = [
    [x, y, 1, 1],           // top-left
    [x + w, y, -1, 1],      // top-right
    [x, y + h, 1, -1],      // bottom-left
    [x + w, y + h, -1, -1], // bottom-right
  ];
  corners.forEach(([cx, cy, dx, dy]) => {
    doc.line(cx, cy, cx + dx * len, cy);
    doc.line(cx, cy, cx, cy + dy * len);
  });
};

// A dotted "tear line" — reads as a deliberate cut/perforation guide rather
// than a plain rule, and dots print crisply on any mono printer.
const drawDottedLine = (doc: jsPDF, x1: number, x2: number, y: number, gap = 2.4, r = 0.35) => {
  doc.setFillColor(0, 0, 0);
  for (let x = x1; x <= x2; x += gap) {
    doc.circle(x, y, r, "F");
  }
};

// Small L-shaped crop/trim marks at the page corners, outside the main frame —
// a subtle "printed by a real print shop" cue.
const drawCropMarks = (doc: jsPDF, pageWidth: number, pageHeight: number, inset: number, len = 3) => {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  const pts: [number, number, number, number][] = [
    [inset, inset, 1, 1],
    [pageWidth - inset, inset, -1, 1],
    [inset, pageHeight - inset, 1, -1],
    [pageWidth - inset, pageHeight - inset, -1, -1],
  ];
  pts.forEach(([cx, cy, dx, dy]) => {
    doc.line(cx, cy, cx - dx * len, cy);
    doc.line(cx, cy, cx, cy - dy * len);
  });
};

// Placeholder artwork for products without a photo — a simple mono icon
// (frame + sun + mountain) instead of a bare "No Image" box.
const drawPlaceholderIcon = (doc: jsPDF, boxX: number, boxY: number, boxSize: number) => {
  const pad = boxSize * 0.22;
  const ix = boxX + pad;
  const iy = boxY + pad;
  const iw = boxSize - pad * 2;
  const ih = iw * 0.62;

  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.4);
  doc.roundedRect(ix, iy, iw, ih, 1.5, 1.5, "S");

  doc.setDrawColor(190, 190, 190);
  doc.circle(ix + iw * 0.28, iy + ih * 0.32, iw * 0.08, "S");

  doc.setFillColor(210, 210, 210);
  doc.triangle(
    ix + iw * 0.12, iy + ih * 0.85,
    ix + iw * 0.42, iy + ih * 0.45,
    ix + iw * 0.62, iy + ih * 0.85,
    "F"
  );
  doc.triangle(
    ix + iw * 0.5, iy + ih * 0.85,
    ix + iw * 0.72, iy + ih * 0.55,
    ix + iw * 0.92, iy + ih * 0.85,
    "F"
  );

  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(160, 160, 160);
  doc.text("No image available", boxX + boxSize / 2, boxY + boxSize - pad * 0.5, { align: "center" });
};

// ---------------------------------------------------------------------------
// Main label generator
// ---------------------------------------------------------------------------
export async function generateLabelPdf(items: LabelPrintItem[]) {
  const doc = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a5",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const loadImage = (url: string): Promise<{ imgData: string; width: number; height: number } | null> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      img.onload = () => {
        const MAX_DIM = 600;
        
        // Find the shortest dimension to make a square crop
        const minDim = Math.min(img.width, img.height);
        
        let size = minDim;
        if (size > MAX_DIM) {
          size = MAX_DIM;
        }

        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          // Calculate source x/y to crop from center
          const srcX = (img.width - minDim) / 2;
          const srcY = (img.height - minDim) / 2;
          
          ctx.drawImage(img, srcX, srcY, minDim, minDim, 0, 0, size, size);
          resolve({ imgData: canvas.toDataURL("image/jpeg", 0.9), width: size, height: size });
        } else {
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = url;
    });
  };

  // Layout constants (mm) — tuned for A5 landscape (~210 x 148)
  const OUTER_M = 6;
  const FRAME_M = 9;
  const CONTENT_M = 13;
  const IMG_X = CONTENT_M;
  const IMG_Y = 26;
  const IMG_SIZE = 68;
  const RIGHT_X = IMG_X + IMG_SIZE + 9; // ~90
  const RIGHT_EDGE = pageWidth - CONTENT_M;
  const RIGHT_W = RIGHT_EDGE - RIGHT_X;

  let pageCount = 0;
  for (const item of items) {
    const p = item.product;
    const vIdx = item.variantIndex;

    for (let c = 0; c < item.count; c++) {
      if (pageCount > 0) doc.addPage();
      pageCount++;

      // --- Crop marks + double border frame -----------------------------
      drawCropMarks(doc, pageWidth, pageHeight, 2.5);

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.3);
      doc.roundedRect(OUTER_M, OUTER_M, pageWidth - OUTER_M * 2, pageHeight - OUTER_M * 2, 2, 2, "S");
      doc.setLineWidth(0.9);
      doc.roundedRect(FRAME_M, FRAME_M, pageWidth - FRAME_M * 2, pageHeight - FRAME_M * 2, 2, 2, "S");

      // --- Header band (solid black, reversed text) ----------------------
      const headerY = FRAME_M + 4;
      const headerH = 9;
      doc.setFillColor(0, 0, 0);
      doc.rect(CONTENT_M, headerY, pageWidth - CONTENT_M * 2, headerH, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(tracked("Product Label"), CONTENT_M + 3, headerY + 6.2);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      const categoryLabel = fitText(doc, (p.category_name || "General").toUpperCase(), 60);
      doc.text(categoryLabel, pageWidth - CONTENT_M - 3, headerY + 6.2, { align: "right" });

      // --- Photo box -------------------------------------------------------
      let imgObj = null;
      if (p.photo_urls && p.photo_urls.length > 0) {
        imgObj = await loadImage(p.photo_urls[0]);
      }

      doc.setDrawColor(120, 120, 120);
      doc.setLineWidth(0.4);
      doc.rect(IMG_X, IMG_Y, IMG_SIZE, IMG_SIZE, "S");

      if (imgObj) {
        doc.addImage(imgObj.imgData, "JPEG", IMG_X, IMG_Y, IMG_SIZE, IMG_SIZE);
      } else {
        drawPlaceholderIcon(doc, IMG_X, IMG_Y, IMG_SIZE);
      }
      drawCornerBrackets(doc, IMG_X, IMG_Y, IMG_SIZE, IMG_SIZE);

      let sizeLabel = "";
      if (vIdx != null && p.variants) {
        const v = p.variants[vIdx];
        if (v.height) {
          sizeLabel = v.base ? `Height - ${v.height}ft | Base - ${v.base}ft` : `Height - ${v.height}ft`;
        } else {
          sizeLabel = v.label || "";
        }
      } else if (p.height) {
        sizeLabel = p.base ? `Height - ${p.height}ft | Base - ${p.base}ft` : `Height - ${p.height}ft`;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("Ganapati Size - __________________", IMG_X + IMG_SIZE / 2, IMG_Y + IMG_SIZE + 12, { align: "center" });
      // --- Right column: product details -----------------------------------
      let cursorY = 30;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(tracked("Product"), RIGHT_X, cursorY);

      cursorY += 9;
      let nameFontSize = 19;
      let splitName = doc.splitTextToSize(p.name, RIGHT_W);
      while (splitName.length > 2 && nameFontSize > 13) {
        nameFontSize -= 1.5;
        doc.setFontSize(nameFontSize);
        splitName = doc.splitTextToSize(p.name, RIGHT_W);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(nameFontSize);
      doc.setTextColor(0, 0, 0);
      doc.text(splitName, RIGHT_X, cursorY);
      cursorY += (splitName.length - 1) * (nameFontSize * 0.42);



      // Separator
      let sepY = cursorY + 6;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(RIGHT_X, sepY, RIGHT_EDGE, sepY);

      // Product Size
      const sizeY = sepY + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(tracked("Size"), RIGHT_X, sizeY);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      const sizeLabelDisplay = sizeLabel || "N/A";
      doc.text(fitText(doc, sizeLabelDisplay, RIGHT_W), RIGHT_X, sizeY + 11);

      // Separator
      const sep2Y = sizeY + 18;
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
      doc.line(RIGHT_X, sep2Y, RIGHT_EDGE, sep2Y);

      // Price plate (styled like an MRP tag)
      const priceLabelY = sep2Y + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(tracked("Price"), RIGHT_X, priceLabelY);

      const priceBoxY = priceLabelY + 3;
      const priceBoxH = 20;
      doc.setFillColor(245, 245, 245);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.4);
      doc.roundedRect(RIGHT_X, priceBoxY, RIGHT_W, priceBoxH, 1, 1, "FD");

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(110, 110, 110);
      doc.text("M.R.P. (incl. of all taxes)", RIGHT_X + 4, priceBoxY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(0, 0, 0);
      const sp = vIdx != null && p.variants ? p.variants[vIdx].selling_price : p.default_selling_price;
      doc.text(`Rs. ${Number(sp).toFixed(2)}`, RIGHT_X + 4, priceBoxY + 16);

      // --- Bottom: dotted tear line + unique code plate ----------------------
      const dottedY = pageHeight - FRAME_M - 22;
      drawDottedLine(doc, CONTENT_M, pageWidth - CONTENT_M, dottedY);

      const codeLabelY = dottedY + 6;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(tracked("Unique Verification Code"), pageWidth / 2, codeLabelY, { align: "center" });

      const uniqueCode = generateUniqueCode(p, vIdx);
      const codeBoxW = 110;
      const codeBoxX = (pageWidth - codeBoxW) / 2;
      const codeBoxY = codeLabelY + 3;
      const codeBoxH = 12;

      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.5);
      doc.roundedRect(codeBoxX, codeBoxY, codeBoxW, codeBoxH, 1, 1, "S");

      doc.setFont("courier", "bold");
      doc.setFontSize(19);
      doc.setTextColor(0, 0, 0);
      doc.text(uniqueCode, pageWidth / 2, codeBoxY + codeBoxH / 2 + 3.2, { align: "center" });
    } // end count loop
  } // end items loop

  doc.autoPrint();
  const pdfBlobUrl = URL.createObjectURL(doc.output("blob"));
  window.open(pdfBlobUrl, "_blank");
}