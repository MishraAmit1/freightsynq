// =============================================
// RANDOM VEHICLE SEARCH API - WITH SIM SUPPORT
// =============================================

import { supabase } from '@/lib/supabase';

// =============================================
// INTERFACES
// =============================================

export interface TollCrossing {
    toll_plaza_name: string;
    latitude: number;
    longitude: number;
    crossing_time: string;
    vehicle_type?: string;
}

export interface SimLocation {
    latitude: number;
    longitude: number;
    location_name?: string;
    speed?: number;
    recorded_at: string;
}

export interface RandomSearch {
    id: string;
    vehicle_number: string | null;
    search_type: 'live' | 'journey';
    from_location?: string;
    to_location?: string;
    days_range?: number;
    toll_crossings: TollCrossing[];
    crossing_count: number;
    last_latitude?: number;
    last_longitude?: number;
    last_toll_name?: string;
    last_crossing_time?: string;
    searched_at: string;
    expires_at: string;
    // 🆕 NEW SIM Fields
    tracking_mode: 'FASTAG' | 'SIM';
    phone_number?: string;
    driver_name?: string;
}

// =============================================
// SAVE RANDOM SEARCH (FASTAG)
// =============================================

export const saveRandomSearch = async (params: {
    vehicleNumber: string;
    searchType: 'live' | 'journey';
    fromLocation?: string;
    toLocation?: string;
    daysRange?: number;
    tollCrossings: TollCrossing[];
}): Promise<string> => {
    try {
        const lastCrossing = params.tollCrossings[params.tollCrossings.length - 1];

        const { data, error } = await supabase.rpc('save_random_search', {
            p_vehicle_number: params.vehicleNumber,
            p_search_type: params.searchType,
            p_from_location: params.fromLocation || null,
            p_to_location: params.toLocation || null,
            p_days_range: params.daysRange || 1,
            p_toll_crossings: params.tollCrossings,
            p_last_latitude: lastCrossing?.latitude || null,
            p_last_longitude: lastCrossing?.longitude || null,
            p_last_toll_name: lastCrossing?.toll_plaza_name || null,
            p_last_crossing_time: lastCrossing?.crossing_time || null,
            p_tracking_mode: 'FASTAG',
            p_phone_number: null,
            p_driver_name: null,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Error saving random search:', error);
        throw error;
    }
};

// =============================================
// 🆕 SAVE SIM SEARCH
// =============================================

export const saveSimSearch = async (params: {
    phoneNumber: string;
    driverName?: string;
    vehicleNumber?: string;  // Optional - just for reference
    location: SimLocation;
}): Promise<string> => {
    try {
        // Convert SIM location to toll_crossings format for consistency
        const locationData: TollCrossing[] = [{
            toll_plaza_name: params.location.location_name || 'SIM Location',
            latitude: params.location.latitude,
            longitude: params.location.longitude,
            crossing_time: params.location.recorded_at,
        }];

        const { data, error } = await supabase.rpc('save_random_search', {
            p_vehicle_number: params.vehicleNumber || null,
            p_search_type: 'live',  // SIM is always live
            p_from_location: null,
            p_to_location: null,
            p_days_range: 1,
            p_toll_crossings: locationData,
            p_last_latitude: params.location.latitude,
            p_last_longitude: params.location.longitude,
            p_last_toll_name: params.location.location_name || 'SIM Location',
            p_last_crossing_time: params.location.recorded_at,
            p_tracking_mode: 'SIM',
            p_phone_number: params.phoneNumber,
            p_driver_name: params.driverName || null,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Error saving SIM search:', error);
        throw error;
    }
};

// =============================================
// FETCH RANDOM SEARCHES
// =============================================

export const fetchRandomSearches = async (): Promise<RandomSearch[]> => {
    try {
        const { data, error } = await supabase.rpc('get_random_searches');

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.out_id,
            vehicle_number: row.out_vehicle_number,
            search_type: row.out_search_type,
            from_location: row.out_from_location,
            to_location: row.out_to_location,
            days_range: row.out_days_range,
            toll_crossings: row.out_toll_crossings || [],
            crossing_count: row.out_crossing_count,
            last_latitude: row.out_last_latitude,
            last_longitude: row.out_last_longitude,
            last_toll_name: row.out_last_toll_name,
            last_crossing_time: row.out_last_crossing_time,
            searched_at: row.out_searched_at,
            expires_at: row.out_expires_at,
            // 🆕 NEW SIM Fields
            tracking_mode: row.out_tracking_mode || 'FASTAG',
            phone_number: row.out_phone_number,
            driver_name: row.out_driver_name,
        }));
    } catch (error: any) {
        console.error('Error fetching random searches:', error);
        throw error;
    }
};

// =============================================
// DELETE RANDOM SEARCH
// =============================================

export const deleteRandomSearch = async (searchId: string): Promise<boolean> => {
    try {
        const { data, error } = await supabase.rpc('delete_random_search', {
            p_search_id: searchId,
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Error deleting random search:', error);
        throw error;
    }
};

// =============================================
// 🆕 REGISTER SIM TRACKING (Random Search)
// =============================================

export const registerSimTracking = async (params: {
    phoneNumber: string;
    driverName?: string;
}): Promise<{
    success: boolean;
    contactId?: string;
    error?: string;
}> => {
    try {
        console.log('📱 Registering SIM for random search:', params.phoneNumber);

        const { data, error } = await supabase.functions.invoke('register-sim-tracking', {
            body: {
                phoneNumber: params.phoneNumber,
                driverName: params.driverName || 'Unknown Driver',
                // No bookingId for random search
                isRandomSearch: true,
            }
        });

        if (error) throw error;

        if (data?.success) {
            return {
                success: true,
                contactId: data.data?.lorryinfoContactId,
            };
        } else {
            throw new Error(data?.error || 'Registration failed');
        }
    } catch (error: any) {
        console.error('Error registering SIM:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

// =============================================
// 🆕 FETCH SIM LOCATION (Random Search)
// =============================================

// Update fetchSimLocation function:

export const fetchSimLocation = async (params: {
    phoneNumber: string;
    searchId?: string;
    isRandomSearch?: boolean;        // 🆕 Add this
    lorryinfoContactId?: string;     // 🆕 Add this
}): Promise<{
    success: boolean;
    location?: SimLocation;
    consentPending?: boolean;
    error?: string;
}> => {
    try {
        console.log('📍 Fetching SIM location for:', params.phoneNumber);

        const { data, error } = await supabase.functions.invoke('fetch-sim-location', {
            body: {
                phoneNumber: params.phoneNumber,
                isRandomSearch: params.isRandomSearch ?? true,  // 🆕 Default true for random
                lorryinfoContactId: params.lorryinfoContactId,  // 🆕 Pass contact ID
            }
        });

        if (error) throw error;

        if (data?.success) {
            const current = data.current;
            
            return {
                success: true,
                location: current ? {
                    latitude: current.latitude,
                    longitude: current.longitude,
                    location_name: current.location_name,
                    speed: current.speed,
                    recorded_at: current.timestamp || new Date().toISOString(),
                } : undefined,
                consentPending: data.consent_pending,
            };
        } else {
            throw new Error(data?.error || 'Location fetch failed');
        }
    } catch (error: any) {
        console.error('Error fetching SIM location:', error);
        return {
            success: false,
            error: error.message,
        };
    }
};

// =============================================
// 🆕 UPDATE SIM SEARCH LOCATION
// =============================================

export const updateSimSearchLocation = async (
    searchId: string,
    location: SimLocation
): Promise<boolean> => {
    try {
        // Get existing search
        const searches = await fetchRandomSearches();
        const existingSearch = searches.find(s => s.id === searchId);
        
        if (!existingSearch) {
            throw new Error('Search not found');
        }

        // Add new location to toll_crossings array
        const newCrossing: TollCrossing = {
            toll_plaza_name: location.location_name || 'SIM Location',
            latitude: location.latitude,
            longitude: location.longitude,
            crossing_time: location.recorded_at,
        };

        const updatedCrossings = [...existingSearch.toll_crossings, newCrossing];

        // Update in database
        const { error } = await supabase
            .from('vehicle_search_history')
            .update({
                toll_crossings: updatedCrossings,
                crossing_count: updatedCrossings.length,
                last_latitude: location.latitude,
                last_longitude: location.longitude,
                last_toll_name: location.location_name || 'SIM Location',
                last_crossing_time: location.recorded_at,
                searched_at: new Date().toISOString(),
            })
            .eq('id', searchId);

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error('Error updating SIM search location:', error);
        throw error;
    }
};


// =============================================
// 🆕 CHECK EXISTING SIM REGISTRATION (No API cost)
// =============================================

export const checkExistingSimRegistration = async (phoneNumber: string): Promise<{
    exists: boolean;
    contactId?: string;
    consentPending?: boolean;
    consentApproved?: boolean;
    driverName?: string;
    expiresAt?: string;
}> => {
    try {
        const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, '');
        console.log('🔍 Checking existing registration for:', cleanPhone);

        // Check in sim_tracking_registrations table
        const { data, error } = await supabase
            .from('sim_tracking_registrations')
            .select('*')
            .eq('phone_number', cleanPhone)
            .eq('status', 'ACTIVE')
            .gt('expires_at', new Date().toISOString())
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        if (error) {
            console.error('Error checking registration:', error);
            return { exists: false };
        }

        if (!data) {
            console.log('📭 No existing registration found');
            return { exists: false };
        }

        console.log('✅ Found existing registration:', data);

        // Determine consent status
        const consentPending = data.consent_status === 'PENDING' || !data.consent_approved;
        const consentApproved = data.consent_approved === true;

        return {
            exists: true,
            contactId: data.lorryinfo_contact_id,
            consentPending,
            consentApproved,
            driverName: data.driver_name,
            expiresAt: data.expires_at,
        };

    } catch (error: any) {
        console.error('Error in checkExistingSimRegistration:', error);
        return { exists: false };
    }
};