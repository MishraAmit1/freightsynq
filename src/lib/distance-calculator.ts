// /lib/distance-calculator.ts
// FREE Distance Calculator using Nominatim + OSRM

import { supabase } from "./supabase";
const getMonthShort = (monthIndex: number): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
};

/**
 * Geocode a location string to coordinates
 * Uses Nominatim (OpenStreetMap) - FREE
 */
export async function geocodeLocation(locationText: string): Promise<{
    lat: number;
    lon: number;
} | null> {
    try {
        // Clean the location text
        const cleanLocation = locationText.trim();

        if (!cleanLocation) {
            console.error('❌ Empty location provided');
            return null;
        }

        console.log(`🔍 Geocoding: "${cleanLocation}"`);

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(cleanLocation)}&` +
            `format=json&` +
            `limit=1&` +
            `countrycodes=in`,
            {
                headers: {
                    'User-Agent': 'FreightSynq-TMS/1.0 (contact@freightsynq.com)'
                }
            }
        );

        if (!response.ok) {
            console.error(`❌ Nominatim API error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (!data || data.length === 0) {
            console.error(`❌ No results found for: "${cleanLocation}"`);
            return null;
        }

        const result = {
            lat: parseFloat(data[0].lat),
            lon: parseFloat(data[0].lon)
        };

        console.log(`✅ Geocoded: ${cleanLocation} → (${result.lat}, ${result.lon})`);

        return result;

    } catch (error) {
        console.error('❌ Geocoding error:', error);
        return null;
    }
}


/**
 * Get road distance between two coordinates using OSRM - FREE
 * Returns distance in kilometers
 */
export async function getOSRMDistance(
    fromCoords: { lat: number; lon: number },
    toCoords: { lat: number; lon: number }
): Promise<number | null> {
    try {
        // OSRM uses lon,lat format (NOT lat,lon)
        const url = `https://router.project-osrm.org/route/v1/driving/` +
            `${fromCoords.lon},${fromCoords.lat};` +
            `${toCoords.lon},${toCoords.lat}?` +
            `overview=false`;

        console.log(`🛣️ Getting route distance...`);

        const response = await fetch(url);

        if (!response.ok) {
            console.error(`❌ OSRM API error: ${response.status}`);
            return null;
        }

        const data = await response.json();

        if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
            console.error('❌ No route found');
            return null;
        }

        // Distance is in meters, convert to km
        const distanceKm = Math.round(data.routes[0].distance / 1000);

        console.log(`✅ Road distance: ${distanceKm} km`);

        return distanceKm;

    } catch (error) {
        console.error('❌ OSRM error:', error);
        return null;
    }
}


/**
 * Calculate straight-line distance using Haversine formula
 * Used as fallback when APIs fail
 */
export function getHaversineDistance(
    fromCoords: { lat: number; lon: number },
    toCoords: { lat: number; lon: number }
): number {
    const R = 6371; // Earth's radius in km

    const dLat = (toCoords.lat - fromCoords.lat) * Math.PI / 180;
    const dLon = (toCoords.lon - fromCoords.lon) * Math.PI / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(fromCoords.lat * Math.PI / 180) *
        Math.cos(toCoords.lat * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const straightDistance = R * c;

    // Add 40% for road curves
    const roadDistance = Math.round(straightDistance * 1.4);

    console.log(`📐 Haversine distance: ${roadDistance} km (fallback)`);

    return roadDistance;
}


/**
 * Small delay to respect Nominatim rate limits (1 req/second)
 */
function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}


/**
 * MAIN FUNCTION: Get route distance between two location strings
 * Returns distance in kilometers
 */
export async function getRouteDistance(
    fromLocation: string,
    toLocation: string
): Promise<{
    distance: number;
    method: 'osrm' | 'haversine' | 'default' | 'cache';
    success: boolean;
}> {
    console.log('\n═══════════════════════════════════════');
    console.log(`📍 Calculating distance:`);
    console.log(`   From: ${fromLocation}`);
    console.log(`   To: ${toLocation}`);
    console.log('═══════════════════════════════════════\n');

    try {
        // ✅ Call Edge Function
        console.log('🚀 Calling Edge Function...');

        const { data, error } = await supabase.functions.invoke('calculate-distance', {
            body: {
                origin: fromLocation,
                destination: toLocation
            }
        });

        if (error) {
            console.error('❌ Edge function error:', error);
            return { distance: 800, method: 'default', success: false };
        }

        if (data.success && data.distance > 0) {
            console.log(`✅ SUCCESS: ${data.distance} km via Edge Function`);
            return {
                distance: data.distance,
                method: data.method || 'osrm',
                success: true
            };
        }

        console.log('⚠️ Using fallback distance');
        return {
            distance: data.distance || 800,
            method: 'default',
            success: false
        };

    } catch (error) {
        console.error('❌ Distance calculation failed:', error);
        return { distance: 800, method: 'default', success: false };
    }
}


/**
 * Calculate ETA based on distance and pickup date
 */
export function calculateETAFromDistance(
    distanceKm: number,
    pickupDate?: string
): Date {
    // Truck average speed: 50 km/h
    const avgSpeed = 20;

    // Buffer for breaks, traffic, loading: 20%
    const buffer = 1.2;

    // Calculate hours
    const hours = (distanceKm / avgSpeed) * buffer;

    // Start from pickup date or now
    const startDate = pickupDate
        ? new Date(pickupDate + 'T08:00:00') // Assume 8 AM start
        : new Date();

    // Add hours to get ETA
    const eta = new Date(startDate);
    eta.setHours(eta.getHours() + Math.ceil(hours));

    console.log(`⏰ ETA calculated: ${eta.toISOString()}`);
    console.log(`   Distance: ${distanceKm} km`);
    console.log(`   Hours: ${Math.ceil(hours)}h`);

    return eta;
}

