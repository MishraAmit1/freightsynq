// api/tracking.ts - Updated version

import { supabase } from '@/lib/supabase';

export interface TollCrossing {
    id?: string;
    booking_id: string;
    vehicle_number: string;
    toll_plaza_name: string;
    toll_plaza_geocode: string;
    latitude: number;
    longitude: number;
    crossing_time: string;
    vehicle_type?: string;
    api_response?: any;
}

export async function trackVehicle(
    bookingId: string,
    assignmentDate?: string
): Promise<{
    data: TollCrossing[];
    cached: boolean;
    waitTime?: number;
    isRealData?: boolean;
    isMockData?: boolean;
    newRecords?: number;
}> {
    try {
        // Check if booking is eligible for tracking
        const { data: booking } = await supabase
            .from('bookings')
            .select('status, tracking_enabled')
            .eq('id', bookingId)
            .maybeSingle();

        if (!booking?.tracking_enabled) {
            throw new Error('Tracking is disabled for this booking');
        }

        if (booking.status === 'DELIVERED' || booking.status === 'CANCELLED') {
            throw new Error(`Cannot track ${booking.status.toLowerCase()} bookings`);
        }

        // Get vehicle assignment details
        const { data: assignment } = await supabase
            .from('vehicle_assignments')
            .select(`
                *,
                owned_vehicles!owned_vehicle_fkey(vehicle_number),
                hired_vehicles!hired_vehicle_fkey(vehicle_number)
            `)
            .eq('booking_id', bookingId)
            .eq('status', 'ACTIVE')
            .single();

        if (!assignment) {
            throw new Error('No active vehicle assignment found');
        }

        const vehicleNumber = assignment.vehicle_type === 'OWNED'
            ? assignment.owned_vehicles?.vehicle_number
            : assignment.hired_vehicles?.vehicle_number;

        if (!vehicleNumber) {
            throw new Error('Vehicle number not found');
        }

        // Check rate limiting (30 seconds between calls)
        const { data: lastLog } = await supabase
            .from('fastag_api_logs')
            .select('request_time')
            .eq('booking_id', bookingId)
            .eq('status', 'SUCCESS')
            .order('request_time', { ascending: false })
            .limit(1)
            .single();

        if (lastLog) {
            const timeSinceLastCall = Date.now() - new Date(lastLog.request_time).getTime();
            const thirtySeconds = 30 * 1000;

            if (timeSinceLastCall < thirtySeconds) {
                const waitTime = Math.ceil((thirtySeconds - timeSinceLastCall) / 1000);

                // Return cached data
                const { data: cachedCrossings } = await supabase
                    .from('fastag_crossings')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .gte('crossing_time', assignmentDate || assignment.assigned_at)
                    .order('crossing_time', { ascending: true });

                return {
                    data: cachedCrossings || [],
                    cached: true,
                    waitTime
                };
            }
        }

        // Call Edge Function for FASTag data
        const { data: fastagData, error } = await supabase.functions.invoke('track-fastag', {
            body: {
                vehicleNumber: vehicleNumber,
                bookingId: bookingId  // Add this
            }
        });

        if (error) throw error;

        let crossings: TollCrossing[] = [];
        let isRealData = false;
        let isMockData = false;
        let newRecords = 0;

        if (fastagData?.success && fastagData?.data) {
            const apiCrossings = fastagData.data;
            isRealData = !fastagData.isMockData;
            isMockData = fastagData.isMockData || false;

            // Filter crossings based on assignment date
            const filteredCrossings = apiCrossings.filter((crossing: any) => {
                const crossingTime = new Date(crossing.readerReadTime);
                const assignmentTime = new Date(assignmentDate || assignment.assigned_at);
                return crossingTime >= assignmentTime;
            });

            // Process and save each crossing
            for (const crossing of filteredCrossings) {
                const [lat, lng] = crossing.tollPlazaGeocode.split(',').map(Number);

                // Check if crossing already exists
                const { data: existingCrossing } = await supabase
                    .from('fastag_crossings')
                    .select('id')
                    .eq('vehicle_number', vehicleNumber)
                    .eq('toll_plaza_name', crossing.tollPlazaName)
                    .eq('crossing_time', crossing.readerReadTime)
                    .single();

                if (!existingCrossing) {
                    // Insert new crossing
                    const { data: newCrossing } = await supabase
                        .from('fastag_crossings')
                        .insert({
                            booking_id: bookingId,
                            vehicle_assignment_id: assignment.id,
                            vehicle_number: vehicleNumber,
                            toll_plaza_name: crossing.tollPlazaName,
                            toll_plaza_geocode: crossing.tollPlazaGeocode,
                            latitude: lat,
                            longitude: lng,
                            crossing_time: crossing.readerReadTime,
                            vehicle_type: crossing.vehicleType,
                            api_response: crossing
                        })
                        .select()
                        .single();

                    if (newCrossing) {
                        crossings.push(newCrossing);
                        newRecords++;
                    }

                    // Update vehicle assignment with last toll info
                    await supabase
                        .from('vehicle_assignments')
                        .update({
                            last_toll_crossed: crossing.tollPlazaName,
                            last_toll_time: crossing.readerReadTime
                        })
                        .eq('id', assignment.id);

                    // Update booking with last location
                    await supabase
                        .from('bookings')
                        .update({
                            last_tracked_at: new Date().toISOString(),
                            last_known_location: crossing.tollPlazaName
                        })
                        .eq('id', bookingId)
                        .maybeSingle();

                    // Add to booking timeline
                    await supabase
                        .from('booking_timeline')
                        .insert({
                            booking_id: bookingId,
                            action: 'TOLL_CROSSED',
                            description: `Vehicle crossed ${crossing.tollPlazaName}`
                        });
                }
            }
        }

        // Get all crossings for this booking (filtered by assignment date)
        const { data: allCrossings } = await supabase
            .from('fastag_crossings')
            .select('*')
            .eq('booking_id', bookingId)
            .gte('crossing_time', assignmentDate || assignment.assigned_at)
            .order('crossing_time', { ascending: true });

        return {
            data: allCrossings || [],
            cached: false,
            isRealData,
            isMockData,
            newRecords
        };

    } catch (error: any) {
        console.error('Tracking error:', error);
        throw error;
    }
}

