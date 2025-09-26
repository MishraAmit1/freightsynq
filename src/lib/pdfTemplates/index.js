// lib/pdfTemplates/index.js
import { generateStandardLR } from "./standardTemplate";
import { generateMinimalLR } from "./minimalTemplate";
import { generateDetailedLR } from "./detailedTemplate";
import { generateGSTInvoiceLR } from "./gstTemplate";

export const TEMPLATES = {
  standard: {
    name: "Standard Format",
    layout: "landscape",
    generatePDF: generateStandardLR,
  },
  minimal: {
    name: "Minimal Format",
    layout: "portrait",
    generatePDF: generateMinimalLR,
  },
  detailed: {
    name: "Detailed Format",
    layout: "landscape",
    generatePDF: generateDetailedLR,
  },
  gst_invoice: {
    name: "GST Invoice Style",
    layout: "portrait",
    generatePDF: generateGSTInvoiceLR,
  },
};

export function getTemplate(templateCode) {
  return TEMPLATES[templateCode] || TEMPLATES.standard;
}
