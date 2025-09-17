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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const warehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"), 
  capacity: z.number().min(1, "Capacity must be greater than 0"),
  manager_name: z.string().min(1, "Manager name is required"),
  manager_phone: z.string().min(1, "Phone number is required"),
  manager_email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (warehouseData: WarehouseFormData) => Promise<void>;
}

export const AddWarehouseModal = ({ isOpen, onClose, onSave }: AddWarehouseModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<WarehouseFormData>({
    resolver: zodResolver(warehouseSchema),
  });

  const onSubmit = async (data: WarehouseFormData) => {
    setIsSubmitting(true);
    
    try {
      await onSave(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error saving warehouse:', error);
      toast({
        title: "Error",
        description: "Failed to save warehouse. Please try again.",
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

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Add New Warehouse</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Warehouse Name */}
            <div className="md:col-span-2">
              <Label htmlFor="name">Warehouse Name</Label>
              <Input
                id="name"
                {...register("name")}
                placeholder="e.g., Mumbai Central Hub"
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            {/* City */}
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                {...register("city")}
                placeholder="e.g., Mumbai"
                disabled={isSubmitting}
              />
              {errors.city && (
                <p className="text-sm text-destructive mt-1">{errors.city.message}</p>
              )}
            </div>

            {/* State */}
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                {...register("state")}
                placeholder="e.g., Maharashtra"
                disabled={isSubmitting}
              />
              {errors.state && (
                <p className="text-sm text-destructive mt-1">{errors.state.message}</p>
              )}
            </div>

            {/* Capacity */}
            <div>
              <Label htmlFor="capacity">Capacity (units)</Label>
              <Input
                id="capacity"
                type="number"
                {...register("capacity", { valueAsNumber: true })}
                placeholder="e.g., 500"
                disabled={isSubmitting}
              />
              {errors.capacity && (
                <p className="text-sm text-destructive mt-1">{errors.capacity.message}</p>
              )}
            </div>

            {/* Manager Name */}
            <div>
              <Label htmlFor="manager_name">Manager Name</Label>
              <Input
                id="manager_name"
                {...register("manager_name")}
                placeholder="e.g., Rahul Mehta"
                disabled={isSubmitting}
              />
              {errors.manager_name && (
                <p className="text-sm text-destructive mt-1">{errors.manager_name.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="manager_phone">Phone Number</Label>
              <Input
                id="manager_phone"
                {...register("manager_phone")}
                placeholder="e.g., +91-9876543220"
                disabled={isSubmitting}
              />
              {errors.manager_phone && (
                <p className="text-sm text-destructive mt-1">{errors.manager_phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div className="md:col-span-2">
              <Label htmlFor="manager_email">Manager Email</Label>
              <Input
                id="manager_email"
                type="email"
                {...register("manager_email")}
                placeholder="e.g., manager@example.com"
                disabled={isSubmitting}
              />
              {errors.manager_email && (
                <p className="text-sm text-destructive mt-1">{errors.manager_email.message}</p>
              )}
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                {...register("address")}
                placeholder="Enter complete warehouse address"
                disabled={isSubmitting}
                rows={3}
              />
              {errors.address && (
                <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
              )}
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
                  Save Warehouse
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};