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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
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
  Trash2,
  Calendar,
  User,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  TrendingUp,
  FileDown
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
import { checkTemplateStatus, generateLRWithTemplate } from "@/api/lr-templates";
import { LRTemplateOnboarding } from "@/components/LRTemplateOnboarding";

// Add custom styles for column hover
const tableStyles = `
  <style>
    .booking-table td {
      position: relative;
    }
    .booking-table td::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: -1px;
      bottom: -1px;
      background: transparent;
      pointer-events: none;
      transition: background-color 0.2s ease;
    }
    .booking-table tr:hover td:nth-child(1)::before { background: rgba(var(--primary), 0.03); }
    .booking-table tr:hover td:nth-child(2)::before { background: rgba(var(--primary), 0.03); }
    .booking-table tr:hover td:nth-child(3)::before { background: rgba(var(--primary), 0.03); }
    .booking-table tr:hover td:nth-child(4)::before { background: rgba(var(--primary), 0.03); }
    .booking-table tr:hover td:nth-child(5)::before { background: rgba(var(--primary), 0.03); }
    .booking-table tr:hover td:nth-child(6)::before { background: rgba(var(--primary), 0.03); }
    .booking-table tr:hover td:nth-child(7)::before { background: rgba(var(--primary), 0.03); }
    .booking-table tr:hover td:nth-child(8)::before { background: rgba(var(--primary), 0.03); }
  </style>
`;

// Convert Supabase data to your existing interface
interface Booking {
  id: string;
  bookingId: string;
  consignorName: string;
  consigneeName: string;
  fromLocation: string;
  toLocation: string;
  cargoUnits?: string;
  materialDescription: string;
  serviceType: "FTL" | "PTL";
  status: string;
  pickupDate?: string;
  lrNumber?: string;
  lrDate?: string;
  bilti_number?: string;
  invoice_number?: string;
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

// Status color mapping with gradient
const statusConfig = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: Edit,
    gradient: "from-gray-500 to-gray-600"
  },
  QUOTED: {
    label: "Quoted",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600"
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle2,
    gradient: "from-green-500 to-green-600"
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "bg-purple-100 text-purple-700 border-purple-200",
    icon: Truck,
    gradient: "from-purple-500 to-purple-600"
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: TrendingUp,
    gradient: "from-orange-500 to-orange-600"
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-emerald-600"
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: XCircle,
    gradient: "from-red-500 to-red-600"
  }
};

