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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  ChevronsLeft,
  Upload,
  FileEdit,
  Sparkles,
  Info,
  Navigation,
} from "lucide-react";
import {
  fetchBookings,
  updateBookingStatus,
  updateBookingWarehouse,
  deleteBooking,
  updateBooking,
  updateBookingLR,
} from "@/api/bookings";
import { fetchWarehouses } from "@/api/warehouses";

import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { CreateLRModal, LRData } from "./CreateLRModal";
import { BookingFormModal } from "./BookingFormModal";
import { EditFullBookingModal } from "./EditFullBookingModal";
import { WarehouseSelectionModal } from "../../components/WarehouseSelectionModal";
import { toast, useToast } from "@/hooks/use-toast";
import {
  checkTemplateStatus,
  generateLRWithTemplate,
} from "@/api/lr-templates";
import { LRTemplateOnboarding } from "@/components/LRTemplateOnboarding";
import {
  getBookingStage,
  getProgressiveAction,
  stageConfig,
} from "@/lib/bookingStages";
import { ProgressiveActionButton } from "@/components/ProgressiveActionButton";
import { UploadPODModal } from "./UploadPODModal";
import { BookingDetailSheet } from "./BookingDetailSheet";
import { QuickInvoiceModal } from "@/components/QuickInvoiceModal";
import { formatETA, getSLAStatus } from "@/lib/etaCalculations";
import { EditRemarksModal } from "@/components/EditRemarksModal";
import { PODViewerModal } from "@/components/PODViewerModal";
import { UploadOfflineLRModal } from "@/components/UploadOfflineLRModal";
import {
  formatETAWithTime,
  getBestETA,
  getETADifference,
  getETAUpdateAge,
  getProgressPercentage,
} from "@/lib/distance-calculator";

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
  last_tracked_at?: string;
  lr_city_id?: string;
  branch_id?: string;
  branch_name?: string;
  branch_code?: string;
  branch_city?: string;
  eway_bill_details?: any[];
  estimated_arrival?: string;
  remarks?: string;
  created_at?: string;
  updated_at?: string;
  route_distance_km?: number;
  is_offline_lr?: boolean;
  offline_lr_file_url?: string;
  offline_lr_uploaded_at?: string;
  dynamic_eta?: string;
  current_speed?: number;
  distance_covered?: number;
  distance_remaining?: number;
  eta_last_updated_at?: string;
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
    type: "POD_PENDING" | "EWAY_EXPIRING" | "EWAY_EXPIRED";
    severity: "warning" | "critical";
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
    color:
      "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700",
    icon: Edit,
    gradient: "from-gray-500 to-gray-600",
  },
  QUOTED: {
    label: "Quoted",
    color:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800",
    icon: FileText,
    gradient: "from-blue-500 to-blue-600",
  },
  CONFIRMED: {
    label: "Confirmed",
    color:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800",
    icon: CheckCircle2,
    gradient: "from-green-500 to-green-600",
  },
  AT_WAREHOUSE: {
    label: "At Warehouse",
    color:
      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800",
    icon: Package,
    gradient: "from-indigo-500 to-indigo-600",
  },
  DISPATCHED: {
    label: "Dispatched",
    color:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
    icon: Truck,
    gradient: "from-purple-500 to-purple-600",
  },
  IN_TRANSIT: {
    label: "In Transit",
    color:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-300 dark:border-orange-800",
    icon: TrendingUp,
    gradient: "from-orange-500 to-orange-600",
  },
  DELIVERED: {
    label: "Delivered",
    color:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800",
    icon: CheckCircle2,
    gradient: "from-emerald-500 to-emerald-600",
  },
  CANCELLED: {
    label: "Cancelled",
    color:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800",
    icon: XCircle,
    gradient: "from-red-500 to-red-600",
  },
};

