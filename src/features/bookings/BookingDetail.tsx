import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Clock
} from "lucide-react";
import { fetchBookingById } from "@/api/bookings";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { TrackingMap } from "@/components/TrackingMap";
import { useToast } from "@/hooks/use-toast";
import { JourneyView } from "@/components/JourneyView";
import { VehicleTrackingMap } from '@/components/VehicleTrackingMap';

// Interface for converted booking data
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
  assignedVehicle?: {
    id: string;
    regNumber: string;
    type: string;
    capacity: string;
    driver?: {
      name: string;
      phone: string;
      experience: string;
    };
    lastLocation?: {
      lat: number;
      lng: number;
      lastUpdated: string;
      source: string;
    };
    assignedAt?: string;
  };
}

export const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [showVehicleAssignDrawer, setShowVehicleAssignDrawer] = useState(false);
  const [bookingTimeline, setBookingTimeline] = useState<any[]>([]);
  const [timelineLoading, setTimelineLoading] = useState(false);

  // Load booking details from Supabase
  useEffect(() => {
    if (id) {
      loadBookingDetails(id);
      loadBookingTimeline(id);
    }
  }, [id]);

  // Monitor vehicle assignment changes
  useEffect(() => {
    console.log('Current assigned vehicle:', booking?.assignedVehicle);
    console.log('Vehicle exists?', !!booking?.assignedVehicle);
  }, [booking?.assignedVehicle]);

  const loadBookingTimeline = async (bookingId: string) => {
    try {
      setTimelineLoading(true);
      const { fetchBookingTimeline } = await import('@/api/bookings');
      const data = await fetchBookingTimeline(bookingId);
      setBookingTimeline(data);
    } catch (error) {
      console.error('Error loading timeline:', error);
      toast({
        title: "Error",
        description: "Failed to load booking timeline",
        variant: "destructive",
      });
    } finally {
      setTimelineLoading(false);
    }
  };

  const getEventDescription = (event: any) => {
    switch (event.action) {
      case 'BOOKING_CREATED':
        return 'Booking Created';
      case 'VEHICLE_ASSIGNED':
        return 'Vehicle Assigned';
      case 'VEHICLE_UNASSIGNED':
        return 'Vehicle Unassigned';
      case 'ARRIVED_AT_WAREHOUSE':
        return `Arrived at ${event.warehouse?.name} warehouse`;
      case 'DEPARTED_FROM_WAREHOUSE':
        return `Departed from ${event.warehouse?.name} warehouse`;
      default:
        return event.description || event.action;
    }
  };

  const getEventColor = (action: string) => {
    switch (action) {
      case 'BOOKING_CREATED':
        return 'bg-primary';
      case 'VEHICLE_ASSIGNED':
        return 'bg-success';
      case 'VEHICLE_UNASSIGNED':
        return 'bg-warning';
      case 'ARRIVED_AT_WAREHOUSE':
        return 'bg-info';
      case 'DEPARTED_FROM_WAREHOUSE':
        return 'bg-secondary';
      default:
        return 'bg-muted-foreground';
    }
  };

  const loadBookingDetails = async (bookingId: string) => {
    try {
      setLoading(true);
      const data = await fetchBookingById(bookingId);

      if (data) {
        // ✅ FIXED: Proper check for vehicle assignments like BookingList
        const hasActiveAssignment = data.vehicle_assignments &&
          Array.isArray(data.vehicle_assignments) &&
          data.vehicle_assignments.length > 0 &&
          data.vehicle_assignments[0].vehicle; // Also check vehicle exists

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

          // ✅ FIXED: Only show vehicle if truly assigned
          assignedVehicle: hasActiveAssignment ? {
            id: data.vehicle_assignments[0].vehicle.id,
            regNumber: data.vehicle_assignments[0].vehicle.vehicle_number,
            type: data.vehicle_assignments[0].vehicle.vehicle_type,
            capacity: data.vehicle_assignments[0].vehicle.capacity,
            driver: data.vehicle_assignments[0].driver ? {
              name: data.vehicle_assignments[0].driver.name,
              phone: data.vehicle_assignments[0].driver.phone,
              experience: data.vehicle_assignments[0].driver.experience || "N/A"
            } : undefined,
            assignedAt: data.vehicle_assignments[0].created_at
          } : undefined // ← Important: undefined when no assignment
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

  const handleVehicleAssign = async (vehicleId: string, driverId: string) => {
    try {
      // Call Supabase API to assign vehicle
      const { assignVehicleToBooking } = await import('@/api/vehicles');

      await assignVehicleToBooking({
        booking_id: booking!.id,
        vehicle_id: vehicleId,
        driver_id: driverId
      });

      // Reload booking details to get updated data
      await loadBookingDetails(booking!.id);
      await loadBookingTimeline(booking!.id);

      toast({
        title: "✅ Vehicle Assigned Successfully",
        description: "Vehicle has been assigned to this booking",
      });

      setShowVehicleAssignDrawer(false);
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to assign vehicle. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVehicleUnassign = async () => {
    try {
      const { unassignVehicle } = await import('@/api/vehicles');

      // Call unassign API
      await unassignVehicle(booking!.id);

      // ✅ Immediately clear from UI
      setBooking(prev => {
        if (!prev) return null;
        return {
          ...prev,
          assignedVehicle: undefined // Force clear
        };
      });

      // Then reload fresh data
      await loadBookingDetails(booking!.id);
      await loadBookingTimeline(booking!.id);

      toast({
        title: "✅ Vehicle Unassigned",
        description: "Vehicle has been removed from this booking",
      });

    } catch (error) {
      console.error('Error unassigning vehicle:', error);

      // Reload on error too to get correct state
      await loadBookingDetails(booking!.id);

      toast({
        title: "Error",
        description: "Failed to unassign vehicle. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading booking details...</span>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
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

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: "bg-muted text-muted-foreground",
      QUOTED: "bg-info/10 text-info",
      CONFIRMED: "bg-success/10 text-success",
      AT_WAREHOUSE: "bg-indigo-100 text-indigo-700",
      DISPATCHED: "bg-primary/10 text-primary",
      IN_TRANSIT: "bg-warning/10 text-warning",
      DELIVERED: "bg-success text-success-foreground",
      CANCELLED: "bg-destructive/10 text-destructive"
    };
    return colors[status as keyof typeof colors] || colors.DRAFT;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/bookings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{booking.bookingId}</h1>
            <p className="text-muted-foreground">
              Created on {formatDate(booking.bookingDateTime)}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Badge className={getStatusColor(booking.status)}>
            {booking.status.replace('_', ' ')}
          </Badge>
          {(booking.status === 'CONFIRMED' && !booking.assignedVehicle) && (
            <Button onClick={() => setShowVehicleAssignDrawer(true)}>
              <Truck className="w-4 h-4 mr-2" />
              Assign Vehicle
            </Button>
          )}
        </div>
      </div>

      {/* Quick Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <MapPin className="w-8 h-8 text-primary bg-primary/10 p-2 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Route</p>
                <p className="font-medium text-foreground">
                  {booking.fromLocation} → {booking.toLocation}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Package className="w-8 h-8 text-info bg-info/10 p-2 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Cargo</p>
                <p className="font-medium text-foreground">
                  {booking.cargoUnits} units • {booking.serviceType}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <Calendar className="w-8 h-8 text-success bg-success/10 p-2 rounded-lg" />
              <div>
                <p className="text-sm text-muted-foreground">Pickup</p>
                <p className="font-medium text-foreground">
                  {booking.pickupDate ? formatDate(booking.pickupDate) : 'TBD'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="assignment">Assignment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-primary" />
                  <span>Consignor Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{booking.consignorName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{booking.fromLocation}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <User className="w-5 h-5 text-info" />
                  <span>Consignee Details</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium">{booking.consigneeName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{booking.toLocation}</p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Package className="w-5 h-5 text-warning" />
                  <span>Cargo Information</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Material Description</p>
                  <p className="font-medium">{booking.materialDescription}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Units</p>
                  <p className="font-medium">{booking.cargoUnits}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service Type</p>
                  <p className="font-medium">{booking.serviceType}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="assignment" className="mt-6">
          <div className="space-y-6">
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Vehicle Assignment</CardTitle>
              </CardHeader>
              <CardContent>
                {booking.assignedVehicle ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                      <p className="text-success font-medium mb-4">Vehicle Assigned</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Vehicle</p>
                          <p className="font-medium">{booking.assignedVehicle.regNumber}</p>
                          <p className="text-xs text-muted-foreground">{booking.assignedVehicle.type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Driver</p>
                          <p className="font-medium">{booking.assignedVehicle.driver?.name || 'Not Assigned'}</p>
                          <p className="text-xs text-muted-foreground">{booking.assignedVehicle.driver?.experience || 'N/A'}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge className="bg-success/10 text-success">{booking.status}</Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-4">
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
                          onClick={() => setShowVehicleAssignDrawer(true)}
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
                  </div>
                ) : (
                  <div className="text-center py-12">
                    {!booking.assignedVehicle && (
                      <div className="text-center py-12 space-y-6">
                        {/* Icon with animation */}
                        <div className="relative">
                          <Truck className="w-16 h-16 text-muted-foreground/50 mx-auto" />

                        </div>

                        {/* Status and message */}
                        <div className="space-y-2">
                          <h3 className="text-xl font-semibold text-foreground">No Vehicle Assigned</h3>
                          <p className="text-muted-foreground">
                            This booking is ready for vehicle assignment
                          </p>
                          <div className="hover:text-white">
                            <Badge className={getStatusColor(booking.status)}>
                              Current Status: {booking.status.replace('_', ' ')}
                            </Badge>
                          </div>
                        </div>

                        {/* Action buttons */}
                        {!['DELIVERED', 'CANCELLED'].includes(booking.status) && (
                          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                            <Button
                              onClick={() => setShowVehicleAssignDrawer(true)}
                              size="lg"
                              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                            >
                              <Truck className="w-5 h-5 mr-2" />
                              Assign Vehicle
                            </Button>
                          </div>
                        )}

                        {/* Help text */}
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                          Assign a vehicle to dispatch this booking. You can choose from your owned fleet or hire from brokers.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Vehicle Tracking Map - Only show if vehicle is assigned */}
            {booking.assignedVehicle && (
              <VehicleTrackingMap
                bookingId={booking.id}
                vehicleNumber={booking.assignedVehicle.regNumber}
                fromLocation={booking.fromLocation}
                toLocation={booking.toLocation}
                bookingStatus={booking.status}
                assignmentDate={booking.assignedVehicle?.assignedAt}
              />
            )}

            {/* Live Tracking - Only if vehicle assigned with driver and location */}
            {booking.assignedVehicle && booking.assignedVehicle.driver && booking.assignedVehicle.lastLocation && (
              <TrackingMap
                vehicleId={booking.assignedVehicle.id}
                vehicleInfo={{
                  regNumber: booking.assignedVehicle.regNumber,
                  driverName: booking.assignedVehicle.driver.name,
                  driverPhone: booking.assignedVehicle.driver.phone
                }}
                initialLocation={booking.assignedVehicle.lastLocation}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Documents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Generated Documents</h4>
                  <div className="space-y-2">
                    {booking.lrNumber ? (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <FileText className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">LR Copy - {booking.lrNumber}</span>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="w-4 h-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="p-3 bg-muted/50 rounded-lg text-center">
                        <p className="text-sm text-muted-foreground">No LR generated yet</p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <h4 className="font-medium text-foreground">Upload Documents</h4>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Drop files here or click to browse
                    </p>
                    <Button variant="outline" size="sm">
                      Select Files
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline" className="mt-6">
          <div className="space-y-6">
            {/* Booking Timeline Card */}
            <Card className="border-border shadow-sm">
              <CardHeader>
                <CardTitle>Booking Timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {timelineLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                    <span className="ml-2">Loading timeline...</span>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {bookingTimeline.length > 0 ? (
                      bookingTimeline.map((event, index) => (
                        <div key={index} className="flex items-start space-x-4">
                          <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getEventColor(event.action)}`} />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <p className="font-medium text-foreground">
                                {getEventDescription(event)}
                              </p>
                              <span className="text-sm text-muted-foreground">
                                {formatDateTime(event.created_at)}
                              </span>
                            </div>
                            {event.warehouse && (
                              <p className="text-sm text-muted-foreground">
                                at {event.warehouse.name}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground text-center py-4">
                        No timeline events found
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Journey View Component */}
            <JourneyView bookingId={booking.id} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Vehicle Assignment Drawer */}
      <EnhancedVehicleAssignmentModal
        isOpen={showVehicleAssignDrawer}
        onClose={() => setShowVehicleAssignDrawer(false)}
        onAssign={(vehicleAssignment) => {
          // Reload booking details after assignment
          loadBookingDetails(booking.id);
          loadBookingTimeline(booking.id);
          setShowVehicleAssignDrawer(false);

          toast({
            title: "✅ Vehicle Assigned Successfully",
            description: `Vehicle ${vehicleAssignment.vehicleNumber} has been assigned`,
          });
        }}
        bookingId={booking.id}
      />

      {/* Legacy Assignment Drawer */}
      <AssignmentDrawer
        open={showAssignDrawer}
        onClose={() => setShowAssignDrawer(false)}
        bookingId={booking.id}
      />
    </div>
  );
};