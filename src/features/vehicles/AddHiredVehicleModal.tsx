import { useState, useEffect, ChangeEvent } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  Save,
  X,
  Upload,
  Plus,
  User,
  File,
  FileText,
  Trash2,
  Loader2,
  AlertCircle,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { validateVehicleNumber } from "@/utils/vehicleValidation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { fetchUnassignedDrivers } from "@/api/vehicles";
import { validateFile, formatFileSize } from "@/api/vehicleDocument";
import { AddDriverModal } from "../bookings/AddDriverModal";
import { cn } from "@/lib/utils";

// Vehicle category and size configurations (same as AddVehicleModal)
const vehicleCategories = [
  "LCV",
  "MCV",
  "HCV",
  "Container",
  "Trailer",
  "Truck",
  "Special",
] as const;

type VehicleCategory = (typeof vehicleCategories)[number];

const vehicleSizesByCategory: Record<VehicleCategory, string[]> = {
  LCV: [
    "7 ft (Ace / Chota Hathi)",
    "8 ft",
    "9 ft",
    "10 ft",
    "12 ft",
    "14 ft",
    "Special",
  ],
  MCV: ["14 ft", "17 ft", "19 ft", "Special"],
  HCV: ["19 ft", "22 ft", "24 ft", "32 ft (Multi Axle)", "Special"],
  Container: [
    "14 ft Container",
    "20 ft Container",
    "22 ft Container",
    "32 ft Container",
    "40 ft Container",
    "Special",
  ],
  Trailer: [
    "20 ft Trailer",
    "40 ft Trailer",
    "45 ft Trailer",
    "50 ft Trailer",
    "Low Bed Trailer",
    "Hydraulic Axle Trailer",
    "Special",
  ],
  Truck: ["20 ft", "22 ft", "24 ft", "Other", "Special"],
  Special: ["Custom Size", "Non-Standard", "Other"],
};

interface DocumentMetadata {
  document_type: "RC" | "INSURANCE" | "PERMIT" | "AGREEMENT" | "OTHER";
  expiry_date?: string;
}

interface VehicleFormData {
  vehicleNumber: string;
  vehicleType: string;
  capacity: string;
  brokerId?: string;
  default_driver_id?: string;
  ratePerTrip?: string;
}

interface AddHiredVehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    vehicleData: VehicleFormData,
    documents?: {
      files: File[];
      metadata: Record<number, DocumentMetadata>;
    } | null,
  ) => void;
  brokers: any[];
  onAddBroker?: () => void;
}

