import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Loader2,
  Save,
  X,
  Warehouse,
  MapPin,
  User,
  Phone,
  Mail,
  Building2,
  Package
} from "lucide-react";
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
        title: "❌ Error",
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
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Warehouse className="w-5 h-5 text-primary" />
            Add New Warehouse
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-6">
          {/* Warehouse Name */}
          <div>
            <Label className="text-xs">
              Warehouse Name <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                {...register("name")}
                placeholder="e.g., Mumbai Central Hub"
                disabled={isSubmitting}
                className="pl-9 h-9 text-sm mt-1"
              />
            </div>
            {errors.name && (
              <p className="text-xs text-destructive mt-1">{errors.name.message}</p>
            )}
          </div>

          <Separator className="my-4" />

          {/* Location Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Location
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  City <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...register("city")}
                  placeholder="e.g., Mumbai"
                  disabled={isSubmitting}
                  className="h-9 text-sm mt-1"
                />
                {errors.city && (
                  <p className="text-xs text-destructive mt-1">{errors.city.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs">
                  State <span className="text-red-500">*</span>
                </Label>
                <Input
                  {...register("state")}
                  placeholder="e.g., Maharashtra"
                  disabled={isSubmitting}
                  className="h-9 text-sm mt-1"
                />
                {errors.state && (
                  <p className="text-xs text-destructive mt-1">{errors.state.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs">
                  Address <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  {...register("address")}
                  placeholder="Enter complete warehouse address"
                  disabled={isSubmitting}
                  rows={3}
                  className="text-sm mt-1 resize-none"
                />
                {errors.address && (
                  <p className="text-xs text-destructive mt-1">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          {/* Capacity */}
          <div>
            <Label className="text-xs">
              Capacity (units) <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Package className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                type="number"
                {...register("capacity", { valueAsNumber: true })}
                placeholder="e.g., 500"
                disabled={isSubmitting}
                className="pl-9 h-9 text-sm mt-1"
              />
            </div>
            {errors.capacity && (
              <p className="text-xs text-destructive mt-1">{errors.capacity.message}</p>
            )}
            <p className="text-[10px] text-muted-foreground mt-1">
              Maximum storage capacity in units
            </p>
          </div>

          <Separator className="my-4" />

          {/* Manager Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="w-4 h-4" />
              Manager Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">
                  Manager Name <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    {...register("manager_name")}
                    placeholder="e.g., Rahul Mehta"
                    disabled={isSubmitting}
                    className="pl-9 h-9 text-sm mt-1"
                  />
                </div>
                {errors.manager_name && (
                  <p className="text-xs text-destructive mt-1">{errors.manager_name.message}</p>
                )}
              </div>

              <div>
                <Label className="text-xs">
                  Phone Number <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    {...register("manager_phone")}
                    placeholder="e.g., +91-9876543220"
                    disabled={isSubmitting}
                    className="pl-9 h-9 text-sm mt-1"
                  />
                </div>
                {errors.manager_phone && (
                  <p className="text-xs text-destructive mt-1">{errors.manager_phone.message}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label className="text-xs">
                  Manager Email <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="email"
                    {...register("manager_email")}
                    placeholder="e.g., manager@example.com"
                    disabled={isSubmitting}
                    className="pl-9 h-9 text-sm mt-1"
                  />
                </div>
                {errors.manager_email && (
                  <p className="text-xs text-destructive mt-1">{errors.manager_email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              size="sm"
            >
              <X className="w-3.5 h-3.5 mr-2" />
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} size="sm">
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 mr-2" />
                  Save Warehouse
                </>
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};