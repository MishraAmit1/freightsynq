import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Truck, User, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { AssignedVehicle, mockVehicles, mockDrivers, mockBrokers, Vehicle } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface EnhancedVehicleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (vehicleAssignment: AssignedVehicle) => void;
  bookingId: string;
}

export const EnhancedVehicleAssignmentModal = ({ 
  isOpen, 
  onClose, 
  onAssign, 
  bookingId 
}: EnhancedVehicleAssignmentModalProps) => {
  const { toast } = useToast();
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("owned");
  
  // Hired vehicle form data
  const [hiredVehicleData, setHiredVehicleData] = useState({
    vehicleNumber: "",
    vehicleType: "",
    capacity: "",
    brokerId: "",
    driverName: "",
    driverPhone: ""
  });

  // Filter available verified vehicles
  const availableVehicles = mockVehicles.filter(v => 
    v.status === "AVAILABLE" && v.isVerified && v.isOwned
  );

  const availableHiredVehicles = mockVehicles.filter(v => 
    v.status === "AVAILABLE" && v.isVerified && !v.isOwned
  );

  const handleAssignOwned = async () => {
    if (!selectedVehicleId || !selectedDriverId) {
      toast({
        title: "Selection Required",
        description: "Please select both vehicle and driver",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);
    
    const selectedVehicle = availableVehicles.find(v => v.id === selectedVehicleId);
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

      setTimeout(() => {
        onAssign(assignment);
        setIsLoading(false);
        resetForm();
        onClose();
      }, 1000);
    }
  };

  const handleAssignHired = async () => {
    if (!hiredVehicleData.vehicleNumber || !hiredVehicleData.brokerId || 
        !hiredVehicleData.driverName || !hiredVehicleData.driverPhone) {
      toast({
        title: "Information Required",
        description: "Please fill in all hired vehicle details",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    const assignment: AssignedVehicle = {
      id: `HIRED_${Date.now()}`,
      vehicleNumber: hiredVehicleData.vehicleNumber,
      vehicleType: hiredVehicleData.vehicleType,
      capacity: hiredVehicleData.capacity,
      driver: {
        id: `HIRED_DRIVER_${Date.now()}`,
        name: hiredVehicleData.driverName,
        phone: hiredVehicleData.driverPhone,
      }
    };

    setTimeout(() => {
      onAssign(assignment);
      setIsLoading(false);
      resetForm();
      onClose();
    }, 1000);
  };

  const resetForm = () => {
    setSelectedVehicleId("");
    setSelectedDriverId("");
    setHiredVehicleData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: "",
      brokerId: "",
      driverName: "",
      driverPhone: ""
    });
    setActiveTab("owned");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Assign Vehicle - {bookingId}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="owned" className="flex items-center gap-2">
              <Truck className="w-4 h-4" />
              Owned Vehicles ({availableVehicles.length})
            </TabsTrigger>
            <TabsTrigger value="hired" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Hire Vehicle
            </TabsTrigger>
          </TabsList>

          <TabsContent value="owned" className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="vehicle">Select Vehicle</Label>
              <Select value={selectedVehicleId} onValueChange={setSelectedVehicleId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an available vehicle..." />
                </SelectTrigger>
                <SelectContent>
                  {availableVehicles.map((vehicle) => (
                    <SelectItem key={vehicle.id} value={vehicle.id}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{vehicle.vehicleNumber}</span>
                          <span className="text-sm text-muted-foreground">
                            {vehicle.vehicleType} • {vehicle.capacity}
                          </span>
                        </div>
                        <Badge variant="default" className="bg-success text-success-foreground ml-2">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableVehicles.length === 0 && (
                <p className="text-sm text-muted-foreground">No verified vehicles available</p>
              )}
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
                            {driver.phone} • License: {driver.licenseNumber}
                          </span>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </TabsContent>

          <TabsContent value="hired" className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hiredVehicleNumber">Vehicle Number *</Label>
                <Input
                  id="hiredVehicleNumber"
                  value={hiredVehicleData.vehicleNumber}
                  onChange={(e) => setHiredVehicleData({
                    ...hiredVehicleData, 
                    vehicleNumber: e.target.value.toUpperCase()
                  })}
                  placeholder="GJ-01-AB-1234"
                />
              </div>
              <div>
                <Label htmlFor="hiredVehicleType">Vehicle Type</Label>
                <Input
                  id="hiredVehicleType"
                  value={hiredVehicleData.vehicleType}
                  onChange={(e) => setHiredVehicleData({
                    ...hiredVehicleData, 
                    vehicleType: e.target.value
                  })}
                  placeholder="Truck - 20ft"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hiredCapacity">Capacity</Label>
                <Input
                  id="hiredCapacity"
                  value={hiredVehicleData.capacity}
                  onChange={(e) => setHiredVehicleData({
                    ...hiredVehicleData, 
                    capacity: e.target.value
                  })}
                  placeholder="15 tons"
                />
              </div>
              <div>
                <Label htmlFor="broker">Broker *</Label>
                <Select 
                  value={hiredVehicleData.brokerId} 
                  onValueChange={(value) => setHiredVehicleData({
                    ...hiredVehicleData, 
                    brokerId: value
                  })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select broker" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockBrokers.map((broker) => (
                      <SelectItem key={broker.id} value={broker.id}>
                        <div className="flex flex-col text-left">
                          <span className="font-medium">{broker.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {broker.contactPerson}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="hiredDriverName">Driver Name *</Label>
                <Input
                  id="hiredDriverName"
                  value={hiredVehicleData.driverName}
                  onChange={(e) => setHiredVehicleData({
                    ...hiredVehicleData, 
                    driverName: e.target.value
                  })}
                  placeholder="Driver full name"
                />
              </div>
              <div>
                <Label htmlFor="hiredDriverPhone">Driver Phone *</Label>
                <Input
                  id="hiredDriverPhone"
                  value={hiredVehicleData.driverPhone}
                  onChange={(e) => setHiredVehicleData({
                    ...hiredVehicleData, 
                    driverPhone: e.target.value
                  })}
                  placeholder="+91-9876543210"
                />
              </div>
            </div>

            <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
              <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground">
                Upload Agreement & Vehicle Documents
              </p>
              <Button variant="outline" size="sm" className="mt-2">
                Choose Files
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          {activeTab === "owned" ? (
            <Button 
              onClick={handleAssignOwned}
              disabled={!selectedVehicleId || !selectedDriverId || isLoading}
            >
              {isLoading ? "Assigning..." : "Assign Vehicle"}
            </Button>
          ) : (
            <Button 
              onClick={handleAssignHired}
              disabled={isLoading}
            >
              {isLoading ? "Adding..." : "Hire & Assign"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};