export const AddHiredVehicleModal = ({
  isOpen,
  onClose,
  onSave,
  brokers = [],
  onAddBroker,
}: AddHiredVehicleModalProps) => {
  const { toast } = useToast();
  const [vehicleData, setVehicleData] = useState<VehicleFormData>({
    vehicleNumber: "",
    vehicleType: "",
    capacity: "",
    brokerId: "none",
    default_driver_id: "none",
    ratePerTrip: "",
  });

  // New states for category/size/capacity
  const [selectedCategory, setSelectedCategory] = useState<
    VehicleCategory | ""
  >("");
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [availableSizes, setAvailableSizes] = useState<string[]>([]);
  const [capacityValue, setCapacityValue] = useState<number>(1);

  const [unassignedDrivers, setUnassignedDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentMetadata, setDocumentMetadata] = useState<
    Record<number, DocumentMetadata>
  >({});
  const [vehicleNumberError, setVehicleNumberError] = useState<string>("");
  const [isValidatingVehicle, setIsValidatingVehicle] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Validation errors
  const [errors, setErrors] = useState<{
    category?: string;
    size?: string;
    capacity?: string;
  }>({});

  // Update available sizes when category changes
  useEffect(() => {
    if (selectedCategory) {
      setAvailableSizes(vehicleSizesByCategory[selectedCategory]);
      setSelectedSize(""); // Reset size when category changes
    } else {
      setAvailableSizes([]);
    }
  }, [selectedCategory]);

  useEffect(() => {
    if (isOpen) {
      loadUnassignedDrivers();
    }
  }, [isOpen]);

  const loadUnassignedDrivers = async () => {
    try {
      setLoadingDrivers(true);
      const drivers = await fetchUnassignedDrivers();
      setUnassignedDrivers(drivers || []);
    } catch (error) {
      console.error("Error loading drivers:", error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAddDriver = async (driverData: any) => {
    try {
      const { createDriver } = await import("@/api/drivers");
      const newDriver = await createDriver({
        name: driverData.name,
        phone: driverData.phone,
        license_number: driverData.license_number,
        experience: driverData.experience,
      });

      await loadUnassignedDrivers();
      setVehicleData({ ...vehicleData, default_driver_id: newDriver.id });
      setIsAddDriverOpen(false);

      toast({
        title: "✅ Driver Added",
        description: `${driverData.name} has been added`,
      });
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to add driver",
        variant: "destructive",
      });
    }
  };

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles: File[] = [];

    files.forEach((file) => {
      const validation = validateFile(file);
      if (!validation.valid) {
        toast({
          title: "❌ Invalid File",
          description: validation.error,
          variant: "destructive",
        });
      } else {
        validFiles.push(file);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...validFiles]);
      const newMetadata = { ...documentMetadata };
      validFiles.forEach((_, index) => {
        const fileIndex = selectedFiles.length + index;
        newMetadata[fileIndex] = { document_type: "OTHER" };
      });
      setDocumentMetadata(newMetadata);
    }
    e.target.value = "";
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
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

  const updateDocumentMetadata = (
    index: number,
    field: keyof DocumentMetadata,
    value: any,
  ) => {
    setDocumentMetadata((prev) => ({
      ...prev,
      [index]: { ...prev[index], [field]: value },
    }));
  };

  const validateDocuments = (): boolean => {
    if (selectedFiles.length === 0) return true;
    for (let i = 0; i < selectedFiles.length; i++) {
      if (!documentMetadata[i]?.document_type) {
        toast({
          title: "❌ Missing Document Type",
          description: `Please select document type for ${selectedFiles[i].name}`,
          variant: "destructive",
        });
        return false;
      }
    }
    return true;
  };

  const handleVehicleNumberChange = async (value: string) => {
    const upperValue = value.toUpperCase();
    setVehicleData({ ...vehicleData, vehicleNumber: upperValue });

    if (upperValue.length < 8) {
      setVehicleNumberError("");
      return;
    }

    setIsValidatingVehicle(true);
    try {
      const validation = await validateVehicleNumber(upperValue, supabase);
      if (!validation.isValid) {
        setVehicleNumberError(validation.error || "Invalid vehicle number");
      } else {
        setVehicleNumberError("");
        setVehicleData({
          ...vehicleData,
          vehicleNumber: validation.formatted || upperValue,
        });
        if (validation.details) {
          toast({
            title: "✅ Valid Vehicle Number",
            description: `${validation.details.state} - RTO ${validation.details.rto}`,
            duration: 2000,
          });
        }
      }
    } catch (error) {
      console.error("Validation error:", error);
    } finally {
      setIsValidatingVehicle(false);
    }
  };

  // Category change handler
  const handleCategoryChange = (value: VehicleCategory) => {
    setSelectedCategory(value);
    setErrors((prev) => ({ ...prev, category: undefined }));
  };

  // Size change handler
  const handleSizeChange = (value: string) => {
    setSelectedSize(value);
    setErrors((prev) => ({ ...prev, size: undefined }));
  };

  // Capacity handlers
  const handleCapacityChange = (e: ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value) || 0;
    const clampedValue = Math.min(Math.max(value, 0), 100);
    setCapacityValue(clampedValue);
    if (clampedValue >= 1) {
      setErrors((prev) => ({ ...prev, capacity: undefined }));
    }
  };

  const incrementCapacity = () => {
    const newValue = Math.min(capacityValue + 1, 100);
    setCapacityValue(newValue);
    setErrors((prev) => ({ ...prev, capacity: undefined }));
  };

  const decrementCapacity = () => {
    const newValue = Math.max(capacityValue - 1, 1);
    setCapacityValue(newValue);
  };

  const handleSubmit = async () => {
    // Validate fields
    const newErrors: typeof errors = {};

    if (!selectedCategory) {
      newErrors.category = "Vehicle category is required";
    }
    if (!selectedSize) {
      newErrors.size = "Vehicle size is required";
    }
    if (capacityValue < 1) {
      newErrors.capacity = "Capacity must be at least 1 ton";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    if (vehicleNumberError) {
      toast({
        title: "❌ Validation Error",
        description: vehicleNumberError,
        variant: "destructive",
      });
      return;
    }

    if (!vehicleData.vehicleNumber.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter vehicle number",
        variant: "destructive",
      });
      return;
    }

    if (!validateDocuments()) return;

    setIsSubmitting(true);

    try {
      // Combine category and size into vehicleType
      const vehicleType = `${selectedCategory} - ${selectedSize}`;
      const capacityString = `${capacityValue} ton${capacityValue > 1 ? "s" : ""}`;

      const dataToSave = {
        vehicleNumber: vehicleData.vehicleNumber,
        vehicleType: vehicleType,
        capacity: capacityString,
        brokerId: vehicleData.brokerId,
        default_driver_id: vehicleData.default_driver_id,
        ratePerTrip: vehicleData.ratePerTrip,
      };

      const documentsData =
        selectedFiles.length > 0
          ? {
              files: selectedFiles,
              metadata: documentMetadata,
            }
          : null;

      onSave(dataToSave, documentsData);
      handleClose();
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

  const handleClose = () => {
    setVehicleData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: "",
      brokerId: "none",
      default_driver_id: "none",
      ratePerTrip: "",
    });
    setSelectedCategory("");
    setSelectedSize("");
    setAvailableSizes([]);
    setCapacityValue(1);
    setSelectedFiles([]);
    setDocumentMetadata({});
    setVehicleNumberError("");
    setErrors({});
    onClose();
  };

  const documentTypes = [
    { value: "RC", label: "RC (Registration Certificate)" },
    { value: "INSURANCE", label: "Insurance" },
    { value: "PERMIT", label: "Permit" },
    { value: "AGREEMENT", label: "Hire Agreement" },
    { value: "OTHER", label: "Other" },
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
              Add Hired Vehicle
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 py-6">
            {/* Vehicle Details */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                Vehicle Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Vehicle Number - Full width */}
                <div className="md:col-span-3">
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Vehicle Number *
                    {isValidatingVehicle && (
                      <Loader2 className="w-3 h-3 ml-2 inline animate-spin text-primary" />
                    )}
                  </Label>
                  <Input
                    value={vehicleData.vehicleNumber}
                    onChange={(e) => handleVehicleNumberChange(e.target.value)}
                    placeholder="e.g., MH-12-AB-1234"
                    disabled={isSubmitting}
                    className={cn(
                      "h-9 text-sm mt-1 uppercase",
                      "border-border dark:border-border",
                      "bg-card",
                      "text-foreground dark:text-white",
                      "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      "focus:ring-2 focus:ring-ring focus:border-primary",
                      vehicleNumberError &&
                        "border-red-500 focus:ring-red-500 focus:border-red-500",
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

                {/* Vehicle Category */}
                <div className="flex-1">
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Vehicle Category *
                  </Label>
                  <Select
                    value={selectedCategory}
                    onValueChange={handleCategoryChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger className="h-9 text-sm mt-1 w-full border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary">
                      <SelectValue placeholder="Select Category" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border dark:border-border">
                      {vehicleCategories.map((category) => (
                        <SelectItem
                          key={category}
                          value={category}
                          className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                        >
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {errors.category}
                    </p>
                  )}
                </div>

                {/* Vehicle Size */}
                <div className="flex-1">
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Vehicle Size *
                  </Label>
                  <Select
                    value={selectedSize}
                    onValueChange={handleSizeChange}
                    disabled={isSubmitting || !selectedCategory}
                  >
                    <SelectTrigger
                      className={cn(
                        "h-9 text-sm mt-1 w-full border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary",
                        !selectedCategory && "opacity-50 cursor-not-allowed",
                      )}
                    >
                      <SelectValue
                        placeholder={
                          selectedCategory
                            ? "Select Size"
                            : "Select category first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border dark:border-border">
                      {availableSizes.map((size) => (
                        <SelectItem
                          key={size}
                          value={size}
                          className="text-foreground dark:text-white hover:bg-accent dark:hover:bg-secondary"
                        >
                          {size}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.size && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {errors.size}
                    </p>
                  )}
                </div>

                {/* Capacity */}
                <div className="flex-1">
                  <Label className="text-xs font-medium text-foreground dark:text-white">
                    Capacity *
                  </Label>
                  <div className="relative mt-1">
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      step={1}
                      value={capacityValue}
                      onChange={handleCapacityChange}
                      disabled={isSubmitting}
                      className={cn(
                        "h-9 w-full text-sm pr-14",
                        "border-border dark:border-border",
                        "bg-card",
                        "text-foreground dark:text-white",
                        "focus:ring-2 focus:ring-ring focus:border-primary",
                        "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                        errors.capacity && "border-red-500",
                      )}
                    />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">
                        tons
                      </span>
                      <div className="flex flex-col">
                        <button
                          type="button"
                          onClick={incrementCapacity}
                          disabled={isSubmitting || capacityValue >= 100}
                          className="h-3.5 w-4 flex items-center justify-center hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <ChevronUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={decrementCapacity}
                          disabled={isSubmitting || capacityValue <= 1}
                          className="h-3.5 w-4 flex items-center justify-center hover:bg-accent rounded-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                        >
                          <ChevronDown className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {errors.capacity && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {errors.capacity}
                    </p>
                  )}
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
                  value={vehicleData.default_driver_id || "none"}
                  onValueChange={(value) =>
                    setVehicleData({ ...vehicleData, default_driver_id: value })
                  }
                  disabled={loadingDrivers || isSubmitting}
                >
                  <SelectTrigger className="h-9 text-sm mt-1 border-border dark:border-border bg-card text-foreground dark:text-white focus:ring-2 focus:ring-ring focus:border-primary">
                    <SelectValue
                      placeholder={
                        loadingDrivers
                          ? "Loading drivers..."
                          : "Select driver (optional)"
                      }
                    />
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
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground mt-1">
                  This driver will be auto-selected for this vehicle
                </p>

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

            {/* Document Upload */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4 text-primary" />
                Documents (Optional)
              </h3>

              <input
                type="file"
                id="hired-document-upload"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="border-2 border-dashed border-border dark:border-border rounded-lg p-4 text-center hover:border-primary dark:hover:border-primary hover:bg-accent dark:hover:bg-primary/5 transition-colors">
                <Upload className="w-8 h-8 mx-auto text-muted-foreground dark:text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mb-2">
                  Upload Vehicle RC & Agreement
                </p>
                <p className="text-[10px] text-muted-foreground dark:text-muted-foreground mb-3">
                  Supported: PDF, JPG, PNG (Max 5MB)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                  onClick={() =>
                    document.getElementById("hired-document-upload")?.click()
                  }
                  disabled={isSubmitting}
                >
                  <Plus className="w-3 h-3 mr-2" />
                  Choose Files
                </Button>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium text-foreground dark:text-white">
                      Selected Files ({selectedFiles.length})
                    </Label>
                    <Badge
                      variant="secondary"
                      className="text-[10px] bg-muted text-foreground dark:text-white border-0"
                    >
                      {formatFileSize(
                        selectedFiles.reduce((acc, file) => acc + file.size, 0),
                      )}
                    </Badge>
                  </div>

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
                            value={
                              documentMetadata[index]?.document_type || "OTHER"
                            }
                            onValueChange={(value: any) =>
                              updateDocumentMetadata(
                                index,
                                "document_type",
                                value,
                              )
                            }
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
                            value={documentMetadata[index]?.expiry_date || ""}
                            onChange={(e) =>
                              updateDocumentMetadata(
                                index,
                                "expiry_date",
                                e.target.value,
                              )
                            }
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
                variant="outline"
                onClick={handleClose}
                size="sm"
                disabled={isSubmitting}
                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
              >
                <X className="w-3.5 h-3.5 mr-2" />
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                size="sm"
                disabled={isSubmitting}
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
                    Add Hired Vehicle
                  </>
                )}
              </Button>
            </div>
          </div>
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
