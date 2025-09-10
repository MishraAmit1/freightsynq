import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const warehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"), 
  capacity: z.number().min(1, "Capacity must be greater than 0"),
  manager: z.string().min(1, "Manager name is required"),
  phone: z.string().min(1, "Phone number is required"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
});

type WarehouseFormData = z.infer<typeof warehouseSchema>;

interface AddWarehouseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddWarehouseModal = ({ isOpen, onClose }: AddWarehouseModalProps) => {
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
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    toast({
      title: "Warehouse Added",
      description: `${data.name} has been successfully added to the system.`,
    });
    
    setIsSubmitting(false);
    reset();
    onClose();
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
              />
              {errors.capacity && (
                <p className="text-sm text-destructive mt-1">{errors.capacity.message}</p>
              )}
            </div>

            {/* Manager */}
            <div>
              <Label htmlFor="manager">Manager Name</Label>
              <Input
                id="manager"
                {...register("manager")}
                placeholder="e.g., Rahul Mehta"
              />
              {errors.manager && (
                <p className="text-sm text-destructive mt-1">{errors.manager.message}</p>
              )}
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                {...register("phone")}
                placeholder="e.g., +91-9876543220"
              />
              {errors.phone && (
                <p className="text-sm text-destructive mt-1">{errors.phone.message}</p>
              )}
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                placeholder="e.g., manager@freightsynq.com"
              />
              {errors.email && (
                <p className="text-sm text-destructive mt-1">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Address */}
          <div>
            <Label htmlFor="address">Full Address</Label>
            <Textarea
              id="address"
              {...register("address")}
              placeholder="Enter the complete warehouse address"
              className="min-h-[80px]"
            />
            {errors.address && (
              <p className="text-sm text-destructive mt-1">{errors.address.message}</p>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Warehouse"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};