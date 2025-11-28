import { useState, useEffect, ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Save,
  X,
  Truck,
  User,
  Plus,
  Upload,
  File,
  FileText,
  Trash2,
  AlertCircle,
  Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchUnassignedDrivers, createDriver } from "@/api/vehicles";
import { validateFile, formatFileSize } from "@/api/vehicleDocument";
import { AddDriverModal } from "../bookings/AddDriverModal";
import { validateVehicleNumber } from "@/utils/vehicleValidation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface DocumentMetadata {
  document_type: 'RC' | 'INSURANCE' | 'PERMIT' | 'FITNESS' | 'OTHER';
  expiry_date?: string;
}

const vehicleSchema = z.object({
  vehicle_number: z.string().min(1, "Vehicle number is required"),
  vehicle_type: z.string().min(1, "Vehicle type is required"),
  capacity: z.string().min(1, "Capacity is required"),
  default_driver_id: z.string().optional(),
  registration_date: z.string().optional(),
  insurance_expiry: z.string().optional(),
  fitness_expiry: z.string().optional(),
  permit_expiry: z.string().optional(),
});

type VehicleFormData = z.infer<typeof vehicleSchema>;

interface AddVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    vehicleData: VehicleFormData,
    documents?: { files: File[], metadata: Record<number, DocumentMetadata> } | null
  ) => Promise<void>;
}

