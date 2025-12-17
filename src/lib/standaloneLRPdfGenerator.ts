// src/lib/standaloneLRPdfGenerator.ts
import jsPDF from "jspdf";
import { getTemplate } from './pdfTemplates';
import type { StandaloneLRFormData } from '@/lib/validations/standalone-lr';

export const generateStandaloneLRPDF = async (
  lrData: StandaloneLRFormData,
  companyData: any,
  templateCode: string = 'standard'
) => {
  try {
    console.log('🔄 Starting Standalone LR PDF generation...', {
      lrNumber: lrData.standalone_lr_number,
      templateCode,
      companyName: companyData?.name
    });

    // Validate data
    if (!lrData) throw new Error('LR data is required');
    if (!companyData) throw new Error('Company data is required');

    // Get template configuration
    const selectedTemplate = getTemplate(templateCode);

    // Create PDF with template-specific orientation
    const doc = new jsPDF({
      orientation: selectedTemplate.layout,
      unit: "mm",
      format: "a4"
    });

    // Convert standalone LR data to booking-like structure for compatibility
    const bookingData = {
      lr_number: lrData.standalone_lr_number,
      lr_date: lrData.lr_date,
      booking_id: 'STANDALONE', // Not displayed in standalone mode
      
      // Consignor
      consignor: {
        name: lrData.consignor_name,
        address: lrData.consignor_address,
        city: lrData.consignor_city,
        state: lrData.consignor_state,
        pincode: lrData.consignor_pincode,
        phone: lrData.consignor_phone,
        gst_number: lrData.consignor_gst,
        email: lrData.consignor_email,
      },
      
      // Consignee
      consignee: {
        name: lrData.consignee_name,
        address: lrData.consignee_address,
        city: lrData.consignee_city,
        state: lrData.consignee_state,
        pincode: lrData.consignee_pincode,
        phone: lrData.consignee_phone,
        gst_number: lrData.consignee_gst,
        email: lrData.consignee_email,
      },
      
      // Route
      from_location: lrData.from_location,
      to_location: lrData.to_location,
      
      // Goods
      material_description: lrData.material_description,
      cargo_units: lrData.packages_qty,
      weight: lrData.weight,
      invoice_number: lrData.invoice_number,
      invoice_value: lrData.invoice_value,
      eway_bill: lrData.eway_bill_number,
      
      // Vehicle & Driver
      vehicle_number: lrData.vehicle_number,
      driver_name: lrData.driver_name,
      driver_phone: lrData.driver_phone,
      
      // Payment
      freight_charges: lrData.freight_amount,
      payment_mode: lrData.payment_mode,
      
      // Other
      remarks: lrData.remarks,
    };

    // Create template configuration
    const templateConfig = {
      template_name: selectedTemplate.name,
      header_config: {
        show_logo: !!companyData?.logo_url,
        logo_url: companyData?.logo_url,
        logo_position: 'left',
        show_gst: true,
        show_pan: false,
        show_address: true,
      },
      visible_fields: {
        lr_number: true,
        booking_id: false, // Hide booking ID for standalone
        date: true,
        consignor: true,
        consignee: true,
        from_location: true,
        to_location: true,
        material_description: true,
        vehicle_number: true,
        driver_details: true,
        weight: !!lrData.weight,
        quantity: true,
        freight_charges: !!lrData.freight_amount,
        payment_mode: !!lrData.payment_mode,
      },
      style_config: {
        primary_color: '#000000',
        secondary_color: '#666666',
        font_family: 'Helvetica',
        font_size: '12px',
      },
      footer_config: {
        show_terms: true,
        terms_text: 'Goods once sent will not be taken back',
        show_signature: true,
        signature_labels: ['Consignor', 'Driver', 'Consignee'],
      },
    };

    // Generate using template-specific function
    selectedTemplate.generatePDF(doc, bookingData, templateConfig, companyData);

    // Save with template-specific filename
    const filename = `Standalone_LR_${lrData.standalone_lr_number || Date.now()}.pdf`;
    doc.save(filename);

    console.log('✅ Standalone LR PDF saved as:', filename);
    return { success: true, filename };

  } catch (error) {
    console.error('❌ Error in generateStandaloneLRPDF:', error);
    throw error;
  }
};