// Replace entire ConfirmActionModal.tsx with this:

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle, Truck } from "lucide-react";

interface Consignment {
  id: string;
  consignment_id: string;
  booking_id: string;
  status: string;
  booking?: {
    booking_id: string;
    consignor_name: string;
    consignee_name: string;
    material_description: string;
  };
  // Legacy support
  shipper?: string;
  consignee?: string;
  bookingId?: string;
}

interface ConfirmActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  consignment: Consignment | null;
  actionType: "transit" | "delivered" | null;
}

export const ConfirmActionModal = ({
  isOpen,
  onClose,
  onConfirm,
  consignment,
  actionType
}: ConfirmActionModalProps) => {
  if (!consignment || !actionType) return null;

  const actionConfig = {
    transit: {
      title: "Mark as In Transit",
      description: "This will move the consignment from warehouse inventory to in-transit status.",
      icon: Truck,
      iconColor: "text-info",
      confirmText: "Mark In Transit",
      warning: "This action will remove the item from warehouse stock and update its tracking status."
    },
    delivered: {
      title: "Mark as Delivered",
      description: "This will mark the consignment as delivered and archive it from active inventory.",
      icon: CheckCircle,
      iconColor: "text-success",
      confirmText: "Mark Delivered",
      warning: "This action is final and will permanently remove the item from warehouse operations."
    }
  };

  const config = actionConfig[actionType];
  const IconComponent = config.icon;

  // Handle both new and legacy data formats
  const consignmentId = consignment.consignment_id || consignment.id;
  const bookingId = consignment.booking?.booking_id || consignment.bookingId || consignment.booking_id;
  const shipper = consignment.booking?.consignor_name || consignment.shipper;
  const consignee = consignment.booking?.consignee_name || consignment.consignee;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconComponent className={`w-5 h-5 ${config.iconColor}`} />
            {config.title}
          </DialogTitle>
          <DialogDescription>
            {config.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Consignment Details */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-3">Consignment Details</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consignment ID:</span>
                <span className="font-medium">{consignmentId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking ID:</span>
                <span className="font-medium">{bookingId}</span>
              </div>
              {shipper && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipper:</span>
                  <span>{shipper}</span>
                </div>
              )}
              {consignee && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consignee:</span>
                  <span>{consignee}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="outline">{consignment.status.replace('_', ' ')}</Badge>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg text-black">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm">
              {config.warning}
            </p>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onConfirm} className="gap-2">
              <IconComponent className="w-4 h-4" />
              {config.confirmText}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};