export async function getTrackingHistory(bookingId: string): Promise<TollCrossing[]> {
    try {
        // Get assignment date for filtering
        const { data: assignment } = await supabase
            .from('vehicle_assignments')
            .select('assigned_at')
            .eq('booking_id', bookingId)
            .eq('status', 'ACTIVE')
            .single();

        const { data, error } = await supabase
            .from('fastag_crossings')
            .select('*')
            .eq('booking_id', bookingId)
            .gte('crossing_time', assignment?.assigned_at || '1900-01-01')
            .order('crossing_time', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching tracking history:', error);
        return [];
    }
}

// Auto-end tracking for delivered bookings
export async function autoEndTracking() {
    try {
        // Find all delivered bookings with active tracking
        const { data: deliveredBookings } = await supabase
            .from('bookings')
            .select('id')
            .eq('status', 'DELIVERED')
            .eq('tracking_enabled', true);

        if (deliveredBookings) {
            for (const booking of deliveredBookings) {
                // Disable tracking
                await supabase
                    .from('bookings')
                    .update({ tracking_enabled: false })
                    .eq('id', booking.id);

                // End vehicle assignment tracking
                await supabase
                    .from('vehicle_assignments')
                    .update({
                        tracking_end_time: new Date().toISOString(),
                        status: 'COMPLETED'
                    })
                    .eq('booking_id', booking.id)
                    .eq('status', 'ACTIVE');
            }
        }
    } catch (error) {
        console.error('Error in auto-end tracking:', error);
    }
}