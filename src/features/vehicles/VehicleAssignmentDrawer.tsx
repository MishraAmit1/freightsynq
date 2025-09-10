import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Truck, 
  User, 
  Phone, 
  Search, 
  MapPin, 
  Shield, 
  ShieldCheck 
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { mockVehicles } from "./mockVehicles";
import { Vehicle } from "./vehicles.api";

interface VehicleAssignmentDrawerProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
  bookingInfo: {
    bookingId: string;
    fromLocation: string;
    toLocation: string;
    consignorName: string;
    consigneeName: string;
  };
  onAssign: (vehicleId: string, driverId: string) => void;
}

export const VehicleAssignmentDrawer = ({ 
  open, 
  onClose, 
  bookingId, 
  bookingInfo,
  onAssign 
}: VehicleAssignmentDrawerProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  const availableVehicles = mockVehicles.filter(v => 
    v.status === 'AVAILABLE' && 
    v.verified &&
    (v.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
     v.driver?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
     v.type.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAssign = async () => {
    if (!selectedVehicle || !selectedVehicle.driver) {
      toast({
        title: "Vehicle Selection Required",
        description: "Please select a vehicle with an assigned driver.",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onAssign(selectedVehicle.id, selectedVehicle.driver.id);
      
      toast({
        title: "Vehicle Assigned Successfully",
        description: `${selectedVehicle.regNumber} assigned to ${bookingInfo.bookingId}`,
      });
      
      onClose();
    } catch (error) {
      toast({
        title: "Assignment Failed",
        description: "Failed to assign vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle>Assign Vehicle</SheetTitle>
          <SheetDescription>
            Assign a vehicle and driver to booking {bookingInfo.bookingId}
          </SheetDescription>
        </SheetHeader>

        {/* Booking Summary */}
        <div className="py-4">
          <Card className="border-border">
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Route</p>
                  <p className="font-medium">
                    {bookingInfo.fromLocation} → {bookingInfo.toLocation}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Consignor → Consignee</p>
                  <p className="font-medium">
                    {bookingInfo.consignorName} → {bookingInfo.consigneeName}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="space-y-4">
          <div>
            <Label htmlFor="search">Search Vehicles</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="search"
                placeholder="Search by vehicle number, driver name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Available Vehicles */}
          <div className="space-y-3 max-h-96 overflow-y-auto">
            <Label>Available Vehicles ({availableVehicles.length})</Label>
            {availableVehicles.length === 0 ? (
              <div className="text-center py-8">
                <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No available vehicles found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {availableVehicles.map((vehicle) => (
                  <Card 
                    key={vehicle.id}
                    className={`border-border cursor-pointer transition-all ${
                      selectedVehicle?.id === vehicle.id 
                        ? 'ring-2 ring-primary border-primary' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedVehicle(vehicle)}
                  >
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Truck className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <div className="flex items-center space-x-2">
                              <p className="font-medium">{vehicle.regNumber}</p>
                              {vehicle.verified ? (
                                <ShieldCheck className="w-4 h-4 text-success" />
                              ) : (
                                <Shield className="w-4 h-4 text-muted-foreground" />
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.type} • {vehicle.capacity}
                            </p>
                          </div>
                        </div>
                        
                        {vehicle.driver && (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-success" />
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">{vehicle.driver.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {vehicle.driver.experience}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      {vehicle.lastLocation && (
                        <div className="mt-3 pt-3 border-t border-border">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <MapPin className="w-4 h-4" />
                            <span>
                              Last seen: {vehicle.lastLocation.lat.toFixed(4)}, {vehicle.lastLocation.lng.toFixed(4)}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {vehicle.lastLocation.source}
                            </Badge>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Selected Vehicle Details */}
        {selectedVehicle && (
          <div className="space-y-3">
            <Label>Selected Vehicle & Driver</Label>
            <Card className="border-primary bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Truck className="w-8 h-8 text-primary bg-primary/10 p-2 rounded-lg" />
                    <div>
                      <p className="font-medium">{selectedVehicle.regNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVehicle.type} • {selectedVehicle.capacity}
                      </p>
                    </div>
                  </div>
                  
                  {selectedVehicle.driver && (
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-success" />
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{selectedVehicle.driver.name}</p>
                        <div className="flex items-center space-x-2">
                          <Phone className="w-3 h-3" />
                          <span className="text-sm text-muted-foreground">
                            {selectedVehicle.driver.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <SheetFooter className="pt-4">
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button 
            onClick={handleAssign} 
            disabled={!selectedVehicle || isAssigning}
          >
            {isAssigning ? "Assigning..." : "Assign Vehicle"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};