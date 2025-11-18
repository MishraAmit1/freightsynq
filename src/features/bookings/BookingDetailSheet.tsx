import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Sheet,
    SheetContent,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
    FileText,
    MapPin,
    Package,
    User,
    Truck,
    Phone,
    Loader2,
    X,
    Clock,
    CheckCircle2,
    AlertCircle,
    Building2,
    Navigation,
    Zap,
    MapPinned,
    TrendingUp,
    PackageCheck,
    Circle,
    Activity,
} from "lucide-react";
import { fetchBookingById } from "@/api/bookings";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

interface BookingDetailSheetProps {
    isOpen: boolean;
    onClose: () => void;
    bookingId: string;
    onUpdate?: () => void;
}

interface BookingDetail {
    id: string;
    bookingId: string;
    consignorName: string;
    consigneeName: string;
    consignorPhone?: string;
    consignorAddress?: string;
    consigneePhone?: string;
    consigneeAddress?: string;
    fromLocation: string;
    toLocation: string;
    cargoUnits: number;
    materialDescription: string;
    serviceType: "FTL" | "PTL";
    status: string;
    pickupDate?: string;
    lrNumber?: string;
    lrDate?: string;
    bookingDateTime: string;
    branch_name?: string;
    branch_code?: string;
    current_warehouse?: {
        name: string;
        city: string;
    };
    assignedVehicle?: {
        id: string;
        regNumber: string;
        type: string;
        capacity: string;
        driver?: {
            name: string;
            phone: string;
        };
        assignedAt?: string;
        assignment_id?: string;
    };
    broker?: {
        name: string;
    };
    eway_bill_details?: Array<{
        number: string;
        valid_until?: string;
    }>;
}

interface TollCrossing {
    id: string;
    toll_name: string;
    crossed_at: string;
    location?: string;
}

const statusConfig = {
    DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-300" },
    QUOTED: { label: "Quoted", color: "bg-blue-100 text-blue-700 border-blue-300" },
    CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700 border-green-300" },
    AT_WAREHOUSE: { label: "At Warehouse", color: "bg-indigo-100 text-indigo-700 border-indigo-300" },
    DISPATCHED: { label: "Dispatched", color: "bg-purple-100 text-purple-700 border-purple-300" },
    IN_TRANSIT: { label: "In Transit", color: "bg-orange-100 text-orange-700 border-orange-300" },
    DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
    CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700 border-red-300" },
};