// ═══════════════════════════════════════════════════════════
// 🆕 DYNAMIC ETA UTILITIES
// ═══════════════════════════════════════════════════════════

/**
 * Get the best available ETA (dynamic or original)
 */
export const getBestETA = (booking: {
    dynamic_eta?: string;
    estimated_arrival?: string;
}): string | null => {
    return booking.dynamic_eta || booking.estimated_arrival || null;
};

/**
 * Check if ETA is dynamic (real-time) or static (estimated)
 */
export const isETADynamic = (booking: {
    dynamic_eta?: string;
}): boolean => {
    return !!booking.dynamic_eta;
};

/**
 * Get ETA improvement/delay in hours
 */
export const getETADifference = (booking: {
    dynamic_eta?: string;
    estimated_arrival?: string;
}): {
    hours: number;
    isImproved: boolean;
    isDelayed: boolean;
    label: string;
} | null => {
    if (!booking.dynamic_eta || !booking.estimated_arrival) {
        return null;
    }

    const original = new Date(booking.estimated_arrival);
    const dynamic = new Date(booking.dynamic_eta);

    const diffMs = original.getTime() - dynamic.getTime();
    const diffHours = Math.round(diffMs / (1000 * 60 * 60));

    return {
        hours: Math.abs(diffHours),
        isImproved: diffHours > 0,
        isDelayed: diffHours < 0,
        label: diffHours > 0
            ? `${Math.abs(diffHours)}h early`
            : diffHours < 0
                ? `${Math.abs(diffHours)}h late`
                : 'On schedule'
    };
};

/**
 * Get progress percentage
 */
export const getProgressPercentage = (booking: {
    distance_covered?: number;
    distance_remaining?: number;
    route_distance_km?: number;
}): number => {
    const total = booking.route_distance_km ||
        ((booking.distance_covered || 0) + (booking.distance_remaining || 0));

    if (!total || total === 0) return 0;

    const covered = booking.distance_covered || 0;
    return Math.min(100, Math.round((covered / total) * 100));
};

/**
 * Format speed with unit
 */
export const formatSpeed = (speed?: number): string => {
    if (!speed) return '-';
    return `${Math.round(speed)} km/hr`;
};

/**
 * Get time since last ETA update
 */
export const getETAUpdateAge = (etaLastUpdatedAt?: string): string => {
    if (!etaLastUpdatedAt) return '';

    const updated = new Date(etaLastUpdatedAt);
    const now = new Date();
    const diffMs = now.getTime() - updated.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    if (diffHours < 1) {
        const mins = Math.floor(diffHours * 60);
        return `${mins}m ago`;
    } else if (diffHours < 24) {
        return `${Math.floor(diffHours)}h ago`;
    } else {
        const days = Math.floor(diffHours / 24);
        return `${days}d ago`;
    }
};

/**
 * Enhanced SLA Status with dynamic ETA support
 */
export const getSLAStatus = (
    eta: Date | string | null | undefined,
    deliveryStatus?: string
): {
    status: 'on-time' | 'at-risk' | 'delayed' | 'unknown';
    label: string;
    color: string;
    bgColor: string;
    icon: string;
} => {
    // If already delivered
    if (deliveryStatus === 'DELIVERED') {
        return {
            status: 'on-time',
            label: 'Delivered',
            color: 'text-green-700',
            bgColor: 'bg-green-100 dark:bg-green-950/20',
            icon: '✅'
        };
    }

    // No ETA available
    if (!eta) {
        return {
            status: 'unknown',
            label: 'ETA N/A',
            color: 'text-gray-500',
            bgColor: 'bg-gray-100 dark:bg-gray-800',
            icon: '⏳'
        };
    }

    const now = new Date();
    const etaDate = new Date(eta);
    const hoursDiff = (etaDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 0) {
        const hoursDelayed = Math.abs(Math.floor(hoursDiff));
        return {
            status: 'delayed',
            label: `Delayed ${hoursDelayed}h`,
            color: 'text-red-700',
            bgColor: 'bg-red-100 dark:bg-red-950/20',
            icon: '🔴'
        };
    } else if (hoursDiff < 12) {
        const hoursLeft = Math.floor(hoursDiff);
        return {
            status: 'at-risk',
            label: `${hoursLeft}h left`,
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-100 dark:bg-yellow-950/20',
            icon: '⚠️'
        };
    } else {
        const hoursLeft = Math.floor(hoursDiff);
        return {
            status: 'on-time',
            label: hoursLeft < 48 ? `${hoursLeft}h left` : 'On Time',
            color: 'text-green-700',
            bgColor: 'bg-green-100 dark:bg-green-950/20',
            icon: '🟢'
        };
    }
};

/**
 * Format ETA date for display
 */



/**
 * Format ETA with time
 */
/**
 * Format with time - "12 Dec, 10:30 AM" (uppercase AM/PM)
 */
export const formatETAWithTime = (eta: Date | string): string => {
    const etaDate = new Date(eta);

    const day = etaDate.getDate().toString().padStart(2, '0');
    const month = getMonthShort(etaDate.getMonth());

    let hours = etaDate.getHours();
    const minutes = etaDate.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';

    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    const hoursStr = hours.toString().padStart(2, '0');

    return `${day} ${month}, ${hoursStr}:${minutes} ${ampm}`;
};