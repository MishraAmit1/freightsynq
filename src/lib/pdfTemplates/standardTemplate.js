// lib/pdfTemplates/standardTemplate.js - CLEAN MATCHING LIVE PREVIEW
import {
  hexToRgb,
  parseCargoAndMaterials,
  formatDate,
  applyTextColor,
  resetTextColor,
} from "./helpers";

export const generateStandardLR = (doc, booking, template, company) => {
  try {
    console.log("🔄 Generating Clean Standard LR matching Live Preview...");

    const pageWidth = doc.internal.pageSize.getWidth(); // 297mm
    const pageHeight = doc.internal.pageSize.getHeight(); // 210mm

    // Get customization settings
    const primaryColor = template?.style_config?.primary_color || "#000000";
    const secondaryColor = template?.style_config?.secondary_color || "#666666";
    const fontSize = 9;
    const fontFamily =
      template?.style_config?.font_family?.toLowerCase() || "helvetica";

    // Convert colors
    const primaryRgb = hexToRgb(primaryColor);

    // Light border only
    doc.setLineWidth(0.5);
    doc.setDrawColor(200, 200, 200);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // HEADER SECTION - CLEAN STYLE
    let headerY = 20;
    const showLogo = template?.header_config?.show_logo;
    const logoUrl = template?.header_config?.logo_url;
    const logoPosition = template?.header_config?.logo_position || "left";

    // Initialize consignment position
    let consignmentX = pageWidth - 60;
    let consignmentAlign = "left";

    // LEFT SECTION - Logo or Consignment
    if (showLogo && logoUrl && logoPosition === "left") {
      try {
        doc.addImage(logoUrl, "PNG", 15, 15, 20, 15);
        console.log("✅ Logo added at left position");
      } catch (e) {
        console.error("❌ Logo error:", e);
        try {
          doc.addImage(logoUrl, "JPEG", 15, 15, 20, 15);
        } catch (e2) {
          console.error("❌ Logo JPEG error:", e2);
        }
      }
    } else if (logoPosition === "right") {
      // If logo is right, consignment goes left
      consignmentX = 15;
    }

    // CENTER - Company Details
    let centerY = headerY;

    // Center logo if position is center
    if (showLogo && logoUrl && logoPosition === "center") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth / 2 - 10, 12, 20, 15);
        centerY = 30;
        console.log("✅ Logo added at center position");
      } catch (e) {
        console.error("❌ Logo center error:", e);
      }
    }

    doc.setFontSize(14);
    doc.setFont(fontFamily, "bold");
    applyTextColor(doc, primaryColor);
    doc.text(company?.name || "VRL LOGISTICS LTD.", pageWidth / 2, centerY, {
      align: "center",
    });

    doc.setFontSize(8);
    doc.setFont(fontFamily, "normal");
    resetTextColor(doc);

    if (template?.header_config?.show_address) {
      doc.text(
        `Office: ${company?.address || "Varur, Hubballi-580 030"}`,
        pageWidth / 2,
        centerY + 5,
        { align: "center" }
      );
    }

    doc.text(
      `Email: ${company?.email || "info@vrllogistics.com"} | Mobile: ${
        company?.phone || "1800-123-4567"
      }`,
      pageWidth / 2,
      centerY + 9,
      { align: "center" }
    );

    // RIGHT SECTION - Logo or Consignment
    if (showLogo && logoUrl && logoPosition === "right") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth - 35, 15, 20, 15);
        consignmentX = 15;
        console.log("✅ Logo added at right position");
      } catch (e) {
        console.error("❌ Logo right error:", e);
      }
    }

    // Consignment Details (position based on logo)
    doc.setFontSize(8);
    doc.setFont(fontFamily, "bold");
    doc.text("Consignment No.", consignmentX, headerY);
    doc.setFontSize(11);
    applyTextColor(doc, primaryColor);
    doc.text(
      booking?.lr_number || booking?.booking_id || "LR2024123456",
      consignmentX,
      headerY + 5
    );
    doc.setFontSize(7);
    resetTextColor(doc);
    doc.text(formatDate(booking?.lr_date), consignmentX, headerY + 9);

    // Simple line under header
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(10, 33, pageWidth - 10, 33);

    // SUB-HEADER ROW - Clean boxes
    let yPos = 37;
    const colWidth = (pageWidth - 20) / 3;

    // Draw clean boxes with light borders
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);

    // Column 1
    doc.rect(10, yPos, colWidth, 10);
    doc.setFontSize(8);
    doc.setFont(fontFamily, "bold");
    doc.text("At OWNER'S risk", 12, yPos + 4);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    doc.text("Subject to Vapi Jurisdiction", 12, yPos + 8);

    // Column 2 - Vehicle No
    doc.rect(10 + colWidth, yPos, colWidth, 10);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("Vehicle No.", 10 + colWidth + colWidth / 2, yPos + 4, {
      align: "center",
    });
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.vehicle_number || "KA-25-AB-1234",
      10 + colWidth + colWidth / 2,
      yPos + 8,
      { align: "center" }
    );

    // Column 3 - GSTIN
    doc.rect(10 + 2 * colWidth, yPos, colWidth, 10);
    doc.setFont(fontFamily, "bold");
    doc.text("GSTIN", 10 + 2 * colWidth + colWidth / 2, yPos + 4, {
      align: "center",
    });
    doc.setFont(fontFamily, "normal");
    doc.text(
      company?.gst_number || "29AABCV1234M1Z5",
      10 + 2 * colWidth + colWidth / 2,
      yPos + 8,
      { align: "center" }
    );

    yPos += 13;

    // CONSIGNOR & CONSIGNEE - Clean style
    const halfWidth = (pageWidth - 25) / 2;

    // Consignor - Light background header
    if (template?.visible_fields?.consignor !== false) {
      doc.setLineWidth(0.3);
      doc.setDrawColor(150, 150, 150);
      doc.rect(10, yPos, halfWidth, 22);

      // Light gray header
      doc.setFillColor(245, 245, 245);
      doc.rect(10, yPos, halfWidth, 5, "F");

      doc.setFont(fontFamily, "bold");
      doc.setFontSize(8);
      doc.text("CONSIGNOR", 12, yPos + 3.5);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let consY = yPos + 7;
      doc.text(
        booking?.consignor?.name ||
          booking?.consignor_name ||
          "ABC Electronics Pvt Ltd",
        12,
        consY
      );
      consY += 3;
      if (booking?.consignor?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignor.address,
          halfWidth - 5
        );
        doc.text(addressLines[0] || "", 12, consY);
        consY += 3;
      }
      doc.text(
        `GST: ${booking?.consignor?.gst_number || "27AAAAA0000A1Z5"}`,
        12,
        consY
      );
      consY += 3;
      doc.text(
        `Mobile: ${booking?.consignor?.phone || "9876543210"}`,
        12,
        consY
      );
    }

    // Consignee
    if (template?.visible_fields?.consignee !== false) {
      doc.rect(15 + halfWidth, yPos, halfWidth, 22);
      doc.setFillColor(245, 245, 245);
      doc.rect(15 + halfWidth, yPos, halfWidth, 5, "F");

      doc.setFont(fontFamily, "bold");
      doc.setFontSize(8);
      doc.text("CONSIGNEE", 17 + halfWidth, yPos + 3.5);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let conseeY = yPos + 7;
      doc.text(
        booking?.consignee?.name ||
          booking?.consignee_name ||
          "XYZ Trading Company",
        17 + halfWidth,
        conseeY
      );
      conseeY += 3;
      if (booking?.consignee?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignee.address,
          halfWidth - 5
        );
        doc.text(addressLines[0] || "", 17 + halfWidth, conseeY);
        conseeY += 3;
      }
      doc.text(
        `GST: ${booking?.consignee?.gst_number || "06BBBBB1111B1Z5"}`,
        17 + halfWidth,
        conseeY
      );
      conseeY += 3;
      doc.text(
        `Mobile: ${booking?.consignee?.phone || "9876543211"}`,
        17 + halfWidth,
        conseeY
      );
    }

    yPos += 25;

    // FROM & TO - Clean boxes
    doc.rect(10, yPos, halfWidth, 8);
    doc.rect(15 + halfWidth, yPos, halfWidth, 8);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("FROM: ", 12, yPos + 5);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.from_location || "Mumbai, Maharashtra", 26, yPos + 5);

    doc.setFont(fontFamily, "bold");
    doc.text("TO: ", 17 + halfWidth, yPos + 5);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.to_location || "Gurgaon, Haryana",
      27 + halfWidth,
      yPos + 5
    );

    yPos += 11;

    // MAIN CONTENT - Clean table style
    // LEFT - Goods Description
    doc.rect(10, yPos, halfWidth, 55);
    doc.setFillColor(245, 245, 245);
    doc.rect(10, yPos, halfWidth, 5, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("GOODS DESCRIPTION", 10 + halfWidth / 2, yPos + 3.5, {
      align: "center",
    });

    // Table with light lines
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(10, yPos + 5, 10 + halfWidth, yPos + 5);
    doc.line(10 + halfWidth / 2, yPos + 5, 10 + halfWidth / 2, yPos + 55);

    doc.setFontSize(7);
    doc.setFont(fontFamily, "bold");
    doc.text("Packages", 12, yPos + 8);
    doc.text("Item Description", 12 + halfWidth / 2, yPos + 8);

    // Table content
    const cargoData = parseCargoAndMaterials(
      booking?.cargo_units,
      booking?.material_description
    );
    let tableY = yPos + 11;
    doc.setFont(fontFamily, "normal");

    cargoData.slice(0, 7).forEach((row) => {
      doc.text(row.cargo || "", 12, tableY);
      doc.text(row.material || "", 12 + halfWidth / 2, tableY);
      tableY += 5;
    });

    // RIGHT - Billing Details
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
    let billY = yPos + 9;
    const billX = 17 + halfWidth;
    const billEndX = 10 + pageWidth - 25;

    const freight = parseFloat(booking?.freight_charges || 15000);
    const others = 500;
    const total = freight + others;
    const value = 50000;
    const grandTotal = value + total;

    doc.text("DATE:", billX, billY);
    doc.text(formatDate(booking?.lr_date), billEndX, billY, { align: "right" });
    billY += 5;

    doc.text("VALUE:", billX, billY);
    doc.text(`₹ ${value.toLocaleString("en-IN")}`, billEndX, billY, {
      align: "right",
    });
    billY += 5;

    doc.text("BILLING STATION:", billX, billY);
    doc.text("Mumbai", billEndX, billY, { align: "right" });
    billY += 5;

    doc.text("Tpt. Bill No:", billX, billY);
    doc.text("TB2024001", billEndX, billY, { align: "right" });
    billY += 5;

    doc.text("Others:", billX, billY);
    doc.text(`₹ ${others}`, billEndX, billY, { align: "right" });
    billY += 5;

    // Light line
    doc.setDrawColor(200, 200, 200);
    doc.line(billX, billY, billEndX, billY);
    billY += 3;

    doc.text("Freight:", billX, billY);
    doc.text(`₹ ${freight.toLocaleString("en-IN")}`, billEndX, billY, {
      align: "right",
    });
    billY += 5;

    doc.text("Total Rs:", billX, billY);
    doc.text(`₹ ${total.toLocaleString("en-IN")}`, billEndX, billY, {
      align: "right",
    });
    billY += 5;

    // Final line
    doc.setDrawColor(150, 150, 150);
    doc.line(billX, billY, billEndX, billY);
    billY += 3;

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("Grand Total:", billX, billY);
    doc.text(`₹ ${grandTotal.toLocaleString("en-IN")}`, billEndX, billY, {
      align: "right",
    });

    // FOOTER - Clean style
    const footerY = pageHeight - 32;
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.line(10, footerY, pageWidth - 10, footerY);

    // Terms
    if (template?.footer_config?.show_terms) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      doc.text(
        template?.footer_config?.terms_text ||
          "Goods once sent will not be taken back.",
        12,
        footerY + 4
      );
    }

    // Signatures - Clean style
    if (template?.footer_config?.show_signature) {
      const signatures = template?.footer_config?.signature_labels || [
        "Consignor",
        "Driver",
        "Consignee",
      ];
      const sigWidth = (pageWidth - 20) / signatures.length;
      const sigY = footerY + 10;

      signatures.forEach((label, index) => {
        const x = 10 + index * sigWidth;
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.line(x + 10, sigY, x + sigWidth - 10, sigY);
        doc.setFontSize(7);
        doc.text(label, x + sigWidth / 2, sigY + 4, { align: "center" });
      });
    }

    console.log("✅ Clean Standard LR generated successfully with logo");
  } catch (error) {
    console.error("❌ Error in generateStandardLR:", error);
    throw error;
  }
};
