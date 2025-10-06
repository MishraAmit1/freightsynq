// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req: Request) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { vehicleNumber } = await req.json()

        if (!vehicleNumber) {
            throw new Error('Vehicle number is required')
        }

        console.log('Tracking vehicle:', vehicleNumber)

        // Call REAL FASTag API
        try {
            const fastagResponse = await fetch('https://apisathi.com/api/v1/fastagTracking', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': '386a7436-019e-4938-a8d8-be7690eef4cc'
                },
                body: JSON.stringify({
                    vehiclenumber: vehicleNumber
                })
            })

            const responseText = await fastagResponse.text()
            console.log('API Response Status:', fastagResponse.status)

            let fastagData = []

            try {
                fastagData = JSON.parse(responseText)
                console.log('Successfully parsed', fastagData.length, 'crossings')

                // Return REAL API data
                return new Response(
                    JSON.stringify({
                        success: true,
                        data: fastagData,
                        vehicleNumber: vehicleNumber,
                        isMockData: false,
                        recordCount: fastagData.length
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    }
                )

            } catch (e) {
                console.error('Parse error:', e)

                // Return empty array if parsing fails
                return new Response(
                    JSON.stringify({
                        success: true,
                        data: [],
                        vehicleNumber: vehicleNumber,
                        isMockData: false,
                        parseError: true
                    }),
                    {
                        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                        status: 200,
                    }
                )
            }

        } catch (fetchError: any) {
            console.error('API call failed:', fetchError?.message || 'Unknown error')

            // Fallback to mock data if API fails
            const mockData = [
                {
                    readerReadTime: "2025-10-01 02:52:12",
                    tollPlazaName: "Pattana",
                    tollPlazaGeocode: "17.3970162,76.7061871",
                    vehicleType: "VC10",
                    vehicleRegNo: vehicleNumber
                },
                {
                    readerReadTime: "2025-09-30 19:52:38",
                    tollPlazaName: "Halaharvi TOLL PLAZA",
                    tollPlazaGeocode: "15.819781,77.454008",
                    vehicleType: "VC10",
                    vehicleRegNo: vehicleNumber
                }
            ]

            return new Response(
                JSON.stringify({
                    success: true,
                    data: mockData,
                    vehicleNumber: vehicleNumber,
                    isMockData: true,
                    apiError: fetchError?.message || 'API call failed'
                }),
                {
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                    status: 200,
                }
            )
        }

    } catch (mainError: any) {
        console.error('Main function error:', mainError?.message || 'Unknown error')

        return new Response(
            JSON.stringify({
                success: false,
                error: mainError?.message || 'Function failed',
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            }
        )
    }
})