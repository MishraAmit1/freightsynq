import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Truck, User, Phone, CheckCircle } from "lucide-react";
import { mockVehicles, mockDrivers } from "@/lib/mockData";
import { type Consignment } from "@/lib/warehouseData";
import { useToast } from "@/hooks/use-toast";

interface AssignVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment | null;
}

export const AssignVehicleModal = ({ isOpen, onClose, consignment }: AssignVehicleModalProps) => {
  const { toast } = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  // Get available vehicles (not occupied)
  const availableVehicles = mockVehicles.filter(vehicle => vehicle.status === "AVAILABLE");
  const availableDrivers = mockDrivers;

  const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
  const selectedDriver = availableDrivers.find(d => d.id === selectedDriverId);

  const handleAssign = async () => {
    if (!selectedVehicleId || !selectedDriverId || !consignment) return;

    setIsAssigning(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Vehicle Assigned",
      description: `Vehicle ${selectedVehicle?.vehicleNumber} has been assigned to consignment ${consignment.id}.`,
    });
    
    setIsAssigning(false);
    resetAndClose();
  };

  const resetAndClose = () => {
    setSelectedVehicleId("");
    setSelectedDriverId("");
    onClose();
  };

  if (!consignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={resetAndClose}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Assign Vehicle to Consignment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Consignment Info */}
          <div className="p-4 bg-muted/50 rounded-lg">
            <h4 className="font-medium mb-2">Consignment Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Consignment ID:</span>
                <span className="ml-2 font-medium">{consignment.id}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Booking ID:</span>
                <span className="ml-2 font-medium">{consignment.bookingId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Shipper:</span>
                <span className="ml-2">{consignment.shipper}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Consignee:</span>
                <span className="ml-2">{consignment.consignee}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Material:</span>
                <span className="ml-2">{consignment.materialDescription}</span>
              </div>
            </div>
          </div>

          {/* Vehicle Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">Select Vehicle</label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose an available vehicle" />
              </SelectTrigger>
              <SelectContent>
                {availableVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center gap-3">
                      <Truck className="w-4 h-4" />
                      <span className="font-medium">{vehicle.vehicleNumber}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-sm">{vehicle.vehicleType} ({vehicle.capacity})</span>
                      <Badge variant="outline" className="ml-2">
                        {vehicle.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Vehicle Details */}
            {selectedVehicle && (
              <div className="mt-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedVehicle.vehicleNumber}</p>
                    <p className="text-sm text-muted-foreground">
                      {selectedVehicle.vehicleType} • Capacity: {selectedVehicle.capacity}
                    </p>
                  </div>
                  <Badge 
                    variant={selectedVehicle.isVerified ? "default" : "secondary"}
                    className="gap-1"
                  >
                    <CheckCircle className="w-3 h-3" />
                    {selectedVehicle.isVerified ? "Verified" : "Pending"}
                  </Badge>
                </div>
              </div>
            )}
          </div>

          {/* Driver Selection */}
          <div>
            <label className="text-sm font-medium mb-3 block">Select Driver</label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a driver" />
              </SelectTrigger>
              <SelectContent>
                {availableDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <div className="flex items-center gap-3">
                      <User className="w-4 h-4" />
                      <span className="font-medium">{driver.name}</span>
                      <span className="text-muted-foreground">-</span>
                      <span className="text-sm">{driver.phone}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Selected Driver Details */}
            {selectedDriver && (
              <div className="mt-3 p-3 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{selectedDriver.name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        {selectedDriver.phone}
                      </span>
                      <span>License: {selectedDriver.licenseNumber}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Available Vehicles Summary */}
          {availableVehicles.length === 0 && (
            <div className="text-center py-6 text-muted-foreground">
              <Truck className="w-8 h-8 mx-auto mb-2" />
              <p>No vehicles are currently available for assignment.</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={resetAndClose}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedVehicleId || !selectedDriverId || isAssigning}
            >
              {isAssigning ? "Assigning..." : "Assign Vehicle"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};