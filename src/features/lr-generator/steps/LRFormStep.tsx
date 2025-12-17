// src/features/lr-generator/steps/LRFormStep.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  ArrowRight,
  User,
  MapPin,
  Package,
  Truck,
  DollarSign,
  FileText,
  LayoutTemplate,
} from "lucide-react";
import {
  standaloneLRSchema,
  type StandaloneLRFormData,
} from "@/lib/validations/standalone-lr";
import { LRLivePreview } from "@/features/lr-generator/LRLivePreview";
import { cn } from "@/lib/utils";

interface LRFormStepProps {
  initialData: StandaloneLRFormData;
  selectedTemplate: string;
  companyData: any;
  onTemplateChange: (templateCode: string) => void;
  onFormChange: (data: StandaloneLRFormData) => void;
  onNext: (data: StandaloneLRFormData) => void;
  onBack: () => void;
}

const TEMPLATE_OPTIONS = [
  { code: "standard", name: "Standard Format" },
  { code: "minimal", name: "Minimal Format" },
  { code: "detailed", name: "Detailed Format" },
  { code: "gst_invoice", name: "GST Invoice Style" },
];

export const LRFormStep = ({
  initialData,
  selectedTemplate,
  companyData,
  onTemplateChange,
  onFormChange,
  onNext,
  onBack,
}: LRFormStepProps) => {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<StandaloneLRFormData>({
    resolver: zodResolver(standaloneLRSchema),
    defaultValues: initialData,
  });

  const formValues = watch();

  // Update parent on form change
  useEffect(() => {
    onFormChange(formValues);
  }, [formValues, onFormChange]);

  const inputClass = cn(
    "h-9 text-sm",
    "border-border dark:border-border bg-card",
    "text-foreground dark:text-white",
    "placeholder:text-muted-foreground",
    "focus:ring-2 focus:ring-ring focus:border-primary"
  );

  const labelClass = "text-xs font-medium text-foreground dark:text-white";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Form */}
      <div className="space-y-4">
        {/* Template Dropdown Header */}
        <Card className="bg-card border border-border dark:border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground dark:text-white">
                  Template
                </span>
              </div>
              <Select value={selectedTemplate} onValueChange={onTemplateChange}>
                <SelectTrigger className="w-48 h-9 border-border dark:border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border dark:border-border">
                  {TEMPLATE_OPTIONS.map((t) => (
                    <SelectItem
                      key={t.code}
                      value={t.code}
                      className="hover:bg-accent dark:hover:bg-secondary"
                    >
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Form Sections */}
        <form onSubmit={handleSubmit(onNext)} className="space-y-4">
          {/* LR Details */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <FileText className="w-4 h-4 text-primary" />
                LR Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={labelClass}>LR Number *</Label>
                  <Input
                    {...register("standalone_lr_number")}
                    placeholder="Enter LR Number"
                    className={cn(inputClass, "mt-1")}
                  />
                  {errors.standalone_lr_number && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.standalone_lr_number.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className={labelClass}>LR Date *</Label>
                  <Input
                    type="date"
                    {...register("lr_date")}
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consignor */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border bg-accent/50 dark:bg-primary/5">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <User className="w-4 h-4 text-primary" />
                Consignor (Sender)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className={labelClass}>Name *</Label>
                <Input
                  {...register("consignor_name")}
                  placeholder="Company/Person Name"
                  className={cn(inputClass, "mt-1")}
                />
                {errors.consignor_name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.consignor_name.message}
                  </p>
                )}
              </div>
              <div>
                <Label className={labelClass}>Address</Label>
                <Textarea
                  {...register("consignor_address")}
                  placeholder="Full address"
                  rows={2}
                  className={cn(inputClass, "mt-1 resize-none h-auto")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={labelClass}>City</Label>
                  <Input
                    {...register("consignor_city")}
                    placeholder="City"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>State</Label>
                  <Input
                    {...register("consignor_state")}
                    placeholder="State"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Phone</Label>
                  <Input
                    {...register("consignor_phone")}
                    placeholder="9999999999"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>GST Number</Label>
                  <Input
                    {...register("consignor_gst")}
                    placeholder="22AAAAA0000A1Z5"
                    className={cn(inputClass, "mt-1 uppercase")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consignee */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border bg-accent/50 dark:bg-primary/5">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <User className="w-4 h-4 text-primary" />
                Consignee (Receiver)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className={labelClass}>Name *</Label>
                <Input
                  {...register("consignee_name")}
                  placeholder="Company/Person Name"
                  className={cn(inputClass, "mt-1")}
                />
                {errors.consignee_name && (
                  <p className="text-xs text-red-500 mt-1">
                    {errors.consignee_name.message}
                  </p>
                )}
              </div>
              <div>
                <Label className={labelClass}>Address</Label>
                <Textarea
                  {...register("consignee_address")}
                  placeholder="Full address"
                  rows={2}
                  className={cn(inputClass, "mt-1 resize-none h-auto")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={labelClass}>City</Label>
                  <Input
                    {...register("consignee_city")}
                    placeholder="City"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>State</Label>
                  <Input
                    {...register("consignee_state")}
                    placeholder="State"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Phone</Label>
                  <Input
                    {...register("consignee_phone")}
                    placeholder="9999999999"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>GST Number</Label>
                  <Input
                    {...register("consignee_gst")}
                    placeholder="22AAAAA0000A1Z5"
                    className={cn(inputClass, "mt-1 uppercase")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Route */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <MapPin className="w-4 h-4 text-primary" />
                Route Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={labelClass}>From Location *</Label>
                  <Input
                    {...register("from_location")}
                    placeholder="Origin city, state"
                    className={cn(inputClass, "mt-1")}
                  />
                  {errors.from_location && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.from_location.message}
                    </p>
                  )}
                </div>
                <div>
                  <Label className={labelClass}>To Location *</Label>
                  <Input
                    {...register("to_location")}
                    placeholder="Destination city, state"
                    className={cn(inputClass, "mt-1")}
                  />
                  {errors.to_location && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.to_location.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goods Details */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <Package className="w-4 h-4 text-primary" />
                Goods Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className={labelClass}>Material Description</Label>
                <Textarea
                  {...register("material_description")}
                  placeholder="e.g., Electronics, Garments, etc."
                  rows={2}
                  className={cn(inputClass, "mt-1 resize-none h-auto")}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className={labelClass}>Packages/Quantity</Label>
                  <Input
                    {...register("packages_qty")}
                    placeholder="10 boxes"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Weight (kg)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("weight", {
                      setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                    })}
                    placeholder="0.00"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Invoice Number</Label>
                  <Input
                    {...register("invoice_number")}
                    placeholder="INV-2024-001"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Invoice Value (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("invoice_value", {
                      setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                    })}
                    placeholder="0.00"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div className="col-span-2">
                  <Label className={labelClass}>E-way Bill Number</Label>
                  <Input
                    {...register("eway_bill_number")}
                    placeholder="123456789012"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle & Driver */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <Truck className="w-4 h-4 text-primary" />
                Vehicle & Driver
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label className={labelClass}>Vehicle Number</Label>
                  <Input
                    {...register("vehicle_number")}
                    placeholder="MH-12-AB-1234"
                    className={cn(inputClass, "mt-1 uppercase")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Driver Name</Label>
                  <Input
                    {...register("driver_name")}
                    placeholder="Driver name"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Driver Phone</Label>
                  <Input
                    {...register("driver_phone")}
                    placeholder="9999999999"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <DollarSign className="w-4 h-4 text-primary" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className={labelClass}>Freight Amount (₹)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    {...register("freight_amount", {
                      setValueAs: (v) => (v === "" ? undefined : parseFloat(v)),
                    })}
                    placeholder="0.00"
                    className={cn(inputClass, "mt-1")}
                  />
                </div>
                <div>
                  <Label className={labelClass}>Payment Mode</Label>
                  <Select
                    value={watch("payment_mode")}
                    onValueChange={(value: any) =>
                      setValue("payment_mode", value)
                    }
                  >
                    <SelectTrigger className={cn(inputClass, "mt-1")}>
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border dark:border-border">
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="TO_PAY">To Pay</SelectItem>
                      <SelectItem value="TO_BE_BILLED">To Be Billed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Remarks */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <FileText className="w-4 h-4 text-primary" />
                Remarks / Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <Textarea
                {...register("remarks")}
                placeholder="Any additional notes or instructions..."
                rows={3}
                className={cn(inputClass, "resize-none h-auto")}
              />
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onBack}
              className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Templates
            </Button>

            <Button
              type="submit"
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              Preview & Save
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </form>
      </div>

      {/* Right: Live Preview */}
      <div className="hidden lg:block">
        <div className="sticky top-32">
          <LRLivePreview
            formData={formValues}
            templateCode={selectedTemplate}
            companyData={companyData}
          />
        </div>
      </div>
    </div>
  );
};
