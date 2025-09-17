import { useState, useEffect } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Search,
  Filter,
  Eye,
  MapPin,
  Truck,
  FileText,
  Download,
  Loader2,
  Package,
  MoreVertical,
  Edit,
  Trash2
} from "lucide-react";
import { fetchBookings, updateBookingStatus, updateBookingWarehouse, deleteBooking, updateBooking, updateBookingLR } from "@/api/bookings";
import { fetchWarehouses } from "@/api/warehouses";
import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { CreateLRModal, LRData } from "./CreateLRModal";
import { BookingFormModal } from "./BookingFormModal";
import { EditFullBookingModal } from "./EditFullBookingModal";
import { WarehouseSelectionModal } from "../../components/WarehouseSelectionModal";
import { generateLRPDF } from "@/lib/lrPdfGenerator";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Convert Supabase data to your existing interface
interface Booking {
  id: string;
  bookingId: string;
  consignorName: string;
  consigneeName: string;
  fromLocation: string;
  toLocation: string;
  cargoUnits?: string; // Storing comma-separated string from LR Modal
  materialDescription: string; // Storing comma-separated string from LR Modal
  serviceType: "FTL" | "PTL";
  status: string;
  pickupDate?: string;
  lrNumber?: string;
  lrDate?: string;
  bilti_number?: string; // Added for LR Modal pre-fill
  invoice_number?: string; // Added for LR Modal pre-fill
  shipmentStatus: "AT_WAREHOUSE" | "IN_TRANSIT" | "DELIVERED";
  current_warehouse?: {
    id?: string;
    name: string;
    city: string;
  };
  assignedVehicle?: {
    vehicleNumber: string;
    vehicleType: string;
    capacity: string;
    driver: {
      name: string;
      phone: string;
    };
  };
  broker?: {
    name: string;
  };
}

interface Warehouse {
  id: string;
  name: string;
  city: string;
  state: string;
}

