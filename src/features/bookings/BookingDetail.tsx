import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  FileText,
  MapPin,
  Calendar,
  Package,
  User,
  Truck,
  Phone,
  Mail,
  Upload,
  Download,
  Loader2,
  Clock,
  Building2,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  MapPinned,
  Navigation,
  Edit,
  Activity,
  Zap,
} from "lucide-react";
import { fetchBookingById } from "@/api/bookings";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { VehicleTrackingMap } from '@/components/VehicleTrackingMap';
import { JourneyView } from "@/components/JourneyView";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { generateLRWithTemplate } from "@/api/lr-templates";
import { EditFullBookingModal } from "./EditFullBookingModal";

interface BookingDetail {
  id: string;
  bookingId: string;
  consignorName: string;
  consigneeName: string;
  fromLocation: string;
  toLocation: string;
  cargoUnits: number;
  materialDescription: string;
  serviceType: "FTL" | "PTL";
  status: string;
  pickupDate?: string;
  lrNumber?: string;
  lrDate?: string;
  bilti_number?: string;
  invoice_number?: string;
  bookingDateTime: string;
  branch_id?: string;
  branch_name?: string;
  branch_code?: string;
  branch_city?: string;
  current_warehouse?: {
    id?: string;
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
      email?: string;
      experience: string;
      license_number?: string;
    };
    lastLocation?: {
      lat: number;
      lng: number;
      lastUpdated: string;
      source: string;
    };
    assignedAt?: string;
  };
  broker?: {
    name: string;
    phone?: string;
    company?: string;
  };
  consignor?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    phone?: string;
    email?: string;
  };
  consignee?: {
    name: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    phone?: string;
    email?: string;
  };
  eway_bill_details?: Array<{
    number: string;
    valid_until?: string;
  }>;
  billing_details?: {
    freight_amount?: number;
    advance_paid?: number;
    balance_amount?: number;
    payment_terms?: string;
  };
}

const statusConfig = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    icon: Edit
  },
  QUOTED: {
    label: "Quoted",
    color: "bg-accent text-primary dark:text-primary border-primary/30 dark:bg-[#F38810]/10 dark:text-primary dark:border-[#F38810]/30",
    icon: FileText
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    icon: CheckCircle2
  },
  AT_WAREHOUSE: {
    label: "At Warehouse",
    color: "bg-accent text-primary dark:text-primary border-primary/30 dark:bg-[#F67C09]/10 dark:text-primary dark:border-[#F67C09]/30",
    icon: Package
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "bg-[#FFF8E1] text-primary dark:text-primary border-primary/40 dark:bg-[#F38810]/15 dark:text-primary dark:border-[#F38810]/40",
    icon: Truck
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: "bg-[#FFF3E0] text-primary dark:text-primary border-[#F38810]/40 dark:bg-[#F67C09]/15 dark:text-primary dark:border-[#F67C09]/40",
    icon: TrendingUp
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    icon: CheckCircle2
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    icon: AlertCircle
  },
};

