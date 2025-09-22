import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  MapPin,
  Package,
  AlertTriangle,
  Users,
  Loader2,
  Download,
  Upload,
  FileUp,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchWarehouses } from "@/api/warehouses";
import { AddWarehouseModal } from "./AddWarehouseModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

// Import Types
interface ImportWarehouseRow {
  name: string;
  city: string;
  state: string;
  address: string;
  capacity: string;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  status?: string;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface ImportPreviewData {
  valid: ImportWarehouseRow[];
  invalid: { row: ImportWarehouseRow; errors: ValidationError[] }[];
  duplicates: { row: ImportWarehouseRow; field: string; value: string }[];
}

interface ImportProgress {
  current: number;
  total: number;
  status: 'idle' | 'validating' | 'importing' | 'completed' | 'error';
  message: string;
}

interface Warehouse {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  capacity: number;
  current_stock: number;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  status: string;
}

// Import Modal Component
const ImportWarehousesModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}> = ({ isOpen, onClose, onImportComplete }) => {
  const { toast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreviewData | null>(null);
  const [progress, setProgress] = useState<ImportProgress>({
    current: 0,
    total: 0,
    status: 'idle',
    message: ''
  });
  const [step, setStep] = useState<'upload' | 'preview' | 'importing'>('upload');

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setPreview(null);
      setProgress({ current: 0, total: 0, status: 'idle', message: '' });
      setStep('upload');
    }
  }, [isOpen]);

  // File drop handler
  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      setFile(file);
      processFile(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1
  });

  // Process uploaded file
  const processFile = async (file: File) => {
    setProgress({ current: 0, total: 0, status: 'validating', message: 'Reading file...' });

    try {
      let data: any[] = [];

      if (file.name.endsWith('.csv')) {
        // Parse CSV
        const text = await file.text();
        const result = Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_')
        });
        data = result.data;
      } else {
        // Parse Excel
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        data = XLSX.utils.sheet_to_json(firstSheet, {
          header: 1,
          defval: ''
        });

        // Convert to object format with headers
        if (data.length > 0) {
          const headers = data[0].map((h: string) =>
            h.toString().trim().toLowerCase().replace(/\s+/g, '_')
          );
          data = data.slice(1).map((row: any[]) => {
            const obj: any = {};
            headers.forEach((header: string, index: number) => {
              obj[header] = row[index]?.toString().trim() || '';
            });
            return obj;
          });
        }
      }

      // Validate and check duplicates
      await validateData(data);
    } catch (error) {
      console.error('Error processing file:', error);
      toast({
        title: "Error",
        description: "Failed to process file. Please check the format.",
        variant: "destructive"
      });
      setProgress({ current: 0, total: 0, status: 'error', message: 'Failed to process file' });
    }
  };

  // Validate data
  const validateData = async (data: any[]) => {
    setProgress({
      current: 0,
      total: data.length,
      status: 'validating',
      message: 'Validating data...'
    });

    const valid: ImportWarehouseRow[] = [];
    const invalid: { row: ImportWarehouseRow; errors: ValidationError[] }[] = [];
    const duplicates: { row: ImportWarehouseRow; field: string; value: string }[] = [];

    // Get existing warehouses for duplicate check
    const { data: existingWarehouses } = await supabase
      .from('warehouses')
      .select('name, manager_email');

    const existingNames = existingWarehouses?.map(w => w.name.toLowerCase()) || [];
    const existingEmails = existingWarehouses?.map(w => w.manager_email.toLowerCase()) || [];

    // Validate each row
    data.forEach((row, index) => {
      const errors: ValidationError[] = [];
      const processedRow: ImportWarehouseRow = {
        name: row.name?.toString().trim() || '',
        city: row.city?.toString().trim() || '',
        state: row.state?.toString().trim() || '',
        address: row.address?.toString().trim() || '',
        capacity: row.capacity?.toString().trim() || '',
        manager_name: row.manager_name?.toString().trim() || '',
        manager_phone: row.manager_phone?.toString().trim() || '',
        manager_email: row.manager_email?.toString().trim().toLowerCase() || '',
        status: (row.status?.toString().trim().toUpperCase() as any) || 'ACTIVE'
      };

      // Required field validation
      if (!processedRow.name) {
        errors.push({ row: index + 1, field: 'name', message: 'Warehouse name is required' });
      }
      if (!processedRow.city) {
        errors.push({ row: index + 1, field: 'city', message: 'City is required' });
      }
      if (!processedRow.state) {
        errors.push({ row: index + 1, field: 'state', message: 'State is required' });
      }
      if (!processedRow.address) {
        errors.push({ row: index + 1, field: 'address', message: 'Address is required' });
      }
      if (!processedRow.capacity) {
        errors.push({ row: index + 1, field: 'capacity', message: 'Capacity is required' });
      }
      if (!processedRow.manager_name) {
        errors.push({ row: index + 1, field: 'manager_name', message: 'Manager name is required' });
      }
      if (!processedRow.manager_phone) {
        errors.push({ row: index + 1, field: 'manager_phone', message: 'Manager phone is required' });
      }
      if (!processedRow.manager_email) {
        errors.push({ row: index + 1, field: 'manager_email', message: 'Manager email is required' });
      }

      // Format validation
      if (processedRow.capacity && isNaN(Number(processedRow.capacity))) {
        errors.push({ row: index + 1, field: 'capacity', message: 'Capacity must be a number' });
      }
      if (processedRow.capacity && Number(processedRow.capacity) <= 0) {
        errors.push({ row: index + 1, field: 'capacity', message: 'Capacity must be greater than 0' });
      }
      if (processedRow.manager_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(processedRow.manager_email)) {
        errors.push({ row: index + 1, field: 'manager_email', message: 'Invalid email format' });
      }

      // Status validation
      if (!['ACTIVE', 'INACTIVE'].includes(processedRow.status || '')) {
        processedRow.status = 'ACTIVE';
      }

      // Check duplicates
      if (existingNames.includes(processedRow.name.toLowerCase())) {
        duplicates.push({
          row: processedRow,
          field: 'name',
          value: processedRow.name
        });
      } else if (existingEmails.includes(processedRow.manager_email.toLowerCase())) {
        duplicates.push({
          row: processedRow,
          field: 'manager_email',
          value: processedRow.manager_email
        });
      } else if (errors.length > 0) {
        invalid.push({ row: processedRow, errors });
      } else {
        valid.push(processedRow);
      }

      setProgress(prev => ({
        ...prev,
        current: index + 1,
        message: `Validated ${index + 1} of ${data.length} rows`
      }));
    });

    setPreview({ valid, invalid, duplicates });
    setStep('preview');
    setProgress({
      current: data.length,
      total: data.length,
      status: 'idle',
      message: 'Validation complete'
    });
  };

  // Import data to database
  const handleImport = async () => {
    if (!preview || preview.valid.length === 0) {
      toast({
        title: "No valid data",
        description: "No valid rows to import",
        variant: "destructive"
      });
      return;
    }

    setStep('importing');
    setProgress({
      current: 0,
      total: preview.valid.length,
      status: 'importing',
      message: 'Starting import...'
    });

    const BATCH_SIZE = 25;
    const batches = [];

    for (let i = 0; i < preview.valid.length; i += BATCH_SIZE) {
      batches.push(preview.valid.slice(i, i + BATCH_SIZE));
    }

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];

      try {
        // Prepare data for insert
        const dataToInsert = batch.map(row => ({
          name: row.name,
          code: `W${Date.now().toString().slice(-6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`, // Generate unique code
          city: row.city,
          state: row.state,
          address: row.address,
          capacity: Number(row.capacity),
          current_stock: 0, // New warehouses start with 0 stock
          manager_name: row.manager_name,
          manager_phone: row.manager_phone,
          manager_email: row.manager_email,
          status: row.status || 'ACTIVE'
        }));

        const { error } = await supabase
          .from('warehouses')
          .insert(dataToInsert);

        if (error) throw error;

        successCount += batch.length;

        setProgress({
          current: Math.min((i + 1) * BATCH_SIZE, preview.valid.length),
          total: preview.valid.length,
          status: 'importing',
          message: `Imported ${successCount} of ${preview.valid.length} warehouses`
        });

      } catch (error) {
        console.error('Batch import error:', error);
        errorCount += batch.length;
      }
    }

    setProgress({
      current: preview.valid.length,
      total: preview.valid.length,
      status: 'completed',
      message: `Import completed: ${successCount} successful, ${errorCount} failed`
    });

    toast({
      title: "Import Completed",
      description: `Successfully imported ${successCount} warehouses${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
    });

    setTimeout(() => {
      onImportComplete();
      onClose();
    }, 2000);
  };

  // Download template
  const downloadTemplate = () => {
    const template = [
      ['name', 'city', 'state', 'address', 'capacity', 'manager_name', 'manager_phone', 'manager_email', 'status'],
      ['Mumbai Central Hub', 'Mumbai', 'Maharashtra', 'Plot 123, MIDC, Andheri East', '500', 'Rahul Sharma', '9876543210', 'rahul@warehouse.com', 'ACTIVE'],
      ['Delhi Warehouse', 'Delhi', 'Delhi', '456 Industrial Area, Okhla', '750', 'Priya Singh', '9876543211', 'priya@warehouse.com', 'ACTIVE']
    ];

    const ws = XLSX.utils.aoa_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Warehouses');
    XLSX.writeFile(wb, 'warehouses_import_template.xlsx');

    toast({
      title: "Template Downloaded",
      description: "Use this template to prepare your import data",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Import Warehouses</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Upload CSV or Excel file with warehouse data
              </p>
              <Button variant="outline" size="sm" onClick={downloadTemplate}>
                <Download className="w-4 h-4 mr-2" />
                Download Template
              </Button>
            </div>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}`}
            >
              <input {...getInputProps()} />
              <FileUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="font-medium">{file.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {(file.size / 1024).toFixed(2)} KB
                  </p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Drop your file here, or click to browse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Supports CSV and Excel files (.csv, .xlsx, .xls)
                  </p>
                </div>
              )}
            </div>

            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Required Fields:</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Name - Warehouse name (must be unique)</li>
                <li>City & State - Location details</li>
                <li>Address - Complete address</li>
                <li>Capacity - Maximum storage capacity (number)</li>
                <li>Manager Name, Phone, Email - Manager details</li>
                <li>Status (optional) - ACTIVE or INACTIVE (defaults to ACTIVE)</li>
              </ul>
            </div>

            {progress.status === 'validating' && (
              <div className="space-y-2">
                <Progress value={(progress.current / progress.total) * 100} />
                <p className="text-sm text-center text-muted-foreground">
                  {progress.message}
                </p>
              </div>
            )}
          </div>
        )}

        {step === 'preview' && preview && (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">{preview.valid.length}</p>
                      <p className="text-sm text-muted-foreground">Valid Rows</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-500" />
                    <div>
                      <p className="text-2xl font-bold">{preview.invalid.length}</p>
                      <p className="text-sm text-muted-foreground">Invalid Rows</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{preview.duplicates.length}</p>
                      <p className="text-sm text-muted-foreground">Duplicates</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="valid" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="valid">
                  Valid ({preview.valid.length})
                </TabsTrigger>
                <TabsTrigger value="invalid">
                  Invalid ({preview.invalid.length})
                </TabsTrigger>
                <TabsTrigger value="duplicates">
                  Duplicates ({preview.duplicates.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="valid">
                <ScrollArea className="h-[300px] w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">#</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Capacity</TableHead>
                        <TableHead>Manager</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.valid.map((row, index) => (
                        <TableRow key={index}>
                          <TableCell>{index + 1}</TableCell>
                          <TableCell>{row.name}</TableCell>
                          <TableCell>{row.city}, {row.state}</TableCell>
                          <TableCell>{row.capacity}</TableCell>
                          <TableCell>{row.manager_name}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="invalid">
                <ScrollArea className="h-[300px] w-full">
                  <div className="space-y-2">
                    {preview.invalid.map((item, index) => (
                      <Card key={index}>
                        <CardContent className="pt-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">
                                Row {index + 1}: {item.row.name || 'No name'}
                              </p>
                              {item.errors.map((error, i) => (
                                <p key={i} className="text-sm text-red-500">
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
                <ScrollArea className="h-[300px] w-full">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Warehouse Name</TableHead>
                        <TableHead>Duplicate Field</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.duplicates.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.row.name}</TableCell>
                          <TableCell>
                            <Badge variant="destructive">
                              {item.field.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>{item.value}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {step === 'importing' && (
          <div className="space-y-4 py-8">
            <div className="text-center">
              {progress.status === 'completed' ? (
                <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              ) : (
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin text-primary" />
              )}
              <p className="text-lg font-medium">{progress.message}</p>
            </div>
            <Progress value={(progress.current / progress.total) * 100} />
            <p className="text-sm text-center text-muted-foreground">
              {progress.current} of {progress.total} warehouses imported
            </p>
          </div>
        )}

        <DialogFooter>
          {step === 'preview' && (
            <>
              <Button variant="outline" onClick={() => setStep('upload')}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={preview?.valid.length === 0}
              >
                Import {preview?.valid.length} Valid Rows
              </Button>
            </>
          )}
          {step === 'upload' && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// Main WarehouseList Component
export const WarehouseList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await fetchWarehouses();
      setWarehouses(data);
    } catch (error) {
      console.error('Error loading warehouses:', error);
      toast({
        title: "Error",
        description: "Failed to load warehouses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockUtilization = (currentStock: number, capacity: number) => {
    return (currentStock / capacity) * 100;
  };

  const getCapacityColor = (utilization: number) => {
    if (utilization <= 60) return "text-success";
    if (utilization <= 85) return "text-warning";
    return "text-destructive";
  };

  // Filter and sort warehouses
  const filteredWarehouses = warehouses
    .filter(warehouse => {
      const matchesSearch = warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.state.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = filterState === "all" || warehouse.state === filterState;
      return matchesSearch && matchesState;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "capacity":
          return b.capacity - a.capacity;
        case "stock":
          return b.current_stock - a.current_stock;
        case "utilization":
          return getStockUtilization(b.current_stock, b.capacity) - getStockUtilization(a.current_stock, a.capacity);
        default:
          return 0;
      }
    });

  const uniqueStates = [...new Set(warehouses.map(w => w.state))];

  const handleWarehouseClick = (warehouseId: string) => {
    navigate(`/warehouses/${warehouseId}`);
  };

  const handleAddWarehouse = async (warehouseData: any) => {
    try {
      const { createWarehouse } = await import('@/api/warehouses');
      await createWarehouse(warehouseData);

      await loadWarehouses();

      toast({
        title: "Warehouse Added Successfully",
        description: `${warehouseData.name} has been added to the system`,
      });
    } catch (error) {
      console.error('Error adding warehouse:', error);
      toast({
        title: "Error",
        description: "Failed to add warehouse. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Export to CSV function
  const handleExport = () => {
    const headers = [
      "Warehouse Name",
      "Code",
      "City",
      "State",
      "Address",
      "Capacity",
      "Current Stock",
      "Utilization %",
      "Manager Name",
      "Manager Phone",
      "Manager Email",
      "Status"
    ];

    const rows = filteredWarehouses.map(warehouse => [
      warehouse.name,
      warehouse.code,
      warehouse.city,
      warehouse.state,
      warehouse.address,
      warehouse.capacity,
      warehouse.current_stock,
      getStockUtilization(warehouse.current_stock, warehouse.capacity).toFixed(1) + "%",
      warehouse.manager_name,
      warehouse.manager_phone,
      warehouse.manager_email,
      warehouse.status
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `warehouses_export_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "Exported Successfully",
      description: `${filteredWarehouses.length} warehouses exported to CSV`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading warehouses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Warehouses</h1>
          <p className="text-muted-foreground">Manage warehouse operations and inventory</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImportModal(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Import
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Add Warehouse
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search warehouses by name, city, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="capacity">Capacity</SelectItem>
                <SelectItem value="stock">Current Stock</SelectItem>
                <SelectItem value="utilization">Utilization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.map((warehouse) => {
          const utilization = getStockUtilization(warehouse.current_stock, warehouse.capacity);
          const isNearCapacity = utilization > 85;

          return (
            <Card
              key={warehouse.id}
              className="hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => handleWarehouseClick(warehouse.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold">{warehouse.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      {warehouse.city}, {warehouse.state}
                    </div>
                  </div>
                  {isNearCapacity && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Near Capacity
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Capacity Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Stock Utilization</span>
                      <span className={getCapacityColor(utilization)}>
                        {warehouse.current_stock}/{warehouse.capacity} ({utilization.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${utilization <= 60 ? 'bg-success' :
                          utilization <= 85 ? 'bg-warning' : 'bg-destructive'
                          }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{warehouse.current_stock}</p>
                        <p className="text-xs text-muted-foreground">Units in Stock</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{warehouse.manager_name}</p>
                        <p className="text-xs text-muted-foreground">Manager</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWarehouseClick(warehouse.id);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredWarehouses.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No warehouses found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterState !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Get started by adding your first warehouse."}
            </p>
            {(!searchTerm && filterState === "all") && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AddWarehouseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddWarehouse}
      />

      <ImportWarehousesModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImportComplete={loadWarehouses}
      />
    </div>
  );
};