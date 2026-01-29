import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  Truck,
  Eye,
  CheckCircle,
  AlertCircle,
  User,
  Loader2,
  Building2,
  Shield,
  ShieldCheck,
  Activity,
  Wrench,
  Clock,
  Package,
  FileDown,
  Users,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  XCircle,
  ArrowRight,
  X,
  Upload,
  FileUp,
  Download,
  MapPin,
} from "lucide-react";
import {
  fetchOwnedVehicles,
  fetchHiredVehicles,
  createOwnedVehicle,
  createHiredVehicle,
  verifyOwnedVehicle,
  verifyHiredVehicle,
  createBroker,
  fetchBrokers,
} from "@/api/vehicles";
import { AddVehicleModal } from "./AddVehicleModal";
import { AddHiredVehicleModal } from "./AddHiredVehicleModal";
import { VehicleDetailDrawer } from "./VehicleDetailDrawer";
import { useToast } from "@/hooks/use-toast";
import { AddBrokerModal } from "./AddBrokerModal";
import { uploadVehicleDocument } from "@/api/vehicleDocument";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: string;
  status: string;
  is_owned: boolean;
  is_verified: boolean;
  added_date?: string;
  created_at?: string;
  broker?: {
    id: string;
    name: string;
    contact_person: string;
    phone: string;
    email?: string;
  };
  vehicle_assignments?: Array<{
    id: string;
    booking_id?: string;
    booking?: {
      booking_id: string;
    };
  }>;
  vehicle_documents?: Array<{
    id: string;
    document_type: string;
    file_name: string;
    is_verified: boolean;
    uploaded_date: string;
    expiry_date?: string;
  }>;
  lastLocation?: {
    latitude: number;
    longitude: number;
    recorded_at: string;
    source: string;
  };
}

interface Broker {
  id: string;
  name: string;
  phone: string;
}

// Import types
interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportPreviewData<T> {
  valid: T[];
  invalid: { row: T; errors: ValidationError[] }[];
  duplicates: { row: T; field: string; value: string }[];
}

interface ImportProgress {
  current: number;
  total: number;
  status: "idle" | "validating" | "importing" | "completed" | "error";
  message: string;
}

// ✅ Status configuration (GREEN/RED/ORANGE allowed for status)
const statusConfig = {
  AVAILABLE: {
    label: "Available",
    color:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    icon: CheckCircle,
  },
  OCCUPIED: {
    label: "Occupied",
    color:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    icon: AlertCircle,
  },
  MAINTENANCE: {
    label: "Maintenance",
    color:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    icon: Wrench,
  },
  INACTIVE: {
    label: "Inactive",
    color:
      "bg-[#F3F4F6] text-muted-foreground border-border dark:bg-secondary dark:text-muted-foreground dark:border-border",
    icon: XCircle,
  },
};

