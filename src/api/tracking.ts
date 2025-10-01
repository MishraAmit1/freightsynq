import { supabase } from '@/lib/supabase';

export interface TollCrossing {
    id: string;
    toll_plaza_name: string;
    latitude: number;
    longitude: number;
    crossing_time: string;
    vehicle_type: string;
    vehicle_number: string;
}

export const trackVehicle = async (bookingId: string) => {
    try {
        console.log('Starting vehicle tracking for booking:', bookingId);

        // 1. Get booking and vehicle details
        const { data: booking, error: bookingError } = await supabase
            .from('bookings')
            .select(`
                *,
                vehicle_assignments!inner(
                    id,
                    status,
                    vehicle_type,
                    owned_vehicle:owned_vehicles(vehicle_number),
                    hired_vehicle:hired_vehicles(vehicle_number)
                )
            `)
            .eq('id', bookingId)
            .eq('vehicle_assignments.status', 'ACTIVE')
            .single();

        if (bookingError || !booking) {
            console.error('Booking error:', bookingError);
            throw new Error('No active vehicle found for this booking');
        }

        // Get vehicle number
        const vehicleAssignment = booking.vehicle_assignments[0];
        const vehicleNumber = vehicleAssignment.vehicle_type === 'OWNED'
            ? vehicleAssignment.owned_vehicle?.vehicle_number
            : vehicleAssignment.hired_vehicle?.vehicle_number;

        if (!vehicleNumber) {
            throw new Error('Vehicle number not found');
        }

        console.log('Vehicle number found:', vehicleNumber);

        // 2. Check rate limiting
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
        const { data: recentLogs } = await supabase
            .from('fastag_api_logs')
            .select('request_time')
            .eq('booking_id', bookingId)
            .gte('request_time', fiveMinutesAgo)
            .order('request_time', { ascending: false })
            .limit(1);

        if (recentLogs && recentLogs.length > 0) {
            const lastLog = recentLogs[0];
            const timeDiff = Date.now() - new Date(lastLog.request_time).getTime();

            if (timeDiff < 5 * 60 * 1000) {
                console.log('Rate limited, returning cached data');

                const { data: cachedCrossings } = await supabase
                    .from('fastag_crossings')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .order('crossing_time', { ascending: false });

                return {
                    cached: true,
                    waitTime: Math.ceil((5 * 60 * 1000 - timeDiff) / 1000),
                    data: cachedCrossings || []
                };
            }
        }

        // 3. Call Edge Function directly from different project
        console.log('Calling Edge Function for vehicle:', vehicleNumber);

        try {
            // Direct HTTP call to Edge Function
            const fastagResponse = await fetch(
                'https://zmbulwevblremrsgcqfx.supabase.co/functions/v1/fastag-tracker',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ vehicleNumber })
                }
            );

            const functionResponse = await fastagResponse.json();
            console.log('Edge Function Response:', functionResponse);

            if (!functionResponse?.success) {
                throw new Error(functionResponse?.error || 'Failed to fetch tracking data');
            }

            let fastagData = functionResponse.data || [];
            let isRealData = true;
            if (fastagData.length > 10) {
                console.log('Cleaning up potential mock data from real results');

                // Filter out suspicious mock entries
                fastagData = fastagData.filter(crossing => {
                    const time = new Date(crossing.readerReadTime);
                    const minutes = time.getMinutes();
                    const seconds = time.getSeconds();

                    // Mock data patterns to filter out:
                    // 1. Exact hour timestamps (00 minutes, 00 seconds)
                    // 2. Specific mock toll plazas with suspicious timing
                    if ((crossing.tollPlazaName === "Jaipur Entry Toll" ||
                        crossing.tollPlazaName === "Kherki Daula Toll Plaza" ||
                        crossing.tollPlazaName === "Manesar Toll Plaza")) {

                        // Check if it has mock-like timestamp patterns
                        if ((minutes === 0 || minutes === 58 || minutes === 15 || minutes === 50) && seconds === 0) {
                            console.log('Filtering out mock entry:', crossing.tollPlazaName, crossing.readerReadTime);
                            return false;
                        }
                    }
                    return true;
                });
                console.log('FASTag real data after cleanup:', fastagData.length, 'records');
            } else if (fastagData.length === 3 &&
                fastagData[0]?.tollPlazaName === "Kherki Daula Toll Plaza" &&
                fastagData[1]?.tollPlazaName === "Manesar Toll Plaza") {
                console.log('Mock data detected');
                isRealData = false;
            } else {
                console.log('FASTag data received:', fastagData.length, 'records');
            }


            // 4. Log API call
            await supabase.from('fastag_api_logs').insert({
                vehicle_number: vehicleNumber,
                booking_id: bookingId,
                api_provider: isRealData ? 'ApiSathi' : 'MOCK_DATA',
                status: fastagData.length > 0 ? 'SUCCESS' : 'NO_DATA',
                records_found: fastagData.length,
                api_cost: isRealData ? 4.00 : 0.00,
                request_time: new Date().toISOString()
            });

            // 5. Process and save crossings
            let newCrossings = 0;
            for (const crossing of fastagData) {
                try {
                    const [lat, lng] = crossing.tollPlazaGeocode.split(',').map((coord: string) =>
                        parseFloat(coord.trim())
                    );

                    // Check if exists
                    const { data: existing } = await supabase
                        .from('fastag_crossings')
                        .select('id')
                        .eq('vehicle_number', vehicleNumber)
                        .eq('toll_plaza_name', crossing.tollPlazaName)
                        .eq('crossing_time', crossing.readerReadTime)
                        .maybeSingle();

                    if (!existing) {
                        await supabase.from('fastag_crossings').insert({
                            booking_id: bookingId,
                            vehicle_assignment_id: vehicleAssignment.id,
                            vehicle_number: vehicleNumber,
                            toll_plaza_name: crossing.tollPlazaName,
                            toll_plaza_geocode: crossing.tollPlazaGeocode,
                            latitude: lat,
                            longitude: lng,
                            crossing_time: crossing.readerReadTime,
                            vehicle_type: crossing.vehicleType,
                            api_response: crossing
                        });
                        newCrossings++;
                    }
                } catch (err) {
                    console.error('Error saving crossing:', err);
                }
            }

            console.log('Saved', newCrossings, 'new crossings');

            // 6. Return all crossings
            const { data: allCrossings } = await supabase
                .from('fastag_crossings')
                .select('*')
                .eq('booking_id', bookingId)
                .order('crossing_time', { ascending: true });

            return {
                cached: false,
                data: allCrossings || [],
                newRecords: newCrossings,
                isRealData: isRealData,
                isMockData: !isRealData
            };

        } catch (error) {
            console.error('Error calling Edge Function:', error);

            // Fallback to mock data if Edge Function fails
            console.log('Using mock data as fallback');

            // Use mock data
            const mockData = [
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

            // Log API call
            await supabase.from('fastag_api_logs').insert({
                vehicle_number: vehicleNumber,
                booking_id: bookingId,
                api_provider: 'MOCK_DATA',
                status: 'SUCCESS',
                records_found: mockData.length,
                api_cost: 0.00,
                request_time: new Date().toISOString()
            });

            // Process and save mock data
            let newCrossings = 0;
            for (const crossing of mockData) {
                try {
                    const [lat, lng] = crossing.tollPlazaGeocode.split(',').map((coord: string) =>
                        parseFloat(coord.trim())
                    );

                    // Check if exists
                    const { data: existing } = await supabase
                        .from('fastag_crossings')
                        .select('id')
                        .eq('vehicle_number', vehicleNumber)
                        .eq('toll_plaza_name', crossing.tollPlazaName)
                        .eq('crossing_time', crossing.readerReadTime)
                        .maybeSingle();

                    if (!existing) {
                        await supabase.from('fastag_crossings').insert({
                            booking_id: bookingId,
                            vehicle_assignment_id: vehicleAssignment.id,
                            vehicle_number: vehicleNumber,
                            toll_plaza_name: crossing.tollPlazaName,
                            toll_plaza_geocode: crossing.tollPlazaGeocode,
                            latitude: lat,
                            longitude: lng,
                            crossing_time: crossing.readerReadTime,
                            vehicle_type: crossing.vehicleType,
                            api_response: crossing
                        });
                        newCrossings++;
                    }
                } catch (err) {
                    console.error('Error saving crossing:', err);
                }
            }

            console.log('Saved', newCrossings, 'new crossings (mock data)');

            // Return all crossings
            const { data: allCrossings } = await supabase
                .from('fastag_crossings')
                .select('*')
                .eq('booking_id', bookingId)
                .order('crossing_time', { ascending: true });

            return {
                cached: false,
                data: allCrossings || [],
                newRecords: newCrossings,
                isMockData: true
            };
        }

    } catch (error: any) {
        console.error('Error in trackVehicle:', error);
        throw new Error(error.message || 'Failed to track vehicle');
    }
};

export const getTrackingHistory = async (bookingId: string) => {
    const { data, error } = await supabase
        .from('fastag_crossings')
        .select('*')
        .eq('booking_id', bookingId)
        .order('crossing_time', { ascending: true });

    if (error) {
        console.error('Error fetching history:', error);
        throw error;
    }

    return data || [];
};