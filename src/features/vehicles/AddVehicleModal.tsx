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
}

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicleData: VehicleFormData) => void;
}

export const AddVehicleModal = ({ isOpen, onClose, onSave }: AddVehicleModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<VehicleFormData>({
    vehicleNumber: "",
    vehicleType: "",
    capacity: ""
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
    if (!formData.vehicleNumber.trim() || !formData.vehicleType || !formData.capacity) {
      toast({
        title: "Validation Error", 
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    onSave(formData);
    
    // Reset form
    setFormData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: ""
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Add Owned Vehicle
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="vehicleNumber">Vehicle Number *</Label>
            <Input
              id="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={(e) => setFormData({ ...formData, vehicleNumber: e.target.value.toUpperCase() })}
              placeholder="GJ-01-AB-1234"
            />
          </div>

          <div>
            <Label htmlFor="vehicleType">Vehicle Type *</Label>
            <Select 
              value={formData.vehicleType} 
              onValueChange={(value) => setFormData({ ...formData, vehicleType: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select vehicle type" />
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
              value={formData.capacity} 
              onValueChange={(value) => setFormData({ ...formData, capacity: value })}
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

          <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
            <Upload className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">
              Upload RC, Insurance & Driver's License
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
            Add Vehicle
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};