import { useState, useEffect, ChangeEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  AlertCircle
} from "lucide-react";
import { validateVehicleNumber } from "@/utils/vehicleValidation";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { fetchUnassignedDrivers } from "@/api/vehicles";
import {
  validateFile,
  formatFileSize,
  uploadVehicleDocument
} from "@/api/vehicleDocument";
import { AddDriverModal } from "../bookings/AddDriverModal";
import { cn } from "@/lib/utils";

// ✅ NEW: Document metadata interface
interface DocumentMetadata {
  document_type: 'RC' | 'INSURANCE' | 'PERMIT' | 'AGREEMENT' | 'OTHER';
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
    documents?: { files: File[], metadata: Record<number, DocumentMetadata> } | null
  ) => void;  // ✅ Updated signature
  brokers: any[];
  onAddBroker?: () => void;
}
export const AddHiredVehicleModal = ({
  isOpen,
  onClose,
  onSave,
  brokers = [],
  onAddBroker
}: AddHiredVehicleModalProps) => {
  const { toast } = useToast();
  const [vehicleData, setVehicleData] = useState<VehicleFormData>({
    vehicleNumber: "",
    vehicleType: "",
    capacity: "",
    brokerId: "none",
    default_driver_id: "none",
    ratePerTrip: ""
  });

  const [unassignedDrivers, setUnassignedDrivers] = useState<any[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);

  // ✅ NEW: Document upload states
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentMetadata, setDocumentMetadata] = useState<Record<number, DocumentMetadata>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({
    current: 0,
    total: 0,
    currentFileName: ''
  });
  // Add these states
  const [vehicleNumberError, setVehicleNumberError] = useState<string>("");
  const [isValidatingVehicle, setIsValidatingVehicle] = useState(false);
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
      console.error('Error loading drivers:', error);
    } finally {
      setLoadingDrivers(false);
    }
  };

  const handleAddDriver = async (driverData: any) => {
    try {
      const { createDriver } = await import('@/api/drivers');
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

  // ✅ NEW: File selection handler
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate each file
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

      // Initialize metadata for new files
      const newMetadata = { ...documentMetadata };
      validFiles.forEach((_, index) => {
        const fileIndex = selectedFiles.length + index;
        newMetadata[fileIndex] = {
          document_type: 'OTHER' // Default type
        };
      });
      setDocumentMetadata(newMetadata);

      toast({
        title: "✅ Files Selected",
        description: `${validFiles.length} file(s) ready to upload`
      });
    }

    // Reset input
    e.target.value = '';
  };

  // ✅ NEW: Remove file handler
  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));

    // Remove metadata
    const newMetadata = { ...documentMetadata };
    delete newMetadata[index];

    // Re-index remaining metadata
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

  // ✅ NEW: Validate documents before submission
  const validateDocuments = (): boolean => {
    if (selectedFiles.length === 0) return true; // No files is okay

    // Check if all files have document type selected
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

  // ✅ NEW: Upload documents after vehicle creation
  const uploadDocuments = async (vehicleId: string) => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress({
      current: 0,
      total: selectedFiles.length,
      currentFileName: ''
    });

    const uploadedDocs: any[] = [];
    const failedDocs: any[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const metadata = documentMetadata[i];

      try {
        setUploadProgress({
          current: i + 1,
          total: selectedFiles.length,
          currentFileName: file.name
        });

        const uploadedDoc = await uploadVehicleDocument({
          vehicle_id: vehicleId,
          vehicle_type: 'HIRED',
          document_type: metadata.document_type,
          file: file,
          expiry_date: metadata.expiry_date
        });

        uploadedDocs.push(uploadedDoc);
      } catch (error: any) {
        console.error('Failed to upload:', file.name, error);
        failedDocs.push({ fileName: file.name, error: error.message });
      }
    }

    setIsUploading(false);

    // Show results
    if (uploadedDocs.length > 0) {
      toast({
        title: "✅ Documents Uploaded",
        description: `${uploadedDocs.length} document(s) uploaded successfully`,
      });
    }

    if (failedDocs.length > 0) {
      toast({
        title: "⚠️ Some Uploads Failed",
        description: `${failedDocs.length} document(s) failed to upload`,
        variant: "destructive"
      });
    }
  };
  // Add this function
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
          vehicleNumber: validation.formatted || upperValue
        });

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
  // ✅ UPDATED: Submit handler with document upload
  const handleSubmit = async () => {
    if (vehicleNumberError) {
      toast({
        title: "❌ Validation Error",
        description: vehicleNumberError,
        variant: "destructive"
      });
      return;
    }
    // Validate vehicle data
    if (!vehicleData.vehicleNumber.trim() || !vehicleData.vehicleType || !vehicleData.capacity) {
      toast({
        title: "Validation Error",
        description: "Please fill in all vehicle details",
        variant: "destructive"
      });
      return;
    }

    // Validate documents
    if (!validateDocuments()) {
      return;
    }

    const dataToSave = {
      vehicleNumber: vehicleData.vehicleNumber,
      vehicleType: vehicleData.vehicleType,
      capacity: vehicleData.capacity,
      brokerId: vehicleData.brokerId,
      default_driver_id: vehicleData.default_driver_id,
      ratePerTrip: vehicleData.ratePerTrip
    };

    // ✅ NEW: Prepare documents data
    const documentsData = selectedFiles.length > 0 ? {
      files: selectedFiles,
      metadata: documentMetadata
    } : null;

    console.log("📤 Submitting vehicle with documents:", {
      vehicle: dataToSave,
      documentsCount: selectedFiles.length
    });

    // ✅ Pass documents to parent
    onSave(dataToSave, documentsData);

    // Reset form
    setVehicleData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: "",
      brokerId: "none",
      default_driver_id: "none",
      ratePerTrip: ""
    });
    setSelectedFiles([]);
    setDocumentMetadata({});

    onClose();
  };

  const handleClose = () => {
    setVehicleData({
      vehicleNumber: "",
      vehicleType: "",
      capacity: "",
      brokerId: "none",
      default_driver_id: "none",
      ratePerTrip: ""
    });
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
    "Trailer - 53ft",
    "Mini Truck",
    "Pickup Truck",
    "Flatbed Truck"
  ];

  const capacities = [
    "1 ton",
    "2 tons",
    "5 tons",
    "8 tons",
    "12 tons",
    "15 tons",
    "20 tons",
    "25 tons",
    "30 tons"
  ];

  const documentTypes = [
    { value: 'RC', label: 'RC (Registration Certificate)' },
    { value: 'INSURANCE', label: 'Insurance' },
    { value: 'PERMIT', label: 'Permit' },
    { value: 'AGREEMENT', label: 'Hire Agreement' },
    { value: 'OTHER', label: 'Other' }
  ];

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Add Hired Vehicle
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Vehicle Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Vehicle Details</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vehicleNumber">
                    Vehicle Number *
                    {isValidatingVehicle && (
                      <Loader2 className="w-3 h-3 ml-2 inline animate-spin text-primary" />
                    )}
                  </Label>
                  <Input
                    id="vehicleNumber"
                    value={vehicleData.vehicleNumber}
                    onChange={(e) => handleVehicleNumberChange(e.target.value)}
                    placeholder="GJ-01-AB-1234"
                    className={cn(
                      vehicleNumberError && "border-destructive focus-visible:ring-destructive"
                    )}
                  />
                  {vehicleNumberError && (
                    <p className="text-sm text-destructive mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {vehicleNumberError}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: XX-00-XX-0000 (State-RTO-Series-Number)
                  </p>
                </div>

                <div>
                  <Label htmlFor="vehicleType">Vehicle Type *</Label>
                  <Select
                    value={vehicleData.vehicleType}
                    onValueChange={(value) => setVehicleData({ ...vehicleData, vehicleType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicleTypes.map((type) => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="capacity">Capacity *</Label>
                  <Select
                    value={vehicleData.capacity}
                    onValueChange={(value) => setVehicleData({ ...vehicleData, capacity: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select capacity" />
                    </SelectTrigger>
                    <SelectContent>
                      {capacities.map((capacity) => (
                        <SelectItem key={capacity} value={capacity}>{capacity}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Default Driver */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <User className="w-4 h-4" />
                Default Driver (Optional)
              </h3>
              <div>
                <Label>Assign Default Driver</Label>
                <Select
                  value={vehicleData.default_driver_id || "none"}
                  onValueChange={(value) => setVehicleData({ ...vehicleData, default_driver_id: value })}
                  disabled={loadingDrivers}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingDrivers ? "Loading drivers..." : "Select driver (optional)"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Default Driver</SelectItem>
                    {unassignedDrivers.length > 0 &&
                      unassignedDrivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name} - {driver.phone}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">
                  This driver will be auto-selected when assigning this vehicle to bookings
                </p>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-2 w-full"
                  onClick={() => setIsAddDriverOpen(true)}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Driver
                </Button>
              </div>
            </div>

            {/* ✅ NEW: Document Upload Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Documents (Optional)
              </h3>

              {/* File Input (Hidden) */}
              <input
                type="file"
                id="document-upload"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Upload Button/Dropzone */}
              <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                <Upload className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground mb-2">
                  Upload Vehicle RC & Agreement
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supported: PDF, JPG, PNG (Max 5MB per file)
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('document-upload')?.click()}
                  disabled={isUploading}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Choose Files
                </Button>
              </div>

              {/* Selected Files Preview */}
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
                        {/* File Info */}
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
                            disabled={isUploading}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>

                        {/* Document Metadata */}
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs">Document Type *</Label>
                            <Select
                              value={documentMetadata[index]?.document_type || 'OTHER'}
                              onValueChange={(value: any) =>
                                updateDocumentMetadata(index, 'document_type', value)
                              }
                              disabled={isUploading}
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
                              disabled={isUploading}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Upload Progress */}
              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Uploading {uploadProgress.current} of {uploadProgress.total}...
                    </span>
                    <span className="font-medium">
                      {Math.round((uploadProgress.current / uploadProgress.total) * 100)}%
                    </span>
                  </div>
                  <Progress
                    value={(uploadProgress.current / uploadProgress.total) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground truncate">
                    {uploadProgress.currentFileName}
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isUploading}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Add Hired Vehicle
                </>
              )}
            </Button>
          </DialogFooter>
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