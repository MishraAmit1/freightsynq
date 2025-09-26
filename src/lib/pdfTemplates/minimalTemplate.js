// lib/pdfTemplates/minimalTemplate.js
import {
  hexToRgb,
  parseCargoAndMaterials,
  formatDate,
  applyTextColor,
  resetTextColor,
} from "./helpers";

export const generateMinimalLR = (doc, booking, template, company) => {
  try {
    console.log("🔄 Generating Minimal LR with booking data:", booking);

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Get customization settings
    const primaryColor = template?.style_config?.primary_color || "#000000";
    const secondaryColor = template?.style_config?.secondary_color || "#666666";
    const fontSize = 9;
    const fontFamily =
      template?.style_config?.font_family?.toLowerCase() || "helvetica";

    // Parse cargo and materials for proper table display
    const cargoData = parseCargoAndMaterials(
      booking?.cargo_units,
      booking?.material_description
    );

    // Light border
    doc.setLineWidth(0.3);
    doc.setDrawColor(150, 150, 150);
    doc.rect(10, 10, pageWidth - 20, pageHeight - 20);

    // HEADER SECTION
    let headerY = 18;
    const showLogo = template?.header_config?.show_logo;
    const logoUrl = template?.header_config?.logo_url;
    const logoPosition = template?.header_config?.logo_position || "left";

    // LEFT SECTION - LR Number
    if (showLogo && logoUrl && logoPosition === "left") {
      try {
        doc.addImage(logoUrl, "PNG", 12, 14, 18, 14);
      } catch (e) {
        console.error("Logo error:", e);
      }
    } else if (logoPosition !== "left") {
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text("LR Number", 15, headerY);
      doc.setFontSize(10);
      doc.setFont(fontFamily, "bold");
      applyTextColor(doc, primaryColor);
      doc.text(booking?.lr_number || "LR1002", 15, headerY + 4);
      resetTextColor(doc);
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text(`Date: ${formatDate(booking?.lr_date)}`, 15, headerY + 8);
    }

    // CENTER - Company Details
    let centerY = headerY;

    if (showLogo && logoUrl && logoPosition === "center") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth / 2 - 9, 12, 18, 14);
        centerY = 28;
      } catch (e) {
        console.error("Logo error:", e);
      }
    }

    doc.setFontSize(12);
    doc.setFont(fontFamily, "bold");
    applyTextColor(doc, primaryColor);
    doc.text(company?.name || "BHARAT LOGISTICS", pageWidth / 2, centerY, {
      align: "center",
    });

    doc.setFontSize(8);
    doc.setFont(fontFamily, "normal");
    resetTextColor(doc);
    doc.text("TRANSPORT RECEIPT", pageWidth / 2, centerY + 4, {
      align: "center",
    });

    if (template?.header_config?.show_address) {
      doc.setFontSize(7);
      doc.text(
        company?.address || "Station Road, Transport Nagar, Delhi-110 042",
        pageWidth / 2,
        centerY + 8,
        { align: "center" }
      );
    }

    doc.text(
      `${company?.phone || "+91-11-2345678"} | ${
        company?.email || "info@bharatlogistics.com"
      }`,
      pageWidth / 2,
      centerY + 12,
      { align: "center" }
    );

    if (template?.header_config?.show_gst) {
      doc.text(
        `GSTIN: ${company?.gst_number || "07AAAAA0000A1Z5"}`,
        pageWidth / 2,
        centerY + 16,
        { align: "center" }
      );
    }

    // RIGHT SECTION
    if (showLogo && logoUrl && logoPosition === "right") {
      try {
        doc.addImage(logoUrl, "PNG", pageWidth - 30, 14, 18, 14);
      } catch (e) {
        console.error("Logo error:", e);
      }
    } else if (logoPosition !== "right") {
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text("LR Number", pageWidth - 50, headerY);
      doc.setFontSize(10);
      doc.setFont(fontFamily, "bold");
      applyTextColor(doc, primaryColor);
      doc.text(booking?.lr_number || "LR1002", pageWidth - 50, headerY + 4);
      resetTextColor(doc);
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text(
        `Date: ${formatDate(booking?.lr_date)}`,
        pageWidth - 50,
        headerY + 8
      );
    }

    // Header bottom line
    doc.setLineWidth(0.5);
    doc.setDrawColor(0, 0, 0);
    doc.line(10, 32, pageWidth - 10, 32);

    // TRANSPORT DETAILS ROW - Using actual booking data
    let yPos = 35;
    doc.setFillColor(250, 250, 250);
    doc.rect(10, yPos, pageWidth - 20, 8, "F");

    doc.setFontSize(7);
    const detailSpacing = (pageWidth - 20) / 4;

    doc.setFont(fontFamily, "bold");
    doc.text("Service Type:", 12, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.service_type || "Surface Transport", 12, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Booking ID:", 12 + detailSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.booking_id || "BK2024001", 12 + detailSpacing, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Invoice No:", 12 + 2 * detailSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.invoice_number || "INV2024001",
      12 + 2 * detailSpacing,
      yPos + 6
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Bilti No:", 12 + 3 * detailSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.bilti_number || "BT2024001",
      12 + 3 * detailSpacing,
      yPos + 6
    );

    yPos += 11;

    // FROM-TO SECTION with actual booking data
    const halfWidth = (pageWidth - 25) / 2;

    // FROM Section
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, halfWidth, 28);

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("FROM (Origin)", 12, yPos + 4);

    if (
      template?.visible_fields?.from_location !== false &&
      booking?.from_location
    ) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      // Extract first part of from_location
      const fromParts = booking.from_location.split(",");
      doc.text(fromParts[0] || booking.from_location, 12, yPos + 8);
    }

    if (template?.visible_fields?.consignor !== false && booking?.consignor) {
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("Consignor:", 12, yPos + 13);
      doc.setFont(fontFamily, "normal");
      doc.text(
        booking.consignor.name || booking.consignor_name || "N/A",
        12,
        yPos + 17
      );

      if (booking.consignor.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignor.address,
          halfWidth - 5
        );
        doc.text(addressLines[0] || "", 12, yPos + 20);
      }

      doc.text(`GST: ${booking.consignor.gst_number || "N/A"}`, 12, yPos + 23);
      doc.text(`Ph: ${booking.consignor.phone || "N/A"}`, 12, yPos + 26);
    }

    // TO Section
    doc.rect(15 + halfWidth, yPos, halfWidth, 28);

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("TO (Destination)", 17 + halfWidth, yPos + 4);

    if (
      template?.visible_fields?.to_location !== false &&
      booking?.to_location
    ) {
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      // Extract first part of to_location
      const toParts = booking.to_location.split(",");
      doc.text(toParts[0] || booking.to_location, 17 + halfWidth, yPos + 8);
    }

    if (template?.visible_fields?.consignee !== false && booking?.consignee) {
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("Consignee:", 17 + halfWidth, yPos + 13);
      doc.setFont(fontFamily, "normal");
      doc.text(
        booking.consignee.name || booking.consignee_name || "N/A",
        17 + halfWidth,
        yPos + 17
      );

      if (booking.consignee.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignee.address,
          halfWidth - 5
        );
        doc.text(addressLines[0] || "", 17 + halfWidth, yPos + 20);
      }

      doc.text(
        `GST: ${booking.consignee.gst_number || "N/A"}`,
        17 + halfWidth,
        yPos + 23
      );
      doc.text(
        `Ph: ${booking.consignee.phone || "N/A"}`,
        17 + halfWidth,
        yPos + 26
      );
    }

    yPos += 31;

    // GOODS & CHARGES TABLE - PROPER TABLE WITH ACTUAL DATA
    doc.rect(10, yPos, pageWidth - 20, 50);

    // Table Header
    doc.setFillColor(240, 240, 240);
    doc.rect(10, yPos, pageWidth - 20, 6, "F");
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(7);

    // Column positions
    const col1 = 12;
    const col2 = 60;
    const col3 = 150;
    const col4 = 180;

    doc.text("No. of Packages", col1, yPos + 4);
    doc.text("Description of Goods", col2, yPos + 4);
    doc.text("Rate/Unit", col3, yPos + 4);
    doc.text("Amount (₹)", col4, yPos + 4);

    // Table Content - Display parsed cargo data
    doc.setFont(fontFamily, "normal");
    let tableY = yPos + 10;

    // Draw cargo data rows
    cargoData.forEach((row, index) => {
      if (index < 5) {
        // Limit to 5 rows to fit in space
        doc.text(row.cargo || "-", col1, tableY);
        doc.text(row.material || "-", col2, tableY);
        doc.text("-", col3, tableY);
        doc.text("-", col4, tableY);
        tableY += 4;
      }
    });

    // If no data, show at least one row
    if (cargoData.length === 0) {
      doc.text("-", col1, tableY);
      doc.text("-", col2, tableY);
      doc.text("-", col3, tableY);
      doc.text("-", col4, tableY);
    }

    // Charges Section - Bottom part of table
    doc.setDrawColor(100, 100, 100);
    doc.line(10, yPos + 30, pageWidth - 10, yPos + 30);

    let chargeY = yPos + 35;

    // Left side - Booking details
    doc.setFontSize(7);
    doc.text("Pickup Date:", 12, chargeY);
    doc.text(
      booking?.pickup_date ? formatDate(booking.pickup_date) : "-",
      50,
      chargeY
    );

    doc.text("Status:", 12, chargeY + 4);
    doc.setFont(fontFamily, "bold");
    doc.text(booking?.status || "DRAFT", 50, chargeY + 4);
    doc.setFont(fontFamily, "normal");

    doc.text("Payment Mode:", 12, chargeY + 8);
    doc.text(booking?.payment_mode || "TO PAY", 50, chargeY + 8);

    // Right side - Charges
    const rightX = pageWidth / 2 + 10;
    doc.text("Basic Freight:", rightX, chargeY);
    doc.text(
      `₹ ${(booking?.freight_charges || 15000).toLocaleString("en-IN")}`,
      rightX + 40,
      chargeY
    );

    doc.text("Loading/Unloading:", rightX, chargeY + 4);
    doc.text("₹ 500", rightX + 40, chargeY + 4);

    doc.text("GST @ 5%:", rightX, chargeY + 8);
    const gst = ((booking?.freight_charges || 15000) + 500) * 0.05;
    doc.text(`₹ ${gst.toFixed(2)}`, rightX + 40, chargeY + 8);

    doc.setDrawColor(100, 100, 100);
    doc.line(rightX, chargeY + 10, rightX + 60, chargeY + 10);

    doc.setFont(fontFamily, "bold");
    doc.text("Total Freight:", rightX, chargeY + 14);
    const total = (booking?.freight_charges || 15000) + 500 + gst;
    doc.text(
      `₹ ${total.toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      rightX + 40,
      chargeY + 14
    );

    yPos += 53;

    // DECLARATION & TERMS
    if (template?.footer_config?.show_terms) {
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("Declaration:", 12, yPos);
      doc.setFont(fontFamily, "normal");
      const termsText =
        template?.footer_config?.terms_text ||
        "I/We hereby declare that the said consignment does not contain any hazardous or prohibited goods. Goods booked at owner's risk.";
      const termsLines = doc.splitTextToSize(termsText, pageWidth - 25);
      doc.text(termsLines, 12, yPos + 4);
      yPos += 4 + termsLines.length * 3;
    }

    // FOOTER SIGNATURES - 4 columns
    if (template?.footer_config?.show_signature) {
      doc.setDrawColor(100, 100, 100);
      doc.setLineWidth(0.3);
      doc.line(10, yPos + 2, pageWidth - 10, yPos + 2);

      const sigY = yPos + 10;
      const signatures = [
        "Booking Clerk",
        "Driver Sign",
        "Consignor Sign",
        "Consignee Sign",
      ];
      const sigWidth = (pageWidth - 20) / 4;

      signatures.forEach((label, index) => {
        const x = 10 + index * sigWidth;
        doc.line(x + 5, sigY, x + sigWidth - 5, sigY);
        doc.setFontSize(6);
        doc.text(label, x + sigWidth / 2, sigY + 3, { align: "center" });
      });
    }

    // Bottom Note
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(
      "Subject to Delhi Jurisdiction | This is computer generated receipt",
      pageWidth / 2,
      pageHeight - 12,
      { align: "center" }
    );

    console.log("✅ Minimal LR generated successfully with booking data");
  } catch (error) {
    console.error("❌ Error in generateMinimalLR:", error);
    throw error;
  }
};
