import { useState, useEffect } from 'react';
import { changeTemplate, getAvailableTemplates, getCurrentTemplateWithCompany, selectTemplate } from '@/api/lr-templates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, ArrowRight, Upload, Eye } from 'lucide-react';
// Live Preview Components - Template Specific
const LiveStandardPreview = ({ customization }) => (
    <div
        className="bg-white border-2"
        style={{
            fontFamily: customization.style_config.font_family,
            fontSize: '11px',
            width: '100%',
            minHeight: '500px',
            padding: '15px'
        }}
    >
        {/* HEADER SECTION - FIXED LOGO LOGIC */}
        <div className="flex justify-between items-start mb-3 pb-2 border-b-2 border-black">
            {/* LEFT SECTION */}
            <div className="flex items-center">
                {customization.header_config.show_logo && customization.header_config.logo_position === 'left' && customization.logo_url && (
                    <div className="w-20 h-16 mr-3 flex items-center">
                        <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                )}
                {customization.header_config.logo_position === 'right' && (
                    <div className="text-left">
                        <div className="text-sm font-bold">Consignment No.</div>
                        <div className="text-lg font-bold" style={{ color: customization.style_config.primary_color }}>
                            LR2024123456
                        </div>
                        <div className="text-xs mt-1">{new Date().toLocaleDateString('en-IN')}</div>
                    </div>
                )}
            </div>

            {/* CENTER - Company Details */}
            <div className="flex-1 text-center">
                {/* Center Logo */}
                {customization.header_config.show_logo && customization.header_config.logo_position === 'center' && customization.logo_url && (
                    <div className="w-20 h-16 mx-auto mb-2 flex items-center justify-center">
                        <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                )}

                <h1 className="font-bold text-2xl mb-1" style={{ color: customization.style_config.primary_color }}>
                    {customization.company_details?.name || 'VRL LOGISTICS LTD.'}
                </h1>
                {customization.header_config.show_address && (
                    <p className="text-xs">
                        Office: {customization.company_details?.address || 'Varur, Hubballi-580 030'}
                    </p>
                )}
                <p className="text-xs">
                    Email: {customization.company_details?.email || 'info@vrllogistics.com'} |
                    Mobile: {customization.company_details?.phone || '1800-123-4567'}
                </p>
            </div>

            {/* RIGHT SECTION */}
            <div className="flex items-center">
                {customization.header_config.show_logo && customization.header_config.logo_position === 'right' && customization.logo_url && (
                    <div className="w-20 h-16 ml-3 flex items-center">
                        <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                    </div>
                )}
                {customization.header_config.logo_position !== 'right' && (
                    <div className="text-right">
                        <div className="text-sm font-bold">Consignment No.</div>
                        <div className="text-lg font-bold" style={{ color: customization.style_config.primary_color }}>
                            LR2024123456
                        </div>
                        <div className="text-xs mt-1">{new Date().toLocaleDateString('en-IN')}</div>
                    </div>
                )}
            </div>
        </div>

        {/* SUB-HEADER ROW - 3 Columns */}
        <div className="grid grid-cols-3 gap-2 mb-3 text-xs">
            <div className="border p-2">
                <div className="font-bold">At OWNER'S risk</div>
                <div>Subject to Vapi Jurisdiction</div>
            </div>
            <div className="border p-2 text-center">
                <div className="font-bold">Vehicle No.</div>
                <div>KA-25-AB-1234</div>
            </div>
            <div className="border p-2 text-center">
                <div className="font-bold">GSTIN</div>
                <div>{customization.company_details?.gst || '29AABCV1234M1Z5'}</div>
            </div>
        </div>

        {/* CONSIGNOR & CONSIGNEE - Side by Side */}
        <div className="grid grid-cols-2 gap-2 mb-3">
            {customization.visible_fields?.consignor !== false && (
                <div className="border p-2">
                    <div className="font-bold bg-gray-100 px-1">CONSIGNOR</div>
                    <div className="text-xs mt-1">
                        <div>ABC Electronics Pvt Ltd</div>
                        <div>Shop No. 15, Electronic Market</div>
                        <div>GST: 27AAAAA0000A1Z5</div>
                        <div>Mobile: 9876543210</div>
                    </div>
                </div>
            )}

            {customization.visible_fields?.consignee !== false && (
                <div className="border p-2">
                    <div className="font-bold bg-gray-100 px-1">CONSIGNEE</div>
                    <div className="text-xs mt-1">
                        <div>XYZ Trading Company</div>
                        <div>Plot No. 25, Industrial Area</div>
                        <div>GST: 06BBBBB1111B1Z5</div>
                        <div>Mobile: 9876543211</div>
                    </div>
                </div>
            )}
        </div>

        {/* FROM & TO */}
        <div className="grid grid-cols-2 gap-2 mb-3">
            <div className="border p-2">
                <span className="font-bold">FROM:</span> Mumbai, Maharashtra
            </div>
            <div className="border p-2">
                <span className="font-bold">TO:</span> Gurgaon, Haryana
            </div>
        </div>

        {/* MAIN CONTENT - Split Layout */}
        <div className="grid grid-cols-2 gap-2 mb-3">
            {/* LEFT - Goods Description */}
            <div className="border">
                <div className="font-bold text-center bg-gray-100 p-1">GOODS DESCRIPTION</div>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="border-b">
                            <th className="p-1 text-left">Packages</th>
                            <th className="p-1 text-left">Item Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b">
                            <td className="p-1">15 Boxes</td>
                            <td className="p-1">Electronic Components</td>
                        </tr>
                        <tr className="border-b">
                            <td className="p-1">10 Cartons</td>
                            <td className="p-1">Mobile Accessories</td>
                        </tr>
                        <tr>
                            <td className="p-1">5 Packets</td>
                            <td className="p-1">Computer Parts</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* RIGHT - Billing Details */}
            <div className="border">
                <div className="font-bold text-center bg-gray-100 p-1">BILLING DETAILS</div>
                <div className="p-2 text-xs space-y-1">
                    <div className="flex justify-between">
                        <span>DATE:</span>
                        <span>{new Date().toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between">
                        <span>VALUE:</span>
                        <span>₹ 50,000</span>
                    </div>
                    <div className="flex justify-between">
                        <span>BILLING STATION:</span>
                        <span>Mumbai</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Tpt. Bill No:</span>
                        <span>TB2024001</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Others:</span>
                        <span>₹ 500</span>
                    </div>
                    <div className="flex justify-between border-t pt-1">
                        <span>Freight:</span>
                        <span>₹ 15,000</span>
                    </div>
                    <div className="flex justify-between">
                        <span>Total Rs:</span>
                        <span>₹ 15,500</span>
                    </div>
                    <div className="flex justify-between font-bold border-t pt-1">
                        <span>Grand Total:</span>
                        <span>₹ 65,500</span>
                    </div>
                </div>
            </div>
        </div>

        {/* FOOTER */}
        <div className="border-t pt-2">
            {customization.footer_config?.show_terms && (
                <p className="text-xs mb-2">
                    {customization.footer_config.terms_text || 'Goods once sent will not be taken back.'}
                </p>
            )}

            {customization.footer_config?.show_signature && (
                <div className="grid grid-cols-3 gap-4">
                    {(customization.footer_config.signature_labels || ['Consignor', 'Driver', 'Consignee']).map((label, index) => (
                        <div key={index} className="text-center">
                            <div className="border-b border-black mb-1 h-8"></div>
                            <div className="text-xs">{label}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    </div>
);
const LiveMinimalPreview = ({ customization, booking }) => {
    // Parse cargo and materials for table display
    const parseCargoAndMaterials = (cargoUnits, materials) => {
        const cargoArray = cargoUnits ? cargoUnits.split(',').map(c => c.trim()) : [];
        const materialArray = materials ? materials.split(',').map(m => m.trim()) : [];

        const result = [];
        const maxLength = Math.max(cargoArray.length, materialArray.length);

        for (let i = 0; i < maxLength; i++) {
            result.push({
                cargo: cargoArray[i] || '',
                material: materialArray[i] || ''
            });
        }

        return result;
    };

    const cargoData = parseCargoAndMaterials(
        booking?.cargo_units || "1 CARTOON, 12 BOX, 121 Kalu",
        booking?.material_description || "Rice Bags, Water Bottle, Papu Gadjet"
    );

    // Extract location parts
    const getLocationPart = (location, part = 'city') => {
        if (!location) return '';
        const parts = location.split(',');
        if (part === 'city') return parts[0] || '';
        if (part === 'state') return parts[parts.length - 1] || '';
        return location;
    };

    return (
        <div
            className="bg-white border"
            style={{
                fontFamily: customization.style_config.font_family,
                fontSize: '11px',
                width: '100%',
                minHeight: '500px',
                padding: '12px'
            }}
        >
            {/* HEADER SECTION */}
            <div className="flex justify-between items-start mb-2 pb-2 border-b border-black">
                {/* LEFT SECTION */}
                <div className="flex items-center">
                    {customization.header_config.show_logo && customization.header_config.logo_position === 'left' && customization.logo_url && (
                        <div className="w-18 h-14 mr-3 flex items-center">
                            <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    {customization.header_config.logo_position !== 'left' && (
                        <div className="text-left">
                            <div className="text-xs">LR Number</div>
                            <div className="text-base font-bold" style={{ color: customization.style_config.primary_color }}>
                                {booking?.lr_number || 'CN/2024/001234'}
                            </div>
                            <div className="text-xs">Date: {booking?.lr_date ? new Date(booking.lr_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div>
                        </div>
                    )}
                </div>

                {/* CENTER - Company Details */}
                <div className="flex-1 text-center px-2">
                    {customization.header_config.show_logo && customization.header_config.logo_position === 'center' && customization.logo_url && (
                        <div className="w-18 h-14 mx-auto mb-1 flex items-center justify-center">
                            <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}

                    <h1 className="font-bold text-xl mb-1" style={{ color: customization.style_config.primary_color }}>
                        {customization.company_details?.name || 'BHARAT LOGISTICS'}
                    </h1>
                    <div className="text-xs">TRANSPORT RECEIPT</div>
                    {customization.header_config.show_address && (
                        <p className="text-xs mt-1">
                            {customization.company_details?.address || 'Station Road, Transport Nagar, Delhi-110 042'}
                        </p>
                    )}
                    <p className="text-xs">
                        {customization.company_details?.phone || '+91-11-2345678'} | {customization.company_details?.email || 'info@bharatlogistics.com'}
                    </p>
                    {customization.header_config.show_gst && (
                        <p className="text-xs">GSTIN: {customization.company_details?.gst || '07AAAAA0000A1Z5'}</p>
                    )}
                </div>

                {/* RIGHT SECTION */}
                <div className="flex items-center">
                    {customization.header_config.show_logo && customization.header_config.logo_position === 'right' && customization.logo_url && (
                        <div className="w-18 h-14 ml-3 flex items-center">
                            <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    {customization.header_config.logo_position !== 'right' && (
                        <div className="text-right">
                            <div className="text-xs">LR Number</div>
                            <div className="text-base font-bold" style={{ color: customization.style_config.primary_color }}>
                                {booking?.lr_number || 'CN/2024/001234'}
                            </div>
                            <div className="text-xs">Date: {booking?.lr_date ? new Date(booking.lr_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* TRANSPORT DETAILS ROW */}
            <div className="flex justify-between mb-2 text-xs bg-gray-50 p-2">
                <div>
                    <span className="font-bold">Service Type:</span> {booking?.service_type || 'Surface Transport'}
                </div>
                <div>
                    <span className="font-bold">Booking ID:</span> {booking?.booking_id || 'BK2024001'}
                </div>
                <div>
                    <span className="font-bold">Invoice No:</span> {booking?.invoice_number || 'INV2024001'}
                </div>
                <div>
                    <span className="font-bold">Bilti No:</span> {booking?.bilti_number || 'BT2024001'}
                </div>
            </div>

            {/* FROM-TO SECTION */}
            <div className="grid grid-cols-2 gap-3 mb-2">
                <div className="border border-gray-400 p-2">
                    <div className="font-bold text-xs mb-1">FROM (Origin)</div>
                    {customization.visible_fields?.from_location !== false && (
                        <div className="text-xs">{getLocationPart(booking?.from_location, 'city') || 'Delhi, NCR'}</div>
                    )}
                    {customization.visible_fields?.consignor !== false && booking?.consignor && (
                        <div className="mt-2">
                            <div className="font-bold text-xs">Consignor:</div>
                            <div className="text-xs">
                                <div>{booking.consignor.name || 'ABC Traders'}</div>
                                <div>{booking.consignor.address || '123, Main Market'}</div>
                                <div>GST: {booking.consignor.gst_number || '07AAAAA0000A1Z5'}</div>
                                <div>Ph: {booking.consignor.phone || '9999999999'}</div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="border border-gray-400 p-2">
                    <div className="font-bold text-xs mb-1">TO (Destination)</div>
                    {customization.visible_fields?.to_location !== false && (
                        <div className="text-xs">{getLocationPart(booking?.to_location, 'city') || 'Mumbai, Maharashtra'}</div>
                    )}
                    {customization.visible_fields?.consignee !== false && booking?.consignee && (
                        <div className="mt-2">
                            <div className="font-bold text-xs">Consignee:</div>
                            <div className="text-xs">
                                <div>{booking.consignee.name || 'XYZ Enterprises'}</div>
                                <div>{booking.consignee.address || '456, Industrial Area'}</div>
                                <div>GST: {booking.consignee.gst_number || '27BBBBB1111B1Z5'}</div>
                                <div>Ph: {booking.consignee.phone || '8888888888'}</div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* GOODS & CHARGES TABLE */}
            <div className="border border-gray-400 mb-2">
                {/* Table Header */}
                <div className="grid grid-cols-12 bg-gray-100 p-1 text-xs font-bold border-b border-gray-400">
                    <div className="col-span-3">No. of Packages</div>
                    <div className="col-span-5">Description of Goods</div>
                    <div className="col-span-2 text-center">Rate/Unit</div>
                    <div className="col-span-2 text-right">Amount (₹)</div>
                </div>

                {/* Table Content - Dynamic Rows */}
                <div className="p-1">
                    {cargoData.map((row, index) => (
                        <div key={index} className="grid grid-cols-12 text-xs py-1 border-b border-gray-100 last:border-b-0">
                            <div className="col-span-3">{row.cargo}</div>
                            <div className="col-span-5">{row.material}</div>
                            <div className="col-span-2 text-center">-</div>
                            <div className="col-span-2 text-right">-</div>
                        </div>
                    ))}

                    {/* If no data, show at least one empty row */}
                    {cargoData.length === 0 && (
                        <div className="grid grid-cols-12 text-xs py-1">
                            <div className="col-span-3">-</div>
                            <div className="col-span-5">-</div>
                            <div className="col-span-2 text-center">-</div>
                            <div className="col-span-2 text-right">-</div>
                        </div>
                    )}
                </div>

                {/* Charges Section */}
                <div className="border-t border-gray-400 p-1">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>Pickup Date:</span>
                                <span>{booking?.pickup_date ? new Date(booking.pickup_date).toLocaleDateString('en-IN') : '-'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Status:</span>
                                <span className="font-bold">{booking?.status || 'DRAFT'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Payment Mode:</span>
                                <span>{booking?.payment_mode || 'TO PAY'}</span>
                            </div>
                        </div>
                        <div className="text-xs space-y-1">
                            <div className="flex justify-between">
                                <span>Basic Freight:</span>
                                <span>₹ {booking?.freight_charges || '15,000'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Loading/Unloading:</span>
                                <span>₹ 500</span>
                            </div>
                            <div className="flex justify-between">
                                <span>GST @ 5%:</span>
                                <span>₹ 775</span>
                            </div>
                            <div className="flex justify-between font-bold border-t pt-1">
                                <span>Total Freight:</span>
                                <span>₹ 16,275</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DECLARATION & TERMS */}
            <div className="text-xs mb-2">
                <div className="font-bold">Declaration:</div>
                <div>
                    {customization.footer_config?.terms_text ||
                        'I/We hereby declare that the said consignment does not contain any hazardous or prohibited goods. Goods booked at owner\'s risk.'}
                </div>
            </div>

            {/* FOOTER SIGNATURES */}
            {customization.footer_config?.show_signature && (
                <div className="border-t pt-2 mt-2">
                    <div className="grid grid-cols-4 gap-2 text-center">
                        <div>
                            <div className="border-b border-gray-400 mb-1 h-6"></div>
                            <div className="text-xs">Booking Clerk</div>
                        </div>
                        <div>
                            <div className="border-b border-gray-400 mb-1 h-6"></div>
                            <div className="text-xs">Driver Sign</div>
                        </div>
                        <div>
                            <div className="border-b border-gray-400 mb-1 h-6"></div>
                            <div className="text-xs">Consignor Sign</div>
                        </div>
                        <div>
                            <div className="border-b border-gray-400 mb-1 h-6"></div>
                            <div className="text-xs">Consignee Sign</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Note */}
            <div className="text-center text-xs text-gray-500 mt-2">
                Subject to Delhi Jurisdiction | This is computer generated receipt
            </div>
        </div>
    );
};
const LiveDetailedPreview = ({ customization, booking }) => {
    // Parse cargo and materials
    const parseCargoAndMaterials = (cargoUnits, materials) => {
        const cargoArray = cargoUnits ? cargoUnits.split(',').map(c => c.trim()) : [];
        const materialArray = materials ? materials.split(',').map(m => m.trim()) : [];

        const result = [];
        const maxLength = Math.max(cargoArray.length, materialArray.length);

        for (let i = 0; i < maxLength; i++) {
            result.push({
                cargo: cargoArray[i] || '',
                material: materialArray[i] || ''
            });
        }

        return result;
    };

    const cargoData = parseCargoAndMaterials(
        booking?.cargo_units || "1 CARTOON, 12 BOX, 121 Kalu",
        booking?.material_description || "Rice Bags, Water Bottle, Papu Gadjet"
    );

    return (
        <div
            className="bg-white border-2 border-gray-800"
            style={{
                fontFamily: customization.style_config.font_family,
                fontSize: '10px',
                width: '100%',
                minHeight: '500px',
                padding: '10px'
            }}
        >
            {/* DETAILED HEADER WITH MULTIPLE SECTIONS */}
            <div className="border-b-2 border-black pb-2 mb-2">
                {/* Top Row - Logo and Company */}
                <div className="flex justify-between items-start mb-2">
                    {/* Logo positioning logic */}
                    {customization.header_config.show_logo && customization.logo_url && customization.header_config.logo_position === 'left' && (
                        <img src={customization.logo_url} alt="Logo" className="w-16 h-12 object-contain mr-2" />
                    )}

                    <div className="flex-1 text-center">
                        {customization.header_config.show_logo && customization.logo_url && customization.header_config.logo_position === 'center' && (
                            <img src={customization.logo_url} alt="Logo" className="w-16 h-12 object-contain mx-auto mb-1" />
                        )}

                        <h1 className="text-lg font-bold uppercase" style={{ color: customization.style_config.primary_color }}>
                            {customization.company_details?.name || 'NATIONAL CARGO MOVERS'}
                        </h1>
                        <div className="text-xs font-semibold">LOGISTICS & SUPPLY CHAIN SOLUTIONS</div>
                        {customization.header_config.show_address && (
                            <div className="text-xs mt-1">
                                {customization.company_details?.address || '45, Transport Hub, Indore - 452001'}
                            </div>
                        )}
                    </div>

                    {customization.header_config.show_logo && customization.logo_url && customization.header_config.logo_position === 'right' && (
                        <img src={customization.logo_url} alt="Logo" className="w-16 h-12 object-contain ml-2" />
                    )}
                </div>

                {/* Contact Bar */}
                <div className="bg-gray-100 px-2 py-1 flex justify-between text-xs">
                    <div>
                        📞 {customization.company_details?.phone || '0731-4567890'} |
                        📧 {customization.company_details?.email || 'info@nationalcargo.com'}
                    </div>
                    <div>
                        {customization.header_config.show_gst && (
                            <span>GSTIN: {customization.company_details?.gst || '23AAAAA0000A1Z5'}</span>
                        )}
                        {customization.header_config.show_pan && (
                            <span className="ml-3">PAN: {customization.company_details?.pan || 'AAAAA0000A'}</span>
                        )}
                    </div>
                    <div>
                        CIN: U63090MP2020PTC123456
                    </div>
                </div>
            </div>

            {/* DOCUMENT TITLE AND NUMBER */}
            <div className="bg-black text-white text-center py-1 mb-2">
                <div className="text-sm font-bold">CONSIGNMENT NOTE / LORRY RECEIPT</div>
            </div>

            {/* KEY DETAILS ROW */}
            <div className="grid grid-cols-6 gap-1 mb-2 text-xs">
                <div className="border p-1">
                    <div className="font-bold text-gray-600">LR NO.</div>
                    <div className="font-bold" style={{ color: customization.style_config.primary_color }}>
                        {booking?.lr_number || 'NCM/LR/2024/1002'}
                    </div>
                </div>
                <div className="border p-1">
                    <div className="font-bold text-gray-600">DATE</div>
                    <div>{booking?.lr_date ? new Date(booking.lr_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div>
                </div>
                <div className="border p-1">
                    <div className="font-bold text-gray-600">BOOKING ID</div>
                    <div>{booking?.booking_id || 'BKG-20250924-3953'}</div>
                </div>
                <div className="border p-1">
                    <div className="font-bold text-gray-600">INVOICE NO.</div>
                    <div>{booking?.invoice_number || '5566666666666666666'}</div>
                </div>
                <div className="border p-1">
                    <div className="font-bold text-gray-600">BILTI NO.</div>
                    <div>{booking?.bilti_number || '111111111111'}</div>
                </div>
                <div className="border p-1">
                    <div className="font-bold text-gray-600">E-WAY BILL</div>
                    <div>{booking?.eway_bill || '231000987654'}</div>
                </div>
            </div>

            {/* PARTIES SECTION - Detailed */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                {/* CONSIGNOR */}
                {customization.visible_fields?.consignor !== false && (
                    <div className="border border-gray-600">
                        <div className="bg-gray-200 px-2 py-1 font-bold text-xs">CONSIGNOR (SENDER)</div>
                        <div className="p-2 text-xs">
                            <div className="font-bold">{booking?.consignor?.name || 'ABC Electronics Pvt Ltd'}</div>
                            <div>{booking?.consignor?.address || 'Shop No. 15, Electronic Market, Lamington Road'}</div>
                            <div>Mumbai - 400007, Maharashtra</div>
                            <div className="mt-1">
                                <span className="font-semibold">GSTIN:</span> {booking?.consignor?.gst_number || '27AAAAA0000A1Z5'}
                            </div>
                            <div>
                                <span className="font-semibold">Contact:</span> {booking?.consignor?.phone || '9876543210'}
                            </div>
                            <div>
                                <span className="font-semibold">Email:</span> {booking?.consignor?.email || 'abc@electronics.com'}
                            </div>
                        </div>
                    </div>
                )}

                {/* CONSIGNEE */}
                {customization.visible_fields?.consignee !== false && (
                    <div className="border border-gray-600">
                        <div className="bg-gray-200 px-2 py-1 font-bold text-xs">CONSIGNEE (RECEIVER)</div>
                        <div className="p-2 text-xs">
                            <div className="font-bold">{booking?.consignee?.name || 'XYZ Trading Company'}</div>
                            <div>{booking?.consignee?.address || 'Plot No. 25, Industrial Area, Sector 18'}</div>
                            <div>Gurgaon - 122015, Haryana</div>
                            <div className="mt-1">
                                <span className="font-semibold">GSTIN:</span> {booking?.consignee?.gst_number || '06BBBBB1111B1Z5'}
                            </div>
                            <div>
                                <span className="font-semibold">Contact:</span> {booking?.consignee?.phone || '9876543211'}
                            </div>
                            <div>
                                <span className="font-semibold">Email:</span> {booking?.consignee?.email || 'xyz@trading.com'}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ROUTE & VEHICLE DETAILS */}
            <div className="bg-blue-50 border border-blue-300 p-2 mb-2">
                <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                        <span className="font-bold">From:</span> {booking?.from_location?.split(',')[0] || 'Mumbai'}
                    </div>
                    <div>
                        <span className="font-bold">To:</span> {booking?.to_location?.split(',')[0] || 'Gurgaon'}
                    </div>
                    <div>
                        <span className="font-bold">Distance:</span> 1,400 KM
                    </div>
                    <div>
                        <span className="font-bold">Transit Time:</span> 3-4 Days
                    </div>
                    <div>
                        <span className="font-bold">Vehicle No:</span> {booking?.vehicle_number || 'MH-12-AB-1234'}
                    </div>
                    <div>
                        <span className="font-bold">Vehicle Type:</span> 32 FT MXL
                    </div>
                    <div>
                        <span className="font-bold">Driver:</span> {booking?.driver_name || 'Ramesh Kumar'}
                    </div>
                    <div>
                        <span className="font-bold">Mobile:</span> {booking?.driver_phone || '9998887776'}
                    </div>
                </div>
            </div>

            {/* DETAILED GOODS TABLE */}
            <div className="border border-gray-600 mb-2">
                <div className="bg-gray-300 font-bold text-xs p-1">GOODS DESCRIPTION</div>
                <table className="w-full text-xs">
                    <thead>
                        <tr className="bg-gray-100">
                            <th className="border-r border-gray-400 p-1 text-left">S.No</th>
                            <th className="border-r border-gray-400 p-1 text-left">No. of Packages</th>
                            <th className="border-r border-gray-400 p-1 text-left">Description</th>
                            <th className="border-r border-gray-400 p-1 text-center">Weight (Kg)</th>
                            <th className="border-r border-gray-400 p-1 text-center">Volume (CFT)</th>
                            <th className="p-1 text-center">Value (₹)</th>
                        </tr>
                    </thead>
                    <tbody>
                        {cargoData.map((row, index) => (
                            <tr key={index} className="border-t border-gray-300">
                                <td className="border-r border-gray-300 p-1">{index + 1}</td>
                                <td className="border-r border-gray-300 p-1">{row.cargo}</td>
                                <td className="border-r border-gray-300 p-1">{row.material}</td>
                                <td className="border-r border-gray-300 p-1 text-center">-</td>
                                <td className="border-r border-gray-300 p-1 text-center">-</td>
                                <td className="p-1 text-center">-</td>
                            </tr>
                        ))}
                        <tr className="border-t-2 border-gray-400 font-bold bg-gray-50">
                            <td colSpan="3" className="p-1 text-right">TOTAL:</td>
                            <td className="border-r border-gray-300 p-1 text-center">{booking?.weight || '750'}</td>
                            <td className="border-r border-gray-300 p-1 text-center">-</td>
                            <td className="p-1 text-center">{booking?.cargo_value || '75,000'}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            {/* CHARGES BREAKDOWN */}
            <div className="grid grid-cols-2 gap-2 mb-2">
                {/* Left - Service Details */}
                <div className="border border-gray-400 p-2">
                    <div className="font-bold text-xs mb-1">SERVICE DETAILS</div>
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Service Type:</span>
                            <span>{booking?.service_type || 'FTL'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Pickup Date:</span>
                            <span>{booking?.pickup_date ? new Date(booking.pickup_date).toLocaleDateString('en-IN') : '-'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Delivery Type:</span>
                            <span>Door to Door</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Insurance:</span>
                            <span>Carrier Risk</span>
                        </div>
                        <div className="flex justify-between">
                            <span>POD Required:</span>
                            <span>Yes</span>
                        </div>
                    </div>
                </div>

                {/* Right - Charges */}
                <div className="border border-gray-400 p-2">
                    <div className="font-bold text-xs mb-1">FREIGHT CHARGES</div>
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Basic Freight:</span>
                            <span>₹ {(booking?.freight_charges || 15000).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Hamali/Labour:</span>
                            <span>₹ 500</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Statistical Charges:</span>
                            <span>₹ 250</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Risk Charges:</span>
                            <span>₹ 150</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Other Charges:</span>
                            <span>₹ 100</span>
                        </div>
                        <div className="flex justify-between border-t pt-1">
                            <span>Sub Total:</span>
                            <span>₹ {((booking?.freight_charges || 15000) + 1000).toLocaleString('en-IN')}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>CGST @ 2.5%:</span>
                            <span>₹ {(((booking?.freight_charges || 15000) + 1000) * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>SGST @ 2.5%:</span>
                            <span>₹ {(((booking?.freight_charges || 15000) + 1000) * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t pt-1">
                            <span>GRAND TOTAL:</span>
                            <span>₹ {(((booking?.freight_charges || 15000) + 1000) * 1.05).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* PAYMENT & STATUS */}
            <div className="bg-yellow-50 border border-yellow-400 p-2 mb-2">
                <div className="grid grid-cols-4 gap-2 text-xs">
                    <div>
                        <span className="font-bold">Payment Mode:</span> {booking?.payment_mode || 'TO PAY'}
                    </div>
                    <div>
                        <span className="font-bold">Status:</span>
                        <span className="ml-1 px-2 py-0.5 bg-green-200 text-green-800 rounded text-xs">
                            {booking?.status || 'CONFIRMED'}
                        </span>
                    </div>
                    <div>
                        <span className="font-bold">Remarks:</span> Handle with Care
                    </div>
                    <div>
                        <span className="font-bold">OTP:</span> {Math.floor(1000 + Math.random() * 9000)}
                    </div>
                </div>
            </div>

            {/* TERMS & CONDITIONS */}
            {customization.footer_config?.show_terms && (
                <div className="border border-gray-300 p-2 mb-2">
                    <div className="font-bold text-xs mb-1">TERMS & CONDITIONS:</div>
                    <ol className="text-xs list-decimal list-inside space-y-0.5">
                        <li>{customization.footer_config?.terms_text || 'Goods once booked will not be cancelled.'}</li>
                        <li>Delivery subject to force majeure conditions.</li>
                        <li>Freight charges to be paid as per payment terms.</li>
                        <li>Company not responsible for natural calamities.</li>
                    </ol>
                </div>
            )}

            {/* SIGNATURES */}
            {customization.footer_config?.show_signature && (
                <div className="grid grid-cols-5 gap-2 text-center mt-4">
                    <div>
                        <div className="border-b border-black mb-1 h-8"></div>
                        <div className="text-xs">Prepared By</div>
                    </div>
                    <div>
                        <div className="border-b border-black mb-1 h-8"></div>
                        <div className="text-xs">Checked By</div>
                    </div>
                    <div>
                        <div className="border-b border-black mb-1 h-8"></div>
                        <div className="text-xs">Driver Sign</div>
                    </div>
                    <div>
                        <div className="border-b border-black mb-1 h-8"></div>
                        <div className="text-xs">Consignor</div>
                    </div>
                    <div>
                        <div className="border-b border-black mb-1 h-8"></div>
                        <div className="text-xs">Consignee</div>
                    </div>
                </div>
            )}

            {/* FOOTER */}
            <div className="text-center text-xs text-gray-600 mt-3 border-t pt-2">
                <div>This is a system generated document valid for 3 days from the date of generation</div>
                <div>For tracking visit: www.nationalcargo.com | Customer Care: 1800-123-4567</div>
            </div>
        </div>
    );
};
const LiveGSTPreview = ({ customization, booking }) => {
    // Parse cargo and materials
    const parseCargoAndMaterials = (cargoUnits, materials) => {
        const cargoArray = cargoUnits ? cargoUnits.split(',').map(c => c.trim()) : [];
        const materialArray = materials ? materials.split(',').map(m => m.trim()) : [];

        const result = [];
        const maxLength = Math.max(cargoArray.length, materialArray.length);

        for (let i = 0; i < maxLength; i++) {
            result.push({
                cargo: cargoArray[i] || '',
                material: materialArray[i] || ''
            });
        }

        return result;
    };

    const cargoData = parseCargoAndMaterials(
        booking?.cargo_units || "1 CARTOON, 12 BOX, 121 Kalu",
        booking?.material_description || "Rice Bags, Water Bottle, Papu Gadjet"
    );

    return (
        <div
            className="bg-white border-2 border-gray-600"
            style={{
                fontFamily: customization.style_config.font_family,
                fontSize: '11px',
                width: '100%',
                minHeight: '500px',
                padding: '12px'
            }}
        >
            {/* HEADER SECTION - Like Standard but Enhanced */}
            <div className="flex justify-between items-start mb-3 pb-2 border-b-2 border-gray-700">
                {/* LEFT SECTION */}
                <div className="flex items-center">
                    {customization.header_config.show_logo && customization.header_config.logo_position === 'left' && customization.logo_url && (
                        <div className="w-20 h-16 mr-3 flex items-center">
                            <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    {customization.header_config.logo_position !== 'left' && (
                        <div className="text-left">
                            <div className="text-xs font-semibold text-gray-600">Tax Invoice No.</div>
                            <div className="text-lg font-bold" style={{ color: customization.style_config.primary_color }}>
                                {booking?.invoice_number || 'INV/2024/001234'}
                            </div>
                            <div className="text-xs">Date: {booking?.lr_date ? new Date(booking.lr_date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}</div>
                        </div>
                    )}
                </div>

                {/* CENTER - Company Details */}
                <div className="flex-1 text-center">
                    {customization.header_config.show_logo && customization.header_config.logo_position === 'center' && customization.logo_url && (
                        <div className="w-20 h-16 mx-auto mb-2 flex items-center justify-center">
                            <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}

                    <h1 className="font-bold text-2xl mb-1" style={{ color: customization.style_config.primary_color }}>
                        {customization.company_details?.name || 'RAPID CARGO SOLUTIONS'}
                    </h1>
                    <div className="text-sm font-semibold bg-gray-100 px-3 py-1 rounded">TAX INVOICE / LORRY RECEIPT</div>
                    {customization.header_config.show_address && (
                        <p className="text-xs mt-1">
                            {customization.company_details?.address || 'B-45, Logistics Complex, Noida - 201301'}
                        </p>
                    )}
                    <p className="text-xs">
                        Ph: {customization.company_details?.phone || '0120-4567890'} | Email: {customization.company_details?.email || 'info@rapidcargo.com'}
                    </p>
                    {customization.header_config.show_gst && (
                        <p className="text-xs font-semibold">GSTIN: {customization.company_details?.gst || '09AAAAA0000A1Z5'}</p>
                    )}
                </div>

                {/* RIGHT SECTION */}
                <div className="flex items-center">
                    {customization.header_config.show_logo && customization.header_config.logo_position === 'right' && customization.logo_url && (
                        <div className="w-20 h-16 ml-3 flex items-center">
                            <img src={customization.logo_url} alt="Logo" className="max-w-full max-h-full object-contain" />
                        </div>
                    )}
                    {customization.header_config.logo_position !== 'right' && (
                        <div className="text-right">
                            <div className="text-xs font-semibold text-gray-600">Tax Invoice No.</div>
                            <div className="text-lg font-bold" style={{ color: customization.style_config.primary_color }}>
                                INV/2024/001234
                            </div>
                            <div className="text-xs">Date: {new Date().toLocaleDateString('en-IN')}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* DOCUMENT INFO BAR - Like Minimal */}
            <div className="grid grid-cols-5 gap-2 mb-3 text-xs bg-blue-50 p-2 rounded">
                <div>
                    <span className="font-bold">LR No:</span> {booking?.lr_number || 'LR2024001234'}
                </div>
                <div>
                    <span className="font-bold">Booking:</span> {booking?.booking_id || 'BKG-20250924-3953'}
                </div>
                <div>
                    <span className="font-bold">Vehicle:</span> {booking?.vehicle_number || 'UP-80-AB-1234'}
                </div>
                <div>
                    <span className="font-bold">E-Way:</span> {booking?.eway_bill || '291000123456'}
                </div>
                <div>
                    <span className="font-bold">HSN:</span> 996511
                </div>
            </div>

            {/* BILL TO / SHIP TO - Like Standard but Enhanced */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                {customization.visible_fields?.consignor !== false && (
                    <div className="border-2 border-blue-300 rounded">
                        <div className="bg-blue-500 text-white px-2 py-1 font-bold text-xs">BILL TO (Consignor)</div>
                        <div className="p-2 text-xs">
                            <div className="font-bold text-sm">{booking?.consignor?.name || 'ABC Electronics Pvt Ltd'}</div>
                            <div className="mt-1">{booking?.consignor?.address || 'Shop No. 15, Electronic Market'}</div>
                            <div>Lamington Road, Mumbai - 400007</div>
                            <div className="mt-2 space-y-1">
                                <div><span className="font-semibold">GSTIN:</span> {booking?.consignor?.gst_number || '27AAAAA0000A1Z5'}</div>
                                <div><span className="font-semibold">Mobile:</span> {booking?.consignor?.phone || '9876543210'}</div>
                                <div><span className="font-semibold">Email:</span> {booking?.consignor?.email || 'abc@electronics.com'}</div>
                            </div>
                        </div>
                    </div>
                )}

                {customization.visible_fields?.consignee !== false && (
                    <div className="border-2 border-green-300 rounded">
                        <div className="bg-green-500 text-white px-2 py-1 font-bold text-xs">SHIP TO (Consignee)</div>
                        <div className="p-2 text-xs">
                            <div className="font-bold text-sm">{booking?.consignee?.name || 'XYZ Trading Company'}</div>
                            <div className="mt-1">{booking?.consignee?.address || 'Plot No. 25, Industrial Area'}</div>
                            <div>Sector 18, Gurgaon - 122015</div>
                            <div className="mt-2 space-y-1">
                                <div><span className="font-semibold">GSTIN:</span> {booking?.consignee?.gst_number || '06BBBBB1111B1Z5'}</div>
                                <div><span className="font-semibold">Mobile:</span> {booking?.consignee?.phone || '9876543211'}</div>
                                <div><span className="font-semibold">Email:</span> {booking?.consignee?.email || 'xyz@trading.com'}</div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TRANSPORT & SERVICE DETAILS - Mixed Style */}
            <div className="bg-yellow-50 border border-yellow-400 p-2 mb-3 rounded">
                <div className="grid grid-cols-4 gap-3 text-xs">
                    <div>
                        <span className="font-bold">Service:</span> Goods Transportation
                    </div>
                    <div>
                        <span className="font-bold">From:</span> {booking?.from_location?.split(',')[0] || 'Mumbai'}
                    </div>
                    <div>
                        <span className="font-bold">To:</span> {booking?.to_location?.split(',')[0] || 'Gurgaon'}
                    </div>
                    <div>
                        <span className="font-bold">Distance:</span> 1,400 KM
                    </div>
                    <div>
                        <span className="font-bold">Driver:</span> {booking?.driver_name || 'Suresh Kumar'}
                    </div>
                    <div>
                        <span className="font-bold">Mobile:</span> {booking?.driver_phone || '9876543210'}
                    </div>
                    <div>
                        <span className="font-bold">Weight:</span> {booking?.weight || '750'} Kg
                    </div>
                    <div>
                        <span className="font-bold">Payment:</span> {booking?.payment_mode || 'TO PAY'}
                    </div>
                </div>
            </div>

            {/* GOODS & SERVICES TABLE - Enhanced */}
            <div className="border border-gray-400 mb-3">
                <div className="bg-gray-600 text-white p-2 font-bold text-sm text-center">
                    GOODS TRANSPORTATION SERVICES
                </div>

                {/* Table Header */}
                <div className="grid grid-cols-12 bg-gray-200 p-1 text-xs font-bold border-b">
                    <div className="col-span-1">S.No</div>
                    <div className="col-span-2">Packages</div>
                    <div className="col-span-4">Description of Goods</div>
                    <div className="col-span-2 text-center">HSN/SAC</div>
                    <div className="col-span-1 text-center">Qty</div>
                    <div className="col-span-2 text-right">Taxable Value (₹)</div>
                </div>

                {/* Table Content */}
                <div className="p-1">
                    {cargoData.map((row, index) => (
                        <div key={index} className="grid grid-cols-12 text-xs py-1 border-b border-gray-200 last:border-b-0">
                            <div className="col-span-1">{index + 1}</div>
                            <div className="col-span-2">{row.cargo}</div>
                            <div className="col-span-4">{row.material}</div>
                            <div className="col-span-2 text-center">996511</div>
                            <div className="col-span-1 text-center">1</div>
                            <div className="col-span-2 text-right">-</div>
                        </div>
                    ))}

                    {/* Service Row */}
                    <div className="grid grid-cols-12 text-xs py-1 bg-blue-50 font-semibold">
                        <div className="col-span-1">{cargoData.length + 1}</div>
                        <div className="col-span-2">Transportation</div>
                        <div className="col-span-4">Goods Transportation Service</div>
                        <div className="col-span-2 text-center">996511</div>
                        <div className="col-span-1 text-center">1 Trip</div>
                        <div className="col-span-2 text-right">{(booking?.freight_charges || 18500).toLocaleString('en-IN')}.00</div>
                    </div>
                </div>
            </div>

            {/* TAX CALCULATION - Side by Side */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                {/* Left - Additional Info */}
                <div className="border border-gray-300 p-2">
                    <div className="font-bold text-sm mb-2" style={{ color: customization.style_config.primary_color }}>
                        ADDITIONAL INFORMATION
                    </div>
                    <div className="text-xs space-y-1">
                        <div><span className="font-semibold">Service Type:</span> {booking?.service_type || 'FTL'}</div>
                        <div><span className="font-semibold">Pickup Date:</span> {booking?.pickup_date ? new Date(booking.pickup_date).toLocaleDateString('en-IN') : '-'}</div>
                        <div><span className="font-semibold">Delivery Type:</span> Door to Door</div>
                        <div><span className="font-semibold">Insurance:</span> Transit Insurance</div>
                        <div><span className="font-semibold">Remarks:</span> Handle with Care</div>
                    </div>
                </div>

                {/* Right - Tax Calculation */}
                <div className="border border-gray-300 p-2">
                    <div className="font-bold text-sm mb-2" style={{ color: customization.style_config.primary_color }}>
                        TAX CALCULATION
                    </div>
                    <div className="text-xs space-y-1">
                        <div className="flex justify-between">
                            <span>Taxable Amount:</span>
                            <span>₹ {(booking?.freight_charges || 18500).toLocaleString('en-IN')}.00</span>
                        </div>
                        <div className="flex justify-between">
                            <span>CGST @ 2.5%:</span>
                            <span>₹ {((booking?.freight_charges || 18500) * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>SGST @ 2.5%:</span>
                            <span>₹ {((booking?.freight_charges || 18500) * 0.025).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Round Off:</span>
                            <span>₹ 0.00</span>
                        </div>
                        <div className="border-t-2 border-gray-400 pt-1 mt-2">
                            <div className="flex justify-between font-bold text-sm">
                                <span>TOTAL AMOUNT:</span>
                                <span>₹ {((booking?.freight_charges || 18500) * 1.05).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* DECLARATION & TERMS - Like Detailed */}
            <div className="border border-gray-400 p-2 mb-3">
                <div className="font-bold text-xs mb-1">DECLARATION & TERMS:</div>
                <div className="text-xs">
                    <div className="mb-1"><span className="font-semibold">Declaration:</span> We declare that this invoice shows the actual price of goods/services and all particulars are true and correct.</div>
                    {customization.footer_config?.show_terms && (
                        <div><span className="font-semibold">Terms:</span> {customization.footer_config.terms_text || 'All disputes subject to local jurisdiction. Payment terms: As agreed.'}</div>
                    )}
                </div>
            </div>

            {/* FOOTER SIGNATURES - Enhanced */}
            {customization.footer_config?.show_signature && (
                <div className="grid grid-cols-3 gap-4 text-center mt-4">
                    <div>
                        <div className="border-b-2 border-gray-400 mb-1 h-8"></div>
                        <div className="text-xs font-semibold">Customer Signature</div>
                        <div className="text-xs text-gray-500">Date: ___________</div>
                    </div>
                    <div>
                        <div className="border-b-2 border-gray-400 mb-1 h-8"></div>
                        <div className="text-xs font-semibold">Driver Signature</div>
                        <div className="text-xs text-gray-500">Date: ___________</div>
                    </div>
                    <div>
                        <div className="border-b-2 border-gray-400 mb-1 h-8"></div>
                        <div className="text-xs font-semibold">Authorized Signatory</div>
                        <div className="text-xs text-gray-500">For {customization.company_details?.name || 'RAPID CARGO SOLUTIONS'}</div>
                    </div>
                </div>
            )}

            {/* BOTTOM NOTE */}
            <div className="text-center text-xs text-gray-600 mt-3 border-t pt-2">
                <div>This is a computer generated Tax Invoice | Subject to jurisdiction of {customization.company_details?.city || 'Noida'} Courts</div>
                <div>For any queries contact: {customization.company_details?.phone || '0120-4567890'} | Track: www.rapidcargo.com</div>
            </div>
        </div>
    );
};
export const LRTemplateOnboarding = ({ onComplete, changeMode = false }) => {
    const [step, setStep] = useState(1); // 1: Select, 2: Customize, 3: Preview, 4: Save
    const [templates, setTemplates] = useState([]);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentTemplateData, setCurrentTemplateData] = useState(null);
    const { toast } = useToast();

    // Customization state
    // Enhanced customization state with all options
    const [customization, setCustomization] = useState({
        logo_url: '',
        company_details: {
            name: 'Your Company Name',
            address: 'Your Company Address',
            city: 'City',
            state: 'State',
            gst: '24AAAAA0000A1Z5',
            pan: 'AAAAA0000A',
            phone: '+91 9999999999',
            email: 'info@company.com'
        },
        header_config: {
            show_logo: true,
            logo_position: 'left',
            logo_size: 'medium',
            show_gst: true,
            show_pan: false,
            show_address: true,
            company_name_size: '24px'
        },
        visible_fields: {
            lr_number: true,
            booking_id: true,
            date: true,
            consignor: true,
            consignee: true,
            from_location: true,
            to_location: true,
            material_description: true,
            vehicle_number: true,
            driver_details: true,
            weight: false,
            quantity: true,
            freight_charges: true,
            payment_mode: false
        },
        style_config: {
            primary_color: '#000000',
            secondary_color: '#666666',
            font_family: 'Arial',
            font_size: '12px'
        },
        footer_config: {
            show_terms: true,
            terms_text: 'Goods once sent will not be taken back',
            show_signature: true,
            signature_labels: ['Consignor', 'Driver', 'Consignee']
        }
    });

    useEffect(() => {
        loadInitialData();
    }, []);

    const loadInitialData = async () => {
        try {
            setLoading(true);

            // Load available templates
            const templateList = await getAvailableTemplates();
            setTemplates(templateList);

            // If in change mode, load current template and company data
            if (changeMode) {
                const { hasTemplate, template, company } = await getCurrentTemplateWithCompany();

                if (hasTemplate && template && company) {
                    setCurrentTemplateData(template);

                    // Pre-fill customization with current data
                    setCustomization(prev => ({
                        ...prev,
                        logo_url: template.header_config?.logo_url || '',
                        company_details: {
                            name: company.name || 'Your Company Name',
                            address: company.address || 'Your Company Address',
                            city: company.city || 'City',
                            state: company.state || 'State',
                            gst: company.gst_number || '24AAAAA0000A1Z5',
                            pan: company.pan_number || 'AAAAA0000A',
                            phone: company.phone || '+91 9999999999',
                            email: company.email || 'info@company.com'
                        },
                        header_config: {
                            ...prev.header_config,
                            ...template.header_config
                        },
                        visible_fields: {
                            ...prev.visible_fields,
                            ...template.visible_fields
                        },
                        style_config: {
                            ...prev.style_config,
                            ...template.style_config
                        },
                        footer_config: {
                            ...prev.footer_config,
                            ...template.footer_config
                        }
                    }));

                    // Find and set the current template
                    const currentTemplateCode = template.custom_fields?.find(f => f.key === 'base_template_code')?.value;
                    const currentTemplate = templateList.find(t => t.code === currentTemplateCode);
                    if (currentTemplate) {
                        setSelectedTemplate(currentTemplate);
                    }
                }
            }
        } catch (error) {
            console.error('Error loading initial data:', error);
            toast({
                title: "Error",
                description: "Failed to load template data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleTemplateSelect = (template) => {
        setSelectedTemplate(template);
        // Auto-proceed to customization
        setTimeout(() => setStep(2), 300);
    };

    const handleCustomizationChange = (section, field, value) => {
        setCustomization(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleLogoUpload = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                setCustomization(prev => ({
                    ...prev,
                    logo_url: e.target.result
                }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSignatureLabelsChange = (index, value) => {
        const newLabels = [...customization.footer_config.signature_labels];
        newLabels[index] = value;
        handleCustomizationChange('footer_config', 'signature_labels', newLabels);
    };

    const handleFinalSave = async () => {
        if (!selectedTemplate) return;

        setSaving(true);
        try {
            // Use changeTemplate instead of selectTemplate
            await changeTemplate(selectedTemplate.code, customization);
            toast({
                title: "Template Updated Successfully!",
                description: `${selectedTemplate.name} has been configured for your company`,
            });
            onComplete();
        } catch (error) {
            console.error('Error saving template:', error);
            toast({
                title: "Error",
                description: error.message || "Failed to save template",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="flex items-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span>Loading templates...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4">
            <div className="max-w-6xl mx-auto">
                {/* Progress Steps */}
                <div className="mb-8">
                    <div className="flex items-center justify-center space-x-4">
                        {[
                            { step: 1, title: 'Select Template' },
                            { step: 2, title: 'Customize' },
                            { step: 3, title: 'Preview' },
                            { step: 4, title: 'Complete' }
                        ].map((s) => (
                            <div key={s.step} className="flex items-center">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s.step ? 'bg-blue-600 text-white' : 'bg-gray-300 text-gray-600'
                                    }`}>
                                    {s.step}
                                </div>
                                <span className={`ml-2 text-sm ${step >= s.step ? 'text-blue-600' : 'text-gray-500'}`}>
                                    {s.title}
                                </span>
                                {s.step < 4 && <ArrowRight className="w-4 h-4 mx-4 text-gray-400" />}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Step 1: Template Selection */}
                {step === 1 && (
                    <Card className="w-full">
                        <CardHeader className="text-center">
                            <CardTitle className="text-2xl">Choose Your LR Template</CardTitle>
                            <p className="text-muted-foreground mt-2">
                                Select a Lorry Receipt format that best fits your business needs
                            </p>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {templates.map((template) => (
                                    <Card
                                        key={template.code}
                                        className={`cursor-pointer transition-all border-2 hover:border-blue-300 ${selectedTemplate?.code === template.code
                                            ? 'border-blue-500 bg-blue-50'
                                            : 'border-gray-200'
                                            }`}
                                        onClick={() => handleTemplateSelect(template)}
                                    >
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-lg">{template.name}</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {template.features.map((feature) => (
                                                    <span key={feature} className="bg-gray-100 text-xs px-2 py-1 rounded">
                                                        {feature}
                                                    </span>
                                                ))}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleTemplateSelect(template);
                                                }}
                                            >
                                                Select This Template
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
                {/* Step 2: Customization - COMPLETE VERSION */}
                {step === 2 && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Customization Form - ENHANCED */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Customize Your Template</CardTitle>
                                <p className="text-muted-foreground">
                                    Selected: <strong>{selectedTemplate?.name}</strong>
                                </p>
                            </CardHeader>
                            <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto">
                                {/* Logo Upload */}
                                {/* Logo Settings - COMPLETE WITH POSITION */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Logo Settings</h3>

                                    {/* Logo Upload */}
                                    <div className="space-y-2">
                                        <Label>Company Logo</Label>
                                        <div className="flex items-center space-x-4">
                                            <Input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="flex-1"
                                            />
                                            {customization.logo_url && (
                                                <img
                                                    src={customization.logo_url}
                                                    alt="Logo Preview"
                                                    className="w-12 h-12 object-contain border rounded"
                                                />
                                            )}
                                        </div>
                                    </div>

                                    {/* Logo Position and Show Logo - NEW GRID */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Logo Position</Label>
                                            <Select
                                                value={customization.header_config.logo_position}
                                                onValueChange={(value) => handleCustomizationChange('header_config', 'logo_position', value)}
                                                disabled={!customization.header_config.show_logo || !customization.logo_url}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="left">
                                                        <div className="flex items-center">
                                                            <span className="mr-2">⬅️</span> Left
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="center">
                                                        <div className="flex items-center">
                                                            <span className="mr-2">⬆️</span> Center
                                                        </div>
                                                    </SelectItem>
                                                    <SelectItem value="right">
                                                        <div className="flex items-center">
                                                            <span className="mr-2">➡️</span> Right
                                                        </div>
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Show Logo on LR</Label>
                                            <div className="flex items-center space-x-2 mt-2">
                                                <input
                                                    type="checkbox"
                                                    checked={customization.header_config.show_logo}
                                                    onChange={(e) => handleCustomizationChange('header_config', 'show_logo', e.target.checked)}
                                                    className="rounded"
                                                    id="show-logo-check"
                                                />
                                                <label htmlFor="show-logo-check" className="text-sm cursor-pointer">
                                                    Display logo on document
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Logo Size Option - OPTIONAL BUT GOOD TO HAVE */}
                                    <div>
                                        <Label>Logo Size</Label>
                                        <Select
                                            value={customization.header_config.logo_size || 'medium'}
                                            onValueChange={(value) => handleCustomizationChange('header_config', 'logo_size', value)}
                                            disabled={!customization.header_config.show_logo || !customization.logo_url}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="small">Small</SelectItem>
                                                <SelectItem value="medium">Medium</SelectItem>
                                                <SelectItem value="large">Large</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Company Details */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Company Information</h3>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <Label>Company Name</Label>
                                            <Input
                                                value={customization.company_details?.name || ''}
                                                onChange={(e) => handleCustomizationChange('company_details', 'name', e.target.value)}
                                                placeholder="Your Company Name"
                                            />
                                        </div>
                                        <div>
                                            <Label>Address</Label>
                                            <Input
                                                value={customization.company_details?.address || ''}
                                                onChange={(e) => handleCustomizationChange('company_details', 'address', e.target.value)}
                                                placeholder="Company Address"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <Label>GST Number</Label>
                                                <Input
                                                    value={customization.company_details?.gst || ''}
                                                    onChange={(e) => handleCustomizationChange('company_details', 'gst', e.target.value)}
                                                    placeholder="24AAAAA0000A1Z5"
                                                />
                                            </div>
                                            <div>
                                                <Label>Phone</Label>
                                                <Input
                                                    value={customization.company_details?.phone || ''}
                                                    onChange={(e) => handleCustomizationChange('company_details', 'phone', e.target.value)}
                                                    placeholder="+91 9999999999"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Header Settings */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Header Settings</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Logo Position</Label>
                                            <Select
                                                value={customization.header_config.logo_position}
                                                onValueChange={(value) => handleCustomizationChange('header_config', 'logo_position', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="left">Left</SelectItem>
                                                    <SelectItem value="center">Center</SelectItem>
                                                    <SelectItem value="right">Right</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Company Name Size</Label>
                                            <Select
                                                value={customization.header_config.company_name_size}
                                                onValueChange={(value) => handleCustomizationChange('header_config', 'company_name_size', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="18px">Small (18px)</SelectItem>
                                                    <SelectItem value="24px">Medium (24px)</SelectItem>
                                                    <SelectItem value="30px">Large (30px)</SelectItem>
                                                    <SelectItem value="36px">Extra Large (36px)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={customization.header_config.show_logo}
                                                onChange={(e) => handleCustomizationChange('header_config', 'show_logo', e.target.checked)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Show Logo</span>
                                        </label>

                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={customization.header_config.show_gst}
                                                onChange={(e) => handleCustomizationChange('header_config', 'show_gst', e.target.checked)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Show GST Number</span>
                                        </label>

                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={customization.header_config.show_address}
                                                onChange={(e) => handleCustomizationChange('header_config', 'show_address', e.target.checked)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Show Address</span>
                                        </label>

                                        <label className="flex items-center space-x-2">
                                            <input
                                                type="checkbox"
                                                checked={customization.header_config.show_pan}
                                                onChange={(e) => handleCustomizationChange('header_config', 'show_pan', e.target.checked)}
                                                className="rounded"
                                            />
                                            <span className="text-sm">Show PAN Number</span>
                                        </label>
                                    </div>
                                </div>

                                {/* Visible Fields Configuration */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Fields to Show on LR</h3>
                                    <div className="grid grid-cols-2 gap-2">
                                        {Object.entries({
                                            lr_number: 'LR Number',
                                            booking_id: 'Booking ID',
                                            date: 'Date',
                                            consignor: 'Consignor Details',
                                            consignee: 'Consignee Details',
                                            from_location: 'From Location',
                                            to_location: 'To Location',
                                            material_description: 'Material Description',
                                            vehicle_number: 'Vehicle Number',
                                            driver_details: 'Driver Details',
                                            weight: 'Weight',
                                            quantity: 'Quantity/Units',
                                            freight_charges: 'Freight Charges',
                                            payment_mode: 'Payment Mode'
                                        }).map(([key, label]) => (
                                            <label key={key} className="flex items-center space-x-2">
                                                <input
                                                    type="checkbox"
                                                    checked={customization.visible_fields?.[key] !== false}
                                                    onChange={(e) => handleCustomizationChange('visible_fields', key, e.target.checked)}
                                                    className="rounded"
                                                />
                                                <span className="text-sm">{label}</span>
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                {/* Style Settings */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Style Settings</h3>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Primary Color</Label>
                                            <div className="flex items-center space-x-2">
                                                <Input
                                                    type="color"
                                                    value={customization.style_config.primary_color}
                                                    onChange={(e) => handleCustomizationChange('style_config', 'primary_color', e.target.value)}
                                                    className="w-12 h-10"
                                                />
                                                <Input
                                                    type="text"
                                                    value={customization.style_config.primary_color}
                                                    onChange={(e) => handleCustomizationChange('style_config', 'primary_color', e.target.value)}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <Label>Secondary Color</Label>
                                            <div className="flex items-center space-x-2">
                                                <Input
                                                    type="color"
                                                    value={customization.style_config.secondary_color}
                                                    onChange={(e) => handleCustomizationChange('style_config', 'secondary_color', e.target.value)}
                                                    className="w-12 h-10"
                                                />
                                                <Input
                                                    type="text"
                                                    value={customization.style_config.secondary_color}
                                                    onChange={(e) => handleCustomizationChange('style_config', 'secondary_color', e.target.value)}
                                                    className="flex-1"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>Font Family</Label>
                                            <Select
                                                value={customization.style_config.font_family}
                                                onValueChange={(value) => handleCustomizationChange('style_config', 'font_family', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Arial">Arial</SelectItem>
                                                    <SelectItem value="Times New Roman">Times New Roman</SelectItem>
                                                    <SelectItem value="Helvetica">Helvetica</SelectItem>
                                                    <SelectItem value="Calibri">Calibri</SelectItem>
                                                    <SelectItem value="Georgia">Georgia</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div>
                                            <Label>Font Size</Label>
                                            <Select
                                                value={customization.style_config.font_size}
                                                onValueChange={(value) => handleCustomizationChange('style_config', 'font_size', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="10px">Small (10px)</SelectItem>
                                                    <SelectItem value="12px">Medium (12px)</SelectItem>
                                                    <SelectItem value="14px">Large (14px)</SelectItem>
                                                    <SelectItem value="16px">Extra Large (16px)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                </div>

                                {/* Footer Settings */}
                                <div className="space-y-4">
                                    <h3 className="font-medium">Footer Settings</h3>

                                    <div>
                                        <Label>Terms & Conditions</Label>
                                        <Textarea
                                            value={customization.footer_config.terms_text}
                                            onChange={(e) => handleCustomizationChange('footer_config', 'terms_text', e.target.value)}
                                            placeholder="Enter your terms and conditions..."
                                            rows={3}
                                        />
                                    </div>

                                    <div className="flex items-center space-x-2 mb-4">
                                        <input
                                            type="checkbox"
                                            checked={customization.footer_config.show_signature}
                                            onChange={(e) => handleCustomizationChange('footer_config', 'show_signature', e.target.checked)}
                                            className="rounded"
                                        />
                                        <Label>Show Signature Section</Label>
                                    </div>

                                    {customization.footer_config.show_signature && (
                                        <div>
                                            <Label>Signature Labels</Label>
                                            <div className="grid grid-cols-3 gap-2">
                                                {customization.footer_config.signature_labels.map((label, index) => (
                                                    <Input
                                                        key={index}
                                                        value={label}
                                                        onChange={(e) => handleSignatureLabelsChange(index, e.target.value)}
                                                        placeholder={`Signature ${index + 1}`}
                                                    />
                                                ))}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2"
                                                onClick={() => {
                                                    const newLabels = [...customization.footer_config.signature_labels, 'New Signature'];
                                                    handleCustomizationChange('footer_config', 'signature_labels', newLabels);
                                                }}
                                            >
                                                + Add Signature
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Live Preview - TEMPLATE SPECIFIC */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2">
                                    <Eye className="w-5 h-5" />
                                    Live Preview - {selectedTemplate?.name}
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="border rounded-lg bg-white overflow-hidden">
                                    {/* Render template-specific preview */}
                                    {selectedTemplate?.code === 'standard' && (
                                        <LiveStandardPreview customization={customization} />
                                    )}
                                    {selectedTemplate?.code === 'minimal' && (
                                        <LiveMinimalPreview customization={customization} />
                                    )}
                                    {selectedTemplate?.code === 'detailed' && (
                                        <LiveDetailedPreview customization={customization} />
                                    )}
                                    {selectedTemplate?.code === 'gst_invoice' && (
                                        <LiveGSTPreview customization={customization} />
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8">
                    <Button
                        variant="outline"
                        onClick={() => setStep(Math.max(1, step - 1))}
                        disabled={step === 1}
                        className="flex items-center gap-2"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back
                    </Button>

                    <div className="flex gap-2">
                        {step === 2 && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(3)}
                                    className="flex items-center gap-2"
                                >
                                    Preview Template
                                    <Eye className="w-4 h-4" />
                                </Button>
                                <Button
                                    onClick={handleFinalSave}
                                    className="flex items-center gap-2"
                                >
                                    Skip Preview & Save
                                    <ArrowRight className="w-4 h-4" />
                                </Button>
                            </>
                        )}

                        {step === 3 && (
                            <Card className="w-full">
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Eye className="w-5 h-5" />
                                        Final Preview - {selectedTemplate?.name}
                                    </CardTitle>
                                    <p className="text-muted-foreground">
                                        This is exactly how your LR will look when generated with your customizations
                                    </p>
                                </CardHeader>
                                <CardContent>
                                    <div className="border rounded-lg bg-white overflow-auto" style={{
                                        maxHeight: '80vh'
                                    }}>
                                        {/* Use the SAME live preview components with proper scaling */}
                                        <div style={{
                                            transform: selectedTemplate?.code === 'minimal' || selectedTemplate?.code === 'gst_invoice' ? 'scale(0.8)' : 'scale(0.7)',
                                            transformOrigin: 'top left',
                                            width: selectedTemplate?.code === 'minimal' || selectedTemplate?.code === 'gst_invoice' ? '125%' : '143%'
                                        }}>
                                            {selectedTemplate?.code === 'standard' && (
                                                <LiveStandardPreview customization={customization} />
                                            )}
                                            {selectedTemplate?.code === 'minimal' && (
                                                <LiveMinimalPreview customization={customization} />
                                            )}
                                            {selectedTemplate?.code === 'detailed' && (
                                                <LiveDetailedPreview customization={customization} />
                                            )}
                                            {selectedTemplate?.code === 'gst_invoice' && (
                                                <LiveGSTPreview customization={customization} />
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center mt-6">
                                        <Button
                                            variant="outline"
                                            onClick={() => setStep(2)}
                                            className="flex items-center gap-2"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                            Back to Customize
                                        </Button>

                                        <Button
                                            onClick={handleFinalSave}
                                            disabled={saving}
                                            size="lg"
                                            className="px-8"
                                        >
                                            {saving ? (
                                                <>
                                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                    Setting up...
                                                </>
                                            ) : (
                                                <>
                                                    ✅ Perfect! Use This Template
                                                </>
                                            )}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>

        </div>
    );
};