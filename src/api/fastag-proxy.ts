// This will be your backend proxy endpoint
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
    try {
        const { vehicleNumber, bookingId } = await request.json();

        // Call FASTag API from backend (no CORS issue here)
        const fastagResponse = await fetch('https://apisathi.com/api/v1/fastagTracking', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'api-key': '386a7436-019e-4938-a8d8-be7690eef4cc'
            },
            body: JSON.stringify({ vehicleNumber })
        });

        const fastagData = await fastagResponse.json();

        return Response.json({
            success: true,
            data: fastagData
        });

    } catch (error) {
        console.error('FASTag API Error:', error);
        return Response.json({
            success: false,
            error: 'Failed to fetch tracking data'
        }, { status: 500 });
    }
}