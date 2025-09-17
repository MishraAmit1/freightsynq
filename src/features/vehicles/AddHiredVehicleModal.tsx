import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Save, X, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface VehicleFormData {
  vehicleNumber: string;
  vehicleType: string;
  capacity: string;
  // ❌ REMOVED: brokerId from interface
  ratePerTrip?: string;
}

interface AddHiredVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicleData: VehicleFormData & { brokerId: string }) => void; // brokerId will be added automatically
  selectedBrokerId: string; // 🔥 NEW: Pass selected broker from main modal
  selectedBrokerName?: string; // 🔥 NEW: Optional broker name for display
}

export const AddHiredVehicleModal = ({
  isOpen,
  onClose,
  onSave,
  selectedBrokerId,
  selectedBrokerName
}: AddHiredVehicleModalProps) => {
  const { toast } = useToast();
  const [vehicleData, setVehicleData] = useState<VehicleFormData>({
    vehicleNumber: "",
    vehicleType: "",
    capacity: "",
    // ❌ REMOVED: brokerId: "",
    ratePerTrip: ""
  });

  const vehicleTypes = [
    "Truck - 16ft",
    "Truck - 20ft",
    "Truck - 24ft",
    "Container - 20ft",
    "Container - 40ft",
    "Trailer - 53ft",
    "Mini Truck",
    "Pickup Truck",
    "Flatbed Truck"
  ];

  const capacities = [
    "1 ton",
    "2 tons",
    "5 tons",
    "8 tons",
    "12 tons",
    "15 tons",
    "20 tons",
    "25 tons",
    "30 tons"
  ];

  const handleSubmit = () => {
    // Validation - ONLY vehicle details
    if (!vehicleData.vehicleNumber.trim() || !vehicleData.vehicleType || !vehicleData.capacity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all vehicle details",
        variant: "destructive"
      });
      return;
    }

    // ❌ REMOVED: Broker validation (since it's passed from parent)

    // Pass vehicle data + selectedBrokerId from parent
    onSave({
      ...vehicleData,
      brokerId: selectedBrokerId // 🔥 Use broker from main modal
    });

    // Reset form
    setVehicleData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: "",
      ratePerTrip: ""
    });

    onClose();
  };

  const handleClose = () => {
    setVehicleData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: "",
      ratePerTrip: ""
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Add Hired Vehicle
            {selectedBrokerName && (
              <span className="text-sm text-muted-foreground">
                • {selectedBrokerName}
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vehicle Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vehicle Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
                <Input
                  id="vehicleNumber"
                  value={vehicleData.vehicleNumber}
                  onChange={(e) => setVehicleData({ ...vehicleData, vehicleNumber: e.target.value.toUpperCase() })}
                  placeholder="GJ-01-AB-1234"
                />
              </div>

              <div>
                <Label htmlFor="vehicleType">Vehicle Type *</Label>
                <Select
                  value={vehicleData.vehicleType}
                  onValueChange={(value) => setVehicleData({ ...vehicleData, vehicleType: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="capacity">Capacity *</Label>
                <Select
                  value={vehicleData.capacity}
                  onValueChange={(value) => setVehicleData({ ...vehicleData, capacity: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    {capacities.map((capacity) => (
                      <SelectItem key={capacity} value={capacity}>{capacity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="ratePerTrip">Rate per Trip (Optional)</Label>
                <Input
                  id="ratePerTrip"
                  type="number"
                  value={vehicleData.ratePerTrip}
                  onChange={(e) => setVehicleData({ ...vehicleData, ratePerTrip: e.target.value })}
                  placeholder="25000"
                />
              </div>
            </div>
          </div>

          {/* ❌ COMPLETELY REMOVED: Broker Selection Section */}

          {/* Document Upload (Optional) */}
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Upload Vehicle RC & Agreement (Optional)
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              Choose Files
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Add Hired Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};