// lib/pdfTemplates/helpers.js
import { format } from "date-fns";

// Convert hex to RGB
export function hexToRgb(hex) {
  try {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  } catch (error) {
    console.error("Error converting hex to RGB:", error);
    return { r: 0, g: 0, b: 0 };
  }
}

// Parse cargo and materials into table format
export function parseCargoAndMaterials(cargoUnits, materialDescription) {
  const cargoItems = cargoUnits
    ? cargoUnits.split(",").map((item) => item.trim())
    : [];
  const materialItems = materialDescription
    ? materialDescription.split(",").map((item) => item.trim())
    : [];

  const maxLength = Math.max(cargoItems.length, materialItems.length);
  const tableData = [];

  for (let i = 0; i < maxLength; i++) {
    tableData.push({
      cargo: cargoItems[i] || "",
      material: materialItems[i] || "",
    });
  }

  return tableData;
}

// Add logo to PDF with position support
// lib/pdfTemplates/helpers.js - UPDATE addLogoToPDF function
export function addLogoToPDF(doc, template, x, y, width, height) {
  try {
    if (
      !template?.header_config?.show_logo ||
      !template?.header_config?.logo_url
    ) {
      return false;
    }

    const logoUrl = template.header_config.logo_url;

    try {
      // Add logo at specified position
      doc.addImage(logoUrl, "PNG", x, y, width, height);
      return true;
    } catch (imgError) {
      console.warn("Could not add logo:", imgError);
      // Try with JPEG format
      try {
        doc.addImage(logoUrl, "JPEG", x, y, width, height);
        return true;
      } catch (jpegError) {
        console.warn("Could not add logo as JPEG either:", jpegError);
        return false;
      }
    }
  } catch (error) {
    console.error("Error in addLogoToPDF:", error);
    return false;
  }
}

// Draw styled table for cargo and materials
export function drawCargoTable(
  doc,
  template,
  cargoData,
  startX,
  startY,
  width,
  options = {}
) {
  const {
    maxRows = 5,
    rowHeight = 8,
    fontSize = 10,
    showHeader = true,
  } = options;

  const primaryRgb = hexToRgb(
    template?.style_config?.primary_color || "#000000"
  );
  const fontFamily = template?.style_config?.font_family || "helvetica";

  let currentY = startY;

  // Table header
  if (showHeader) {
    doc.setFillColor(240, 240, 240);
    doc.rect(startX, currentY, width, 10, "F");
    doc.rect(startX, currentY, width, 10);

    doc.setFont(fontFamily, "bold");
    doc.setFontSize(fontSize);
    doc.setTextColor(primaryRgb.r, primaryRgb.g, primaryRgb.b);

    doc.text("QUANTITY / UNITS", startX + 5, currentY + 7);
    doc.text("MATERIAL DESCRIPTION", startX + width / 2 + 5, currentY + 7);

    currentY += 10;
  }

  // Table rows
  doc.setFont(fontFamily, "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(fontSize - 1);

  const rowsToDraw = Math.min(cargoData.length, maxRows);

  for (let i = 0; i < rowsToDraw; i++) {
    const row = cargoData[i];

    // Alternating row colors
    if (i % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(startX, currentY, width, rowHeight, "F");
    }

    doc.rect(startX, currentY, width / 2, rowHeight);
    doc.rect(startX + width / 2, currentY, width / 2, rowHeight);

    doc.text(row.cargo, startX + 5, currentY + rowHeight * 0.7);
    doc.text(row.material, startX + width / 2 + 5, currentY + rowHeight * 0.7);

    currentY += rowHeight;
  }

  // If more items exist
  if (cargoData.length > maxRows) {
    doc.rect(startX, currentY, width, rowHeight);
    doc.setFont(fontFamily, "italic");
    doc.text(
      `... and ${cargoData.length - maxRows} more items`,
      startX + 5,
      currentY + rowHeight * 0.7
    );
    currentY += rowHeight;
  }

  return currentY;
}

// Format date consistently
export function formatDate(date) {
  if (!date) return format(new Date(), "dd/MM/yyyy");
  return format(new Date(date), "dd/MM/yyyy");
}

// Apply text color from template
export function applyTextColor(doc, color) {
  const rgb = hexToRgb(color);
  doc.setTextColor(rgb.r, rgb.g, rgb.b);
}

// Reset text color to black
export function resetTextColor(doc) {
  doc.setTextColor(0, 0, 0);
}
