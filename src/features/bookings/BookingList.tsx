import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  FileDown,
  Building2,
  X
} from "lucide-react";
import { fetchBookings, updateBookingStatus, updateBookingWarehouse, deleteBooking, updateBooking, updateBookingLR } from "@/api/bookings";
import { fetchWarehouses } from "@/api/warehouses";

import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { CreateLRModal, LRData } from "./CreateLRModal";
import { BookingFormModal } from "./BookingFormModal";
import { EditFullBookingModal } from "./EditFullBookingModal";
import { WarehouseSelectionModal } from "../../components/WarehouseSelectionModal";
import { useToast } from "@/hooks/use-toast";
import { checkTemplateStatus, generateLRWithTemplate } from "@/api/lr-templates";
import { LRTemplateOnboarding } from "@/components/LRTemplateOnboarding";
import { getBookingStage, getProgressiveAction, stageConfig } from "@/lib/bookingStages";
import { ProgressiveActionButton } from "@/components/ProgressiveActionButton";
import { UploadPODModal } from "./UploadPODModal";
import { BookingDetailSheet } from "./BookingDetailSheet";

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
  branch_id?: string;
  branch_name?: string;
  branch_code?: string;
  branch_city?: string;
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

  // ✅ NEW FIELDS - Add these
  vehicle_assignments?: Array<{
    status: string;
    last_toll_crossed?: string;
    last_toll_time?: string;
    tracking_start_time?: string;
    vehicle?: {
      vehicle_number: string;
      vehicle_type: string;
      capacity: string;
    };
    driver?: {
      name: string;
      phone: string;
    };
  }>;

  // For stage detection (already exists but confirming)
  pod_uploaded_at?: string;
  pod_file_url?: string;
  billed_at?: string;
  actual_delivery?: string;
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
// ✅ ADD THIS HELPER FUNCTION (Before BookingList component)

/**
 * Helper function to determine what to display in Warehouse/Location column
 * Priority: Warehouse > Live Tracking > Vehicle (no tracking) > Draft
 */
