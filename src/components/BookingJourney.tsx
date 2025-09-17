// components/BookingJourney.tsx

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Package, MapPin, Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface BookingJourneyProps {
    bookingId: string;
}

export const BookingJourney = ({ bookingId }: BookingJourneyProps) => {
    const [loading, setLoading] = useState(true);
    const [journey, setJourney] = useState<any[]>([]);

    useEffect(() => {
        loadJourney();
    }, [bookingId]);

    const loadJourney = async () => {
        try {
            setLoading(true);

            // Use our SQL query from earlier
            const { data, error } = await supabase.rpc('get_booking_journey', {
                p_booking_id: bookingId
            });

            if (error) throw error;

            setJourney(data || []);
        } catch (error) {
            console.error('Error loading journey:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading journey...</span>
            </div>
        );
    }

    if (journey.length === 0) {
        return (
            <div className="text-center py-8">
                <p className="text-muted-foreground">No journey data available</p>
            </div>
        );
    }

    return (
        <div className="relative pl-8 pt-4">
            {/* Timeline line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

            {/* Timeline events */}
            <div className="space-y-8">
                {journey.map((event, index) => (
                    <div key={index} className="relative">
                        {/* Timeline dot with icon */}
                        <div className={`absolute -left-4 w-8 h-8 rounded-full flex items-center justify-center ${getEventColor(event.event_type)}`}>
                            {getEventIcon(event.event_type)}
                        </div>

                        {/* Event content */}
                        <div className="ml-6">
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant={getEventBadgeVariant(event.event_type)}>
                                    {getEventTypeLabel(event.event_type)}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                    {formatDateTime(event.event_time)}
                                </span>
                            </div>
                            <p className="text-sm font-medium">{event.description}</p>
                            {event.vehicle_number && (
                                <p className="text-sm text-muted-foreground mt-1">
                                    Vehicle: {event.vehicle_number}
                                </p>
                            )}
                            {event.driver_name && (
                                <p className="text-sm text-muted-foreground">
                                    Driver: {event.driver_name}
                                </p>
                            )}
                            {event.warehouse_name && (
                                <p className="text-sm text-muted-foreground">
                                    Warehouse: {event.warehouse_name}
                                </p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// Helper functions
const getEventIcon = (eventType: string) => {
    switch (eventType) {
        case 'VEHICLE_ASSIGNED':
        case 'VEHICLE_RELEASED':
            return <Truck className="w-4 h-4 text-white" />;
        case 'ARRIVED_AT_WAREHOUSE':
        case 'DEPARTED_FROM_WAREHOUSE':
            return <Package className="w-4 h-4 text-white" />;
        default:
            return <MapPin className="w-4 h-4 text-white" />;
    }
};

const getEventColor = (eventType: string) => {
    switch (eventType) {
        case 'VEHICLE_ASSIGNED':
            return 'bg-success';
        case 'VEHICLE_RELEASED':
            return 'bg-warning';
        case 'ARRIVED_AT_WAREHOUSE':
            return 'bg-info';
        case 'DEPARTED_FROM_WAREHOUSE':
            return 'bg-secondary';
        default:
            return 'bg-primary';
    }
};

const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
        case 'VEHICLE_ASSIGNED': return 'Vehicle Assigned';
        case 'VEHICLE_RELEASED': return 'Vehicle Released';
        case 'ARRIVED_AT_WAREHOUSE': return 'Warehouse Arrival';
        case 'DEPARTED_FROM_WAREHOUSE': return 'Warehouse Departure';
        default: return eventType.replace(/_/g, ' ');
    }
};

const getEventBadgeVariant = (eventType: string): any => {
    switch (eventType) {
        case 'VEHICLE_ASSIGNED': return 'default';
        case 'VEHICLE_RELEASED': return 'secondary';
        case 'ARRIVED_AT_WAREHOUSE': return 'default';
        case 'DEPARTED_FROM_WAREHOUSE': return 'outline';
        default: return 'default';
    }
};