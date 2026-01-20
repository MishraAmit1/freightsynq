import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import {
  FileText,
  MapPin,
  Package,
  User,
  Truck,
  Phone,
  Loader2,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Navigation,
  Zap,
  MapPinned,
  Activity,
  MessageSquare,
  Edit,
  Plus,
  Save,
} from "lucide-react";
import { fetchBookingById } from "@/api/bookings";
import { formatDate, formatDateTime, cn } from "@/lib/utils";
import { EnhancedVehicleAssignmentModal } from "./EnhancedVehicleAssignmentModal";
import { useToast } from "@/hooks/use-toast";
import { MiniTrackingMap } from "@/components/MiniTrackingMap";
import { useNavigate } from "react-router-dom";

interface BookingDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  onUpdate?: () => void;
}

interface BookingDetail {
  id: string;
  bookingId: string;
  consignorName: string;
  consigneeName: string;
  consignorPhone?: string;
  consignorAddress?: string;
  consignorCity?: string;
  consignorGSTIN?: string;
  consigneePhone?: string;
  consigneeAddress?: string;
  consigneeCity?: string;
  consigneeGSTIN?: string;
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
  branch_name?: string;
  branch_code?: string;
  current_warehouse?: {
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
    };
    assignedAt?: string;
    assignment_id?: string;
    last_toll_crossed?: string;
    last_toll_time?: string;
  };
  broker?: {
    name: string;
    contact_person?: string;
    phone?: string;
    email?: string;
    city?: string;
  };
  eway_bill_details?: Array<{
    number: string;
    valid_until?: string;
  }>;
  remarks?: string;
  alerts?: Array<{
    message: string;
  }>;
}

