// lib/pdfTemplates/gstTemplate.js - FIXED ALIGNMENT
import {
  hexToRgb,
  parseCargoAndMaterials,
  formatDate,
  applyTextColor,
  resetTextColor,
} from "./helpers";

export const generateGSTInvoiceLR = (doc, booking, template, company) => {
  try {
    console.log("🔄 Generating Mixed GST Invoice LR with fixed alignment...");

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

    // HEADER SECTION - Like Standard but Enhanced
    let yPos = 18;
    const showLogo = template?.header_config?.show_logo;
    const logoUrl = template?.header_config?.logo_url;
    const logoPosition = template?.header_config?.logo_position || "left";

    // LEFT SECTION
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
      doc.text("Tax Invoice No.", 15, yPos);
      doc.setFontSize(11);
      doc.setFont(fontFamily, "bold");
      applyTextColor(doc, primaryColor);
      doc.text(booking?.invoice_number || "INV/2024/001234", 15, yPos + 5);
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
    doc.text(company?.name || "RAPID CARGO SOLUTIONS", companyX, yPos + 3, {
      align: "center",
    });

    // Enhanced subtitle with background
    doc.setFillColor(240, 240, 240);
    doc.rect(companyX - 35, yPos + 5, 70, 6, "F");
    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.3);
    doc.rect(companyX - 35, yPos + 5, 70, 6);

    doc.setFontSize(9);
    doc.setFont(fontFamily, "bold");
    resetTextColor(doc);
    doc.text("TAX INVOICE / LORRY RECEIPT", companyX, yPos + 9, {
      align: "center",
    });

    if (template?.header_config?.show_address) {
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text(
        company?.address || "B-45, Logistics Complex, Noida - 201301",
        companyX,
        yPos + 14,
        { align: "center" }
      );
    }

    doc.setFontSize(7);
    doc.text(
      `Ph: ${company?.phone || "0120-4567890"} | Email: ${
        company?.email || "info@rapidcargo.com"
      }`,
      companyX,
      yPos + 18,
      { align: "center" }
    );

    if (template?.header_config?.show_gst) {
      doc.setFont(fontFamily, "bold");
      doc.text(
        `GSTIN: ${company?.gst_number || "09AAAAA0000A1Z5"}`,
        companyX,
        yPos + 22,
        { align: "center" }
      );
    }

    // RIGHT SECTION
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
      doc.text("Tax Invoice No.", pageWidth - 50, yPos, { align: "left" });
      doc.setFontSize(11);
      doc.setFont(fontFamily, "bold");
      applyTextColor(doc, primaryColor);
      doc.text(
        booking?.invoice_number || "INV/2024/001234",
        pageWidth - 50,
        yPos + 5
      );
      resetTextColor(doc);
      doc.setFontSize(7);
      doc.setFont(fontFamily, "normal");
      doc.text(
        `Date: ${formatDate(booking?.lr_date)}`,
        pageWidth - 50,
        yPos + 9
      );
    }

    // Header bottom line
    yPos += 26;
    doc.setLineWidth(0.5);
    doc.setDrawColor(100, 100, 100);
    doc.line(10, yPos, pageWidth - 10, yPos);

    yPos += 3;

    // DOCUMENT INFO BAR - Like Minimal
    doc.setFillColor(219, 234, 254); // Light blue
    doc.rect(10, yPos, pageWidth - 20, 8, "F");
    doc.setDrawColor(59, 130, 246);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 8);

    doc.setFontSize(7);
    const infoSpacing = (pageWidth - 20) / 5;

    doc.setFont(fontFamily, "bold");
    doc.text("LR No:", 12, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.lr_number || "LR2024001234", 12, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("Booking:", 12 + infoSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.booking_id || "BKG-20250924-3953",
      12 + infoSpacing,
      yPos + 6
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Vehicle:", 12 + 2 * infoSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.vehicle_number || "UP-80-AB-1234",
      12 + 2 * infoSpacing,
      yPos + 6
    );

    doc.setFont(fontFamily, "bold");
    doc.text("E-Way:", 12 + 3 * infoSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.eway_bill || "291000123456",
      12 + 3 * infoSpacing,
      yPos + 6
    );

    doc.setFont(fontFamily, "bold");
    doc.text("HSN:", 12 + 4 * infoSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text("996511", 12 + 4 * infoSpacing, yPos + 6);

    yPos += 11;

    // BILL TO / SHIP TO - Enhanced with Colors
    const sectionWidth = (pageWidth - 25) / 2;

    // BILL TO (Consignor) - Blue header
    if (template?.visible_fields?.consignor !== false) {
      doc.setDrawColor(59, 130, 246);
      doc.setLineWidth(0.5);
      doc.rect(10, yPos, sectionWidth, 28);

      // Blue header
      doc.setFillColor(59, 130, 246);
      doc.rect(10, yPos, sectionWidth, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("BILL TO (Consignor)", 12, yPos + 3.5);

      // Content
      resetTextColor(doc);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let billY = yPos + 8;

      doc.setFont(fontFamily, "bold");
      doc.text(
        booking?.consignor?.name || "ABC Electronics Pvt Ltd",
        12,
        billY
      );
      doc.setFont(fontFamily, "normal");
      billY += 3;

      if (booking?.consignor?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignor.address,
          sectionWidth - 5
        );
        doc.text(addressLines[0] || "", 12, billY);
        billY += 3;
      } else {
        doc.text("Shop No. 15, Electronic Market", 12, billY);
        billY += 3;
        doc.text("Lamington Road, Mumbai - 400007", 12, billY);
        billY += 3;
      }

      doc.setFont(fontFamily, "bold");
      doc.text("GSTIN:", 12, billY);
      doc.setFont(fontFamily, "normal");
      doc.text(booking?.consignor?.gst_number || "27AAAAA0000A1Z5", 25, billY);
      billY += 3;

      doc.setFont(fontFamily, "bold");
      doc.text("Mobile:", 12, billY);
      doc.setFont(fontFamily, "normal");
      doc.text(booking?.consignor?.phone || "9876543210", 25, billY);
      billY += 3;

      doc.setFont(fontFamily, "bold");
      doc.text("Email:", 12, billY);
      doc.setFont(fontFamily, "normal");
      doc.text(booking?.consignor?.email || "abc@electronics.com", 25, billY);
    }

    // SHIP TO (Consignee) - Green header
    if (template?.visible_fields?.consignee !== false) {
      doc.setDrawColor(34, 197, 94);
      doc.setLineWidth(0.5);
      doc.rect(15 + sectionWidth, yPos, sectionWidth, 28);

      // Green header
      doc.setFillColor(34, 197, 94);
      doc.rect(15 + sectionWidth, yPos, sectionWidth, 5, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("SHIP TO (Consignee)", 17 + sectionWidth, yPos + 3.5);

      // Content
      resetTextColor(doc);
      doc.setFont(fontFamily, "normal");
      doc.setFontSize(7);
      let shipY = yPos + 8;

      doc.setFont(fontFamily, "bold");
      doc.text(
        booking?.consignee?.name || "XYZ Trading Company",
        17 + sectionWidth,
        shipY
      );
      doc.setFont(fontFamily, "normal");
      shipY += 3;

      if (booking?.consignee?.address) {
        const addressLines = doc.splitTextToSize(
          booking.consignee.address,
          sectionWidth - 5
        );
        doc.text(addressLines[0] || "", 17 + sectionWidth, shipY);
        shipY += 3;
      } else {
        doc.text("Plot No. 25, Industrial Area", 17 + sectionWidth, shipY);
        shipY += 3;
        doc.text("Sector 18, Gurgaon - 122015", 17 + sectionWidth, shipY);
        shipY += 3;
      }

      doc.setFont(fontFamily, "bold");
      doc.text("GSTIN:", 17 + sectionWidth, shipY);
      doc.setFont(fontFamily, "normal");
      doc.text(
        booking?.consignee?.gst_number || "06BBBBB1111B1Z5",
        30 + sectionWidth,
        shipY
      );
      shipY += 3;

      doc.setFont(fontFamily, "bold");
      doc.text("Mobile:", 17 + sectionWidth, shipY);
      doc.setFont(fontFamily, "normal");
      doc.text(
        booking?.consignee?.phone || "9876543211",
        30 + sectionWidth,
        shipY
      );
      shipY += 3;

      doc.setFont(fontFamily, "bold");
      doc.text("Email:", 17 + sectionWidth, shipY);
      doc.setFont(fontFamily, "normal");
      doc.text(
        booking?.consignee?.email || "xyz@trading.com",
        30 + sectionWidth,
        shipY
      );
    }

    yPos += 31;

    // TRANSPORT & SERVICE DETAILS - Yellow background
    doc.setFillColor(254, 249, 195);
    doc.rect(10, yPos, pageWidth - 20, 12, "F");
    doc.setDrawColor(252, 211, 77);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 12);

    doc.setFontSize(7);
    const serviceSpacing = (pageWidth - 20) / 4;

    // Row 1
    doc.setFont(fontFamily, "bold");
    doc.text("Service:", 12, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text("Goods Transportation", 12, yPos + 6);

    doc.setFont(fontFamily, "bold");
    doc.text("From:", 12 + serviceSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.from_location?.split(",")[0] || "Mumbai",
      12 + serviceSpacing,
      yPos + 6
    );

    doc.setFont(fontFamily, "bold");
    doc.text("To:", 12 + 2 * serviceSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.to_location?.split(",")[0] || "Gurgaon",
      12 + 2 * serviceSpacing,
      yPos + 6
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Distance:", 12 + 3 * serviceSpacing, yPos + 3);
    doc.setFont(fontFamily, "normal");
    doc.text("1,400 KM", 12 + 3 * serviceSpacing, yPos + 6);

    // Row 2
    doc.setFont(fontFamily, "bold");
    doc.text("Driver:", 12, yPos + 9);
    doc.setFont(fontFamily, "normal");
    doc.text(booking?.driver_name || "Suresh Kumar", 12, yPos + 12);

    doc.setFont(fontFamily, "bold");
    doc.text("Mobile:", 12 + serviceSpacing, yPos + 9);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.driver_phone || "9876543210",
      12 + serviceSpacing,
      yPos + 12
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Weight:", 12 + 2 * serviceSpacing, yPos + 9);
    doc.setFont(fontFamily, "normal");
    doc.text(
      `${booking?.weight || "750"} Kg`,
      12 + 2 * serviceSpacing,
      yPos + 12
    );

    doc.setFont(fontFamily, "bold");
    doc.text("Payment:", 12 + 3 * serviceSpacing, yPos + 9);
    doc.setFont(fontFamily, "normal");
    doc.text(
      booking?.payment_mode || "TO PAY",
      12 + 3 * serviceSpacing,
      yPos + 12
    );

    yPos += 15;

    // GOODS & SERVICES TABLE - Enhanced
    doc.setDrawColor(100, 100, 100);
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, pageWidth - 20, 35);

    // Dark header
    doc.setFillColor(75, 85, 99);
    doc.rect(10, yPos, pageWidth - 20, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("GOODS TRANSPORTATION SERVICES", pageWidth / 2, yPos + 4, {
      align: "center",
    });

    // Table header
    yPos += 6;
    doc.setFillColor(220, 220, 220);
    doc.rect(10, yPos, pageWidth - 20, 5, "F");
    resetTextColor(doc);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(7);

    const col1 = 12;
    const col2 = 20;
    const col3 = 40;
    const col4 = 100;
    const col5 = 130;
    const col6 = 150;

    doc.text("S.No", col1, yPos + 3);
    doc.text("Packages", col2, yPos + 3);
    doc.text("Description", col3, yPos + 3);
    doc.text("HSN/SAC", col4, yPos + 3);
    doc.text("Qty", col5, yPos + 3);
    doc.text("Taxable Value", col6, yPos + 3);

    // Table content
    yPos += 5;
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(6);

    let tableY = yPos + 3;
    cargoData.slice(0, 3).forEach((row, index) => {
      doc.text((index + 1).toString(), col1, tableY);
      doc.text(row.cargo || "-", col2, tableY);
      doc.text(row.material || "-", col3, tableY);
      doc.text("996511", col4, tableY);
      doc.text("1", col5, tableY);
      doc.text("-", col6, tableY);
      tableY += 3;
    });

    // Service row - highlighted
    doc.setFillColor(219, 234, 254);
    doc.rect(10, tableY - 1, pageWidth - 20, 4, "F");
    doc.setFont(fontFamily, "bold");
    doc.text((cargoData.length + 1).toString(), col1, tableY);
    doc.text("Transportation", col2, tableY);
    doc.text("Goods Transportation Service", col3, tableY);
    doc.text("996511", col4, tableY);
    doc.text("1 Trip", col5, tableY);
    doc.text(
      `${(booking?.freight_charges || 18500).toLocaleString("en-IN")}.00`,
      col6,
      tableY
    );

    yPos += 37;

    // TAX CALCULATION - Side by Side (FIXED ALIGNMENT)
    const calcWidth = (pageWidth - 25) / 2;

    // Left - Additional Info
    doc.setLineWidth(0.3);
    doc.rect(10, yPos, calcWidth, 25);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    applyTextColor(doc, primaryColor);
    doc.text("ADDITIONAL INFORMATION", 12, yPos + 4);

    resetTextColor(doc);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let infoY = yPos + 8;

    doc.text(`Service Type: ${booking?.service_type || "FTL"}`, 12, infoY);
    infoY += 3;
    doc.text(
      `Pickup Date: ${
        booking?.pickup_date ? formatDate(booking.pickup_date) : "-"
      }`,
      12,
      infoY
    );
    infoY += 3;
    doc.text("Delivery Type: Door to Door", 12, infoY);
    infoY += 3;
    doc.text("Insurance: Transit Insurance", 12, infoY);
    infoY += 3;
    doc.text("Remarks: Handle with Care", 12, infoY);

    // Right - Tax Calculation (FIXED ALIGNMENT)
    const rightBoxStart = 15 + calcWidth;
    doc.rect(rightBoxStart, yPos, calcWidth, 25);
    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    applyTextColor(doc, primaryColor);
    doc.text("TAX CALCULATION", rightBoxStart + 2, yPos + 4);

    resetTextColor(doc);
    doc.setFont(fontFamily, "normal");
    doc.setFontSize(7);
    let taxY = yPos + 8;

    const taxableAmount = booking?.freight_charges || 18500;
    const cgst = taxableAmount * 0.025;
    const sgst = taxableAmount * 0.025;
    const totalAmount = taxableAmount + cgst + sgst;

    // FIXED: Proper right edge calculation
    const rightEdge = rightBoxStart + calcWidth - 5; // 5 point margin from right edge

    doc.text("Taxable Amount:", rightBoxStart + 2, taxY);
    doc.text(`₹ ${taxableAmount.toLocaleString("en-IN")}.00`, rightEdge, taxY, {
      align: "right",
    });
    taxY += 3;

    doc.text("CGST @ 2.5%:", rightBoxStart + 2, taxY);
    doc.text(`₹ ${cgst.toFixed(2)}`, rightEdge, taxY, { align: "right" });
    taxY += 3;

    doc.text("SGST @ 2.5%:", rightBoxStart + 2, taxY);
    doc.text(`₹ ${sgst.toFixed(2)}`, rightEdge, taxY, { align: "right" });
    taxY += 3;

    doc.text("Round Off:", rightBoxStart + 2, taxY);
    doc.text("₹ 0.00", rightEdge, taxY, { align: "right" });
    taxY += 3;

    doc.setLineWidth(0.5);
    doc.line(rightBoxStart + 2, taxY, rightEdge, taxY);
    taxY += 2;

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(8);
    doc.text("TOTAL AMOUNT:", rightBoxStart + 2, taxY);
    doc.text(
      `₹ ${totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`,
      rightEdge,
      taxY,
      { align: "right" }
    );

    yPos += 28;

    // DECLARATION & TERMS
    if (yPos < pageHeight - 40) {
      doc.setLineWidth(0.3);
      doc.rect(10, yPos, pageWidth - 20, 12);
      doc.setFont(fontFamily, "bold");
      doc.setFontSize(7);
      doc.text("DECLARATION & TERMS:", 12, yPos + 3);

      doc.setFont(fontFamily, "normal");
      doc.setFontSize(6);
      doc.text(
        "Declaration: We declare that this invoice shows the actual price of goods/services and all particulars are true and correct.",
        12,
        yPos + 6
      );

      if (template?.footer_config?.show_terms) {
        doc.text(
          `Terms: ${
            template?.footer_config?.terms_text ||
            "All disputes subject to local jurisdiction. Payment terms: As agreed."
          }`,
          12,
          yPos + 9
        );
      }

      yPos += 15;
    }

    // FOOTER SIGNATURES - Enhanced
    if (template?.footer_config?.show_signature && yPos < pageHeight - 25) {
      const sigY = yPos + 8;
      const signatures = [
        "Customer Signature",
        "Driver Signature",
        "Authorized Signatory",
      ];
      const sigWidth = (pageWidth - 20) / 3;

      doc.setLineWidth(0.5);
      signatures.forEach((label, index) => {
        const x = 10 + index * sigWidth;
        doc.line(x + 10, sigY, x + sigWidth - 10, sigY);
        doc.setFontSize(7);
        doc.setFont(fontFamily, "bold");
        doc.text(label, x + sigWidth / 2, sigY + 4, { align: "center" });
        doc.setFont(fontFamily, "normal");
        doc.setFontSize(6);
        if (index === 2) {
          doc.text(
            `For ${company?.name || "RAPID CARGO SOLUTIONS"}`,
            x + sigWidth / 2,
            sigY + 8,
            { align: "center" }
          );
        } else {
          doc.text("Date: ___________", x + sigWidth / 2, sigY + 8, {
            align: "center",
          });
        }
      });
    }

    // BOTTOM NOTE
    doc.setFontSize(6);
    doc.setTextColor(100, 100, 100);
    doc.text(
      `This is a computer generated Tax Invoice | Subject to jurisdiction of ${
        company?.city || "Noida"
      } Courts`,
      pageWidth / 2,
      pageHeight - 16,
      { align: "center" }
    );
    doc.text(
      `For any queries contact: ${
        company?.phone || "0120-4567890"
      } | Track: www.rapidcargo.com`,
      pageWidth / 2,
      pageHeight - 13,
      { align: "center" }
    );

    console.log("✅ Mixed GST Invoice LR generated with fixed alignment");
  } catch (error) {
    console.error("❌ Error in generateGSTLR:", error);
    throw error;
  }
};
