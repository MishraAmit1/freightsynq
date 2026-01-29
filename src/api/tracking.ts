// api/tracking.ts - COMPLETE FIX

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
    newRecords?: number;
}> {
    try {
        console.log('🔍 trackVehicle START', { bookingId, assignmentDate });

        // Get vehicle assignment
        const { data: assignment, error: assignmentError } = await supabase
            .from('vehicle_assignments')
            .select(`
                *,
                owned_vehicles!owned_vehicle_fkey(vehicle_number),
                hired_vehicles!hired_vehicle_fkey(vehicle_number)
            `)
            .eq('booking_id', bookingId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        if (assignmentError || !assignment) {
            throw new Error('No active vehicle assignment found');
        }

        const vehicleNumber = assignment.vehicle_type === 'OWNED'
            ? assignment.owned_vehicles?.vehicle_number
            : assignment.hired_vehicles?.vehicle_number;

        if (!vehicleNumber) {
            throw new Error('Vehicle number not found');
        }

        // ✅ Rate limiting check
        const { data: lastLog } = await supabase
            .from('fastag_api_logs')
            .select('request_time')
            .eq('booking_id', bookingId)
            .eq('status', 'SUCCESS')
            .order('request_time', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (lastLog) {
            const timeSinceLastCall = Date.now() - new Date(lastLog.request_time).getTime();
            const thirtySeconds = 30 * 1000;

            if (timeSinceLastCall < thirtySeconds) {
                const waitTime = Math.ceil((thirtySeconds - timeSinceLastCall) / 1000);

                const { data: cachedCrossings } = await supabase
                    .from('fastag_crossings')
                    .select('*')
                    .eq('booking_id', bookingId)
                    .order('crossing_time', { ascending: true });

                return {
                    data: cachedCrossings || [],
                    cached: true,
                    waitTime
                };
            }
        }

        // ✅ Call Edge Function (it handles insert)
        console.log('📡 Calling Edge Function...');
        const { data: fastagData, error: edgeFunctionError } = await supabase.functions.invoke('track-fastag', {
            body: {
                vehicleNumber: vehicleNumber,
                bookingId: bookingId
            }
        });

        if (edgeFunctionError) {
            console.error('❌ Edge Function Error:', edgeFunctionError);
            throw edgeFunctionError;
        }

        console.log('📦 Edge Function Response:', fastagData);

        // ✅ FETCH (not insert) - Edge Function already inserted
        const { data: allCrossings, error: fetchError } = await supabase
            .from('fastag_crossings')
            .select('*')
            .eq('booking_id', bookingId)
            .order('crossing_time', { ascending: true });

        if (fetchError) {
            console.error('❌ Fetch error:', fetchError);
        }

        console.log(`✅ Total in DB: ${allCrossings?.length || 0}`);

        // ✅✅✅ NEW CODE: UPDATE VEHICLE ASSIGNMENT WITH LATEST CROSSING ✅✅✅
        if (allCrossings && allCrossings.length > 0 && fastagData?.newRecords > 0) {
            // Get the latest crossing (last in array since ordered ascending)
            const latestCrossing = allCrossings[allCrossings.length - 1];
            
            console.log('🔄 Updating vehicle assignment with latest crossing...');
            
            const { error: updateError } = await supabase
                .from('vehicle_assignments')
                .update({
                    last_toll_crossed: latestCrossing.toll_plaza_name,
                    last_toll_time: latestCrossing.crossing_time  // ✅ Using UTC time from DB
                })
                .eq('id', assignment.id);
            
            if (updateError) {
                console.error('⚠️ Failed to update vehicle assignment:', updateError);
            } else {
                console.log('✅ Vehicle assignment updated with latest toll');
            }

            // ✅ Also update booking's last tracked info
            const { error: bookingUpdateError } = await supabase
                .from('bookings')
                .update({
                    last_tracked_at: new Date().toISOString(),
                    last_known_location: latestCrossing.toll_plaza_name
                })
                .eq('id', bookingId);

            if (bookingUpdateError) {
                console.error('⚠️ Failed to update booking:', bookingUpdateError);
            }
        }
        // ✅✅✅ END NEW CODE ✅✅✅

        return {
            data: allCrossings || [],
            cached: false,
            isRealData: !fastagData?.isMockData,
            isMockData: fastagData?.isMockData || false,
            newRecords: fastagData?.newRecords || 0
        };

    } catch (error: any) {
        console.error('❌ MAIN ERROR:', error);
        throw error;
    }
}

export async function getTrackingHistory(bookingId: string): Promise<TollCrossing[]> {
    try {
        const { data, error } = await supabase
            .from('fastag_crossings')
            .select('*')
            .eq('booking_id', bookingId)
            .order('crossing_time', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error fetching tracking history:', error);
        return [];
    }
}