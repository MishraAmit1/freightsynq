// ============================================
// E-way Bill Details Fetcher (ApiSathi) - FINAL FIX
// ============================================
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const { eway_bill_number } = await req.json();
    // Validations
    if (!eway_bill_number) {
      throw new Error('E-way bill number is required');
    }
    if (typeof eway_bill_number !== 'string' || eway_bill_number.length !== 12) {
      throw new Error('E-way bill must be exactly 12 digits');
    }
    if (!/^\d{12}$/.test(eway_bill_number)) {
      throw new Error('E-way bill must contain only numbers');
    }
    console.log('📋 Fetching E-way bill:', eway_bill_number);
    // Call API
    const apiResponse = await fetch('https://apisathi.com/api/v1/ewaybillByNumber', {
      method: 'POST',
      headers: {
        'x-api-key': '386a7436-019e-4938-a8d8-be7690eef4cc',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ewbNo: eway_bill_number
      })
    });
    if (!apiResponse.ok) {
      throw new Error(`API returned status ${apiResponse.status}`);
    }
    const result = await apiResponse.json();
    console.log('📥 Raw response:', JSON.stringify(result, null, 2));
    // ============================================
    // ✅ HANDLE WRAPPER + DIRECT DATA ACCESS
    // ============================================
    let apiData = result;
    // If wrapped in {success: true, data: {...}}
    if (result.success === true && result.data) {
      console.log('🔧 Detected wrapped response, unwrapping...');
      apiData = result.data;
    }
    // Check error (after unwrap)
    if (apiData.error !== 'false') {
      throw new Error(apiData.message || 'API returned an error');
    }
    // Check code (after unwrap)
    if (apiData.code !== '200') {
      throw new Error(apiData.message || `Invalid status code: ${apiData.code}`);
    }
    // ✅ FIX: After unwrap, 'response' is directly in apiData
    if (!apiData.response || !Array.isArray(apiData.response) || apiData.response.length === 0) {
      throw new Error('No E-way bill data found in response');
    }
    const firstResponse = apiData.response[0]; // ✅ Direct access
    if (!firstResponse || firstResponse.responseStatus !== 'SUCCESS') {
      throw new Error(firstResponse?.message || 'E-way bill not found');
    }
    if (!firstResponse.response) {
      throw new Error('E-way bill details missing');
    }
    // Extract data
    const ewayData = firstResponse.response;
    const details = {
      number: eway_bill_number,
      valid_until: ewayData.validUpto,
      generated_date: ewayData.ewayBillDate,
      status: ewayData.status,
      vehicle_number: ewayData.VehiclListDetails?.[0]?.vehicleNo || null,
      hsn_code: ewayData.hsnCode || null,
      from_pincode: ewayData.fromPincode || null,
      to_pincode: ewayData.toPincode || null,
      raw_data: ewayData
    };
    console.log('✅ E-way bill extracted successfully');
    console.log('   Number:', details.number);
    console.log('   Valid Until:', details.valid_until);
    console.log('   Status:', details.status);
    return new Response(JSON.stringify({
      success: true,
      data: details
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
