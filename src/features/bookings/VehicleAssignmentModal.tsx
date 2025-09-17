import { useState, useEffect } from "react";
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
import { Truck, User, Loader2 } from "lucide-react";
import { fetchAvailableVehicles, fetchDrivers, assignVehicleToBooking } from "@/api/vehicles";
import { useToast } from "@/hooks/use-toast";

interface VehicleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (vehicleAssignment: any) => void;
  bookingId: string;
}

export const VehicleAssignmentModal = ({
  isOpen,
  onClose,
  onAssign,
  bookingId
}: VehicleAssignmentModalProps) => {
  const { toast } = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  const [vehicles, setVehicles] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setDataLoading(true);
      const [vehiclesData, driversData] = await Promise.all([
        fetchAvailableVehicles(),
        fetchDrivers()
      ]);

      setVehicles(vehiclesData);
      setDrivers(driversData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load vehicles and drivers",
        variant: "destructive"
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedVehicleId || !selectedDriverId) {
      toast({
        title: "Selection Required",
        description: "Please select both vehicle and driver",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      await assignVehicleToBooking({
        booking_id: bookingId,
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId
      });

      const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
      const selectedDriver = drivers.find(d => d.id === selectedDriverId);

      if (selectedVehicle && selectedDriver) {
        const assignment = {
          id: selectedVehicle.id,
          vehicleNumber: selectedVehicle.vehicle_number,
          vehicleType: selectedVehicle.vehicle_type,
          capacity: selectedVehicle.capacity,
          driver: {
            id: selectedDriver.id,
            name: selectedDriver.name,
            phone: selectedDriver.phone,
          }
        };

        onAssign(assignment);

        toast({
          title: "Vehicle Assigned Successfully",
          description: `Vehicle ${selectedVehicle.vehicle_number} has been assigned`,
        });

        setSelectedVehicleId("");
        setSelectedDriverId("");
        onClose();
      }
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to assign vehicle. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (dataLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
                {vehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex flex-col text-left">
                      <span className="font-medium">{vehicle.vehicle_number}</span>
                      <span className="text-sm text-muted-foreground">
                        {vehicle.vehicle_type} • {vehicle.capacity}
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
                {drivers.map((driver) => (
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
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Assigning...
              </>
            ) : (
              "Assign Vehicle"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};