export const AddVehicleModal = ({ isOpen, onClose, onSave }: AddVehicleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unassignedDrivers, setUnassignedDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentMetadata, setDocumentMetadata] = useState<Record<number, DocumentMetadata>>({});
  const [vehicleNumberError, setVehicleNumberError] = useState<string>("");
  const [isValidatingVehicle, setIsValidatingVehicle] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<VehicleFormData>({
    resolver: zodResolver(vehicleSchema),
    defaultValues: {
      default_driver_id: "none",
    },
  });

  useEffect(() => {
    if (isOpen) {
      loadUnassignedDrivers();
    }
  }, [isOpen]);

  useEffect(() => {
    const vehicleNumber = watch("vehicle_number");
    if (!vehicleNumber) {
      setVehicleNumberError("");
      return;
    }
    const timer = setTimeout(() => {
      validateVehicleNumberField(vehicleNumber);
    }, 800);
    return () => clearTimeout(timer);
  }, [watch("vehicle_number")]);

  const loadUnassignedDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const drivers = await fetchUnassignedDrivers();
      setUnassignedDrivers(drivers || []);
    } catch (error) {
      console.error("Error loading unassigned drivers:", error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    files.forEach(file => {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          title: "❌ Invalid File",
          description: validation.error,
          variant: "destructive"
        });
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      const newMetadata = { ...documentMetadata };
      validFiles.forEach((_, index) => {
        const fileIndex = selectedFiles.length + index;
        newMetadata[fileIndex] = { document_type: 'OTHER' };
      });
      setDocumentMetadata(newMetadata);
    }
    e.target.value = '';
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    const newMetadata = { ...documentMetadata };
    delete newMetadata[index];
    const reindexed: Record<number, DocumentMetadata> = {};
    Object.entries(newMetadata).forEach(([key, value]) => {
      const oldIndex = parseInt(key);
      const newIndex = oldIndex > index ? oldIndex - 1 : oldIndex;
      reindexed[newIndex] = value;
    });
    setDocumentMetadata(reindexed);
  };

  const updateDocumentMetadata = (index: number, field: keyof DocumentMetadata, value: any) => {
    setDocumentMetadata(prev => ({
      ...prev,
      [index]: { ...prev[index], [field]: value }
    }));
  };

  const validateDocuments = (): boolean => {
    if (selectedFiles.length === 0) return true;
    for (let i = 0; i < selectedFiles.length; i++) {
      if (!documentMetadata[i]?.document_type) {
        toast({
          title: "❌ Missing Document Type",
          description: `Please select document type for ${selectedFiles[i].name}`,
          variant: "destructive"
        });
        return false;
      }
    }
    return true;
  };

  const validateVehicleNumberField = async (value: string) => {
    if (!value || value.length < 8) {
      setVehicleNumberError("");
      return;
    }
    setIsValidatingVehicle(true);
    try {
      const validation = await validateVehicleNumber(value, supabase);
      if (!validation.isValid) {
        setVehicleNumberError(validation.error || "Invalid vehicle number");
      } else {
        setVehicleNumberError("");
        setValue("vehicle_number", validation.formatted || value);
        if (validation.details) {
          toast({
            title: "✅ Valid Vehicle Number",
            description: `${validation.details.state} - RTO ${validation.details.rto}`,
            duration: 2000
          });
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidatingVehicle(false);
    }
  };

  const onSubmit = async (data: VehicleFormData) => {
    if (!validateDocuments()) return;
    if (vehicleNumberError) {
      toast({
        title: "❌ Validation Error",
        description: vehicleNumberError,
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const cleanedData = {
        ...data,
        default_driver_id: data.default_driver_id === "none" ? null : data.default_driver_id,
        registration_date: data.registration_date || null,
        insurance_expiry: data.insurance_expiry || null,
        fitness_expiry: data.fitness_expiry || null,
        permit_expiry: data.permit_expiry || null,
      };

      const documentsData = selectedFiles.length > 0 ? {
        files: selectedFiles,
        metadata: documentMetadata
      } : null;

      await onSave(cleanedData, documentsData);
      reset({ default_driver_id: "none" });
      setSelectedFiles([]);
      setDocumentMetadata({});
      onClose();
    } catch (error) {
      console.error("Error saving vehicle:", error);
      toast({
        title: "Error",
        description: "Failed to save vehicle. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddDriver = async (driverData: any) => {
    try {
      const newDriver = await createDriver({
        name: driverData.name,
        phone: driverData.phone,
        license_number: driverData.license_number,
        experience: driverData.experience,
      });
      await loadUnassignedDrivers();
      setValue("default_driver_id", newDriver.id);
      setIsAddDriverOpen(false);
      toast({
        title: "✅ Driver Added",
        description: `${driverData.name} has been added successfully.`,
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to add driver.",
        variant: "destructive",
      });
    }
  };

  const handleClose = () => {
    reset({ default_driver_id: "none" });
    setSelectedFiles([]);
    setDocumentMetadata({});
    onClose();
  };

  const vehicleTypes = [
    "Truck - 16ft", "Truck - 20ft", "Truck - 24ft", "Container - 20ft",
    "Container - 40ft", "Trailer", "Mini Truck", "Tanker", "Pickup Truck", "Flatbed Truck",
  ];

  const capacities = ["1 ton", "5 tons", "10 tons", "15 tons", "20 tons", "25 tons", "30 tons", "40 tons"];

  const documentTypes = [
    { value: 'RC', label: 'RC (Registration Certificate)' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'PERMIT', label: 'Permit' },
    { value: 'FITNESS', label: 'Fitness Certificate' },
    { value: 'OTHER', label: 'Other' }
  ];

  return (
    <>
      <Sheet open={isOpen} onOpenChange={handleClose}>
        <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-card border-l border-border dark:border-border">
          <SheetHeader className="border-b border-border dark:border-border pb-4">
            <SheetTitle className="flex items-center gap-2 text-foreground dark:text-white">
              <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              Add Owned Vehicle
            </SheetTitle>
          </SheetHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 py-6">
            {/* Basic Information */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Vehicle Number *
                    {isValidatingVehicle && (
                      <Loader2 className="w-3 h-3 ml-2 inline animate-spin text-primary" />
                    )}
                  </Label>
                  <Input
                    {...register("vehicle_number")}
                    placeholder="e.g., MH-12-AB-1234"
                    disabled={isSubmitting}
                    className={cn(
                      "uppercase h-9 text-sm mt-1",
                      "border-border dark:border-border",
                      "bg-card",
                      "text-foreground dark:text-white",
                      "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      "focus:ring-2 focus:ring-ring focus:border-primary",
                      vehicleNumberError && "border-red-500 focus:ring-red-500 focus:border-red-500"
                    )}
                  />
                  {vehicleNumberError && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {vehicleNumberError}
                    </p>
                  )}
                  <p className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-1">
                    Format: XX-00-XX-0000
                  </p>
                </div>

                <div>
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Vehicle Type *
                  </Label>
                  <Select onValueChange={(val) => setValue("vehicle_type", val)} disabled={isSubmitting}>
                    <SelectTrigger className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary">
                      <SelectValue placeholder="Select Type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border dark:border-border">
                      {vehicleTypes.map((type) => (
                        <SelectItem
                          key={type}
                          value={type}
                          className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                        >
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vehicle_type && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {errors.vehicle_type.message}
                    </p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Capacity *
                  </Label>
                  <Select onValueChange={(val) => setValue("capacity", val)} disabled={isSubmitting}>
                    <SelectTrigger className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary">
                      <SelectValue placeholder="Select Capacity" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border dark:border-border">
                      {capacities.map((capacity) => (
                        <SelectItem
                          key={capacity}
                          value={capacity}
                          className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                        >
                          {capacity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.capacity && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {errors.capacity.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="my-4 bg-[#E5E7EB] dark:bg-secondary" />

            {/* Compliance Dates */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground">
                Compliance (Optional)
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Registration Date
                  </Label>
                  <Input
                    type="date"
                    {...register("registration_date")}
                    disabled={isSubmitting}
                    className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Insurance Expiry
                  </Label>
                  <Input
                    type="date"
                    {...register("insurance_expiry")}
                    disabled={isSubmitting}
                    className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Fitness Expiry
                  </Label>
                  <Input
                    type="date"
                    {...register("fitness_expiry")}
                    disabled={isSubmitting}
                    className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Permit Expiry
                  </Label>
                  <Input
                    type="date"
                    {...register("permit_expiry")}
                    disabled={isSubmitting}
                    className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary"
                  />
                </div>
              </div>
            </div>

            <Separator className="my-4 bg-[#E5E7EB] dark:bg-secondary" />

            {/* Default Driver */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4 text-primary" />
                Default Driver (Optional)
              </h3>
              <div>
                <Label className="text-xs font-medium text-foreground dark:text-white">
                  Assign Default Driver
                </Label>
                <Select
                  value={watch("default_driver_id") || "none"}
                  onValueChange={(val) => setValue("default_driver_id", val)}
                  disabled={isSubmitting || loadingDrivers}
                >
                  <SelectTrigger className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary">
                    <SelectValue placeholder={loadingDrivers ? "Loading..." : "Select driver"} />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border dark:border-border">
                    <SelectItem
                      value="none"
                      className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                    >
                      No Default Driver
                    </SelectItem>
                    {unassignedDrivers.map((driver) => (
                      <SelectItem
                        key={driver.id}
                        value={driver.id}
                        className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                      >
                        {driver.name} - {driver.phone}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full h-8 text-xs border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
                  onClick={() => setIsAddDriverOpen(true)}
                  disabled={isSubmitting}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Add New Driver
                </Button>
              </div>
            </div>

            <Separator className="my-4 bg-[#E5E7EB] dark:bg-secondary" />

            {/* Documents */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documents (Optional)
              </h3>

              <input
                type="file"
                id="owned-document-upload"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="border-2 border-dashed border-border dark:border-border rounded-lg p-4 text-center hover:border-primary dark:hover:border-primary hover:bg-accent dark:hover:bg-primary/5 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground dark:text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-2">
                  Upload RC, Insurance & Documents
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                  onClick={() => document.getElementById('owned-document-upload')?.click()}
                  disabled={isSubmitting}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Choose Files
                </Button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="border border-border dark:border-border rounded-lg p-3 space-y-2 bg-muted"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate text-foreground dark:text-white">
                              {file.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground dark:text-muted-foreground">
                              {formatFileSize(file.size)}
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 flex-shrink-0 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => handleRemoveFile(index)}
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px] font-medium text-foreground dark:text-white">
                            Document Type *
                          </Label>
                          <Select
                            value={documentMetadata[index]?.document_type || 'OTHER'}
                            onValueChange={(value: any) => updateDocumentMetadata(index, 'document_type', value)}
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="h-7 text-[10px] border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border dark:border-border">
                              {documentTypes.map((type) => (
                                <SelectItem
                                  key={type.value}
                                  value={type.value}
                                  className="text-[10px] text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                                >
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[10px] font-medium text-foreground dark:text-white">
                            Expiry Date (Optional)
                          </Label>
                          <Input
                            type="date"
                            className="h-7 text-[10px] border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary"
                            value={documentMetadata[index]?.expiry_date || ''}
                            onChange={(e) => updateDocumentMetadata(index, 'expiry_date', e.target.value)}
                            disabled={isSubmitting}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t border-border dark:border-border">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
                size="sm"
                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
              >
                <X className="w-3.5 h-3.5 mr-2" />
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                size="sm"
                className="bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 mr-2" />
                    Save Vehicle
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>

      <AddDriverModal
        isOpen={isAddDriverOpen}
        onClose={() => setIsAddDriverOpen(false)}
        onSave={handleAddDriver}
      />
    </>
  );
};