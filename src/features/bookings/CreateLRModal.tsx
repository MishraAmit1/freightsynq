import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Save, X } from "lucide-react";
import { mockVehicles, Booking } from "@/lib/mockData";
import { format } from "date-fns";

interface CreateLRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (lrData: LRData) => void;
  booking: Booking | null;
  nextLRNumber: number;
}

export interface LRData {
  lrNumber: string;
  lrDate: string;
  vehicleAssigned?: string;
  materialDescription: string;
}

export const CreateLRModal = ({
  isOpen,
  onClose,
  onSave,
  booking,
  nextLRNumber,
}: CreateLRModalProps) => {
  const [lrData, setLrData] = useState<LRData>({
    lrNumber: "",
    lrDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    vehicleAssigned: "",
    materialDescription: "",
  });

  useEffect(() => {
    if (booking) {
      setLrData({
        lrNumber: `LR${nextLRNumber.toString().padStart(4, '0')}`,
        lrDate: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
        vehicleAssigned: booking.assignedVehicle?.vehicleNumber || "",
        materialDescription: booking.materialDescription || "",
      });
    }
  }, [booking, nextLRNumber]);

  const handleSave = () => {
    onSave(lrData);
    onClose();
  };

  if (!booking) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-primary" />
            Create Lorry Receipt (LR)
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Auto-filled (Read-Only) Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bookingId">Booking ID</Label>
              <Input
                id="bookingId"
                value={booking.bookingId}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="lrNumber">LR Number</Label>
              <Input
                id="lrNumber"
                value={lrData.lrNumber}
                onChange={(e) => setLrData({ ...lrData, lrNumber: e.target.value })}
                placeholder="Auto-generated or enter manually"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consignor">Consignor Name</Label>
              <Input
                id="consignor"
                value={booking.consignorName}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="consignee">Consignee Name</Label>
              <Input
                id="consignee"
                value={booking.consigneeName}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from">Pickup Location</Label>
              <Input
                id="from"
                value={booking.fromLocation}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="to">Drop Location</Label>
              <Input
                id="to"
                value={booking.toLocation}
                readOnly
                className="bg-muted"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="packages">Number of Packages/Weight</Label>
              <Input
                id="packages"
                value={`${booking.cargoUnits} units`}
                readOnly
                className="bg-muted"
              />
            </div>
            <div>
              <Label htmlFor="lrDate">Date & Time</Label>
              <Input
                id="lrDate"
                type="datetime-local"
                value={lrData.lrDate}
                onChange={(e) => setLrData({ ...lrData, lrDate: e.target.value })}
              />
            </div>
          </div>

          {/* Editable Fields */}
          <div>
            <Label htmlFor="vehicle">Vehicle Assigned</Label>
            {booking.assignedVehicle ? (
              <Input
                id="vehicle"
                value={booking.assignedVehicle.vehicleNumber}
                readOnly
                className="bg-muted"
              />
            ) : (
              <Select
                value={lrData.vehicleAssigned}
                onValueChange={(value) => setLrData({ ...lrData, vehicleAssigned: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a vehicle (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No Vehicle</SelectItem>
                  {mockVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.vehicleNumber}>
                      {vehicle.vehicleNumber} - {vehicle.vehicleType} ({vehicle.capacity})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div>
            <Label htmlFor="material">Material Description</Label>
            <Textarea
              id="material"
              value={lrData.materialDescription}
              onChange={(e) => setLrData({ ...lrData, materialDescription: e.target.value })}
              rows={3}
              placeholder="Enter material description..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="w-4 h-4 mr-2" />
            Save LR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};