import { useState, useEffect } from "react";
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
import { Truck, User, Phone, CheckCircle, Loader2 } from "lucide-react";
import { fetchAvailableVehicles, fetchDrivers, assignVehicleToBooking } from "@/api/vehicles";
import { useToast } from "@/hooks/use-toast";

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: string;
  status: string;
  is_verified: boolean;
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  license_number: string;
  experience: string;
}

interface Consignment {
  id: string;
  consignment_id: string;
  booking_id: string;
  shipper?: string;
  consignee?: string;
  materialDescription?: string;
  // Add other properties as needed
}

interface AssignVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  consignment: Consignment | null;
  onAssignSuccess?: () => void;
}

export const AssignVehicleModal = ({
  isOpen,
  onClose,
  consignment,
  onAssignSuccess
}: AssignVehicleModalProps) => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isAssigning, setIsAssigning] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  const loadData = async () => {
    try {
      setLoading(true);
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
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  const handleAssign = async () => {
    if (!selectedVehicleId || !selectedDriverId || !consignment) return;

    setIsAssigning(true);

    try {
      await assignVehicleToBooking({
        booking_id: consignment.booking_id,
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId
      });

      toast({
        title: "Vehicle Assigned Successfully",
        description: `Vehicle ${selectedVehicle?.vehicle_number} has been assigned to consignment ${consignment.consignment_id}.`,
      });

      onAssignSuccess?.();
      resetAndClose();
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast({
        title: "Assignment Failed",
        description: "Failed to assign vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
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

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading vehicles and drivers...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Consignment Info */}
            <div className="p-4 bg-muted/50 rounded-lg">
              <h4 className="font-medium mb-2">Consignment Details</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Consignment ID:</span>
                  <span className="ml-2 font-medium">{consignment.consignment_id}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">Booking ID:</span>
                  <span className="ml-2 font-medium">{consignment.booking_id}</span>
                </div>
                {consignment.shipper && (
                  <div>
                    <span className="text-muted-foreground">Shipper:</span>
                    <span className="ml-2">{consignment.shipper}</span>
                  </div>
                )}
                {consignment.consignee && (
                  <div>
                    <span className="text-muted-foreground">Consignee:</span>
                    <span className="ml-2">{consignment.consignee}</span>
                  </div>
                )}
                {consignment.materialDescription && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Material:</span>
                    <span className="ml-2">{consignment.materialDescription}</span>
                  </div>
                )}
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
                  {vehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center gap-3">
                        <Truck className="w-4 h-4" />
                        <span className="font-medium">{vehicle.vehicle_number}</span>
                        <span className="text-muted-foreground">-</span>
                        <span className="text-sm">{vehicle.vehicle_type} ({vehicle.capacity})</span>
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
                      <p className="font-medium">{selectedVehicle.vehicle_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVehicle.vehicle_type} • Capacity: {selectedVehicle.capacity}
                      </p>
                    </div>
                    <Badge
                      variant={selectedVehicle.is_verified ? "default" : "secondary"}
                      className="gap-1"
                    >
                      <CheckCircle className="w-3 h-3" />
                      {selectedVehicle.is_verified ? "Verified" : "Pending"}
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
                  {drivers.map((driver) => (
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
                        <span>License: {selectedDriver.license_number}</span>
                        <span>{selectedDriver.experience}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* No Vehicles Available */}
            {vehicles.length === 0 && !loading && (
              <div className="text-center py-6 text-muted-foreground">
                <Truck className="w-8 h-8 mx-auto mb-2" />
                <p>No vehicles are currently available for assignment.</p>
                <p className="text-sm mt-1">Please check vehicle status or add more vehicles.</p>
              </div>
            )}

            {/* No Drivers Available */}
            {drivers.length === 0 && !loading && (
              <div className="text-center py-6 text-muted-foreground">
                <User className="w-8 h-8 mx-auto mb-2" />
                <p>No drivers are currently available.</p>
                <p className="text-sm mt-1">Please add drivers to the system.</p>
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
                disabled={!selectedVehicleId || !selectedDriverId || isAssigning || vehicles.length === 0 || drivers.length === 0}
              >
                {isAssigning ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Assigning...
                  </>
                ) : (
                  "Assign Vehicle"
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};