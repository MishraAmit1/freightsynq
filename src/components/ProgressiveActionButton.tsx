import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { getProgressiveAction, BookingStage } from "@/lib/bookingStages";
import { useToast } from "@/hooks/use-toast";
import { updateBookingStatus } from "@/api/bookings";

interface ProgressiveActionButtonProps {
    booking: any;
    stage: BookingStage;
    onAction: (actionType: string) => void;
}

export const ProgressiveActionButton = ({
    booking,
    stage,
    onAction
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
                case 'DRAFT':
                    // Open vehicle assignment modal
                    onAction('ASSIGN_VEHICLE');
                    break;

                case 'DISPATCHED':
                    // Open LR creation modal
                    onAction('CREATE_LR');
                    break;

                case 'IN_TRANSIT':
                    // Mark as delivered
                    await updateBookingStatus(booking.id, 'DELIVERED');
                    toast({
                        title: "✅ Marked as Delivered",
                        description: "Booking has been marked as delivered",
                    });
                    onAction('REFRESH');
                    break;

                case 'DELIVERED':
                    // Open POD upload modal
                    onAction('UPLOAD_POD');
                    break;

                case 'POD_UPLOADED':
                    // Open invoice generation modal
                    onAction('GENERATE_INVOICE');
                    break;

                case 'BILLED':
                    // View invoice
                    onAction('VIEW_INVOICE');
                    break;
            }
        } catch (error) {
            console.error('Action error:', error);
            toast({
                title: "❌ Error",
                description: "Failed to perform action",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size="sm"
            onClick={handleClick}
            disabled={loading}
            className={action.color}
        >
            {loading ? (
                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
            ) : (
                <Icon className="w-3.5 h-3.5 mr-2" />
            )}
            {action.label}
        </Button>
    );
};