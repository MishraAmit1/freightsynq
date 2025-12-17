// src/features/lr-generator/LRForm.tsx
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  User,
  MapPin,
  Package,
  Truck,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import {
  standaloneLRSchema,
  type StandaloneLRFormData,
} from "@/lib/validations/standalone-lr";
import { cn } from "@/lib/utils";

interface LRFormProps {
  onFormChange?: (data: StandaloneLRFormData) => void;
  onSubmit?: (data: StandaloneLRFormData) => void;
  initialData?: Partial<StandaloneLRFormData>;
  isSubmitting?: boolean;
  autoGenerateLRNumber?: boolean;
}

export const LRForm = ({
  onFormChange,
  onSubmit,
  initialData,
  isSubmitting = false,
  autoGenerateLRNumber = true,
}: LRFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<StandaloneLRFormData>({
    resolver: zodResolver(standaloneLRSchema),
    defaultValues: {
      lr_date: new Date().toISOString().split("T")[0],
      template_code: "standard",
      payment_mode: "TO_PAY",
      ...initialData,
    },
  });

  // Watch all form values for live preview
  const formValues = watch();

  // Trigger onFormChange when form values change
  useEffect(() => {
    if (onFormChange) {
      onFormChange(formValues);
    }
  }, [formValues, onFormChange]);

  // Auto-save to localStorage every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      localStorage.setItem("standalone_lr_draft", JSON.stringify(formValues));
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [formValues]);

  const handleFormSubmit = (data: StandaloneLRFormData) => {
    if (onSubmit) {
      onSubmit(data);
    }
  };

  const handleLoadDraft = () => {
    const draft = localStorage.getItem("standalone_lr_draft");
    if (draft) {
      try {
        const parsed = JSON.parse(draft);
        reset(parsed);
      } catch (error) {
        console.error("Error loading draft:", error);
      }
    }
  };

  const handleClearForm = () => {
    reset({
      lr_date: new Date().toISOString().split("T")[0],
      template_code: "standard",
      payment_mode: "TO_PAY",
    });
    localStorage.removeItem("standalone_lr_draft");
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
      {/* LR Basic Information */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <FileText className="w-5 h-5 text-primary" />
            LR Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                LR Number
              </Label>
              <Input
                {...register("standalone_lr_number")}
                placeholder={
                  autoGenerateLRNumber ? "Auto-generated" : "Enter LR Number"
                }
                disabled={autoGenerateLRNumber}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {autoGenerateLRNumber && (
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-1">
                  Will be auto-generated on save
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                LR Date *
              </Label>
              <Input
                type="date"
                {...register("lr_date")}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {errors.lr_date && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.lr_date.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consignor Details */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3 bg-accent dark:bg-primary/5">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <User className="w-5 h-5 text-primary" />
            Consignor (Sender) Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Consignor Name *
              </Label>
              <Input
                {...register("consignor_name")}
                placeholder="Company/Person Name"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {errors.consignor_name && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.consignor_name.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Address
              </Label>
              <Textarea
                {...register("consignor_address")}
                placeholder="Full address"
                rows={2}
                className={cn(
                  "text-sm mt-1 resize-none",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                City
              </Label>
              <Input
                {...register("consignor_city")}
                placeholder="City"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                State
              </Label>
              <Input
                {...register("consignor_state")}
                placeholder="State"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Pincode
              </Label>
              <Input
                {...register("consignor_pincode")}
                placeholder="000000"
                maxLength={6}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Phone
              </Label>
              <Input
                {...register("consignor_phone")}
                placeholder="9999999999"
                maxLength={10}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                GST Number
              </Label>
              <Input
                {...register("consignor_gst")}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className={cn(
                  "h-9 text-sm mt-1 uppercase",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Email
              </Label>
              <Input
                type="email"
                {...register("consignor_email")}
                placeholder="email@example.com"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {errors.consignor_email && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.consignor_email.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consignee Details */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3 bg-accent dark:bg-primary/5">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <User className="w-5 h-5 text-primary" />
            Consignee (Receiver) Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Consignee Name *
              </Label>
              <Input
                {...register("consignee_name")}
                placeholder="Company/Person Name"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {errors.consignee_name && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.consignee_name.message}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Address
              </Label>
              <Textarea
                {...register("consignee_address")}
                placeholder="Full address"
                rows={2}
                className={cn(
                  "text-sm mt-1 resize-none",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                City
              </Label>
              <Input
                {...register("consignee_city")}
                placeholder="City"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                State
              </Label>
              <Input
                {...register("consignee_state")}
                placeholder="State"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Pincode
              </Label>
              <Input
                {...register("consignee_pincode")}
                placeholder="000000"
                maxLength={6}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Phone
              </Label>
              <Input
                {...register("consignee_phone")}
                placeholder="9999999999"
                maxLength={10}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                GST Number
              </Label>
              <Input
                {...register("consignee_gst")}
                placeholder="22AAAAA0000A1Z5"
                maxLength={15}
                className={cn(
                  "h-9 text-sm mt-1 uppercase",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Email
              </Label>
              <Input
                type="email"
                {...register("consignee_email")}
                placeholder="email@example.com"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {errors.consignee_email && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.consignee_email.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Route Information */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <MapPin className="w-5 h-5 text-primary" />
            Route Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                From Location *
              </Label>
              <Input
                {...register("from_location")}
                placeholder="Origin city, state"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {errors.from_location && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.from_location.message}
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                To Location *
              </Label>
              <Input
                {...register("to_location")}
                placeholder="Destination city, state"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
              {errors.to_location && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {errors.to_location.message}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goods Details */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <Package className="w-5 h-5 text-primary" />
            Goods Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Material Description
              </Label>
              <Textarea
                {...register("material_description")}
                placeholder="e.g., Electronics, Garments, etc."
                rows={2}
                className={cn(
                  "text-sm mt-1 resize-none",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Packages/Quantity
              </Label>
              <Input
                {...register("packages_qty")}
                placeholder="e.g., 10 boxes, 5 cartons"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Weight (kg)
              </Label>
              <Input
                type="number"
                step="0.01"
                {...register("weight", {
                  setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                })}
                placeholder="0.00"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Invoice Number
              </Label>
              <Input
                {...register("invoice_number")}
                placeholder="INV-2024-001"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Invoice Value (₹)
              </Label>
              <Input
                type="number"
                step="0.01"
                {...register("invoice_value", {
                  setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                })}
                placeholder="0.00"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                E-way Bill Number
              </Label>
              <Input
                {...register("eway_bill_number")}
                placeholder="123456789012"
                maxLength={12}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle & Driver Details */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <Truck className="w-5 h-5 text-primary" />
            Vehicle & Driver Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Vehicle Number
              </Label>
              <Input
                {...register("vehicle_number")}
                placeholder="MH-12-AB-1234"
                className={cn(
                  "h-9 text-sm mt-1 uppercase",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Driver Name
              </Label>
              <Input
                {...register("driver_name")}
                placeholder="Driver name"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Driver Phone
              </Label>
              <Input
                {...register("driver_phone")}
                placeholder="9999999999"
                maxLength={10}
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Payment Details */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <DollarSign className="w-5 h-5 text-primary" />
            Payment Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Freight Amount (₹)
              </Label>
              <Input
                type="number"
                step="0.01"
                {...register("freight_amount", {
                  setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                })}
                placeholder="0.00"
                className={cn(
                  "h-9 text-sm mt-1",
                  "border-border dark:border-border bg-card",
                  "text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:ring-2 focus:ring-ring focus:border-primary"
                )}
              />
            </div>

            <div>
              <Label className="text-xs font-medium text-foreground dark:text-white">
                Payment Mode
              </Label>
              <Select
                value={watch("payment_mode")}
                onValueChange={(value: any) => setValue("payment_mode", value)}
              >
                <SelectTrigger
                  className={cn(
                    "h-9 text-sm mt-1",
                    "border-border dark:border-border bg-card",
                    "text-foreground dark:text-white",
                    "focus:ring-2 focus:ring-ring focus:border-primary"
                  )}
                >
                  <SelectValue placeholder="Select mode" />
                </SelectTrigger>
                <SelectContent className="bg-card border-border dark:border-border">
                  <SelectItem
                    value="PAID"
                    className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                  >
                    Paid
                  </SelectItem>
                  <SelectItem
                    value="TO_PAY"
                    className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                  >
                    To Pay
                  </SelectItem>
                  <SelectItem
                    value="TO_BE_BILLED"
                    className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                  >
                    To Be Billed
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Remarks */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <FileText className="w-5 h-5 text-primary" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Label className="text-xs font-medium text-foreground dark:text-white">
            Remarks / Notes
          </Label>
          <Textarea
            {...register("remarks")}
            placeholder="Any additional notes or instructions..."
            rows={3}
            className={cn(
              "text-sm mt-1 resize-none",
              "border-border dark:border-border bg-card",
              "text-foreground dark:text-white",
              "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
              "focus:ring-2 focus:ring-ring focus:border-primary"
            )}
          />
        </CardContent>
      </Card>

      {/* Form Actions */}
      <div className="flex flex-wrap gap-2 pt-4 border-t border-border dark:border-border">
        <Button
          type="button"
          variant="outline"
          onClick={handleLoadDraft}
          className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Load Draft
        </Button>

        <Button
          type="button"
          variant="outline"
          onClick={handleClearForm}
          className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
        >
          Clear Form
        </Button>

        <div className="flex-1" />

        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-primary hover:bg-primary-hover text-primary-foreground"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save & Generate LR
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
