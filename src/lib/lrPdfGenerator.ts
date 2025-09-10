import jsPDF from 'jspdf';
import { Booking } from './mockData';
import { format } from 'date-fns';

export const generateLRPDF = (booking: Booking) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const lineHeight = 10;
  let yPos = margin;

  // Add border
  doc.setLineWidth(0.5);
  doc.rect(10, 10, pageWidth - 20, 277, 'S');

  // Header
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('LORRY RECEIPT', pageWidth / 2, yPos, { align: 'center' });
  yPos += lineHeight * 1.5;

  // Company Name (placeholder)
  doc.setFontSize(16);
  doc.text('TRANSPORT LOGISTICS CO.', pageWidth / 2, yPos, { align: 'center' });
  yPos += lineHeight;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('123 Business Park, Industrial Area, Gujarat - 123456', pageWidth / 2, yPos, { align: 'center' });
  yPos += lineHeight;
  doc.text('Phone: +91-1234567890 | Email: info@transportco.com', pageWidth / 2, yPos, { align: 'center' });
  yPos += lineHeight * 2;

  // Draw separator line
  doc.setLineWidth(0.3);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += lineHeight;

  // LR Details Section
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  
  // Left column
  let leftX = margin;
  let rightX = pageWidth / 2 + 10;
  
  doc.text('LR Number:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.lrNumber || 'N/A', leftX + 30, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Booking ID:', rightX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.bookingId, rightX + 30, yPos);
  yPos += lineHeight;

  doc.setFont('helvetica', 'bold');
  doc.text('Date:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.lrDate ? format(new Date(booking.lrDate), 'dd/MM/yyyy HH:mm') : format(new Date(), 'dd/MM/yyyy HH:mm'), leftX + 30, yPos);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Service Type:', rightX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.serviceType, rightX + 30, yPos);
  yPos += lineHeight * 2;

  // Consignor/Consignee Section
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += lineHeight;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CONSIGNMENT DETAILS', margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(11);
  doc.text('Consignor:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.consignorName, leftX, yPos + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.text('Consignee:', rightX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.consigneeName, rightX, yPos + 7);
  yPos += lineHeight * 2;

  // Route Details
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += lineHeight;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('ROUTE DETAILS', margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(11);
  doc.text('From:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.fromLocation, leftX, yPos + 7);
  
  doc.setFont('helvetica', 'bold');
  doc.text('To:', rightX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(booking.toLocation, rightX, yPos + 7);
  yPos += lineHeight * 2;

  // Material Details
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += lineHeight;

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CARGO DETAILS', margin, yPos);
  yPos += lineHeight;
  
  doc.setFontSize(11);
  doc.text('Material Description:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  const materialLines = doc.splitTextToSize(booking.materialDescription, pageWidth - margin * 2);
  doc.text(materialLines, leftX, yPos + 7);
  yPos += 7 + (materialLines.length * 5);

  doc.setFont('helvetica', 'bold');
  doc.text('Number of Packages:', leftX, yPos);
  doc.setFont('helvetica', 'normal');
  doc.text(`${booking.cargoUnits} units`, leftX + 45, yPos);
  yPos += lineHeight * 1.5;

  // Vehicle Details (if assigned)
  if (booking.assignedVehicle) {
    doc.setLineWidth(0.2);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += lineHeight;

    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('VEHICLE DETAILS', margin, yPos);
    yPos += lineHeight;
    
    doc.setFontSize(11);
    doc.text('Vehicle Number:', leftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.assignedVehicle.vehicleNumber, leftX + 35, yPos);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Vehicle Type:', rightX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.assignedVehicle.vehicleType, rightX + 30, yPos);
    yPos += lineHeight;

    doc.setFont('helvetica', 'bold');
    doc.text('Driver Name:', leftX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.assignedVehicle.driver.name, leftX + 35, yPos);
    
    doc.setFont('helvetica', 'bold');
    doc.text('Contact:', rightX, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(booking.assignedVehicle.driver.phone, rightX + 30, yPos);
    yPos += lineHeight * 2;
  }

  // QR Code placeholder
  doc.setLineWidth(0.3);
  doc.rect(pageWidth - 60, 15, 40, 40, 'S');
  doc.setFontSize(8);
  doc.text('QR CODE', pageWidth - 40, 35, { align: 'center' });
  doc.setFontSize(6);
  doc.text(booking.bookingId, pageWidth - 40, 40, { align: 'center' });

  // Footer - Signature Section
  yPos = 240;
  doc.setLineWidth(0.2);
  doc.line(margin, yPos, pageWidth - margin, yPos);
  yPos += lineHeight;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  // Signature boxes
  doc.text('Consignor Signature', margin + 20, yPos + 20);
  doc.line(margin + 10, yPos + 15, margin + 60, yPos + 15);
  
  doc.text('Driver Signature', pageWidth / 2 - 20, yPos + 20);
  doc.line(pageWidth / 2 - 30, yPos + 15, pageWidth / 2 + 20, yPos + 15);
  
  doc.text('Consignee Signature', pageWidth - margin - 60, yPos + 20);
  doc.line(pageWidth - margin - 70, yPos + 15, pageWidth - margin - 20, yPos + 15);

  // Terms and conditions
  yPos += 35;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Terms & Conditions: Goods are transported at owner risk. Company is not responsible for any damage during transit.', pageWidth / 2, yPos, { align: 'center' });

  // Save the PDF
  doc.save(`LR_${booking.bookingId}.pdf`);
};