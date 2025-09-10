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
  Download
} from "lucide-react";
import { mockBookings } from "@/lib/mockData";
import { formatDate, formatDateTime } from "@/lib/utils";
import { AssignmentDrawer } from "./AssignmentDrawer";
import { VehicleAssignmentDrawer } from "../vehicles/VehicleAssignmentDrawer";
import { TrackingMap } from "@/components/TrackingMap";
import { mockVehicles } from "../vehicles/mockVehicles";

export const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showAssignDrawer, setShowAssignDrawer] = useState(false);
  const [showVehicleAssignDrawer, setShowVehicleAssignDrawer] = useState(false);
  const [assignedVehicle, setAssignedVehicle] = useState<any>(null);

  // Find booking by id (in real app, this would be a query)
  const booking = mockBookings.find(b => b.id === id);

  // Initialize assigned vehicle state based on booking status
  useEffect(() => {
    if (booking && (booking.status === 'DISPATCHED' || booking.status === 'IN_TRANSIT' || booking.status === 'DELIVERED')) {
      // Find a mock vehicle for this booking (in real app, this would come from API)
      const mockAssignedVehicle = mockVehicles.find(v => v.status === 'ASSIGNED');
      if (mockAssignedVehicle) {
        setAssignedVehicle(mockAssignedVehicle);
      }
    }
  }, [booking]);

  const handleVehicleAssign = async (vehicleId: string, driverId: string) => {
    // In real app, this would call the API
    const assignedVehicleData = mockVehicles.find(v => v.id === vehicleId);
    if (assignedVehicleData) {
      setAssignedVehicle(assignedVehicleData);
      // Update booking status to DISPATCHED
      // In real app, this would be handled by the API response
    }
  };

  const handleVehicleUnassign = () => {
    setAssignedVehicle(null);
    // In real app, this would call the API to unassign and set status back to CONFIRMED
  };

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
      DISPATCHED: "bg-primary/10 text-primary",
      IN_TRANSIT: "bg-warning/10 text-warning",
      DELIVERED: "bg-success text-success-foreground",
      CANCELLED: "bg-destructive/10 text-destructive"
    };
    return colors[status as keyof typeof colors] || colors.DRAFT;
  };

  const mockTimeline = [
    { event: "Booking Created", timestamp: "2025-09-06T09:00:00Z", user: "John Doe" },
    { event: "Quote Generated", timestamp: "2025-09-06T10:30:00Z", user: "System" },
    { event: "Booking Confirmed", timestamp: "2025-09-06T11:15:00Z", user: "John Doe" },
    { event: "Transporter Assigned", timestamp: "2025-09-06T14:20:00Z", user: "Sarah Wilson" },
  ];

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
          {(booking.status === 'CONFIRMED' && !assignedVehicle) && (
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
                {assignedVehicle ? (
                  <div className="space-y-6">
                    <div className="p-4 bg-success/10 rounded-lg border border-success/20">
                      <p className="text-success font-medium mb-4">Vehicle Assigned</p>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Vehicle</p>
                          <p className="font-medium">{assignedVehicle.regNumber}</p>
                          <p className="text-xs text-muted-foreground">{assignedVehicle.type}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Driver</p>
                          <p className="font-medium">{assignedVehicle.driver?.name}</p>
                          <p className="text-xs text-muted-foreground">{assignedVehicle.driver?.experience}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Status</p>
                          <Badge className="bg-success/10 text-success">DISPATCHED</Badge>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4 mt-4">
                        {assignedVehicle.driver && (
                          <Button variant="outline" size="sm" asChild>
                            <a href={`tel:${assignedVehicle.driver.phone}`}>
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
                    <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Vehicle Assigned</h3>
                    <p className="text-muted-foreground mb-4">
                      This booking hasn't been assigned to a vehicle yet.
                    </p>
                    {booking.status === 'CONFIRMED' && (
                      <Button onClick={() => setShowVehicleAssignDrawer(true)}>
                        <Truck className="w-4 h-4 mr-2" />
                        Assign Vehicle
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Live Tracking */}
            {assignedVehicle && assignedVehicle.driver && assignedVehicle.lastLocation && (
              <TrackingMap 
                vehicleId={assignedVehicle.id}
                vehicleInfo={{
                  regNumber: assignedVehicle.regNumber,
                  driverName: assignedVehicle.driver.name,
                  driverPhone: assignedVehicle.driver.phone
                }}
                initialLocation={assignedVehicle.lastLocation}
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
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="w-4 h-4 text-primary" />
                        <span className="text-sm font-medium">LR Copy</span>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
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
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle>Booking Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTimeline.map((event, index) => (
                  <div key={index} className="flex items-start space-x-4">
                    <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-foreground">{event.event}</p>
                        <span className="text-sm text-muted-foreground">
                          {formatDateTime(event.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">by {event.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Vehicle Assignment Drawer */}
      <VehicleAssignmentDrawer 
        open={showVehicleAssignDrawer} 
        onClose={() => setShowVehicleAssignDrawer(false)}
        bookingId={booking.id}
        bookingInfo={{
          bookingId: booking.bookingId,
          fromLocation: booking.fromLocation,
          toLocation: booking.toLocation,
          consignorName: booking.consignorName,
          consigneeName: booking.consigneeName
        }}
        onAssign={handleVehicleAssign}
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
