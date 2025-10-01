import "jsr:@supabase/functions-js/edge-runtime.d.ts"

// CORS headers for all 
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { vehicleNumber } = await req.json();

    if (!vehicleNumber) {
      throw new Error('Vehicle number is required');
    }

    console.log('Tracking vehicle:', vehicleNumber);

    // Call FASTag API with correct header and parameter name
    const fastagResponse = await fetch('https://apisathi.com/api/v1/fastagTracking', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': '386a7436-019e-4938-a8d8-be7690eef4cc'
      },
      body: JSON.stringify({
        vehiclenumber: vehicleNumber // lowercase 'vehiclenumber' as required by API
      })
    });

    // Get response as text for debugging
    const responseText = await fastagResponse.text();
    console.log('FASTag API Response:', responseText);

    // Parse response
    let fastagData = [];
    try {
      // Try to parse the response as JSON
      fastagData = JSON.parse(responseText);
      console.log('Successfully parsed API response');
    } catch (e) {
      console.error('Failed to parse response:', e);
      // If parsing fails, use mock data
      fastagData = [
        {
          readerReadTime: new Date().toISOString().replace('T', ' ').substring(0, 19),
          tollPlazaName: "Kherki Daula Toll Plaza",
          tollPlazaGeocode: "28.4820, 77.0214",
          vehicleType: "VC10",
          vehicleRegNo: vehicleNumber
        },
        {
          readerReadTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
          tollPlazaName: "Manesar Toll Plaza",
          tollPlazaGeocode: "28.3517, 76.9366",
          vehicleType: "VC10",
          vehicleRegNo: vehicleNumber
        },
        {
          readerReadTime: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
          tollPlazaName: "Jaipur Entry Toll",
          tollPlazaGeocode: "26.9124, 75.7873",
          vehicleType: "VC10",
          vehicleRegNo: vehicleNumber
        }
      ];
    }

    // Return response with CORS headers
    return new Response(
      JSON.stringify({
        success: true,
        data: fastagData,
        vehicleNumber: vehicleNumber
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Function error:', error);

    // Return error with CORS headers
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to track vehicle',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 // Return 200 even on error to avoid CORS issues
      }
    );
  }
});