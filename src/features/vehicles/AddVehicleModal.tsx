import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Save, X, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const vehicleSchema = z.object({
  vehicle_number: z.string().min(1, "Vehicle number is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  capacity: z.string().min(1, "Capacity is required"),
  registration_date: z.string().optional(),
  insurance_expiry: z.string().optional(),
  fitness_expiry: z.string().optional(),
  permit_expiry: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (vehicleData: VehicleFormData) => Promise<void>;
}

export const AddVehicleModal = ({ isOpen, onClose, onSave }: AddVehicleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
  });

  const onSubmit = async (data: VehicleFormData) => {

    setIsSubmitting(true);
    try {
      const cleanedData = {
        ...data,
        registration_date: data.registration_date || null,
        insurance_expiry: data.insurance_expiry || null,
        fitness_expiry: data.fitness_expiry || null,
        permit_expiry: data.permit_expiry || null,
      };

      await onSave(cleanedData);
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to save vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const vehicleTypes = [
    "Truck - 16ft",
    "Truck - 20ft",
    "Truck - 24ft",
    "Container - 20ft",
    "Container - 40ft",
    "Trailer",
    "Mini Truck",
    "Tanker",
    "Pickup Truck",
    "Flatbed Truck"
  ];

  const capacities = [
    "1 ton",
    "5 tons",
    "10 tons",
    "15 tons",
    "20 tons",
    "25 tons",
    "30 tons",
    "40 tons"
  ];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="w-5 h-5 text-primary" />
            Add Owned Vehicle
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Add a new vehicle to your owned fleet
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="vehicle_number">Vehicle Number *</Label>
                <Input
                  id="vehicle_number"
                  {...register("vehicle_number")}
                  placeholder="e.g., MH12AB1234"
                  disabled={isSubmitting}
                  className="uppercase"
                />
                {errors.vehicle_number && (
                  <p className="text-sm text-destructive mt-1">{errors.vehicle_number.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="vehicle_type">Vehicle Type *</Label>
                <Select
                  onValueChange={(val) => setValue("vehicle_type", val)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {vehicleTypes.map((type) => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.vehicle_type && (
                  <p className="text-sm text-destructive mt-1">{errors.vehicle_type.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="capacity">Capacity *</Label>
                <Select
                  onValueChange={(val) => setValue("capacity", val)}
                  disabled={isSubmitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Capacity" />
                  </SelectTrigger>
                  <SelectContent>
                    {capacities.map((capacity) => (
                      <SelectItem key={capacity} value={capacity}>{capacity}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.capacity && (
                  <p className="text-sm text-destructive mt-1">{errors.capacity.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Registration & Compliance */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Registration & Compliance</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="registration_date">Registration Date</Label>
                <Input
                  id="registration_date"
                  type="date"
                  {...register("registration_date")}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
                <Input
                  id="insurance_expiry"
                  type="date"
                  {...register("insurance_expiry")}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="fitness_expiry">Fitness Expiry</Label>
                <Input
                  id="fitness_expiry"
                  type="date"
                  {...register("fitness_expiry")}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <Label htmlFor="permit_expiry">Permit Expiry</Label>
                <Input
                  id="permit_expiry"
                  type="date"
                  {...register("permit_expiry")}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Vehicle
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};