const statusConfig = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-300" },
  QUOTED: {
    label: "Quoted",
    color: "bg-blue-100 text-blue-700 border-blue-300",
  },
  CONFIRMED: {
    label: "Confirmed",
    color:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
  AT_WAREHOUSE: {
    label: "At Warehouse",
    color:
      "bg-accent text-primary dark:text-primary border-primary/40 dark:bg-primary/15 dark:text-primary dark:border-primary/40",
  },
  DISPATCHED: {
    label: "Dispatched",
    color:
      "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  },
  IN_TRANSIT: {
    label: "In Transit",
    color:
      "bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
  },
  DELIVERED: {
    label: "Delivered",
    color:
      "bg-green-100 text-green-700 border-green-300 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
  },
  CANCELLED: {
    label: "Cancelled",
    color:
      "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
  },
};

export const BookingDetailSheet = ({
  isOpen,
  onClose,
  bookingId,
  onUpdate,
}: BookingDetailSheetProps) => {
  const { toast } = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [showVehicleAssignModal, setShowVehicleAssignModal] = useState(false);
  const [showRemarksModal, setShowRemarksModal] = useState(false);
  const [remarksText, setRemarksText] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen && bookingId) {
      loadBookingDetails();
    }
  }, [isOpen, bookingId]);

  const loadBookingDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchBookingById(bookingId);

      if (data) {
        const hasActiveAssignment =
          data.vehicle_assignments &&
          Array.isArray(data.vehicle_assignments) &&
          data.vehicle_assignments.length > 0 &&
          data.vehicle_assignments[0].vehicle;

        const activeAssignment = data.vehicle_assignments?.[0];

        const convertedBooking: BookingDetail = {
          id: data.id,
          bookingId: data.booking_id,
          consignorName: data.consignor_name,
          consigneeName: data.consignee_name,
          consignorPhone: data.consignor?.phone,
          consignorAddress: data.consignor?.address_line1,
          consignorCity: data.consignor?.city,
          consignorGSTIN: data.consignor?.gst_number,
          consigneePhone: data.consignee?.phone,
          consigneeAddress: data.consignee?.address_line1,
          consigneeCity: data.consignee?.city,
          consigneeGSTIN: data.consignee?.gst_number,
          fromLocation: data.from_location,
          toLocation: data.to_location,
          cargoUnits: parseInt(data.cargo_units) || 0,
          materialDescription: data.material_description,
          serviceType: data.service_type as "FTL" | "PTL",
          status: data.status,
          pickupDate: data.pickup_date,
          lrNumber: data.lr_number,
          lrDate: data.lr_date,
          bookingDateTime: data.created_at,
          branch_name: data.branch?.branch_name,
          branch_code: data.branch?.branch_code,
          current_warehouse: data.current_warehouse,
          eway_bill_details: data.eway_bill_details || [],
          remarks: data.remarks,

          assignedVehicle: hasActiveAssignment
            ? {
                id: activeAssignment.vehicle.id,
                regNumber: activeAssignment.vehicle.vehicle_number,
                type: activeAssignment.vehicle.vehicle_type,
                capacity: activeAssignment.vehicle.capacity,
                driver: activeAssignment.driver
                  ? {
                      name: activeAssignment.driver.name,
                      phone: activeAssignment.driver.phone,
                    }
                  : undefined,
                assignedAt: activeAssignment.created_at,
                assignment_id: activeAssignment.id,
                last_toll_crossed: activeAssignment.last_toll_crossed,
                last_toll_time: activeAssignment.last_toll_time,
              }
            : undefined,

          broker: activeAssignment?.broker,
        };

        // Alert calculation
        const alerts: any[] = [];
        const now = new Date();

        if (data.status === "DELIVERED" && !data.pod_uploaded_at) {
          const deliveryTime = new Date(
            data.actual_delivery || data.updated_at,
          );
          const hoursSince =
            (now.getTime() - deliveryTime.getTime()) / (1000 * 60 * 60);
          if (hoursSince > 24) {
            alerts.push({
              message: `POD pending for ${Math.floor(hoursSince)} hours`,
            });
          }
        }

        if (data.eway_bill_details) {
          data.eway_bill_details.forEach((ewb: any) => {
            if (ewb.valid_until) {
              const hours =
                (new Date(ewb.valid_until).getTime() - now.getTime()) / 36e5;
              if (hours > 0 && hours < 12) {
                alerts.push({
                  message: `E-way expires in ${Math.floor(hours)}h`,
                });
              }
            }
          });
        }

        setBooking({ ...convertedBooking, alerts });
      }
    } catch (error) {
      console.error("❌ Error loading booking:", error);
      toast({
        title: "Error",
        description: "Failed to load booking details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleVehicleUnassign = async () => {
    try {
      const { unassignVehicle } = await import("@/api/vehicles");
      await unassignVehicle(booking!.id);

      setBooking((prev) =>
        prev ? { ...prev, assignedVehicle: undefined } : null,
      );
      await loadBookingDetails();
      onUpdate?.();

      toast({
        title: "✅ Vehicle Unassigned",
        description: "Vehicle removed successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to unassign vehicle",
        variant: "destructive",
      });
    }
  };

  const getTrackingFreshness = () => {
    if (!booking?.assignedVehicle?.last_toll_time) return null;

    const lastUpdate = new Date(booking.assignedVehicle.last_toll_time);
    const now = new Date();
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60);

    const isFresh = hoursDiff < 2;
    const isStale = hoursDiff >= 2 && hoursDiff < 6;
    const isOld = hoursDiff >= 6;

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
      isFresh,
      isStale,
      isOld,
      timeAgo: getTimeAgo(),
      statusEmoji: isFresh ? "🟢" : isStale ? "🟡" : "⚪",
      statusText: isFresh
        ? "Live tracking"
        : isStale
          ? "Recent data"
          : "Old data",
      dotColor: isFresh
        ? "bg-green-500"
        : isStale
          ? "bg-yellow-500"
          : "bg-gray-400",
    };
  };

  const handleSaveRemarks = async () => {
    if (!booking) return;

    try {
      const { supabase } = await import("@/lib/supabase");
      const trimmedRemarks = remarksText.trim();

      const { error } = await supabase
        .from("bookings")
        .update({ remarks: trimmedRemarks || null })
        .eq("id", booking.id);

      if (error) throw error;

      setBooking((prev) =>
        prev ? { ...prev, remarks: trimmedRemarks } : null,
      );
      setShowRemarksModal(false);
      onUpdate?.();

      toast({
        title: "✅ Success",
        description: trimmedRemarks
          ? "Remarks updated successfully"
          : "Remarks removed successfully",
      });
    } catch (error) {
      console.error("Error updating remarks:", error);
      toast({
        title: "❌ Error",
        description: "Failed to update remarks",
        variant: "destructive",
      });
    }
  };

  if (!booking && !loading) return null;

  const status =
    statusConfig[booking?.status as keyof typeof statusConfig] ||
    statusConfig.DRAFT;
  const trackingInfo = getTrackingFreshness();

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl min-[2000px]:max-w-3xl overflow-y-auto p-0 bg-card border-l border-border dark:border-border">
          <VisuallyHidden>
            <SheetHeader>
              <SheetTitle>
                Booking Details - {booking?.bookingId || "Loading"}
              </SheetTitle>
              <SheetDescription>
                View comprehensive booking information including parties, cargo,
                vehicle assignment, and live tracking
              </SheetDescription>
            </SheetHeader>
          </VisuallyHidden>

          {loading ? (
            <div className="flex items-center justify-center h-screen">
              <div className="text-center space-y-3 min-[2000px]:space-y-4">
                <Loader2 className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 animate-spin text-primary mx-auto" />
                <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground">
                  Loading...
                </p>
              </div>
            </div>
          ) : booking ? (
            <>
              {/* HEADER */}
              <div className="sticky top-0 z-10 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 dark:to-transparent border-b border-border dark:border-border backdrop-blur-sm">
                <div className="p-4 min-[2000px]:p-6">
                  <div className="flex items-start justify-between gap-3 mb-3 min-[2000px]:mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-primary shrink-0" />
                        <h2 className="text-xl min-[2000px]:text-2xl font-bold truncate text-foreground dark:text-white">
                          {booking.bookingId}
                        </h2>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4" />
                          {formatDate(booking.bookingDateTime)}
                        </span>
                        {booking.branch_name && (
                          <>
                            <span>•</span>
                            <Badge
                              variant="outline"
                              className="text-xs min-[2000px]:text-sm h-5 min-[2000px]:h-6 border-border dark:border-border"
                            >
                              {booking.branch_code}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge
                        className={cn(
                          "text-xs min-[2000px]:text-sm font-medium",
                          status.color,
                        )}
                      >
                        {status.label}
                      </Badge>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/bookings/${booking.id}`)}
                        className="h-8 min-[2000px]:h-9 px-3 min-[2000px]:px-4 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-accent dark:hover:bg-secondary font-medium"
                      >
                        Open Details
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="h-8 w-8 min-[2000px]:h-9 min-[2000px]:w-9 hover:bg-accent dark:hover:bg-secondary"
                      >
                        <X className="h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="grid grid-cols-3 gap-2 min-[2000px]:gap-3">
                    <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 min-[2000px]:p-3 text-center border">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Package className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-primary dark:text-primary" />
                        <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                          Cargo
                        </p>
                      </div>
                      <p className="text-sm min-[2000px]:text-base font-bold text-foreground dark:text-white">
                        {booking.cargoUnits}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 min-[2000px]:p-3 text-center border">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <Navigation className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-green-600" />
                        <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                          Service
                        </p>
                      </div>
                      <p className="text-sm min-[2000px]:text-base font-bold text-foreground dark:text-white">
                        {booking.serviceType}
                      </p>
                    </div>
                    <div className="bg-white/50 dark:bg-gray-900/50 rounded-lg p-2 min-[2000px]:p-3 text-center border">
                      <div className="flex items-center justify-center gap-1 mb-1">
                        <FileText className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-orange-600" />
                        <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                          LR
                        </p>
                      </div>
                      <p className="text-xs min-[2000px]:text-sm font-bold truncate text-foreground dark:text-white">
                        {booking.lrNumber || "Pending"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ALERT BANNER */}
              {booking.alerts && booking.alerts.length > 0 && (
                <div className="bg-red-50 dark:bg-red-950/30 border-b border-red-200 dark:border-red-900 px-4 py-3 min-[2000px]:px-6 min-[2000px]:py-4 animate-in slide-in-from-top-2">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 min-[2000px]:p-2 bg-red-100 dark:bg-red-900/50 rounded-full shrink-0">
                      <AlertCircle className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-red-600 dark:text-red-400" />
                    </div>
                    <div>
                      <h4 className="text-sm min-[2000px]:text-base font-bold text-red-900 dark:text-red-200 mb-1">
                        Attention Required
                      </h4>
                      <ul className="space-y-1">
                        {booking.alerts.map((alert, idx) => (
                          <li
                            key={idx}
                            className="text-xs min-[2000px]:text-sm text-red-700 dark:text-red-300 font-medium flex items-start gap-1.5"
                          >
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-red-500 shrink-0" />
                            {alert.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* CONTENT */}
              <div className="p-4 min-[2000px]:p-6 space-y-4 min-[2000px]:space-y-5">
                {/* Route */}
                <div className="bg-gradient-to-r from-green-50 to-red-50 dark:from-green-950/20 dark:to-red-950/20 rounded-lg p-4 min-[2000px]:p-5 border border-border dark:border-border">
                  <div className="flex items-center gap-2 mb-3">
                    <Navigation className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-primary" />
                    <h3 className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                      Route
                    </h3>
                  </div>
                  <div className="space-y-2 min-[2000px]:space-y-3">
                    <div className="flex items-start gap-2">
                      <div className="mt-1 w-6 h-6 min-[2000px]:w-7 min-[2000px]:h-7 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                        <MapPin className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                          Pickup from
                        </p>
                        <p className="font-semibold text-sm min-[2000px]:text-base truncate text-foreground dark:text-white">
                          {booking.fromLocation}
                        </p>
                      </div>
                    </div>
                    <div className="ml-3 min-[2000px]:ml-3.5 border-l-2 border-dashed border-border dark:border-border h-4 min-[2000px]:h-5"></div>
                    <div className="flex items-start gap-2">
                      <div className="mt-1 w-6 h-6 min-[2000px]:w-7 min-[2000px]:h-7 rounded-full bg-red-500 flex items-center justify-center shrink-0">
                        <MapPin className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                          Deliver to
                        </p>
                        <p className="font-semibold text-sm min-[2000px]:text-base truncate text-foreground dark:text-white">
                          {booking.toLocation}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Parties */}
                <div className="grid grid-cols-2 gap-3 min-[2000px]:gap-4">
                  <div className="bg-accent dark:bg-primary/10 rounded-lg p-3 min-[2000px]:p-4 border border-primary/20 dark:border-primary/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 min-[2000px]:w-8 min-[2000px]:h-8 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-primary" />
                      </div>
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        Consignor
                      </p>
                    </div>
                    <p
                      className="font-semibold text-sm min-[2000px]:text-base truncate text-foreground dark:text-white"
                      title={booking.consignorName}
                    >
                      {booking.consignorName}
                    </p>
                    {booking.consignorAddress && (
                      <p
                        className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground mt-1 truncate"
                        title={booking.consignorAddress}
                      >
                        {booking.consignorAddress}
                      </p>
                    )}
                    {booking.consignorPhone && (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs min-[2000px]:text-sm mt-1 text-primary dark:text-primary hover:text-primary"
                        asChild
                      >
                        <a href={`tel:${booking.consignorPhone}`}>
                          <Phone className="w-2.5 h-2.5 min-[2000px]:w-3 min-[2000px]:h-3 mr-1" />
                          {booking.consignorPhone}
                        </a>
                      </Button>
                    )}
                  </div>

                  <div className="bg-accent dark:bg-primary/10 rounded-lg p-3 min-[2000px]:p-4 border border-primary/20 dark:border-primary/30">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-7 h-7 min-[2000px]:w-8 min-[2000px]:h-8 rounded-full bg-[#F38810]/20 dark:bg-[#F38810]/30 flex items-center justify-center">
                        <User className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-primary dark:text-primary" />
                      </div>
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        Consignee
                      </p>
                    </div>
                    <p
                      className="font-semibold text-sm min-[2000px]:text-base truncate text-foreground dark:text-white"
                      title={booking.consigneeName}
                    >
                      {booking.consigneeName}
                    </p>
                    {booking.consigneeAddress && (
                      <p
                        className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground mt-1 truncate"
                        title={booking.consigneeAddress}
                      >
                        {booking.consigneeAddress}
                      </p>
                    )}
                    {booking.consigneePhone && (
                      <Button
                        variant="link"
                        className="h-auto p-0 text-xs min-[2000px]:text-sm mt-1 text-primary dark:text-primary hover:text-primary"
                        asChild
                      >
                        <a href={`tel:${booking.consigneePhone}`}>
                          <Phone className="w-2.5 h-2.5 min-[2000px]:w-3 min-[2000px]:h-3 mr-1" />
                          {booking.consigneePhone}
                        </a>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Cargo */}
                <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 min-[2000px]:p-4 border border-orange-200 dark:border-orange-800">
                  <div className="flex items-center gap-2 mb-2 min-[2000px]:mb-3">
                    <Package className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-orange-600" />
                    <h3 className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                      Cargo Details
                    </h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3 min-[2000px]:gap-4 text-sm">
                    <div>
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        Material
                      </p>
                      <p
                        className="font-medium text-xs min-[2000px]:text-sm truncate text-foreground dark:text-white"
                        title={booking.materialDescription}
                      >
                        {booking.materialDescription}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        Units
                      </p>
                      <p className="font-bold text-base min-[2000px]:text-lg text-foreground dark:text-white">
                        {booking.cargoUnits}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        Pickup
                      </p>
                      <p className="font-medium text-xs min-[2000px]:text-sm text-foreground dark:text-white">
                        {booking.pickupDate
                          ? formatDate(booking.pickupDate)
                          : "TBD"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Warehouse */}
                {booking.current_warehouse && (
                  <div className="bg-accent dark:bg-primary/10 rounded-lg p-3 min-[2000px]:p-4 border border-primary/30 dark:border-primary/40">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-primary dark:text-primary" />
                      <h3 className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                        Current Location
                      </h3>
                      <Badge className="ml-auto bg-primary text-primary-foreground text-xs min-[2000px]:text-sm border-0">
                        At Warehouse
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPinned className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 text-muted-foreground dark:text-muted-foreground" />
                      <p className="font-medium text-sm min-[2000px]:text-base text-foreground dark:text-white">
                        {booking.current_warehouse.name}
                      </p>
                      <span className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        • {booking.current_warehouse.city}
                      </span>
                    </div>
                  </div>
                )}

                {/* Live Tracking with Mini Map */}
                {booking.assignedVehicle && (
                  <div
                    className={cn(
                      "rounded-lg p-4 min-[2000px]:p-5 border",
                      trackingInfo?.isFresh &&
                        "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800",
                      trackingInfo?.isStale &&
                        "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800",
                      (!trackingInfo || trackingInfo?.isOld) &&
                        "bg-muted border-border dark:border-border",
                    )}
                  >
                    <div className="flex items-center gap-2 mb-3 min-[2000px]:mb-4">
                      <Activity
                        className={cn(
                          "w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6",
                          trackingInfo?.isFresh && "text-orange-600",
                          trackingInfo?.isStale && "text-yellow-600",
                          !trackingInfo &&
                            "text-muted-foreground dark:text-muted-foreground",
                        )}
                      />
                      <h3 className="font-semibold text-base min-[2000px]:text-lg text-foreground dark:text-white">
                        Live Tracking
                      </h3>
                      {booking.assignedVehicle.last_toll_crossed && (
                        <Badge
                          variant="outline"
                          className="ml-auto text-xs min-[2000px]:text-sm border-border dark:border-border"
                        >
                          En Route
                        </Badge>
                      )}
                    </div>

                    {/* 🗺️ MINI MAP */}
                    <MiniTrackingMap
                      bookingId={booking.id}
                      vehicleNumber={booking.assignedVehicle.regNumber}
                      className="mb-4 min-[2000px]:mb-5"
                    />

                    {/* Last Location Details */}
                    {booking.assignedVehicle.last_toll_crossed &&
                      trackingInfo && (
                        <div className="space-y-3 min-[2000px]:space-y-4">
                          <div className="flex items-start gap-3 p-3 min-[2000px]:p-4 bg-card rounded-lg border border-border dark:border-border">
                            <div className="relative">
                              <MapPin
                                className={cn(
                                  "w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6",
                                  trackingInfo.isFresh && "text-orange-600",
                                  trackingInfo.isStale && "text-yellow-600",
                                  trackingInfo.isOld && "text-muted-foreground",
                                )}
                              />
                              <span
                                className={cn(
                                  "absolute -top-1 -right-1 w-2.5 h-2.5 min-[2000px]:w-3 min-[2000px]:h-3 rounded-full border-2 border-white",
                                  trackingInfo.dotColor,
                                )}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                                Last Location
                              </p>
                              <p className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                                {booking.assignedVehicle.last_toll_crossed}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 min-[2000px]:gap-4 text-sm">
                            <div className="p-2 min-[2000px]:p-3 bg-card rounded border border-border dark:border-border">
                              <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                                Crossed
                              </p>
                              <p className="font-medium text-xs min-[2000px]:text-sm text-foreground dark:text-white">
                                {formatDateTime(
                                  booking.assignedVehicle.last_toll_time!,
                                )}
                              </p>
                              <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground mt-0.5">
                                ({trackingInfo.timeAgo})
                              </p>
                            </div>
                            <div className="p-2 min-[2000px]:p-3 bg-card rounded border border-border dark:border-border">
                              <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                                Status
                              </p>
                              <p className="font-medium text-sm min-[2000px]:text-base text-foreground dark:text-white">
                                {trackingInfo.statusEmoji}{" "}
                                {trackingInfo.statusText}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                    {/* No tracking data yet message */}
                    {!booking.assignedVehicle.last_toll_crossed && (
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground text-center py-2 min-[2000px]:py-3">
                        Tracking data will appear once vehicle crosses FASTag
                        tolls
                      </p>
                    )}
                  </div>
                )}

                {/* Vehicle */}
                <div
                  className={cn(
                    "rounded-lg p-3 min-[2000px]:p-4 border",
                    booking.assignedVehicle
                      ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800"
                      : "bg-muted border-border dark:border-border",
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <Truck
                      className={cn(
                        "w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5",
                        booking.assignedVehicle
                          ? "text-green-600"
                          : "text-muted-foreground dark:text-muted-foreground",
                      )}
                    />
                    <h3 className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                      Vehicle Assignment
                    </h3>
                    {booking.assignedVehicle && (
                      <CheckCircle2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-green-600 ml-auto" />
                    )}
                  </div>

                  {booking.assignedVehicle ? (
                    <div className="space-y-3 min-[2000px]:space-y-4">
                      <div className="grid grid-cols-2 gap-3 min-[2000px]:gap-4 text-sm">
                        <div>
                          <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                            Vehicle No.
                          </p>
                          <p className="font-bold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                            {booking.assignedVehicle.regNumber}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                            Type
                          </p>
                          <p className="font-medium text-xs min-[2000px]:text-sm text-foreground dark:text-white">
                            {booking.assignedVehicle.type}
                          </p>
                        </div>
                      </div>

                      {booking.assignedVehicle.driver && (
                        <>
                          <Separator className="bg-[#E5E7EB] dark:bg-secondary" />
                          <div className="grid grid-cols-2 gap-3 min-[2000px]:gap-4 text-sm">
                            <div>
                              <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                                Driver
                              </p>
                              <p className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                                {booking.assignedVehicle.driver.name}
                              </p>
                            </div>
                            <div>
                              <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                                Phone
                              </p>
                              <Button
                                variant="link"
                                className="h-auto p-0 text-sm min-[2000px]:text-base font-semibold text-primary dark:text-primary hover:text-primary"
                                asChild
                              >
                                <a
                                  href={`tel:${booking.assignedVehicle.driver.phone}`}
                                >
                                  <Phone className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                                  Call
                                </a>
                              </Button>
                            </div>
                          </div>
                        </>
                      )}

                      {booking.broker && (
                        <>
                          <Separator className="bg-[#E5E7EB] dark:bg-secondary" />
                          <div className="space-y-2 min-[2000px]:space-y-3">
                            <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                              Broker Details
                            </p>
                            <div className="text-sm space-y-1">
                              <p className="font-medium text-sm min-[2000px]:text-base text-foreground dark:text-white">
                                {booking.broker.name}
                              </p>
                              {booking.broker.contact_person && (
                                <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                                  Contact: {booking.broker.contact_person}
                                </p>
                              )}
                              {booking.broker.phone && (
                                <Button
                                  variant="link"
                                  className="h-auto p-0 text-xs min-[2000px]:text-sm text-primary dark:text-primary hover:text-primary"
                                  asChild
                                >
                                  <a href={`tel:${booking.broker.phone}`}>
                                    <Phone className="w-2.5 h-2.5 min-[2000px]:w-3 min-[2000px]:h-3 mr-1" />
                                    {booking.broker.phone}
                                  </a>
                                </Button>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      <div className="flex gap-2 min-[2000px]:gap-3 pt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs min-[2000px]:text-sm h-8 min-[2000px]:h-9 border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                          onClick={() => setShowVehicleAssignModal(true)}
                        >
                          Replace
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 text-xs min-[2000px]:text-sm h-8 min-[2000px]:h-9 border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                          onClick={handleVehicleUnassign}
                        >
                          Unassign
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-4 min-[2000px]:py-5">
                      <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground mb-3">
                        No vehicle assigned
                      </p>
                      <Button
                        size="sm"
                        className="w-full h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                        onClick={() => setShowVehicleAssignModal(true)}
                      >
                        <Truck className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                        Assign Vehicle
                      </Button>
                    </div>
                  )}
                </div>

                {/* E-way Bills */}
                {booking.eway_bill_details &&
                  booking.eway_bill_details.length > 0 && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 min-[2000px]:p-4 border border-yellow-200 dark:border-yellow-800">
                      <div className="flex items-center gap-2 mb-2 min-[2000px]:mb-3">
                        <Zap className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-yellow-600" />
                        <h3 className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                          E-way Bills
                        </h3>
                        <Badge
                          variant="secondary"
                          className="ml-auto text-xs min-[2000px]:text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 border-0"
                        >
                          {booking.eway_bill_details.length}
                        </Badge>
                      </div>
                      <div className="space-y-1.5 min-[2000px]:space-y-2">
                        {booking.eway_bill_details.map(
                          (ewb: any, index: number) => (
                            <div
                              key={index}
                              className="flex items-center justify-between text-sm bg-card rounded px-2 py-1.5 min-[2000px]:px-3 min-[2000px]:py-2 border border-border dark:border-border"
                            >
                              <span className="font-mono font-semibold text-xs min-[2000px]:text-sm text-foreground dark:text-white">
                                {ewb.number}
                              </span>
                              {ewb.valid_until && (
                                <span className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                                  Until {formatDate(ewb.valid_until)}
                                </span>
                              )}
                            </div>
                          ),
                        )}
                      </div>
                    </div>
                  )}

                {/* Remarks Card */}
                <div
                  className={cn(
                    "rounded-lg p-4 min-[2000px]:p-5 border",
                    booking.remarks
                      ? "bg-orange-50 dark:bg-orange-950/20 border-orange-200 dark:border-orange-800"
                      : "bg-muted border-dashed border-2 border-border dark:border-border",
                  )}
                >
                  <div className="flex items-center gap-2 mb-3">
                    <MessageSquare
                      className={cn(
                        "w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5",
                        booking.remarks
                          ? "text-orange-600"
                          : "text-muted-foreground dark:text-muted-foreground",
                      )}
                    />
                    <h3 className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                      Remarks / Notes
                    </h3>
                    {booking.remarks && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 min-[2000px]:h-8 text-xs min-[2000px]:text-sm hover:bg-accent dark:hover:bg-secondary"
                        onClick={() => {
                          setRemarksText(booking.remarks || "");
                          setShowRemarksModal(true);
                        }}
                      >
                        <Edit className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>

                  {booking.remarks ? (
                    <div className="bg-card rounded-lg p-3 min-[2000px]:p-4 border border-border dark:border-border">
                      <p className="text-sm min-[2000px]:text-base whitespace-pre-wrap leading-relaxed text-foreground dark:text-white">
                        {booking.remarks}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-6 min-[2000px]:py-8">
                      <MessageSquare className="w-10 h-10 min-[2000px]:w-12 min-[2000px]:h-12 text-muted-foreground dark:text-muted-foreground mx-auto mb-2 opacity-30" />
                      <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground mb-1">
                        No remarks added yet
                      </p>
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground mb-3">
                        Add notes or special instructions for this booking
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setRemarksText("");
                          setShowRemarksModal(true);
                        }}
                        className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                      >
                        <Plus className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                        Add Remarks
                      </Button>
                    </div>
                  )}
                </div>

                {/* LR */}
                {booking.lrNumber && (
                  <div className="bg-accent dark:bg-primary/10 rounded-lg p-3 min-[2000px]:p-4 border border-primary/30 dark:border-primary/40">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-primary dark:text-primary" />
                      <h3 className="font-semibold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                        Lorry Receipt
                      </h3>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-sm min-[2000px]:text-base text-foreground dark:text-white">
                          {booking.lrNumber}
                        </p>
                        <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                          {booking.lrDate && formatDate(booking.lrDate)}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                      >
                        Download
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Vehicle Assignment Modal */}
      <EnhancedVehicleAssignmentModal
        isOpen={showVehicleAssignModal}
        onClose={() => setShowVehicleAssignModal(false)}
        onAssign={() => {
          loadBookingDetails();
          onUpdate?.();
          setShowVehicleAssignModal(false);
          toast({
            title: "✅ Vehicle Assigned",
            description: "Vehicle assigned successfully",
          });
        }}
        bookingId={booking?.id || ""}
      />

      {/* Remarks Modal */}
      <Sheet open={showRemarksModal} onOpenChange={setShowRemarksModal}>
        <SheetContent className="w-full sm:max-w-md min-[2000px]:max-w-lg bg-card border-l border-border dark:border-border">
          <SheetHeader className="border-b border-border dark:border-border pb-4 min-[2000px]:pb-5">
            <SheetTitle className="flex items-center gap-2 text-foreground dark:text-white">
              <MessageSquare className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-orange-600" />
              <span className="text-base min-[2000px]:text-lg">
                {booking?.remarks ? "Edit Remarks" : "Add Remarks"}
              </span>
            </SheetTitle>
            <SheetDescription className="text-muted-foreground dark:text-muted-foreground text-sm min-[2000px]:text-base">
              Add special notes or instructions for this booking
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 min-[2000px]:space-y-5 py-6 min-[2000px]:py-8">
            <div>
              <Label className="text-sm min-[2000px]:text-base font-medium mb-2 block text-foreground dark:text-white">
                Remarks / Notes
              </Label>
              <Textarea
                value={remarksText}
                onChange={(e) => setRemarksText(e.target.value)}
                placeholder="Enter any special instructions, notes, or important details..."
                className="min-h-[200px] min-[2000px]:min-h-[240px] resize-none text-sm min-[2000px]:text-base border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                maxLength={500}
              />
              <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                {remarksText.length}/500 characters
              </p>
            </div>

            <div className="p-3 min-[2000px]:p-4 bg-accent dark:bg-primary/10 rounded-lg border border-primary/20 dark:border-primary/30">
              <p className="text-xs min-[2000px]:text-sm font-semibold mb-2 text-foreground dark:text-white">
                💡 Examples:
              </p>
              <ul className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground space-y-1">
                <li>• Customer requested priority delivery</li>
                <li>• Fragile items - handle with care</li>
                <li>• Vehicle delayed due to weather</li>
                <li>• Contact consignee before delivery</li>
              </ul>
            </div>

            <div className="flex justify-end gap-2 min-[2000px]:gap-3 pt-4 min-[2000px]:pt-5 border-t border-border dark:border-border">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRemarksModal(false);
                  setRemarksText("");
                }}
                className="h-9 min-[2000px]:h-10 text-sm min-[2000px]:text-base border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveRemarks}
                disabled={!remarksText.trim() && !booking?.remarks}
                className="h-9 min-[2000px]:h-10 text-sm min-[2000px]:text-base bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium disabled:opacity-50"
              >
                <Save className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                Save Remarks
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
