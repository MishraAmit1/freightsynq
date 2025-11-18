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
    isMockData?: boolean;
    newRecords?: number;
}> {
    try {
        console.log('🔍 trackVehicle START', { bookingId, assignmentDate });

        // Get vehicle assignment details FIRST
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

        if (assignmentError) {
            console.error('❌ Assignment Error:', assignmentError);
            throw assignmentError;
        }

        if (!assignment) {
            throw new Error('No active vehicle assignment found');
        }

        const vehicleNumber = assignment.vehicle_type === 'OWNED'
            ? assignment.owned_vehicles?.vehicle_number
            : assignment.hired_vehicles?.vehicle_number;

        if (!vehicleNumber) {
            throw new Error('Vehicle number not found');
        }

        console.log('🚚 Vehicle:', vehicleNumber);
        console.log('📅 Assignment Time:', assignment.assigned_at);

        // Check rate limiting
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
                console.log('⏱️ Rate limited:', waitTime, 'seconds');

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

        // Call Edge Function
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

        let newRecords = 0;

        if (fastagData?.success && fastagData?.data && fastagData.data.length > 0) {
            const apiCrossings = fastagData.data;
            console.log(`\n📊 Processing ${apiCrossings.length} crossings from API\n`);

            // ✅ NO DATE FILTERING - Process ALL crossings
            for (let i = 0; i < apiCrossings.length; i++) {
                const crossing = apiCrossings[i];

                try {
                    console.log(`\n[${i + 1}/${apiCrossings.length}] 🏁 ${crossing.tollPlazaName}`);
                    console.log(`   📅 Time: ${crossing.readerReadTime}`);
                    console.log(`   📍 Coords: ${crossing.tollPlazaGeocode}`);

                    // Parse coordinates
                    const coords = crossing.tollPlazaGeocode.split(',');
                    const lat = parseFloat(coords[0]?.trim());
                    const lng = parseFloat(coords[1]?.trim());

                    if (isNaN(lat) || isNaN(lng)) {
                        console.error(`   ❌ Invalid coordinates`);
                        continue;
                    }

                    console.log(`   ✅ Lat: ${lat}, Lng: ${lng}`);

                    // Parse time - Convert "2025-11-15 09:59:14.000" to ISO
                    let crossingTimeISO: string;

                    if (crossing.readerReadTime.includes(' ')) {
                        const [datePart, timePart] = crossing.readerReadTime.split(' ');
                        const timeOnly = timePart.split('.')[0]; // Remove milliseconds
                        crossingTimeISO = `${datePart}T${timeOnly}Z`;
                    } else {
                        crossingTimeISO = new Date(crossing.readerReadTime).toISOString();
                    }

                    console.log(`   🕐 ISO Time: ${crossingTimeISO}`);

                    // Check if exists
                    console.log(`   🔍 Checking if exists...`);
                    const { data: existingCrossing, error: checkError } = await supabase
                        .from('fastag_crossings')
                        .select('id')
                        .eq('booking_id', bookingId)
                        .eq('toll_plaza_name', crossing.tollPlazaName)
                        .eq('crossing_time', crossingTimeISO)
                        .maybeSingle();

                    if (checkError) {
                        console.error(`   ❌ Check error:`, checkError.message);
                        continue;
                    }

                    if (existingCrossing) {
                        console.log(`   ⏭️ Already exists (ID: ${existingCrossing.id})`);
                        continue;
                    }

                    console.log(`   ✅ New crossing - inserting...`);

                    // Prepare insert data
                    const insertData = {
                        booking_id: bookingId,
                        vehicle_assignment_id: assignment.id,
                        vehicle_number: vehicleNumber,
                        toll_plaza_name: crossing.tollPlazaName,
                        toll_plaza_geocode: crossing.tollPlazaGeocode,
                        latitude: lat,
                        longitude: lng,
                        crossing_time: crossingTimeISO,
                        vehicle_type: crossing.vehicleType || 'VC10',
                        api_response: crossing
                    };

                    console.log(`   💾 Insert Data:`, JSON.stringify(insertData, null, 2));

                    // Insert
                    const { data: newCrossing, error: insertError } = await supabase
                        .from('fastag_crossings')
                        .insert(insertData)
                        .select()
                        .single();

                    if (insertError) {
                        console.error(`   ❌ INSERT FAILED:`, insertError);
                        console.error(`   Code:`, insertError.code);
                        console.error(`   Message:`, insertError.message);
                        console.error(`   Details:`, insertError.details);
                        console.error(`   Hint:`, insertError.hint);
                        continue;
                    }

                    if (newCrossing) {
                        console.log(`   ✅ SAVED! ID: ${newCrossing.id}`);
                        newRecords++;

                        // Update assignment with latest crossing
                        if (i === 0) { // First is latest (API returns desc)
                            console.log(`   🔄 Updating assignment...`);
                            const { error: updateError } = await supabase
                                .from('vehicle_assignments')
                                .update({
                                    last_toll_crossed: crossing.tollPlazaName,
                                    last_toll_time: crossingTimeISO
                                })
                                .eq('id', assignment.id);

                            if (updateError) {
                                console.error(`   ⚠️ Assignment update failed:`, updateError.message);
                            }

                            // Update booking
                            const { error: bookingUpdateError } = await supabase
                                .from('bookings')
                                .update({
                                    last_tracked_at: new Date().toISOString(),
                                    last_known_location: crossing.tollPlazaName
                                })
                                .eq('id', bookingId);

                            if (bookingUpdateError) {
                                console.error(`   ⚠️ Booking update failed:`, bookingUpdateError.message);
                            }
                        }

                        // Add timeline
                        const { error: timelineError } = await supabase
                            .from('booking_timeline')
                            .insert({
                                booking_id: bookingId,
                                action: 'TOLL_CROSSED',
                                description: `Vehicle crossed ${crossing.tollPlazaName}`,
                                created_at: crossingTimeISO
                            });

                        if (timelineError) {
                            console.error(`   ⚠️ Timeline insert failed:`, timelineError.message);
                        }
                    }

                } catch (processingError: any) {
                    console.error(`   ❌ Processing error:`, processingError.message);
                }
            }

            console.log(`\n✅ Processing complete: ${newRecords} new crossings saved\n`);
        } else {
            console.log('📭 No data from API');
        }

        // Fetch all crossings
        console.log('📊 Fetching all crossings from DB...');
        const { data: allCrossings, error: fetchError } = await supabase
            .from('fastag_crossings')
            .select('*')
            .eq('booking_id', bookingId)
            .order('crossing_time', { ascending: true });

        if (fetchError) {
            console.error('❌ Fetch error:', fetchError);
        } else {
            console.log(`✅ Total in DB: ${allCrossings?.length || 0}`);
        }

        return {
            data: allCrossings || [],
            cached: false,
            isRealData: !fastagData?.isMockData,
            isMockData: fastagData?.isMockData || false,
            newRecords
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