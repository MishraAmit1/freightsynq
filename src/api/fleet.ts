// =============================================
// FLEET TRACKING API
// =============================================

import { supabase } from '@/lib/supabase';

export interface FleetVehicle {
    booking_id: string;
    booking_display_id: string;
    vehicle_number: string;
    vehicle_type: 'OWNED' | 'HIRED';
    from_location: string;
    to_location: string;
    last_toll_name: string;
    last_toll_lat: number;
    last_toll_lng: number;
    last_crossing_time: string;
    company_id: string;
}

export interface VehicleTollCrossing {
    crossing_id: string;
    toll_plaza_name: string;
    latitude: number;
    longitude: number;
    crossing_time: string;
    vehicle_type: string;
    booking_id: string | null;
    booking_display_id: string | null;
}

export interface GroupedVehicle {
    location: string;
    lat: number;
    lng: number;
    vehicles: FleetVehicle[];
    count: number;
}

/**
 * Fetch all IN_TRANSIT vehicles with their last toll crossing
 */
export const fetchFleetVehicles = async (): Promise<FleetVehicle[]> => {
    try {
        console.log('🚚 Fetching fleet vehicles...');

        const { data, error } = await supabase
            .rpc('get_fleet_vehicles');

        if (error) {
            console.error('❌ Error fetching fleet vehicles:', error);
            throw error;
        }

        console.log(`✅ Found ${data?.length || 0} vehicles in transit`);

        // Map to proper interface
        const vehicles: FleetVehicle[] = (data || []).map((v: any) => ({
            booking_id: v.out_booking_id,
            booking_display_id: v.out_booking_display_id,
            vehicle_number: v.out_vehicle_number,
            vehicle_type: v.out_vehicle_type,
            from_location: v.out_from_location,
            to_location: v.out_to_location,
            last_toll_name: v.out_last_toll_name,
            last_toll_lat: parseFloat(v.out_last_toll_lat),
            last_toll_lng: parseFloat(v.out_last_toll_lng),
            last_crossing_time: v.out_last_crossing_time,
            company_id: v.out_company_id
        }));

        return vehicles;
    } catch (error) {
        console.error('❌ Error in fetchFleetVehicles:', error);
        throw error;
    }
};

/**
 * Group vehicles by location (same lat/lng)
 */
export const groupVehiclesByLocation = (vehicles: FleetVehicle[]): GroupedVehicle[] => {
    const locationMap = new Map<string, FleetVehicle[]>();

    vehicles.forEach(vehicle => {
        // Round to 4 decimal places for grouping (approx 11m accuracy)
        const lat = vehicle.last_toll_lat.toFixed(4);
        const lng = vehicle.last_toll_lng.toFixed(4);
        const key = `${lat},${lng}`;

        if (!locationMap.has(key)) {
            locationMap.set(key, []);
        }
        locationMap.get(key)!.push(vehicle);
    });

    const grouped: GroupedVehicle[] = [];

    locationMap.forEach((vehicles, key) => {
        const firstVehicle = vehicles[0];
        grouped.push({
            location: firstVehicle.last_toll_name,
            lat: firstVehicle.last_toll_lat,
            lng: firstVehicle.last_toll_lng,
            vehicles: vehicles,
            count: vehicles.length
        });
    });

    console.log(`📍 Grouped into ${grouped.length} locations`);

    return grouped;
};

/**
 * Fetch toll crossing history for a specific vehicle
 */
export const fetchVehicleTollHistory = async (
    vehicleNumber: string,
    period: 'current' | '1week' = 'current'
): Promise<VehicleTollCrossing[]> => {
    try {
        console.log(`🔍 Fetching toll history for ${vehicleNumber} (${period})`);

        const { data, error } = await supabase
            .rpc('get_vehicle_toll_history', {
                p_vehicle_number: vehicleNumber,
                p_period: period
            });

        if (error) {
            console.error('❌ Error fetching vehicle history:', error);
            throw error;
        }

        console.log(`✅ Found ${data?.length || 0} toll crossings`);

        // Map to proper interface
        const crossings: VehicleTollCrossing[] = (data || []).map((c: any) => ({
            crossing_id: c.out_crossing_id,
            toll_plaza_name: c.out_toll_plaza_name,
            latitude: parseFloat(c.out_latitude),
            longitude: parseFloat(c.out_longitude),
            crossing_time: c.out_crossing_time,
            vehicle_type: c.out_vehicle_type,
            booking_id: c.out_booking_id,
            booking_display_id: c.out_booking_display_id
        }));

        return crossings;
    } catch (error) {
        console.error('❌ Error in fetchVehicleTollHistory:', error);
        throw error;
    }
};

/**
 * Get time ago string from timestamp
 */
/**
 * Get time ago string from timestamp (Handles future dates & timezone issues)
 */
export const getTimeAgo = (timestamp: string): string => {
    if (!timestamp) return 'Unknown time';

    const now = new Date();

    // Ensure timestamp is treated as UTC if it doesn't have offset
    let past = new Date(timestamp);
    if (!timestamp.includes('Z') && !timestamp.includes('+')) {
        past = new Date(timestamp + 'Z');
    }

    const diffMs = now.getTime() - past.getTime();

    // If time is in future (negative diff), treat as 'Just now'
    if (diffMs < 0) {
        return 'Just now';
    }

    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMinutes < 1) {
        return 'Just now';
    } else if (diffMinutes < 60) {
        return `${diffMinutes}m ago`;
    } else if (diffHours < 24) {
        return `${diffHours}h ago`;
    } else {
        return `${diffDays}d ago`;
    }
};