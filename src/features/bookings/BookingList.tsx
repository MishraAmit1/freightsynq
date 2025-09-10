import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Filter, 
  Eye,
  MapPin,
  Calendar,
  Truck,
  Navigation,
  FileText,
  Download
} from "lucide-react";
import { mockBookings, Booking, AssignedVehicle } from "@/lib/mockData";
import { formatDate } from "@/lib/utils";
import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { CreateLRModal, LRData } from "./CreateLRModal";
import { BookingFormModal } from "./BookingFormModal";
import { generateLRPDF } from "@/lib/lrPdfGenerator";
import { useToast } from "@/hooks/use-toast";

export const BookingList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>(mockBookings);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignmentModal, setAssignmentModal] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({ isOpen: false, bookingId: "" });
  const [lrModal, setLrModal] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({ isOpen: false, bookingId: "" });
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [nextLRNumber, setNextLRNumber] = useState(1001);

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.consignorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         booking.consigneeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleVehicleAssignment = (bookingId: string, vehicleAssignment: AssignedVehicle) => {
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking.id === bookingId 
          ? { 
              ...booking, 
              assignedVehicle: vehicleAssignment,
              status: "DISPATCHED",
              shipmentStatus: "IN_TRANSIT",
              currentLocation: "Starting journey..."
            }
          : booking
      )
    );
    
    toast({
      title: "Vehicle Assigned Successfully",
      description: `Vehicle ${vehicleAssignment.vehicleNumber} has been assigned to booking ${bookingId}`,
    });
  };

  const handleShipmentStatusChange = (bookingId: string, newStatus: "AT_WAREHOUSE" | "IN_TRANSIT" | "DELIVERED") => {
    setBookings(prevBookings => 
      prevBookings.map(booking => 
        booking.id === bookingId 
          ? { ...booking, shipmentStatus: newStatus }
          : booking
      )
    );
    
    toast({
      title: "Status Updated",
      description: `Shipment status updated to ${newStatus.replace('_', ' ')}`,
    });
  };

  const handleCreateLR = (bookingId: string, lrData: LRData) => {
    setBookings(prevBookings =>
      prevBookings.map(booking =>
        booking.id === bookingId
          ? {
              ...booking,
              lrNumber: lrData.lrNumber,
              lrDate: lrData.lrDate,
              materialDescription: lrData.materialDescription
            }
          : booking
      )
    );

    setNextLRNumber(prev => prev + 1);
    
    toast({
      title: "LR Created Successfully",
      description: `Lorry Receipt ${lrData.lrNumber} has been created`,
    });
  };

  const handleDownloadLR = (booking: Booking) => {
    if (!booking.lrNumber) {
      toast({
        title: "Error",
        description: "LR not found for this booking",
        variant: "destructive",
      });
      return;
    }

    generateLRPDF(booking);
    
    toast({
      title: "PDF Downloaded",
      description: `LR ${booking.lrNumber} has been downloaded`,
    });
  };

  const getShipmentStatusColor = (status: "AT_WAREHOUSE" | "IN_TRANSIT" | "DELIVERED") => {
    const colors = {
      AT_WAREHOUSE: "bg-muted text-muted-foreground",
      IN_TRANSIT: "bg-primary/10 text-primary",
      DELIVERED: "bg-success text-success-foreground"
    };
    return colors[status];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground">Manage your freight bookings and shipments</p>
        </div>
        <Button 
          onClick={() => setIsBookingFormOpen(true)}
          className="bg-gradient-to-r from-primary to-primary-hover text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Booking
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search by LR number, consignor, or consignee..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="QUOTED">Quoted</SelectItem>
                <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings Table */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bookings ({filteredBookings.length})</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border">
                  <TableHead>Booking ID</TableHead>
                  <TableHead>Consignor</TableHead>
                  <TableHead>Consignee</TableHead>
                  <TableHead>Route</TableHead>
                  <TableHead>Vehicle / Broker</TableHead>
                  <TableHead>LR Status</TableHead>
                  <TableHead>Delivery Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.map((booking) => (
                  <TableRow key={booking.id} className="border-border hover:bg-muted/50">
                    <TableCell className="font-medium text-primary">
                      <Button 
                        variant="link" 
                        className="p-0 h-auto font-medium"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        {booking.bookingId}
                      </Button>
                    </TableCell>
                    <TableCell>{booking.consignorName}</TableCell>
                    <TableCell>{booking.consigneeName}</TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2 text-sm">
                        <MapPin className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-32">{booking.fromLocation}</span>
                        <span className="text-muted-foreground">→</span>
                        <span className="truncate max-w-32">{booking.toLocation}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {booking.assignedVehicle ? (
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1">
                            <Truck className="w-3 h-3 text-primary" />
                            <span className="font-medium text-sm">{booking.assignedVehicle.vehicleNumber}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {booking.assignedVehicle.vehicleType}
                          </div>
                          {booking.broker && (
                            <div className="text-xs text-info">
                              Broker: {booking.broker.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground">
                          Unassigned
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {booking.lrNumber ? (
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="font-medium">
                            {booking.lrNumber}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownloadLR(booking)}
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">Pending</Badge>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setLrModal({ isOpen: true, bookingId: booking.id })}
                          >
                            <FileText className="w-4 h-4 mr-1" />
                            Create LR
                          </Button>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={booking.shipmentStatus}
                        onValueChange={(value: "AT_WAREHOUSE" | "IN_TRANSIT" | "DELIVERED") => 
                          handleShipmentStatusChange(booking.id, value)
                        }
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AT_WAREHOUSE">At Warehouse</SelectItem>
                          <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                          <SelectItem value="DELIVERED">Delivered</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-1">
                        {!booking.assignedVehicle && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setAssignmentModal({ isOpen: true, bookingId: booking.id })}
                          >
                            <Truck className="w-4 h-4 mr-1" />
                            Assign
                          </Button>
                        )}
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <EnhancedVehicleAssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal({ isOpen: false, bookingId: "" })}
        onAssign={(vehicleAssignment) => handleVehicleAssignment(assignmentModal.bookingId, vehicleAssignment)}
        bookingId={filteredBookings.find(b => b.id === assignmentModal.bookingId)?.bookingId || ""}
      />

      <CreateLRModal
        isOpen={lrModal.isOpen}
        onClose={() => setLrModal({ isOpen: false, bookingId: "" })}
        onSave={(lrData) => handleCreateLR(lrModal.bookingId, lrData)}
        booking={filteredBookings.find(b => b.id === lrModal.bookingId) || null}
        nextLRNumber={nextLRNumber}
      />

      <BookingFormModal
        isOpen={isBookingFormOpen}
        onClose={() => setIsBookingFormOpen(false)}
        onSave={(bookingData) => {
          const newBooking: Booking = {
            id: `${Date.now()}`,
            ...bookingData,
            status: "DRAFT",
            bookingDateTime: new Date().toISOString(),
            shipmentStatus: "AT_WAREHOUSE"
          };
          setBookings(prev => [newBooking, ...prev]);
          toast({
            title: "Booking Created Successfully",
            description: `Booking ${bookingData.bookingId} has been created`,
          });
        }}
      />
    </div>
  );
};