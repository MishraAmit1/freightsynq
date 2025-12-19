// src/lib/standaloneLRPdfGenerator.ts
import jsPDF from "jspdf";
import { getTemplate } from './pdfTemplates';
import type { StandaloneLRDocument } from '@/api/standalone-lr-generator';

// ✅ Helper: Parse goods_items if it's JSON string
const parseGoodsItems = (goodsItems: any) => {
  if (!goodsItems) return [];
  
  // Already an array
  if (Array.isArray(goodsItems)) return goodsItems;
  
  // It's a string, parse it
  if (typeof goodsItems === 'string') {
    try {
      // Handle double-encoded JSON
      let parsed = JSON.parse(goodsItems);
      
      // If still a string, parse again
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('❌ Error parsing goods_items:', error);
      return [];
    }
  }
  
  return [];
};

export const generateStandaloneLRPDF = async (
  lrData: StandaloneLRDocument, // ✅ Changed type to match SavedLRs
  companyData: any,
  templateCode: string = 'standard'
) => {
  try {
    console.log('🔄 Starting Standalone LR PDF generation...');
    console.log('📄 LR Data:', lrData);
    console.log('🏢 Company Data:', companyData);
    console.log('📋 Template Code:', templateCode);

    // Validate data
    if (!lrData) throw new Error('LR data is required');

    // ✅ Parse goods_items properly
    const goodsItems = parseGoodsItems(lrData.goods_items);
    console.log('📦 Parsed Goods Items:', goodsItems);

    // Get template configuration
    const selectedTemplate = getTemplate(templateCode);

    // Create PDF with template-specific orientation
    const doc = new jsPDF({
      orientation: selectedTemplate.layout,
      unit: "mm",
      format: "a4"
    });

    // ✅ Convert standalone LR data to booking-like structure
    const bookingData = {
      lr_number: lrData.standalone_lr_number,
      lr_date: lrData.lr_date,
      booking_id: 'STANDALONE',
      
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
      
      // ✅ NEW: Goods items array
      goods_items: goodsItems.length > 0 ? goodsItems : [
        { id: '1', description: 'Sample goods', quantity: '10 boxes' }
      ],
      
      // Legacy fields (for backward compatibility)
      material_description: lrData.material_description,
      cargo_units: lrData.packages_qty,
      
      // Other goods details
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

    console.log('🎯 Booking Data for PDF:', bookingData);

    // ✅ Use LR document's company data if available
    const pdfCompanyData = {
      name: lrData.company_name || companyData?.name || 'Your Company Name',
      address: lrData.company_address || companyData?.address || 'Company Address',
      city: lrData.company_city || companyData?.city || 'City',
      state: lrData.company_state || companyData?.state || 'State',
      gst_number: lrData.company_gst || companyData?.gst_number || '22AAAAA0000A1Z5',
      pan_number: lrData.company_pan || companyData?.pan_number || 'AAAAA0000A',
      phone: lrData.company_phone || companyData?.phone || '+91 9999999999',
      email: lrData.company_email || companyData?.email || 'info@company.com',
      logo_url: lrData.company_logo_url || companyData?.logo_url || '',
    };

    console.log('🏢 PDF Company Data:', pdfCompanyData);

    // Create template configuration
    const templateConfig = {
      template_name: selectedTemplate.name,
      header_config: {
        show_logo: !!pdfCompanyData.logo_url,
        logo_url: pdfCompanyData.logo_url,
        logo_position: 'left',
        show_gst: true,
        show_pan: false,
        show_address: true,
      },
      visible_fields: {
        lr_number: true,
        booking_id: false,
        date: true,
        consignor: true,
        consignee: true,
        from_location: true,
        to_location: true,
        material_description: true,
        goods_items: true, // ✅ Enable goods_items
        vehicle_number: true,
        driver_details: true,
        weight: !!lrData.weight,
        quantity: true,
        freight_charges: !!lrData.freight_amount,
        payment_mode: !!lrData.payment_mode,
        remarks: !!lrData.remarks,
      },
      style_config: {
        primary_color: '#000000',
        secondary_color: '#666666',
        font_family: 'Helvetica',
        font_size: '12px',
      },
      footer_config: {
        show_terms: true,
        terms_text: lrData.remarks || 'Goods once sent will not be taken back',
        show_signature: true,
        signature_labels: ['Consignor', 'Driver', 'Consignee'],
      },
    };

    console.log('⚙️ Template Config:', templateConfig);

    // Generate using template-specific function
    console.log('🎨 Calling template generatePDF function...');
    selectedTemplate.generatePDF(doc, bookingData, templateConfig, pdfCompanyData);

    // Save with template-specific filename
    const filename = `Standalone_LR_${lrData.standalone_lr_number || Date.now()}.pdf`;
    doc.save(filename);

    console.log('✅ Standalone LR PDF saved as:', filename);
    return { success: true, filename };

  } catch (error) {
    console.error('❌ Error in generateStandaloneLRPDF:', error);
    console.error('Error details:', error);
    throw error;
  }
};