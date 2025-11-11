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
import { formatValidityDate } from '@/api/ewayBill';
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  Eye,
  AlertTriangle,
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
  eway_bill_details?: any[];
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
// Add AT_WAREHOUSE to statusConfig
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
  AT_WAREHOUSE: {  // ✅ NEW
    label: "At Warehouse",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200",
    icon: Package,
    gradient: "from-indigo-500 to-indigo-600"
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
        eway_bill_details: booking.eway_bill_details || [],
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
        cargo_units: lrData.cargoUnitsString,
        eway_bill_details: lrData.ewayBillDetails
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
    <div className="space-y-8 -mt-1">
      {/* Header Section */}
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-inter">
              Bookings Management
            </h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Track and manage all your freight bookings in one place
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex-1 sm:flex-none"
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
              size="sm"
              onClick={() => setIsBookingFormOpen(true)}
              className="flex-1 sm:flex-none"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Total Bookings</p>
            <div className="flex items-center gap-2 sm:gap-3">
              <Package className="w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <p className="text-xl sm:text-2xl font-semibold">{stats.total}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Confirmed</p>
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              <p className="text-xl sm:text-2xl font-semibold">{stats.confirmed}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground">In Transit</p>
            <div className="flex items-center gap-2 sm:gap-3">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" />
              <p className="text-xl sm:text-2xl font-semibold">{stats.inTransit}</p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-xs sm:text-sm text-muted-foreground">Delivered</p>
            <div className="flex items-center gap-2 sm:gap-3">
              <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
              <p className="text-xl sm:text-2xl font-semibold">{stats.delivered}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between -mt-4">
        <div className="relative w-full sm:flex-1 sm:max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search bookings, parties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-10 border border-gray-200 text-sm sm:text-base"
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
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

      {/* Table Section */}
      <div className="mt-4">
        {/* Desktop Table View */}
        <div className="hidden lg:block overflow-x-auto">
          <Table className="booking-table">
            <TableHeader>
              <TableRow className="hover:bg-[#f6f6f6] bg-[#f6f6f6]">
                <TableHead className="font-semibold">Booking ID</TableHead>
                <TableHead className="font-semibold">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    Parties
                  </div>
                </TableHead>
                <TableHead className="font-semibold">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-muted-foreground" />
                    Route
                  </div>
                </TableHead>
                <TableHead className="font-semibold">Status</TableHead>
                <TableHead className="font-semibold">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-muted-foreground" />
                    Warehouse
                  </div>
                </TableHead>
                <TableHead className="font-semibold">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 text-muted-foreground" />
                    Vehicle
                  </div>
                </TableHead>
                <TableHead className="font-semibold">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    LR Status
                  </div>
                </TableHead>
                <TableHead className="font-semibold text-center">Actions</TableHead>
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
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <TableCell>
                        <Button
                          variant="link"
                          className="p-0 h-auto font-semibold text-primary"
                          onClick={() => navigate(`/bookings/${booking.id}`)}
                        >
                          {booking.bookingId}
                        </Button>
                      </TableCell>

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

                      <TableCell>
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-3 h-3 text-green-600" />
                            <span className="font-medium text-sm truncate max-w-[120px]">
                              {booking.fromLocation}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <MapPin className="w-3 h-3 text-red-600" />
                            <span className="text-xs truncate max-w-[120px]">
                              {booking.toLocation}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <Select
                          value={booking.status}
                          onValueChange={(value) => handleStatusChange(booking.id, value)}
                        >
                          <SelectTrigger className={cn(
                            "w-[120px] h-9 border",
                            status.color
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
                          className="w-[130px]"
                        >
                          {booking.current_warehouse ? (
                            <div className="flex items-center gap-2">
                              <Package className="w-3.5 h-3.5 text-primary" />
                              <span className="truncate text-xs">
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

                      <TableCell>
                        {booking.current_warehouse ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAssignmentModal({ isOpen: true, bookingId: booking.id })}
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
                            </div>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-xs">
                              <AlertCircle className="w-3 h-3 mr-1" />
                              No Vehicle
                            </Badge>
                          )
                        )}
                      </TableCell>

                      <TableCell>
                        {booking.lrNumber ? (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-green-500 text-white text-xs">
                                <FileText className="w-3 h-3 mr-1" />
                                {booking.lrNumber}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDownloadLR(booking)}
                                className="h-7 w-7"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            {booking.eway_bill_details && booking.eway_bill_details.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {booking.eway_bill_details.map((ewb: any, index: number) => (
                                  <Badge
                                    key={index}
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {ewb.number}
                                  </Badge>
                                ))}
                              </div>
                            )}
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
                              className="text-xs h-7"
                            >
                              <FileText className="w-3 h-3 mr-1" />
                              Create
                            </Button>
                          </div>
                        )}
                      </TableCell>

                      <TableCell>
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate(`/bookings/${booking.id}`)}
                            className="h-7 w-7"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
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
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit All Details
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
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

        {/* Mobile Card View */}
        <div className="lg:hidden space-y-3">
          {filteredBookings.length === 0 ? (
            <div className="text-center py-12">
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
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const status = statusConfig[booking.status as keyof typeof statusConfig] || statusConfig.DRAFT;
              const StatusIcon = status.icon;

              return (
                <Card key={booking.id} className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold text-primary text-sm"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                      >
                        {booking.bookingId}
                      </Button>
                      <Badge className={cn("text-xs", status.color)}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingFullBooking(booking);
                            setIsEditFullBookingModalOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Details
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => setDeletingBookingId(booking.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Parties */}
                  <div className="space-y-2 text-sm pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span className="font-medium">{booking.consignorName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3" />
                      <span className="text-muted-foreground">{booking.consigneeName}</span>
                    </div>
                  </div>

                  {/* Route */}
                  <div className="space-y-2 text-sm pt-2 border-t">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-green-600" />
                      <span className="font-medium">{booking.fromLocation}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 text-red-600" />
                      <span className="text-muted-foreground">{booking.toLocation}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2 pt-2 border-t">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                      className="flex-1"
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      View
                    </Button>
                    {!booking.lrNumber && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLrModal({ isOpen: true, bookingId: booking.id })}
                        className="flex-1"
                      >
                        <FileText className="w-3 h-3 mr-1" />
                        Create LR
                      </Button>
                    )}
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </div>

      {/* All Modals - Keep as is */}
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
        booking={(() => {
          const foundBooking = filteredBookings.find(b => b.id === lrModal.bookingId);
          if (!foundBooking) return null;
          return {
            id: foundBooking.id,
            bookingId: foundBooking.bookingId,
            fromLocation: foundBooking.fromLocation,
            toLocation: foundBooking.toLocation,
            lrNumber: foundBooking.lrNumber,
            bilti_number: foundBooking.bilti_number,
            invoice_number: foundBooking.invoice_number,
            materialDescription: foundBooking.materialDescription,
            cargoUnits: foundBooking.cargoUnits,
            eway_bill_details: foundBooking.eway_bill_details || []
          };
        })()}
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