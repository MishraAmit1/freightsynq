// lib/enhancedLRGenerator.js
import jsPDF from "jspdf";
import { getTemplate } from './pdfTemplates';

export const generateEnhancedLRPDF = (booking, template, company, templateCode = 'standard') => {
    try {
        console.log('🔄 Starting PDF generation with:', {
            bookingId: booking?.booking_id,
            templateCode,
            companyName: company?.name,
            templateName: template?.template_name
        });

        // Validate required data
        if (!booking) throw new Error('Booking data is required');
        if (!company) throw new Error('Company data is required');
        if (!template) throw new Error('Template data is required');

        const selectedTemplate = getTemplate(templateCode);

        // Create PDF with template-specific orientation
        const doc = new jsPDF({
            orientation: selectedTemplate.layout,
            unit: "mm",
            format: "a4"
        });

        // Generate using template-specific function
        selectedTemplate.generatePDF(doc, booking, template, company);

        // Save with template-specific filename
        const filename = `LR_${booking.lr_number || booking.booking_id || Date.now()}.pdf`;
        doc.save(filename);

        console.log('✅ PDF saved as:', filename);
        return { success: true, filename };

    } catch (error) {
        console.error('❌ Error in generateEnhancedLRPDF:', error);
        throw error;
    }
};