export const BookingDetailSheet = ({
    isOpen,
    onClose,
    bookingId,
    onUpdate,
}: BookingDetailSheetProps) => {
    const { toast } = useToast();
    const [booking, setBooking] = useState<BookingDetail | null>(null);
    const [loading, setLoading] = useState(false);
    const [showVehicleAssignModal, setShowVehicleAssignModal] = useState(false);
    const [tollCrossings, setTollCrossings] = useState<TollCrossing[]>([]);
    const [loadingTolls, setLoadingTolls] = useState(false);

    useEffect(() => {
        if (isOpen && bookingId) {
            loadBookingDetails();
        }
    }, [isOpen, bookingId]);

    const loadBookingDetails = async () => {
        try {
            setLoading(true);
            const data = await fetchBookingById(bookingId);

            console.log('📦 Raw API Data:', data);

            if (data) {
                const hasActiveAssignment = data.vehicle_assignments &&
                    Array.isArray(data.vehicle_assignments) &&
                    data.vehicle_assignments.length > 0 &&
                    data.vehicle_assignments[0].vehicle;

                const activeAssignment = data.vehicle_assignments?.[0];

                const convertedBooking: BookingDetail = {
                    id: data.id,
                    bookingId: data.booking_id,

                    // ✅ Now these come directly from API
                    consignorName: data.consignor_name,
                    consigneeName: data.consignee_name,
                    consignorPhone: data.consignor?.phone,
                    consignorAddress: data.consignor?.address,
                    consigneePhone: data.consignee?.phone,
                    consigneeAddress: data.consignee?.address,

                    fromLocation: data.from_location,
                    toLocation: data.to_location,
                    cargoUnits: data.cargo_units,
                    materialDescription: data.material_description,
                    serviceType: data.service_type as "FTL" | "PTL",
                    status: data.status,
                    pickupDate: data.pickup_date,
                    lrNumber: data.lr_number,
                    lrDate: data.lr_date,
                    bookingDateTime: data.created_at,
                    branch_name: data.branch?.branch_name,
                    branch_code: data.branch?.branch_code,
                    current_warehouse: data.current_warehouse,
                    eway_bill_details: data.eway_bill_details || [],

                    assignedVehicle: hasActiveAssignment ? {
                        id: activeAssignment.vehicle.id,
                        regNumber: activeAssignment.vehicle.vehicle_number,
                        type: activeAssignment.vehicle.vehicle_type,
                        capacity: activeAssignment.vehicle.capacity,
                        driver: activeAssignment.driver ? {
                            name: activeAssignment.driver.name,
                            phone: activeAssignment.driver.phone,
                        } : undefined,
                        assignedAt: activeAssignment.created_at,
                        assignment_id: activeAssignment.id, // ✅ This now exists!
                    } : undefined,

                    broker: activeAssignment?.broker,
                };

                console.log('✅ Converted Booking:', {
                    consignorName: convertedBooking.consignorName,
                    consigneeName: convertedBooking.consigneeName,
                    vehicleAssigned: !!convertedBooking.assignedVehicle,
                    assignmentId: convertedBooking.assignedVehicle?.assignment_id,
                    vehicleNumber: convertedBooking.assignedVehicle?.regNumber
                });

                setBooking(convertedBooking);

                // ✅ Load toll crossings if vehicle is assigned
                if (hasActiveAssignment && activeAssignment.id) {
                    console.log('🚛 Loading tolls for assignment:', activeAssignment.id);
                    loadTollCrossings(activeAssignment.id);
                } else {
                    console.log('⚠️ No active vehicle assignment');
                    setTollCrossings([]);
                }
            }
        } catch (error) {
            console.error('❌ Error loading booking:', error);
            toast({
                title: "Error",
                description: "Failed to load booking details",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const loadTollCrossings = async (assignmentId: string) => {
        try {
            setLoadingTolls(true);
            console.log('🔍 Fetching tolls for assignment:', assignmentId);

            const { data, error } = await supabase
                .from('vehicle_tracking')
                .select('id, toll_name, crossed_at, location')
                .eq('assignment_id', assignmentId)
                .order('crossed_at', { ascending: false })
                .limit(10);

            if (error) {
                console.error('❌ Supabase error:', error);
                throw error;
            }

            console.log('✅ Toll crossings loaded:', data?.length || 0);
            setTollCrossings(data || []);
        } catch (error) {
            console.error('❌ Error loading toll crossings:', error);
            setTollCrossings([]);
        } finally {
            setLoadingTolls(false);
        }
    };

    const handleVehicleUnassign = async () => {
        try {
            const { unassignVehicle } = await import('@/api/vehicles');
            await unassignVehicle(booking!.id);

            setBooking(prev => prev ? { ...prev, assignedVehicle: undefined } : null);
            setTollCrossings([]);
            await loadBookingDetails();
            onUpdate?.();

            toast({
                title: "✅ Vehicle Unassigned",
                description: "Vehicle removed successfully",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to unassign vehicle",
                variant: "destructive",
            });
        }
    };

    const getTollFreshness = (crossedAt: string) => {
        const now = new Date();
        const crossedTime = new Date(crossedAt);
        const hoursDiff = (now.getTime() - crossedTime.getTime()) / (1000 * 60 * 60);

        if (hoursDiff < 2) {
            return { label: 'Live', color: 'bg-green-500', dotColor: 'bg-green-500' };
        } else if (hoursDiff < 6) {
            return { label: 'Recent', color: 'bg-yellow-500', dotColor: 'bg-yellow-500' };
        } else {
            return { label: 'Old', color: 'bg-gray-400', dotColor: 'bg-gray-400' };
        }
    };

    if (!booking && !loading) return null;

    const status = statusConfig[booking?.status as keyof typeof statusConfig] || statusConfig.DRAFT;

    return (
        <>
            <Sheet open={isOpen} onOpenChange={onClose}>
                <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
                    {loading ? (
                        <div className="flex items-center justify-center h-screen">
                            <div className="text-center space-y-3">
                                <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
                                <p className="text-sm text-muted-foreground">Loading...</p>
                            </div>
                        </div>
                    ) : booking ? (
                        <>
                            {/* HEADER */}
                            <div className="sticky top-0 z-10 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b backdrop-blur-sm">
                                <div className="p-4">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Package className="w-5 h-5 text-primary shrink-0" />
                                                <h2 className="text-xl font-bold truncate">{booking.bookingId}</h2>
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(booking.bookingDateTime)}
                                                </span>
                                                {booking.branch_name && (
                                                    <>
                                                        <span>•</span>
                                                        <Badge variant="outline" className="text-xs h-5">
                                                            {booking.branch_code}
                                                        </Badge>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 shrink-0">
                                            <Badge className={cn("text-xs", status.color)}>
                                                {status.label}
                                            </Badge>
                                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                                                <X className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Quick Stats */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 text-center border">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <Package className="w-3 h-3 text-blue-600" />
                                                <p className="text-xs text-muted-foreground">Cargo</p>
                                            </div>
                                            <p className="text-sm font-bold">{booking.cargoUnits}</p>
                                        </div>
                                        <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 text-center border">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <Navigation className="w-3 h-3 text-green-600" />
                                                <p className="text-xs text-muted-foreground">Service</p>
                                            </div>
                                            <p className="text-sm font-bold">{booking.serviceType}</p>
                                        </div>
                                        <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 text-center border">
                                            <div className="flex items-center justify-center gap-1 mb-1">
                                                <FileText className="w-3 h-3 text-orange-600" />
                                                <p className="text-xs text-muted-foreground">LR</p>
                                            </div>
                                            <p className="text-xs font-bold truncate">
                                                {booking.lrNumber || 'Pending'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* CONTENT */}
                            <div className="p-4 space-y-4">
                                {/* Route */}
                                <div className="bg-gradient-to-r from-green-50 to-red-50 dark:from-green-950/20 dark:to-red-950/20 rounded-lg p-4 border border-green-200 dark:border-green-800">
                                    <div className="flex items-center gap-2 mb-3">
                                        <Navigation className="w-4 h-4 text-primary" />
                                        <h3 className="font-semibold text-sm">Route</h3>
                                    </div>
                                    <div className="space-y-2">
                                        <div className="flex items-start gap-2">
                                            <div className="mt-1 w-6 h-6 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                                                <MapPin className="w-3 h-3 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground">Pickup from</p>
                                                <p className="font-semibold text-sm truncate">{booking.fromLocation}</p>
                                            </div>
                                        </div>
                                        <div className="ml-3 border-l-2 border-dashed border-gray-300 h-4"></div>
                                        <div className="flex items-start gap-2">
                                            <div className="mt-1 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                                                <MapPin className="w-3 h-3 text-white" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs text-muted-foreground">Deliver to</p>
                                                <p className="font-semibold text-sm truncate">{booking.toLocation}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Parties */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-primary/5 rounded-lg p-3 border border-primary/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                                                <User className="w-3.5 h-3.5 text-primary" />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Consignor</p>
                                        </div>
                                        <p className="font-semibold text-sm truncate" title={booking.consignorName}>
                                            {booking.consignorName}
                                        </p>
                                        {booking.consignorPhone && (
                                            <Button variant="link" className="h-auto p-0 text-xs mt-1" asChild>
                                                <a href={`tel:${booking.consignorPhone}`}>
                                                    <Phone className="w-2.5 h-2.5 mr-1" />
                                                    {booking.consignorPhone}
                                                </a>
                                            </Button>
                                        )}
                                    </div>

                                    <div className="bg-blue-500/5 rounded-lg p-3 border border-blue-500/20">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center">
                                                <User className="w-3.5 h-3.5 text-blue-600" />
                                            </div>
                                            <p className="text-xs text-muted-foreground">Consignee</p>
                                        </div>
                                        <p className="font-semibold text-sm truncate" title={booking.consigneeName}>
                                            {booking.consigneeName}
                                        </p>
                                        {booking.consigneePhone && (
                                            <Button variant="link" className="h-auto p-0 text-xs mt-1" asChild>
                                                <a href={`tel:${booking.consigneePhone}`}>
                                                    <Phone className="w-2.5 h-2.5 mr-1" />
                                                    {booking.consigneePhone}
                                                </a>
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Cargo */}
                                <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                                    <div className="flex items-center gap-2 mb-2">
                                        <Package className="w-4 h-4 text-orange-600" />
                                        <h3 className="font-semibold text-sm">Cargo Details</h3>
                                    </div>
                                    <div className="grid grid-cols-3 gap-3 text-sm">
                                        <div>
                                            <p className="text-xs text-muted-foreground">Material</p>
                                            <p className="font-medium text-xs truncate" title={booking.materialDescription}>
                                                {booking.materialDescription}
                                            </p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Units</p>
                                            <p className="font-bold text-base">{booking.cargoUnits}</p>
                                        </div>
                                        <div>
                                            <p className="text-xs text-muted-foreground">Pickup</p>
                                            <p className="font-medium text-xs">
                                                {booking.pickupDate ? formatDate(booking.pickupDate) : 'TBD'}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Warehouse */}
                                {booking.current_warehouse && (
                                    <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Building2 className="w-4 h-4 text-indigo-600" />
                                            <h3 className="font-semibold text-sm">Current Location</h3>
                                            <Badge className="ml-auto bg-indigo-600 text-white text-xs">
                                                At Warehouse
                                            </Badge>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPinned className="w-3 h-3 text-muted-foreground" />
                                            <p className="font-medium text-sm">{booking.current_warehouse.name}</p>
                                            <span className="text-xs text-muted-foreground">• {booking.current_warehouse.city}</span>
                                        </div>
                                    </div>
                                )}

                                {/* Live Tracking */}
                                {booking.assignedVehicle && (
                                    <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                                        <div className="flex items-center gap-2 mb-3">
                                            <Activity className="w-4 h-4 text-purple-600" />
                                            <h3 className="font-semibold text-sm">Live Tracking</h3>
                                            {loadingTolls ? (
                                                <Loader2 className="w-3 h-3 animate-spin ml-auto" />
                                            ) : (
                                                <Badge variant="outline" className="ml-auto text-xs">
                                                    {tollCrossings.length} {tollCrossings.length === 1 ? 'Toll' : 'Tolls'}
                                                </Badge>
                                            )}
                                        </div>

                                        {tollCrossings.length > 0 ? (
                                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                                {tollCrossings.map((toll) => {
                                                    const freshness = getTollFreshness(toll.crossed_at);
                                                    return (
                                                        <div
                                                            key={toll.id}
                                                            className="flex items-center gap-3 p-2.5 bg-white/70 dark:bg-gray-900/70 rounded-lg border hover:bg-white dark:hover:bg-gray-900 transition-colors"
                                                        >
                                                            <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0 relative">
                                                                <MapPin className="w-4 h-4 text-purple-600" />
                                                                <span className={cn(
                                                                    "absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white",
                                                                    freshness.dotColor
                                                                )} />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="font-semibold text-sm truncate">{toll.toll_name}</p>
                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {formatDateTime(toll.crossed_at)}
                                                                    </p>
                                                                    <Badge className={cn(
                                                                        "text-[10px] px-1.5 py-0 h-4",
                                                                        freshness.color,
                                                                        "text-white"
                                                                    )}>
                                                                        {freshness.label}
                                                                    </Badge>
                                                                </div>
                                                            </div>
                                                            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-sm text-muted-foreground">
                                                {loadingTolls ? (
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        Loading tracking data...
                                                    </div>
                                                ) : (
                                                    <>
                                                        <MapPin className="w-8 h-8 mx-auto mb-2 text-muted-foreground/50" />
                                                        <p>No tracking data available yet</p>
                                                        <p className="text-xs mt-1">Vehicle is on the way</p>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Vehicle */}
                                <div className={cn(
                                    "rounded-lg p-3 border",
                                    booking.assignedVehicle
                                        ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                                        : "bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800"
                                )}>
                                    <div className="flex items-center gap-2 mb-3">
                                        <Truck className={cn(
                                            "w-4 h-4",
                                            booking.assignedVehicle ? "text-green-600" : "text-gray-500"
                                        )} />
                                        <h3 className="font-semibold text-sm">Vehicle Assignment</h3>
                                        {booking.assignedVehicle && (
                                            <CheckCircle2 className="w-4 h-4 text-green-600 ml-auto" />
                                        )}
                                    </div>

                                    {booking.assignedVehicle ? (
                                        <div className="space-y-3">
                                            <div className="grid grid-cols-2 gap-3 text-sm">
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Vehicle No.</p>
                                                    <p className="font-bold">{booking.assignedVehicle.regNumber}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground">Type</p>
                                                    <p className="font-medium text-xs">{booking.assignedVehicle.type}</p>
                                                </div>
                                            </div>

                                            {booking.assignedVehicle.driver && (
                                                <>
                                                    <Separator />
                                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Driver</p>
                                                            <p className="font-semibold text-sm">{booking.assignedVehicle.driver.name}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Phone</p>
                                                            <Button variant="link" className="h-auto p-0 text-sm font-semibold" asChild>
                                                                <a href={`tel:${booking.assignedVehicle.driver.phone}`}>
                                                                    <Phone className="w-3 h-3 mr-1" />
                                                                    Call
                                                                </a>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </>
                                            )}

                                            {booking.broker && (
                                                <>
                                                    <Separator />
                                                    <div className="text-xs">
                                                        <p className="text-muted-foreground">Broker</p>
                                                        <p className="font-medium">{booking.broker.name}</p>
                                                    </div>
                                                </>
                                            )}

                                            <div className="flex gap-2 pt-2">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-xs h-8"
                                                    onClick={() => setShowVehicleAssignModal(true)}
                                                >
                                                    Replace
                                                </Button>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="flex-1 text-xs h-8"
                                                    onClick={handleVehicleUnassign}
                                                >
                                                    Unassign
                                                </Button>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="text-center py-4">
                                            <p className="text-sm text-muted-foreground mb-3">No vehicle assigned</p>
                                            <Button
                                                size="sm"
                                                className="w-full"
                                                onClick={() => setShowVehicleAssignModal(true)}
                                            >
                                                <Truck className="w-4 h-4 mr-2" />
                                                Assign Vehicle
                                            </Button>
                                        </div>
                                    )}
                                </div>

                                {/* E-way Bills */}
                                {booking.eway_bill_details && booking.eway_bill_details.length > 0 && (
                                    <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <Zap className="w-4 h-4 text-yellow-600" />
                                            <h3 className="font-semibold text-sm">E-way Bills</h3>
                                            <Badge variant="secondary" className="ml-auto text-xs">
                                                {booking.eway_bill_details.length}
                                            </Badge>
                                        </div>
                                        <div className="space-y-1.5">
                                            {booking.eway_bill_details.map((ewb: any, index: number) => (
                                                <div key={index} className="flex items-center justify-between text-sm bg-white/50 dark:bg-gray-900/50 rounded px-2 py-1.5">
                                                    <span className="font-mono font-semibold text-xs">{ewb.number}</span>
                                                    {ewb.valid_until && (
                                                        <span className="text-xs text-muted-foreground">
                                                            Until {formatDate(ewb.valid_until)}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* LR */}
                                {booking.lrNumber && (
                                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <FileText className="w-4 h-4 text-blue-600" />
                                            <h3 className="font-semibold text-sm">Lorry Receipt</h3>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-bold">{booking.lrNumber}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {booking.lrDate && formatDate(booking.lrDate)}
                                                </p>
                                            </div>
                                            <Button variant="outline" size="sm">Download</Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : null}
                </SheetContent>
            </Sheet>

            <EnhancedVehicleAssignmentModal
                isOpen={showVehicleAssignModal}
                onClose={() => setShowVehicleAssignModal(false)}
                onAssign={() => {
                    loadBookingDetails();
                    onUpdate?.();
                    setShowVehicleAssignModal(false);
                    toast({
                        title: "✅ Vehicle Assigned",
                        description: "Vehicle assigned successfully",
                    });
                }}
                bookingId={booking?.id || ""}
            />
        </>
    );
};