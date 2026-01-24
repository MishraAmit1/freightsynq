// src/components/ConfirmUnassignModal.tsx
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
import { Truck, AlertTriangle, Loader2 } from "lucide-react";
import { useState } from "react";

interface ConfirmUnassignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  vehicleNumber?: string;
  driverName?: string;
  bookingId?: string;
}

export const ConfirmUnassignModal = ({
  isOpen,
  onClose,
  onConfirm,
  vehicleNumber,
  driverName,
  bookingId,
}: ConfirmUnassignModalProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onClose();
    } catch (error) {
      console.error("Error unassigning vehicle:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="sm:max-w-[425px] bg-card border-border z-[999]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            </div>
            <AlertDialogTitle className="text-lg font-semibold text-foreground dark:text-white">
              Unassign Vehicle?
            </AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-muted-foreground dark:text-muted-foreground text-sm leading-relaxed">
            Are you sure you want to unassign the vehicle from this booking?
            This action will:
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="my-4 space-y-3">
          {/* Vehicle Info Card */}
          {vehicleNumber && (
            <div className="bg-muted dark:bg-secondary/50 rounded-lg p-3 border border-border dark:border-border">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-lg">
                  <Truck className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground dark:text-white">
                    {vehicleNumber}
                  </p>
                  {driverName && (
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                      Driver: {driverName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Consequences List */}
          <ul className="space-y-2 text-sm">
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-muted-foreground dark:text-muted-foreground">
                Remove the vehicle and driver assignment from this booking
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-muted-foreground dark:text-muted-foreground">
                Stop live tracking for this booking
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-muted-foreground dark:text-muted-foreground">
                The vehicle will become available for other bookings
              </span>
            </li>
          </ul>

          {/* Booking ID Reference */}
          {bookingId && (
            <p className="text-xs text-muted-foreground dark:text-muted-foreground bg-accent dark:bg-primary/10 px-3 py-2 rounded-md border border-primary/20 dark:border-primary/30">
              <span className="font-medium">Booking:</span> {bookingId}
            </p>
          )}
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-2">
          <AlertDialogCancel
            disabled={isLoading}
            className="h-10 px-4 text-sm border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleConfirm();
            }}
            disabled={isLoading}
            className="h-10 px-4 text-sm bg-red-600 hover:bg-red-700 active:bg-red-800 text-white font-medium"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Unassigning...
              </>
            ) : (
              <>
                <Truck className="w-4 h-4 mr-2" />
                Yes, Unassign
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
