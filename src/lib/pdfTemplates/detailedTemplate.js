// lib/pdfTemplates/detailedTemplate.js - WITH goods_items SUPPORT
import {
  hexToRgb,
  parseCargoAndMaterials,
  formatDate,
  applyTextColor,
  resetTextColor,
} from "./helpers";

// Helper to safely convert any value to string
const safeString = (value) => {
  if (value === null || value === undefined) return "-";
  if (typeof value === "number") return value.toLocaleString("en-IN");
  return String(value);
};

// Helper to format currency
const formatCurrency = (value) => {
  if (value === null || value === undefined) return "-";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num) || num === 0) return "-";
  return `Rs. ${num.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

export const generateDetailedLR = (doc, booking, template, company) => {
  try {
    console.log("🔄 Generating Detailed LR with goods_items...");
    console.log("📦 Booking goods_items:", booking?.goods_items);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const primaryColor = template?.style_config?.primary_color || "#000000";
    const secondaryColor = template?.style_config?.secondary_color || "#666666";
    const fontFamily =
      template?.style_config?.font_family?.toLowerCase() || "helvetica";

    // Main border
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // DETAILED HEADER
    let yPos = 16;
    const showLogo = template?.header_config?.show_logo;
    const logoUrl = template?.header_config?.logo_url;
    const logoPosition = template?.header_config?.logo_position || "left";

    // Logo positioning
    if (showLogo && logoUrl && logoPosition === "left") {
      try {
        doc.addImage(logoUrl, "PNG", 12, yPos, 18, 14);
      } catch (e) {
        console.error("Logo error:", e);
      }
    }

    // Company details center
    let companyX = pageWidth / 2;
    if (showLogo && logoUrl && logoPosition === "center") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth / 2 - 9, yPos, 18, 14);
        yPos += 15;
      } catch (e) {
        console.error("Logo error:", e);
      }
    }

    doc.setFontSize(13);
    doc.setFont(fontFamily, "bold");
    applyTextColor(doc, primaryColor);
    doc.text(
      safeString(company?.name?.toUpperCase() || "NATIONAL CARGO MOVERS"),
      companyX,
      yPos + 4,
      { align: "center" }
    );

    doc.setFontSize(9);
    doc.setFont(fontFamily, "normal");
    resetTextColor(doc);
    doc.text("LOGISTICS & SUPPLY CHAIN SOLUTIONS", companyX, yPos + 8, {
      align: "center",
    });

    if (template?.header_config?.show_address) {
      doc.setFontSize(8);
      doc.text(
        safeString(company?.address || "45, Transport Hub, Indore - 452001"),
        companyX,
        yPos + 12,
        { align: "center" }
      );
    }

    if (showLogo && logoUrl && logoPosition === "right") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth - 30, 16, 18, 14);
      } catch (e) {
        console.error("Logo error:", e);
      }
    }

    yPos += 16;

    // Contact Bar
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos, pageWidth - 20, 6, "F");
    doc.setFontSize(7);
    doc.setFont(fontFamily, "normal");
    doc.text(
      `Phone: ${safeString(
        company?.phone || "0731-4567890"
      )} | Email: ${safeString(company?.email || "info@nationalcargo.com")}`,
      12,
      yPos + 4
    );

    if (template?.header_config?.show_gst) {
      doc.text(
        `GSTIN: ${safeString(company?.gst_number || "23AAAAA0000A1Z5")}`,
        pageWidth / 2 - 15,
        yPos + 4
      );
    }
    if (template?.header_config?.show_pan) {
      doc.text(
        `PAN: ${safeString(company?.pan_number || "AAAAA0000A")}`,
        pageWidth / 2 + 15,
        yPos + 4
      );
    }

    doc.text("CIN: U63090MP2020PTC123456", pageWidth - 55, yPos + 4);

    yPos += 8;

    // DOCUMENT TITLE
    doc.setFillColor(0, 0, 0);
    doc.rect(10, yPos, pageWidth - 20, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(10);
    doc.text("CONSIGNMENT NOTE / LORRY RECEIPT", pageWidth / 2, yPos + 4, {
      align: "center",
    });
    resetTextColor(doc);

    yPos += 8;

    // KEY DETAILS ROW
    const colWidth = (pageWidth - 20) / 6;
    doc.setFontSize(7);

    for (let i = 0; i < 6; i++) {
      const x = 10 + i * colWidth;
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(x, yPos, colWidth, 10);

      doc.setFont(fontFamily, "bold");
      doc.setTextColor(100, 100, 100);

      let label, value;
      switch (i) {
        case 0:
          label = "LR NO.";
          value = safeString(booking?.lr_number || "NCM/LR/2024/1002");
          break;
        case 1:
          label = "DATE";
          value = safeString(formatDate(booking?.lr_date));
          break;
        case 2:
          label = "BOOKING ID";
          value = safeString(booking?.booking_id || "BKG-20250924-3953");
          break;
        case 3:
          label = "INVOICE NO.";
          value = safeString(booking?.invoice_number || "INV123456").substring(
            0,
            10
          );
          break;
        case 4:
          label = "INVOICE VALUE";
          value = formatCurrency(booking?.invoice_value);
          break;
        case 5:
          label = "E-WAY BILL";
          value = safeString(booking?.eway_bill || "231000987654");
          break;
      }

      doc.setFontSize(6);
      doc.text(label, x + 1, yPos + 3);
      resetTextColor(doc);
      doc.setFont(fontFamily, i === 0 ? "bold" : "normal");
      doc.setFontSize(7);
      if (i === 0) applyTextColor(doc, primaryColor);

      const valueLines = doc.splitTextToSize(value, colWidth - 2);
      doc.text(valueLines[0] || value, x + 1, yPos + 7);
      if (i === 0) resetTextColor(doc);
    }

    yPos += 12;

    // PARTIES SECTION
    const partyWidth = (pageWidth - 25) / 2;

    // CONSIGNOR
    if (template?.visible_fields?.consignor !== false) {
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.rect(10, yPos, partyWidth, 26);

      doc.setFillColor(220, 220, 220);
      doc.rect(10, yPos, partyWidth, 5, "F");
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(8);
      doc.text("CONSIGNOR (SENDER)", 12, yPos + 3.5);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let consY = yPos + 7;

      doc.setFont(fontFamily, "bold");
      doc.text(
        safeString(booking?.consignor?.name || "ABC Electronics Pvt Ltd"),
        12,
        consY
      );
      doc.setFont(fontFamily, "normal");
      consY += 3;

      if (booking?.consignor?.address) {
        const addressLines = doc.splitTextToSize(
          safeString(booking.consignor.address),
          partyWidth - 5
        );
        doc.text(addressLines[0] || "", 12, consY);
        consY += 3;
        if (addressLines[1]) {
          doc.text(addressLines[1], 12, consY);
          consY += 3;
        }
      } else {
        doc.text("Shop No. 15, Electronic Market", 12, consY);
        consY += 3;
        doc.text("Mumbai - 400007, Maharashtra", 12, consY);
        consY += 3;
      }

      doc.text(
        `GSTIN: ${safeString(
          booking?.consignor?.gst_number || "27AAAAA0000A1Z5"
        )}`,
        12,
        consY
      );
      consY += 3;
      doc.text(
        `Contact: ${safeString(booking?.consignor?.phone || "9876543210")}`,
        12,
        consY
      );
    }

    // CONSIGNEE
    if (template?.visible_fields?.consignee !== false) {
      doc.rect(15 + partyWidth, yPos, partyWidth, 26);

      doc.setFillColor(220, 220, 220);
      doc.rect(15 + partyWidth, yPos, partyWidth, 5, "F");
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(8);
      doc.text("CONSIGNEE (RECEIVER)", 17 + partyWidth, yPos + 3.5);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let conseeY = yPos + 7;

      doc.setFont(fontFamily, "bold");
      doc.text(
        safeString(booking?.consignee?.name || "XYZ Trading Company"),
        17 + partyWidth,
        conseeY
      );
      doc.setFont(fontFamily, "normal");
      conseeY += 3;

      if (booking?.consignee?.address) {
        const addressLines = doc.splitTextToSize(
          safeString(booking.consignee.address),
          partyWidth - 5
        );
        doc.text(addressLines[0] || "", 17 + partyWidth, conseeY);
        conseeY += 3;
        if (addressLines[1]) {
          doc.text(addressLines[1], 17 + partyWidth, conseeY);
          conseeY += 3;
        }
      } else {
        doc.text("Plot No. 25, Industrial Area", 17 + partyWidth, conseeY);
        conseeY += 3;
        doc.text("Gurgaon - 122015, Haryana", 17 + partyWidth, conseeY);
        conseeY += 3;
      }

      doc.text(
        `GSTIN: ${safeString(
          booking?.consignee?.gst_number || "06BBBBB1111B1Z5"
        )}`,
        17 + partyWidth,
        conseeY
      );
      conseeY += 3;
      doc.text(
        `Contact: ${safeString(booking?.consignee?.phone || "9876543211")}`,
        17 + partyWidth,
        conseeY
      );
    }

    yPos += 28;

    // ROUTE & VEHICLE DETAILS
    doc.setFillColor(219, 234, 254);
    doc.rect(10, yPos, pageWidth - 20, 12, "F");
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 12);

    doc.setFontSize(7);
    const routeColWidth = (pageWidth - 20) / 4;

    doc.setFont(fontFamily, "bold");
    doc.text("From:", 12, yPos + 4);
    doc.setFont(fontFamily, "normal");
    doc.text(
      safeString(booking?.from_location?.split(",")[0] || "Mumbai"),
      22,
      yPos + 4
    );

    doc.setFont(fontFamily, "bold");
    doc.text("To:", 12 + routeColWidth, yPos + 4);
    doc.setFont(fontFamily, "normal");
    doc.text(
      safeString(booking?.to_location?.split(",")[0] || "Gurgaon"),
      18 + routeColWidth,
      yPos + 4
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Distance:", 12 + 2 * routeColWidth, yPos + 4);
    doc.setFont(fontFamily, "normal");
    doc.text("1,400 KM", 28 + 2 * routeColWidth, yPos + 4);

    doc.setFont(fontFamily, "bold");
    doc.text("Transit:", 12 + 3 * routeColWidth, yPos + 4);
    doc.setFont(fontFamily, "normal");
    doc.text("3-4 Days", 26 + 3 * routeColWidth, yPos + 4);

    doc.setFont(fontFamily, "bold");
    doc.text("Vehicle:", 12, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text(
      safeString(booking?.vehicle_number || "MH-12-AB-1234"),
      26,
      yPos + 8
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Type:", 12 + routeColWidth, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text("32 FT", 22 + routeColWidth, yPos + 8);

    doc.setFont(fontFamily, "bold");
    doc.text("Driver:", 12 + 2 * routeColWidth, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text(
      safeString(booking?.driver_name || "Ramesh"),
      26 + 2 * routeColWidth,
      yPos + 8
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Mobile:", 12 + 3 * routeColWidth, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text(
      safeString(booking?.driver_phone || "9998887776"),
      27 + 3 * routeColWidth,
      yPos + 8
    );

    yPos += 14;

    // =====================================================
    // ✅ GOODS TABLE - WITH goods_items SUPPORT
    // =====================================================
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 35);

    doc.setFillColor(210, 210, 210);
    doc.rect(10, yPos, pageWidth - 20, 5, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("GOODS DESCRIPTION", pageWidth / 2, yPos + 3.5, {
      align: "center",
    });

    yPos += 5;
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos, pageWidth - 20, 5, "F");

    doc.setFontSize(7);
    doc.setFont(fontFamily, "bold");

    const col1 = 12;
    const col2 = 25;
    const col3 = 65;
    const col4 = 130;
    const col5 = 150;

    doc.text("S.No", col1, yPos + 3.5);
    doc.text("Quantity", col2, yPos + 3.5);
    doc.text("Description", col3, yPos + 3.5);
    doc.text("Weight", col4, yPos + 3.5);
    doc.text("Value", col5, yPos + 3.5);

    yPos += 5;

    // ✅ Get goods items
    let goodsData = [];

    if (
      booking?.goods_items &&
      Array.isArray(booking.goods_items) &&
      booking.goods_items.length > 0
    ) {
      console.log("📦 Using goods_items array");
      goodsData = booking.goods_items.map((item) => ({
        quantity: item.quantity || "",
        description: item.description || "",
        weight: item.weight || "",
        value: item.value || "",
      }));
    } else {
      console.log("📦 Fallback to parseCargoAndMaterials");
      const cargoData = parseCargoAndMaterials(
        booking?.cargo_units,
        booking?.material_description
      );
      goodsData = cargoData.map((row) => ({
        quantity: row.cargo || "",
        description: row.material || "",
        weight: "",
        value: "",
      }));
    }

    // Fill to 5 rows
    while (goodsData.length < 5) {
      goodsData.push({ quantity: "", description: "", weight: "", value: "" });
    }

    // Render rows
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let tableY = yPos + 3;

    goodsData.slice(0, 5).forEach((row, index) => {
      // S.No - only if has data
      if (row.description || row.quantity) {
        doc.text(String(index + 1), col1, tableY);
      }

      // Quantity
      if (row.quantity && row.quantity.trim() !== "") {
        doc.text(safeString(row.quantity), col2, tableY);
      }

      // Description
      if (row.description && row.description.trim() !== "") {
        const descLines = doc.splitTextToSize(safeString(row.description), 60);
        doc.text(descLines[0] || "", col3, tableY);
      }

      // Weight
      if (row.weight && row.weight.trim() !== "") {
        doc.text(safeString(row.weight), col4 + 3, tableY);
      }

      // Value
      if (row.value && row.value.trim() !== "") {
        doc.text(safeString(row.value), col5 + 3, tableY);
      }

      tableY += 4;
    });

    // Total row
    doc.setLineWidth(0.3);
    doc.line(10, yPos + 21, pageWidth - 10, yPos + 21);
    doc.setFont(fontFamily, "bold");
    doc.setFillColor(250, 250, 250);
    doc.rect(10, yPos + 21, pageWidth - 20, 5, "F");

    doc.text("TOTAL:", col3 - 5, yPos + 24.5);
    doc.text(safeString(booking?.weight || "0"), col4 + 3, yPos + 24.5);
    doc.text(safeString(booking?.invoice_value || "0"), col5 + 3, yPos + 24.5);

    yPos += 37;

    // CHARGES BREAKDOWN
    const chargeWidth = (pageWidth - 25) / 2;

    // Left - Service Details
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, chargeWidth, 22);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("SERVICE DETAILS", 12, yPos + 4);

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let serviceY = yPos + 8;

    doc.text("Payment Mode:", 12, serviceY);
    doc.text(safeString(booking?.payment_mode || "TO PAY"), 42, serviceY);
    serviceY += 4;

    doc.text("Invoice No:", 12, serviceY);
    doc.text(safeString(booking?.invoice_number || "-"), 42, serviceY);
    serviceY += 4;

    doc.text("Service Type:", 12, serviceY);
    doc.text(safeString(booking?.service_type || "FTL"), 42, serviceY);

    // Right - Charges
    doc.rect(15 + chargeWidth, yPos, chargeWidth, 22);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("FREIGHT CHARGES", 17 + chargeWidth, yPos + 4);

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let chargeY = yPos + 8;

    let freight = parseFloat(booking?.freight_charges || 0);
    const rightEdge = 15 + chargeWidth + chargeWidth - 8;

    doc.text("Basic Freight:", 17 + chargeWidth, chargeY);
    doc.text(formatCurrency(freight), rightEdge, chargeY, { align: "right" });
    chargeY += 4;

    doc.line(17 + chargeWidth, chargeY, rightEdge, chargeY);
    chargeY += 3;

    doc.setFont(fontFamily, "bold");
    doc.text("TOTAL:", 17 + chargeWidth, chargeY);
    doc.text(formatCurrency(freight), rightEdge, chargeY, { align: "right" });

    yPos += 24;

    // SIGNATURES
    if (template?.footer_config?.show_signature && yPos < pageHeight - 25) {
      const sigY = yPos + 8;
      const signatures = [
        "Prepared By",
        "Checked By",
        "Driver Sign",
        "Consignor",
        "Consignee",
      ];
      const sigWidth = (pageWidth - 20) / 5;

      doc.setLineWidth(0.3);
      signatures.forEach((label, index) => {
        const x = 10 + index * sigWidth;
        doc.line(x + 5, sigY, x + sigWidth - 5, sigY);
        doc.setFontSize(6);
        doc.text(label, x + sigWidth / 2, sigY + 3, { align: "center" });
      });
    }

    // FOOTER
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "This is a system generated document",
      pageWidth / 2,
      pageHeight - 14,
      { align: "center" }
    );

    console.log("✅ Detailed LR generated with goods_items");
  } catch (error) {
    console.error("❌ Error in generateDetailedLR:", error);
    throw error;
  }
};
