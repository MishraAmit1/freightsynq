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
  IndianRupee,
  Weight,
  Ruler,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  MapPinned,
  Navigation,
  Printer,
  Share2,
  Edit,
  MoreVertical,
  FileDown,
  Activity,
  Zap,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { fetchBookingById } from "@/api/bookings";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { VehicleTrackingMap } from '@/components/VehicleTrackingMap';
import { JourneyView } from "@/components/JourneyView";
import { useToast } from "@/hooks/use-toast";

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
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700", icon: Edit },
  QUOTED: { label: "Quoted", color: "bg-blue-100 text-blue-700", icon: FileText },
  CONFIRMED: { label: "Confirmed", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  AT_WAREHOUSE: { label: "At Warehouse", color: "bg-indigo-100 text-indigo-700", icon: Package },
  DISPATCHED: { label: "Dispatched", color: "bg-purple-100 text-purple-700", icon: Truck },
  IN_TRANSIT: { label: "In Transit", color: "bg-orange-100 text-orange-700", icon: TrendingUp },
  DELIVERED: { label: "Delivered", color: "bg-emerald-100 text-emerald-700", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-100 text-red-700", icon: AlertCircle },
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
      VEHICLE_ASSIGNED: 'bg-green-500',
      VEHICLE_UNASSIGNED: 'bg-yellow-500',
      ARRIVED_AT_WAREHOUSE: 'bg-blue-500',
      DEPARTED_FROM_WAREHOUSE: 'bg-purple-500',
    };
    return colors[action] || 'bg-gray-400';
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
          <Button onClick={() => navigate('/bookings')}>
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
      {/* 🔥 ENHANCED HEADER with Actions */}
      <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border-b sticky top-0 z-10 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Left: Back + Title */}
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
                  <h1 className="text-3xl font-bold text-foreground">{booking.bookingId}</h1>
                  <Badge className={cn("text-sm", status.color)}>
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
                        <Badge variant="outline">{booking.branch_code}</Badge>
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

            {/* Right: Action Buttons */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="w-4 h-4 mr-2" />
                Share
              </Button>
              <Button variant="outline" size="sm">
                <FileDown className="w-4 h-4 mr-2" />
                Export
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit Booking
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Download className="w-4 h-4 mr-2" />
                    Download LR
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4">
        {/* 🔥 COMPREHENSIVE INFO CARDS - 4 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Route Card */}
          <Card className="border-l-4 border-l-primary">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                  <Navigation className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground mb-1">Route</p>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-green-600 shrink-0" />
                      <p className="font-medium text-sm truncate">{booking.fromLocation}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-red-600 shrink-0" />
                      <p className="text-sm text-muted-foreground truncate">{booking.toLocation}</p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Cargo Card */}
          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-500/10 rounded-lg shrink-0">
                  <Package className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Cargo Details</p>
                  <p className="font-semibold text-lg">{booking.cargoUnits} Units</p>
                  <p className="text-xs text-muted-foreground">{booking.serviceType} Service</p>
                  <p className="text-xs text-muted-foreground truncate mt-1">
                    {booking.materialDescription}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pickup Card */}
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-green-500/10 rounded-lg shrink-0">
                  <Calendar className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Pickup Date</p>
                  <p className="font-semibold">
                    {booking.pickupDate ? formatDate(booking.pickupDate) : 'Not Scheduled'}
                  </p>
                  {booking.pickupDate && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(booking.pickupDate) > new Date() ? 'Upcoming' : 'Completed'}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* LR/Documents Card */}
          <Card className="border-l-4 border-l-orange-500">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-orange-500/10 rounded-lg shrink-0">
                  <FileText className="w-5 h-5 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">LR Number</p>
                  {booking.lrNumber ? (
                    <>
                      <p className="font-semibold">{booking.lrNumber}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {booking.lrDate && formatDate(booking.lrDate)}
                      </p>
                    </>
                  ) : (
                    <Badge variant="outline" className="text-xs">
                      <Clock className="w-3 h-3 mr-1" />
                      Not Generated
                    </Badge>
                  )}
                  {booking.eway_bill_details && booking.eway_bill_details.length > 0 && (
                    <p className="text-xs text-green-600 mt-1">
                      {booking.eway_bill_details.length} E-way Bill(s)
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 🔥 MAIN CONTENT TABS */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="parties">Party Details</TabsTrigger>
            <TabsTrigger value="vehicle">Vehicle & Tracking</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
            <TabsTrigger value="timeline">Timeline & Journey</TabsTrigger>
          </TabsList>

          {/* ===== OVERVIEW TAB ===== */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left Column - Main Info */}
              <div className="lg:col-span-2 space-y-6">
                {/* Consignor & Consignee Quick View */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Shipment Parties</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Consignor</p>
                            <p className="font-semibold">{booking.consignorName}</p>
                          </div>
                        </div>
                        <div className="pl-10 space-y-1 text-sm">
                          <p className="text-muted-foreground flex items-center gap-2">
                            <MapPinned className="w-3 h-3" />
                            {booking.fromLocation}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-blue-500/10 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Consignee</p>
                            <p className="font-semibold">{booking.consigneeName}</p>
                          </div>
                        </div>
                        <div className="pl-10 space-y-1 text-sm">
                          <p className="text-muted-foreground flex items-center gap-2">
                            <MapPinned className="w-3 h-3" />
                            {booking.toLocation}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cargo Details */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Package className="w-5 h-5 text-orange-600" />
                      Cargo Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Material</p>
                        <p className="font-medium text-sm">{booking.materialDescription}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Units</p>
                        <p className="font-semibold text-lg">{booking.cargoUnits}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Service Type</p>
                        <Badge variant="secondary">{booking.serviceType}</Badge>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Status</p>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* E-way Bills */}
                {booking.eway_bill_details && booking.eway_bill_details.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="w-5 h-5 text-yellow-600" />
                        E-way Bills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
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
                            <Badge variant="outline" className="text-xs">Active</Badge>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Right Column - Quick Actions & Status */}
              <div className="space-y-6">
                {/* Quick Actions */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {!booking.assignedVehicle && (
                      <Button
                        className="w-full justify-start"
                        variant="outline"
                        onClick={() => setShowVehicleAssignModal(true)}
                      >
                        <Truck className="w-4 h-4 mr-2" />
                        Assign Vehicle
                      </Button>
                    )}
                    {booking.lrNumber && (
                      <Button className="w-full justify-start" variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Download LR
                      </Button>
                    )}
                    <Button className="w-full justify-start" variant="outline">
                      <Printer className="w-4 h-4 mr-2" />
                      Print Details
                    </Button>
                    <Button className="w-full justify-start" variant="outline">
                      <Share2 className="w-4 h-4 mr-2" />
                      Share Tracking Link
                    </Button>
                  </CardContent>
                </Card>

                {/* Current Location/Warehouse */}
                {booking.current_warehouse && (
                  <Card className="border-indigo-200 bg-indigo-50/50">
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Package className="w-4 h-4 text-indigo-600" />
                        Current Location
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="font-semibold">{booking.current_warehouse.name}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <MapPin className="w-3 h-3" />
                          {booking.current_warehouse.city}
                        </p>
                        <Badge className="bg-indigo-600 text-white">
                          At Warehouse
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Activity Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Activity className="w-4 h-4" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3 text-sm">
                      {bookingTimeline.slice(0, 3).map((event, index) => (
                        <div key={index} className="flex gap-2">
                          <div className={cn("w-2 h-2 rounded-full mt-1.5", getEventColor(event.action))} />
                          <div className="flex-1">
                            <p className="font-medium text-xs">{getEventDescription(event)}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDateTime(event.created_at)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* ===== PARTY DETAILS TAB ===== */}
          <TabsContent value="parties" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Consignor Full Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-primary" />
                    Consignor (Sender)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold text-lg">{booking.consignorName}</p>
                  </div>
                  {booking.consignor?.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{booking.consignor.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.consignor.city}, {booking.consignor.state} - {booking.consignor.pincode}
                      </p>
                    </div>
                  )}
                  {booking.consignor?.gstin && (
                    <div>
                      <p className="text-sm text-muted-foreground">GSTIN</p>
                      <p className="font-mono font-medium">{booking.consignor.gstin}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Contact Information</p>
                    {booking.consignor?.phone && (
                      <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                        <a href={`tel:${booking.consignor.phone}`}>
                          <Phone className="w-4 h-4 mr-2" />
                          {booking.consignor.phone}
                        </a>
                      </Button>
                    )}
                    {booking.consignor?.email && (
                      <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                        <a href={`mailto:${booking.consignor.email}`}>
                          <Mail className="w-4 h-4 mr-2" />
                          {booking.consignor.email}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Consignee Full Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="w-5 h-5 text-blue-600" />
                    Consignee (Receiver)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-semibold text-lg">{booking.consigneeName}</p>
                  </div>
                  {booking.consignee?.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{booking.consignee.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {booking.consignee.city}, {booking.consignee.state} - {booking.consignee.pincode}
                      </p>
                    </div>
                  )}
                  {booking.consignee?.gstin && (
                    <div>
                      <p className="text-sm text-muted-foreground">GSTIN</p>
                      <p className="font-mono font-medium">{booking.consignee.gstin}</p>
                    </div>
                  )}
                  <Separator />
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Contact Information</p>
                    {booking.consignee?.phone && (
                      <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                        <a href={`tel:${booking.consignee.phone}`}>
                          <Phone className="w-4 h-4 mr-2" />
                          {booking.consignee.phone}
                        </a>
                      </Button>
                    )}
                    {booking.consignee?.email && (
                      <Button variant="outline" size="sm" className="w-full justify-start" asChild>
                        <a href={`mailto:${booking.consignee.email}`}>
                          <Mail className="w-4 h-4 mr-2" />
                          {booking.consignee.email}
                        </a>
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Branch Details if available */}
            {booking.branch_name && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-purple-600" />
                    Branch Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Branch Name</p>
                    <p className="font-semibold">{booking.branch_name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Branch Code</p>
                    <Badge variant="outline" className="font-mono">{booking.branch_code}</Badge>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">City</p>
                    <p className="font-medium">{booking.branch_city}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* ===== VEHICLE & TRACKING TAB ===== */}
          <TabsContent value="vehicle" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Assignment & Live Tracking</CardTitle>
              </CardHeader>
              <CardContent>
                {booking.assignedVehicle ? (
                  <div className="space-y-6">
                    {/* Vehicle Details */}
                    <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2 mb-4">
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                        <p className="font-medium text-green-700 dark:text-green-400">
                          Vehicle Assigned & Active
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Vehicle Number</p>
                          <p className="font-bold text-lg">{booking.assignedVehicle.regNumber}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Vehicle Type</p>
                          <p className="font-medium">{booking.assignedVehicle.type}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Capacity</p>
                          <p className="font-medium">{booking.assignedVehicle.capacity}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Assigned On</p>
                          <p className="text-sm">{formatDate(booking.assignedVehicle.assignedAt!)}</p>
                        </div>
                      </div>

                      {/* Driver Details */}
                      {booking.assignedVehicle.driver && (
                        <>
                          <Separator className="my-4" />
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Driver Name</p>
                              <p className="font-semibold">{booking.assignedVehicle.driver.name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Phone</p>
                              <Button variant="link" size="sm" className="h-auto p-0" asChild>
                                <a href={`tel:${booking.assignedVehicle.driver.phone}`}>
                                  {booking.assignedVehicle.driver.phone}
                                </a>
                              </Button>
                            </div>
                            {booking.assignedVehicle.driver.email && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Email</p>
                                <p className="text-sm">{booking.assignedVehicle.driver.email}</p>
                              </div>
                            )}
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Experience</p>
                              <p className="font-medium">{booking.assignedVehicle.driver.experience}</p>
                            </div>
                          </div>
                        </>
                      )}

                      {/* Broker Details if hired */}
                      {booking.broker && (
                        <>
                          <Separator className="my-4" />
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Broker Name</p>
                              <p className="font-semibold">{booking.broker.name}</p>
                            </div>
                            {booking.broker.company && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Company</p>
                                <p className="font-medium">{booking.broker.company}</p>
                              </div>
                            )}
                            {booking.broker.phone && (
                              <div>
                                <p className="text-xs text-muted-foreground mb-1">Contact</p>
                                <Button variant="link" size="sm" className="h-auto p-0" asChild>
                                  <a href={`tel:${booking.broker.phone}`}>
                                    {booking.broker.phone}
                                  </a>
                                </Button>
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2 mt-4">
                        {booking.assignedVehicle.driver && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${booking.assignedVehicle.driver.phone}`}>
                              <Phone className="w-4 h-4 mr-2" />
                              Call Driver
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowVehicleAssignModal(true)}
                        >
                          <Truck className="w-4 h-4 mr-2" />
                          Replace Vehicle
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleVehicleUnassign}
                        >
                          Unassign Vehicle
                        </Button>
                      </div>
                    </div>

                    {/* Live Tracking Map */}
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
                  <div className="text-center py-12 space-y-6">
                    <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
                      <Truck className="w-10 h-10 text-muted-foreground" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold mb-2">No Vehicle Assigned</h3>
                      <p className="text-muted-foreground mb-4">
                        Assign a vehicle to start tracking and dispatch this booking
                      </p>
                      <Button onClick={() => setShowVehicleAssignModal(true)}>
                        <Truck className="w-4 h-4 mr-2" />
                        Assign Vehicle Now
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ===== DOCUMENTS TAB ===== */}
          <TabsContent value="documents" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Generated Documents</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {booking.lrNumber ? (
                    <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-primary" />
                        <div>
                          <p className="font-semibold">Lorry Receipt (LR)</p>
                          <p className="text-sm text-muted-foreground">
                            {booking.lrNumber} • {booking.lrDate && formatDate(booking.lrDate)}
                          </p>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="p-6 bg-muted/30 rounded-lg text-center">
                      <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        No LR generated yet
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Upload Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer">
                    <Upload className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Drop files here or click to browse
                    </p>
                    <p className="text-xs text-muted-foreground mb-4">
                      Supported: PDF, JPG, PNG (Max 10MB)
                    </p>
                    <Button variant="outline" size="sm">
                      Select Files
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ===== TIMELINE & JOURNEY TAB ===== */}
          <TabsContent value="timeline" className="space-y-6">
            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Booking Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {timelineLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-3">Loading timeline...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookingTimeline.length > 0 ? (
                      bookingTimeline.map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="relative">
                            <div className={cn(
                              "w-3 h-3 rounded-full mt-1.5",
                              getEventColor(event.action)
                            )} />
                            {index < bookingTimeline.length - 1 && (
                              <div className="absolute left-1.5 top-5 w-px h-full bg-border" />
                            )}
                          </div>
                          <div className="flex-1 pb-6">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-semibold">{getEventDescription(event)}</p>
                              <span className="text-sm text-muted-foreground">
                                {formatDateTime(event.created_at)}
                              </span>
                            </div>
                            {event.warehouse && (
                              <p className="text-sm text-muted-foreground">
                                at {event.warehouse.name}, {event.warehouse.city}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-muted-foreground py-8">
                        No timeline events found
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Journey View */}
            <JourneyView bookingId={booking.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Vehicle Assignment Modal */}
      <EnhancedVehicleAssignmentModal
        isOpen={showVehicleAssignModal}
        onClose={() => setShowVehicleAssignModal(false)}
        onAssign={() => {
          loadBookingDetails(booking.id);
          loadBookingTimeline(booking.id);
          setShowVehicleAssignModal(false);
          toast({
            title: "✅ Vehicle Assigned Successfully",
            description: "Vehicle has been assigned to this booking",
          });
        }}
        bookingId={booking.id}
      />
    </div>
  );
};