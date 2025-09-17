// components/JourneyView.tsx

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Truck, Package, MapPin } from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface JourneyViewProps {
    bookingId: string;
}

export const JourneyView = ({ bookingId }: JourneyViewProps) => {
    const [loading, setLoading] = useState(true);
    const [journey, setJourney] = useState<any[]>([]);

    useEffect(() => {
        loadJourney();
    }, [bookingId]);

    const loadJourney = async () => {
        try {
            setLoading(true);

            // Try RPC function first
            const { data, error } = await supabase.rpc('get_booking_journey', {
                p_booking_id: bookingId
            });

            if (error) {
                console.error('RPC error:', error);

                // Fallback: Direct query if RPC doesn't exist
                const { data: vehicleData } = await supabase
                    .from('vehicle_assignments')
                    .select(`
          assigned_at,
          released_at,
          vehicle_type,
          owned_vehicle:owned_vehicles!owned_vehicle_id(vehicle_number),
          hired_vehicle:hired_vehicles!hired_vehicle_id(vehicle_number),
          driver:drivers(name)
        `)
                    .eq('booking_id', bookingId)
                    .order('assigned_at');

                const { data: warehouseData } = await supabase
                    .from('consignments')
                    .select(`
          arrival_date,
          departure_date,
          warehouse:warehouses(name)
        `)
                    .eq('booking_id', bookingId)
                    .order('arrival_date');

                // Combine and format data
                const combinedJourney: any[] = [];

                // Add vehicle events
                vehicleData?.forEach(va => {
                    const vehicleNumber = va.vehicle_type === 'OWNED'
                        ? va.owned_vehicle?.vehicle_number
                        : va.hired_vehicle?.vehicle_number;

                    if (va.assigned_at) {
                        combinedJourney.push({
                            event_time: va.assigned_at,
                            event_type: 'VEHICLE_ASSIGNED',
                            description: `Vehicle ${vehicleNumber} assigned with driver ${va.driver?.name}`,
                            vehicle_number: vehicleNumber,
                            driver_name: va.driver?.name
                        });
                    }

                    if (va.released_at) {
                        combinedJourney.push({
                            event_time: va.released_at,
                            event_type: 'VEHICLE_RELEASED',
                            description: `Vehicle ${vehicleNumber} released`,
                            vehicle_number: vehicleNumber,
                            driver_name: va.driver?.name
                        });
                    }
                });

                // Add warehouse events
                warehouseData?.forEach(c => {
                    if (c.arrival_date) {
                        combinedJourney.push({
                            event_time: c.arrival_date,
                            event_type: 'ARRIVED_AT_WAREHOUSE',
                            description: `Goods arrived at ${c.warehouse?.name} warehouse`,
                            warehouse_name: c.warehouse?.name
                        });
                    }

                    if (c.departure_date) {
                        combinedJourney.push({
                            event_time: c.departure_date,
                            event_type: 'DEPARTED_FROM_WAREHOUSE',
                            description: `Goods departed from ${c.warehouse?.name} warehouse`,
                            warehouse_name: c.warehouse?.name
                        });
                    }
                });

                // Sort by time
                combinedJourney.sort((a, b) =>
                    new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
                );

                setJourney(combinedJourney);
            } else {
                setJourney(data || []);
            }
        } catch (error) {
            console.error('Error loading journey:', error);
            setJourney([]);
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
        <Card>
            <CardHeader>
                <CardTitle>Complete Journey</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

                    {/* Timeline events */}
                    <div className="space-y-6">
                        {journey.map((event, index) => (
                            <div key={index} className="relative pl-10">
                                {/* Timeline dot */}
                                <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                                    {event.event_type === 'VEHICLE_ASSIGNED' && <Truck className="w-2 h-2 text-primary" />}
                                    {event.event_type === 'ARRIVED_AT_WAREHOUSE' && <Package className="w-2 h-2 text-primary" />}
                                    {event.event_type === 'DEPARTED_FROM_WAREHOUSE' && <MapPin className="w-2 h-2 text-primary" />}
                                </div>

                                {/* Event content */}
                                <div className="bg-muted/30 rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <Badge variant={getEventBadgeVariant(event.event_type)}>
                                            {getEventTypeLabel(event.event_type)}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">
                                            {formatDateTime(event.event_time)}
                                        </span>
                                    </div>
                                    <p className="font-medium">{event.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Helper functions
const getEventTypeLabel = (eventType: string) => {
    switch (eventType) {
        case 'VEHICLE_ASSIGNED': return 'Vehicle Assigned';
        case 'VEHICLE_RELEASED': return 'Vehicle Released';
        case 'ARRIVED_AT_WAREHOUSE': return 'Warehouse Arrival';
        case 'DEPARTED_FROM_WAREHOUSE': return 'Warehouse Departure';
        default: return eventType.replace('_', ' ');
    }
};

const getEventBadgeVariant = (eventType: string) => {
    switch (eventType) {
        case 'VEHICLE_ASSIGNED': return 'success';
        case 'VEHICLE_RELEASED': return 'warning';
        case 'ARRIVED_AT_WAREHOUSE': return 'info';
        case 'DEPARTED_FROM_WAREHOUSE': return 'secondary';
        default: return 'default';
    }
};