// ============================================
// IMPORT VEHICLES MODAL
// ============================================
// ============================================
// IMPORT VEHICLES MODAL (Broker Optional)
// ============================================
const ImportVehiclesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
  brokers: Broker[];
}> = ({ isOpen, onClose, onImportComplete, brokers }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData<any> | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    status: "idle",
    message: "",
  });
  const [step, setStep] = useState<
    "select" | "upload" | "preview" | "importing"
  >("select");
  const [selectedVehicleType, setSelectedVehicleType] = useState<
    "owned" | "hired"
  >("owned");

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreview(null);
      setProgress({ current: 0, total: 0, status: "idle", message: "" });
      setStep("select");
      setSelectedVehicleType("owned");
    }
  }, [isOpen]);

  // File drop handler
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (file) {
        setFile(file);
        processFile(file);
      }
    },
    [selectedVehicleType, brokers],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [
        ".xlsx",
      ],
      "application/vnd.ms-excel": [".xls"],
    },
    maxFiles: 1,
  });

  // Process uploaded file
  const processFile = async (file: File) => {
    setProgress({
      current: 0,
      total: 0,
      status: "validating",
      message: "Reading file...",
    });

    try {
      let data: any[] = [];

      if (file.name.endsWith(".csv")) {
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) =>
            header.trim().toLowerCase().replace(/\s+/g, "_"),
        });
        data = result.data;
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: "",
        });

        if (data.length > 0) {
          const headers = (data[0] as any[]).map((h: string) =>
            h.toString().trim().toLowerCase().replace(/\s+/g, "_"),
          );
          data = data.slice(1).map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index]?.toString().trim() || "";
            });
            return obj;
          });
        }
      }

      await validateData(data);
    } catch (error) {
      console.error("Error processing file:", error);
      toast({
        title: "❌ Error",
        description: "Failed to process file",
        variant: "destructive",
      });
      setProgress({
        current: 0,
        total: 0,
        status: "error",
        message: "Failed to process file",
      });
    }
  };

  // Validate vehicle number format
  const validateVehicleNumber = (number: string): boolean => {
    if (!number) return false;
    const pattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{4}$/i;
    return pattern.test(number.replace(/\s|-/g, ""));
  };

  // Parse date from various formats
  const parseDate = (dateStr: string): string | null => {
    if (!dateStr) return null;

    try {
      const formats = [
        /^(\d{4})-(\d{2})-(\d{2})$/,
        /^(\d{2})\/(\d{2})\/(\d{4})$/,
        /^(\d{2})-(\d{2})-(\d{4})$/,
      ];

      for (const fmt of formats) {
        const match = dateStr.match(fmt);
        if (match) {
          if (fmt === formats[0]) {
            return dateStr;
          } else {
            return `${match[3]}-${match[2]}-${match[1]}`;
          }
        }
      }

      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
    } catch (e) {
      return null;
    }
    return null;
  };

  // Validate data
  const validateData = async (data: any[]) => {
    setProgress({
      current: 0,
      total: data.length,
      status: "validating",
      message: "Validating data...",
    });

    const valid: any[] = [];
    const invalid: { row: any; errors: ValidationError[] }[] = [];
    const vehicleNumbers: string[] = [];

    data.forEach((row) => {
      if (row.vehicle_number) {
        vehicleNumbers.push(
          row.vehicle_number
            .toString()
            .trim()
            .toUpperCase()
            .replace(/\s|-/g, ""),
        );
      }
    });

    let existingVehicles: string[] = [];
    const tableName =
      selectedVehicleType === "owned" ? "owned_vehicles" : "hired_vehicles";

    if (vehicleNumbers.length > 0) {
      const { data: existingData } = await supabase
        .from(tableName)
        .select("vehicle_number")
        .in("vehicle_number", vehicleNumbers);

      if (existingData) {
        existingVehicles = existingData.map((v) =>
          v.vehicle_number.toUpperCase(),
        );
      }
    }

    const duplicates: { row: any; field: string; value: string }[] = [];

    // Create broker name to ID map for hired vehicles (only if brokers exist)
    const brokerMap = new Map<string, string>();
    if (selectedVehicleType === "hired" && brokers.length > 0) {
      brokers.forEach((b) => {
        brokerMap.set(b.name.toLowerCase(), b.id);
      });
    }

    data.forEach((row, index) => {
      const errors: ValidationError[] = [];

      const vehicleNumber =
        row.vehicle_number
          ?.toString()
          .trim()
          .toUpperCase()
          .replace(/\s|-/g, "") || "";

      const processedRow: any = {
        vehicle_number: vehicleNumber,
        vehicle_type: row.vehicle_type?.toString().trim() || "",
        capacity: row.capacity?.toString().trim() || "",
      };

      if (selectedVehicleType === "owned") {
        processedRow.status =
          (row.status?.toString().trim().toUpperCase() as any) || "AVAILABLE";
        processedRow.registration_date = parseDate(row.registration_date);
        processedRow.insurance_expiry = parseDate(row.insurance_expiry);
        processedRow.fitness_expiry = parseDate(row.fitness_expiry);
        processedRow.permit_expiry = parseDate(row.permit_expiry);
        processedRow.purchase_date = parseDate(row.purchase_date);
        processedRow.purchase_price = row.purchase_price
          ? parseFloat(row.purchase_price)
          : null;
        processedRow.fuel_type = row.fuel_type?.toString().trim() || null;
        processedRow.mileage_reading = row.mileage_reading
          ? parseInt(row.mileage_reading)
          : null;

        if (
          !["AVAILABLE", "OCCUPIED", "MAINTENANCE", "INACTIVE"].includes(
            processedRow.status,
          )
        ) {
          processedRow.status = "AVAILABLE";
        }
      } else {
        // Hired vehicle - broker is OPTIONAL
        const brokerName = row.broker_name?.toString().trim() || "";
        processedRow.broker_name = brokerName;
        processedRow.broker_id = null; // Default to null

        // Only map broker if name is provided AND broker exists in database
        if (brokerName && brokerMap.size > 0) {
          const brokerId = brokerMap.get(brokerName.toLowerCase());
          if (brokerId) {
            processedRow.broker_id = brokerId;
          } else {
            // Broker name provided but not found - show warning, not error
            errors.push({
              row: index + 1,
              field: "broker_name",
              message: `Broker "${brokerName}" not found in database. Vehicle will be imported without broker.`,
            });
          }
        }

        processedRow.status =
          (row.status?.toString().trim().toUpperCase() as any) || "AVAILABLE";
        processedRow.hire_date =
          parseDate(row.hire_date) || new Date().toISOString().split("T")[0];
        processedRow.rate_per_trip = row.rate_per_trip
          ? parseFloat(row.rate_per_trip)
          : null;

        if (
          !["AVAILABLE", "OCCUPIED", "RELEASED"].includes(processedRow.status)
        ) {
          processedRow.status = "AVAILABLE";
        }
      }

      // Required field validation
      if (!processedRow.vehicle_number) {
        errors.push({
          row: index + 1,
          field: "vehicle_number",
          message: "Vehicle number is required",
        });
      } else if (!validateVehicleNumber(processedRow.vehicle_number)) {
        errors.push({
          row: index + 1,
          field: "vehicle_number",
          message: "Invalid vehicle number format",
        });
      }

      if (!processedRow.vehicle_type) {
        errors.push({
          row: index + 1,
          field: "vehicle_type",
          message: "Vehicle type is required",
        });
      }

      if (!processedRow.capacity) {
        errors.push({
          row: index + 1,
          field: "capacity",
          message: "Capacity is required",
        });
      }

      // Check for duplicates
      if (existingVehicles.includes(processedRow.vehicle_number)) {
        duplicates.push({
          row: processedRow,
          field: "vehicle_number",
          value: processedRow.vehicle_number,
        });
      } else if (errors.length > 0) {
        // Only add to invalid if there are actual errors (not broker warnings)
        const criticalErrors = errors.filter((e) => e.field !== "broker_name");
        if (criticalErrors.length > 0) {
          invalid.push({ row: processedRow, errors });
        } else {
          // Only broker warning, still valid
          valid.push(processedRow);
        }
      } else {
        valid.push(processedRow);
      }

      setProgress((prev) => ({
        ...prev,
        current: index + 1,
        message: `Validated ${index + 1} of ${data.length} rows`,
      }));
    });

    setPreview({ valid, invalid, duplicates });
    setStep("preview");
    setProgress({
      current: data.length,
      total: data.length,
      status: "idle",
      message: "Validation complete",
    });
  };

  // Import data to database
  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) {
      toast({
        title: "❌ No valid data",
        description: "No valid rows to import",
        variant: "destructive",
      });
      return;
    }

    setStep("importing");
    setProgress({
      current: 0,
      total: preview.valid.length,
      status: "importing",
      message: "Starting import...",
    });

    const BATCH_SIZE = 50;
    const batches = [];

    for (let i = 0; i < preview.valid.length; i += BATCH_SIZE) {
      batches.push(preview.valid.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let errorCount = 0;

    const tableName =
      selectedVehicleType === "owned" ? "owned_vehicles" : "hired_vehicles";

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        const dataToInsert = batch.map((row: any) => {
          if (selectedVehicleType === "owned") {
            return {
              vehicle_number: row.vehicle_number,
              vehicle_type: row.vehicle_type,
              capacity: row.capacity,
              status: row.status || "AVAILABLE",
              registration_date: row.registration_date || null,
              insurance_expiry: row.insurance_expiry || null,
              fitness_expiry: row.fitness_expiry || null,
              permit_expiry: row.permit_expiry || null,
              purchase_date: row.purchase_date || null,
              purchase_price: row.purchase_price || null,
              fuel_type: row.fuel_type || null,
              mileage_reading: row.mileage_reading || null,
              is_verified: false,
            };
          } else {
            return {
              vehicle_number: row.vehicle_number,
              vehicle_type: row.vehicle_type,
              capacity: row.capacity,
              broker_id: row.broker_id || null, // NULL if no broker
              status: row.status || "AVAILABLE",
              hire_date:
                row.hire_date || new Date().toISOString().split("T")[0],
              rate_per_trip: row.rate_per_trip || null,
              is_verified: false,
            };
          }
        });

        const { error } = await supabase.from(tableName).insert(dataToInsert);

        if (error) throw error;

        successCount += batch.length;

        setProgress({
          current: Math.min((i + 1) * BATCH_SIZE, preview.valid.length),
          total: preview.valid.length,
          status: "importing",
          message: `Imported ${successCount} of ${preview.valid.length} vehicles`,
        });
      } catch (error) {
        console.error("Batch import error:", error);
        errorCount += batch.length;
      }
    }

    setProgress({
      current: preview.valid.length,
      total: preview.valid.length,
      status: "completed",
      message: `Import completed: ${successCount} successful, ${errorCount} failed`,
    });

    toast({
      title: "✅ Import Completed",
      description: `Successfully imported ${successCount} vehicles${
        errorCount > 0 ? `, ${errorCount} failed` : ""
      }`,
    });

    setTimeout(() => {
      onImportComplete();
      onClose();
    }, 2000);
  };

  // Download template
  const downloadTemplate = () => {
    let template: string[][];

    if (selectedVehicleType === "owned") {
      template = [
        [
          "vehicle_number",
          "vehicle_type",
          "capacity",
          "status",
          "registration_date",
          "insurance_expiry",
          "fitness_expiry",
          "permit_expiry",
          "purchase_date",
          "purchase_price",
          "fuel_type",
          "mileage_reading",
        ],
        [
          "MH12AB1234",
          "20FT Container",
          "20 Tons",
          "AVAILABLE",
          "2020-01-15",
          "2025-06-30",
          "2025-03-15",
          "2025-12-31",
          "2020-01-01",
          "1500000",
          "Diesel",
          "50000",
        ],
        [
          "MH14CD5678",
          "32FT Container",
          "32 Tons",
          "AVAILABLE",
          "2021-03-20",
          "2025-08-15",
          "2025-04-20",
          "2026-01-31",
          "2021-03-01",
          "2500000",
          "Diesel",
          "35000",
        ],
      ];
    } else {
      template = [
        [
          "vehicle_number",
          "vehicle_type",
          "capacity",
          "broker_name",
          "status",
          "hire_date",
          "rate_per_trip",
        ],
        [
          "GJ05EF9012",
          "20FT Container",
          "20 Tons",
          "ABC Transport",
          "AVAILABLE",
          "2024-01-01",
          "15000",
        ],
        [
          "RJ14GH3456",
          "32FT Container",
          "32 Tons",
          "",
          "AVAILABLE",
          "2024-02-15",
          "25000",
        ],
        [
          "KA09IJ7890",
          "40FT Container",
          "40 Tons",
          "XYZ Logistics",
          "AVAILABLE",
          "2024-03-01",
          "35000",
        ],
      ];
    }

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${selectedVehicleType}_vehicles`);
    XLSX.writeFile(wb, `${selectedVehicleType}_vehicles_import_template.xlsx`);

    toast({
      title: "✅ Template Downloaded",
      description: "Use this template to prepare your import data",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-gradient-to-br from-background via-background to-muted/5">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-xl flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Import Vehicles
          </DialogTitle>
        </DialogHeader>

        {/* STEP 1: Select Vehicle Type */}
        {step === "select" && (
          <div className="space-y-6 py-4">
            <div>
              <p className="text-sm text-muted-foreground mb-4">
                Choose the type of vehicles you want to import
              </p>

              <div className="grid grid-cols-2 gap-4">
                <Card
                  className={cn(
                    "cursor-pointer border-2 transition-all hover:shadow-md",
                    selectedVehicleType === "owned"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                  onClick={() => setSelectedVehicleType("owned")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          "p-3 rounded-lg",
                          selectedVehicleType === "owned"
                            ? "bg-primary/10"
                            : "bg-muted",
                        )}
                      >
                        <Shield className="w-6 h-6 text-primary" />
                      </div>
                      {selectedVehicleType === "owned" && (
                        <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">Owned Vehicles</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Import vehicles owned by your company
                    </p>
                  </CardContent>
                </Card>

                <Card
                  className={cn(
                    "cursor-pointer border-2 transition-all hover:shadow-md",
                    selectedVehicleType === "hired"
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50",
                  )}
                  onClick={() => setSelectedVehicleType("hired")}
                >
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          "p-3 rounded-lg",
                          selectedVehicleType === "hired"
                            ? "bg-primary/10"
                            : "bg-muted",
                        )}
                      >
                        <Building2 className="w-6 h-6 text-primary" />
                      </div>
                      {selectedVehicleType === "hired" && (
                        <CheckCircle className="w-5 h-5 text-primary ml-auto" />
                      )}
                    </div>
                    <h3 className="font-semibold text-lg">Hired Vehicles</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Import vehicles hired from brokers
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Upload CSV or Excel file with {selectedVehicleType} vehicle data
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={downloadTemplate}
                className="h-9 hover:bg-primary/10 hover:border-primary transition-all"
              >
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
                isDragActive
                  ? "border-primary bg-primary/5 scale-[1.02]"
                  : "border-border hover:border-primary/50 hover:bg-muted/30",
              )}
            >
              <input {...getInputProps()} />
              <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="font-medium text-lg">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">
                    Drop your file here, or click to browse
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports CSV and Excel files (.csv, .xlsx, .xls)
                  </p>
                </div>
              )}
            </div>

            {progress.status === "validating" && (
              <div className="space-y-2">
                <Progress
                  value={(progress.current / progress.total) * 100}
                  className="h-2"
                />
                <p className="text-sm text-center text-muted-foreground animate-pulse">
                  {progress.message}
                </p>
              </div>
            )}
          </div>
        )}

        {/* STEP 3: Preview */}
        {step === "preview" && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-green-600">
                        {preview.valid.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Valid Rows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-red-200 bg-gradient-to-br from-red-50/50 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-red-100 rounded-lg">
                      <XCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">
                        {preview.invalid.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Invalid Rows
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50/50 to-transparent">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-yellow-100 rounded-lg">
                      <AlertCircle className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {preview.duplicates.length}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Duplicates
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="valid" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger
                  value="valid"
                  className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700"
                >
                  Valid ({preview.valid.length})
                </TabsTrigger>
                <TabsTrigger
                  value="invalid"
                  className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700"
                >
                  Invalid ({preview.invalid.length})
                </TabsTrigger>
                <TabsTrigger
                  value="duplicates"
                  className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700"
                >
                  Duplicates ({preview.duplicates.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="valid">
                <ScrollArea className="h-[300px] w-full rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Vehicle Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Status</TableHead>
                        {selectedVehicleType === "hired" && (
                          <TableHead>Broker</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.valid.map((row, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {index + 1}
                          </TableCell>
                          <TableCell className="font-medium">
                            {row.vehicle_number}
                          </TableCell>
                          <TableCell>{row.vehicle_type}</TableCell>
                          <TableCell>{row.capacity}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{row.status}</Badge>
                          </TableCell>
                          {selectedVehicleType === "hired" && (
                            <TableCell>
                              {row.broker_name || (
                                <span className="text-muted-foreground text-xs">
                                  No broker
                                </span>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="invalid">
                <ScrollArea className="h-[300px] w-full">
                  <div className="space-y-2 p-2">
                    {preview.invalid.map((item, index) => (
                      <Card key={index} className="border-red-200 bg-red-50/50">
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                Row {index + 1}:{" "}
                                {item.row.vehicle_number || "No vehicle number"}
                              </p>
                              {item.errors.map((error, i) => (
                                <p
                                  key={i}
                                  className="text-sm text-red-600 mt-1"
                                >
                                  • {error.field}: {error.message}
                                </p>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="duplicates">
                <ScrollArea className="h-[300px] w-full rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Vehicle Number</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.duplicates.map((item, index) => (
                        <TableRow key={index} className="hover:bg-muted/30">
                          <TableCell className="font-medium">
                            {item.row.vehicle_number}
                          </TableCell>
                          <TableCell>{item.row.vehicle_type}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              Already exists in database
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* STEP 4: Importing */}
        {step === "importing" && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              {progress.status === "completed" ? (
                <div className="relative">
                  <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
                  <div className="absolute inset-0 blur-xl bg-green-500/20 animate-pulse rounded-full w-16 h-16 mx-auto" />
                </div>
              ) : (
                <div className="relative">
                  <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
                  <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full w-16 h-16 mx-auto" />
                </div>
              )}
              <p className="text-lg font-medium">{progress.message}</p>
            </div>
            <Progress
              value={(progress.current / progress.total) * 100}
              className="h-2"
            />
            <p className="text-sm text-center text-muted-foreground">
              {progress.current} of {progress.total} vehicles imported
            </p>
          </div>
        )}

        <DialogFooter>
          {step === "select" && (
            <>
              <Button variant="outline" onClick={onClose} className="h-10">
                Cancel
              </Button>
              <Button
                onClick={() => setStep("upload")}
                className="h-10 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
              >
                Continue
              </Button>
            </>
          )}
          {step === "upload" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("select")}
                className="h-10"
              >
                Back
              </Button>
            </>
          )}
          {step === "preview" && (
            <>
              <Button
                variant="outline"
                onClick={() => setStep("upload")}
                className="h-10 hover:bg-muted"
              >
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={preview?.valid.length === 0}
                className="h-10 bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
              >
                Import {preview?.valid.length} Valid Vehicles
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const VehicleManagement = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("owned");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddHiredVehicleOpen, setIsAddHiredVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  useEffect(() => {
    loadVehicles();
    loadBrokers();
  }, []);

  const loadBrokers = async () => {
    try {
      setLoadingBrokers(true);
      const data = await fetchBrokers();
      setBrokers(data || []);
    } catch (error) {
      console.error("Error loading brokers:", error);
      setBrokers([]);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const handleAddBroker = async (brokerData: any) => {
    try {
      const newBroker = await createBroker({
        name: brokerData.name,
        contact_person: brokerData.contactPerson,
        phone: brokerData.phone,
        email: brokerData.email,
        city: brokerData.city,
      });

      toast({
        title: "✅ Broker Added",
        description: `${brokerData.name} has been added as a broker`,
      });

      await loadBrokers();
      setIsAddBrokerOpen(false);
      setIsAddHiredVehicleOpen(true);

      return newBroker;
    } catch (error: any) {
      console.error("Error adding broker:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to add broker",
        variant: "destructive",
      });
    }
  };

  // Add column hover styles
  useEffect(() => {
    const styleElement = document.createElement("style");
    styleElement.innerHTML = `
      .vehicle-mgmt-table td {
        position: relative;
      }
      .vehicle-mgmt-table td::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: -1px;
        bottom: -1px;
        background: transparent;
        pointer-events: none;
        transition: background-color 0.2s ease;
        z-index: 0;
      }
      .vehicle-mgmt-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(7)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(8)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table td > * {
        position: relative;
        z-index: 1;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const [ownedData, hiredData] = await Promise.all([
        fetchOwnedVehicles(),
        fetchHiredVehicles(),
      ]);

      const combinedVehicles = [
        ...ownedData.map((v) => ({
          ...v,
          is_owned: true,
          is_verified: v.is_verified || false,
          added_date: v.created_at,
        })),
        ...hiredData.map((v) => ({
          ...v,
          is_owned: false,
          is_verified: v.is_verified || false,
          added_date: v.created_at,
        })),
      ];

      setVehicles(combinedVehicles);
    } catch (error) {
      console.error("Error loading vehicles:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleImportComplete = () => {
    setSearchTerm("");
    loadVehicles();
  };

  const handleAddHiredVehicleClick = async () => {
    if (brokers.length === 0 && !loadingBrokers) {
      await loadBrokers();
    }
    setIsAddHiredVehicleOpen(true);
  };

  const handleAddHiredVehicle = async (vehicleData: any, documents?: any) => {
    try {
      const brokerIdToSave =
        vehicleData.brokerId === "none" ? null : vehicleData.brokerId;
      const driverIdToSave =
        vehicleData.default_driver_id === "none"
          ? null
          : vehicleData.default_driver_id;

      const newVehicle = await createHiredVehicle({
        vehicle_number: vehicleData.vehicleNumber,
        vehicle_type: vehicleData.vehicleType,
        capacity: vehicleData.capacity,
        broker_id: brokerIdToSave,
        default_driver_id: driverIdToSave,
        rate_per_trip: vehicleData.ratePerTrip
          ? parseFloat(vehicleData.ratePerTrip)
          : undefined,
      });

      if (documents && documents.files.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < documents.files.length; i++) {
          const file = documents.files[i];
          const metadata = documents.metadata[i];

          try {
            await uploadVehicleDocument({
              vehicle_id: newVehicle.id,
              vehicle_type: "HIRED",
              document_type: metadata.document_type,
              file: file,
              expiry_date: metadata.expiry_date,
            });
            uploadedCount++;
          } catch (error) {
            failedCount++;
            console.error(`❌ Failed to upload: ${file.name}`, error);
          }
        }

        if (uploadedCount > 0) {
          toast({
            title: "✅ Documents Uploaded",
            description: `${uploadedCount} document(s) uploaded successfully`,
          });
        }

        if (failedCount > 0) {
          toast({
            title: "⚠️ Some Uploads Failed",
            description: `${failedCount} document(s) failed to upload`,
            variant: "destructive",
          });
        }
      }

      await loadVehicles();
      setIsAddHiredVehicleOpen(false);

      toast({
        title: "✅ Success",
        description: `Vehicle ${vehicleData.vehicleNumber} added successfully`,
      });
    } catch (error) {
      console.error("Error adding hired vehicle:", error);
      toast({
        title: "❌ Error",
        description: "Failed to add hired vehicle",
        variant: "destructive",
      });
    }
  };

  const allOwnedVehicles = vehicles.filter((v) => v.is_owned);
  const allHiredVehicles = vehicles.filter((v) => !v.is_owned);

  const handleAddVehicle = async (vehicleData: any, documents?: any) => {
    try {
      if (
        !vehicleData.vehicle_number ||
        !vehicleData.vehicle_type ||
        !vehicleData.capacity
      ) {
        toast({
          title: "❌ Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const newVehicle = await createOwnedVehicle({
        vehicle_number: vehicleData.vehicle_number,
        vehicle_type: vehicleData.vehicle_type,
        capacity: vehicleData.capacity,
        default_driver_id: vehicleData.default_driver_id || null,
        registration_date: vehicleData.registration_date || null,
        insurance_expiry: vehicleData.insurance_expiry || null,
        fitness_expiry: vehicleData.fitness_expiry || null,
        permit_expiry: vehicleData.permit_expiry || null,
      });

      if (documents && documents.files && documents.files.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < documents.files.length; i++) {
          const file = documents.files[i];
          const metadata = documents.metadata[i] || { document_type: "OTHER" };

          try {
            await uploadVehicleDocument({
              vehicle_id: newVehicle.id,
              vehicle_type: "OWNED",
              document_type: metadata.document_type,
              file: file,
              expiry_date: metadata.expiry_date || null,
            });

            uploadedCount++;
          } catch (error) {
            failedCount++;
            console.error(`❌ Failed to upload: ${file.name}`, error);
          }
        }

        if (uploadedCount > 0) {
          toast({
            title: "✅ Documents Uploaded",
            description: `${uploadedCount} document(s) uploaded successfully`,
          });
        }

        if (failedCount > 0) {
          toast({
            title: "⚠️ Some Uploads Failed",
            description: `${failedCount} document(s) failed to upload`,
            variant: "destructive",
          });
        }
      }

      await loadVehicles();
      setIsAddVehicleOpen(false);

      toast({
        title: "✅ Vehicle Added",
        description: `Vehicle ${vehicleData.vehicle_number} has been added to your fleet`,
      });
    } catch (error: any) {
      console.error("❌ Error adding owned vehicle:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to add vehicle",
        variant: "destructive",
      });
    }
  };

  const handleVerifyVehicle = async (vehicleId: string, isOwned: boolean) => {
    try {
      if (isOwned) {
        await verifyOwnedVehicle(vehicleId, true);
      } else {
        await verifyHiredVehicle(vehicleId, true);
      }

      await loadVehicles();

      toast({
        title: "✅ Vehicle Verified",
        description: "Vehicle has been marked as verified",
      });
    } catch (error: any) {
      console.error("Error verifying vehicle:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to verify vehicle",
        variant: "destructive",
      });
    }
  };

  const filteredVehicles = vehicles.filter((vehicle) => {
    const matchesSearch =
      vehicle.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.broker?.name || "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || vehicle.status === statusFilter;
    const matchesTab =
      activeTab === "owned" ? vehicle.is_owned : !vehicle.is_owned;
    return matchesSearch && matchesStatus && matchesTab;
  });

  const openVehicleDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailDrawerOpen(true);
  };

  const ownedVehicles = filteredVehicles.filter((v) => v.is_owned);
  const hiredVehicles = filteredVehicles.filter((v) => !v.is_owned);

  const stats = {
    total: vehicles.length,
    owned: allOwnedVehicles.length,
    hired: allHiredVehicles.length,
    available: vehicles.filter((v) => v.status === "AVAILABLE").length,
    occupied: vehicles.filter((v) => v.status === "OCCUPIED").length,
    maintenance: vehicles.filter((v) => v.status === "MAINTENANCE").length,
    verified: vehicles.filter((v) => v.is_verified).length,
    unverified: vehicles.filter((v) => !v.is_verified).length,
  };

  const handleExport = () => {
    const headers =
      activeTab === "owned"
        ? [
            "Vehicle Number",
            "Type",
            "Capacity",
            "Status",
            "Verified",
            "Assigned Booking",
          ]
        : [
            "Vehicle Number",
            "Type",
            "Capacity",
            "Status",
            "Broker",
            "Contact",
            "Verified",
            "Assigned Booking",
          ];

    const rows = filteredVehicles.map((vehicle) => {
      if (activeTab === "owned") {
        return [
          vehicle.vehicle_number,
          vehicle.vehicle_type,
          vehicle.capacity,
          vehicle.status,
          vehicle.is_verified ? "Yes" : "No",
          vehicle.vehicle_assignments?.[0]?.booking?.booking_id || "-",
        ];
      } else {
        return [
          vehicle.vehicle_number,
          vehicle.vehicle_type,
          vehicle.capacity,
          vehicle.status,
          vehicle.broker?.name || "-",
          vehicle.broker?.contact_person || "-",
          vehicle.is_verified ? "Yes" : "No",
          vehicle.vehicle_assignments?.[0]?.booking?.booking_id || "-",
        ];
      }
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(","),
      )
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_vehicles_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Exported Successfully",
      description: `${filteredVehicles.length} vehicles exported to CSV`,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground dark:text-muted-foreground animate-pulse">
          Loading vehicles...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ CARD 1: Stats & Buttons */}
      <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-4">
        {/* Stats - Single Card with Dividers */}
        <div className="bg-card border border-border dark:border-border rounded-xl flex-1 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-0 h-full">
            {/* Total */}
            <div className="sm:px-6 py-4 first:pl-0 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Truck className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Total
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.total}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Owned */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Shield className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Owned
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.owned}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Hired */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Building2 className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Hired
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.hired}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Verified */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <ShieldCheck className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Verified
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.verified}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Unverified */}
            <div className="sm:px-6 py-4 last:pr-0 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Clock className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Unverified
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.unverified}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons - Right Side */}
        <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[220px]">
          <Button
            size="sm"
            onClick={() => setIsAddVehicleOpen(true)}
            className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddHiredVehicleClick}
            disabled={loadingBrokers}
            className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hired Vehicle
          </Button>

          {/* Import & Export Row */}
          <div className="flex gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsImportModalOpen(true)}
                    className="flex-1 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Import
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Import vehicles from CSV/Excel</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExport}
                    className="flex-1 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export vehicles to CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>

      {/* ✅ CARD 2: Tabs + Search + Table */}
      <div className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        {/* Tabs Section */}
        <div className="border-b border-border dark:border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-4 sm:px-6 overflow-x-auto scrollbar-none">
              <TabsList className="bg-transparent border-0 p-0 h-auto inline-flex min-w-max">
                <TabsTrigger
                  value="owned"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3.5 transition-all text-xs sm:text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                >
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Owned ({allOwnedVehicles.length})
                </TabsTrigger>
                <TabsTrigger
                  value="hired"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3.5 transition-all text-xs sm:text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                >
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Hired ({allHiredVehicles.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>

        {/* Search and Filters Section */}
        <div className="p-4 sm:p-6 border-b border-border dark:border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Bar */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
              <Input
                placeholder="Search vehicles, broker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-10 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent dark:hover:bg-secondary"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 border-border dark:border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border dark:border-border">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="OCCUPIED">Occupied</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Owned Vehicles Tab */}
            <TabsContent value="owned" className="mt-0">
              <div className="mb-4 relative overflow-hidden rounded-xl border border-border">
                {/* Real Map Background */}
                <div
                  className="absolute inset-0 opacity-[0.15] dark:opacity-[0.08]"
                  style={{
                    backgroundImage: `url("https://static.vecteezy.com/system/resources/previews/025/372/226/large_2x/custom-location-map-interface-for-app-and-website-vector.jpg")`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/60" />

                {/* Animated location dots */}
                <div className="absolute top-4 right-16 h-2 w-2 rounded-full bg-primary animate-ping" />
                <div className="absolute bottom-3 right-1/3 h-2 w-2 rounded-full bg-green-500 animate-ping [animation-delay:0.7s]" />
                <div className="absolute top-1/2 right-1/4 h-2 w-2 rounded-full bg-orange-500 animate-ping [animation-delay:1.2s]" />

                {/* Static dots (vehicle positions) */}
                <div className="absolute top-4 right-16 h-2 w-2 rounded-full bg-primary" />
                <div className="absolute bottom-3 right-1/3 h-2 w-2 rounded-full bg-green-500" />
                <div className="absolute top-1/2 right-1/4 h-2 w-2 rounded-full bg-orange-500" />

                {/* Content */}
                <div className="relative flex items-center justify-between gap-4 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-lg">
                      <MapPin className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground">
                        Live Map View
                      </h4>
                      <p className="text-sm text-muted-foreground">
                        Track all your owned vehicles on a single map
                      </p>
                    </div>
                  </div>

                  <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1">
                    Coming Soon
                  </Badge>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="vehicle-mgmt-table">
                  <TableHeader>
                    <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Vehicle No.
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Type
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Capacity
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Verification
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Booking
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownedVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted rounded-full">
                              <Truck className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                            </div>
                            <div className="text-muted-foreground dark:text-muted-foreground">
                              <p className="text-lg font-medium">
                                No owned vehicles found
                              </p>
                              <p className="text-sm mt-1">
                                Add your first vehicle to get started
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={() => setIsAddVehicleOpen(true)}
                                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Vehicle
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setIsImportModalOpen(true)}
                                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      ownedVehicles.map((vehicle) => {
                        const status =
                          statusConfig[
                            vehicle.status as keyof typeof statusConfig
                          ] || statusConfig.AVAILABLE;
                        const StatusIcon = status.icon;

                        return (
                          <TableRow
                            key={vehicle.id}
                            className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors"
                          >
                            <TableCell>
                              <div className="font-semibold flex items-center gap-2 text-foreground dark:text-white">
                                <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                {vehicle.vehicle_number}
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">
                              {vehicle.vehicle_type}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-border dark:border-border"
                              >
                                {vehicle.capacity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "gap-1 text-xs font-medium",
                                  status.color,
                                )}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {vehicle.is_verified ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  Unverified
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {vehicle.vehicle_assignments?.length > 0 ? (
                                <Badge variant="secondary" className="bg-muted">
                                  {
                                    vehicle.vehicle_assignments[0].booking
                                      ?.booking_id
                                  }
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          openVehicleDetail(vehicle)
                                        }
                                        className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {!vehicle.is_verified && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleVerifyVehicle(
                                        vehicle.id,
                                        vehicle.is_owned,
                                      )
                                    }
                                    className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {ownedVehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-muted rounded-full">
                        <Truck className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                      </div>
                      <div className="text-muted-foreground dark:text-muted-foreground">
                        <p className="text-lg font-medium">
                          No owned vehicles found
                        </p>
                        <p className="text-sm mt-1">
                          Add your first vehicle to get started
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  ownedVehicles.map((vehicle) => {
                    const status =
                      statusConfig[
                        vehicle.status as keyof typeof statusConfig
                      ] || statusConfig.AVAILABLE;
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={vehicle.id}
                        className="bg-card border border-border dark:border-border rounded-lg p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                              <span className="font-semibold text-sm text-foreground dark:text-white">
                                {vehicle.vehicle_number}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground dark:text-muted-foreground ml-6">
                              {vehicle.vehicle_type}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openVehicleDetail(vehicle)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!vehicle.is_verified && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleVerifyVehicle(
                                    vehicle.id,
                                    vehicle.is_owned,
                                  )
                                }
                                className="h-8 w-8 border-border dark:border-border"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("gap-1 text-xs", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {vehicle.is_verified ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                              <ShieldCheck className="w-3 h-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Unverified
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm pt-2 border-t border-border dark:border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground dark:text-muted-foreground text-xs">
                              Capacity:
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs border-border dark:border-border"
                            >
                              {vehicle.capacity}
                            </Badge>
                          </div>
                          {vehicle.vehicle_assignments?.length > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground dark:text-muted-foreground text-xs">
                                Booking:
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-muted"
                              >
                                {
                                  vehicle.vehicle_assignments[0].booking
                                    ?.booking_id
                                }
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Hired Vehicles Tab */}
            <TabsContent value="hired" className="mt-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="vehicle-mgmt-table">
                  <TableHeader>
                    <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Vehicle No.
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Type
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Capacity
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Broker
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        Verification
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Booking
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hiredVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted rounded-full">
                              <Building2 className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                            </div>
                            <div className="text-muted-foreground dark:text-muted-foreground">
                              <p className="text-lg font-medium">
                                No hired vehicles found
                              </p>
                              <p className="text-sm mt-1">
                                Add your first hired vehicle to get started
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                onClick={handleAddHiredVehicleClick}
                                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Hired Vehicle
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => setIsImportModalOpen(true)}
                                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Import
                              </Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      hiredVehicles.map((vehicle) => {
                        const status =
                          statusConfig[
                            vehicle.status as keyof typeof statusConfig
                          ] || statusConfig.AVAILABLE;
                        const StatusIcon = status.icon;

                        return (
                          <TableRow
                            key={vehicle.id}
                            className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors"
                          >
                            <TableCell>
                              <div className="font-semibold flex items-center gap-2 text-foreground dark:text-white">
                                <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                {vehicle.vehicle_number}
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">
                              {vehicle.vehicle_type}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-border dark:border-border"
                              >
                                {vehicle.capacity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  "gap-1 text-xs font-medium",
                                  status.color,
                                )}
                              >
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {vehicle.broker ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-sm flex items-center gap-1 text-foreground dark:text-white">
                                    <Building2 className="w-3 h-3 text-muted-foreground dark:text-muted-foreground" />
                                    {vehicle.broker.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {vehicle.broker.contact_person}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vehicle.is_verified ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  Unverified
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {vehicle.vehicle_assignments?.length > 0 ? (
                                <Badge variant="secondary" className="bg-muted">
                                  {
                                    vehicle.vehicle_assignments[0].booking
                                      ?.booking_id
                                  }
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                                  -
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() =>
                                          openVehicleDetail(vehicle)
                                        }
                                        className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {!vehicle.is_verified && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                      handleVerifyVehicle(vehicle.id, false)
                                    }
                                    className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {hiredVehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-muted rounded-full">
                        <Building2 className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                      </div>
                      <div className="text-muted-foreground dark:text-muted-foreground">
                        <p className="text-lg font-medium">
                          No hired vehicles found
                        </p>
                        <p className="text-sm mt-1">
                          Add your first hired vehicle to get started
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  hiredVehicles.map((vehicle) => {
                    const status =
                      statusConfig[
                        vehicle.status as keyof typeof statusConfig
                      ] || statusConfig.AVAILABLE;
                    const StatusIcon = status.icon;

                    return (
                      <div
                        key={vehicle.id}
                        className="bg-card border border-border dark:border-border rounded-lg p-4 space-y-3 shadow-sm"
                      >
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                              <span className="font-semibold text-sm text-foreground dark:text-white">
                                {vehicle.vehicle_number}
                              </span>
                            </div>
                            <div className="text-xs text-muted-foreground dark:text-muted-foreground ml-6">
                              {vehicle.vehicle_type}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openVehicleDetail(vehicle)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!vehicle.is_verified && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() =>
                                  handleVerifyVehicle(vehicle.id, false)
                                }
                                className="h-8 w-8 border-border dark:border-border"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {vehicle.broker && (
                          <div className="flex items-start gap-2 text-xs bg-muted rounded p-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground dark:text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-foreground dark:text-white">
                                {vehicle.broker.name}
                              </div>
                              <div className="text-muted-foreground dark:text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3" />
                                {vehicle.broker.contact_person}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("gap-1 text-xs", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {vehicle.is_verified ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                              <ShieldCheck className="w-3 h-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Unverified
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm pt-2 border-t border-border dark:border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground dark:text-muted-foreground text-xs">
                              Capacity:
                            </span>
                            <Badge
                              variant="outline"
                              className="text-xs border-border dark:border-border"
                            >
                              {vehicle.capacity}
                            </Badge>
                          </div>
                          {vehicle.vehicle_assignments?.length > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground dark:text-muted-foreground text-xs">
                                Booking:
                              </span>
                              <Badge
                                variant="secondary"
                                className="text-xs bg-muted"
                              >
                                {
                                  vehicle.vehicle_assignments[0].booking
                                    ?.booking_id
                                }
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      <AddVehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onSave={handleAddVehicle}
      />

      <AddHiredVehicleModal
        isOpen={isAddHiredVehicleOpen}
        onClose={() => setIsAddHiredVehicleOpen(false)}
        onSave={handleAddHiredVehicle}
        brokers={brokers || []}
        onAddBroker={() => {
          setIsAddHiredVehicleOpen(false);
          setIsAddBrokerOpen(true);
        }}
      />

      <VehicleDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        vehicle={selectedVehicle}
      />

      <AddBrokerModal
        isOpen={isAddBrokerOpen}
        onClose={() => setIsAddBrokerOpen(false)}
        onSave={handleAddBroker}
      />

      <ImportVehiclesModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        onImportComplete={handleImportComplete}
        vehicleType={activeTab as "owned" | "hired"}
        brokers={brokers}
      />
    </div>
  );
};
