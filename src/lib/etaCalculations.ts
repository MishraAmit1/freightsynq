// ============================================
// 📊 ETA CALCULATION UTILITIES
// ============================================

/**
 * Get estimated travel time based on distance
 * Uses average logistics speed of 50 km/h
 */
export const getRouteEstimatedHours = (fromCity: string, toCity: string): number => {
    // City distance database (approximate)
    const cityDistances: Record<string, Record<string, number>> = {
        'Mumbai': {
            'Delhi': 1400,
            'Bangalore': 980,
            'Pune': 150,
            'Ahmedabad': 530,
            'Surat': 280,
            'Chennai': 1340,
            'Kolkata': 2000,
            'Hyderabad': 710,
            'Jaipur': 1150
        },
        'Delhi': {
            'Mumbai': 1400,
            'Bangalore': 2150,
            'Pune': 1450,
            'Ahmedabad': 950,
            'Surat': 1200,
            'Chennai': 2180,
            'Kolkata': 1500,
            'Hyderabad': 1570,
            'Jaipur': 280
        },
        'Bangalore': {
            'Mumbai': 980,
            'Delhi': 2150,
            'Pune': 840,
            'Chennai': 350,
            'Hyderabad': 570,
            'Kolkata': 1870
        },
        'Chennai': {
            'Mumbai': 1340,
            'Delhi': 2180,
            'Bangalore': 350,
            'Hyderabad': 630,
            'Kolkata': 1670
        },
        'Pune': {
            'Mumbai': 150,
            'Delhi': 1450,
            'Bangalore': 840,
            'Surat': 420
        },
        'Ahmedabad': {
            'Mumbai': 530,
            'Delhi': 950,
            'Surat': 265
        },
        'Surat': {
            'Mumbai': 280,
            'Delhi': 1200,
            'Pune': 420,
            'Ahmedabad': 265
        }
    };

    // Try to find distance
    let distanceKm = 0;

    if (cityDistances[fromCity]?.[toCity]) {
        distanceKm = cityDistances[fromCity][toCity];
    } else if (cityDistances[toCity]?.[fromCity]) {
        distanceKm = cityDistances[toCity][fromCity];
    } else {
        // Default estimate based on tier
        // Assume inter-city average distance
        distanceKm = 800;
    }

    // Calculate hours at 50 km/h average speed
    // Add 20% buffer for stops, traffic, loading/unloading
    const baseHours = distanceKm / 50;
    const totalHours = baseHours * 1.2;

    return Math.round(totalHours);
};

/**
 * Calculate ETA for a booking
 */
export const calculateBookingETA = (booking: {
    pickup_date?: string;
    from_location: string;
    to_location: string;
    assignedVehicle?: any;
    vehicle_assignments?: Array<{
        last_toll_time?: string;
        last_toll_crossed?: string;
    }>;
    status?: string;
}): Date => {
    const now = new Date();

    // Priority 1: Has FASTag tracking data
    const activeAssignment = booking.vehicle_assignments?.find(v => v.last_toll_time);

    if (activeAssignment?.last_toll_time) {
        // Get last toll crossing time
        const lastTollTime = new Date(activeAssignment.last_toll_time);

        // Estimate remaining distance (simplified)
        // In real scenario, calculate based on toll location vs destination
        const totalHours = getRouteEstimatedHours(booking.from_location, booking.to_location);

        // Assume 60% of journey remaining (simplified)
        // TODO: Calculate actual remaining distance based on toll location
        const remainingHours = totalHours * 0.4;

        const eta = new Date(lastTollTime);
        eta.setHours(eta.getHours() + remainingHours);

        return eta;
    }

    // Priority 2: Vehicle assigned but no tracking
    if (booking.assignedVehicle || booking.status === 'DISPATCHED' || booking.status === 'IN_TRANSIT') {
        const estimatedHours = getRouteEstimatedHours(booking.from_location, booking.to_location);

        const eta = new Date(now);
        eta.setHours(eta.getHours() + estimatedHours);

        return eta;
    }

    // Priority 3: Use pickup date + default delivery time
    if (booking.pickup_date) {
        const pickupDate = new Date(booking.pickup_date);
        const estimatedHours = getRouteEstimatedHours(booking.from_location, booking.to_location);

        const eta = new Date(pickupDate);
        eta.setHours(eta.getHours() + estimatedHours);

        return eta;
    }

    // Fallback: 3 days from now
    const fallbackETA = new Date(now);
    fallbackETA.setDate(fallbackETA.getDate() + 3);

    return fallbackETA;
};

/**
 * Get SLA status with color coding
 */
export const getSLAStatus = (eta: Date | string, deliveryStatus?: string): {
    status: 'on-time' | 'at-risk' | 'delayed';
    label: string;
    color: string;
    bgColor: string;
    icon: string;
} => {
    // If already delivered, show completed
    if (deliveryStatus === 'DELIVERED') {
        return {
            status: 'on-time',
            label: 'Delivered',
            color: 'text-green-700',
            bgColor: 'bg-green-100 dark:bg-green-950/20',
            icon: '✅'
        };
    }

    const now = new Date();
    const etaDate = new Date(eta);

    // Calculate hours difference
    const hoursDiff = (etaDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 0) {
        // Delayed
        const hoursDelayed = Math.abs(Math.floor(hoursDiff));
        return {
            status: 'delayed',
            label: `Delayed ${hoursDelayed}h`,
            color: 'text-red-700',
            bgColor: 'bg-red-100 dark:bg-red-950/20',
            icon: '🔴'
        };
    } else if (hoursDiff < 12) {
        // At risk (less than 12 hours)
        const hoursLeft = Math.floor(hoursDiff);
        return {
            status: 'at-risk',
            label: `${hoursLeft}h left`,
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-100 dark:bg-yellow-950/20',
            icon: '⚠️'
        };
    } else {
        // On time
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
 * Format ETA for display
 */
export const formatETA = (eta: Date | string): string => {
    const etaDate = new Date(eta);

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Format date
    const dateStr = etaDate.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short'
    });

    // Format time
    const timeStr = etaDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
    });

    // Check if today/tomorrow
    if (etaDate.toDateString() === today.toDateString()) {
        return `Today, ${timeStr}`;
    } else if (etaDate.toDateString() === tomorrow.toDateString()) {
        return `Tomorrow, ${timeStr}`;
    } else {
        return `${dateStr}, ${timeStr}`;
    }
};