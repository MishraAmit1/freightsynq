import jsPDF from "jspdf";
import { format } from "date-fns";
import { Booking } from "./mockData";

/**
 * A landscape A4 Lorry Receipt styled to match the supplied Bansal Logistics template.
 * Measurements in mm. Tweak positions/sizes if you want pixel-perfect adjustments.
 */
export const generateLRPDF = (booking: Booking) => {
  // Create landscape A4
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 297
  const pageHeight = doc.internal.pageSize.getHeight(); // 210

  // Outer margins and geometry
  const margin = 8;
  const contentWidth = pageWidth - margin * 2;
  const contentHeight = pageHeight - margin * 2;

  // Column split
  const leftX = margin;
  const leftW = 190; // left column width (consignor/consignee + big table)
  const gapBetweenCols = 4;
  const rightX = leftX + leftW + gapBetweenCols;
  const rightW = contentWidth - leftW - gapBetweenCols;

  // Header geometry
  const headerTop = margin + 2;
  const logoW = 36;
  const logoH = 28;
  const headerHeight = Math.max(logoH + 4, 36); // keep consistent header height
  const headerBottom = margin + headerHeight;

  // Set some base text styles
  doc.setLineWidth(0.5);

  // Outer border (like the original)
  doc.rect(margin, margin, contentWidth, contentHeight, "S");

  // Left: small logo placeholder box
  const logoX = leftX + 2;
  const logoY = headerTop;
  doc.setLineWidth(0.6);
  doc.rect(logoX, logoY, logoW, logoH, "S");
  doc.setFontSize(7);
  doc.setFont("helvetica", "normal");
  doc.text("Logo", logoX + logoW / 2, logoY + logoH / 2 + 0.8, { align: "center" });

  // Center top: Company name (green-ish) and address text
  const centerX = pageWidth / 2;
  doc.setTextColor(12, 116, 21); // green
  doc.setFont("times", "italic");
  doc.setFontSize(20);
  doc.text("Bansal Logistics Of India", centerX, headerTop + 8, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text(
    "Corp. Office : \"BANSAL HOUSE\" Plot No. 1104/H, Chanod Colony, G.I.D.C., VAPI-396 195.",
    centerX,
    headerTop + 14,
    { align: "center" }
  );
  doc.setFontSize(8);
  doc.text("E-mail : bansallogistic@gmail.com  Mob.: 09377023654, 09687448444", centerX, headerTop + 18, {
    align: "center",
  });

  // Right top: Consignment Note box with big No.
  const cnW = 74;
  const cnH = 34;
  const cnX = pageWidth - margin - cnW;
  const cnY = headerTop - 1;
  doc.rect(cnX, cnY, cnW, cnH, "S");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text("Consignment Note", cnX + 4, cnY + 7);
  doc.setFontSize(18);
  doc.text((booking.lrNumber || "16159").toString(), cnX + cnW - 6, cnY + 15, { align: "right" });
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const dateText = booking.lrDate ? format(new Date(booking.lrDate), "dd/MM/yyyy") : format(new Date(), "dd/MM/yyyy");
  doc.text(`Date: ${dateText}`, cnX + 4, cnY + cnH - 8);

  // Small top-row fields under header (Vehicle No / GSTIN / Remarks area)
  const row1Y = headerBottom + 4;
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("AT OWNER'S RISK", leftX + 4, row1Y);
  doc.text("Vehicle No.:", leftX + 84, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text(booking.assignedVehicle?.vehicleNumber || "", leftX + 112, row1Y);

  doc.setFont("helvetica", "bold");
  doc.text("GSTIN :", rightX + 2, row1Y);
  doc.setFont("helvetica", "normal");
  doc.text("24AGIPB0188Q1Z6", rightX + 17, row1Y);

  // Remarks label aligned near right column space
  doc.setFont("helvetica", "bold");
  doc.text("Remarks", rightX + 2, row1Y + 6);

  // Horizontal separator
  doc.setLineWidth(0.3);
  doc.line(leftX + 1, row1Y + 8, pageWidth - margin - 1, row1Y + 8);

  // CONSIGNOR / CONSIGNEE block (left column)
  let y = row1Y + 12;
  const nameBoxHeight = 18;
  doc.setLineWidth(0.35);
  // Consignor box
  doc.rect(leftX + 1, y, leftW - 2, nameBoxHeight, "S");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Consignor :", leftX + 4, y + 6);
  doc.setFont("helvetica", "normal");
  const consignorLines = doc.splitTextToSize(booking.consignorName || booking.consignor || " ", leftW - 28);
  doc.text(consignorLines, leftX + 28, y + 6);
  y += nameBoxHeight;

  // Consignee box
  doc.rect(leftX + 1, y, leftW - 2, nameBoxHeight, "S");
  doc.setFont("helvetica", "bold");
  doc.text("Consignee :", leftX + 4, y + 6);
  doc.setFont("helvetica", "normal");
  const consigneeLines = doc.splitTextToSize(booking.consigneeName || booking.consignee || " ", leftW - 28);
  doc.text(consigneeLines, leftX + 28, y + 6);
  y += nameBoxHeight;

  // From / To small box
  const fromToH = 12;
  doc.rect(leftX + 1, y, leftW - 2, fromToH, "S");
  doc.setFont("helvetica", "bold");
  doc.text("From :", leftX + 4, y + 8);
  doc.setFont("helvetica", "normal");
  const fromLines = doc.splitTextToSize(booking.fromLocation || booking.origin || "", (leftW - 40) / 2);
  doc.text(fromLines, leftX + 18, y + 8);
  doc.setFont("helvetica", "bold");
  doc.text("To :", leftX + leftW / 2 + 4, y + 8);
  doc.setFont("helvetica", "normal");
  const toLines = doc.splitTextToSize(booking.toLocation || booking.destination || "", (leftW - 40) / 2);
  doc.text(toLines, leftX + leftW / 2 + 18, y + 8);

  y += fromToH + 4;

  // CONSIGNMENT DETAILS big table (left)
  const detailsY = y;
  const detailsH = 100; // main big box
  doc.rect(leftX + 1, detailsY, leftW - 2, detailsH, "S");

  // split package details vs item description
  const packageColW = 44;
  doc.setLineWidth(0.4);
  doc.line(leftX + 1 + packageColW, detailsY, leftX + 1 + packageColW, detailsY + detailsH);

  // table headers inside details
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  // left header (rotated text would be fancy; use top-left)
  doc.text("Package Details", leftX + 4, detailsY + 8);
  doc.text("Item Description", leftX + 1 + packageColW + 6, detailsY + 8);

  // Put material description into item description area (wrap)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const descX = leftX + 1 + packageColW + 6;
  const descMaxW = leftW - 2 - packageColW - 10;
  const materialLines = doc.splitTextToSize(booking.materialDescription || booking.cargo || "—", descMaxW);
  doc.text(materialLines, descX, detailsY + 14);

  // If you want, fill a few pre-formatted rows in package column (qty / dims) - example:
  const pkgTextX = leftX + 4;
  let pkgY = detailsY + 16;
  if (booking.cargoUnits !== undefined) {
    doc.text(`No. of Packages: ${booking.cargoUnits}`, pkgTextX, pkgY);
    pkgY += 6;
  } else {
    doc.text("No. of Packages:", pkgTextX, pkgY);
    pkgY += 6;
  }
  if (booking.totalWeight !== undefined) {
    doc.text(`Weight: ${booking.totalWeight} kg`, pkgTextX, pkgY);
    pkgY += 6;
  }

  // Right column: INVOICE / Charges area
  const rightTop = row1Y + 12;
  // Make the right column height match the left major content (consignor boxes + details) for visual balance
  const rightH = (detailsY + detailsH) - (row1Y + 10);
  doc.rect(rightX, rightTop, rightW - 2, rightH, "S");

  // inside right column draw small rows for invoice fields
  const rightRowH = 10;
  const rightLabels = [
    { label: "INVOICE", key: null },
    { label: "DATE", key: "invoiceDate" },
    { label: "Value", key: "value" },
    { label: "Billing Station", key: "billingStation" },
    { label: "Tpt. Bill No.", key: "tptBillNo" },
    { label: "Dt.", key: "tptBillDate" },
    { label: "Others", key: "others" },
    { label: "Freight", key: "freight" },
    { label: "Total (Rs.)", key: "total" },
  ];

  let rx = rightX + 2;
  let ry = rightTop + 4;
  doc.setFontSize(9);
  rightLabels.forEach((rl, idx) => {
    if (idx === 0) {
      doc.setFont("helvetica", "bold");
      doc.text(rl.label, rx, ry);
      doc.setFont("helvetica", "normal");
      ry += rightRowH - 2;
      return;
    }
    // draw dividing lines between rows
    const rowTop = rightTop + (idx - 1) * rightRowH;
    doc.line(rightX, rowTop + rightRowH, rightX + rightW - 2, rowTop + rightRowH);
    doc.setFont("helvetica", "bold");
    doc.text(rl.label + " :", rx, rowTop + 7);
    doc.setFont("helvetica", "normal");
    // value mapping
    let value = "";
    switch (rl.key) {
      case "invoiceDate":
        value = booking.invoiceDate ? format(new Date(booking.invoiceDate), "dd/MM/yyyy") : "";
        break;
      case "value":
        value = booking.value ? booking.value.toString() : "";
        break;
      case "billingStation":
        value = booking.billingStation || "";
        break;
      case "tptBillNo":
        value = booking.tptBillNo || "";
        break;
      case "tptBillDate":
        value = booking.tptBillDate ? format(new Date(booking.tptBillDate), "dd/MM/yyyy") : "";
        break;
      case "others":
        value = booking.others || "";
        break;
      case "freight":
        value = booking.freight ? booking.freight.toString() : "";
        break;
      case "total":
        value = booking.totalAmount ? booking.totalAmount.toString() : "";
        break;
      default:
        value = "";
    }
    // right-align values within the column
    doc.text(value, rightX + rightW - 6, rowTop + 7, { align: "right" });
    ry += rightRowH;
  });

  // Highlight GRAND TOTAL at bottom of right column
  const grandTop = rightTop + rightLabels.length * rightRowH + 2;
  // But ensure we don't overflow; draw a box near bottom
  const grandY = rightTop + rightH - 18;
  doc.setFont("helvetica", "bold");
  doc.text("GRAND TOTAL (Rs.)", rightX + 4, grandY + 6);
  doc.text(booking.totalAmount ? booking.totalAmount.toString() : "", rightX + rightW - 6, grandY + 6, { align: "right" });

  // QR-code placeholder (top-right inside page, near header)
  const qrW = 40;
  const qrX = pageWidth - margin - cnW - 8 - qrW; // left of consignment box
  const qrY = margin + 8;
  doc.rect(qrX, qrY, qrW, qrW, "S");
  doc.setFontSize(7);
  doc.text("QR CODE", qrX + qrW / 2, qrY + qrW / 2 - 2, { align: "center" });
  doc.setFontSize(6);
  doc.text(booking.bookingId || booking.lrNumber || "", qrX + qrW / 2, qrY + qrW / 2 + 6, { align: "center" });

  // Footer area: signatures and copy legend
  const footerTop = pageHeight - margin - 42;
  // small legend box (white/pink/yellow)
  const legendW = 62;
  const legendH = 22;
  doc.rect(leftX + 1, footerTop, legendW, legendH, "S");
  doc.setFontSize(7);
  doc.text("White  Consignee Copy", leftX + 4, footerTop + 6);
  doc.text("Pink   Consignor Copy", leftX + 4, footerTop + 11);
  doc.text("Yellow Billing Copy", leftX + 4, footerTop + 16);

  // Signature lines (three across bottom)
  const sigY = footerTop + 6;
  const sigLineY = footerTop + legendH + 10;
  const sigWidth = (contentWidth - 30) / 3;
  const sig1X = leftX + 12;
  const sig2X = sig1X + sigWidth + 10;
  const sig3X = sig2X + sigWidth + 10;

  doc.setLineWidth(0.4);
  doc.line(sig1X, sigLineY, sig1X + sigWidth, sigLineY);
  doc.line(sig2X, sigLineY, sig2X + sigWidth, sigLineY);
  doc.line(sig3X, sigLineY, sig3X + sigWidth, sigLineY);

  doc.setFontSize(9);
  doc.text("Signature of the Consignor", sig1X + 4, sigLineY + 6);
  doc.text("Driver Signature", sig2X + 4, sigLineY + 6);
  doc.text("Consignee Signature", sig3X + 4, sigLineY + 6);

  // For company sign / For Bansal Logistics Of India (bottom-right)
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  doc.text("For Bansal Logistics Of India", pageWidth - margin - 80, sigLineY + 6);

  // Bottom-most footer address (centered)
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  const officeLine =
    "Office : \"BANSAL HOUSE\" 206, 2nd Floor, Arihant Complex, Near Vishal Mega Mart, V.I.A. Road, G.I.D.C., VAPI-396 195.";
  const footerLines = doc.splitTextToSize(officeLine, contentWidth - 10);
  doc.text(footerLines, centerX, pageHeight - margin - 4, { align: "center" });

  // Save
  const filename = `LR_${booking.bookingId || booking.lrNumber || Date.now()}.pdf`;
  doc.save(filename);
};