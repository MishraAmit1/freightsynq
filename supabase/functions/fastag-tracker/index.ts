// supabase/functions/track-fastag/index.ts - Updated

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Max-Age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const { vehicleNumber, bookingId } = await req.json();

    if (!vehicleNumber) {
      throw new Error('Vehicle number is required');
    }

    console.log('Tracking vehicle:', vehicleNumber);

    // Check if we should use mock data (for testing)
    const useMockData = Deno.env.get('USE_MOCK_DATA') === 'true';

    let fastagData = [];
    let isMockData = false;

    if (useMockData) {
      // Generate mock data
      isMockData = true;
      const now = new Date();
      fastagData = [
        {
          readerReadTime: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
          tollPlazaName: "Kherki Daula Toll Plaza",
          tollPlazaGeocode: "28.4820, 77.0214",
          vehicleType: "VC10",
          vehicleRegNo: vehicleNumber
        },
        {
          readerReadTime: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().replace('T', ' ').substring(0, 19),
          tollPlazaName: "Manesar Toll Plaza",
          tollPlazaGeocode: "28.3517, 76.9366",
          vehicleType: "VC10",
          vehicleRegNo: vehicleNumber
        }
      ];
    } else {
      // Call real FASTag API
      const fastagResponse = await fetch('https://apisathi.com/api/v1/fastagTracking', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': Deno.env.get('FASTAG_API_KEY') || '386a7436-019e-4938-a8d8-be7690eef4cc'
        },
        body: JSON.stringify({
          vehiclenumber: vehicleNumber
        })
      });

      const responseText = await fastagResponse.text();
      console.log('API Response:', responseText);

      try {
        fastagData = JSON.parse(responseText);
      } catch (e) {
        console.error('Failed to parse API response:', e);
        throw new Error('Invalid API response format');
      }
    }

    // Log API call
    if (bookingId) {
      await supabase
        .from('fastag_api_logs')
        .insert({
          vehicle_number: vehicleNumber,
          booking_id: bookingId,
          api_provider: 'ApiSathi',
          status: 'SUCCESS',
          records_found: fastagData.length,
          api_cost: isMockData ? 0 : 4,
          response_time: new Date().toISOString()
        });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: fastagData,
        vehicleNumber: vehicleNumber,
        isMockData: isMockData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('Function error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to track vehicle',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );
  }
});