import { useState, useEffect, ChangeEvent } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchUnassignedDrivers, createDriver } from "@/api/vehicles";
import { validateFile, formatFileSize } from "@/api/vehicleDocument";
import { AddDriverModal } from "../bookings/AddDriverModal";
import { validateVehicleNumber } from "@/utils/vehicleValidation";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
// ✅ NEW: Document metadata interface
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

export const AddVehicleModal = ({
  isOpen,
  onClose,
  onSave,
}: AddVehicleModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [unassignedDrivers, setUnassignedDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);

  // ✅ NEW: Document upload states
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
  // Add this useEffect
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

  // ✅ NEW: File selection handler
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
        newMetadata[fileIndex] = {
          document_type: 'OTHER'
        };
      });
      setDocumentMetadata(newMetadata);

      toast({
        title: "✅ Files Selected",
        description: `${validFiles.length} file(s) ready to upload`
      });
    }

    e.target.value = '';
  };

  // ✅ NEW: Remove file handler
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

  // ✅ NEW: Update document metadata
  const updateDocumentMetadata = (
    index: number,
    field: keyof DocumentMetadata,
    value: any
  ) => {
    setDocumentMetadata(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value
      }
    }));
  };

  // ✅ NEW: Validate documents
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
  // Add this function before onSubmit
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
  // ✅ UPDATED: onSubmit with documents
  const onSubmit = async (data: VehicleFormData) => {
    if (!validateDocuments()) {
      return;
    }
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

      // ✅ NEW: Prepare documents data
      const documentsData = selectedFiles.length > 0 ? {
        files: selectedFiles,
        metadata: documentMetadata
      } : null;

      console.log("✅ Vehicle Modal - Final data to save:", cleanedData);
      console.log("📄 Documents to upload:", documentsData);

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
    "Truck - 16ft",
    "Truck - 20ft",
    "Truck - 24ft",
    "Container - 20ft",
    "Container - 40ft",
    "Trailer",
    "Mini Truck",
    "Tanker",
    "Pickup Truck",
    "Flatbed Truck",
  ];

  const capacities = [
    "1 ton",
    "5 tons",
    "10 tons",
    "15 tons",
    "20 tons",
    "25 tons",
    "30 tons",
    "40 tons",
  ];

  const documentTypes = [
    { value: 'RC', label: 'RC (Registration Certificate)' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'PERMIT', label: 'Permit' },
    { value: 'FITNESS', label: 'Fitness Certificate' },
    { value: 'OTHER', label: 'Other' }
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Add Owned Vehicle
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Add a new vehicle to your owned fleet
            </p>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicle_number">
                    Vehicle Number *
                    {isValidatingVehicle && (
                      <Loader2 className="w-3 h-3 ml-2 inline animate-spin text-primary" />
                    )}
                  </Label>
                  <Input
                    id="vehicle_number"
                    {...register("vehicle_number")}
                    placeholder="e.g., MH-12-AB-1234"
                    disabled={isSubmitting}
                    className={cn(
                      "uppercase",
                      vehicleNumberError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {vehicleNumberError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {vehicleNumberError}
                    </p>
                  )}
                  {errors.vehicle_number && !vehicleNumberError && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.vehicle_number.message}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: XX-00-XX-0000 (State-RTO-Series-Number)
                  </p>
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
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.vehicle_type && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.vehicle_type.message}
                    </p>
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
                        <SelectItem key={capacity} value={capacity}>
                          {capacity}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.capacity && (
                    <p className="text-sm text-destructive mt-1">
                      {errors.capacity.message}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Registration & Compliance */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">
                Registration & Compliance (Optional)
              </h3>
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

            {/* Default Driver Assignment */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="w-4 h-4" /> Default Driver (Optional)
              </h3>
              <div>
                <Label>Assign Default Driver</Label>
                <Select
                  value={watch("default_driver_id") || "none"}
                  onValueChange={(val) => setValue("default_driver_id", val)}
                  disabled={isSubmitting || loadingDrivers}
                >
                  <SelectTrigger>
                    <SelectValue
                      placeholder={
                        loadingDrivers ? "Loading drivers..." : "Select driver"
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Default Driver</SelectItem>
                    {unassignedDrivers.length > 0
                      ? unassignedDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name} - {driver.phone}
                        </SelectItem>
                      ))
                      : !loadingDrivers && (
                        <SelectItem value="none" disabled>
                          No unassigned drivers available
                        </SelectItem>
                      )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This driver will be auto-selected for this vehicle.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setIsAddDriverOpen(true)}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4 mr-2" /> Add New Driver
                </Button>
              </div>
            </div>

            {/* ✅ NEW: Document Upload Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
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

              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload Vehicle RC, Insurance & Other Documents
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supported: PDF, JPG, PNG (Max 5MB per file)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('owned-document-upload')?.click()}
                  disabled={isSubmitting}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">
                      Selected Files ({selectedFiles.length})
                    </Label>
                    <Badge variant="secondary" className="text-xs">
                      {formatFileSize(selectedFiles.reduce((acc, file) => acc + file.size, 0))}
                    </Badge>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedFiles.map((file, index) => (
                      <div
                        key={index}
                        className="border rounded-lg p-3 space-y-3 bg-muted/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <File className="w-4 h-4 text-primary flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => handleRemoveFile(index)}
                            disabled={isSubmitting}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Document Type *</Label>
                            <Select
                              value={documentMetadata[index]?.document_type || 'OTHER'}
                              onValueChange={(value: any) =>
                                updateDocumentMetadata(index, 'document_type', value)
                              }
                              disabled={isSubmitting}
                            >
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {documentTypes.map((type) => (
                                  <SelectItem key={type.value} value={type.value}>
                                    {type.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div>
                            <Label className="text-xs">Expiry Date (Optional)</Label>
                            <Input
                              type="date"
                              className="h-8 text-xs"
                              value={documentMetadata[index]?.expiry_date || ''}
                              onChange={(e) =>
                                updateDocumentMetadata(index, 'expiry_date', e.target.value)
                              }
                              disabled={isSubmitting}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" /> Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" /> Save Vehicle
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AddDriverModal
        isOpen={isAddDriverOpen}
        onClose={() => setIsAddDriverOpen(false)}
        onSave={handleAddDriver}
      />
    </>
  );
};