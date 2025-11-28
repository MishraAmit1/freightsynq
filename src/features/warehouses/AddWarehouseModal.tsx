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
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-card border-l border-border dark:border-border">
        <SheetHeader className="border-b border-border dark:border-border pb-4">
          <SheetTitle className="flex items-center gap-3 text-foreground dark:text-white">
            <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
              <Warehouse className="w-5 h-5 text-primary dark:text-primary" />
            </div>
            Add New Warehouse
          </SheetTitle>
        </SheetHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-6">

          {/* Warehouse Name */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground dark:text-white">
              Warehouse Name <span className="text-red-600">*</span>
            </Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
              <Input
                {...register("name")}
                placeholder="e.g., Mumbai Central Hub"
                disabled={isSubmitting}
                className="pl-10 h-10 text-sm border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
            {errors.name && (
              <p className="text-xs text-red-600 flex items-center gap-1">
                {errors.name.message}
              </p>
            )}
          </div>

          <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

          {/* Location Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-md">
                <MapPin className="w-4 h-4 text-primary dark:text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground dark:text-white">
                Location Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-white">
                  City <span className="text-red-600">*</span>
                </Label>
                <Input
                  {...register("city")}
                  placeholder="e.g., Mumbai"
                  disabled={isSubmitting}
                  className="h-10 text-sm border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                />
                {errors.city && (
                  <p className="text-xs text-red-600">{errors.city.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-white">
                  State <span className="text-red-600">*</span>
                </Label>
                <Input
                  {...register("state")}
                  placeholder="e.g., Maharashtra"
                  disabled={isSubmitting}
                  className="h-10 text-sm border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                />
                {errors.state && (
                  <p className="text-xs text-red-600">{errors.state.message}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-white">
                  Complete Address <span className="text-red-600">*</span>
                </Label>
                <Textarea
                  {...register("address")}
                  placeholder="Enter complete warehouse address with landmark"
                  disabled={isSubmitting}
                  rows={3}
                  className="text-sm resize-none border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                />
                {errors.address && (
                  <p className="text-xs text-red-600">{errors.address.message}</p>
                )}
              </div>
            </div>
          </div>

          <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

          {/* Capacity */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground dark:text-white">
              Storage Capacity (units) <span className="text-red-600">*</span>
            </Label>
            <div className="relative">
              <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
              <Input
                type="number"
                {...register("capacity", { valueAsNumber: true })}
                placeholder="e.g., 500"
                disabled={isSubmitting}
                className="pl-10 h-10 text-sm border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
              />
            </div>
            {errors.capacity && (
              <p className="text-xs text-red-600">{errors.capacity.message}</p>
            )}
            <p className="text-xs text-muted-foreground dark:text-muted-foreground">
              Maximum storage capacity in units
            </p>
          </div>

          <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

          {/* Manager Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-md">
                <User className="w-4 h-4 text-primary dark:text-primary" />
              </div>
              <h3 className="text-sm font-semibold text-foreground dark:text-white">
                Manager Details
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-white">
                  Manager Name <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    {...register("manager_name")}
                    placeholder="e.g., Rahul Mehta"
                    disabled={isSubmitting}
                    className="pl-10 h-10 text-sm border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                  />
                </div>
                {errors.manager_name && (
                  <p className="text-xs text-red-600">{errors.manager_name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-white">
                  Phone Number <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    {...register("manager_phone")}
                    placeholder="e.g., +91-9876543220"
                    disabled={isSubmitting}
                    className="pl-10 h-10 text-sm border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                  />
                </div>
                {errors.manager_phone && (
                  <p className="text-xs text-red-600">{errors.manager_phone.message}</p>
                )}
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label className="text-sm font-medium text-foreground dark:text-white">
                  Email Address <span className="text-red-600">*</span>
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    type="email"
                    {...register("manager_email")}
                    placeholder="e.g., manager@example.com"
                    disabled={isSubmitting}
                    className="pl-10 h-10 text-sm border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                  />
                </div>
                {errors.manager_email && (
                  <p className="text-xs text-red-600">{errors.manager_email.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 pt-6 border-t border-border dark:border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              size="default"
              className="bg-card border-border dark:border-border hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              size="default"
              className="bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
            >
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
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
};