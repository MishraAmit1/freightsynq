import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getProgressiveAction, BookingStage } from "@/lib/bookingStages";
import { useToast } from "@/hooks/use-toast";
import { updateBookingStatus } from "@/api/bookings";
import { cn } from "@/lib/utils";

interface ProgressiveActionButtonProps {
  booking: any;
  stage: BookingStage;
  onAction: (actionType: string) => void;
}

export const ProgressiveActionButton = ({
  booking,
  stage,
  onAction,
}: ProgressiveActionButtonProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const action = getProgressiveAction(stage, booking);

  if (!action) return null;

  const Icon = action.icon;
  const handleClick = async () => {
    setLoading(true);

    try {
      switch (action.stage) {
        case "DRAFT":
        case "LR_READY": // 🆕 ADD THIS CASE
        case "WAREHOUSE": // 🆕 ADD THIS CASE
          onAction("ASSIGN_VEHICLE");
          break;

        case "DISPATCHED":
          onAction("CREATE_LR");
          break;

        case "IN_TRANSIT":
          await updateBookingStatus(booking.id, "DELIVERED");
          toast({
            title: "✅ Marked as Delivered",
            description: "Booking has been marked as delivered",
          });
          onAction("REFRESH");
          break;

        case "DELIVERED":
          onAction("UPLOAD_POD");
          break;

        case "POD_UPLOADED":
          onAction("GENERATE_INVOICE");
          break;

        case "BILLED":
          onAction("VIEW_INVOICE");
          break;
      }
    } catch (error) {
      console.error("Action error:", error);
      toast({
        title: "❌ Error",
        description: "Failed to perform action",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={loading}
      className={cn(
        // ✅ COMPACT SIZE
        "h-7 px-2.5 text-[10px] font-medium",

        // ✅ NEUTRAL COLORS (Remove rang birangi)
        "border border-gray-300 dark:border-gray-700",
        "bg-white dark:bg-gray-900",
        "text-gray-700 dark:text-gray-300",

        // ✅ SUBTLE HOVER
        "hover:bg-gray-100 dark:hover:bg-gray-800",
        "hover:border-gray-400 dark:hover:border-gray-600",

        // ✅ DISABLED/LOADING STATE
        loading && "opacity-70 cursor-wait"
      )}
    >
      {loading ? (
        <Loader2 className="w-3 h-3 mr-1 animate-spin flex-shrink-0" />
      ) : (
        <Icon className="w-3 h-3 mr-1 flex-shrink-0" />
      )}
      <span className="truncate">{action.label}</span>
    </Button>
  );
};