export const BookingList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [needsTemplateSetup, setNeedsTemplateSetup] = useState(false);
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
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [isEditFullBookingModalOpen, setIsEditFullBookingModalOpen] = useState(false);
  const [editingFullBooking, setEditingFullBooking] = useState<Booking | null>(null);
  const [nextLRNumber, setNextLRNumber] = useState(1001);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(null);

  // Add style to document
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .booking-table td {
        position: relative;
      }
      .booking-table td::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: -1px;
        bottom: -1px;
        background: transparent;
        pointer-events: none;
        transition: background-color 0.2s ease;
        z-index: 0;
      }
      .booking-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table tr:hover td:nth-child(7)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table tr:hover td:nth-child(8)::before { background: hsl(var(--primary) / 0.03); }
      .booking-table td > * {
        position: relative;
        z-index: 1;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    loadData();
    checkSetupStatus();
  }, []);

  const checkSetupStatus = async () => {
    try {
      const { hasTemplate } = await checkTemplateStatus();
      setNeedsTemplateSetup(!hasTemplate);
    } catch (error) {
      console.error('Error checking template status:', error);
    }
  };

  const handleDeleteBooking = async () => {
    if (!deletingBookingId) return;

    try {
      await deleteBooking(deletingBookingId);
      await loadData();
      toast({
        title: "✅ Booking Deleted",
        description: "The booking has been deleted successfully",
      });
    } catch (error: any) {
      console.error('Error deleting booking:', error);
      toast({
        title: "❌ Error",
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

      const convertedBookings: Booking[] = bookingsData.map(booking => ({
        id: booking.id,
        bookingId: booking.booking_id,
        consignorName: booking.consignor_name,
        consigneeName: booking.consignee_name,
        fromLocation: booking.from_location,
        toLocation: booking.to_location,
        cargoUnits: booking.cargo_units,
        materialDescription: booking.material_description,
        serviceType: booking.service_type as "FTL" | "PTL",
        status: booking.status,
        pickupDate: booking.pickup_date,
        lrNumber: booking.lr_number,
        lrDate: booking.lr_date,
        bilti_number: booking.bilti_number,
        invoice_number: booking.invoice_number,
        shipmentStatus: "AT_WAREHOUSE",
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
        title: "❌ Error",
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
        title: "✅ Status Updated",
        description: `Booking status updated to ${newStatus.replace('_', ' ')}`,
      });
    } catch (error) {
      console.error('Error updating status:', error);
      toast({
        title: "❌ Error",
        description: "Failed to update status",
        variant: "destructive",
      });
    }
  };

  const handleWarehouseChange = async (bookingId: string, warehouseId: string, warehouseName: string) => {
    try {
      if (warehouseId === 'remove') {
        await updateBookingWarehouse(bookingId, 'remove');
        toast({
          title: "✅ Warehouse Removed",
          description: "Booking removed from warehouse",
        });
      } else {
        await updateBookingWarehouse(bookingId, warehouseId);
        toast({
          title: "✅ Warehouse Updated",
          description: `Booking moved to ${warehouseName}`,
        });
      }
      await loadData();
    } catch (error: any) {
      console.error('Error updating warehouse:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update warehouse",
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
        title: "✅ Vehicle Assigned",
        description: `Vehicle ${vehicleAssignment.vehicleNumber} has been assigned`,
      });
    } catch (error) {
      console.error('Error after vehicle assignment:', error);
      toast({
        title: "❌ Error",
        description: "Failed to refresh booking data",
        variant: "destructive",
      });
    }
  };

  const handleSaveLR = async (bookingId: string, lrData: LRData) => {
    try {
      await updateBookingLR(bookingId, {
        lr_number: lrData.lrNumber,
        lr_date: lrData.lrDate,
        bilti_number: lrData.biltiNumber,
        invoice_number: lrData.invoiceNumber,
        material_description: lrData.materialDescription,
        cargo_units: lrData.cargoUnitsString
      });

      await loadData();
      toast({
        title: "✅ LR Saved",
        description: `Lorry Receipt ${lrData.lrNumber} has been saved`,
      });
    } catch (error) {
      console.error('Error saving LR:', error);
      toast({
        title: "❌ Error",
        description: "Failed to save LR",
        variant: "destructive",
      });
    }
  };

  const handleSaveFullBooking = async (
    bookingId: string,
    generalData: {
      consignor_id?: string;
      consignee_id?: string;
      from_location: string;
      to_location: string;
      service_type: "FTL" | "PTL";
      pickup_date?: string;
    },
    lrData: LRData
  ) => {
    try {
      await updateBooking(bookingId, generalData);
      await updateBookingLR(bookingId, lrData);
      await loadData();
      toast({
        title: "✅ Booking Updated",
        description: `Booking ${bookingId} updated successfully`,
      });
      setIsEditFullBookingModalOpen(false);
      setEditingFullBooking(null);
    } catch (error) {
      console.error('Error saving full booking:', error);
      toast({
        title: "❌ Error",
        description: "Failed to save booking details",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleDownloadLR = async (booking: Booking) => {
    if (!booking.lrNumber) {
      toast({
        title: "❌ Error",
        description: "LR not found for this booking",
        variant: "destructive",
      });
      return;
    }

    try {
      await generateLRWithTemplate(booking.id);
      toast({
        title: "✅ PDF Downloaded",
        description: `LR ${booking.lrNumber} has been downloaded`,
      });
    } catch (error) {
      console.error('Error generating LR:', error);
      toast({
        title: "❌ Error",
        description: "Failed to generate LR PDF",
        variant: "destructive",
      });
    }
  };

  if (needsTemplateSetup) {
    return <LRTemplateOnboarding onComplete={() => setNeedsTemplateSetup(false)} />;
  }

  const handleExport = () => {
    const headers = [
      "Booking ID",
      "consignor_name",
      "consignee_name",
      "from_location",
      "to_location",
      "cargo_units",
      "material_description",
      "service_type",
      "pickup_date",
      "invoice_number",
      "lr_number",
      "lr_date",
      "bilti_number",
      "current_warehouse",
      "status"
    ];

    const rows = filteredBookings.map(booking => [
      booking.bookingId,
      booking.consignorName,
      booking.consigneeName,
      booking.fromLocation,
      booking.toLocation,
      booking.cargoUnits || "",
      booking.materialDescription,
      booking.serviceType,
      booking.pickupDate || "",
      booking.invoice_number || "",
      booking.lrNumber || "",
      booking.lrDate ? new Date(booking.lrDate).toISOString().split('T')[0] : "",
      booking.bilti_number || "",
      booking.current_warehouse?.name || "",
      booking.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Exported Successfully",
      description: `${filteredBookings.length} bookings exported to CSV`,
    });
  };

  // Statistics Cards
  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    inTransit: bookings.filter(b => b.status === 'IN_TRANSIT').length,
    delivered: bookings.filter(b => b.status === 'DELIVERED').length,
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Loading your bookings...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-2">
      {/* Header Section with Gradient */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="relative flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Bookings Management
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Track and manage all your freight bookings in one place
            </p>
          </div>
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="border-primary/20 hover:bg-primary/10 transition-all duration-200"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export bookings to CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={() => setIsBookingFormOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards - All with same styling */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Bookings</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Package className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Confirmed</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                  {stats.confirmed}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">In Transit</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                  {stats.inTransit}
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <Truck className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Delivered</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                  {stats.delivered}
                </p>
              </div>
              <div className="p-3 bg-emerald-500/10 rounded-xl">
                <CheckCircle2 className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Filters Section */}
      <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/10">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search bookings, consignor, consignee..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 border-muted-foreground/20 focus:border-primary transition-all duration-200 bg-background/50 backdrop-blur-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56 h-11 border-muted-foreground/20 bg-background/50 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-500" />
                    All Statuses
                  </div>
                </SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem key={key} value={key}>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        {config.label}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Bookings Table with Column Hover */}
      <Card className="border-border shadow-xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <CardTitle className="flex items-center justify-between text-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-5 h-5 text-primary" />
              </div>
              <span>Active Bookings ({filteredBookings.length})</span>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="booking-table">
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/30 bg-muted/10">
                  <TableHead className="font-semibold text-primary w-[100px]">Booking ID</TableHead>
                  <TableHead className="font-semibold w-[160px]">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Parties
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold w-[160px]">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Route
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold w-[130px]">Status</TableHead>
                  <TableHead className="font-semibold w-[140px]">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-muted-foreground" />
                      Warehouse
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold w-[150px]">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      Vehicle
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold w-[160px]">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-muted-foreground" />
                      LR Status
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-center w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-muted/30 rounded-full">
                          <Package className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <div className="text-muted-foreground">
                          <p className="text-lg font-medium">No bookings found</p>
                          <p className="text-sm mt-1">
                            {searchTerm || statusFilter !== "ALL"
                              ? "Try adjusting your filters"
                              : "Create your first booking to get started"}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBookings.map((booking) => {
                    const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.DRAFT;
                    const StatusIcon = status.icon;

                    return (
                      <TableRow
                        key={booking.id}
                        className="border-border hover:bg-muted/20 transition-all duration-200 group"
                      >
                        <TableCell>
                          <Button
                            variant="link"
                            className="p-0 h-auto font-semibold text-primary hover:text-primary/80 transition-colors"
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                          >
                            {booking.bookingId}
                          </Button>
                        </TableCell>

                        {/* Parties - Vertical Layout */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary" />
                              <span className="font-medium text-sm">{booking.consignorName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <ArrowRight className="w-3 h-3" />
                              <span className="text-xs">{booking.consigneeName}</span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Route - Vertical Layout */}
                        <TableCell>
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <MapPin className="w-3 h-3 text-green-600" />
                              <span className="font-medium text-sm truncate max-w-[120px]" title={booking.fromLocation}>
                                {booking.fromLocation}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-muted-foreground">
                              <MapPin className="w-3 h-3 text-red-600" />
                              <span className="text-xs truncate max-w-[120px]" title={booking.toLocation}>
                                {booking.toLocation}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status - Always Editable */}
                        <TableCell>
                          <Select
                            value={booking.status}
                            onValueChange={(value) => handleStatusChange(booking.id, value)}
                          >
                            <SelectTrigger className={cn(
                              "w-[120px] h-9 border",
                              status.color,
                              "hover:opacity-90 transition-all"
                            )}>
                              <div className="flex items-center gap-1.5">
                                <StatusIcon className="w-3.5 h-3.5" />
                                <span className="text-xs">{status.label}</span>
                              </div>
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([key, config]) => {
                                const Icon = config.icon;
                                return (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <Icon className="w-4 h-4" />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </TableCell>

                        {/* Warehouse - Always Editable */}
                        <TableCell>
                          <Button
                            variant={booking.current_warehouse ? "secondary" : "outline"}
                            size="sm"
                            onClick={() => {
                              setWarehouseModal({
                                isOpen: true,
                                bookingId: booking.id,
                                currentWarehouseId: booking.current_warehouse?.id
                              });
                            }}
                            className="hover:scale-105 transition-transform w-[130px]"
                          >
                            {booking.current_warehouse ? (
                              <div className="flex items-center gap-2">
                                <Package className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                                <span className="truncate font-medium text-xs">
                                  {booking.current_warehouse.name}
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-muted-foreground">
                                <Package className="w-3.5 h-3.5" />
                                <span className="text-xs">Select</span>
                              </div>
                            )}
                          </Button>
                        </TableCell>

                        {/* Vehicle - Always Editable */}
                        <TableCell>
                          {booking.current_warehouse ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setAssignmentModal({ isOpen: true, bookingId: booking.id })}
                              className="hover:bg-primary/10 hover:border-primary transition-all"
                            >
                              <Truck className="w-3.5 h-3.5 mr-1" />
                              <span className="text-xs">Assign</span>
                            </Button>
                          ) : (
                            booking.assignedVehicle ? (
                              <div className="space-y-1">
                                <Badge variant="secondary" className="gap-1 text-xs">
                                  <Truck className="w-3 h-3" />
                                  {booking.assignedVehicle.vehicleNumber}
                                </Badge>
                                {booking.broker && (
                                  <div className="text-xs text-muted-foreground pl-1">
                                    via {booking.broker.name}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                No Vehicle
                              </Badge>
                            )
                          )}
                        </TableCell>

                        {/* LR Status */}
                        <TableCell>
                          {booking.lrNumber ? (
                            <div className="flex items-center gap-2">
                              <Badge className="bg-gradient-to-r from-green-500 to-green-600 text-white text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {booking.lrNumber}
                              </Badge>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDownloadLR(booking)}
                                      className="h-7 w-7 hover:bg-primary/10"
                                    >
                                      <Download className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Download LR PDF</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-muted-foreground text-xs">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setLrModal({ isOpen: true, bookingId: booking.id })}
                                className="hover:bg-primary/10 hover:border-primary transition-all text-xs h-7"
                              >
                                <FileText className="w-3 h-3 mr-1" />
                                Create
                              </Button>
                            </div>
                          )}
                        </TableCell>

                        {/* Actions - Always Available */}
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            {!booking.assignedVehicle && !booking.current_warehouse && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() => setAssignmentModal({ isOpen: true, bookingId: booking.id })}
                                      className="h-7 w-7 hover:bg-primary/10"
                                    >
                                      <Truck className="w-3.5 h-3.5" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Assign Vehicle</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => navigate(`/bookings/${booking.id}`)}
                                    className="h-7 w-7 hover:bg-primary/10"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 hover:bg-primary/10"
                                >
                                  <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuItem
                                  onClick={() => {
                                    setEditingFullBooking(booking);
                                    setIsEditFullBookingModalOpen(true);
                                  }}
                                  className="hover:bg-primary/10"
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit All Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-destructive hover:bg-destructive/10"
                                  onClick={() => setDeletingBookingId(booking.id)}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Booking
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

      {/* All Modals */}
      <EnhancedVehicleAssignmentModal
        isOpen={assignmentModal.isOpen}
        onClose={() => setAssignmentModal({ isOpen: false, bookingId: "" })}
        onAssign={(vehicleAssignment) => handleVehicleAssignment(assignmentModal.bookingId, vehicleAssignment)}
        bookingId={assignmentModal.bookingId}
      />

      <CreateLRModal
        isOpen={lrModal.isOpen}
        onClose={() => setLrModal({ isOpen: false, bookingId: "" })}
        onSave={handleSaveLR}
        booking={filteredBookings.find(b => b.id === lrModal.bookingId) || null}
        nextLRNumber={nextLRNumber}
      />

      <BookingFormModal
        isOpen={isBookingFormOpen}
        onClose={() => setIsBookingFormOpen(false)}
        onSave={async (bookingData: any) => {
          try {
            const { createBooking } = await import('@/api/bookings');
            const newBooking = await createBooking(bookingData);
            await loadData();
            toast({
              title: "✅ Booking Created",
              description: `Booking ${newBooking.booking_id} has been created successfully`,
            });
          } catch (error) {
            console.error('Error creating booking:', error);
            toast({
              title: "❌ Error",
              description: "Failed to create booking",
              variant: "destructive",
            });
          }
        }}
      />

      <EditFullBookingModal
        isOpen={isEditFullBookingModalOpen}
        onClose={() => {
          setIsEditFullBookingModalOpen(false);
          setEditingFullBooking(null);
        }}
        editingBooking={editingFullBooking}
        onSave={handleSaveFullBooking}
        nextLRNumber={nextLRNumber}
      />

      <AlertDialog open={!!deletingBookingId} onOpenChange={() => setDeletingBookingId(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" />
              Are you absolutely sure?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-left">
              This action cannot be undone. This will permanently delete the booking.
              <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                <p className="text-sm font-medium text-destructive">
                  ⚠️ This booking cannot be deleted if:
                </p>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• It has active vehicle assignments</li>
                  <li>• It's currently in a warehouse</li>
                  <li>• Status is DISPATCHED, IN_TRANSIT, or DELIVERED</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Booking
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