export const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showVehicleAssignModal, setShowVehicleAssignModal] = useState(false);
  const [bookingTimeline, setBookingTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [tollCrossings, setTollCrossings] = useState<any[]>([]);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState<any>(null);

  useEffect(() => {
    if (id) {
      loadBookingDetails(id);
      loadBookingTimeline(id);
    }
  }, [id]);

  const loadBookingDetails = async (bookingId: string) => {
    try {
      setLoading(true);
      const data = await fetchBookingById(bookingId);

      if (data) {
        const hasActiveAssignment = data.vehicle_assignments &&
          Array.isArray(data.vehicle_assignments) &&
          data.vehicle_assignments.length > 0 &&
          data.vehicle_assignments[0].vehicle;

        const convertedBooking: BookingDetail = {
          id: data.id,
          bookingId: data.booking_id,
          consignorName: data.consignor_name,
          consigneeName: data.consignee_name,
          fromLocation: data.from_location,
          toLocation: data.to_location,
          cargoUnits: data.cargo_units,
          materialDescription: data.material_description,
          serviceType: data.service_type as "FTL" | "PTL",
          status: data.status,
          pickupDate: data.pickup_date,
          lrNumber: data.lr_number,
          lrDate: data.lr_date,
          bilti_number: data.bilti_number,
          invoice_number: data.invoice_number,
          bookingDateTime: data.created_at,
          branch_id: data.branch?.id,
          branch_name: data.branch?.branch_name,
          branch_code: data.branch?.branch_code,
          branch_city: data.branch?.city,
          current_warehouse: data.current_warehouse,
          eway_bill_details: data.eway_bill_details || [],
          assignedVehicle: hasActiveAssignment ? {
            id: data.vehicle_assignments[0].vehicle.id,
            regNumber: data.vehicle_assignments[0].vehicle.vehicle_number,
            type: data.vehicle_assignments[0].vehicle.vehicle_type,
            capacity: data.vehicle_assignments[0].vehicle.capacity,
            driver: data.vehicle_assignments[0].driver ? {
              name: data.vehicle_assignments[0].driver.name,
              phone: data.vehicle_assignments[0].driver.phone,
              email: data.vehicle_assignments[0].driver.email,
              experience: data.vehicle_assignments[0].driver.experience || "N/A",
              license_number: data.vehicle_assignments[0].driver.license_number,
            } : undefined,
            assignedAt: data.vehicle_assignments[0].created_at
          } : undefined,
          broker: data.vehicle_assignments?.[0]?.broker,
          consignor: data.consignor,
          consignee: data.consignee,
        };

        setBooking(convertedBooking);
        if (hasActiveAssignment && data.vehicle_assignments[0].id) {
          loadTollCrossings(data.vehicle_assignments[0].id);
        } else {
          setTollCrossings([]);
        }
      }
    } catch (error) {
      console.error('Error loading booking details:', error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadBookingTimeline = async (bookingId: string) => {
    try {
      setTimelineLoading(true);
      const { fetchBookingTimeline } = await import('@/api/bookings');
      const data = await fetchBookingTimeline(bookingId);
      setBookingTimeline(data);
    } catch (error) {
      console.error('Error loading timeline:', error);
    } finally {
      setTimelineLoading(false);
    }
  };

  const loadTollCrossings = async (assignmentId: string) => {
    try {
      const { data, error } = await supabase
        .from('vehicle_tracking')
        .select('id, toll_name, crossed_at, location')
        .eq('assignment_id', assignmentId)
        .order('crossed_at', { ascending: false })
        .limit(3);

      if (error) throw error;
      setTollCrossings(data || []);
    } catch (error) {
      console.error('Error loading toll crossings:', error);
      setTollCrossings([]);
    }
  };

  const handleVehicleUnassign = async () => {
    try {
      const { unassignVehicle } = await import('@/api/vehicles');
      await unassignVehicle(booking!.id);

      setBooking(prev => {
        if (!prev) return null;
        return { ...prev, assignedVehicle: undefined };
      });

      await loadBookingDetails(booking!.id);
      await loadBookingTimeline(booking!.id);

      toast({
        title: "✅ Vehicle Unassigned",
        description: "Vehicle has been removed from this booking",
      });
    } catch (error) {
      console.error('Error unassigning vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to unassign vehicle",
        variant: "destructive",
      });
    }
  };

  const getEventDescription = (event: any) => {
    switch (event.action) {
      case 'BOOKING_CREATED': return 'Booking Created';
      case 'VEHICLE_ASSIGNED': return 'Vehicle Assigned';
      case 'VEHICLE_UNASSIGNED': return 'Vehicle Unassigned';
      case 'ARRIVED_AT_WAREHOUSE': return `Arrived at ${event.warehouse?.name}`;
      case 'DEPARTED_FROM_WAREHOUSE': return `Departed from ${event.warehouse?.name}`;
      default: return event.description || event.action;
    }
  };

  const getEventColor = (action: string) => {
    const colors: Record<string, string> = {
      BOOKING_CREATED: 'bg-primary',
      VEHICLE_ASSIGNED: 'bg-[#F38810]',
      VEHICLE_UNASSIGNED: 'bg-gray-400',
      ARRIVED_AT_WAREHOUSE: 'bg-[#F67C09]',
      DEPARTED_FROM_WAREHOUSE: 'bg-primary',
    };
    return colors[action] || 'bg-gray-400 dark:bg-gray-600';
  };

  const handleDownloadLR = async () => {
    if (!booking?.lrNumber) {
      toast({
        title: "❌ Error",
        description: "LR not found for this booking",
        variant: "destructive",
      });
      return;
    }

    try {
      toast({
        title: "⏳ Generating PDF...",
        description: `Please wait while we generate LR ${booking.lrNumber}`,
      });

      await generateLRWithTemplate(booking.id);

      toast({
        title: "✅ PDF Downloaded",
        description: `LR ${booking.lrNumber} has been downloaded successfully`,
      });
    } catch (error) {
      console.error('Error generating LR:', error);
      toast({
        title: "❌ Download Failed",
        description: "Failed to generate LR PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleEditBooking = () => {
    if (!booking) return;

    const formattedBooking = {
      id: booking.id,
      bookingId: booking.bookingId,
      consignorName: booking.consignorName,
      consigneeName: booking.consigneeName,
      fromLocation: booking.fromLocation,
      toLocation: booking.toLocation,
      cargoUnits: booking.cargoUnits.toString(),
      materialDescription: booking.materialDescription,
      serviceType: booking.serviceType,
      pickupDate: booking.pickupDate,
      lrNumber: booking.lrNumber,
      lrDate: booking.lrDate,
      bilti_number: booking.bilti_number,
      invoice_number: booking.invoice_number,
      eway_bill_details: booking.eway_bill_details || []
    };

    setEditingBooking(formattedBooking);
    setIsEditModalOpen(true);
  };

  const handleSaveFullBooking = async (
    bookingId: string,
    generalData: any,
    lrData: any
  ) => {
    try {
      const { updateBooking, updateBookingLR } = await import('@/api/bookings');
      await updateBooking(bookingId, generalData);
      await updateBookingLR(bookingId, lrData);
      await loadBookingDetails(bookingId);

      toast({
        title: "✅ Booking Updated",
        description: `Booking ${booking?.bookingId} updated successfully`,
      });

      setIsEditModalOpen(false);
      setEditingBooking(null);
    } catch (error) {
      console.error('Error saving booking:', error);
      toast({
        title: "❌ Error",
        description: "Failed to save booking details",
        variant: "destructive",
      });
      throw error;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Loading booking details...
        </p>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-foreground mb-2">Booking Not Found</h2>
          <p className="text-muted-foreground mb-4">The requested booking could not be found.</p>
          <Button
            onClick={() => navigate('/bookings')}
            className="bg-primary hover:bg-primary/90 text-primary-foreground dark:bg-primary dark:hover:bg-primary/90 dark:text-primary-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Button>
        </div>
      </div>
    );
  }
  const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.DRAFT;
  const StatusIcon = status.icon;
  return (
    <div className="space-y-6 pb-8">
      {/* HEADER */}
      <div className="bg-card border-b rounded-lg border-border sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left */}
            <div className="flex items-start gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/bookings')}
                className="shrink-0"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl font-bold text-foreground dark:text-white">{booking.bookingId}</h1>
                  <Badge className={cn("text-sm border", status.color)}>
                    <StatusIcon className="w-4 h-4 mr-1" />
                    {status.label}
                  </Badge>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Created {formatDate(booking.bookingDateTime)}
                  </span>
                  {booking.branch_name && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        <Badge variant="outline" className="border-primary/30">{booking.branch_code}</Badge>
                        {booking.branch_name}
                      </span>
                    </>
                  )}
                  {booking.current_warehouse && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        At {booking.current_warehouse.name}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditBooking}
                className="border-border hover:bg-accent"
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {booking.lrNumber && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadLR}
                  className="border-border hover:bg-accent"
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download LR
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* QUICK INFO - Minimal Style */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Navigation className="w-5 h-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Route</p>
              <p className="font-medium text-sm truncate">{booking.fromLocation}</p>
              <p className="text-xs text-muted-foreground truncate">→ {booking.toLocation}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Package className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Cargo</p>
              <p className="font-semibold">{booking.cargoUnits} Units</p>
              <p className="text-xs text-muted-foreground">{booking.serviceType}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <Calendar className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">Pickup</p>
              <p className="font-medium text-sm">
                {booking.pickupDate ? formatDate(booking.pickupDate) : 'Not Scheduled'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg bg-muted/50">
            <FileText className="w-5 h-5 text-primary shrink-0" />
            <div>
              <p className="text-xs text-muted-foreground">LR Number</p>
              {booking.lrNumber ? (
                <p className="font-medium text-sm">{booking.lrNumber}</p>
              ) : (
                <p className="text-xs text-muted-foreground">Not Generated</p>
              )}
            </div>
          </div>
        </div>

        {/* TABS */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-muted border border-border">
            <TabsTrigger value="overview" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Overview
            </TabsTrigger>
            <TabsTrigger value="parties" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Parties
            </TabsTrigger>
            <TabsTrigger value="vehicle" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Vehicle & Tracking
            </TabsTrigger>
            <TabsTrigger value="documents" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Documents
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-6">
                {/* Parties - Clean Section */}
                <div className="p-6 rounded-xl border border-border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Shipment Parties
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Consignor</p>
                      <p className="font-semibold text-lg">{booking.consignorName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.fromLocation}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">Consignee</p>
                      <p className="font-semibold text-lg">{booking.consigneeName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {booking.toLocation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cargo - Clean Section */}
                <div className="p-6 rounded-xl border border-border bg-card">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-primary" />
                    Cargo Details
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Material</p>
                      <p className="font-medium">{booking.materialDescription}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Units</p>
                      <p className="font-bold text-xl">{booking.cargoUnits}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Service</p>
                      <Badge variant="secondary">{booking.serviceType}</Badge>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Status</p>
                      <Badge className={cn("border", status.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* E-way Bills */}
                {booking.eway_bill_details && booking.eway_bill_details.length > 0 && (
                  <div className="p-6 rounded-xl border border-border bg-card">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-primary" />
                      E-way Bills
                    </h3>
                    <div className="space-y-2">
                      {booking.eway_bill_details.map((ewb: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-primary" />
                            <div>
                              <p className="font-medium text-sm">{ewb.number}</p>
                              {ewb.valid_until && (
                                <p className="text-xs text-muted-foreground">
                                  Valid until: {formatDate(ewb.valid_until)}
                                </p>
                              )}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs border-green-300 text-green-700 dark:border-green-800 dark:text-green-400">
                            Active
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div className="space-y-6">
                {/* Current Warehouse */}
                {booking.current_warehouse && (
                  <div className="p-5 rounded-xl border-2 border-primary/20 bg-primary/5">
                    <div className="flex items-center gap-2 mb-3">
                      <Package className="w-5 h-5 text-primary" />
                      <p className="font-semibold">Current Location</p>
                    </div>
                    <p className="font-bold text-lg">{booking.current_warehouse.name}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="w-3 h-3" />
                      {booking.current_warehouse.city}
                    </p>
                    <Badge className="mt-3 bg-primary text-primary-foreground">At Warehouse</Badge>
                  </div>
                )}

                {/* Recent Activity */}
                <div className="p-5 rounded-xl border border-border bg-card">
                  <div className="flex items-center gap-2 mb-4">
                    <Activity className="w-5 h-5 text-primary" />
                    <p className="font-semibold">Recent Activity</p>
                  </div>
                  {booking.assignedVehicle && tollCrossings.length > 0 ? (
                    <div className="space-y-3">
                      {tollCrossings.map((toll) => (
                        <div key={toll.id} className="flex gap-3">
                          <div className="w-2 h-2 rounded-full mt-2 bg-primary" />
                          <div>
                            <p className="text-sm font-medium">Crossed {toll.toll_name}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(toll.crossed_at)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bookingTimeline.slice(0, 3).map((event, index) => (
                        <div key={index} className="flex gap-3">
                          <div className={cn("w-2 h-2 rounded-full mt-2", getEventColor(event.action))} />
                          <div>
                            <p className="text-sm font-medium">{getEventDescription(event)}</p>
                            <p className="text-xs text-muted-foreground">{formatDateTime(event.created_at)}</p>
                          </div>
                        </div>
                      ))}
                      {bookingTimeline.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">No activity yet</p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* PARTY DETAILS TAB */}
          <TabsContent value="parties" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consignor */}
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Consignor (Sender)
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-semibold text-lg">{booking.consignorName}</p>
                  </div>
                  {booking.consignor?.address && (
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{booking.consignor.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.consignor.city}, {booking.consignor.state} - {booking.consignor.pincode}
                      </p>
                    </div>
                  )}
                  {booking.consignor?.gstin && (
                    <div>
                      <p className="text-xs text-muted-foreground">GSTIN</p>
                      <p className="font-mono font-medium">{booking.consignor.gstin}</p>
                    </div>
                  )}
                  {(booking.consignor?.phone || booking.consignor?.email) && (
                    <>
                      <Separator />
                      <div className="flex flex-wrap gap-2">
                        {booking.consignor?.phone && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${booking.consignor.phone}`}>
                              <Phone className="w-4 h-4 mr-2" />
                              {booking.consignor.phone}
                            </a>
                          </Button>
                        )}
                        {booking.consignor?.email && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${booking.consignor.email}`}>
                              <Mail className="w-4 h-4 mr-2" />
                              {booking.consignor.email}
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Consignee */}
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Consignee (Receiver)
                </h3>
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-semibold text-lg">{booking.consigneeName}</p>
                  </div>
                  {booking.consignee?.address && (
                    <div>
                      <p className="text-xs text-muted-foreground">Address</p>
                      <p className="font-medium">{booking.consignee.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.consignee.city}, {booking.consignee.state} - {booking.consignee.pincode}
                      </p>
                    </div>
                  )}
                  {booking.consignee?.gstin && (
                    <div>
                      <p className="text-xs text-muted-foreground">GSTIN</p>
                      <p className="font-mono font-medium">{booking.consignee.gstin}</p>
                    </div>
                  )}
                  {(booking.consignee?.phone || booking.consignee?.email) && (
                    <>
                      <Separator />
                      <div className="flex flex-wrap gap-2">
                        {booking.consignee?.phone && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${booking.consignee.phone}`}>
                              <Phone className="w-4 h-4 mr-2" />
                              {booking.consignee.phone}
                            </a>
                          </Button>
                        )}
                        {booking.consignee?.email && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`mailto:${booking.consignee.email}`}>
                              <Mail className="w-4 h-4 mr-2" />
                              {booking.consignee.email}
                            </a>
                          </Button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Branch Details */}
            {booking.branch_name && (
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  Branch Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground">Branch Name</p>
                    <p className="font-semibold">{booking.branch_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Branch Code</p>
                    <Badge variant="outline" className="font-mono border-primary/30 text-primary">
                      {booking.branch_code}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">City</p>
                    <p className="font-medium">{booking.branch_city}</p>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* VEHICLE TAB */}
          <TabsContent value="vehicle" className="space-y-6">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              {booking.assignedVehicle ? (
                <div className="p-6 space-y-6">
                  {/* Vehicle Info */}
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="flex items-center gap-2 mb-4">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <p className="font-semibold text-green-700 dark:text-green-300">Vehicle Assigned</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Vehicle Number</p>
                        <p className="font-bold text-lg">{booking.assignedVehicle.regNumber}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Type</p>
                        <p className="font-medium">{booking.assignedVehicle.type}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Capacity</p>
                        <p className="font-medium">{booking.assignedVehicle.capacity}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Assigned On</p>
                        <p className="text-sm">{formatDate(booking.assignedVehicle.assignedAt!)}</p>
                      </div>
                    </div>

                    {/* Driver */}
                    {booking.assignedVehicle.driver && (
                      <>
                        <Separator className="my-4 bg-green-200 dark:bg-green-800" />
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Driver</p>
                            <p className="font-semibold">{booking.assignedVehicle.driver.name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Phone</p>
                            <a href={`tel:${booking.assignedVehicle.driver.phone}`} className="text-primary font-medium">
                              {booking.assignedVehicle.driver.phone}
                            </a>
                          </div>
                          {booking.assignedVehicle.driver.email && (
                            <div>
                              <p className="text-xs text-muted-foreground">Email</p>
                              <p className="text-sm">{booking.assignedVehicle.driver.email}</p>
                            </div>
                          )}
                          <div>
                            <p className="text-xs text-muted-foreground">Experience</p>
                            <p className="font-medium">{booking.assignedVehicle.driver.experience}</p>
                          </div>
                        </div>
                      </>
                    )}

                    {/* Broker */}
                    {booking.broker && (
                      <>
                        <Separator className="my-4 bg-green-200 dark:bg-green-800" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Broker</p>
                            <p className="font-semibold">{booking.broker.name}</p>
                          </div>
                          {booking.broker.company && (
                            <div>
                              <p className="text-xs text-muted-foreground">Company</p>
                              <p className="font-medium">{booking.broker.company}</p>
                            </div>
                          )}
                          {booking.broker.phone && (
                            <div>
                              <p className="text-xs text-muted-foreground">Contact</p>
                              <a href={`tel:${booking.broker.phone}`} className="text-primary font-medium">
                                {booking.broker.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-green-200 dark:border-green-800">
                      {booking.assignedVehicle.driver && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${booking.assignedVehicle.driver.phone}`}>
                            <Phone className="w-4 h-4 mr-2" />
                            Call Driver
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm" onClick={() => setShowVehicleAssignModal(true)}>
                        <Truck className="w-4 h-4 mr-2" />
                        Replace
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                        onClick={handleVehicleUnassign}
                      >
                        Unassign
                      </Button>
                    </div>
                  </div>

                  {/* Map */}
                  <VehicleTrackingMap
                    bookingId={booking.id}
                    vehicleNumber={booking.assignedVehicle.regNumber}
                    fromLocation={booking.fromLocation}
                    toLocation={booking.toLocation}
                    bookingStatus={booking.status}
                    assignmentDate={booking.assignedVehicle.assignedAt}
                  />
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Truck className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Vehicle Assigned</h3>
                  <p className="text-muted-foreground mb-4">Assign a vehicle to start tracking</p>
                  <Button onClick={() => setShowVehicleAssignModal(true)}>
                    <Truck className="w-4 h-4 mr-2" />
                    Assign Vehicle
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* DOCUMENTS TAB */}
          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-lg mb-4">Generated Documents</h3>
                {booking.lrNumber ? (
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <div>
                        <p className="font-semibold">Lorry Receipt (LR)</p>
                        <p className="text-sm text-muted-foreground">
                          {booking.lrNumber} • {booking.lrDate && formatDate(booking.lrDate)}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleDownloadLR}>
                      <Download className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <p>No LR generated yet</p>
                  </div>
                )}
              </div>

              <div className="p-6 rounded-xl border border-border bg-card">
                <h3 className="font-semibold text-lg mb-4">Upload Documents</h3>
                <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                  <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground mb-2">Drop files or click to browse</p>
                  <p className="text-xs text-muted-foreground">PDF, JPG, PNG (Max 10MB)</p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TIMELINE TAB */}
          <TabsContent value="timeline" className="space-y-6">
            <div className="p-6 rounded-xl border border-border bg-card">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Booking Timeline
              </h3>
              {timelineLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-3 text-muted-foreground">Loading...</span>
                </div>
              ) : bookingTimeline.length > 0 ? (
                <div className="space-y-4">
                  {bookingTimeline.map((event, index) => (
                    <div key={index} className="flex gap-4">
                      <div className="relative">
                        <div className={cn("w-3 h-3 rounded-full mt-1.5", getEventColor(event.action))} />
                        {index < bookingTimeline.length - 1 && (
                          <div className="absolute left-1.5 top-5 w-px h-full bg-border" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <div className="flex items-center justify-between">
                          <p className="font-semibold">{getEventDescription(event)}</p>
                          <span className="text-sm text-muted-foreground">{formatDateTime(event.created_at)}</span>
                        </div>
                        {event.warehouse && (
                          <p className="text-sm text-muted-foreground">
                            at {event.warehouse.name}, {event.warehouse.city}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">No timeline events</p>
              )}
            </div>

            <JourneyView bookingId={booking.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Modals */}
      <EnhancedVehicleAssignmentModal
        isOpen={showVehicleAssignModal}
        onClose={() => setShowVehicleAssignModal(false)}
        onAssign={() => {
          loadBookingDetails(booking.id);
          loadBookingTimeline(booking.id);
          setShowVehicleAssignModal(false);
          toast({
            title: "✅ Vehicle Assigned",
            description: "Vehicle has been assigned to this booking",
          });
        }}
        bookingId={booking.id}
      />

      <EditFullBookingModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingBooking(null);
        }}
        editingBooking={editingBooking}
        onSave={handleSaveFullBooking}
        nextLRNumber={1001}
      />
    </div>
  );
};