export const BookingList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
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
  const [warehouseModal, setWarehouseModal] = useState<{
    isOpen: boolean;
    bookingId: string;
    currentWarehouseId?: string;
  }>({ isOpen: false, bookingId: "" });
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false); // For New Booking
  const [isEditFullBookingModalOpen, setIsEditFullBookingModalOpen] = useState(false); // NEW STATE for full edit
  const [editingFullBooking, setEditingFullBooking] = useState<Booking | null>(null); // NEW STATE for full edit
  const [nextLRNumber, setNextLRNumber] = useState(1001); // This might need to be fetched dynamically
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const handleDeleteBooking = async () => {
    if (!deletingBookingId) return;

    try {
      await deleteBooking(deletingBookingId);

      await loadData();

      toast({
        title: "Booking Deleted",
        description: "The booking has been deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete booking",
        variant: "destructive",
      });
    } finally {
      setDeletingBookingId(null);
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const [bookingsData, warehousesData] = await Promise.all([
        fetchBookings(),
        fetchWarehouses()
      ]);

      // Convert Supabase data to your existing format
      const convertedBookings: Booking[] = bookingsData.map(booking => ({
        id: booking.id,
        bookingId: booking.booking_id,
        consignorName: booking.consignor_name,
        consigneeName: booking.consignee_name,
        fromLocation: booking.from_location,
        toLocation: booking.to_location,
        cargoUnits: booking.cargo_units, // This will be string from DB now if LR modal handles it
        materialDescription: booking.material_description, // This will be string from DB now if LR modal handles it
        serviceType: booking.service_type as "FTL" | "PTL",
        status: booking.status,
        pickupDate: booking.pickup_date,
        lrNumber: booking.lr_number,
        lrDate: booking.lr_date,
        bilti_number: booking.bilti_number, // Pass for LR Modal pre-fill
        invoice_number: booking.invoice_number, // Pass for LR Modal pre-fill
        shipmentStatus: "AT_WAREHOUSE", // Defaulting, adjust as needed based on actual logic
        current_warehouse: booking.current_warehouse,
        assignedVehicle: booking.vehicle_assignments && booking.vehicle_assignments.length > 0 ? {
          vehicleNumber: booking.vehicle_assignments[0].vehicle.vehicle_number,
          vehicleType: booking.vehicle_assignments[0].vehicle.vehicle_type,
          capacity: booking.vehicle_assignments[0].vehicle.capacity,
          driver: {
            name: booking.vehicle_assignments[0].driver.name,
            phone: booking.vehicle_assignments[0].driver.phone,
          }
        } : undefined,
        broker: booking.vehicle_assignments && booking.vehicle_assignments.length > 0 && booking.vehicle_assignments[0].broker
          ? booking.vehicle_assignments[0].broker
          : undefined
      }));

      setBookings(convertedBookings);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (bookingId: string, newStatus: string) => {
    try {
      await updateBookingStatus(bookingId, newStatus);
      await loadData();

      toast({
        title: "Status Updated",
        description: `Booking status updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleWarehouseChange = async (bookingId: string, warehouseId: string, warehouseName: string) => {
    try {
      if (warehouseId === 'remove') {
        await updateBookingWarehouse(bookingId, 'remove');
        toast({
          title: "Warehouse Removed",
          description: "Booking removed from warehouse",
        });
      } else {
        await updateBookingWarehouse(bookingId, warehouseId);
        toast({
          title: "Warehouse Updated",
          description: `Booking moved to ${warehouseName} and consignment created`,
        });
      }

      await loadData();
    } catch (error) {
      console.error('Error updating warehouse:', error);
      toast({
        title: "Error",
        description: "Failed to update warehouse. Please try again.",
        variant: "destructive",
      });
    }
  };

  const filteredBookings = bookings.filter(booking => {
    const matchesSearch = booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.consignorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      booking.consigneeName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || booking.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleVehicleAssignment = async (bookingId: string, vehicleAssignment: any) => {
    try {
      await loadData();
      toast({
        title: "Vehicle Assigned Successfully",
        description: `Vehicle ${vehicleAssignment.vehicleNumber} has been assigned`,
      });
    } catch (error) {
      console.error('Error after vehicle assignment:', error);
      toast({
        title: "Error",
        description: "Failed to refresh booking data.",
        variant: "destructive",
      });
    }
  };

  // This handles saving LR details from either CreateLRModal or EditFullBookingModal
  const handleSaveLR = async (bookingId: string, lrData: LRData) => {
    try {
      await updateBookingLR(bookingId, {
        lr_number: lrData.lrNumber,
        lr_date: lrData.lrDate,
        bilti_number: lrData.biltiNumber,
        invoice_number: lrData.invoiceNumber,
        material_description: lrData.materialDescription,
        cargo_units: lrData.cargoUnitsString // Storing comma-separated string
      });

      await loadData();

      toast({
        title: "LR Saved Successfully",
        description: `Lorry Receipt ${lrData.lrNumber} has been saved`,
      });
    } catch (error) {
      console.error('Error saving LR:', error);
      toast({
        title: "Error",
        description: "Failed to save LR. Please try again.",
        variant: "destructive",
      });
    }
  };

  // This handles saving full booking details (general + LR) from EditFullBookingModal
  const handleSaveFullBooking = async (
    bookingId: string,
    generalData: {
      consignor_name: string;
      consignee_name: string;
      from_location: string;
      to_location: string;
      service_type: "FTL" | "PTL";
      pickup_date?: string;
    },
    lrData: LRData
  ) => {
    try {
      // Update general booking details
      await updateBooking(bookingId, generalData);

      // Update LR details
      await updateBookingLR(bookingId, lrData);

      await loadData();
      toast({
        title: "Booking Updated",
        description: `Booking ${bookingId} and LR details saved successfully.`,
      });
      setIsEditFullBookingModalOpen(false); // Close modal on success
      setEditingFullBooking(null);
    } catch (error) {
      console.error('Error saving full booking:', error);
      toast({
        title: "Error",
        description: "Failed to save full booking details. Please try again.",
        variant: "destructive",
      });
      throw error; // Re-throw to allow modal to handle loading state
    }
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading bookings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Bookings</h1>
          <p className="text-muted-foreground">Manage your freight bookings and shipments</p>
        </div>
        <Button
          onClick={() => { setIsBookingFormOpen(true); }} // Open BookingFormModal for new
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
                placeholder="Search by booking ID, consignor, or consignee..."
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
                  <TableHead className="w-[100px]">Booking ID</TableHead>
                  <TableHead className="w-[180px]">
                    <div>Consignor</div>
                    <div className="text-xs font-normal text-muted-foreground">Consignee</div>
                  </TableHead>
                  <TableHead className="w-[200px]">Route</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[140px]">Warehouse</TableHead>
                  <TableHead className="w-[160px]">Vehicle / Broker</TableHead>
                  <TableHead className="w-[140px]">LR Status</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {searchTerm || statusFilter !== "ALL"
                          ? "No bookings found matching your criteria"
                          : "No bookings yet. Create your first booking!"}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => {
                    const isBookingDelivered = booking.status === 'DELIVERED';
                    return (
                      <TableRow key={booking.id} className="border-border hover:bg-muted/50">
                        <TableCell className="font-medium text-primary">
                          <Button
                            variant="link"
                            className="p-0 h-auto font-medium text-sm"
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                          >
                            {booking.bookingId}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium text-sm">{booking.consignorName}</div>
                            <div className="text-xs text-muted-foreground">{booking.consigneeName}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1 text-xs">
                            <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                            <span className="truncate max-w-[80px]">{booking.fromLocation}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="truncate max-w-[80px]">{booking.toLocation}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={booking.status}
                            onValueChange={(value) => handleStatusChange(booking.id, value)}
                          // Status Select is NOT disabled when delivered, as per the last request.
                          // This allows changing status even after delivery, if needed (e.g., to CANCELLED)
                          >
                            <SelectTrigger className="w-[110px] h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="DRAFT">Draft</SelectItem>
                              <SelectItem value="QUOTED">Quoted</SelectItem>
                              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                              <SelectItem value="DISPATCHED">Dispatched</SelectItem>
                              <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                              <SelectItem value="DELIVERED">Delivered</SelectItem>
                              <SelectItem value="CANCELLED">Cancelled</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setWarehouseModal({
                                isOpen: true,
                                bookingId: booking.id,
                                currentWarehouseId: booking.current_warehouse?.id
                              });
                            }}
                            className="w-full max-w-[130px] h-8 text-xs"
                            disabled={isBookingDelivered} // Disable if delivered
                          >
                            {booking.current_warehouse ? (
                              <div className="flex items-center gap-1 truncate">
                                <Package className="w-3 h-3 text-primary flex-shrink-0" />
                                <span className="truncate">{booking.current_warehouse.name}</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-muted-foreground">
                                <Package className="w-3 h-3" />
                                <span>Select</span>
                              </div>
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          {booking.current_warehouse ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignmentModal({ isOpen: true, bookingId: booking.id })}
                              className="gap-1 h-8 text-xs"
                              disabled={isBookingDelivered}

                            >
                              <Truck className="w-3 h-3" />
                              Assign
                            </Button>
                          ) : (
                            booking.assignedVehicle ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center space-x-1">
                                  <Truck className="w-3 h-3 text-primary" />
                                  <span className="font-medium text-xs" >{booking.assignedVehicle.vehicleNumber}</span>

                                </div>
                                {booking.broker && (
                                  <div className="text-xs text-muted-foreground">
                                    {booking.broker.name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="secondary" className="text-xs h-6">
                                No Vehicle
                              </Badge>
                            )
                          )}
                        </TableCell>
                        {/* LR Status */}
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
                                disabled={false} // Download should always be possible if LR exists, regardless of booking status
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
                              // Create LR is NOT disabled when delivered, as per the last request.
                              // This allows creating LR even after delivery if it was missed.
                              >
                                <FileText className="w-4 h-4 mr-1" />
                                Create LR
                              </Button>
                            </div>
                          )}
                        </TableCell>
                        {/* Actions */}
                        <TableCell>
                          <div className="flex space-x-1">
                            {/* Conditional Assign button (only if no vehicle and no warehouse) */}
                            {!booking.assignedVehicle && !booking.current_warehouse && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAssignmentModal({ isOpen: true, bookingId: booking.id })}
                                disabled={isBookingDelivered} // Disable if delivered
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

                            {/* Dropdown for More actions */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                  <span className="sr-only">More actions</span>
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingFullBooking(booking);
                                    setIsEditFullBookingModalOpen(true);
                                  }}
                                  disabled={isBookingDelivered} // Disable edit if delivered
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit All Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => setDeletingBookingId(booking.id)}
                                  disabled={
                                    !!booking.assignedVehicle ||
                                    !!booking.current_warehouse ||
                                    ['DISPATCHED', 'IN_TRANSIT', 'DELIVERED'].includes(booking.status) // Always disable delete for these
                                  }
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <EnhancedVehicleAssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal({ isOpen: false, bookingId: "" })}
        onAssign={(vehicleAssignment) => handleVehicleAssignment(assignmentModal.bookingId, vehicleAssignment)}
        bookingId={assignmentModal.bookingId}
      />

      {/* Create LR Modal (for initial LR creation only) */}
      <CreateLRModal
        isOpen={lrModal.isOpen}
        onClose={() => {
          setLrModal({ isOpen: false, bookingId: "" });
        }}
        onSave={handleSaveLR} // Use general LR save handler
        booking={filteredBookings.find(b => b.id === lrModal.bookingId) || null}
        nextLRNumber={nextLRNumber}
      />

      {/* New Booking Form Modal (for creating new booking only) */}
      <BookingFormModal
        isOpen={isBookingFormOpen}
        onClose={() => {
          setIsBookingFormOpen(false);
        }}
        onSave={async (bookingData) => {
          try {
            const { createBooking } = await import('@/api/bookings');

            const newBooking = await createBooking({
              consignor_name: bookingData.consignorName,
              consignee_name: bookingData.consigneeName,
              from_location: bookingData.fromLocation,
              to_location: bookingData.toLocation,
              service_type: bookingData.serviceType,
              pickup_date: bookingData.pickupDate,
              material_description: "", // Initialize as empty
              cargo_units: "" // Initialize as empty
            });

            await loadData();
            toast({
              title: "Booking Created Successfully",
              description: `Booking ${newBooking.booking_id} has been created successfully`,
            });
            setIsBookingFormOpen(false);
          } catch (error) {
            console.error('Error creating booking:', error);
            toast({
              title: "Error",
              description: "Failed to create booking. Please try again.",
              variant: "destructive",
            });
          }
        }}
      />

      {/* Edit Full Booking Modal (NEW - for editing all details of an existing booking) */}
      <EditFullBookingModal
        isOpen={isEditFullBookingModalOpen}
        onClose={() => {
          setIsEditFullBookingModalOpen(false);
          setEditingFullBooking(null); // Clear editing booking on close
        }}
        editingBooking={editingFullBooking}
        onSave={handleSaveFullBooking} // Use the combined save handler
        nextLRNumber={nextLRNumber}
      />

      <AlertDialog open={!!deletingBookingId} onOpenChange={setDeletingBookingId}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the booking.
              If the booking has active vehicle assignments, is currently in a warehouse,
              or has a status of DISPATCHED, IN_TRANSIT, or DELIVERED, it cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <WarehouseSelectionModal
        isOpen={warehouseModal.isOpen}
        onClose={() => setWarehouseModal({ isOpen: false, bookingId: "" })}
        onSelect={(warehouseId, warehouseName) => handleWarehouseChange(warehouseModal.bookingId, warehouseId, warehouseName)}
        currentWarehouseId={warehouseModal.currentWarehouseId}
        bookingId={warehouseModal.bookingId}
        bookingDisplayId={filteredBookings.find(b => b.id === warehouseModal.bookingId)?.bookingId}
      />
    </div>
  );
};