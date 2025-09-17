import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const validatePickupDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null; // Optional field

  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(selectedDate.getTime())) {
    return "Invalid date format";
  }

  if (selectedDate < today) {
    return "Pickup date cannot be in the past";
  }

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (selectedDate > maxDate) {
    return "Pickup date cannot be more than 1 year in the future";
  }

  return null;
};

interface BookingFormData {
  consignorName: string;
  consigneeName: string;
  fromLocation: string;
  toLocation: string;
  serviceType: "FTL" | "PTL";
  pickupDate?: string;
}

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BookingFormData) => void;
}

export const BookingFormModal = ({ isOpen, onClose, onSave }: BookingFormModalProps) => {
  const { toast } = useToast();
  const [dateError, setDateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState<BookingFormData>({
    consignorName: "",
    consigneeName: "",
    fromLocation: "",
    toLocation: "",
    serviceType: "FTL",
    pickupDate: undefined,
  });

  // Reset form when modal opens (for new booking)
  useEffect(() => {
    if (isOpen) {
      setFormData({
        consignorName: "",
        consigneeName: "",
        fromLocation: "",
        toLocation: "",
        serviceType: "FTL",
        pickupDate: undefined,
      });
      setDateError(null);
    }
  }, [isOpen]);

  const handleDateChange = (date: Date | null) => {
    const isoString = date ? date.toISOString().split('T')[0] : undefined;
    const error = validatePickupDate(isoString);
    setDateError(error);
    setFormData({ ...formData, pickupDate: isoString });
  };

  const handleSubmit = async () => {
    if (!formData.consignorName.trim() || !formData.consigneeName.trim() ||
      !formData.fromLocation.trim() || !formData.toLocation.trim()) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields (Consignor, Consignee, From/To Locations)",
        variant: "destructive"
      });
      return;
    }

    if (formData.pickupDate) {
      const dateError = validatePickupDate(formData.pickupDate);
      if (dateError) {
        toast({
          title: "Invalid Date",
          description: dateError,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setLoading(true);
      await onSave(formData);
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Booking</DialogTitle>
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
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="consignee">Consignee Name *</Label>
              <Input
                id="consignee"
                value={formData.consigneeName}
                onChange={(e) => setFormData({ ...formData, consigneeName: e.target.value })}
                placeholder="Enter consignee name"
                disabled={loading}
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
                disabled={loading}
              />
            </div>
            <div>
              <Label htmlFor="to">Drop Location *</Label>
              <Input
                id="to"
                value={formData.toLocation}
                onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                placeholder="Enter drop location"
                disabled={loading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="service">Service Type *</Label>
              <Select
                value={formData.serviceType}
                onValueChange={(value: "FTL" | "PTL") => setFormData({ ...formData, serviceType: value })}
                disabled={loading}
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
              <Label htmlFor="pickup">Pickup Date</Label>
              <DatePicker
                selected={formData.pickupDate ? new Date(formData.pickupDate) : null}
                onChange={handleDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                minDate={new Date()}
                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${(dateError) ? 'border-destructive' : 'border-input'
                  }`}
                disabled={loading}
              />
              {dateError && (
                <p className="text-sm text-destructive mt-1">{dateError}</p>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Create Booking
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};