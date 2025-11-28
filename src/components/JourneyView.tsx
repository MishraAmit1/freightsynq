// components/JourneyView.tsx

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Loader2,
    Truck,
    Package,
    MapPin,
    FileText,
    CheckCircle2,
    Upload,
    Receipt,
    Clock,
    Navigation,
    CircleDot
} from "lucide-react";
import { formatDateTime } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface JourneyViewProps {
    bookingId: string;
    booking?: {
        created_at?: string;
        bookingDateTime?: string;
        lr_date?: string;
        lrDate?: string;
        lrNumber?: string;
        actual_delivery?: string;
        pod_uploaded_at?: string;
        billed_at?: string;
        status?: string;
    };
}

interface JourneyEvent {
    event_time: string;
    event_type: string;
    description: string;
    vehicle_number?: string;
    driver_name?: string;
    warehouse_name?: string;
    toll_name?: string;
}

export const JourneyView = ({ bookingId, booking }: JourneyViewProps) => {
    const [loading, setLoading] = useState(true);
    const [journey, setJourney] = useState<JourneyEvent[]>([]);

    useEffect(() => {
        loadJourney();
    }, [bookingId, booking]);

    const loadJourney = async () => {
        try {
            setLoading(true);
            const combinedJourney: JourneyEvent[] = [];

            // ✅ 1. BOOKING CREATED
            const bookingCreatedAt = booking?.created_at || booking?.bookingDateTime;
            if (bookingCreatedAt) {
                combinedJourney.push({
                    event_time: bookingCreatedAt,
                    event_type: 'BOOKING_CREATED',
                    description: 'Booking created'
                });
            }

            // ✅ 2. LR CREATED
            const lrDate = booking?.lr_date || booking?.lrDate;
            if (lrDate) {
                combinedJourney.push({
                    event_time: lrDate,
                    event_type: 'LR_CREATED',
                    description: `LR ${booking?.lrNumber || ''} generated`
                });
            }

            // ✅ 3. VEHICLE ASSIGNMENTS
            const { data: vehicleData } = await supabase
                .from('vehicle_assignments')
                .select(`
          id,
          assigned_at,
          released_at,
          vehicle_type,
          status,
          owned_vehicle:owned_vehicles!owned_vehicle_id(vehicle_number),
          hired_vehicle:hired_vehicles!hired_vehicle_id(vehicle_number),
          driver:drivers(name)
        `)
                .eq('booking_id', bookingId)
                .order('assigned_at');

            vehicleData?.forEach(va => {
                const vehicleNumber = va.vehicle_type === 'OWNED'
                    ? va.owned_vehicle?.vehicle_number
                    : va.hired_vehicle?.vehicle_number;

                if (va.assigned_at) {
                    combinedJourney.push({
                        event_time: va.assigned_at,
                        event_type: 'VEHICLE_ASSIGNED',
                        description: `Vehicle ${vehicleNumber} assigned`,
                        vehicle_number: vehicleNumber,
                        driver_name: va.driver?.name
                    });
                }

                if (va.released_at) {
                    combinedJourney.push({
                        event_time: va.released_at,
                        event_type: 'VEHICLE_RELEASED',
                        description: `Vehicle ${vehicleNumber} released`,
                        vehicle_number: vehicleNumber
                    });
                }
            });

            // ✅ 4. TOLL CROSSINGS (Vehicle Tracking)
            if (vehicleData && vehicleData.length > 0) {
                const assignmentIds = vehicleData.map(v => v.id);

                const { data: tollData } = await supabase
                    .from('vehicle_tracking')
                    .select('toll_name, crossed_at, location')
                    .in('assignment_id', assignmentIds)
                    .order('crossed_at');

                tollData?.forEach(toll => {
                    if (toll.crossed_at && toll.toll_name) {
                        combinedJourney.push({
                            event_time: toll.crossed_at,
                            event_type: 'TOLL_CROSSED',
                            description: `Crossed ${toll.toll_name}`,
                            toll_name: toll.toll_name
                        });
                    }
                });
            }

            // ✅ 5. WAREHOUSE EVENTS
            const { data: warehouseData } = await supabase
                .from('consignments')
                .select(`
          arrival_date,
          departure_date,
          warehouse:warehouses(name, city)
        `)
                .eq('booking_id', bookingId)
                .order('arrival_date');

            warehouseData?.forEach(c => {
                if (c.arrival_date && c.warehouse) {
                    combinedJourney.push({
                        event_time: c.arrival_date,
                        event_type: 'WAREHOUSE_ARRIVAL',
                        description: `Arrived at ${c.warehouse.name} warehouse`,
                        warehouse_name: c.warehouse.name
                    });
                }

                if (c.departure_date && c.warehouse) {
                    combinedJourney.push({
                        event_time: c.departure_date,
                        event_type: 'WAREHOUSE_DEPARTURE',
                        description: `Departed from ${c.warehouse.name} warehouse`,
                        warehouse_name: c.warehouse.name
                    });
                }
            });

            // ✅ 6. DELIVERED
            if (booking?.actual_delivery) {
                combinedJourney.push({
                    event_time: booking.actual_delivery,
                    event_type: 'DELIVERED',
                    description: 'Shipment delivered to consignee'
                });
            }

            // ✅ 7. POD UPLOADED
            if (booking?.pod_uploaded_at) {
                combinedJourney.push({
                    event_time: booking.pod_uploaded_at,
                    event_type: 'POD_UPLOADED',
                    description: 'Proof of Delivery uploaded'
                });
            }

            // ✅ 8. INVOICE GENERATED
            if (booking?.billed_at) {
                combinedJourney.push({
                    event_time: booking.billed_at,
                    event_type: 'INVOICE_GENERATED',
                    description: 'Invoice generated'
                });
            }

            // Sort by time
            combinedJourney.sort((a, b) =>
                new Date(a.event_time).getTime() - new Date(b.event_time).getTime()
            );

            setJourney(combinedJourney);
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
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading journey...</span>
            </div>
        );
    }

    if (journey.length === 0) {
        return (
            <div className="text-center py-8">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">No journey data available</p>
            </div>
        );
    }

    return (
        <Card className="border-border">
            <CardHeader className="border-b border-border">
                <CardTitle className="flex items-center gap-2">
                    <Navigation className="w-5 h-5 text-primary" />
                    Complete Journey Timeline
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
                <div className="relative">
                    {/* Timeline line */}
                    <div className="absolute left-[18px] top-2 bottom-2 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-border" />

                    {/* Timeline events */}
                    <div className="space-y-1">
                        {journey.map((event, index) => {
                            const config = getEventConfig(event.event_type);
                            const Icon = config.icon;
                            const isFirst = index === 0;
                            const isLast = index === journey.length - 1;
                            const isDelivered = event.event_type === 'DELIVERED';

                            return (
                                <div key={index} className="relative pl-12 py-3">
                                    {/* Timeline dot/icon */}
                                    <div className={cn(
                                        "absolute left-0 top-3 w-9 h-9 rounded-full flex items-center justify-center border-2 bg-card",
                                        config.borderColor
                                    )}>
                                        <Icon className={cn("w-4 h-4", config.iconColor)} />
                                    </div>

                                    {/* Event content */}
                                    <div className={cn(
                                        "rounded-lg p-4 transition-colors",
                                        isFirst ? "bg-primary/5 border border-primary/20" :
                                            isDelivered ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800" :
                                                "bg-muted/30 hover:bg-muted/50"
                                    )}>
                                        <div className="flex items-center justify-between mb-1">
                                            <Badge
                                                variant="outline"
                                                className={cn("text-xs font-medium", config.badgeClass)}
                                            >
                                                {config.label}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDateTime(event.event_time)}
                                            </span>
                                        </div>
                                        <p className="font-medium text-sm text-foreground">
                                            {event.description}
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

// Event configuration
const getEventConfig = (eventType: string) => {
    const configs: Record<string, {
        icon: any;
        label: string;
        iconColor: string;
        borderColor: string;
        badgeClass: string;
    }> = {
        BOOKING_CREATED: {
            icon: FileText,
            label: 'Booking Created',
            iconColor: 'text-primary',
            borderColor: 'border-primary',
            badgeClass: 'border-primary/30 text-primary'
        },
        LR_CREATED: {
            icon: FileText,
            label: 'LR Generated',
            iconColor: 'text-blue-600',
            borderColor: 'border-blue-300 dark:border-blue-700',
            badgeClass: 'border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-400'
        },
        VEHICLE_ASSIGNED: {
            icon: Truck,
            label: 'Vehicle Assigned',
            iconColor: 'text-green-600',
            borderColor: 'border-green-300 dark:border-green-700',
            badgeClass: 'border-green-300 text-green-700 dark:border-green-700 dark:text-green-400'
        },
        VEHICLE_RELEASED: {
            icon: Truck,
            label: 'Vehicle Released',
            iconColor: 'text-gray-500',
            borderColor: 'border-gray-300 dark:border-gray-600',
            badgeClass: 'border-gray-300 text-gray-600 dark:border-gray-600 dark:text-gray-400'
        },
        TOLL_CROSSED: {
            icon: Navigation,
            label: 'Toll Crossed',
            iconColor: 'text-orange-500',
            borderColor: 'border-orange-300 dark:border-orange-700',
            badgeClass: 'border-orange-300 text-orange-600 dark:border-orange-700 dark:text-orange-400'
        },
        WAREHOUSE_ARRIVAL: {
            icon: Package,
            label: 'Warehouse Arrival',
            iconColor: 'text-indigo-600',
            borderColor: 'border-indigo-300 dark:border-indigo-700',
            badgeClass: 'border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-400'
        },
        WAREHOUSE_DEPARTURE: {
            icon: MapPin,
            label: 'Warehouse Departure',
            iconColor: 'text-purple-600',
            borderColor: 'border-purple-300 dark:border-purple-700',
            badgeClass: 'border-purple-300 text-purple-700 dark:border-purple-700 dark:text-purple-400'
        },
        DELIVERED: {
            icon: CheckCircle2,
            label: 'Delivered',
            iconColor: 'text-green-600',
            borderColor: 'border-green-400 dark:border-green-600',
            badgeClass: 'border-green-400 text-green-700 bg-green-50 dark:border-green-600 dark:text-green-400 dark:bg-green-900/20'
        },
        POD_UPLOADED: {
            icon: Upload,
            label: 'POD Uploaded',
            iconColor: 'text-teal-600',
            borderColor: 'border-teal-300 dark:border-teal-700',
            badgeClass: 'border-teal-300 text-teal-700 dark:border-teal-700 dark:text-teal-400'
        },
        INVOICE_GENERATED: {
            icon: Receipt,
            label: 'Invoice Generated',
            iconColor: 'text-yellow-600',
            borderColor: 'border-yellow-300 dark:border-yellow-700',
            badgeClass: 'border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-400'
        }
    };

    return configs[eventType] || {
        icon: CircleDot,
        label: eventType.replace(/_/g, ' '),
        iconColor: 'text-gray-500',
        borderColor: 'border-gray-300',
        badgeClass: 'border-gray-300 text-gray-600'
    };
};