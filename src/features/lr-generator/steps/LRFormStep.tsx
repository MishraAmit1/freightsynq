// src/features/lr-generator/steps/LRFormStep.tsx
import { useState, useEffect, useRef } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
  Building2,
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Upload,
  X,
  Image as ImageIcon,
  Loader2,
} from "lucide-react";
import {
  standaloneLRSchema,
  type StandaloneLRFormData,
} from "@/lib/validations/standalone-lr";
import { LRLivePreview } from "@/features/lr-generator/LRLivePreview";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";

interface LRFormStepProps {
  initialData: StandaloneLRFormData;
  selectedTemplate: string;
  companyData: any;
  onTemplateChange: (templateCode: string) => void;
  onFormChange: (data: StandaloneLRFormData) => void;
  onNext: (data: StandaloneLRFormData) => void;
  onBack: () => void;
  isEditMode?: boolean;
}

const TEMPLATE_OPTIONS = [
  { code: "standard", name: "Standard Format" },
  { code: "minimal", name: "Minimal Format" },
  { code: "detailed", name: "Detailed Format" },
  { code: "gst_invoice", name: "GST Invoice Style" },
];

const MAX_GOODS_ITEMS = 5;

export const LRFormStep = ({
  initialData,
  selectedTemplate,
  companyData,
  onTemplateChange,
  onFormChange,
  onNext,
  onBack,
  isEditMode = false,
}: LRFormStepProps) => {
  const { toast } = useToast();
  const [isCompanyOpen, setIsCompanyOpen] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    control,
    formState: { errors },
  } = useForm<StandaloneLRFormData>({
    resolver: zodResolver(standaloneLRSchema),
    defaultValues: {
      ...initialData,
      goods_items: initialData.goods_items?.length
        ? initialData.goods_items
        : [{ id: crypto.randomUUID(), description: "", quantity: "" }],
    },
    mode: "onChange",
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "goods_items",
  });

  const formValues = watch();
  const [debouncedFormValues, setDebouncedFormValues] = useState(formValues);

  // Auto-fill company details
  useEffect(() => {
    if (companyData && !formValues.company_name) {
      setValue("company_name", companyData.name || "");
      setValue("company_address", companyData.address || "");
      setValue("company_city", companyData.city || "");
      setValue("company_state", companyData.state || "");
      setValue("company_phone", companyData.phone || "");
      setValue("company_email", companyData.email || "");
      setValue("company_gst", companyData.gst_number || "");
      setValue("company_pan", companyData.pan_number || "");
      setValue("company_logo_url", companyData.logo_url || "");
    }
  }, [companyData, setValue]);

  // Debounce form values
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedFormValues(formValues);
    }, 300);
    return () => clearTimeout(timer);
  }, [formValues]);

  // Update parent
  useEffect(() => {
    onFormChange(debouncedFormValues);
  }, [debouncedFormValues]);

  // =====================================================
  // ✅ LOGO UPLOAD HANDLER
  // =====================================================
  const handleLogoUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      toast({
        title: "❌ Invalid File Type",
        description: "Please upload a JPG, PNG, GIF or WebP image",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 2MB)
    const maxSize = 2 * 1024 * 1024; // 2MB
    if (file.size > maxSize) {
      toast({
        title: "❌ File Too Large",
        description: "Logo must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploadingLogo(true);

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create unique filename
      const fileExt = file.name.split(".").pop();
      const fileName = `lr-logo-${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `lr-logos/${fileName}`;

      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("company-assets")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (error) {
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("company-assets")
        .getPublicUrl(filePath);

      if (urlData?.publicUrl) {
        setValue("company_logo_url", urlData.publicUrl);
        toast({
          title: "✅ Logo Uploaded",
          description: "Your logo has been uploaded successfully",
        });
      }
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast({
        title: "❌ Upload Failed",
        description: "Failed to upload logo. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadingLogo(false);
      // Reset input
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
    }
  };

  // ✅ REMOVE LOGO
  const handleRemoveLogo = () => {
    setValue("company_logo_url", "");
    toast({
      title: "Logo Removed",
      description: "Logo has been removed from this LR",
    });
  };

  // Add new goods item
  const handleAddGoodsItem = () => {
    if (fields.length < MAX_GOODS_ITEMS) {
      append({ id: crypto.randomUUID(), description: "", quantity: "" });
    }
  };

  // Remove goods item
  const handleRemoveGoodsItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  // Form submit handler
  const onSubmit = (data: StandaloneLRFormData) => {
    const filteredGoodsItems =
      data.goods_items?.filter((item) => item.description || item.quantity) ||
      [];

    const finalData = {
      ...data,
      goods_items:
        filteredGoodsItems.length > 0
          ? filteredGoodsItems
          : [{ id: crypto.randomUUID(), description: "", quantity: "" }],
    };

    onNext(finalData);
  };

  const onError = (errors: any) => {
    console.log("❌ Form Validation Failed:", errors);
    const firstError = Object.keys(errors)[0];
    const element = document.querySelector(`[name="${firstError}"]`);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

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
        {/* Template Dropdown */}
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

        <form onSubmit={handleSubmit(onSubmit, onError)} className="space-y-4">
          {/* Validation errors */}
          {Object.keys(errors).length > 0 && (
            <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
              <CardContent className="p-4">
                <p className="text-sm text-red-700 dark:text-red-300 font-medium mb-2">
                  ⚠️ Please fix the following errors:
                </p>
                <ul className="text-xs text-red-600 dark:text-red-400 space-y-1 list-disc list-inside">
                  {Object.entries(errors).map(
                    ([field, error]: [string, any]) => (
                      <li key={field}>
                        <strong>{field.replace(/_/g, " ")}:</strong>{" "}
                        {error.message || "Invalid value"}
                      </li>
                    )
                  )}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* =====================================================
              ✅ COMPANY DETAILS WITH LOGO UPLOAD
          ===================================================== */}
          <Card className="bg-card border border-border dark:border-border">
            <Collapsible open={isCompanyOpen} onOpenChange={setIsCompanyOpen}>
              <CollapsibleTrigger asChild>
                <CardHeader className="py-3 px-4 border-b border-border dark:border-border cursor-pointer hover:bg-accent/50 dark:hover:bg-secondary/50 transition-colors">
                  <CardTitle className="text-sm flex items-center justify-between text-foreground dark:text-white">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <span>Company Details</span>
                      {formValues.company_name && (
                        <span className="text-xs text-muted-foreground font-normal ml-2">
                          ({formValues.company_name})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground font-normal">
                        {isCompanyOpen ? "Click to collapse" : "Click to edit"}
                      </span>
                      {isCompanyOpen ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <CardContent className="p-4 space-y-4">
                  {/* ✅ LOGO UPLOAD SECTION */}
                  <div>
                    <Label className={labelClass}>Company Logo</Label>
                    <div className="mt-2">
                      {/* Logo Preview */}
                      {formValues.company_logo_url ? (
                        <div className="relative inline-block">
                          <div className="p-3 bg-gray-50 dark:bg-secondary rounded-lg border border-border">
                            <img
                              src={formValues.company_logo_url}
                              alt="Company Logo"
                              className="max-h-20 max-w-48 object-contain"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "";
                                (e.target as HTMLImageElement).alt =
                                  "Failed to load";
                              }}
                            />
                          </div>
                          {/* Remove Button */}
                          <Button
                            type="button"
                            variant="destructive"
                            size="sm"
                            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                            onClick={handleRemoveLogo}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                          <ImageIcon className="w-10 h-10 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground mb-3">
                            No logo uploaded
                          </p>
                        </div>
                      )}

                      {/* Upload Controls */}
                      <div className="flex items-center gap-3 mt-3">
                        {/* Hidden File Input */}
                        <input
                          ref={logoInputRef}
                          type="file"
                          accept="image/jpeg,image/png,image/gif,image/webp"
                          onChange={handleLogoUpload}
                          className="hidden"
                        />

                        {/* Upload Button */}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => logoInputRef.current?.click()}
                          disabled={isUploadingLogo}
                          className="border-border"
                        >
                          {isUploadingLogo ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              {formValues.company_logo_url
                                ? "Change Logo"
                                : "Upload Logo"}
                            </>
                          )}
                        </Button>

                        {/* Or use URL */}
                        {/* <span className="text-xs text-muted-foreground">
                          or
                        </span> */}

                        {/* URL Input Toggle */}
                        {/* <div className="flex-1">
                          <Input
                            {...register("company_logo_url")}
                            placeholder="Paste logo URL"
                            className={cn(inputClass, "h-8 text-xs")}
                          />
                        </div> */}
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Supports JPG, PNG, GIF, WebP • Max 2MB
                      </p>
                    </div>
                  </div>

                  {/* Company Name */}
                  <div>
                    <Label className={labelClass}>Company Name</Label>
                    <Input
                      {...register("company_name")}
                      placeholder="Your Company Name"
                      className={cn(inputClass, "mt-1")}
                    />
                  </div>

                  {/* Address */}
                  <div>
                    <Label className={labelClass}>Address</Label>
                    <Textarea
                      {...register("company_address")}
                      placeholder="Company full address"
                      rows={2}
                      className={cn(inputClass, "mt-1 resize-none h-auto")}
                    />
                  </div>

                  {/* City & State */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={labelClass}>City</Label>
                      <Input
                        {...register("company_city")}
                        placeholder="City"
                        className={cn(inputClass, "mt-1")}
                      />
                    </div>
                    <div>
                      <Label className={labelClass}>State</Label>
                      <Input
                        {...register("company_state")}
                        placeholder="State"
                        className={cn(inputClass, "mt-1")}
                      />
                    </div>
                  </div>

                  {/* Phone & Email */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={labelClass}>Phone</Label>
                      <Input
                        {...register("company_phone")}
                        placeholder="+91 9999999999"
                        className={cn(inputClass, "mt-1")}
                      />
                    </div>
                    <div>
                      <Label className={labelClass}>Email</Label>
                      <Input
                        {...register("company_email")}
                        type="email"
                        placeholder="info@company.com"
                        className={cn(inputClass, "mt-1")}
                      />
                    </div>
                  </div>

                  {/* GST & PAN */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className={labelClass}>GST Number</Label>
                      <Input
                        {...register("company_gst")}
                        placeholder="22AAAAA0000A1Z5"
                        className={cn(inputClass, "mt-1 uppercase")}
                      />
                    </div>
                    <div>
                      <Label className={labelClass}>PAN Number</Label>
                      <Input
                        {...register("company_pan")}
                        placeholder="AAAAA0000A"
                        className={cn(inputClass, "mt-1 uppercase")}
                      />
                    </div>
                  </div>

                  {/* Info Note */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      💡 These details are auto-filled from your company
                      settings. You can edit them here for this LR only.
                    </p>
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>

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
                    className={cn(
                      inputClass,
                      "mt-1",
                      errors.standalone_lr_number && "border-red-500"
                    )}
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
                    className={cn(
                      inputClass,
                      "mt-1",
                      errors.lr_date && "border-red-500"
                    )}
                  />
                  {errors.lr_date && (
                    <p className="text-xs text-red-500 mt-1">
                      {errors.lr_date.message}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Consignor */}
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="py-3 px-4 border-b border-border dark:border-border bg-accent/50 dark:bg-primary/5">
              <CardTitle className="text-sm flex items-center gap-2 text-foreground dark:text-white">
                <User className="w-4 h-4 text-blue-500" />
                Consignor (Sender)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className={labelClass}>Name *</Label>
                <Input
                  {...register("consignor_name")}
                  placeholder="Company/Person Name"
                  className={cn(
                    inputClass,
                    "mt-1",
                    errors.consignor_name && "border-red-500"
                  )}
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
                <User className="w-4 h-4 text-green-500" />
                Consignee (Receiver)
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div>
                <Label className={labelClass}>Name *</Label>
                <Input
                  {...register("consignee_name")}
                  placeholder="Company/Person Name"
                  className={cn(
                    inputClass,
                    "mt-1",
                    errors.consignee_name && "border-red-500"
                  )}
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
                <MapPin className="w-4 h-4 text-purple-500" />
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
                    className={cn(
                      inputClass,
                      "mt-1",
                      errors.from_location && "border-red-500"
                    )}
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
                    className={cn(
                      inputClass,
                      "mt-1",
                      errors.to_location && "border-red-500"
                    )}
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
              <CardTitle className="text-sm flex items-center justify-between text-foreground dark:text-white">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-500" />
                  Goods Details
                </div>
                <span className="text-xs text-muted-foreground font-normal">
                  {fields.length}/{MAX_GOODS_ITEMS} items
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Goods Items Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr,150px,40px] gap-2 bg-muted dark:bg-secondary p-2 text-xs font-medium text-foreground dark:text-white">
                  <div>Description</div>
                  <div>Quantity</div>
                  <div></div>
                </div>

                <div className="divide-y divide-border">
                  {fields.map((field, index) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-[1fr,150px,40px] gap-2 p-2 items-center"
                    >
                      <Input
                        {...register(`goods_items.${index}.description`)}
                        placeholder="e.g., Electronics, Garments..."
                        className={cn(inputClass, "h-8")}
                      />
                      <Input
                        {...register(`goods_items.${index}.quantity`)}
                        placeholder="10 boxes"
                        className={cn(inputClass, "h-8")}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveGoodsItem(index)}
                        disabled={fields.length === 1}
                        className={cn(
                          "h-8 w-8 p-0",
                          fields.length === 1
                            ? "text-muted-foreground cursor-not-allowed"
                            : "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                        )}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                {fields.length < MAX_GOODS_ITEMS && (
                  <div className="p-2 border-t border-border">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddGoodsItem}
                      className="w-full h-8 text-xs border-dashed border-border hover:bg-accent dark:hover:bg-secondary"
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Item ({MAX_GOODS_ITEMS - fields.length} remaining)
                    </Button>
                  </div>
                )}
              </div>

              {/* Other Goods Fields */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <div>
                  <Label className={labelClass}>Total Weight (kg)</Label>
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
                <div>
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
                <Truck className="w-4 h-4 text-indigo-500" />
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
                <DollarSign className="w-4 h-4 text-emerald-500" />
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
                    value={watch("payment_mode") || "TO_PAY"}
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
                <FileText className="w-4 h-4 text-gray-500" />
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
              {isEditMode ? "Cancel" : "Back to Templates"}
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
            formData={debouncedFormValues}
            templateCode={selectedTemplate}
            companyData={companyData}
          />
        </div>
      </div>
    </div>
  );
};
