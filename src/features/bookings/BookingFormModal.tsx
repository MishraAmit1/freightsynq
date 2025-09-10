import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Save, X } from "lucide-react";
import { getNextBookingId } from "@/lib/mockData";
import { useToast } from "@/hooks/use-toast";

interface BookingFormData {
  consignorName: string;
  consigneeName: string;
  fromLocation: string;
  toLocation: string;
  cargoUnits: number;
  materialDescription: string;
  serviceType: "FTL" | "PTL";
  pickupDate: string;
}

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingData: BookingFormData & { bookingId: string }) => void;
}

export const BookingFormModal = ({ isOpen, onClose, onSave }: BookingFormModalProps) => {
  const { toast } = useToast();
  const [formData, setFormData] = useState<BookingFormData>({
    consignorName: "",
    consigneeName: "",
    fromLocation: "",
    toLocation: "",
    cargoUnits: 1,
    materialDescription: "",
    serviceType: "FTL",
    pickupDate: ""
  });

  const handleSubmit = () => {
    // Validation
    if (!formData.consignorName.trim() || !formData.consigneeName.trim() || 
        !formData.fromLocation.trim() || !formData.toLocation.trim() ||
        !formData.materialDescription.trim() || !formData.pickupDate) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const bookingData = {
      ...formData,
      bookingId: getNextBookingId()
    };

    onSave(bookingData);
    
    // Reset form
    setFormData({
      consignorName: "",
      consigneeName: "",
      fromLocation: "",
      toLocation: "",
      cargoUnits: 1,
      materialDescription: "",
      serviceType: "FTL",
      pickupDate: ""
    });
    
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            Create New Booking
          </DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="consignor">Consignor Name *</Label>
              <Input
                id="consignor"
                value={formData.consignorName}
                onChange={(e) => setFormData({ ...formData, consignorName: e.target.value })}
                placeholder="Enter consignor name"
              />
            </div>
            <div>
              <Label htmlFor="consignee">Consignee Name *</Label>
              <Input
                id="consignee"
                value={formData.consigneeName}
                onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                placeholder="Enter consignee name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="from">Pickup Location *</Label>
              <Input
                id="from"
                value={formData.fromLocation}
                onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                placeholder="Enter pickup location"
              />
            </div>
            <div>
              <Label htmlFor="to">Drop Location *</Label>
              <Input
                id="to"
                value={formData.toLocation}
                onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                placeholder="Enter drop location"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="units">Cargo Units *</Label>
              <Input
                id="units"
                type="number"
                min="1"
                value={formData.cargoUnits}
                onChange={(e) => setFormData({ ...formData, cargoUnits: parseInt(e.target.value) || 1 })}
                placeholder="Number of units"
              />
            </div>
            <div>
              <Label htmlFor="service">Service Type *</Label>
              <Select 
                value={formData.serviceType} 
                onValueChange={(value: "FTL" | "PTL") => setFormData({ ...formData, serviceType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FTL">Full Truck Load (FTL)</SelectItem>
                  <SelectItem value="PTL">Part Truck Load (PTL)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="pickup">Pickup Date *</Label>
              <Input
                id="pickup"
                type="date"
                value={formData.pickupDate}
                onChange={(e) => setFormData({ ...formData, pickupDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="material">Material Description *</Label>
            <Textarea
              id="material"
              value={formData.materialDescription}
              onChange={(e) => setFormData({ ...formData, materialDescription: e.target.value })}
              rows={3}
              placeholder="Describe the goods/materials to be transported"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            <Save className="w-4 h-4 mr-2" />
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};