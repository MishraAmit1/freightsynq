import { useState, useEffect, useMemo } from "react";
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
import { cn, formatDate } from "@/lib/utils";
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
  X,
  MessageSquare,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft
} from "lucide-react";
import { fetchBookings, updateBookingStatus, updateBookingWarehouse, deleteBooking, updateBooking, updateBookingLR } from "@/api/bookings";
import { fetchWarehouses } from "@/api/warehouses";

import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { CreateLRModal, LRData } from "./CreateLRModal";
import { BookingFormModal } from "./BookingFormModal";
import { EditFullBookingModal } from "./EditFullBookingModal";
import { WarehouseSelectionModal } from "../../components/WarehouseSelectionModal";
import { toast, useToast } from "@/hooks/use-toast";
import { checkTemplateStatus, generateLRWithTemplate } from "@/api/lr-templates";
import { LRTemplateOnboarding } from "@/components/LRTemplateOnboarding";
import { getBookingStage, getProgressiveAction, stageConfig } from "@/lib/bookingStages";
import { ProgressiveActionButton } from "@/components/ProgressiveActionButton";
import { UploadPODModal } from "./UploadPODModal";
import { BookingDetailSheet } from "./BookingDetailSheet";
import { QuickInvoiceModal } from "@/components/QuickInvoiceModal";
import { formatETA, getSLAStatus } from "@/lib/etaCalculations";
import { EditRemarksModal } from "@/components/EditRemarksModal";
import { PODViewerModal } from "@/components/PODViewerModal";

// Interfacess
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
  estimated_arrival?: string;
  remarks?: string;
  created_at?: string;
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
    actual_delivery?: string;
  }>;
  pod_uploaded_at?: string;
  pod_file_url?: string;
  billed_at?: string;
  actual_delivery?: string;
  alerts?: Array<{
    type: 'POD_PENDING' | 'EWAY_EXPIRING';
    severity: 'warning' | 'critical';
    message: string;
  }>;
}

interface Warehouse {
  id: string;
  name: string;
  city: string;
  state: string;
}

// Status config
const statusConfig = {
  DRAFT: {
    label: "Draft",
    color: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    icon: Edit,
    gradient: "from-gray-500 to-gray-600"
  },
  QUOTED: {
    label: "Quoted",
    color: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600"
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    icon: CheckCircle2,
    gradient: "from-green-500 to-green-600"
  },
  AT_WAREHOUSE: {
    label: "At Warehouse",
    color: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    icon: Package,
    gradient: "from-indigo-500 to-indigo-600"
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    icon: Truck,
    gradient: "from-purple-500 to-purple-600"
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    icon: TrendingUp,
    gradient: "from-orange-500 to-orange-600"
  },
  DELIVERED: {
    label: "Delivered",
    color: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-emerald-600"
  },
  CANCELLED: {
    label: "Cancelled",
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    icon: XCircle,
    gradient: "from-red-500 to-red-600"
  }
};

// ✅ UPDATED: Combined Dispatch Display (Location + Vehicle)
// ✅ UPDATED: Remove buttons, only show info
// ✅ UPDATED: Keep DRAFT type
const getDispatchDisplay = (booking: Booking) => {
  // Priority 1: Warehouse
  if (booking.current_warehouse) {
    return {
      type: 'WAREHOUSE' as const,
      location: booking.current_warehouse.name,
      city: booking.current_warehouse.city
    };
  }

  // Priority 2 & 3: Vehicle (with or without tracking)
  const activeAssignment = booking.vehicle_assignments?.find(v => v.status === 'ACTIVE');

  if (activeAssignment?.vehicle) {
    const vehicleNumber = activeAssignment.vehicle.vehicle_number;

    // Has tracking?
    if (activeAssignment.last_toll_crossed && activeAssignment.last_toll_time) {
      const lastUpdate = new Date(activeAssignment.last_toll_time);
      const now = new Date();
      const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      const isFresh = hoursDiff < 2;
      const isStale = hoursDiff >= 2 && hoursDiff < 6;

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
        vehicleNumber: vehicleNumber,
        location: activeAssignment.last_toll_crossed,
        timeAgo: getTimeAgo(),
        isFresh,
        isStale,
        dotColor: isFresh ? 'bg-green-500' : isStale ? 'bg-yellow-500' : 'bg-gray-400'
      };
    }

    // Vehicle without tracking
    return {
      type: 'VEHICLE' as const,
      vehicleNumber: vehicleNumber,
      location: 'On the way',
      timeAgo: 'No tracking yet'
    };
  }

  // ✅ Priority 4: DRAFT (wapas add kiya)
  return {
    type: 'DRAFT' as const,
    location: 'Not dispatched'
  };
};

