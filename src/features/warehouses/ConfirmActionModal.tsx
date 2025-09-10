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
import { type Consignment } from "@/lib/warehouseData";

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
                <span className="font-medium">{consignment.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Booking ID:</span>
                <span className="font-medium">{consignment.bookingId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Shipper:</span>
                <span>{consignment.shipper}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Consignee:</span>
                <span>{consignment.consignee}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Current Status:</span>
                <Badge variant="outline">{consignment.status}</Badge>
              </div>
            </div>
          </div>

          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-warning/10 border border-warning/20 rounded-lg">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <p className="text-sm text-warning-foreground">
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