// ✅ UPDATED: Keep DRAFT type
const getDispatchDisplay = (booking: Booking) => {
  if (booking.status === "DELIVERED") {
    return {
      type: "DELIVERED" as const,
      location: booking.toLocation, // Destination city
      date: booking.actual_delivery || booking.updated_at, // Delivery date
    };
  }
  // Priority 1: Warehouse
  if (booking.current_warehouse) {
    return {
      type: "WAREHOUSE" as const,
      location: booking.current_warehouse.name,
      city: booking.current_warehouse.city,
    };
  }

  // Priority 2 & 3: Vehicle
  const activeAssignment = booking.vehicle_assignments?.find(
    (v) => v.status === "ACTIVE",
  );

  if (activeAssignment?.vehicle) {
    const vehicleNumber = activeAssignment.vehicle.vehicle_number;
    const hasTracking = !!(
      activeAssignment.last_toll_crossed && activeAssignment.last_toll_time
    );

    // ✅ NEW: Check last_tracked_at to determine tracking status
    const lastTrackedAt = booking.last_tracked_at;
    const assignedAt =
      activeAssignment.created_at || activeAssignment.assigned_at;

    // CASE 1: Has toll crossing data (TRACKING)
    if (hasTracking) {
      const lastUpdate = new Date(activeAssignment.last_toll_time);
      const now = new Date();
      const hoursDiff =
        (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

      const isFresh = hoursDiff < 2;
      const isStale = hoursDiff >= 2 && hoursDiff < 6;

      const getTimeAgo = () => {
        if (hoursDiff <= 0 || hoursDiff < 1 / 60) {
          return "Just now";
        }
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
        type: "TRACKING" as const,
        vehicleNumber: vehicleNumber,
        location: activeAssignment.last_toll_crossed,
        timeAgo: getTimeAgo(),
        isFresh,
        isStale,
        dotColor: isFresh
          ? "bg-green-500"
          : isStale
            ? "bg-yellow-500"
            : "bg-gray-400",
      };
    }

    // ✅ CASE 2: No tracking data - Determine WHY
    if (!hasTracking) {
      // Check if we ever tried to track
      if (lastTrackedAt) {
        const trackedDate = new Date(lastTrackedAt);
        const now = new Date();
        const hoursSinceTrack =
          (now.getTime() - trackedDate.getTime()) / (1000 * 60 * 60);

        const getTrackingStatus = () => {
          if (hoursSinceTrack < 1) {
            return "Tracked recently";
          } else if (hoursSinceTrack < 24) {
            return `Tracked ${Math.floor(hoursSinceTrack)}h ago`;
          } else {
            return `Tracked ${Math.floor(hoursSinceTrack / 24)}d ago`;
          }
        };
        return {
          type: "NO_TOLLS" as const, // ✅ NEW TYPE
          vehicleNumber: vehicleNumber,
          location: "No tolls found",
          timeAgo: getTrackingStatus(),
          subtext: "Vehicle tracked but no toll crossings detected",
        };
      } else {
        // Never tracked
        const assignDate = assignedAt ? new Date(assignedAt) : null;
        const now = new Date();

        if (assignDate) {
          const hoursSinceAssign =
            (now.getTime() - assignDate.getTime()) / (1000 * 60 * 60);

          if (hoursSinceAssign < 0.5) {
            return {
              type: "JUST_ASSIGNED" as const, // ✅ NEW TYPE
              vehicleNumber: vehicleNumber,
              location: "Just assigned",
              timeAgo: "Tracking will start soon",
              subtext: "Vehicle assigned, awaiting first tracking update",
            };
          }
        }

        return {
          type: "NOT_TRACKED" as const, // ✅ NEW TYPE
          vehicleNumber: vehicleNumber,
          location: "Not tracked yet",
          timeAgo: "Awaiting tracking",
          subtext: "Click Track Now to get vehicle location",
        };
      }
    }
  }

  // CASE 4: DRAFT (no vehicle)
  return {
    type: "DRAFT" as const,
    location: "Not dispatched",
  };
};

export const BookingList = () => {
  // ==========================================
  // 1️⃣ ALL STATE HOOKS
  // ==========================================
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
  const [isEditFullBookingModalOpen, setIsEditFullBookingModalOpen] =
    useState(false);
  const [editingFullBooking, setEditingFullBooking] = useState<Booking | null>(
    null,
  );
  const [nextLRNumber, setNextLRNumber] = useState(1001);
  const [deletingBookingId, setDeletingBookingId] = useState<string | null>(
    null,
  );
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
  const [lrViewer, setLrViewer] = useState<{
    isOpen: boolean;
    booking: Booking | null;
  }>({ isOpen: false, booking: null });
  const [offlineLRUploadModal, setOfflineLRUploadModal] = useState<{
    isOpen: boolean;
    booking: { id: string; bookingId: string; lrNumber: string } | null;
  }>({ isOpen: false, booking: null });
  const [offlineLRViewer, setOfflineLRViewer] = useState<{
    isOpen: boolean;
    fileUrl: string | null;
    lrNumber: string;
  }>({ isOpen: false, fileUrl: null, lrNumber: "" });

  // ==========================================
  // 2️⃣ HELPER FUNCTIONS
  // ==========================================
  const parseEwayDate = (dateStr: string): Date | null => {
    try {
      // First try ISO format (2025-11-24T23:59:00Z)
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) {
        return isoDate;
      }

      // Try Indian format: "24/11/2025 11:59:00 PM"
      const indianMatch = dateStr.match(
        /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s+(AM|PM)/i,
      );
      if (indianMatch) {
        const [, day, month, year, hour, minute, second, meridiem] =
          indianMatch;
        let hours = parseInt(hour);

        // Convert to 24-hour format
        if (meridiem.toUpperCase() === "PM" && hours !== 12) {
          hours += 12;
        }
        if (meridiem.toUpperCase() === "AM" && hours === 12) {
          hours = 0;
        }

        return new Date(
          parseInt(year),
          parseInt(month) - 1, // Month is 0-indexed
          parseInt(day),
          hours,
          parseInt(minute),
          parseInt(second),
        );
      }

      // Try without time: "24/11/2025"
      const dateOnlyMatch = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})/);
      if (dateOnlyMatch) {
        const [, day, month, year] = dateOnlyMatch;
        return new Date(
          parseInt(year),
          parseInt(month) - 1,
          parseInt(day),
          23, // End of day
          59,
          59,
        );
      }

      return null;
    } catch (error) {
      console.error("Error parsing eway date:", dateStr, error);
      return null;
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
      console.error("Error generating LR:", error);
      toast({
        title: "❌ Download Failed",
        description: "Failed to generate LR PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  // ==========================================
  // 3️⃣ USE EFFECT HOOKS
  // ==========================================
  useEffect(() => {
    const styleElement = document.createElement("style");
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
    
    /* ✅ NEW: Enhanced hover areas for buttons */
    .booking-table button {
      position: relative;
    }
    
    .booking-table button::before {
      content: '';
      position: absolute;
      inset: -4px;
      z-index: 0;
    }
    
    /* ✅ NEW: Stage badge no-wrap */
    .booking-table .badge {
      white-space: nowrap;
      min-width: fit-content;
    }
    
    /* ✅ NEW: Compact column spacing */
    .booking-table th,
    .booking-table td {
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }
    
    .booking-table th:first-child,
    .booking-table td:first-child {
      padding-left: 1.5rem;
    }
    
    .booking-table th:last-child,
    .booking-table td:last-child {
      padding-right: 1rem;
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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  // ==========================================
  // 4️⃣ ASYNC FUNCTIONS
  // ==========================================
  const checkSetupStatus = async () => {
    try {
      const { hasTemplate } = await checkTemplateStatus();
      setNeedsTemplateSetup(!hasTemplate);
    } catch (error) {
      console.error("Error checking template status:", error);
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
      console.error("Error deleting booking:", error);
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
        fetchWarehouses(),
      ]);

      const convertedBookings: Booking[] = bookingsData.map((booking) => {
        const activeAssignment = (booking.vehicle_assignments || []).find(
          (va) => va.status === "ACTIVE",
        );

        let vehicle = null;
        if (activeAssignment) {
          vehicle =
            activeAssignment.vehicle_type === "OWNED"
              ? activeAssignment.owned_vehicle
              : activeAssignment.hired_vehicle;
        }

        const alerts: any[] = [];
        const now = new Date();

        if (booking.status === "DELIVERED" && !booking.pod_uploaded_at) {
          const deliveryTime = new Date(
            booking.actual_delivery || booking.updated_at,
          );
          const hoursSinceDelivery =
            (now.getTime() - deliveryTime.getTime()) / (1000 * 60 * 60);

          if (hoursSinceDelivery > 24) {
            alerts.push({
              type: "POD_PENDING",
              severity: "critical",
              message: `POD pending for ${Math.floor(
                hoursSinceDelivery,
              )} hours`,
            });
          }
        }

        // E-way bill expiry logic (with parser support)
        if (booking.eway_bill_details && booking.eway_bill_details.length > 0) {
          booking.eway_bill_details.forEach((ewb: any, index: number) => {
            if (ewb.valid_until) {
              // Use parser function
              const validUntil = parseEwayDate(ewb.valid_until);

              // Skip if date parsing failed
              if (!validUntil) {
                console.warn("Failed to parse eway date:", ewb.valid_until);
                return;
              }

              const hoursLeft =
                (validUntil.getTime() - now.getTime()) / (1000 * 60 * 60);

              // CASE 1: Already Expired
              if (hoursLeft < 0) {
                const hoursExpired = Math.abs(Math.floor(hoursLeft));
                const daysExpired = Math.floor(hoursExpired / 24);

                alerts.push({
                  type: "EWAY_EXPIRED",
                  severity: "critical",
                  message:
                    daysExpired > 0
                      ? `E-way bill ${ewb.number} expired ${daysExpired}d ago`
                      : `E-way bill ${ewb.number} expired ${hoursExpired}h ago`,
                });
              }
              // CASE 2: Expiring Soon (within 24 hours)
              else if (hoursLeft >= 0 && hoursLeft < 24) {
                alerts.push({
                  type: "EWAY_EXPIRING",
                  severity: "warning",
                  message:
                    hoursLeft < 1
                      ? `E-way bill ${ewb.number} expires in ${Math.floor(
                          hoursLeft * 60,
                        )}m`
                      : `E-way bill ${ewb.number} expires in ${Math.floor(
                          hoursLeft,
                        )}h`,
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
          last_tracked_at: booking.last_tracked_at,
          current_warehouse: booking.current_warehouse,
          branch_id: booking.branch?.id,
          lr_city_id: booking.lr_city_id,
          branch_name: booking.branch?.branch_name,
          branch_code: booking.branch?.branch_code,
          branch_city: booking.branch?.city,
          created_at: booking.created_at,
          route_distance_km: booking.route_distance_km,
          dynamic_eta: booking.dynamic_eta,
          current_speed: booking.current_speed,
          distance_covered: booking.distance_covered,
          distance_remaining: booking.distance_remaining,
          eta_last_updated_at: booking.eta_last_updated_at,
          assignedVehicle:
            activeAssignment && vehicle
              ? {
                  vehicleNumber: vehicle.vehicle_number,
                  vehicleType: vehicle.vehicle_type,
                  capacity: vehicle.capacity,
                  driver: {
                    name: activeAssignment.driver?.name || "",
                    phone: activeAssignment.driver?.phone || "",
                  },
                }
              : undefined,
          is_offline_lr: booking.is_offline_lr || false,
          offline_lr_file_url: booking.offline_lr_file_url,
          offline_lr_uploaded_at: booking.offline_lr_uploaded_at,
          broker: activeAssignment?.broker || undefined,
          pod_uploaded_at: booking.pod_uploaded_at,
          pod_file_url: booking.pod_file_url,
          billed_at: booking.billed_at,
          actual_delivery: booking.actual_delivery,
          estimated_arrival: booking.estimated_arrival,
          remarks: booking.remarks,
          vehicle_assignments: activeAssignment ? [activeAssignment] : [],
          alerts: alerts,
          updated_at: booking.updated_at,
        };
      });

      setBookings(convertedBookings);
      setWarehouses(warehousesData);
    } catch (error) {
      console.error("Error loading data:", error);
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

  const handleWarehouseChange = async (
    bookingId: string,
    warehouseId: string,
    warehouseName: string,
  ) => {
    try {
      if (warehouseId === "remove") {
        await updateBookingWarehouse(bookingId, "remove");
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
      console.error("Error updating warehouse:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to update warehouse",
        variant: "destructive",
      });
    }
  };

  const handleVehicleAssignment = async (
    bookingId: string,
    vehicleAssignment: any,
  ) => {
    try {
      await loadData();
      toast({
        title: "✅ Vehicle Assigned",
        description: `Vehicle ${vehicleAssignment.vehicleNumber} has been assigned`,
      });
    } catch (error) {
      console.error("Error after vehicle assignment:", error);
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
        eway_bill_details: lrData.ewayBillDetails,
      });

      await loadData();
      toast({
        title: "✅ LR Saved",
        description: `Lorry Receipt ${lrData.lrNumber} has been saved`,
      });
    } catch (error) {
      console.error("Error saving LR:", error);
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
      branch_id?: string;
      lr_city_id?: string;
    },
    lrData: LRData,
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
      console.error("Error saving full booking:", error);
      toast({
        title: "❌ Error",
        description: "Failed to save booking details",
        variant: "destructive",
      });
      throw error;
    }
  };

  // FIRST: Filter bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter((booking) => {
      const matchesSearch =
        booking.bookingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.consignorName
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        booking.consigneeName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus =
        statusFilter === "ALL" || booking.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [bookings, searchTerm, statusFilter]);

  // SECOND: Get active booking ID
  const activeBookingId = useMemo(() => {
    return (
      lrModal.bookingId ||
      podModal.bookingId ||
      invoiceModal.bookingId ||
      remarksModal.bookingId ||
      detailSheet.bookingId ||
      warehouseModal.bookingId ||
      assignmentModal.bookingId
    );
  }, [
    lrModal.bookingId,
    podModal.bookingId,
    invoiceModal.bookingId,
    remarksModal.bookingId,
    detailSheet.bookingId,
    warehouseModal.bookingId,
    assignmentModal.bookingId,
  ]);

  // THIRD: Calculate total pages
  const totalPages = Math.ceil(filteredBookings.length / itemsPerPage);

  // FOURTH: Get selected booking (uses filteredBookings)
  const selectedBooking = useMemo(() => {
    if (!activeBookingId) return null;
    return filteredBookings.find((b) => b.id === activeBookingId) || null;
  }, [activeBookingId, filteredBookings]);

  // ==========================================
  // 6️⃣ MODAL DATA PREPARATION (uses selectedBooking)
  // ==========================================

  const lrBookingData = useMemo(() => {
    if (!selectedBooking || lrModal.bookingId !== selectedBooking.id)
      return null;

    return {
      id: selectedBooking.id,
      bookingId: selectedBooking.bookingId,
      fromLocation: selectedBooking.fromLocation,
      toLocation: selectedBooking.toLocation,
      lrNumber: selectedBooking.lrNumber,
      bilti_number: selectedBooking.bilti_number,
      invoice_number: selectedBooking.invoice_number,
      materialDescription: selectedBooking.materialDescription,
      cargoUnits: selectedBooking.cargoUnits,
      eway_bill_details: selectedBooking.eway_bill_details || [],
    };
  }, [selectedBooking, lrModal.bookingId]);

  const podBookingData = useMemo(() => {
    if (!selectedBooking || podModal.bookingId !== selectedBooking.id)
      return null;

    return {
      id: selectedBooking.id,
      bookingId: selectedBooking.bookingId,
    };
  }, [selectedBooking, podModal.bookingId]);

  const invoiceBookingData = useMemo(() => {
    if (!selectedBooking || invoiceModal.bookingId !== selectedBooking.id)
      return null;

    return {
      id: selectedBooking.id,
      bookingId: selectedBooking.bookingId,
      consignorName: selectedBooking.consignorName,
      consigneeName: selectedBooking.consigneeName,
      fromLocation: selectedBooking.fromLocation,
      toLocation: selectedBooking.toLocation,
    };
  }, [selectedBooking, invoiceModal.bookingId]);

  const remarksBookingData = useMemo(() => {
    if (!selectedBooking || remarksModal.bookingId !== selectedBooking.id)
      return null;

    return {
      id: selectedBooking.id,
      bookingId: selectedBooking.bookingId,
      remarks: selectedBooking.remarks,
    };
  }, [selectedBooking, remarksModal.bookingId]);

  const warehouseDisplayBookingId = useMemo(() => {
    if (!selectedBooking || warehouseModal.bookingId !== selectedBooking.id)
      return undefined;
    return selectedBooking.bookingId;
  }, [selectedBooking, warehouseModal.bookingId]);

  const paginatedBookings = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredBookings.slice(startIndex, endIndex);
  }, [filteredBookings, currentPage, itemsPerPage]);

  const getPaginationButtons = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, "...", totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(
          1,
          "...",
          totalPages - 3,
          totalPages - 2,
          totalPages - 1,
          totalPages,
        );
      } else {
        pages.push(
          1,
          "...",
          currentPage - 1,
          currentPage,
          currentPage + 1,
          "...",
          totalPages,
        );
      }
    }

    return pages;
  };

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
      "status",
    ];

    const rows = paginatedBookings.map((booking) => [
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
      booking.lrDate
        ? new Date(booking.lrDate).toISOString().split("T")[0]
        : "",
      booking.bilti_number || "",
      booking.current_warehouse?.name || "",
      booking.status,
    ]);

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings_export_${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Exported Successfully",
      description: `${filteredBookings.length} bookings exported to CSV`,
    });
  };

  const stats = {
    total: bookings.length,
    confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
    inTransit: bookings.filter((b) => b.status === "IN_TRANSIT").length,
    delivered: bookings.filter((b) => b.status === "DELIVERED").length,
  };

  if (needsTemplateSetup) {
    return (
      <LRTemplateOnboarding onComplete={() => setNeedsTemplateSetup(false)} />
    );
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
  return (
    <div className="space-y-6 min-[2000px]:space-y-8">
      {/* Stats + Buttons */}
      <div className="flex flex-col lg:flex-row gap-4 min-[2000px]:gap-6 lg:items-center lg:justify-between">
        <div className="bg-card border border-border dark:border-border rounded-xl flex-1 p-6 min-[2000px]:p-8 shadow-sm">
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[#E5E7EB] dark:divide-[#35353F]">
            <div className="px-6 min-[2000px]:px-8 py-3 min-[2000px]:py-4 first:pl-0 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <Package className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">
                  Total Bookings
                </p>
                <p className="text-3xl min-[2000px]:text-4xl font-bold text-foreground dark:text-white">
                  {stats.total}
                </p>
              </div>
            </div>

            <div className="px-6 min-[2000px]:px-8 py-3 min-[2000px]:py-4 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <CheckCircle2 className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-green-600" />
              </div>
              <div className="relative z-10">
                <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">
                  Confirmed
                </p>
                <p className="text-3xl min-[2000px]:text-4xl font-bold text-foreground dark:text-white">
                  {stats.confirmed}
                </p>
              </div>
            </div>

            <div className="px-6 min-[2000px]:px-8 py-3 min-[2000px]:py-4 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <Truck className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-primary dark:text-primary" />
              </div>
              <div className="relative z-10">
                <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">
                  In Transit
                </p>
                <p className="text-3xl min-[2000px]:text-4xl font-bold text-foreground dark:text-white">
                  {stats.inTransit}
                </p>
              </div>
            </div>

            <div className="px-6 min-[2000px]:px-8 py-3 min-[2000px]:py-4 last:pr-0 relative">
              <div className="absolute top-2 right-2 opacity-10">
                <CheckCircle2 className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-emerald-600" />
              </div>
              <div className="relative z-10">
                <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground mb-1">
                  Delivered
                </p>
                <p className="text-3xl min-[2000px]:text-4xl font-bold text-foreground dark:text-white">
                  {stats.delivered}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 min-[2000px]:gap-3 w-full lg:w-auto lg:min-w-[200px] min-[2000px]:lg:min-w-[240px]">
          <Button
            size="default"
            onClick={() => setIsBookingFormOpen(true)}
            className="w-full h-10 min-[2000px]:h-12 min-[2000px]:text-base bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
            New Booking
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="default"
                  onClick={handleExport}
                  className="w-full h-10 min-[2000px]:h-12 min-[2000px]:text-base bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
                >
                  <FileDown className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                  Export
                </Button>
              </TooltipTrigger>
              <TooltipContent className="min-[2000px]:text-sm">
                Export bookings to CSV
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        {/* Search & Filters */}
        <div className="p-6 min-[2000px]:p-8 border-b border-border dark:border-border">
          <div className="flex flex-col sm:flex-row gap-3 min-[2000px]:gap-4 items-start sm:items-center justify-between">
            <div className="relative w-full sm:w-96 min-[2000px]:sm:w-[450px]">
              <Search className="absolute left-3 min-[2000px]:left-4 top-1/2 transform -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-muted-foreground dark:text-muted-foreground" />
              <Input
                placeholder="Search bookings, parties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 min-[2000px]:pl-12 pr-10 min-[2000px]:pr-12 h-10 min-[2000px]:h-12 min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 min-[2000px]:h-9 min-[2000px]:w-9 p-0"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4" />
                </Button>
              )}
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[200px] min-[2000px]:sm:w-[240px] h-10 min-[2000px]:h-12 min-[2000px]:text-base border-border dark:border-border bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border dark:border-border">
                <SelectItem value="ALL" className="min-[2000px]:text-base">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 min-[2000px]:w-2.5 min-[2000px]:h-2.5 rounded-full bg-gray-500" />
                    All Statuses
                  </div>
                </SelectItem>
                {Object.entries(statusConfig).map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <SelectItem
                      key={key}
                      value={key}
                      className="min-[2000px]:text-base"
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
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
                {/* ✅ COLUMN 1: Booking */}
                <TableHead className="font-semibold text-[13px] min-[2000px]:text-[15px] dark:text-muted-foreground pl-6 min-[2000px]:pl-8">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                    Booking
                  </div>
                </TableHead>

                {/* ✅ COLUMN 2: Parties & Routes - WITH WIDTH */}
                <TableHead className="font-semibold text-[13px] min-[2000px]:text-[15px] dark:text-muted-foreground w-[180px] min-[2000px]:w-[220px]">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                    <span className="truncate">Parties & Routes</span>
                  </div>
                </TableHead>

                {/* ✅ COLUMN 3: Stage - WITH FIXED WIDTH */}
                <TableHead className="font-semibold text-[13px] min-[2000px]:text-[15px] dark:text-muted-foreground w-[100px] min-[2000px]:w-[120px]">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                    Stage
                  </div>
                </TableHead>

                {/* ✅ COLUMN 4: Dispatch Status */}
                <TableHead className="font-semibold text-[13px] min-[2000px]:text-[15px] dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Truck className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                    Dispatch Status
                  </div>
                </TableHead>

                {/* ✅ COLUMN 5: Documents */}
                <TableHead className="font-semibold text-[13px] min-[2000px]:text-[15px] dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                    Documents
                  </div>
                </TableHead>

                {/* ✅ COLUMN 6: Distance & ETA */}
                <TableHead className="font-semibold text-[12px] min-[2000px]:text-[14px] dark:text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                    Distance & ETA
                  </div>
                </TableHead>

                {/* ✅ COLUMN 7: Actions - WITH REDUCED WIDTH */}
                <TableHead className="font-semibold text-[13px] min-[2000px]:text-[15px] dark:text-muted-foreground text-center pr-6 min-[2000px]:pr-8 w-[120px] min-[2000px]:w-[140px]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedBookings.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="h-64 min-[2000px]:h-80 text-center"
                  >
                    <div className="flex flex-col items-center justify-center gap-3 min-[2000px]:gap-4">
                      <div className="w-16 h-16 min-[2000px]:w-20 min-[2000px]:h-20 rounded-full bg-muted flex items-center justify-center">
                        <Package className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-muted-foreground dark:text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-base min-[2000px]:text-lg font-medium text-foreground dark:text-white">
                          No bookings found
                        </p>
                        <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground mt-1">
                          {searchTerm || statusFilter !== "ALL"
                            ? "Try adjusting your search or filters"
                            : "Create your first booking to get started"}
                        </p>
                      </div>
                      {!searchTerm && statusFilter === "ALL" && (
                        <Button
                          onClick={() => setIsBookingFormOpen(true)}
                          className="mt-2 min-[2000px]:h-11 min-[2000px]:px-6 min-[2000px]:text-base"
                        >
                          <Plus className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
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
                      <TableCell className="font-mono py-3 min-[2000px]:py-4 pl-6 min-[2000px]:pl-8">
                        <div className="space-y-1 ml-6">
                          {/* Line 1: Booking ID + Alert */}
                          <div className="flex items-center gap-2">
                            <Button
                              variant="link"
                              className="p-0 h-auto font-bold text-sm min-[2000px]:text-base text-primary hover:text-primary/80"
                              onClick={() =>
                                setDetailSheet({
                                  isOpen: true,
                                  bookingId: booking.id,
                                })
                              }
                            >
                              {booking.bookingId}
                            </Button>

                            {booking.alerts && booking.alerts.length > 0 && (
                              <TooltipProvider delayDuration={300}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="relative flex items-center justify-center cursor-help">
                                      <AlertTriangle className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-red-500 animate-pulse" />
                                      <span className="absolute top-0 right-0 w-1.5 h-1.5 min-[2000px]:w-2 min-[2000px]:h-2 bg-red-500 rounded-full animate-ping" />
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="bg-red-50 text-red-900 border-red-200 p-3 min-[2000px]:p-4 max-w-xs shadow-md"
                                  >
                                    <p className="font-bold text-xs min-[2000px]:text-sm mb-1 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4" />
                                      Attention Required:
                                    </p>
                                    <ul className="list-disc pl-4 space-y-1">
                                      {booking.alerts.map((alert, idx) => (
                                        <li
                                          key={idx}
                                          className="text-xs min-[2000px]:text-sm font-medium"
                                        >
                                          {alert.message}
                                        </li>
                                      ))}
                                    </ul>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>

                          {/* Line 2: Date | Branch | Service */}
                          <p className="text-[10px] min-[2000px]:text-xs text-muted-foreground">
                            {booking.pickupDate
                              ? new Date(booking.pickupDate).toLocaleDateString(
                                  "en-GB",
                                  {
                                    day: "2-digit",
                                    month: "short",
                                    year: "numeric",
                                  },
                                )
                              : "No date"}
                            {booking.branch_code && (
                              <>
                                <span className="mx-1.5 text-muted-foreground/40">
                                  |
                                </span>
                                <span className="font-medium text-foreground/70">
                                  {booking.branch_code}
                                </span>
                              </>
                            )}
                            {booking.serviceType && (
                              <>
                                <span className="mx-1.5 text-muted-foreground/40">
                                  |
                                </span>
                                <span className="font-semibold text-foreground/80">
                                  {booking.serviceType}
                                </span>
                              </>
                            )}
                          </p>
                        </div>
                      </TableCell>
                      {/* COLUMN 2: Parties & Route */}
                      <TableCell className="py-3 min-[2000px]:py-4 w-[180px] min-[2000px]:w-[220px]">
                        <div className="space-y-2.5 min-[2000px]:space-y-3 ml-2">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 min-[2000px]:w-2 min-[2000px]:h-2 rounded-full bg-gradient-to-r from-green-500 to-green-600 flex-shrink-0" />
                            <span
                              className="font-semibold text-xs min-[2000px]:text-sm text-gray-900 dark:text-gray-100 truncate max-w-[85px] min-[2000px]:max-w-[100px]"
                              title={booking.consignorName}
                            >
                              {booking.consignorName}
                            </span>
                            <ArrowRight className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-primary flex-shrink-0" />
                            <span
                              className="text-[11px] min-[2000px]:text-xs text-muted-foreground truncate max-w-[85px] min-[2000px]:max-w-[100px]"
                              title={booking.consigneeName}
                            >
                              {booking.consigneeName}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-2.5 h-2.5 min-[2000px]:w-3 min-[2000px]:h-3 text-green-600 flex-shrink-0" />
                            <span
                              className="font-medium text-[11px] min-[2000px]:text-xs text-green-900 dark:text-green-100 truncate max-w-[85px] min-[2000px]:max-w-[100px]"
                              title={booking.fromLocation}
                            >
                              {booking.fromLocation}
                            </span>
                            <ArrowRight className="w-2.5 h-2.5 min-[2000px]:w-3 min-[2000px]:h-3 text-muted-foreground flex-shrink-0" />
                            <MapPin className="w-2.5 h-2.5 min-[2000px]:w-3 min-[2000px]:h-3 text-red-600 flex-shrink-0" />
                            <span
                              className="text-[11px] min-[2000px]:text-xs text-red-900 dark:text-red-100 truncate max-w-[85px] min-[2000px]:max-w-[100px]"
                              title={booking.toLocation}
                            >
                              {booking.toLocation}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      {/* COLUMN 3: Stage */}
                      <TableCell className="py-3 min-[2000px]:py-4 w-[100px] min-[2000px]:w-[120px]">
                        <div className="ml-2">
                          <Badge
                            className={cn(
                              stageConf.bgColor,
                              stageConf.textColor,
                              "text-[9px] min-[2000px]:text-[11px] px-1.5 min-[2000px]:px-2 py-0.5 min-[2000px]:py-1 font-bold border whitespace-nowrap",
                            )}
                          >
                            {stageConf.label}
                          </Badge>
                        </div>
                      </TableCell>
                      {/* ✅ COLUMN 4: Dispatch Status - WITH Warehouse Button */}
                      {/* ✅ COLUMN 4: Dispatch Status - Enhanced */}
                      <TableCell className="py-3 min-[2000px]:py-4">
                        <div className="space-y-1.5 min-[2000px]:space-y-2 ml-6">
                          {dispatch.type === "TRACKING" && (
                            <>
                              {/* Vehicle Number */}
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span className="font-bold text-xs">
                                  {dispatch.vehicleNumber}
                                </span>
                              </div>

                              {/* Location */}
                              <div className="flex items-center gap-1.5">
                                <MapPin
                                  className={cn(
                                    "w-3 h-3 flex-shrink-0",
                                    dispatch.isFresh
                                      ? "text-orange-600"
                                      : dispatch.isStale
                                        ? "text-yellow-600"
                                        : "text-gray-500",
                                  )}
                                />
                                <div className="flex-1 min-w-0">
                                  <p
                                    className="text-[10px] font-medium truncate"
                                    title={dispatch.location}
                                  >
                                    {dispatch.location}
                                  </p>
                                  <div className="flex items-center gap-1">
                                    <span
                                      className={cn(
                                        "w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse",
                                        dispatch.dotColor,
                                      )}
                                    />
                                    <span className="text-[9px] text-muted-foreground">
                                      {dispatch.timeAgo}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </>
                          )}
                          {dispatch.type === "DELIVERED" && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-600 flex-shrink-0" />
                                <span className="font-bold text-xs text-green-700 dark:text-green-400">
                                  Completed
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                                <span
                                  className="text-[10px] text-muted-foreground truncate max-w-[120px]"
                                  title={dispatch.location}
                                >
                                  Delivered to {dispatch.location.split(",")[0]}
                                </span>
                              </div>
                            </>
                          )}
                          {/* ✅ NEW: No Tolls Found */}
                          {dispatch.type === "NO_TOLLS" && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span className="font-bold text-xs">
                                  {dispatch.vehicleNumber}
                                </span>
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <AlertCircle className="w-3 h-3 text-yellow-600 flex-shrink-0" />
                                      <div className="flex-1 min-w-0">
                                        <p className="text-[10px] font-medium text-yellow-700 underline decoration-dashed underline-offset-2">
                                          {dispatch.location}
                                        </p>
                                        <p className="text-[9px] text-muted-foreground">
                                          {dispatch.timeAgo}
                                        </p>
                                      </div>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs p-3">
                                    <p className="font-semibold text-xs mb-1">
                                      {dispatch.subtext}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      Vehicle is tracked but hasn't crossed any
                                      FASTag tolls yet. It might be on a local
                                      road or stopped.
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          )}

                          {/* ✅ NEW: Just Assigned */}
                          {dispatch.type === "JUST_ASSIGNED" && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span className="font-bold text-xs">
                                  {dispatch.vehicleNumber}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-blue-600 flex-shrink-0 animate-pulse" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium text-blue-700">
                                    {dispatch.location}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {dispatch.timeAgo}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* ✅ NEW: Not Tracked Yet */}
                          {dispatch.type === "NOT_TRACKED" && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />
                                <span className="font-bold text-xs">
                                  {dispatch.vehicleNumber}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5">
                                <AlertCircle className="w-3 h-3 text-gray-500 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                  <p className="text-[10px] font-medium text-gray-600">
                                    {dispatch.location}
                                  </p>
                                  <p className="text-[9px] text-muted-foreground">
                                    {dispatch.timeAgo}
                                  </p>
                                </div>
                              </div>
                            </>
                          )}

                          {/* OLD: Generic "On the way" - REMOVE or keep as fallback */}
                          {dispatch.type === "VEHICLE" && (
                            <>
                              <div className="flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                                <span className="font-bold text-xs">
                                  {dispatch.vehicleNumber}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-3 h-3 text-gray-400 flex-shrink-0" />
                                <span className="text-[10px] text-muted-foreground">
                                  {dispatch.location}
                                </span>
                              </div>
                            </>
                          )}

                          {/* Warehouse Button - Keep same for all vehicle types */}
                          {(dispatch.type === "TRACKING" ||
                            dispatch.type === "NO_TOLLS" ||
                            dispatch.type === "JUST_ASSIGNED" ||
                            dispatch.type === "NOT_TRACKED" ||
                            dispatch.type === "VEHICLE") && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setWarehouseModal({
                                  isOpen: true,
                                  bookingId: booking.id,
                                  currentWarehouseId:
                                    booking.current_warehouse?.id,
                                });
                              }}
                              className="h-6 px-0 text-[10px] w-full justify-start hover:text-primary font-medium"
                            >
                              <Package className="w-3 h-3 mr-1.5 flex-shrink-0" />
                              <span className="truncate">
                                {booking.current_warehouse
                                  ? "Change Warehouse"
                                  : "Add Warehouse"}
                              </span>
                            </Button>
                          )}

                          {/* DRAFT State */}
                          {dispatch.type === "DRAFT" && (
                            <div className="flex items-center gap-1.5">
                              <AlertCircle className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="text-[10px] text-muted-foreground">
                                {dispatch.location}
                              </span>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      {/* ✅ COLUMN 5: Documents with Create LR Button */}
                      <TableCell className="py-3 min-[2000px]:py-4">
                        <div className="space-y-0.5 min-[2000px]:space-y-1 text-xs min-[2000px]:text-sm ml-6">
                          {/* LR Row - with Create button */}
                          <div className="flex items-center gap-1">
                            {booking.lrNumber ? (
                              <>
                                <span className="font-mono font-medium text-foreground dark:text-white">
                                  {booking.lrNumber}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 min-[2000px]:h-6 min-[2000px]:w-6 p-0 hover:bg-primary/10"
                                  onClick={() =>
                                    setLrViewer({ isOpen: true, booking })
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-primary" />
                                </Button>
                              </>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  setLrModal({
                                    isOpen: true,
                                    bookingId: booking.id,
                                  })
                                }
                                className="h-5 min-[2000px]:h-6 px-2 text-[10px] min-[2000px]:text-xs hover:bg-primary/10 hover:text-primary font-medium"
                              >
                                <Plus className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 mr-1" />
                                Create LR
                              </Button>
                            )}
                          </div>

                          {/* POD Row */}
                          <div className="flex items-center gap-1">
                            {booking.pod_file_url ? (
                              <>
                                <span className="font-mono font-medium text-green-600 dark:text-green-400">
                                  POD ✓
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-5 w-5 min-[2000px]:h-6 min-[2000px]:w-6 p-0 hover:bg-primary/10"
                                  onClick={() =>
                                    setPodViewer({
                                      isOpen: true,
                                      fileUrl: booking.pod_file_url!,
                                      bookingId: booking.bookingId,
                                    })
                                  }
                                >
                                  <Eye className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-primary" />
                                </Button>
                              </>
                            ) : (
                              <span className="font-mono text-muted-foreground">
                                POD------
                              </span>
                            )}
                          </div>

                          {/* E-WAY BILL Row */}
                          <div className="flex items-center">
                            <span
                              className={cn(
                                "font-mono",
                                booking.eway_bill_details &&
                                  booking.eway_bill_details.length > 0
                                  ? (() => {
                                      const hasExpired =
                                        booking.eway_bill_details.some(
                                          (ewb: any) => {
                                            if (!ewb.valid_until) return false;
                                            const validUntil = parseEwayDate(
                                              ewb.valid_until,
                                            );
                                            if (!validUntil) return false;
                                            return validUntil < new Date();
                                          },
                                        );
                                      return hasExpired
                                        ? "text-red-600 dark:text-red-400"
                                        : "text-foreground dark:text-white";
                                    })()
                                  : "text-muted-foreground",
                              )}
                            >
                              {booking.eway_bill_details?.[0]?.number
                                ? `EWAY-${booking.eway_bill_details[0].number}`
                                : "EWAY------"}
                            </span>
                          </div>
                        </div>
                      </TableCell>
                      {/* COLUMN 6: Distance & ETA / Delivery Status */}
                      {/* COLUMN 6: Distance & ETA / Delivery Status */}
                      <TableCell className="py-3 min-[2000px]:py-4">
                        <div className="space-y-1.5 min-[2000px]:space-y-2">
                          {/* 1. Distance (Always Visible) */}
                          {booking.route_distance_km ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 min-[2000px]:w-2 min-[2000px]:h-2 rounded-full bg-blue-500 shrink-0" />
                              <span className="text-[10px] min-[2000px]:text-xs font-bold text-blue-700 dark:text-blue-400">
                                {booking.route_distance_km.toLocaleString()} km
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <div className="w-1.5 h-1.5 min-[2000px]:w-2 min-[2000px]:h-2 rounded-full bg-gray-300 shrink-0" />
                              <span className="text-[10px] min-[2000px]:text-xs text-muted-foreground">
                                Distance N/A
                              </span>
                            </div>
                          )}

                          {/* 2. Status Logic */}
                          {booking.status === "DELIVERED" ? (
                            // ✅ DELIVERED STATE (Simple View - No Tooltip)
                            <div className="flex flex-col items-start gap-1">
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 text-green-600 shrink-0" />
                                <span className="text-[10px] min-[2000px]:text-xs font-bold text-green-700 dark:text-green-400">
                                  Delivered
                                </span>
                              </div>
                              {/* Date Display */}
                              {(booking.actual_delivery ||
                                booking.updated_at) && (
                                <div className="pl-5">
                                  <span className="text-[10px] min-[2000px]:text-xs font-medium text-muted-foreground">
                                    {new Date(
                                      booking.actual_delivery ||
                                        booking.updated_at!,
                                    ).toLocaleDateString("en-GB", {
                                      day: "2-digit",
                                      month: "short",
                                      year: "numeric",
                                    })}
                                  </span>
                                </div>
                              )}
                            </div>
                          ) : booking.dynamic_eta ||
                            booking.estimated_arrival ? (
                            // ✅ IN-TRANSIT STATE (Old Logic: Dynamic ETA + Tooltip)
                            <>
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="flex items-center gap-1.5 cursor-help">
                                      <Calendar className="w-3 h-3 min-[2000px]:w-3.5 min-[2000px]:h-3.5 text-muted-foreground shrink-0" />

                                      {booking.dynamic_eta ? (
                                        <>
                                          <span className="text-[10px] min-[2000px]:text-xs line-through text-muted-foreground">
                                            {formatETA(
                                              booking.estimated_arrival!,
                                            )}
                                          </span>
                                          <span
                                            className={cn(
                                              "text-[10px] min-[2000px]:text-xs font-bold",
                                              new Date(booking.dynamic_eta) <
                                                new Date(
                                                  booking.estimated_arrival ||
                                                    "",
                                                )
                                                ? "text-green-600 dark:text-green-400"
                                                : "text-red-600 dark:text-red-400",
                                            )}
                                          >
                                            {formatETA(booking.dynamic_eta)}
                                          </span>
                                        </>
                                      ) : (
                                        <span className="text-[10px] min-[2000px]:text-xs font-medium">
                                          {formatETA(
                                            booking.estimated_arrival!,
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </TooltipTrigger>

                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs p-3"
                                  >
                                    <div className="space-y-2 text-xs">
                                      <p className="font-bold flex items-center gap-1.5">
                                        <TrendingUp className="w-3.5 h-3.5" />
                                        ETA Details
                                      </p>
                                      <div className="border-t border-border pt-2 space-y-1.5">
                                        <div className="flex justify-between">
                                          <span className="text-muted-foreground">
                                            Original:
                                          </span>
                                          <span className="font-medium">
                                            {booking.estimated_arrival
                                              ? formatETAWithTime(
                                                  booking.estimated_arrival,
                                                )
                                              : "N/A"}
                                          </span>
                                        </div>
                                        {booking.dynamic_eta && (
                                          <div className="flex justify-between">
                                            <span className="text-muted-foreground">
                                              Updated:
                                            </span>
                                            <span className="font-bold">
                                              {formatETAWithTime(
                                                booking.dynamic_eta,
                                              )}
                                            </span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              {/* SLA Status Badge */}
                              <TooltipProvider delayDuration={100}>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    {(() => {
                                      const bestETA = getBestETA(booking);
                                      const sla = getSLAStatus(
                                        bestETA,
                                        booking.status,
                                      );
                                      const progress =
                                        getProgressPercentage(booking);

                                      return (
                                        <div
                                          className={cn(
                                            "inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[9px] min-[2000px]:text-[11px] font-bold border cursor-help",
                                            sla.bgColor,
                                            sla.color,
                                            "border-current/20",
                                          )}
                                        >
                                          <span>{sla.icon}</span>
                                          <span>{sla.label}</span>
                                          {progress > 0 && progress < 100 && (
                                            <>
                                              <span className="opacity-50">
                                                •
                                              </span>
                                              <span>{progress}%</span>
                                            </>
                                          )}
                                        </div>
                                      );
                                    })()}
                                  </TooltipTrigger>
                                  <TooltipContent
                                    side="top"
                                    className="max-w-xs p-3"
                                  >
                                    <div className="space-y-2 text-xs">
                                      <p className="font-bold">
                                        Journey Progress
                                      </p>
                                      {(booking.distance_covered ||
                                        booking.distance_remaining) && (
                                        <div className="border-t border-border pt-2">
                                          <div className="flex justify-between text-[10px] mb-1">
                                            <span>
                                              {booking.distance_covered || 0} km
                                            </span>
                                            <span>
                                              {getProgressPercentage(booking)}%
                                            </span>
                                          </div>
                                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                              className="h-full bg-blue-500 transition-all"
                                              style={{
                                                width: `${getProgressPercentage(booking)}%`,
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </>
                          ) : (
                            <span className="text-[10px] min-[2000px]:text-xs text-muted-foreground">
                              ETA not set
                            </span>
                          )}
                        </div>
                      </TableCell>
                      {/* COLUMN 7: Actions */}
                      <TableCell className="py-3 min-[2000px]:py-4 pr-4 min-[2000px]:pr-6 text-center w-[120px] min-[2000px]:w-[140px]">
                        <div className="flex items-center justify-center gap-1 min-[2000px]:gap-2">
                          <div
                            className="px-2 py-1 min-[2000px]:px-3 min-[2000px]:py-1.5 hover:bg-accent/30 rounded cursor-pointer"
                            onClick={(e) => {
                              const button =
                                e.currentTarget.querySelector("button");
                              if (
                                button &&
                                !button.contains(e.target as Node)
                              ) {
                                button.click();
                              }
                            }}
                          >
                            <ProgressiveActionButton
                              booking={booking}
                              stage={getBookingStage(booking)}
                              onAction={(actionType) => {
                                switch (actionType) {
                                  case "ASSIGN_VEHICLE":
                                    setAssignmentModal({
                                      isOpen: true,
                                      bookingId: booking.id,
                                    });
                                    break;

                                  case "CREATE_LR":
                                    setLrModal({
                                      isOpen: true,
                                      bookingId: booking.id,
                                    });
                                    break;

                                  case "UPLOAD_POD":
                                    setPodModal({
                                      isOpen: true,
                                      bookingId: booking.id,
                                    });
                                    break;

                                  case "GENERATE_INVOICE":
                                    setInvoiceModal({
                                      isOpen: true,
                                      bookingId: booking.id,
                                    });
                                    break;

                                  case "VIEW_INVOICE":
                                    if (booking.invoice_number) {
                                      toast({
                                        title: "Invoice",
                                        description: `Invoice: ${booking.invoice_number}`,
                                      });
                                    }
                                    break;

                                  case "REFRESH":
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
                                className="h-10 w-10 min-[2000px]:h-11 min-[2000px]:w-11 hover:bg-primary/10"
                              >
                                <MoreVertical className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                              </Button>
                            </DropdownMenuTrigger>

                            <DropdownMenuContent
                              align="end"
                              className="w-48 min-[2000px]:w-56 bg-card border-border dark:border-border"
                            >
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate(`/bookings/${booking.id}`)
                                }
                                className="min-[2000px]:py-3"
                              >
                                <Eye className="mr-2 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4" />
                                <span className="text-xs min-[2000px]:text-sm">
                                  View Details
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingFullBooking({
                                    ...booking,
                                    branch_id: booking.branch_id,
                                    lr_city_id: booking.lr_city_id,
                                  });
                                  setIsEditFullBookingModalOpen(true);
                                }}
                                className="min-[2000px]:py-3"
                              >
                                <Edit className="mr-2 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4" />
                                <span className="text-xs min-[2000px]:text-sm">
                                  Edit Details
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  setRemarksModal({
                                    isOpen: true,
                                    bookingId: booking.id,
                                  })
                                }
                                className="min-[2000px]:py-3"
                              >
                                <MessageSquare className="mr-2 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4" />
                                <span className="text-xs min-[2000px]:text-sm">
                                  {booking.remarks ? "Edit" : "Add"} Remarks
                                </span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-secondary" />
                              <DropdownMenuItem
                                className="text-[#DC2626] focus:text-[#DC2626] min-[2000px]:py-3"
                                onClick={() => setDeletingBookingId(booking.id)}
                              >
                                <Trash2 className="mr-2 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4" />
                                <span className="text-xs min-[2000px]:text-sm">
                                  Delete
                                </span>
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
        <div className="lg:hidden p-4 min-[2000px]:p-6 space-y-3 min-[2000px]:space-y-4">
          {paginatedBookings.length === 0 ? (
            <div className="text-center py-16 min-[2000px]:py-20">
              <div className="w-16 h-16 min-[2000px]:w-20 min-[2000px]:h-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <p className="text-base min-[2000px]:text-lg font-medium text-foreground dark:text-white">
                No bookings found
              </p>
              <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground mt-1">
                {searchTerm
                  ? "Try adjusting your search"
                  : "Add your first booking"}
              </p>
            </div>
          ) : (
            paginatedBookings.map((booking) => {
              const status =
                statusConfig[booking.status as keyof typeof statusConfig] ||
                statusConfig.DRAFT;
              const StatusIcon = status.icon;

              return (
                <div
                  key={booking.id}
                  className="bg-card border border-border dark:border-border rounded-lg p-4 min-[2000px]:p-5 space-y-3 min-[2000px]:space-y-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1 min-[2000px]:space-y-1.5">
                      <Button
                        variant="link"
                        className="p-0 h-auto font-semibold text-primary text-sm min-[2000px]:text-base"
                        onClick={() =>
                          setDetailSheet({
                            isOpen: true,
                            bookingId: booking.id,
                          })
                        }
                      >
                        {booking.bookingId}
                      </Button>
                      <Badge
                        className={cn(
                          "text-xs min-[2000px]:text-sm",
                          status.color,
                        )}
                      >
                        <StatusIcon className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                        {status.label}
                      </Badge>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 min-[2000px]:h-10 min-[2000px]:w-10"
                        >
                          <MoreVertical className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-card">
                        <DropdownMenuItem
                          onClick={() => {
                            setEditingFullBooking(booking);
                            setIsEditFullBookingModalOpen(true);
                          }}
                          className="min-[2000px]:py-3"
                        >
                          <Edit className="mr-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                          <span className="min-[2000px]:text-base">Edit</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-[#DC2626] min-[2000px]:py-3"
                          onClick={() => setDeletingBookingId(booking.id)}
                        >
                          <Trash2 className="mr-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                          <span className="min-[2000px]:text-base">Delete</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <div className="space-y-2 min-[2000px]:space-y-3 text-sm min-[2000px]:text-base pt-2 border-t border-border dark:border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 min-[2000px]:w-2.5 min-[2000px]:h-2.5 rounded-full bg-primary" />
                      <span className="font-medium">
                        {booking.consignorName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ArrowRight className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4" />
                      <span className="text-muted-foreground">
                        {booking.consigneeName}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 min-[2000px]:space-y-3 text-sm min-[2000px]:text-base pt-2 border-t border-border dark:border-border">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-green-600" />
                      <span className="font-medium">
                        {booking.fromLocation}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-red-600" />
                      <span className="text-muted-foreground">
                        {booking.toLocation}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 min-[2000px]:gap-3 pt-2 border-t border-border dark:border-border">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/bookings/${booking.id}`)}
                      className="flex-1 min-[2000px]:h-10 min-[2000px]:text-base"
                    >
                      <Eye className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                      View
                    </Button>
                    {!booking.lrNumber && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setLrModal({ isOpen: true, bookingId: booking.id })
                        }
                        className="flex-1 min-[2000px]:h-10 min-[2000px]:text-base"
                      >
                        <FileText className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                        Create LR
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
        {/* Pagination */}
        {filteredBookings.length > 0 && (
          <div className="px-6 min-[2000px]:px-8 py-4 min-[2000px]:py-6 border-t border-border dark:border-border bg-card">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 min-[2000px]:gap-6">
              <div className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground">
                Showing{" "}
                <span className="font-medium text-foreground dark:text-white">
                  {(currentPage - 1) * itemsPerPage + 1}
                </span>{" "}
                to{" "}
                <span className="font-medium text-foreground dark:text-white">
                  {Math.min(
                    currentPage * itemsPerPage,
                    filteredBookings.length,
                  )}
                </span>{" "}
                of{" "}
                <span className="font-medium text-foreground dark:text-white">
                  {filteredBookings.length}
                </span>{" "}
                results
              </div>

              <div className="flex items-center gap-2 min-[2000px]:gap-3">
                {currentPage > 2 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(1)}
                    className="h-9 w-9 min-[2000px]:h-11 min-[2000px]:w-11 p-0 border-border dark:border-border text-foreground dark:text-white hover:text-foreground dark:hover:text-white"
                  >
                    <ChevronsLeft className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                  </Button>
                )}

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((prev) => Math.max(1, prev - 1))
                  }
                  className="h-9 w-9 min-[2000px]:h-11 min-[2000px]:w-11 p-0 border-border dark:border-border text-foreground dark:text-white hover:text-foreground dark:hover:text-white disabled:opacity-50"
                >
                  <ChevronLeft className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                </Button>

                <div className="flex items-center gap-1 min-[2000px]:gap-2">
                  {getPaginationButtons().map((page, index) =>
                    page === "..." ? (
                      <span
                        key={`ellipsis-${index}`}
                        className="px-2 text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base"
                      >
                        ...
                      </span>
                    ) : (
                      <Button
                        key={page}
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(page as number)}
                        className={cn(
                          "h-9 w-9 min-[2000px]:h-11 min-[2000px]:w-11 p-0 border-border dark:border-border min-[2000px]:text-base",
                          currentPage === page
                            ? "bg-primary border-primary text-primary-foreground hover:text-primary-foreground font-medium hover:bg-primary-hover"
                            : "bg-card hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white hover:text-foreground dark:hover:text-white",
                        )}
                      >
                        {page}
                      </Button>
                    ),
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages || totalPages === 0}
                  onClick={() =>
                    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                  }
                  className="h-9 w-9 min-[2000px]:h-11 min-[2000px]:w-11 p-0 border-border dark:border-border text-foreground dark:text-white hover:text-foreground dark:hover:text-white disabled:opacity-50"
                >
                  <ChevronRight className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                </Button>

                {currentPage < totalPages - 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(totalPages)}
                    className="h-9 w-9 min-[2000px]:h-11 min-[2000px]:w-11 p-0 border-border dark:border-border text-foreground dark:text-white hover:text-foreground dark:hover:text-white"
                  >
                    <ChevronsRight className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
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
                <SelectTrigger className="w-[130px] min-[2000px]:w-[160px] h-9 min-[2000px]:h-11 min-[2000px]:text-base border-border dark:border-border bg-card text-foreground dark:text-white hover:text-foreground dark:hover:text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border dark:border-border">
                  <SelectItem
                    value="10"
                    className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white min-[2000px]:text-base min-[2000px]:py-3"
                  >
                    10 per page
                  </SelectItem>
                  <SelectItem
                    value="25"
                    className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white min-[2000px]:text-base min-[2000px]:py-3"
                  >
                    25 per page
                  </SelectItem>
                  <SelectItem
                    value="50"
                    className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white min-[2000px]:text-base min-[2000px]:py-3"
                  >
                    50 per page
                  </SelectItem>
                  <SelectItem
                    value="100"
                    className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white min-[2000px]:text-base min-[2000px]:py-3"
                  >
                    100 per page
                  </SelectItem>
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
        onAssign={(vehicleAssignment) =>
          handleVehicleAssignment(assignmentModal.bookingId, vehicleAssignment)
        }
        bookingId={assignmentModal.bookingId}
      />

      <CreateLRModal
        isOpen={lrModal.isOpen}
        onClose={() => setLrModal({ isOpen: false, bookingId: "" })}
        onSave={handleSaveLR}
        booking={lrBookingData}
        nextLRNumber={nextLRNumber}
      />

      <BookingFormModal
        isOpen={isBookingFormOpen}
        onClose={() => setIsBookingFormOpen(false)}
        onSave={async (bookingData: any) => {
          try {
            const { createBooking } = await import("@/api/bookings");
            const newBooking = await createBooking({
              ...bookingData,
              material_description: "",
              cargo_units: "1",
            });
            await loadData();
            toast({
              title: "✅ Booking Created",
              description: `Booking ${newBooking.booking_id} has been created successfully`,
            });
          } catch (error) {
            console.error("Error creating booking:", error);
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

      <AlertDialog
        open={!!deletingBookingId}
        onOpenChange={() => setDeletingBookingId(null)}
      >
        <AlertDialogContent className="bg-card border-border dark:border-border min-[2000px]:max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-foreground dark:text-white min-[2000px]:text-xl">
              <AlertCircle className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-[#DC2626]" />
              Delete Booking?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground dark:text-muted-foreground min-[2000px]:text-base">
              This action cannot be undone. This will permanently delete the
              booking.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-border dark:border-border min-[2000px]:h-11 min-[2000px]:px-6 min-[2000px]:text-base">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteBooking}
              className="bg-[#DC2626] hover:bg-[#B91C1C] text-white min-[2000px]:h-11 min-[2000px]:px-6 min-[2000px]:text-base"
            >
              Delete Booking
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WarehouseSelectionModal
        isOpen={warehouseModal.isOpen}
        onClose={() => setWarehouseModal({ isOpen: false, bookingId: "" })}
        onSelect={(warehouseId, warehouseName) =>
          handleWarehouseChange(
            warehouseModal.bookingId,
            warehouseId,
            warehouseName,
          )
        }
        currentWarehouseId={warehouseModal.currentWarehouseId}
        bookingId={warehouseModal.bookingId}
        bookingDisplayId={warehouseDisplayBookingId}
      />

      <UploadPODModal
        isOpen={podModal.isOpen}
        onClose={() => setPodModal({ isOpen: false, bookingId: "" })}
        booking={podBookingData}
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
        booking={invoiceBookingData}
        onSuccess={loadData}
      />

      <EditRemarksModal
        isOpen={remarksModal.isOpen}
        onClose={() => setRemarksModal({ isOpen: false, bookingId: "" })}
        booking={remarksBookingData}
        onSuccess={loadData}
      />

      <PODViewerModal
        isOpen={podViewer.isOpen}
        onClose={() =>
          setPodViewer({ isOpen: false, fileUrl: null, bookingId: "" })
        }
        fileUrl={podViewer.fileUrl}
        bookingId={podViewer.bookingId}
      />
      {/* LR Details Viewer Dialog */}
      <Dialog
        open={lrViewer.isOpen}
        onOpenChange={(open) =>
          !open && setLrViewer({ isOpen: false, booking: null })
        }
      >
        <DialogContent className="sm:max-w-[500px] min-[2000px]:sm:max-w-[600px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground min-[2000px]:text-xl">
              <FileText className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-primary" />
              LR Details - {lrViewer.booking?.lrNumber}
              {lrViewer.booking?.is_offline_lr && (
                <Badge
                  variant="outline"
                  className="ml-2 text-amber-600 border-amber-600 min-[2000px]:text-sm"
                >
                  <FileEdit className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                  Offline LR
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {lrViewer.booking && (
            <div className="space-y-4 min-[2000px]:space-y-5 py-4 min-[2000px]:py-6">
              {/* LR Info Grid */}
              <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
                <div className="space-y-1 min-[2000px]:space-y-1.5">
                  <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground">
                    LR Number
                  </p>
                  <p className="text-sm min-[2000px]:text-base font-semibold text-foreground">
                    {lrViewer.booking.lrNumber || "-"}
                  </p>
                </div>

                <div className="space-y-1 min-[2000px]:space-y-1.5">
                  <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground">
                    LR Date
                  </p>
                  <p className="text-sm min-[2000px]:text-base font-semibold text-foreground">
                    {lrViewer.booking.lrDate
                      ? new Date(lrViewer.booking.lrDate).toLocaleDateString(
                          "en-GB",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          },
                        )
                      : "-"}
                  </p>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Route Info */}
              <div className="border-t border-border">
                <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground mb-2">
                  Route
                </p>
                <div className="flex items-center gap-2 text-sm min-[2000px]:text-base">
                  <MapPin className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-green-600" />
                  <span className="font-medium">
                    {lrViewer.booking.fromLocation}
                  </span>
                  <ArrowRight className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-muted-foreground" />
                  <MapPin className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-red-600" />
                  <span className="font-medium">
                    {lrViewer.booking.toLocation}
                  </span>
                </div>
              </div>

              {/* ✅ OFFLINE LR SECTION */}
              {lrViewer.booking.is_offline_lr && (
                <>
                  <div className="border-t border-border" />

                  <div className="p-3 min-[2000px]:p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                    <div className="flex items-center gap-2 text-amber-800 dark:text-amber-200">
                      <FileEdit className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                      <span className="text-sm min-[2000px]:text-base font-medium">
                        LR Generated Offline
                      </span>
                    </div>
                    <p className="text-xs min-[2000px]:text-sm text-amber-700 dark:text-amber-300 mt-1">
                      This is a physical/manual LR. The scanned copy can be
                      uploaded below.
                    </p>
                  </div>

                  {lrViewer.booking.offline_lr_file_url ? (
                    <div className="space-y-3 min-[2000px]:space-y-4">
                      <div className="flex items-center justify-between p-3 min-[2000px]:p-4 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                          <CheckCircle2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                          <span className="text-sm min-[2000px]:text-base font-medium">
                            LR Document Uploaded
                          </span>
                        </div>
                        {lrViewer.booking.offline_lr_uploaded_at && (
                          <span className="text-xs min-[2000px]:text-sm text-green-600">
                            {new Date(
                              lrViewer.booking.offline_lr_uploaded_at,
                            ).toLocaleDateString("en-GB", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <Button
                        className="w-full min-[2000px]:h-11 min-[2000px]:text-base"
                        variant="outline"
                        onClick={() => {
                          setOfflineLRViewer({
                            isOpen: true,
                            fileUrl: lrViewer.booking!.offline_lr_file_url!,
                            lrNumber: lrViewer.booking!.lrNumber!,
                          });
                        }}
                      >
                        <Eye className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                        View LR Document
                      </Button>
                    </div>
                  ) : (
                    <Button
                      className="w-full min-[2000px]:h-11 min-[2000px]:text-base"
                      variant="default"
                      onClick={() => {
                        setLrViewer({ isOpen: false, booking: null });
                        setOfflineLRUploadModal({
                          isOpen: true,
                          booking: {
                            id: lrViewer.booking!.id,
                            bookingId: lrViewer.booking!.bookingId,
                            lrNumber: lrViewer.booking!.lrNumber!,
                          },
                        });
                      }}
                    >
                      <Upload className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                      Upload LR Document
                    </Button>
                  )}
                </>
              )}

              {/* ✅ DIGITAL LR SECTION */}
              {!lrViewer.booking.is_offline_lr && (
                <>
                  <div className="space-y-1 min-[2000px]:space-y-1.5">
                    <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground">
                      Material Description
                    </p>
                    <p className="text-sm min-[2000px]:text-base text-foreground bg-muted/50 p-2 min-[2000px]:p-3 rounded-md">
                      {lrViewer.booking.materialDescription ||
                        "No description provided"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
                    <div className="space-y-1 min-[2000px]:space-y-1.5">
                      <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground">
                        Cargo Units
                      </p>
                      <p className="text-sm min-[2000px]:text-base font-semibold text-foreground">
                        {lrViewer.booking.cargoUnits || "1"}
                      </p>
                    </div>

                    <div className="space-y-1 min-[2000px]:space-y-1.5">
                      <p className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground">
                        Service Type
                      </p>
                      <Badge
                        variant="outline"
                        className="text-xs min-[2000px]:text-sm"
                      >
                        {lrViewer.booking.serviceType}
                      </Badge>
                    </div>
                  </div>

                  <div className="border-t border-border pt-4 min-[2000px]:pt-5">
                    <Button
                      className="w-full min-[2000px]:h-11 min-[2000px]:text-base"
                      onClick={() => {
                        handleDownloadLR(lrViewer.booking!);
                        setLrViewer({ isOpen: false, booking: null });
                      }}
                    >
                      <Download className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                      Download LR PDF
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ NEW: Offline LR Upload Modal */}
      <UploadOfflineLRModal
        isOpen={offlineLRUploadModal.isOpen}
        onClose={() =>
          setOfflineLRUploadModal({ isOpen: false, booking: null })
        }
        booking={offlineLRUploadModal.booking}
        onSuccess={loadData}
      />

      {/* ✅ NEW: Offline LR Viewer Modal */}
      <Dialog
        open={offlineLRViewer.isOpen}
        onOpenChange={(open) =>
          !open &&
          setOfflineLRViewer({ isOpen: false, fileUrl: null, lrNumber: "" })
        }
      >
        <DialogContent className="sm:max-w-3xl min-[2000px]:sm:max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 min-[2000px]:text-xl">
              <FileText className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-primary" />
              LR Document - {offlineLRViewer.lrNumber}
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-center min-h-[400px] min-[2000px]:min-h-[500px] bg-muted rounded-lg overflow-hidden">
            {offlineLRViewer.fileUrl &&
              (offlineLRViewer.fileUrl.toLowerCase().endsWith(".pdf") ? (
                <iframe
                  src={offlineLRViewer.fileUrl}
                  className="w-full h-[500px] min-[2000px]:h-[600px]"
                  title="LR Document"
                />
              ) : (
                <img
                  src={offlineLRViewer.fileUrl}
                  alt="LR Document"
                  className="max-w-full max-h-[500px] min-[2000px]:max-h-[600px] object-contain"
                />
              ))}
          </div>

          <div className="flex justify-end gap-2 min-[2000px]:gap-3 pt-4 min-[2000px]:pt-5">
            <Button
              variant="outline"
              onClick={() =>
                setOfflineLRViewer({
                  isOpen: false,
                  fileUrl: null,
                  lrNumber: "",
                })
              }
              className="min-[2000px]:h-11 min-[2000px]:px-6 min-[2000px]:text-base"
            >
              Close
            </Button>
            <Button
              onClick={() => {
                if (offlineLRViewer.fileUrl) {
                  window.open(offlineLRViewer.fileUrl, "_blank");
                }
              }}
              className="min-[2000px]:h-11 min-[2000px]:px-6 min-[2000px]:text-base"
            >
              <Download className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
              Download
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