export const BookingList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
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
  const [remarksModal, setRemarksModal] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({ isOpen: false, bookingId: "" });
  const [detailSheet, setDetailSheet] = useState<{
    isOpen: boolean;
    bookingId: string;
  }>({ isOpen: false, bookingId: "" });
  const [podViewer, setPodViewer] = useState<{
    isOpen: boolean;
    fileUrl: string | null;
    bookingId: string;
  }>({ isOpen: false, fileUrl: null, bookingId: "" });
  const [initialLoading, setInitialLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

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

  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .booking-table-container {
        overflow-x: auto;
        overflow-y: visible;
        -webkit-overflow-scrolling: touch;
        scroll-behavior: smooth;
      }
      
      .booking-table-container::-webkit-scrollbar {
        display: none !important;
      }
      
      .booking-table-container {
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
      }

      .booking-table td,
      .booking-table th {
        position: relative;
      }
      
      .booking-table td::before {
        content: '';
        position: absolute;
        inset: 0;
        background: transparent;
        pointer-events: none !important;
        transition: background-color 0.15s ease;
        z-index: 0;
      }
      
      .booking-table tr:hover td::before {
        background: hsl(var(--primary) / 0.03);
      }
      
      .booking-table td > *,
      .booking-table th > * {
        position: relative;
        z-index: 1;
      }
      
      [data-radix-popper-content-wrapper] {
        pointer-events: none !important;
      }
      
      [data-radix-popper-content-wrapper] > * {
        pointer-events: auto !important;
      }

      [data-radix-dropdown-menu-content] {
        pointer-events: auto !important;
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
      if (initialLoading) {
        setLoading(true);
      }
      const [bookingsData, warehousesData] = await Promise.all([
        fetchBookings(),
        fetchWarehouses()
      ]);

      const convertedBookings: Booking[] = bookingsData.map(booking => {
        const activeAssignment = (booking.vehicle_assignments || []).find(va => va.status === 'ACTIVE');

        let vehicle = null;
        if (activeAssignment) {
          vehicle = activeAssignment.vehicle_type === 'OWNED'
            ? activeAssignment.owned_vehicle
            : activeAssignment.hired_vehicle;
        }

        const alerts: any[] = [];
        const now = new Date();

        if (booking.status === 'DELIVERED' && !booking.pod_uploaded_at) {
          const deliveryTime = new Date(booking.actual_delivery || booking.updated_at);
          const hoursSinceDelivery = (now.getTime() - deliveryTime.getTime()) / (1000 * 60 * 60);

          if (hoursSinceDelivery > 24) {
            alerts.push({
              type: 'POD_PENDING',
              severity: 'critical',
              message: `POD pending for ${Math.floor(hoursSinceDelivery)} hours`
            });
          }
        }

        if (booking.eway_bill_details && booking.eway_bill_details.length > 0) {
          booking.eway_bill_details.forEach((ewb: any) => {
            if (ewb.valid_until) {
              const validUntil = new Date(ewb.valid_until);
              const hoursLeft = (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60);

              if (hoursLeft > 0 && hoursLeft < 12) {
                alerts.push({
                  type: 'EWAY_EXPIRING',
                  severity: 'warning',
                  message: `E-way bill expires in ${Math.floor(hoursLeft)}h`
                });
              }
            }
          });
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
          created_at: booking.created_at,
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
          pod_uploaded_at: booking.pod_uploaded_at,
          pod_file_url: booking.pod_file_url,
          billed_at: booking.billed_at,
          actual_delivery: booking.actual_delivery,
          estimated_arrival: booking.estimated_arrival,
          remarks: booking.remarks,
          vehicle_assignments: activeAssignment ? [activeAssignment] : [],
          alerts: alerts,
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
      setInitialLoading(false);
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

  const filteredBookings = useMemo(() => {
    return bookings.filter(booking => {
      const matchesSearch = booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.consignorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.consigneeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "ALL" || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBookings.slice(startIndex, endIndex);
  }, [filteredBookings, currentPage, itemsPerPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const getPaginationButtons = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }

    return pages;
  };

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

  if (needsTemplateSetup) {
    return <LRTemplateOnboarding onComplete={() => setNeedsTemplateSetup(false)} />;
  }

  if (initialLoading) {
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

    const rows = paginatedBookings.map(booking => [
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

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter(b => b.status === 'CONFIRMED').length,
    inTransit: bookings.filter(b => b.status === 'IN_TRANSIT').length,
    delivered: bookings.filter(b => b.status === 'DELIVERED').length,
  };

  return (
    <div className="space-y-6">
      {/* Stats + Buttons */}
      <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
        <div className="bg-card border border-border dark:border-border rounded-xl flex-1 p-6 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[#E5E7EB] dark:divide-[#35353F]">
            <div className="px-6 py-3 first:pl-0 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <Package className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">Total Bookings</p>
                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.total}</p>
              </div>
            </div>

            <div className="px-6 py-3 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">Confirmed</p>
                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.confirmed}</p>
              </div>
            </div>

            <div className="px-6 py-3 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <Truck className="w-8 h-8 text-primary dark:text-primary" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">In Transit</p>
                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.inTransit}</p>
              </div>
            </div>

            <div className="px-6 py-3 last:pr-0 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <div className="relative z-10">
                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">Delivered</p>
                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.delivered}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[200px]">
          <Button
            size="default"
            onClick={() => setIsBookingFormOpen(true)}
            className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            New Booking
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleExport}
                  className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent>Export bookings to CSV</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        {/* Search & Filters */}
        <div className="p-6 border-b border-border dark:border-border">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
              <Input
                placeholder="Search bookings, parties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-10 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 border-border dark:border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border dark:border-border">
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

        {/* Desktop Table */}
        <div className="hidden lg:block overflow-x-auto booking-table-container">
          <Table className="booking-table">
            <TableHeader>
              <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground pl-6">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Booking
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4" />
                    Parties & Route
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Stage
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4" />
                    Dispatch Status
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Documents
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    ETA / SLA
                  </div>
                </TableHead>

                <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground text-center pr-6">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-64 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-base font-medium text-foreground dark:text-white">No bookings found</p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                          {searchTerm || statusFilter !== "ALL"
                            ? "Try adjusting your search or filters"
                            : "Create your first booking to get started"}
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
                paginatedBookings.map((booking) => {
                  const stage = getBookingStage(booking);
                  const stageConf = stageConfig[stage];
                  const dispatch = getDispatchDisplay(booking);

                  return (
                    <TableRow
                      key={booking.id}
                      className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors"
                    >
                      {/* COLUMN 1: Booking ID + Pickup Date + Branch Code */}
                      <TableCell className="font-mono py-3 pl-6">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-bold text-sm text-primary hover:text-primary/80"
                              onClick={() => setDetailSheet({ isOpen: true, bookingId: booking.id })}
                            >
                              {booking.bookingId}
                            </Button>

                            {booking.alerts && booking.alerts.length > 0 && (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="relative flex items-center justify-center cursor-help">
                                      <AlertTriangle className="w-4 h-4 text-red-500 animate-pulse" />
                                      <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full animate-ping" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="bg-red-50 text-red-900 border-red-200 p-3 max-w-xs shadow-md">
                                    <p className="font-bold text-xs mb-1 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" />
                                      Attention Required:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-1">
                                      {booking.alerts.map((alert, idx) => (
                                        <li key={idx} className="text-xs font-medium">
                                          {alert.message}
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {booking.pickupDate
                                ? new Date(booking.pickupDate).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric'
                                })
                                : 'No pickup date'}
                            </span>
                            {booking.branch_code && (
                              <>
                                <span className="mx-1">•</span>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-primary/30 font-bold">
                                  {booking.branch_code}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* COLUMN 2: Parties & Route */}
                      <TableCell className="py-3">
                        <div className="space-y-2.5">
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

                      {/* COLUMN 3: Stage */}
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

                      {/* ✅ COLUMN 4: Dispatch Status (Warehouse OR Vehicle+Location) */}
                      {/* ✅ COLUMN 4: Dispatch Status - NO BUTTONS */}
                      {/* ✅ COLUMN 4: Dispatch Status - WITH Warehouse Button */}
                      <TableCell className="py-3">
                        <div className="space-y-1.5">
                          {dispatch.type === 'TRACKING' && (
                            <>
                              {/* Vehicle Number */}
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="font-bold text-xs text-blue-900 dark:text-blue-100">
                                  {dispatch.vehicleNumber}
                                </span>
                              </div>

                              {/* Location */}
                              <div className="flex items-center gap-1.5">
                                <MapPin className={cn(
                                  "w-3 h-3 flex-shrink-0",
                                  dispatch.isFresh
                                    ? "text-orange-600 dark:text-orange-400"
                                    : dispatch.isStale
                                      ? "text-yellow-600 dark:text-yellow-400"
                                      : "text-gray-500 dark:text-gray-400"
                                )} />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium truncate" title={dispatch.location}>
                                    {dispatch.location}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <span className={cn(
                                      "w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse",
                                      dispatch.dotColor
                                    )} />
                                    <span className="text-[9px] text-muted-foreground">
                                      {dispatch.timeAgo}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* ✅ Warehouse Button */}
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
                                className="h-6 px-0 text-[10px] w-full justify-start hover:text-primary font-medium"
                              >
                                <Package className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate">
                                  {booking.current_warehouse ? 'Change Warehouse' : 'Add Warehouse'}
                                </span>
                              </Button>
                            </>
                          )}

                          {dispatch.type === 'VEHICLE' && (
                            <>
                              {/* Vehicle Number */}
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                <span className="font-bold text-xs text-blue-900 dark:text-blue-100">
                                  {dispatch.vehicleNumber}
                                </span>
                              </div>

                              {/* Status */}
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-[10px] text-muted-foreground">
                                  {dispatch.location}
                                </span>
                              </div>

                              {/* ✅ Warehouse Button */}
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
                                className="h-6 px-0 text-[10px] w-full justify-start hover:text-primary font-medium"
                              >
                                <Package className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate">
                                  {booking.current_warehouse ? 'Change Warehouse' : 'Add Warehouse'}
                                </span>
                              </Button>
                            </>
                          )}

                          {dispatch.type === 'WAREHOUSE' && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Package className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold truncate" title={dispatch.location}>
                                    {dispatch.location}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">
                                    {dispatch.city}
                                  </p>
                                </div>
                              </div>

                              {/* ✅ Change Warehouse Button */}
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
                                className="h-6 px-0 text-[10px] w-full justify-start hover:text-primary font-medium"
                              >
                                <Package className="w-3 h-3 mr-1.5 flex-shrink-0" />
                                <span className="truncate">Change Warehouse</span>
                              </Button>
                            </>
                          )}

                          {/* ✅ DRAFT State */}
                          {dispatch.type === 'DRAFT' && (
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-[10px] text-muted-foreground">
                                {dispatch.location}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>

                      {/* ✅ COLUMN 5: Documents (Simplified) */}
                      <TableCell className="py-3">
                        <div className="space-y-0.5 text-xs">
                          <div
                            className={cn(
                              "flex items-center gap-1 cursor-pointer hover:text-primary transition-colors",
                              booking.lrNumber ? "text-foreground dark:text-white" : "text-muted-foreground"
                            )}
                            onClick={() => booking.lrNumber && handleDownloadLR(booking)}
                          >
                            <span className="font-medium">LR</span>
                            <span className="font-mono">{booking.lrNumber || '------'}</span>
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-1 cursor-pointer hover:text-primary transition-colors",
                              booking.pod_file_url ? "text-foreground dark:text-white" : "text-muted-foreground"
                            )}
                            onClick={() => booking.pod_file_url && setPodViewer({
                              isOpen: true,
                              fileUrl: booking.pod_file_url,
                              bookingId: booking.bookingId
                            })}
                          >
                            <span className="font-medium">POD</span>
                            <span className="font-mono">{booking.pod_uploaded_at ? '✓' : '------'}</span>
                          </div>

                          <div
                            className={cn(
                              "flex items-center gap-1",
                              booking.eway_bill_details && booking.eway_bill_details.length > 0
                                ? (() => {
                                  const hasExpired = booking.eway_bill_details.some((ewb: any) => {
                                    if (!ewb.valid_until) return false;
                                    return new Date(ewb.valid_until) < new Date();
                                  });
                                  return hasExpired ? "text-red-600 dark:text-red-400" : "text-foreground dark:text-white";
                                })()
                                : "text-muted-foreground"
                            )}
                          >
                            <span className="font-medium">EWAY</span>
                            <span className="font-mono truncate max-w-[50px]">
                              {booking.eway_bill_details?.[0]?.number || '------'}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      {/* COLUMN 6: ETA / SLA */}
                      <TableCell className="py-3">
                        {!booking.estimated_arrival ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-[10px] font-medium truncate">
                                {formatETA(booking.estimated_arrival)}
                              </span>
                            </div>

                            {(() => {
                              const sla = getSLAStatus(booking.estimated_arrival, booking.status);
                              return (
                                <div className={cn(
                                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border",
                                  sla.bgColor,
                                  sla.color,
                                  "border-current/20"
                                )}>
                                  <span>{sla.icon}</span>
                                  <span>{sla.label}</span>
                                </div>
                              );
                            })()}
                          </div>
                        )}
                      </TableCell>

                      {/* COLUMN 7: Actions */}
                      <TableCell className="py-3 pr-6">
                        <div className="flex flex-row items-center">
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
                                    if (booking.invoice_number) {
                                      toast({
                                        title: "Invoice",
                                        description: `Invoice: ${booking.invoice_number}`,
                                      });
                                    }
                                    break;
                                  case 'REFRESH':
                                    loadData();
                                    break;
                                }
                              }}
                            />
                          </div>

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
                            <DropdownMenuContent align="end" className="w-48 bg-card border-border dark:border-border">
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
                              <DropdownMenuItem
                                onClick={() => setRemarksModal({ isOpen: true, bookingId: booking.id })}
                              >
                                <MessageSquare className="mr-2 h-3.5 w-3.5" />
                                <span className="text-xs">
                                  {booking.remarks ? 'Edit' : 'Add'} Remarks
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-secondary" />
                              <DropdownMenuItem
                                className="text-[#DC2626] focus:text-[#DC2626]"
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

        {/* Mobile View - Keep same as before */}
        <div className="lg:hidden p-4 space-y-3">
          {/* ... mobile cards code remains same ... */}
        </div>

        {/* Pagination - Keep same as before */}
        {filteredBookings.length > 0 && (
          <div className="px-6 py-4 border-t border-border dark:border-border bg-card">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                Showing <span className="font-medium text-foreground dark:text-white">
                  {((currentPage - 1) * itemsPerPage) + 1}
                </span> to{" "}
                <span className="font-medium text-foreground dark:text-white">
                  {Math.min(currentPage * itemsPerPage, filteredBookings.length)}
                </span>{" "}
                of <span className="font-medium text-foreground dark:text-white">{filteredBookings.length}</span> results
              </div>

              <div className="flex items-center gap-2">
                {currentPage > 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    className="h-9 w-9 p-0 border-border dark:border-border"
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  className="h-9 w-9 p-0 border-border dark:border-border disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1">
                  {getPaginationButtons().map((page, index) => (
                    page === '...' ? (
                      <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">...</span>
                    ) : (
                      <Button
                        key={page}
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(page as number)}
                        className={cn(
                          "h-9 w-9 p-0 border-border dark:border-border",
                          currentPage === page
                            ? "bg-primary border-primary text-foreground font-medium hover:bg-primary-hover"
                            : "bg-card hover:bg-accent dark:hover:bg-secondary"
                        )}
                      >
                        {page}
                      </Button>
                    )
                  ))}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  className="h-9 w-9 p-0 border-border dark:border-border disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>

                {currentPage < totalPages - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-9 w-9 p-0 border-border dark:border-border"
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => {
                  setItemsPerPage(Number(value));
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-[130px] h-9 border-border dark:border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border dark:border-border text-white">
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="25">25 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                  <SelectItem value="100">100 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* All Modals - Keep same as before */}
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
              material_description: '',
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
        <AlertDialogContent className="bg-card border-border dark:border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground dark:text-white">
              <AlertCircle className="w-5 h-5 text-[#DC2626]" />
              Delete Booking?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-muted-foreground">
              This action cannot be undone. This will permanently delete the booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border dark:border-border">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
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

      <QuickInvoiceModal
        isOpen={invoiceModal.isOpen}
        onClose={() => setInvoiceModal({ isOpen: false, bookingId: "" })}
        booking={(() => {
          const found = filteredBookings.find(b => b.id === invoiceModal.bookingId);
          return found ? {
            id: found.id,
            bookingId: found.bookingId,
            consignorName: found.consignorName,
            consigneeName: found.consigneeName,
            fromLocation: found.fromLocation,
            toLocation: found.toLocation
          } : null;
        })()}
        onSuccess={loadData}
      />

      <EditRemarksModal
        isOpen={remarksModal.isOpen}
        onClose={() => setRemarksModal({ isOpen: false, bookingId: "" })}
        booking={(() => {
          const found = filteredBookings.find(b => b.id === remarksModal.bookingId);
          return found ? {
            id: found.id,
            bookingId: found.bookingId,
            remarks: found.remarks
          } : null;
        })()}
        onSuccess={loadData}
      />

      <PODViewerModal
        isOpen={podViewer.isOpen}
        onClose={() => setPodViewer({ isOpen: false, fileUrl: null, bookingId: "" })}
        fileUrl={podViewer.fileUrl}
        bookingId={podViewer.bookingId}
      />
    </div>
  );
};