// lib/pdfTemplates/gstTemplate.js - CLEANED VERSION (No Tax Calculation)
import {
  hexToRgb,
  parseCargoAndMaterials,
  formatDate,
  applyTextColor,
  resetTextColor,
} from "./helpers";

export const generateGSTInvoiceLR = (doc, booking, template, company) => {
  try {
    console.log("🔄 Generating GST Style LR (Cleaned)...");
    console.log("📦 Booking goods_items:", booking?.goods_items);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const primaryColor = template?.style_config?.primary_color || "#000000";
    const fontFamily =
      template?.style_config?.font_family?.toLowerCase() || "helvetica";

    // Main border
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // =====================================================
    // HEADER SECTION
    // =====================================================
    let yPos = 18;
    const showLogo = template?.header_config?.show_logo;
    const logoUrl = template?.header_config?.logo_url;
    const logoPosition = template?.header_config?.logo_position || "left";

    // LEFT - LR Number or Logo
    if (showLogo && logoUrl && logoPosition === "left") {
      try {
        doc.addImage(logoUrl, "PNG", 15, yPos - 3, 20, 15);
      } catch (e) {
        console.error("Logo error:", e);
      }
    } else if (logoPosition !== "left") {
      doc.setFontSize(7);
      doc.setFont(fontFamily, "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("LR Number", 15, yPos);
      doc.setFontSize(11);
      applyTextColor(doc, primaryColor);
      doc.text(booking?.lr_number || "AUTO-GEN", 15, yPos + 5);
      resetTextColor(doc);
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text(`Date: ${formatDate(booking?.lr_date)}`, 15, yPos + 9);
    }

    // CENTER - Company Details
    let companyX = pageWidth / 2;
    if (showLogo && logoUrl && logoPosition === "center") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth / 2 - 10, yPos - 5, 20, 15);
        yPos += 17;
      } catch (e) {
        console.error("Logo error:", e);
      }
    }

    doc.setFontSize(14);
    doc.setFont(fontFamily, "bold");
    applyTextColor(doc, primaryColor);
    doc.text(company?.name || "CARGO SOLUTIONS", companyX, yPos + 3, {
      align: "center",
    });

    // Subtitle box
    doc.setFillColor(240, 240, 240);
    doc.rect(companyX - 25, yPos + 5, 50, 6, "F");
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(companyX - 25, yPos + 5, 50, 6);

    doc.setFontSize(9);
    doc.setFont(fontFamily, "bold");
    resetTextColor(doc);
    doc.text("LORRY RECEIPT", companyX, yPos + 9, { align: "center" });

    if (template?.header_config?.show_address) {
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text(company?.address || "Company Address", companyX, yPos + 14, {
        align: "center",
      });
    }

    doc.setFontSize(7);
    doc.text(
      `Ph: ${company?.phone || "0000-0000000"} | Email: ${
        company?.email || "info@company.com"
      }`,
      companyX,
      yPos + 18,
      { align: "center" }
    );

    if (template?.header_config?.show_gst) {
      doc.setFont(fontFamily, "bold");
      doc.text(
        `GSTIN: ${company?.gst_number || "00AAAAA0000A1Z5"}`,
        companyX,
        yPos + 22,
        {
          align: "center",
        }
      );
    }

    // RIGHT - LR Number or Logo
    if (showLogo && logoUrl && logoPosition === "right") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth - 35, yPos - 3, 20, 15);
      } catch (e) {
        console.error("Logo error:", e);
      }
    } else if (logoPosition !== "right") {
      doc.setFontSize(7);
      doc.setFont(fontFamily, "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("LR Number", pageWidth - 50, yPos);
      doc.setFontSize(11);
      applyTextColor(doc, primaryColor);
      doc.text(booking?.lr_number || "AUTO-GEN", pageWidth - 50, yPos + 5);
      resetTextColor(doc);
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text(
        `Date: ${formatDate(booking?.lr_date)}`,
        pageWidth - 50,
        yPos + 9
      );
    }

    yPos += 26;
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(10, yPos, pageWidth - 10, yPos);
    yPos += 3;

    // =====================================================
    // DOCUMENT INFO BAR
    // =====================================================
    doc.setFillColor(219, 234, 254);
    doc.rect(10, yPos, pageWidth - 20, 8, "F");
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 8);

    doc.setFontSize(7);
    const infoSpacing = (pageWidth - 20) / 4;

    doc.setFont(fontFamily, "bold");
    doc.text("Vehicle:", 12, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.vehicle_number || "-", 12, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("E-Way Bill:", 12 + infoSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.eway_bill || "-", 12 + infoSpacing, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Weight:", 12 + 2 * infoSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(`${booking?.weight || "0"} Kg`, 12 + 2 * infoSpacing, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Invoice No:", 12 + 3 * infoSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.invoice_number || "-", 12 + 3 * infoSpacing, yPos + 6);

    yPos += 11;

    // =====================================================
    // CONSIGNOR & CONSIGNEE - Colored Headers
    // =====================================================
    const sectionWidth = (pageWidth - 25) / 2;

    // CONSIGNOR - Blue header
    if (template?.visible_fields?.consignor !== false) {
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.rect(10, yPos, sectionWidth, 28);

      doc.setFillColor(59, 130, 246);
      doc.rect(10, yPos, sectionWidth, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("CONSIGNOR", 12, yPos + 3.5);

      resetTextColor(doc);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let consY = yPos + 8;

      doc.setFont(fontFamily, "bold");
      doc.text(booking?.consignor?.name || "Consignor Name", 12, consY);
      doc.setFont(fontFamily, "normal");
      consY += 3;

      if (booking?.consignor?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignor.address,
          sectionWidth - 5
        );
        doc.text(addressLines[0] || "", 12, consY);
        consY += 3;
        if (addressLines[1]) {
          doc.text(addressLines[1], 12, consY);
          consY += 3;
        }
      }

      doc.text(`GSTIN: ${booking?.consignor?.gst_number || "N/A"}`, 12, consY);
      consY += 3;
      doc.text(`Mobile: ${booking?.consignor?.phone || "N/A"}`, 12, consY);
    }

    // CONSIGNEE - Green header
    if (template?.visible_fields?.consignee !== false) {
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.5);
      doc.rect(15 + sectionWidth, yPos, sectionWidth, 28);

      doc.setFillColor(34, 197, 94);
      doc.rect(15 + sectionWidth, yPos, sectionWidth, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("CONSIGNEE", 17 + sectionWidth, yPos + 3.5);

      resetTextColor(doc);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let conseeY = yPos + 8;

      doc.setFont(fontFamily, "bold");
      doc.text(
        booking?.consignee?.name || "Consignee Name",
        17 + sectionWidth,
        conseeY
      );
      doc.setFont(fontFamily, "normal");
      conseeY += 3;

      if (booking?.consignee?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignee.address,
          sectionWidth - 5
        );
        doc.text(addressLines[0] || "", 17 + sectionWidth, conseeY);
        conseeY += 3;
        if (addressLines[1]) {
          doc.text(addressLines[1], 17 + sectionWidth, conseeY);
          conseeY += 3;
        }
      }

      doc.text(
        `GSTIN: ${booking?.consignee?.gst_number || "N/A"}`,
        17 + sectionWidth,
        conseeY
      );
      conseeY += 3;
      doc.text(
        `Mobile: ${booking?.consignee?.phone || "N/A"}`,
        17 + sectionWidth,
        conseeY
      );
    }

    yPos += 31;

    // =====================================================
    // TRANSPORT DETAILS - Yellow background
    // =====================================================
    doc.setFillColor(254, 249, 195);
    doc.rect(10, yPos, pageWidth - 20, 8, "F");
    doc.setDrawColor(252, 211, 77);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 8);

    doc.setFontSize(7);
    const routeSpacing = (pageWidth - 20) / 4;

    doc.setFont(fontFamily, "bold");
    doc.text("From:", 12, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.from_location?.split(",")[0] || "Origin", 12, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("To:", 12 + routeSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.to_location?.split(",")[0] || "Destination",
      12 + routeSpacing,
      yPos + 6
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Driver:", 12 + 2 * routeSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.driver_name || "-", 12 + 2 * routeSpacing, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Payment:", 12 + 3 * routeSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.payment_mode || "TO PAY",
      12 + 3 * routeSpacing,
      yPos + 6
    );

    yPos += 11;

    // =====================================================
    // ✅ GOODS & BILLING - Same as Standard Template
    // =====================================================
    const halfWidth = (pageWidth - 25) / 2;

    // LEFT - Goods Description
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, halfWidth, 55);

    doc.setFillColor(245, 245, 245);
    doc.rect(10, yPos, halfWidth, 5, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("GOODS DESCRIPTION", 10 + halfWidth / 2, yPos + 3.5, {
      align: "center",
    });

    // Table header
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(10, yPos + 5, 10 + halfWidth, yPos + 5);

    const descColWidth = halfWidth * 0.65;
    doc.line(10 + descColWidth, yPos + 5, 10 + descColWidth, yPos + 55);

    doc.setFillColor(250, 250, 250);
    doc.rect(10, yPos + 5, halfWidth, 5, "F");
    doc.line(10, yPos + 10, 10 + halfWidth, yPos + 10);

    doc.setFontSize(7);
    doc.setFont(fontFamily, "bold");
    doc.text("Description", 12, yPos + 8.5);
    doc.text("Quantity", 12 + descColWidth, yPos + 8.5);

    // ✅ Get goods items
    let goodsData = [];

    if (
      booking?.goods_items &&
      Array.isArray(booking.goods_items) &&
      booking.goods_items.length > 0
    ) {
      console.log("📦 Using goods_items array");
      goodsData = booking.goods_items.map((item) => ({
        description: item.description || "",
        quantity: item.quantity || "",
      }));
    } else {
      console.log("📦 Fallback to parseCargoAndMaterials");
      const cargoData = parseCargoAndMaterials(
        booking?.cargo_units,
        booking?.material_description
      );
      goodsData = cargoData.map((row) => ({
        description: row.material || "",
        quantity: row.cargo || "",
      }));
    }

    while (goodsData.length < 5) {
      goodsData.push({ description: "", quantity: "" });
    }

    let tableY = yPos + 14;
    const rowHeight = 6;
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);

    goodsData.slice(0, 5).forEach((row, index) => {
      if (row.description && row.description.trim() !== "") {
        const maxWidth = descColWidth - 4;
        let descText = row.description;
        if (doc.getTextWidth(descText) > maxWidth) {
          descText = descText.substring(0, 40) + "...";
        }
        doc.text(descText, 12, tableY);
      }

      if (row.quantity && row.quantity.trim() !== "") {
        doc.text(row.quantity, 12 + descColWidth, tableY);
      }

      if (index < 4) {
        doc.setDrawColor(230, 230, 230);
        doc.line(10, tableY + 2, 10 + halfWidth, tableY + 2);
      }

      tableY += rowHeight;
    });

    // Weight row
    if (booking?.weight) {
      doc.setDrawColor(200, 200, 200);
      doc.line(10, yPos + 50, 10 + halfWidth, yPos + 50);
      doc.setFillColor(250, 250, 250);
      doc.rect(10, yPos + 50, halfWidth, 5, "F");
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text(`Total Weight: ${booking.weight} kg`, 12, yPos + 53.5);
    }

    // =====================================================
    // RIGHT - Billing Details (Simple - No Tax)
    // =====================================================
    doc.rect(15 + halfWidth, yPos, halfWidth, 55);
    doc.setFillColor(245, 245, 245);
    doc.rect(15 + halfWidth, yPos, halfWidth, 5, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("BILLING DETAILS", 15 + halfWidth + halfWidth / 2, yPos + 3.5, {
      align: "center",
    });

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let billY = yPos + 10;
    const billX = 17 + halfWidth;
    const billEndX = 10 + pageWidth - 27;

    const freight = parseFloat(booking?.freight_charges || 0);
    const invoiceValue = parseFloat(booking?.invoice_value || 0);

    const formatCurrency = (value) => {
      if (!value || value === 0) return "-";
      return `Rs. ${value.toLocaleString("en-IN")}`;
    };

    // Date
    doc.text("DATE:", billX, billY);
    doc.text(formatDate(booking?.lr_date), billEndX, billY, { align: "right" });
    billY += 5;

    // Invoice Number
    doc.text("Invoice No:", billX, billY);
    doc.text(booking?.invoice_number || "-", billEndX, billY, {
      align: "right",
    });
    billY += 5;

    // Invoice Value
    doc.text("Invoice Value:", billX, billY);
    doc.text(formatCurrency(invoiceValue), billEndX, billY, { align: "right" });
    billY += 5;

    // E-way Bill
    doc.text("E-way Bill:", billX, billY);
    doc.text(booking?.eway_bill || "-", billEndX, billY, { align: "right" });
    billY += 6;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(billX - 2, billY, billEndX, billY);
    billY += 4;

    // Freight
    doc.text("Freight:", billX, billY);
    doc.text(formatCurrency(freight), billEndX, billY, { align: "right" });
    billY += 5;

    // Payment Mode
    doc.text("Payment Mode:", billX, billY);
    doc.setFont(fontFamily, "bold");
    doc.text(booking?.payment_mode || "TO_PAY", billEndX, billY, {
      align: "right",
    });
    billY += 6;

    // Total line
    doc.setFont(fontFamily, "normal");
    doc.setDrawColor(150, 150, 150);
    doc.line(billX - 2, billY, billEndX, billY);
    billY += 4;

    // Total
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    const total = freight + invoiceValue;
    doc.text("TOTAL:", billX, billY);
    doc.text(formatCurrency(total), billEndX, billY, { align: "right" });

    yPos += 58;

    // =====================================================
    // DECLARATION
    // =====================================================
    if (template?.footer_config?.show_terms) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(10, yPos, pageWidth - 20, 10);

      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("DECLARATION:", 12, yPos + 4);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(6);
      const terms =
        template?.footer_config?.terms_text ||
        "Goods booked at owner's risk. Subject to terms and conditions.";
      const termsLines = doc.splitTextToSize(terms, pageWidth - 25);
      doc.text(termsLines.slice(0, 2), 12, yPos + 7);

      yPos += 13;
    }

    // =====================================================
    // SIGNATURES
    // =====================================================
    if (template?.footer_config?.show_signature && yPos < pageHeight - 25) {
      const sigY = yPos + 8;
      const signatures = ["Consignor", "Driver", "Consignee"];
      const sigWidth = (pageWidth - 20) / 3;

      doc.setLineWidth(0.3);
      signatures.forEach((label, index) => {
        const x = 10 + index * sigWidth;
        doc.line(x + 10, sigY, x + sigWidth - 10, sigY);
        doc.setFontSize(7);
        doc.setFont(fontFamily, "bold");
        doc.text(label, x + sigWidth / 2, sigY + 4, { align: "center" });
      });
    }

    // =====================================================
    // FOOTER
    // =====================================================
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Computer generated document | " + (company?.name || "Company Name"),
      pageWidth / 2,
      pageHeight - 14,
      { align: "center" }
    );

    console.log("✅ GST Style LR generated (Cleaned - No Tax Calculation)");
  } catch (error) {
    console.error("❌ Error in generateGSTInvoiceLR:", error);
    throw error;
  }
};
