// =============================================
// RANDOM VEHICLE SEARCH API
// =============================================

import { supabase } from '@/lib/supabase';

export interface RandomSearch {
    id: string;
    vehicle_number: string;
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
}

export interface TollCrossing {
    toll_plaza_name: string;
    latitude: number;
    longitude: number;
    crossing_time: string;
    vehicle_type?: string;
}

/**
 * Save random vehicle search to history
 */
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
        });

        if (error) throw error;
        return data;
    } catch (error: any) {
        console.error('Error saving random search:', error);
        throw error;
    }
};

/**
 * Fetch user's random search history
 */
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
        }));
    } catch (error: any) {
        console.error('Error fetching random searches:', error);
        throw error;
    }
};

/**
 * Delete a random search from history
 */
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