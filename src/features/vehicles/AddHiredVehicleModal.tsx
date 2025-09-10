import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Save, X, Upload } from "lucide-react";
import { mockBrokers } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface VehicleFormData {
  vehicleNumber: string;
  vehicleType: string;
  capacity: string;
}

interface BrokerFormData {
  id?: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
}

interface AddHiredVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicleData: VehicleFormData, brokerData: BrokerFormData) => void;
}

export const AddHiredVehicleModal = ({ isOpen, onClose, onSave }: AddHiredVehicleModalProps) => {
  const { toast } = useToast();
  const [vehicleData, setVehicleData] = useState<VehicleFormData>({
    vehicleNumber: "",
    vehicleType: "",
    capacity: ""
  });
  
  const [brokerData, setBrokerData] = useState<BrokerFormData>({
    name: "",
    contactPerson: "",
    phone: "",
    email: ""
  });

  const [selectedBrokerId, setSelectedBrokerId] = useState("");
  const [brokerTab, setBrokerTab] = useState("existing");

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
    if (!vehicleData.vehicleNumber.trim() || !vehicleData.vehicleType || !vehicleData.capacity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all vehicle details",
        variant: "destructive"
      });
      return;
    }

    let finalBrokerData: BrokerFormData;

    if (brokerTab === "existing") {
      const selectedBroker = mockBrokers.find(b => b.id === selectedBrokerId);
      if (!selectedBroker) {
        toast({
          title: "Validation Error",
          description: "Please select a broker",
          variant: "destructive"
        });
        return;
      }
      finalBrokerData = selectedBroker;
    } else {
      if (!brokerData.name.trim() || !brokerData.contactPerson.trim() || !brokerData.phone.trim()) {
        toast({
          title: "Validation Error",
          description: "Please fill in all broker details",
          variant: "destructive"
        });
        return;
      }
      finalBrokerData = { ...brokerData, id: `B${Date.now()}` };
    }

    onSave(vehicleData, finalBrokerData);
    
    // Reset form
    setVehicleData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: ""
    });
    setBrokerData({
      name: "",
      contactPerson: "",
      phone: "",
      email: ""
    });
    setSelectedBrokerId("");
    setBrokerTab("existing");
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Add Hired Vehicle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Vehicle Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Vehicle Details</h3>
            <div className="grid grid-cols-3 gap-4">
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
            </div>
          </div>

          {/* Broker Details */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Broker Details</h3>
            <Tabs value={brokerTab} onValueChange={setBrokerTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="existing">Existing Broker</TabsTrigger>
                <TabsTrigger value="new">New Broker</TabsTrigger>
              </TabsList>
              
              <TabsContent value="existing">
                <div>
                  <Label htmlFor="broker">Select Broker *</Label>
                  <Select value={selectedBrokerId} onValueChange={setSelectedBrokerId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a broker" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockBrokers.map((broker) => (
                        <SelectItem key={broker.id} value={broker.id}>
                          <div className="flex flex-col text-left">
                            <span className="font-medium">{broker.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {broker.contactPerson} • {broker.phone}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </TabsContent>
              
              <TabsContent value="new">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="brokerName">Broker Name *</Label>
                    <Input
                      id="brokerName"
                      value={brokerData.name}
                      onChange={(e) => setBrokerData({ ...brokerData, name: e.target.value })}
                      placeholder="Enter broker company name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="contactPerson">Contact Person *</Label>
                    <Input
                      id="contactPerson"
                      value={brokerData.contactPerson}
                      onChange={(e) => setBrokerData({ ...brokerData, contactPerson: e.target.value })}
                      placeholder="Contact person name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={brokerData.phone}
                      onChange={(e) => setBrokerData({ ...brokerData, phone: e.target.value })}
                      placeholder="+91-9876543210"
                    />
                  </div>
                  <div>
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={brokerData.email}
                      onChange={(e) => setBrokerData({ ...brokerData, email: e.target.value })}
                      placeholder="broker@company.com"
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Document Upload */}
          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Upload Vehicle RC, Driver's License & Agreement
            </p>
            <Button variant="outline" size="sm" className="mt-2">
              Choose Files
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
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