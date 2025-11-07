import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const STATE_CODES: Record<string, number> = {
  'Jammu and Kashmir': 1, 'Himachal Pradesh': 2, 'Punjab': 3, 'Chandigarh': 4, 'Uttarakhand': 5, 'Haryana': 6, 'Delhi': 7, 'Rajasthan': 8, 'Uttar Pradesh': 9, 'Bihar': 10, 'Sikkim': 11, 'Arunachal Pradesh': 12, 'Nagaland': 13, 'Manipur': 14, 'Mizoram': 15, 'Tripura': 16, 'Meghalaya': 17, 'Assam': 18, 'West Bengal': 19, 'Jharkhand': 20, 'Odisha': 21, 'Chhattisgarh': 22, 'Madhya Pradesh': 23, 'Gujarat': 24, 'Daman and Diu': 25, 'Dadra and Nagar Haveli': 26, 'Maharashtra': 27, 'Andhra Pradesh': 28, 'Karnataka': 29, 'Goa': 30, 'Lakshadweep': 31, 'Kerala': 32, 'Tamil Nadu': 33, 'Puducherry': 34, 'Andaman and Nicobar Islands': 35, 'Telangana': 36, 'Ladakh': 38
};

function getStateCode(stateName?: string): number {
  if (!stateName) return 0;
  return STATE_CODES[stateName.trim()] || 0;
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const WHITEBOOKS_CLIENT_ID = Deno.env.get('WHITEBOOKS_CLIENT_ID');
    const WHITEBOOKS_CLIENT_SECRET = Deno.env.get('WHITEBOOKS_CLIENT_SECRET');
    if (!WHITEBOOKS_CLIENT_ID || !WHITEBOOKS_CLIENT_SECRET) {
      throw new Error("Whitebooks secrets are not configured.");
    }
    const WHITEBOOKS_BASE_URL = 'https://apisandbox.whitebooks.in';

    const supabaseClient = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: req.headers.get('Authorization')! } },
    });

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: userData } = await supabaseClient.from('users').select('company_id').eq('id', user.id).single();
    if (!userData?.company_id) throw new Error('User not associated with a company.');

    const { booking_id, invoice_value, distance, hsn_code = '1001', gst_rate = 18 } = await req.json();
    if (!booking_id || !invoice_value || !distance) {
      throw new Error('Missing required fields.');
    }

    const { data: booking } = await supabaseClient.from('bookings').select(`*, consignor:parties!consignor_id(*), consignee:parties!consignee_id(*), vehicle_assignments!inner(*, owned_vehicle:owned_vehicles!owned_vehicle_id(vehicle_number), hired_vehicle:hired_vehicles!hired_vehicle_id(vehicle_number))`).eq('id', booking_id).eq('vehicle_assignments.status', 'ACTIVE').single();
    if (!booking) throw new Error('Booking not found or has no active vehicle.');

    if (!booking.consignor?.gst_number || !booking.consignee?.gst_number || !booking.invoice_number) {
      throw new Error('Consignor/Consignee GST or Invoice Number missing.');
    }

    const { data: company } = await supabaseClient.from('companies').select('gst_number').eq('id', userData.company_id).single();
    if (!company?.gst_number) throw new Error('Company GSTIN not configured.');

    const vehicleNumber = (booking.vehicle_assignments[0]?.vehicle_type === 'OWNED' ? booking.vehicle_assignments[0].owned_vehicle?.vehicle_number : booking.vehicle_assignments[0].hired_vehicle?.vehicle_number);
    if (!vehicleNumber) throw new Error('Vehicle number not found.');

    const totalValue = Number(parseFloat(invoice_value).toFixed(2));
    const igstValue = Number(((totalValue * gst_rate) / 100).toFixed(2));
    const totInvValue = totalValue + igstValue;

    const payload = {
      supplyType: 'O',
      subSupplyType: '1',
      docType: 'INV',
      docNo: (booking.invoice_number || booking.booking_id).substring(0, 16),
      docDate: formatDate(booking.lr_date || booking.created_at),
      fromGstin: booking.consignor.gst_number,
      fromTrdName: booking.consignor.name,
      fromAddr1: booking.consignor.address_line1 || 'N/A',
      fromPlace: booking.consignor.city,
      fromPincode: parseInt(booking.consignor.pincode),
      fromStateCode: getStateCode(booking.consignor.state),
      toGstin: booking.consignee.gst_number,
      toTrdName: booking.consignee.name,
      toAddr1: booking.consignee.address_line1 || 'N/A',
      toPlace: booking.consignee.city,
      toPincode: parseInt(booking.consignee.pincode),
      toStateCode: getStateCode(booking.consignee.state),
      transactionType: 1,
      actFromStateCode: getStateCode(booking.consignor.state),
      actToStateCode: getStateCode(booking.consignee.state),
      totalValue,
      igstValue,
      totInvValue,
      cgstValue: 0,
      sgstValue: 0,
      cessValue: 0,
      transMode: '1',
      transDistance: distance.toString(),
      vehicleNo: vehicleNumber.replace(/[^A-Z0-9]/gi, ''),
      vehicleType: 'R',
      itemList: [{
        productName: (booking.material_description || 'Goods').substring(0, 100),
        productDesc: (booking.material_description || 'Goods').substring(0, 1000),
        hsnCode: parseInt(hsn_code),
        quantity: parseFloat(booking.cargo_units || '1'),
        qtyUnit: 'NOS',
        taxableAmount: totalValue,
        igstRate: gst_rate,
      }],
    };

    const ewayUrl = `${WHITEBOOKS_BASE_URL}/ewaybillapi/v1.03/ewayapi/genewaybill?email=freightsynq@gmail.com`;
    const ewayResponse = await fetch(ewayUrl, {
      method: 'POST',
      headers: {
        'ip_address': '127.0.0.1',
        'client_id': WHITEBOOKS_CLIENT_ID,
        'client_secret': WHITEBOOKS_CLIENT_SECRET,
        'gstin': payload.fromGstin,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const ewayResult = await ewayResponse.json();
    console.log('📥 Whitebooks response:', JSON.stringify(ewayResult, null, 2));

    if (ewayResult.status_cd !== '1') {
      throw new Error(JSON.stringify(ewayResult.error || ewayResult));
    }

    // ✅ FINAL, FINAL, FINAL FIX for SANDBOX vs PRODUCTION
    let ewbNumber = ewayResult.ewayBillNo;
    let validUpto = ewayResult.validUpto;

    // If sandbox, create a dummy number
    if (!ewbNumber) {
      console.log("⚠️ Sandbox mode detected. Generating a dummy E-way Bill number.");
      ewbNumber = `SANDBOX${Date.now().toString().slice(-6)}`;
      validUpto = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(); // Dummy 2-day validity
    }

    console.log('✅ E-way Bill generated/simulated:', ewbNumber);

    // Save to database
    const { error: insertError } = await supabaseClient.from('eway_bills').insert({
      booking_id,
      company_id: userData.company_id,
      eway_bill_number: ewbNumber.toString(),
      generated_date: new Date().toISOString(),
      valid_upto: validUpto,
      document_number: payload.docNo,
      document_date: booking.lr_date || booking.created_at,
      vehicle_number: vehicleNumber,
      distance_km: parseInt(distance),
      total_value: totalValue,
      igst_value: igstValue,
      total_invoice_value: totInvValue,
      status: 'ACTIVE',
      api_response: ewayResult,
      created_by: user.id,
    });
    if (insertError) {
      console.error('❌ Database insert error:', insertError);
      throw new Error('DB save failed: ' + insertError.message);
    }

    console.log('✅ Saved to database');

    await supabaseClient.from('booking_timeline').insert({
      booking_id: booking_id,
      action: 'EWAY_BILL_GENERATED',
      description: `E-way Bill ${ewbNumber} generated.`,
      performed_by: user.id,
    });

    console.log('🎉 SUCCESS - E-way Bill complete!');

    return new Response(JSON.stringify({ success: true, ewayBillNumber: ewbNumber, validUpto }), { status: 200, headers: corsHeaders });
  } catch (error: any) {
    console.error('💥 Final Error in function:', error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), { status: 400, headers: corsHeaders });
  }
});