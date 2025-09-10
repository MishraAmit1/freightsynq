import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Truck, User } from "lucide-react";
import { AssignedVehicle, mockVehicles, mockDrivers, VehicleOption, DriverOption } from "@/lib/mockData";

interface VehicleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (vehicleAssignment: AssignedVehicle) => void;
  bookingId: string;
}

export const VehicleAssignmentModal = ({ 
  isOpen, 
  onClose, 
  onAssign, 
  bookingId 
}: VehicleAssignmentModalProps) => {
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);

  const handleAssign = async () => {
    if (!selectedVehicleId || !selectedDriverId) return;

    setIsLoading(true);
    
    const selectedVehicle = mockVehicles.find(v => v.id === selectedVehicleId);
    const selectedDriver = mockDrivers.find(d => d.id === selectedDriverId);

    if (selectedVehicle && selectedDriver) {
      const assignment: AssignedVehicle = {
        id: selectedVehicle.id,
        vehicleNumber: selectedVehicle.vehicleNumber,
        vehicleType: selectedVehicle.vehicleType,
        capacity: selectedVehicle.capacity,
        driver: {
          id: selectedDriver.id,
          name: selectedDriver.name,
          phone: selectedDriver.phone,
        }
      };

      // Simulate API call
      setTimeout(() => {
        onAssign(assignment);
        setIsLoading(false);
        setSelectedVehicleId("");
        setSelectedDriverId("");
        onClose();
      }, 1000);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Assign Vehicle - {bookingId}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="vehicle">Select Vehicle</Label>
            <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a vehicle..." />
              </SelectTrigger>
              <SelectContent>
                {mockVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{vehicle.vehicleNumber}</span>
                      <span className="text-sm text-muted-foreground">
                        {vehicle.vehicleType} • {vehicle.capacity}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="driver">Select Driver</Label>
            <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a driver..." />
              </SelectTrigger>
              <SelectContent>
                {mockDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{driver.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {driver.phone}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign}
            disabled={!selectedVehicleId || !selectedDriverId || isLoading}
          >
            {isLoading ? "Assigning..." : "Assign Vehicle"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};