const getLocationDisplay = (booking: Booking) => {
  // Priority 1: Warehouse (Physical location confirmed)
  if (booking.current_warehouse) {
    return {
      type: 'WAREHOUSE' as const,
      icon: Package,
      iconColor: 'text-indigo-600',
      bgColor: 'bg-indigo-50',
      badgeText: 'Warehouse',
      badgeVariant: 'secondary' as const,
      primary: booking.current_warehouse.name,
      secondary: booking.current_warehouse.city,
      isFresh: true, // Warehouse is always "current"
      showDot: false
    };
  }

  // Priority 2: Vehicle with Live Tracking
  const activeAssignment = booking.vehicle_assignments?.find(v => v.status === 'ACTIVE');

  if (activeAssignment?.last_toll_crossed && activeAssignment?.last_toll_time) {
    // Calculate time difference
    const lastUpdate = new Date(activeAssignment.last_toll_time);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    // Determine freshness
    const isFresh = hoursDiff < 2;        // Green if < 2 hours
    const isStale = hoursDiff >= 2 && hoursDiff < 6;  // Yellow if 2-6 hours
    const isOld = hoursDiff >= 6;         // Gray if > 6 hours

    // Format time ago
    const getTimeAgo = () => {
      if (hoursDiff < 1) {
        const minutes = Math.floor(hoursDiff * 60);
        return `${minutes}m ago`;
      } else if (hoursDiff < 24) {
        return `${Math.floor(hoursDiff)}h ago`;
      } else {
        const days = Math.floor(hoursDiff / 24);
        return `${days}d ago`;
      }
    };

    return {
      type: 'TRACKING' as const,
      icon: MapPin,
      iconColor: isFresh ? 'text-orange-600' : isStale ? 'text-yellow-600' : 'text-gray-500',
      bgColor: isFresh ? 'bg-orange-50' : isStale ? 'bg-yellow-50' : 'bg-gray-50',
      badgeText: 'En Route',
      badgeVariant: 'outline' as const,
      primary: activeAssignment.last_toll_crossed,
      secondary: getTimeAgo(),
      isFresh: isFresh,
      isStale: isStale,
      isOld: isOld,
      showDot: true,
      dotColor: isFresh ? 'bg-green-500' : isStale ? 'bg-yellow-500' : 'bg-gray-400'
    };
  }

  // Priority 3: Vehicle Assigned but No Tracking Data
  if (activeAssignment) {
    return {
      type: 'VEHICLE' as const,
      icon: Truck,
      iconColor: 'text-blue-600',
      bgColor: 'bg-blue-50',
      badgeText: 'Dispatched',
      badgeVariant: 'outline' as const,
      primary: 'On the way',
      secondary: 'No tracking yet',
      isFresh: false,
      showDot: false
    };
  }

  // Priority 4: Draft / Not Dispatched
  return {
    type: 'DRAFT' as const,
    icon: AlertCircle,
    iconColor: 'text-gray-400',
    bgColor: 'bg-gray-50',
    badgeText: 'Draft',
    badgeVariant: 'outline' as const,
    primary: 'Not dispatched',
    secondary: null,
    isFresh: false,
    showDot: false
  };
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
  const [podModal, setPodModal] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({ isOpen: false, bookingId: "" });

  const [invoiceModal, setInvoiceModal] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({ isOpen: false, bookingId: "" });
  const [detailSheet, setDetailSheet] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({ isOpen: false, bookingId: "" });
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

      const convertedBookings: Booking[] = bookingsData.map(booking => {
        // ✅ Get active vehicle assignment
        const activeAssignment = (booking.vehicle_assignments || []).find(va => va.status === 'ACTIVE');

        let vehicle = null;
        if (activeAssignment) {
          vehicle = activeAssignment.vehicle_type === 'OWNED'
            ? activeAssignment.owned_vehicle
            : activeAssignment.hired_vehicle;
        }

        return {
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
          branch_id: booking.branch?.id,
          branch_name: booking.branch?.branch_name,
          branch_code: booking.branch?.branch_code,
          branch_city: booking.branch?.city,

          // ✅ IMPROVED: Only use ACTIVE assignment
          assignedVehicle: activeAssignment && vehicle ? {
            vehicleNumber: vehicle.vehicle_number,
            vehicleType: vehicle.vehicle_type,
            capacity: vehicle.capacity,
            driver: {
              name: activeAssignment.driver?.name || '',
              phone: activeAssignment.driver?.phone || '',
            }
          } : undefined,

          broker: activeAssignment?.broker || undefined,

          // ✅ NEW FIELDS for stage detection
          pod_uploaded_at: booking.pod_uploaded_at,
          pod_file_url: booking.pod_file_url,
          billed_at: booking.billed_at,
          actual_delivery: booking.actual_delivery,
          vehicle_assignments: activeAssignment ? [activeAssignment] : []
        };
      });

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
    <div className="space-y-6">
      {/* 🔥 CARD 1: Stats + Buttons - Single Line */}
      <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-4">
        {/* Stats - Single Card with Dividers */}
        <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl flex-1 p-4 sm:p-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-0 h-full">
            {/* Total Bookings */}
            <div className="sm:px-6 py-4 first:pl-0 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Package className="w-8 h-8 text-gray-600 dark:text-gray-400" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Total Bookings
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stats.total}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
            </div>

            {/* Confirmed */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Confirmed
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stats.confirmed}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
            </div>

            {/* In Transit */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Truck className="w-8 h-8 text-orange-600" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  In Transit
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stats.inTransit}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
            </div>

            {/* Delivered */}
            <div className="sm:px-6 py-4 last:pr-0 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground">
                  Delivered
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                  {stats.delivered}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons - Right Side */}
        <div className="flex flex-wrap gap-2 md:flex-nowrap md:ml-auto md:items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="flex-1 sm:flex-none bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
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

      {/* 🔥 CARD 2: Search + Filters + Table */}
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">

        {/* Search and Filters Section */}
        <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Bar */}
            <div className="relative w-full sm:w-96">
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

            {/* Status Filter */}
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
        </div>

        {/* Table Section */}
        <div className="p-4 sm:p-6">
          {/* Desktop Table View */}
          {/* Desktop Table View */}
          <div className="hidden lg:block">
            <div className="w-full overflow-auto">
              <Table className="min-w-full">
                <TableHeader className="sticky top-0 z-10 bg-gray-50 dark:bg-gray-900">
                  <TableRow className="border-b-2 border-gray-200 dark:border-gray-700">
                    <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-[130px]">
                      <div className="flex items-center gap-2">
                        <Package className="w-4 h-4 text-primary" />
                        Booking
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-[220px]">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-primary" />
                        Parties & Route
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-[130px]">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-primary" />
                        Stage
                      </div>
                    </TableHead>
                    {/* Location Column Header - Line ~700 */}
                    <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-[180px]">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" />
                        Location
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-[130px]">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-primary" />
                        Vehicle
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-[140px]">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        LR Status
                      </div>
                    </TableHead>
                    <TableHead className="font-bold text-gray-900 dark:text-gray-100 w-[100px] text-center">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBookings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-20">
                        <div className="flex flex-col items-center gap-4">
                          <div className="p-5 bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl">
                            <Package className="w-16 h-16 text-primary/40" />
                          </div>
                          <div className="space-y-2">
                            <p className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                              No bookings found
                            </p>
                            <p className="text-sm text-muted-foreground max-w-md">
                              {searchTerm || statusFilter !== "ALL"
                                ? "Try adjusting your filters"
                                : "Create your first booking"}
                            </p>
                          </div>
                          {!searchTerm && statusFilter === "ALL" && (
                            <Button onClick={() => setIsBookingFormOpen(true)} className="mt-2">
                              <Plus className="w-4 h-4 mr-2" />
                              Create First Booking
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBookings.map((booking, index) => {
                      const stage = getBookingStage(booking);
                      const stageConf = stageConfig[stage];
                      const location = getLocationDisplay(booking);
                      const Icon = location.icon;

                      return (
                        <TableRow
                          key={booking.id}
                          className={cn(
                            "group transition-all duration-200 border-b border-gray-100 dark:border-gray-800",
                            "hover:bg-primary/5 hover:shadow-sm",
                            index % 2 === 0
                              ? "bg-white dark:bg-gray-900"
                              : "bg-gray-50/50 dark:bg-gray-900/50"
                          )}
                        >
                          {/* ✅ COLUMN 1: Booking ID - COMPACT */}
                          <TableCell className="font-mono py-3">
                            <div className="space-y-1">
                              <Button
                                variant="link"
                                className="p-0 h-auto font-bold text-sm text-primary hover:text-primary/80"
                                onClick={() => setDetailSheet({ isOpen: true, bookingId: booking.id })}
                              >
                                {booking.bookingId}
                              </Button>
                              {booking.branch_name && (
                                <div className="flex items-center gap-1 flex-wrap">
                                  <div className="flex items-center gap-0.5 text-[10px] text-muted-foreground bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">
                                    <Building2 className="w-2.5 h-2.5" />
                                    <span className="font-medium truncate max-w-[70px]" title={booking.branch_name}>
                                      {booking.branch_name}
                                    </span>
                                  </div>
                                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-3.5 border-primary/30">
                                    {booking.branch_code}
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </TableCell>

                          {/* ✅ COLUMN 2: Parties & Route - COMBINED */}
                          <TableCell className="py-3">
                            <div className="space-y-2.5">
                              {/* Parties Row */}
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex-shrink-0" />
                                <span className="font-semibold text-xs text-gray-900 dark:text-gray-100 truncate max-w-[85px]" title={booking.consignorName}>
                                  {booking.consignorName}
                                </span>
                                <ArrowRight className="w-3 h-3 text-primary flex-shrink-0" />
                                <span className="text-[11px] text-muted-foreground truncate max-w-[85px]" title={booking.consigneeName}>
                                  {booking.consigneeName}
                                </span>
                              </div>

                              {/* Route Row */}
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-2.5 h-2.5 text-green-600 flex-shrink-0" />
                                <span className="font-medium text-[11px] text-green-900 dark:text-green-100 truncate max-w-[85px]" title={booking.fromLocation}>
                                  {booking.fromLocation}
                                </span>
                                <ArrowRight className="w-2.5 h-2.5 text-muted-foreground flex-shrink-0" />
                                <MapPin className="w-2.5 h-2.5 text-red-600 flex-shrink-0" />
                                <span className="text-[11px] text-red-900 dark:text-red-100 truncate max-w-[85px]" title={booking.toLocation}>
                                  {booking.toLocation}
                                </span>
                              </div>
                            </div>
                          </TableCell>

                          {/* ✅ COLUMN 3: Stage */}
                          <TableCell className="py-3">
                            <Badge
                              className={cn(
                                stageConf.bgColor,
                                stageConf.textColor,
                                "text-[10px] px-2 py-1 font-bold border-2 shadow-sm"
                              )}
                            >
                              {stageConf.label}
                            </Badge>
                          </TableCell>
                          {/* ✅ COLUMN 4: Location - IMPROVED */}
                          <TableCell className="py-3">
                            {(() => {
                              const location = getLocationDisplay(booking);
                              const Icon = location.icon;

                              return (
                                <div className="space-y-1.5">
                                  <TooltipProvider delayDuration={200}>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <div className={cn(
                                          "inline-flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-help w-full",
                                          "border transition-all duration-200",
                                          location.bgColor
                                        )}>
                                          <Badge
                                            variant={location.badgeVariant}
                                            className="text-[9px] px-1.5 py-0.5 h-4 font-bold flex-shrink-0"
                                          >
                                            {location.badgeText}
                                          </Badge>

                                          <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", location.iconColor)} />

                                          <div className="min-w-0 flex-1">
                                            <p className="font-semibold text-xs truncate" title={location.primary}>
                                              {location.primary}
                                            </p>
                                            {location.secondary && (
                                              <div className="flex items-center gap-1.5 mt-0.5">
                                                <p className="text-[10px] text-muted-foreground truncate">
                                                  {location.secondary}
                                                </p>
                                                {location.showDot && (
                                                  <span
                                                    className={cn(
                                                      "w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse",
                                                      location.dotColor
                                                    )}
                                                  />
                                                )}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      </TooltipTrigger>

                                      <TooltipContent side="top" className="max-w-xs p-3">
                                        {location.type === 'WAREHOUSE' && booking.current_warehouse && (
                                          <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 pb-1.5 border-b">
                                              <Package className="w-3.5 h-3.5 text-indigo-600" />
                                              <span className="font-bold text-xs">At Warehouse</span>
                                            </div>
                                            <div className="text-[11px] space-y-0.5">
                                              <p><span className="text-muted-foreground">Name:</span> <span className="font-semibold">{booking.current_warehouse.name}</span></p>
                                              <p><span className="text-muted-foreground">City:</span> <span className="font-semibold">{booking.current_warehouse.city}</span></p>
                                            </div>
                                          </div>
                                        )}

                                        {location.type === 'TRACKING' && (() => {
                                          const activeAssignment = booking.vehicle_assignments?.find(v => v.status === 'ACTIVE');
                                          if (!activeAssignment) return null;

                                          return (
                                            <div className="space-y-1.5">
                                              <div className="flex items-center gap-2 pb-1.5 border-b">
                                                <MapPin className="w-3.5 h-3.5 text-orange-600" />
                                                <span className="font-bold text-xs">Live Tracking</span>
                                              </div>
                                              <div className="text-[11px] space-y-0.5">
                                                <p><span className="text-muted-foreground">Last:</span> <span className="font-semibold">{activeAssignment.last_toll_crossed}</span></p>
                                                {booking.assignedVehicle && (
                                                  <p><span className="text-muted-foreground">Vehicle:</span> <span className="font-semibold">{booking.assignedVehicle.vehicleNumber}</span></p>
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })()}

                                        {location.type === 'VEHICLE' && booking.assignedVehicle && (
                                          <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 pb-1.5 border-b">
                                              <Truck className="w-3.5 h-3.5 text-blue-600" />
                                              <span className="font-bold text-xs">Dispatched</span>
                                            </div>
                                            <div className="text-[11px]">
                                              <p className="font-semibold">{booking.assignedVehicle.vehicleNumber}</p>
                                              <p className="text-muted-foreground">{booking.assignedVehicle.driver.name}</p>
                                            </div>
                                          </div>
                                        )}

                                        {location.type === 'DRAFT' && (
                                          <div className="text-[11px]">
                                            <p className="font-semibold">Not dispatched</p>
                                            <p className="text-muted-foreground">Assign vehicle to start</p>
                                          </div>
                                        )}
                                      </TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>

                                  {/* ✅ IMPROVED: Full warehouse button text */}
                                  {location.type !== 'DRAFT' && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setWarehouseModal({
                                          isOpen: true,
                                          bookingId: booking.id,
                                          currentWarehouseId: booking.current_warehouse?.id
                                        });
                                      }}
                                      className="h-6 px-2 text-[10px] w-full justify-start hover:bg-primary/10 font-medium"
                                    >
                                      <Package className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                      <span className="truncate">
                                        {booking.current_warehouse ? 'Change Warehouse' : 'Add Warehouse'}
                                      </span>
                                    </Button>
                                  )}
                                </div>
                              );
                            })()}
                          </TableCell>

                          {/* ✅ COLUMN 5: Vehicle */}
                          <TableCell className="py-3">
                            {booking.current_warehouse ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setAssignmentModal({ isOpen: true, bookingId: booking.id })}
                                className="w-full h-7 text-[11px] border-2 hover:border-primary hover:bg-primary/5"
                              >
                                <Truck className="w-3 h-3 mr-1" />
                                Assign
                              </Button>
                            ) : (
                              booking.assignedVehicle ? (
                                <Badge variant="secondary" className="text-[10px] px-2 py-1 border w-full justify-center">
                                  <Truck className="w-3 h-3 mr-1" />
                                  {booking.assignedVehicle.vehicleNumber}
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-[10px] px-2 py-1 border-dashed w-full justify-center">
                                  <AlertCircle className="w-3 h-3 mr-1" />
                                  No Vehicle
                                </Badge>
                              )
                            )}
                          </TableCell>

                          {/* ✅ COLUMN 6: LR Status - VERTICAL STACK */}
                          <TableCell className="py-3">
                            {booking.lrNumber ? (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1">
                                  <Badge className="bg-green-600 text-white text-[10px] px-2 py-0.5 border-0 flex-1">
                                    <FileText className="w-2.5 h-2.5 mr-1" />
                                    {booking.lrNumber}
                                  </Badge>
                                  <TooltipProvider>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          onClick={() => handleDownloadLR(booking)}
                                          className="h-6 w-6 hover:bg-green-100"
                                        >
                                          <Download className="w-3 h-3 text-green-600" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>Download PDF</TooltipContent>
                                    </Tooltip>
                                  </TooltipProvider>
                                </div>
                                {booking.eway_bill_details && booking.eway_bill_details.length > 0 && (
                                  <div className="flex flex-wrap gap-0.5">
                                    {booking.eway_bill_details.slice(0, 1).map((ewb: any, idx: number) => (
                                      <Badge key={idx} variant="secondary" className="text-[9px] px-1.5 py-0">
                                        E: {ewb.number.slice(-4)}
                                      </Badge>
                                    ))}
                                    {booking.eway_bill_details.length > 1 && (
                                      <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                        +{booking.eway_bill_details.length - 1}
                                      </Badge>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <Badge variant="outline" className="text-[10px] px-2 py-0.5 border-dashed w-full justify-center">
                                  <Clock className="w-2.5 h-2.5 mr-1" />
                                  Pending
                                </Badge>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLrModal({ isOpen: true, bookingId: booking.id })}
                                  className="w-full h-6 text-[10px] border hover:border-primary hover:bg-primary/5"
                                >
                                  <FileText className="w-2.5 h-2.5 mr-1" />
                                  Create
                                </Button>
                              </div>
                            )}
                          </TableCell>

                          {/* ✅ COLUMN 7: Actions - COMPACT */}
                          <TableCell className="py-3">
                            <div className="flex flex-row items-center">
                              {/* Progressive Action - Make it smaller */}
                              <div className="w-full">
                                <ProgressiveActionButton
                                  booking={booking}
                                  stage={getBookingStage(booking)}
                                  onAction={(actionType) => {
                                    switch (actionType) {
                                      case 'ASSIGN_VEHICLE':
                                        setAssignmentModal({ isOpen: true, bookingId: booking.id });
                                        break;
                                      case 'CREATE_LR':
                                        setLrModal({ isOpen: true, bookingId: booking.id });
                                        break;
                                      case 'UPLOAD_POD':
                                        setPodModal({ isOpen: true, bookingId: booking.id });
                                        break;
                                      case 'GENERATE_INVOICE':
                                        setInvoiceModal({ isOpen: true, bookingId: booking.id });
                                        break;
                                      case 'VIEW_INVOICE':
                                        toast({
                                          title: "Invoice",
                                          description: `Invoice ${booking.invoice_number}`,
                                        });
                                        break;
                                      case 'REFRESH':
                                        loadData();
                                        break;
                                    }
                                  }}
                                />
                              </div>

                              {/* Menu Button */}
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 hover:bg-primary/10"
                                  >
                                    <MoreVertical className="h-3 w-3" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48">
                                  <DropdownMenuItem onClick={() => navigate(`/bookings/${booking.id}`)}>
                                    <Eye className="mr-2 h-3.5 w-3.5" />
                                    <span className="text-xs">View Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setEditingFullBooking(booking);
                                      setIsEditFullBookingModalOpen(true);
                                    }}
                                  >
                                    <Edit className="mr-2 h-3.5 w-3.5" />
                                    <span className="text-xs">Edit Details</span>
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive focus:text-destructive"
                                    onClick={() => setDeletingBookingId(booking.id)}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    <span className="text-xs">Delete</span>
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
                  <div key={booking.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <Button
                          variant="link"
                          className="p-0 h-auto font-semibold text-primary text-sm"
                          onClick={() => setDetailSheet({ isOpen: true, bookingId: booking.id })}
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

                    <div className="space-y-2 text-sm pt-2 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-primary" />
                        <span className="font-medium">{booking.consignorName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-muted-foreground">{booking.consigneeName}</span>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm pt-2 border-t border-gray-200 dark:border-gray-800">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-green-600" />
                        <span className="font-medium">{booking.fromLocation}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3 h-3 text-red-600" />
                        <span className="text-muted-foreground">{booking.toLocation}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
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
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

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
            const newBooking = await createBooking({
              ...bookingData,
              material_description: '', // Add default values for missing fields
              cargo_units: '1'
            });
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
      {/* ✅ POD Upload Modal */}
      <UploadPODModal
        isOpen={podModal.isOpen}
        onClose={() => setPodModal({ isOpen: false, bookingId: "" })}
        booking={(() => {
          const found = filteredBookings.find(b => b.id === podModal.bookingId);
          return found ? { id: found.id, bookingId: found.bookingId } : null;
        })()}
        onSuccess={loadData}
      />
      <BookingDetailSheet
        isOpen={detailSheet.isOpen}
        onClose={() => setDetailSheet({ isOpen: false, bookingId: "" })}
        bookingId={detailSheet.bookingId}
        onUpdate={loadData}
      />
    </div>
  );
};