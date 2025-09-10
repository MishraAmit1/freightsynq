import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Truck, User, Phone, Mail, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AssignmentDrawerProps {
  open: boolean;
  onClose: () => void;
  bookingId: string;
}

const mockTransporters = [
  { id: "t_123", name: "ABC Logistics Ltd", rating: 4.5 },
  { id: "t_124", name: "XYZ Transport Co", rating: 4.2 },
  { id: "t_125", name: "Express Freight", rating: 4.8 },
];

const mockVehicles = [
  { id: "v_456", number: "GJ-01-AB-1234", type: "Truck", capacity: "32 Tons" },
  { id: "v_457", number: "GJ-02-CD-5678", type: "Truck", capacity: "25 Tons" },
  { id: "v_458", number: "MH-12-EF-9012", type: "Trailer", capacity: "40 Tons" },
];

const mockDrivers = [
  { id: "d_789", name: "Rajesh Kumar", phone: "+91 98765 43210", experience: "8 years" },
  { id: "d_790", name: "Amit Singh", phone: "+91 98765 43211", experience: "12 years" },
  { id: "d_791", name: "Suresh Patel", phone: "+91 98765 43212", experience: "5 years" },
];

export const AssignmentDrawer = ({ open, onClose, bookingId }: AssignmentDrawerProps) => {
  const [selectedTransporter, setSelectedTransporter] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [notificationChannels, setNotificationChannels] = useState<string[]>(["WHATSAPP"]);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  const handleChannelChange = (channel: string, checked: boolean) => {
    if (checked) {
      setNotificationChannels([...notificationChannels, channel]);
    } else {
      setNotificationChannels(notificationChannels.filter(c => c !== channel));
    }
  };

  const handleAssign = async () => {
    if (!selectedTransporter || !selectedVehicle || !selectedDriver) {
      toast({
        title: "Missing Information",
        description: "Please select transporter, vehicle, and driver.",
        variant: "destructive",
      });
      return;
    }

    setIsAssigning(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    toast({
      title: "Assignment Successful",
      description: "Transport has been assigned and notifications sent.",
    });
    
    setIsAssigning(false);
    onClose();
  };

  const selectedTransporterData = mockTransporters.find(t => t.id === selectedTransporter);
  const selectedVehicleData = mockVehicles.find(v => v.id === selectedVehicle);
  const selectedDriverData = mockDrivers.find(d => d.id === selectedDriver);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Assign Transport</SheetTitle>
          <SheetDescription>
            Assign transporter, vehicle, and driver for booking {bookingId}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Transporter Selection */}
          <div className="space-y-3">
            <Label htmlFor="transporter">Select Transporter</Label>
            <Select value={selectedTransporter} onValueChange={setSelectedTransporter}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a transporter" />
              </SelectTrigger>
              <SelectContent>
                {mockTransporters.map((transporter) => (
                  <SelectItem key={transporter.id} value={transporter.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{transporter.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        ⭐ {transporter.rating}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTransporterData && (
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    <Truck className="w-8 h-8 text-primary bg-primary/10 p-2 rounded-lg" />
                    <div>
                      <p className="font-medium">{selectedTransporterData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Rating: {selectedTransporterData.rating}/5.0
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-3">
            <Label htmlFor="vehicle">Select Vehicle</Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {mockVehicles.map((vehicle) => (
                  <SelectItem key={vehicle.id} value={vehicle.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{vehicle.number}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {vehicle.capacity}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVehicleData && (
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    <Truck className="w-8 h-8 text-info bg-info/10 p-2 rounded-lg" />
                    <div>
                      <p className="font-medium">{selectedVehicleData.number}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedVehicleData.type} • {selectedVehicleData.capacity}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Driver Selection */}
          <div className="space-y-3">
            <Label htmlFor="driver">Select Driver</Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a driver" />
              </SelectTrigger>
              <SelectContent>
                {mockDrivers.map((driver) => (
                  <SelectItem key={driver.id} value={driver.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{driver.name}</span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {driver.experience}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDriverData && (
              <Card className="border-border">
                <CardContent className="pt-4">
                  <div className="flex items-center space-x-3">
                    <User className="w-8 h-8 text-success bg-success/10 p-2 rounded-lg" />
                    <div>
                      <p className="font-medium">{selectedDriverData.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedDriverData.phone} • {selectedDriverData.experience}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notification Channels */}
          <div className="space-y-3">
            <Label>Notification Channels</Label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="whatsapp"
                  checked={notificationChannels.includes("WHATSAPP")}
                  onCheckedChange={(checked) => handleChannelChange("WHATSAPP", !!checked)}
                />
                <Label htmlFor="whatsapp" className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-success" />
                  <span>WhatsApp</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sms"
                  checked={notificationChannels.includes("SMS")}
                  onCheckedChange={(checked) => handleChannelChange("SMS", !!checked)}
                />
                <Label htmlFor="sms" className="flex items-center space-x-2">
                  <Phone className="w-4 h-4 text-primary" />
                  <span>SMS</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="email"
                  checked={notificationChannels.includes("EMAIL")}
                  onCheckedChange={(checked) => handleChannelChange("EMAIL", !!checked)}
                />
                <Label htmlFor="email" className="flex items-center space-x-2">
                  <Mail className="w-4 h-4 text-info" />
                  <span>Email</span>
                </Label>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={onClose} disabled={isAssigning}>
            Cancel
          </Button>
          <Button onClick={handleAssign} disabled={isAssigning}>
            {isAssigning ? "Assigning..." : "Assign & Notify"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};