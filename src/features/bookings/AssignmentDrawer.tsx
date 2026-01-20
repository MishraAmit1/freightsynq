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
  {
    id: "v_458",
    number: "MH-12-EF-9012",
    type: "Trailer",
    capacity: "40 Tons",
  },
];

const mockDrivers = [
  {
    id: "d_789",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    experience: "8 years",
  },
  {
    id: "d_790",
    name: "Amit Singh",
    phone: "+91 98765 43211",
    experience: "12 years",
  },
  {
    id: "d_791",
    name: "Suresh Patel",
    phone: "+91 98765 43212",
    experience: "5 years",
  },
];

export const AssignmentDrawer = ({
  open,
  onClose,
  bookingId,
}: AssignmentDrawerProps) => {
  const [selectedTransporter, setSelectedTransporter] = useState("");
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [selectedDriver, setSelectedDriver] = useState("");
  const [notificationChannels, setNotificationChannels] = useState<string[]>([
    "WHATSAPP",
  ]);
  const [isAssigning, setIsAssigning] = useState(false);
  const { toast } = useToast();

  const handleChannelChange = (channel: string, checked: boolean) => {
    if (checked) {
      setNotificationChannels([...notificationChannels, channel]);
    } else {
      setNotificationChannels(
        notificationChannels.filter((c) => c !== channel),
      );
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
    await new Promise((resolve) => setTimeout(resolve, 2000));

    toast({
      title: "Assignment Successful",
      description: "Transport has been assigned and notifications sent.",
    });

    setIsAssigning(false);
    onClose();
  };

  const selectedTransporterData = mockTransporters.find(
    (t) => t.id === selectedTransporter,
  );
  const selectedVehicleData = mockVehicles.find(
    (v) => v.id === selectedVehicle,
  );
  const selectedDriverData = mockDrivers.find((d) => d.id === selectedDriver);

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg min-[2000px]:sm:max-w-xl">
        <SheetHeader className="min-[2000px]:pb-2">
          <SheetTitle className="text-lg min-[2000px]:text-xl">
            Assign Transport
          </SheetTitle>
          <SheetDescription className="text-sm min-[2000px]:text-base">
            Assign transporter, vehicle, and driver for booking {bookingId}
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 min-[2000px]:py-8 space-y-6 min-[2000px]:space-y-8">
          {/* Transporter Selection */}
          <div className="space-y-3 min-[2000px]:space-y-4">
            <Label
              htmlFor="transporter"
              className="text-sm min-[2000px]:text-base"
            >
              Select Transporter
            </Label>
            <Select
              value={selectedTransporter}
              onValueChange={setSelectedTransporter}
            >
              <SelectTrigger className="h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base">
                <SelectValue placeholder="Choose a transporter" />
              </SelectTrigger>
              <SelectContent>
                {mockTransporters.map((transporter) => (
                  <SelectItem
                    key={transporter.id}
                    value={transporter.id}
                    className="py-2 min-[2000px]:py-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm min-[2000px]:text-base">
                        {transporter.name}
                      </span>
                      <span className="text-sm min-[2000px]:text-base text-muted-foreground ml-2">
                        ⭐ {transporter.rating}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedTransporterData && (
              <Card className="border-border">
                <CardContent className="pt-4 min-[2000px]:pt-5">
                  <div className="flex items-center space-x-3 min-[2000px]:space-x-4">
                    <Truck className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-primary bg-primary/10 p-2 min-[2000px]:p-2.5 rounded-lg" />
                    <div>
                      <p className="font-medium text-sm min-[2000px]:text-base">
                        {selectedTransporterData.name}
                      </p>
                      <p className="text-sm min-[2000px]:text-base text-muted-foreground">
                        Rating: {selectedTransporterData.rating}/5.0
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Vehicle Selection */}
          <div className="space-y-3 min-[2000px]:space-y-4">
            <Label htmlFor="vehicle" className="text-sm min-[2000px]:text-base">
              Select Vehicle
            </Label>
            <Select value={selectedVehicle} onValueChange={setSelectedVehicle}>
              <SelectTrigger className="h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base">
                <SelectValue placeholder="Choose a vehicle" />
              </SelectTrigger>
              <SelectContent>
                {mockVehicles.map((vehicle) => (
                  <SelectItem
                    key={vehicle.id}
                    value={vehicle.id}
                    className="py-2 min-[2000px]:py-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm min-[2000px]:text-base">
                        {vehicle.number}
                      </span>
                      <span className="text-sm min-[2000px]:text-base text-muted-foreground ml-2">
                        {vehicle.capacity}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedVehicleData && (
              <Card className="border-border">
                <CardContent className="pt-4 min-[2000px]:pt-5">
                  <div className="flex items-center space-x-3 min-[2000px]:space-x-4">
                    <Truck className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-info bg-info/10 p-2 min-[2000px]:p-2.5 rounded-lg" />
                    <div>
                      <p className="font-medium text-sm min-[2000px]:text-base">
                        {selectedVehicleData.number}
                      </p>
                      <p className="text-sm min-[2000px]:text-base text-muted-foreground">
                        {selectedVehicleData.type} •{" "}
                        {selectedVehicleData.capacity}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Driver Selection */}
          <div className="space-y-3 min-[2000px]:space-y-4">
            <Label htmlFor="driver" className="text-sm min-[2000px]:text-base">
              Select Driver
            </Label>
            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
              <SelectTrigger className="h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base">
                <SelectValue placeholder="Choose a driver" />
              </SelectTrigger>
              <SelectContent>
                {mockDrivers.map((driver) => (
                  <SelectItem
                    key={driver.id}
                    value={driver.id}
                    className="py-2 min-[2000px]:py-3"
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-sm min-[2000px]:text-base">
                        {driver.name}
                      </span>
                      <span className="text-sm min-[2000px]:text-base text-muted-foreground ml-2">
                        {driver.experience}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedDriverData && (
              <Card className="border-border">
                <CardContent className="pt-4 min-[2000px]:pt-5">
                  <div className="flex items-center space-x-3 min-[2000px]:space-x-4">
                    <User className="w-8 h-8 min-[2000px]:w-10 min-[2000px]:h-10 text-success bg-success/10 p-2 min-[2000px]:p-2.5 rounded-lg" />
                    <div>
                      <p className="font-medium text-sm min-[2000px]:text-base">
                        {selectedDriverData.name}
                      </p>
                      <p className="text-sm min-[2000px]:text-base text-muted-foreground">
                        {selectedDriverData.phone} •{" "}
                        {selectedDriverData.experience}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Notification Channels */}
          <div className="space-y-3 min-[2000px]:space-y-4">
            <Label className="text-sm min-[2000px]:text-base">
              Notification Channels
            </Label>
            <div className="space-y-3 min-[2000px]:space-y-4">
              <div className="flex items-center space-x-2 min-[2000px]:space-x-3">
                <Checkbox
                  id="whatsapp"
                  checked={notificationChannels.includes("WHATSAPP")}
                  onCheckedChange={(checked) =>
                    handleChannelChange("WHATSAPP", !!checked)
                  }
                  className="min-[2000px]:h-5 min-[2000px]:w-5"
                />
                <Label
                  htmlFor="whatsapp"
                  className="flex items-center space-x-2 min-[2000px]:space-x-3 text-sm min-[2000px]:text-base"
                >
                  <MessageSquare className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-success" />
                  <span>WhatsApp</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 min-[2000px]:space-x-3">
                <Checkbox
                  id="sms"
                  checked={notificationChannels.includes("SMS")}
                  onCheckedChange={(checked) =>
                    handleChannelChange("SMS", !!checked)
                  }
                  className="min-[2000px]:h-5 min-[2000px]:w-5"
                />
                <Label
                  htmlFor="sms"
                  className="flex items-center space-x-2 min-[2000px]:space-x-3 text-sm min-[2000px]:text-base"
                >
                  <Phone className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-primary" />
                  <span>SMS</span>
                </Label>
              </div>
              <div className="flex items-center space-x-2 min-[2000px]:space-x-3">
                <Checkbox
                  id="email"
                  checked={notificationChannels.includes("EMAIL")}
                  onCheckedChange={(checked) =>
                    handleChannelChange("EMAIL", !!checked)
                  }
                  className="min-[2000px]:h-5 min-[2000px]:w-5"
                />
                <Label
                  htmlFor="email"
                  className="flex items-center space-x-2 min-[2000px]:space-x-3 text-sm min-[2000px]:text-base"
                >
                  <Mail className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-info" />
                  <span>Email</span>
                </Label>
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="gap-2 min-[2000px]:gap-3">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isAssigning}
            className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base"
          >
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={isAssigning}
            className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base"
          >
            {isAssigning ? "Assigning..." : "Assign & Notify"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};
