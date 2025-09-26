// lib/pdfTemplates/detailedTemplate.js - FIXED NUMBER ALIGNMENT
import {
  hexToRgb,
  parseCargoAndMaterials,
  formatDate,
  applyTextColor,
  resetTextColor,
} from "./helpers";

export const generateDetailedLR = (doc, booking, template, company) => {
  try {
    console.log("🔄 Generating Detailed LR with proper alignment...");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Get customization settings
    const primaryColor = template?.style_config?.primary_color || "#000000";
    const secondaryColor = template?.style_config?.secondary_color || "#666666";
    const fontFamily =
      template?.style_config?.font_family?.toLowerCase() || "helvetica";

    // Parse cargo data
    const cargoData = parseCargoAndMaterials(
      booking?.cargo_units,
      booking?.material_description
    );

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
      company?.name?.toUpperCase() || "NATIONAL CARGO MOVERS",
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
        company?.address || "45, Transport Hub, Indore - 452001",
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
      `Phone: ${company?.phone || "0731-4567890"} | Email: ${
        company?.email || "info@nationalcargo.com"
      }`,
      12,
      yPos + 4
    );

    if (template?.header_config?.show_gst) {
      doc.text(
        `GSTIN: ${company?.gst_number || "23AAAAA0000A1Z5"}`,
        pageWidth / 2 - 15,
        yPos + 4
      );
    }
    if (template?.header_config?.show_pan) {
      doc.text(
        `PAN: ${company?.pan_number || "AAAAA0000A"}`,
        pageWidth / 2 + 15,
        yPos + 4
      );
    }

    doc.text("CIN: U63090MP2020PTC123456", pageWidth - 55, yPos + 4);

    yPos += 8;

    // DOCUMENT TITLE - Black bar
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

    // KEY DETAILS ROW - 6 columns
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
          value = booking?.lr_number || "NCM/LR/2024/1002";
          break;
        case 1:
          label = "DATE";
          value = formatDate(booking?.lr_date);
          break;
        case 2:
          label = "BOOKING ID";
          value = booking?.booking_id || "BKG-20250924-3953";
          break;
        case 3:
          label = "INVOICE NO.";
          value = booking?.invoice_number?.substring(0, 10) || "INV123456";
          break;
        case 4:
          label = "BILTI NO.";
          value = booking?.bilti_number?.substring(0, 10) || "BLT123456";
          break;
        case 5:
          label = "E-WAY BILL";
          value = booking?.eway_bill || "231000987654";
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
        booking?.consignor?.name || "ABC Electronics Pvt Ltd",
        12,
        consY
      );
      doc.setFont(fontFamily, "normal");
      consY += 3;

      if (booking?.consignor?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignor.address,
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
        `GSTIN: ${booking?.consignor?.gst_number || "27AAAAA0000A1Z5"}`,
        12,
        consY
      );
      consY += 3;
      doc.text(
        `Contact: ${booking?.consignor?.phone || "9876543210"}`,
        12,
        consY
      );
      consY += 3;
      doc.text(
        `Email: ${booking?.consignor?.email || "abc@electronics.com"}`,
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
        booking?.consignee?.name || "XYZ Trading Company",
        17 + partyWidth,
        conseeY
      );
      doc.setFont(fontFamily, "normal");
      conseeY += 3;

      if (booking?.consignee?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignee.address,
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
        `GSTIN: ${booking?.consignee?.gst_number || "06BBBBB1111B1Z5"}`,
        17 + partyWidth,
        conseeY
      );
      conseeY += 3;
      doc.text(
        `Contact: ${booking?.consignee?.phone || "9876543211"}`,
        17 + partyWidth,
        conseeY
      );
      conseeY += 3;
      doc.text(
        `Email: ${booking?.consignee?.email || "xyz@trading.com"}`,
        17 + partyWidth,
        conseeY
      );
    }

    yPos += 28;

    // ROUTE & VEHICLE DETAILS - Blue background
    doc.setFillColor(219, 234, 254);
    doc.rect(10, yPos, pageWidth - 20, 12, "F");
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 12);

    doc.setFontSize(7);
    const routeColWidth = (pageWidth - 20) / 4;

    // Row 1
    doc.setFont(fontFamily, "bold");
    doc.text("From:", 12, yPos + 4);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.from_location?.split(",")[0] || "Mumbai", 22, yPos + 4);

    doc.setFont(fontFamily, "bold");
    doc.text("To:", 12 + routeColWidth, yPos + 4);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.to_location?.split(",")[0] || "Gurgaon",
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

    // Row 2
    doc.setFont(fontFamily, "bold");
    doc.text("Vehicle:", 12, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.vehicle_number || "MH-12-AB-1234", 26, yPos + 8);

    doc.setFont(fontFamily, "bold");
    doc.text("Type:", 12 + routeColWidth, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text("32 FT", 22 + routeColWidth, yPos + 8);

    doc.setFont(fontFamily, "bold");
    doc.text("Driver:", 12 + 2 * routeColWidth, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.driver_name || "Ramesh",
      26 + 2 * routeColWidth,
      yPos + 8
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Mobile:", 12 + 3 * routeColWidth, yPos + 8);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.driver_phone || "9998887776",
      27 + 3 * routeColWidth,
      yPos + 8
    );

    yPos += 14;

    // GOODS TABLE
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 28);

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
    const col3 = 60;
    const col4 = 130;
    const col5 = 150;
    const col6 = 170;

    doc.text("S.No", col1, yPos + 3.5);
    doc.text("Packages", col2, yPos + 3.5);
    doc.text("Description", col3, yPos + 3.5);
    doc.text("Weight", col4, yPos + 3.5);
    doc.text("Volume", col5, yPos + 3.5);
    doc.text("Value", col6, yPos + 3.5);

    yPos += 5;
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);

    let tableY = yPos + 3;
    cargoData.slice(0, 3).forEach((row, index) => {
      doc.text((index + 1).toString(), col1, tableY);
      doc.text(row.cargo || "-", col2, tableY);
      const descLines = doc.splitTextToSize(row.material || "-", 65);
      doc.text(descLines[0] || "-", col3, tableY);
      doc.text("-", col4 + 3, tableY);
      doc.text("-", col5 + 3, tableY);
      doc.text("-", col6 + 3, tableY);
      tableY += 4;
    });

    // Total row
    doc.setLineWidth(0.3);
    doc.line(10, yPos + 13, pageWidth - 10, yPos + 13);
    doc.setFont(fontFamily, "bold");
    doc.setFillColor(250, 250, 250);
    doc.rect(10, yPos + 13, pageWidth - 20, 5, "F");

    doc.text("TOTAL:", col3 - 5, yPos + 16.5);
    doc.text(booking?.weight || "750", col4 + 3, yPos + 16.5);
    doc.text("-", col5 + 3, yPos + 16.5);
    doc.text(booking?.cargo_value || "75,000", col6 + 3, yPos + 16.5);

    yPos += 30;

    // CHARGES BREAKDOWN - ORIGINAL WIDTH WITH FIXED ALIGNMENT
    const chargeWidth = (pageWidth - 25) / 2;

    // Left - Service Details
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, chargeWidth, 28);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("SERVICE DETAILS", 12, yPos + 4);

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let serviceY = yPos + 8;

    const serviceDetails = [
      ["Service Type:", booking?.service_type || "FTL"],
      [
        "Pickup Date:",
        booking?.pickup_date ? formatDate(booking.pickup_date) : "-",
      ],
      ["Delivery Type:", "Door to Door"],
      ["Insurance:", "Carrier Risk"],
      ["POD Required:", "Yes"],
    ];

    serviceDetails.forEach(([label, value]) => {
      doc.text(label, 12, serviceY);
      doc.text(value, 45, serviceY);
      serviceY += 4;
    });

    // Right - Charges (FIXED ALIGNMENT)
    doc.rect(15 + chargeWidth, yPos, chargeWidth, 28);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("FREIGHT CHARGES", 17 + chargeWidth, yPos + 4);

    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let chargeY = yPos + 8;

    const freight = booking?.freight_charges || 15000;
    const subTotal = freight + 1000;
    const cgst = subTotal * 0.025;
    const sgst = subTotal * 0.025;
    const grandTotal = subTotal + cgst + sgst;

    // FIXED: Right edge of the charges box (with margin)
    const rightEdge = 15 + chargeWidth + chargeWidth - 10; // 5 point margin from edge

    doc.text("Basic Freight:", 17 + chargeWidth, chargeY);
    doc.text(`₹ ${freight.toLocaleString("en-IN")}`, rightEdge, chargeY, {
      align: "right",
    });
    chargeY += 3;

    doc.text("Other Charges:", 17 + chargeWidth, chargeY);
    doc.text("₹ 1,000", rightEdge, chargeY, { align: "right" });
    chargeY += 3;

    doc.line(17 + chargeWidth, chargeY, rightEdge, chargeY);
    chargeY += 2;

    doc.text("Sub Total:", 17 + chargeWidth, chargeY);
    doc.text(`₹ ${subTotal.toLocaleString("en-IN")}`, rightEdge, chargeY, {
      align: "right",
    });
    chargeY += 3;

    doc.text("CGST @ 2.5%:", 17 + chargeWidth, chargeY);
    doc.text(`₹ ${cgst.toFixed(2)}`, rightEdge, chargeY, { align: "right" });
    chargeY += 3;

    doc.text("SGST @ 2.5%:", 17 + chargeWidth, chargeY);
    doc.text(`₹ ${sgst.toFixed(2)}`, rightEdge, chargeY, { align: "right" });
    chargeY += 3;

    doc.line(17 + chargeWidth, chargeY, rightEdge, chargeY);
    chargeY += 2;

    doc.setFont(fontFamily, "bold");
    doc.text("GRAND TOTAL:", 17 + chargeWidth, chargeY);
    doc.text(
      `₹ ${grandTotal.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      rightEdge,
      chargeY,
      { align: "right" }
    );

    yPos += 30;

    // PAYMENT & STATUS - Yellow background
    doc.setFillColor(254, 249, 195);
    doc.rect(10, yPos, pageWidth - 20, 8, "F");
    doc.setDrawColor(252, 211, 77);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 8);

    doc.setFontSize(7);
    const statusColWidth = (pageWidth - 20) / 4;

    doc.setFont(fontFamily, "bold");
    doc.text("Payment:", 12, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.payment_mode || "TO PAY", 12, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Status:", 12 + statusColWidth, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.status || "CONFIRMED", 12 + statusColWidth, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Remarks:", 12 + 2 * statusColWidth, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text("Handle with Care", 12 + 2 * statusColWidth, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("OTP:", 12 + 3 * statusColWidth, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      Math.floor(1000 + Math.random() * 9000).toString(),
      12 + 3 * statusColWidth,
      yPos + 6
    );

    yPos += 10;

    // TERMS & CONDITIONS
    if (template?.footer_config?.show_terms && yPos < pageHeight - 40) {
      doc.setDrawColor(150, 150, 150);
      doc.setLineWidth(0.3);
      doc.rect(10, yPos, pageWidth - 20, 14);

      doc.setFont(fontFamily, "bold");
      doc.setFontSize(8);
      doc.text("TERMS & CONDITIONS:", 12, yPos + 4);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(6);
      const terms = [
        "1. " +
          (template?.footer_config?.terms_text ||
            "Goods once booked will not be cancelled."),
        "2. Delivery subject to force majeure conditions.",
        "3. Freight charges to be paid as per payment terms.",
        "4. Company not responsible for natural calamities.",
      ];

      let termY = yPos + 7;
      terms.slice(0, 2).forEach((term) => {
        const termLines = doc.splitTextToSize(term, pageWidth - 25);
        doc.text(termLines[0], 12, termY);
        termY += 3;
      });

      yPos += 16;
    }

    // SIGNATURES - 5 columns
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
      "This is a system generated document valid for 3 days from the date of generation",
      pageWidth / 2,
      pageHeight - 17,
      { align: "center" }
    );
    doc.text(
      "For tracking visit: www.nationalcargo.com | Customer Care: 1800-123-4567",
      pageWidth / 2,
      pageHeight - 14,
      { align: "center" }
    );

    console.log("✅ Detailed LR generated with fixed alignment");
  } catch (error) {
    console.error("❌ Error in generateDetailedLR:", error);
    throw error;
  }
};
