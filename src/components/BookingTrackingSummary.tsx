// components/BookingTrackingSummary.tsx

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Truck,
    Package,
    MapPin,
    Clock,
    CheckCircle,
    ArrowRight,
    Loader2
} from "lucide-react";
import { formatDateTime, formatDate } from "@/lib/utils";
import { supabase } from "@/lib/supabase";

interface BookingTrackingSummaryProps {
    bookingId: string;
}

export const BookingTrackingSummary = ({ bookingId }: BookingTrackingSummaryProps) => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState<any>(null);

    useEffect(() => {
        loadSummary();
    }, [bookingId]);

    const loadSummary = async () => {
        try {
            setLoading(true);

            // Get booking details with current status
            const { data: booking } = await supabase
                .from('bookings')
                .select(`
          *,
          current_warehouse:warehouses(name, city)
        `)
                .eq('id', bookingId)
                .single();

            // Get all vehicles used
            const { data: vehicles } = await supabase
                .from('vehicle_assignments')
                .select(`
          *,
          owned_vehicle:owned_vehicles(vehicle_number, vehicle_type),
          hired_vehicle:hired_vehicles(vehicle_number, vehicle_type),
          driver:drivers(name, phone)
        `)
                .eq('booking_id', bookingId)
                .order('assigned_at');

            // Get all warehouse stops
            const { data: warehouses } = await supabase
                .from('consignments')
                .select(`
          *,
          warehouse:warehouses(name, city)
        `)
                .eq('booking_id', bookingId)
                .order('arrival_date');

            // Get timeline events count
            const { count: timelineCount } = await supabase
                .from('booking_timeline')
                .select('*', { count: 'exact' })
                .eq('booking_id', bookingId);

            setSummary({
                booking,
                vehicles: vehicles || [],
                warehouses: warehouses || [],
                totalEvents: timelineCount || 0,
                currentStatus: determineCurrentStatus(booking, vehicles, warehouses)
            });
        } catch (error) {
            console.error('Error loading summary:', error);
        } finally {
            setLoading(false);
        }
    };

    const determineCurrentStatus = (booking: any, vehicles: any[], warehouses: any[]) => {
        if (booking?.current_warehouse_id) {
            return {
                type: 'WAREHOUSE',
                location: booking.current_warehouse?.name,
                city: booking.current_warehouse?.city
            };
        }

        const activeVehicle = vehicles?.find(v => v.status === 'ACTIVE');
        if (activeVehicle) {
            const vehicleNumber = activeVehicle.vehicle_type === 'OWNED'
                ? activeVehicle.owned_vehicle?.vehicle_number
                : activeVehicle.hired_vehicle?.vehicle_number;

            return {
                type: 'TRANSIT',
                vehicle: vehicleNumber,
                driver: activeVehicle.driver?.name
            };
        }

        return {
            type: 'PENDING',
            message: 'Awaiting assignment'
        };
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="ml-2">Loading summary...</span>
            </div>
        );
    }

    if (!summary) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Current Status Card */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>Current Status</span>
                        <Badge variant="outline" className="text-lg px-3 py-1">
                            {summary.booking.status}
                        </Badge>
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center justify-center py-6">
                        {summary.currentStatus.type === 'WAREHOUSE' && (
                            <div className="text-center">
                                <Package className="w-12 h-12 text-info mx-auto mb-3" />
                                <p className="font-semibold">At Warehouse</p>
                                <p className="text-muted-foreground">{summary.currentStatus.location}</p>
                                <p className="text-sm text-muted-foreground">{summary.currentStatus.city}</p>
                            </div>
                        )}
                        {summary.currentStatus.type === 'TRANSIT' && (
                            <div className="text-center">
                                <Truck className="w-12 h-12 text-success mx-auto mb-3" />
                                <p className="font-semibold">In Transit</p>
                                <p className="text-muted-foreground">Vehicle: {summary.currentStatus.vehicle}</p>
                                <p className="text-sm text-muted-foreground">Driver: {summary.currentStatus.driver}</p>
                            </div>
                        )}
                        {summary.currentStatus.type === 'PENDING' && (
                            <div className="text-center">
                                <Clock className="w-12 h-12 text-warning mx-auto mb-3" />
                                <p className="font-semibold">Pending</p>
                                <p className="text-muted-foreground">{summary.currentStatus.message}</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Vehicles</p>
                                <p className="text-2xl font-bold">{summary.vehicles.length}</p>
                            </div>
                            <Truck className="w-8 h-8 text-primary opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Warehouse Stops</p>
                                <p className="text-2xl font-bold">{summary.warehouses.length}</p>
                            </div>
                            <Package className="w-8 h-8 text-info opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Events</p>
                                <p className="text-2xl font-bold">{summary.totalEvents}</p>
                            </div>
                            <Clock className="w-8 h-8 text-warning opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Journey</p>
                                <p className="text-sm font-medium truncate">
                                    {summary.booking.from_location} → {summary.booking.to_location}
                                </p>
                            </div>
                            <MapPin className="w-8 h-8 text-success opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Vehicles & Warehouses Tabs */}
            <Tabs defaultValue="vehicles" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="vehicles">Vehicles Used ({summary.vehicles.length})</TabsTrigger>
                    <TabsTrigger value="warehouses">Warehouse Stops ({summary.warehouses.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="vehicles" className="mt-4">
                    <div className="space-y-3">
                        {summary.vehicles.map((assignment: any, index: number) => {
                            const vehicleNumber = assignment.vehicle_type === 'OWNED'
                                ? assignment.owned_vehicle?.vehicle_number
                                : assignment.hired_vehicle?.vehicle_number;

                            return (
                                <Card key={assignment.id}>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <Truck className="w-5 h-5 text-primary" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{vehicleNumber}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Driver: {assignment.driver?.name} • {assignment.driver?.phone}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <Badge variant={assignment.status === 'ACTIVE' ? 'default' : 'secondary'}>
                                                    {assignment.status}
                                                </Badge>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatDateTime(assignment.assigned_at)}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </TabsContent>

                <TabsContent value="warehouses" className="mt-4">
                    <div className="space-y-3">
                        {summary.warehouses.map((consignment: any, index: number) => (
                            <Card key={consignment.id}>
                                <CardContent className="pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-info/10 flex items-center justify-center">
                                                <Package className="w-5 h-5 text-info" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{consignment.warehouse?.name}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {consignment.warehouse?.city} • {consignment.consignment_id}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant={consignment.status === 'IN_WAREHOUSE' ? 'default' : 'secondary'}>
                                                {consignment.status}
                                            </Badge>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Arrived: {formatDateTime(consignment.arrival_date)}
                                            </p>
                                            {consignment.departure_date && (
                                                <p className="text-xs text-muted-foreground">
                                                    Departed: {formatDateTime(consignment.departure_date)}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};