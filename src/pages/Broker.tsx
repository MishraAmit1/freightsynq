import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
    Building2,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Phone,
    Mail,
    User,
    Loader2,
    Download,
    Upload,
    FileUp,
    CheckCircle,
    XCircle,
    AlertCircle,
    Users,
    TrendingUp,
    FileDown,
    Building,
    UserCheck,
    Shield,
    ArrowUpRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

// Add styles for column hover effect
const tableStyles = `
  <style>
    .broker-table td {
      position: relative;
    }
    .broker-table td::before {
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
    .broker-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
    .broker-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
    .broker-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
    .broker-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
    .broker-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
    .broker-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
    .broker-table td > * {
      position: relative;
      z-index: 1;
    }
  </style>
`;

// Types
interface Broker {
    id: string;
    name: string;
    contact_person: string;
    phone: string;
    email?: string;
    status?: string;
    created_at?: string;
}

interface BrokerFormData {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
}

interface ImportBrokerRow {
    name: string;
    contact_person: string;
    phone: string;
    email?: string;
    status?: string;
}

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

interface ImportPreviewData {
    valid: ImportBrokerRow[];
    invalid: { row: ImportBrokerRow; errors: ValidationError[] }[];
    duplicates: { row: ImportBrokerRow; field: string; value: string }[];
}

interface ImportProgress {
    current: number;
    total: number;
    status: 'idle' | 'validating' | 'importing' | 'completed' | 'error';
    message: string;
}

// Import Modal Component with Enhanced Styling
const ImportBrokersModal: React.FC<{
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
                title: "❌ Error",
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

        const valid: ImportBrokerRow[] = [];
        const invalid: { row: ImportBrokerRow; errors: ValidationError[] }[] = [];
        const duplicates: { row: ImportBrokerRow; field: string; value: string }[] = [];

        // Get existing brokers for duplicate check
        const { data: existingBrokers } = await supabase
            .from('brokers')
            .select('name, phone, email');

        const existingNames = existingBrokers?.map(b => b.name.toLowerCase()) || [];
        const existingPhones = existingBrokers?.map(b => b.phone) || [];
        const existingEmails = existingBrokers?.map(b => b.email?.toLowerCase()).filter(Boolean) || [];

        // Validate each row
        data.forEach((row, index) => {
            const errors: ValidationError[] = [];
            const processedRow: ImportBrokerRow = {
                name: row.name?.toString().trim() || row.company_name?.toString().trim() || '',
                contact_person: row.contact_person?.toString().trim() || '',
                phone: row.phone?.toString().trim() || '',
                email: row.email?.toString().trim().toLowerCase() || '',
                status: (row.status?.toString().trim().toUpperCase() as any) || 'ACTIVE'
            };

            // Required field validation
            if (!processedRow.name) {
                errors.push({ row: index + 1, field: 'name', message: 'Company name is required' });
            }
            if (!processedRow.contact_person) {
                errors.push({ row: index + 1, field: 'contact_person', message: 'Contact person is required' });
            }
            if (!processedRow.phone) {
                errors.push({ row: index + 1, field: 'phone', message: 'Phone is required' });
            }

            // Format validation
            if (processedRow.phone && processedRow.phone.length < 10) {
                errors.push({ row: index + 1, field: 'phone', message: 'Phone must be at least 10 digits' });
            }
            if (processedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(processedRow.email)) {
                errors.push({ row: index + 1, field: 'email', message: 'Invalid email format' });
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
            } else if (existingPhones.includes(processedRow.phone)) {
                duplicates.push({
                    row: processedRow,
                    field: 'phone',
                    value: processedRow.phone
                });
            } else if (processedRow.email && existingEmails.includes(processedRow.email.toLowerCase())) {
                duplicates.push({
                    row: processedRow,
                    field: 'email',
                    value: processedRow.email
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
                title: "❌ No valid data",
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

        const BATCH_SIZE = 50;
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
                    contact_person: row.contact_person,
                    phone: row.phone,
                    email: row.email || null,
                    status: row.status || 'ACTIVE'
                }));

                const { error } = await supabase
                    .from('brokers')
                    .insert(dataToInsert);

                if (error) throw error;

                successCount += batch.length;

                setProgress({
                    current: Math.min((i + 1) * BATCH_SIZE, preview.valid.length),
                    total: preview.valid.length,
                    status: 'importing',
                    message: `Imported ${successCount} of ${preview.valid.length} brokers`
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
            title: "✅ Import Completed",
            description: `Successfully imported ${successCount} brokers${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });

        setTimeout(() => {
            onImportComplete();
            onClose();
        }, 2000);
    };

    // Download template
    const downloadTemplate = () => {
        const template = [
            ['name', 'contact_person', 'phone', 'email', 'status'],
            ['ABC Transport Co', 'John Doe', '9876543210', 'john@abctransport.com', 'ACTIVE'],
            ['XYZ Logistics', 'Jane Smith', '9876543211', 'jane@xyzlogistics.com', 'ACTIVE'],
            ['Quick Movers', 'Raj Kumar', '9876543212', '', 'ACTIVE']
        ];

        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Brokers');
        XLSX.writeFile(wb, 'brokers_import_template.xlsx');

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
                        Import Brokers
                    </DialogTitle>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Upload CSV or Excel file with broker data
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={downloadTemplate}
                                className="hover:bg-primary/10 hover:border-primary transition-all"
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
                                    : "border-border hover:border-primary/50 hover:bg-muted/30"
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
                                    <p className="font-medium">Drop your file here, or click to browse</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Supports CSV and Excel files (.csv, .xlsx, .xls)
                                    </p>
                                </div>
                            )}
                        </div>

                        <div className="bg-gradient-to-r from-primary/10 to-transparent p-4 rounded-lg border border-primary/20">
                            <h4 className="font-medium mb-2 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-primary" />
                                Required Fields:
                            </h4>
                            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside ml-6">
                                <li><span className="font-medium">name</span> - Company name (must be unique)</li>
                                <li><span className="font-medium">contact_person</span> - Contact person name</li>
                                <li><span className="font-medium">phone</span> - Phone number (minimum 10 digits)</li>
                                <li><span className="font-medium">email</span> (optional) - Email address</li>
                                <li><span className="font-medium">status</span> (optional) - ACTIVE or INACTIVE (defaults to ACTIVE)</li>
                            </ul>
                        </div>

                        {progress.status === 'validating' && (
                            <div className="space-y-2">
                                <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                                <p className="text-sm text-center text-muted-foreground animate-pulse">
                                    {progress.message}
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {step === 'preview' && preview && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <Card className="border-green-200 bg-gradient-to-br from-green-50/50 to-transparent">
                                <CardContent className="pt-6">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-green-100 rounded-lg">
                                            <CheckCircle className="w-5 h-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold text-green-600">{preview.valid.length}</p>
                                            <p className="text-sm text-muted-foreground">Valid Rows</p>
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
                                            <p className="text-2xl font-bold text-red-600">{preview.invalid.length}</p>
                                            <p className="text-sm text-muted-foreground">Invalid Rows</p>
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
                                            <p className="text-2xl font-bold text-yellow-600">{preview.duplicates.length}</p>
                                            <p className="text-sm text-muted-foreground">Duplicates</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Tabs defaultValue="valid" className="w-full">
                            <TabsList className="grid w-full grid-cols-3">
                                <TabsTrigger value="valid" className="data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
                                    Valid ({preview.valid.length})
                                </TabsTrigger>
                                <TabsTrigger value="invalid" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
                                    Invalid ({preview.invalid.length})
                                </TabsTrigger>
                                <TabsTrigger value="duplicates" className="data-[state=active]:bg-yellow-100 data-[state=active]:text-yellow-700">
                                    Duplicates ({preview.duplicates.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="valid">
                                <ScrollArea className="h-[300px] w-full rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead className="w-[50px]">#</TableHead>
                                                <TableHead>Company Name</TableHead>
                                                <TableHead>Contact Person</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.valid.map((row, index) => (
                                                <TableRow key={index} className="hover:bg-muted/30">
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell>{row.contact_person}</TableCell>
                                                    <TableCell>{row.phone}</TableCell>
                                                    <TableCell>{row.email || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant={row.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                            className={row.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : ''}
                                                        >
                                                            {row.status}
                                                        </Badge>
                                                    </TableCell>
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
                                                                Row {index + 1}: {item.row.name || 'No name'}
                                                            </p>
                                                            {item.errors.map((error, i) => (
                                                                <p key={i} className="text-sm text-red-600 mt-1">
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
                                                <TableHead>Company Name</TableHead>
                                                <TableHead>Duplicate Field</TableHead>
                                                <TableHead>Value</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.duplicates.map((item, index) => (
                                                <TableRow key={index} className="hover:bg-muted/30">
                                                    <TableCell className="font-medium">{item.row.name}</TableCell>
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
                        <Progress value={(progress.current / progress.total) * 100} className="h-2" />
                        <p className="text-sm text-center text-muted-foreground">
                            {progress.current} of {progress.total} brokers imported
                        </p>
                    </div>
                )}

                <DialogFooter>
                    {step === 'preview' && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setStep('upload')}
                                className="hover:bg-muted"
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleImport}
                                disabled={preview?.valid.length === 0}
                                className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
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

// Edit/Add Broker Modal Component with Enhanced Styling
const BrokerModal = ({
    isOpen,
    onClose,
    onSave,
    broker = null,
    title = "Add New Broker"
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (brokerData: BrokerFormData) => Promise<void>;
    broker?: Broker | null;
    title?: string;
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [brokerData, setBrokerData] = useState<BrokerFormData>({
        name: "",
        contactPerson: "",
        phone: "",
        email: ""
    });

    useEffect(() => {
        if (broker) {
            setBrokerData({
                name: broker.name || "",
                contactPerson: broker.contact_person || "",
                phone: broker.phone || "",
                email: broker.email || ""
            });
        } else {
            setBrokerData({
                name: "",
                contactPerson: "",
                phone: "",
                email: ""
            });
        }
    }, [broker, isOpen]);

    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!brokerData.name.trim() || !brokerData.contactPerson.trim() || !brokerData.phone.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        if (brokerData.phone.length < 10) {
            toast({
                title: "❌ Validation Error",
                description: "Please enter a valid phone number",
                variant: "destructive"
            });
            return;
        }

        if (brokerData.email && !brokerData.email.includes('@')) {
            toast({
                title: "❌ Validation Error",
                description: "Please enter a valid email address",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            await onSave(brokerData);
            handleClose();
        } catch (error) {
            console.error('Error saving broker:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setBrokerData({
            name: "",
            contactPerson: "",
            phone: "",
            email: ""
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                onClick={handleClose}
            />

            <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-gradient-to-br from-background via-background to-muted/10 p-6 shadow-2xl sm:rounded-xl">
                <div className="flex flex-col space-y-1.5">
                    <h3 className="text-xl font-semibold leading-none tracking-tight flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        {title}
                    </h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium flex items-center gap-1">
                            Company Name
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={brokerData.name}
                            onChange={(e) => setBrokerData({ ...brokerData, name: e.target.value })}
                            placeholder="ABC Transport Company"
                            disabled={loading}
                            className="mt-1 h-11 border-muted-foreground/20 focus:border-primary transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium flex items-center gap-1">
                            Contact Person
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={brokerData.contactPerson}
                            onChange={(e) => setBrokerData({ ...brokerData, contactPerson: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                            className="mt-1 h-11 border-muted-foreground/20 focus:border-primary transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium flex items-center gap-1">
                            Phone Number
                            <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={brokerData.phone}
                            onChange={(e) => setBrokerData({ ...brokerData, phone: e.target.value })}
                            placeholder="+91-9876543210"
                            maxLength={15}
                            disabled={loading}
                            className="mt-1 h-11 border-muted-foreground/20 focus:border-primary transition-all"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Email (Optional)</label>
                        <Input
                            type="email"
                            value={brokerData.email}
                            onChange={(e) => setBrokerData({ ...brokerData, email: e.target.value })}
                            placeholder="broker@company.com"
                            disabled={loading}
                            className="mt-1 h-11 border-muted-foreground/20 focus:border-primary transition-all"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                        className="hover:bg-muted"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            broker ? "Update Broker" : "Add Broker"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};

// Main Broker Component with Enhanced Styling
const Broker = () => {
    const { toast } = useToast();
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
    const [deletingBrokerId, setDeletingBrokerId] = useState<string | null>(null);

    // Add column hover styles
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            .broker-table td {
                position: relative;
            }
            .broker-table td::before {
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
            .broker-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
            .broker-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
            .broker-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
            .broker-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
            .broker-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
            .broker-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
            .broker-table td > * {
                position: relative;
                z-index: 1;
            }
        `;
        document.head.appendChild(styleElement);

        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    useEffect(() => {
        fetchBrokers();
    }, []);

    const fetchBrokers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('brokers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setBrokers(data || []);
        } catch (error) {
            console.error('Error fetching brokers:', error);
            toast({
                title: "❌ Error",
                description: "Failed to load brokers",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddBroker = async (brokerData: BrokerFormData) => {
        try {
            const { data, error } = await supabase
                .from('brokers')
                .insert([{
                    name: brokerData.name,
                    contact_person: brokerData.contactPerson,
                    phone: brokerData.phone,
                    email: brokerData.email || null,
                    status: 'ACTIVE'
                }])
                .select()
                .single();

            if (error) throw error;

            await fetchBrokers();
            toast({
                title: "✅ Success",
                description: "Broker added successfully",
            });
        } catch (error) {
            console.error('Error adding broker:', error);
            toast({
                title: "❌ Error",
                description: "Failed to add broker",
                variant: "destructive"
            });
            throw error;
        }
    };

    const handleUpdateBroker = async (brokerData: BrokerFormData) => {
        if (!editingBroker) return;

        try {
            const { error } = await supabase
                .from('brokers')
                .update({
                    name: brokerData.name,
                    contact_person: brokerData.contactPerson,
                    phone: brokerData.phone,
                    email: brokerData.email || null
                })
                .eq('id', editingBroker.id);

            if (error) throw error;

            await fetchBrokers();
            toast({
                title: "✅ Success",
                description: "Broker updated successfully",
            });
            setEditingBroker(null);
        } catch (error) {
            console.error('Error updating broker:', error);
            toast({
                title: "❌ Error",
                description: "Failed to update broker",
                variant: "destructive"
            });
            throw error;
        }
    };

    const handleDeleteBroker = async () => {
        if (!deletingBrokerId) return;

        try {
            const { data: vehicles } = await supabase
                .from('hired_vehicles')
                .select('id')
                .eq('broker_id', deletingBrokerId)
                .limit(1);

            if (vehicles && vehicles.length > 0) {
                toast({
                    title: "❌ Cannot Delete",
                    description: "This broker has associated vehicles. Please remove them first.",
                    variant: "destructive"
                });
                setDeletingBrokerId(null);
                return;
            }

            const { error } = await supabase
                .from('brokers')
                .delete()
                .eq('id', deletingBrokerId);

            if (error) throw error;

            await fetchBrokers();
            toast({
                title: "✅ Success",
                description: "Broker deleted successfully",
            });
        } catch (error) {
            console.error('Error deleting broker:', error);
            toast({
                title: "❌ Error",
                description: "Failed to delete broker",
                variant: "destructive"
            });
        } finally {
            setDeletingBrokerId(null);
        }
    };

    const filteredBrokers = brokers.filter(broker =>
        broker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        broker.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        broker.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleExport = () => {
        const headers = [
            "Company Name",
            "Contact Person",
            "Phone",
            "Email",
            "Status",
            "Created Date"
        ];

        const rows = filteredBrokers.map(broker => [
            broker.name,
            broker.contact_person,
            broker.phone,
            broker.email || "",
            broker.status || "ACTIVE",
            broker.created_at ? new Date(broker.created_at).toLocaleDateString() : ""
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
        a.download = `brokers_export_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
            title: "✅ Exported Successfully",
            description: `${filteredBrokers.length} brokers exported to CSV`,
        });
    };

    // Statistics
    const stats = {
        total: brokers.length,
        active: brokers.filter(b => b.status === 'ACTIVE').length,
        inactive: brokers.filter(b => b.status === 'INACTIVE').length,
        withEmail: brokers.filter(b => b.email).length,
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                </div>
                <p className="text-lg font-medium text-muted-foreground animate-pulse">
                    Loading brokers...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-2">
            {/* Header Section with Gradient */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Broker Management
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Manage your transport brokers and partners
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        onClick={() => setShowImportModal(true)}
                                        className="border-primary/20 hover:bg-primary/10 transition-all duration-200"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Import
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Import brokers from file</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        onClick={handleExport}
                                        className="border-primary/20 hover:bg-primary/10 transition-all duration-200"
                                    >
                                        <FileDown className="w-4 h-4 mr-2" />
                                        Export
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>Export brokers to CSV</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <Button
                            onClick={() => {
                                setEditingBroker(null);
                                setIsModalOpen(true);
                            }}
                            className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                            <Plus className="w-4 h-4 mr-2" />
                            Add Broker
                        </Button>
                    </div>
                </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Total Brokers</p>
                                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                                    {stats.total}
                                </p>
                            </div>
                            <div className="p-3 bg-primary/10 rounded-xl">
                                <Users className="w-6 h-6 text-primary" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Active</p>
                                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                                    {stats.active}
                                </p>
                            </div>
                            <div className="p-3 bg-green-500/10 rounded-xl">
                                <UserCheck className="w-6 h-6 text-green-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Inactive</p>
                                <p className="text-3xl font-bold bg-gradient-to-r from-gray-600 to-gray-500 bg-clip-text text-transparent">
                                    {stats.inactive}
                                </p>
                            </div>
                            <div className="p-3 bg-gray-500/10 rounded-xl">
                                <Shield className="w-6 h-6 text-gray-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">With Email</p>
                                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                                    {stats.withEmail}
                                </p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-xl">
                                <Mail className="w-6 h-6 text-blue-600" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Search Section */}
            <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/10">
                <CardContent className="pt-6">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search by name, contact person, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 h-11 border-muted-foreground/20 focus:border-primary transition-all duration-200 bg-background/50 backdrop-blur-sm"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Brokers Table */}
            <Card className="border-border shadow-xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                    <CardTitle className="flex items-center justify-between text-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Building2 className="w-5 h-5 text-primary" />
                            </div>
                            <span>All Brokers ({filteredBrokers.length})</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="broker-table">
                            <TableHeader>
                                <TableRow className="border-border hover:bg-muted/30 bg-muted/10">
                                    <TableHead className="font-semibold w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <Building2 className="w-4 h-4 text-muted-foreground" />
                                            Company Name
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold w-[180px]">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Contact Person
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold w-[150px]">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            Phone
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold w-[200px]">
                                        <div className="flex items-center gap-2">
                                            <Mail className="w-4 h-4 text-muted-foreground" />
                                            Email
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold w-[100px]">Status</TableHead>
                                    <TableHead className="font-semibold text-center w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredBrokers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-4 bg-muted/30 rounded-full">
                                                    <Building2 className="w-12 h-12 text-muted-foreground/50" />
                                                </div>
                                                <div className="text-muted-foreground">
                                                    <p className="text-lg font-medium">No brokers found</p>
                                                    <p className="text-sm mt-1">
                                                        {searchTerm
                                                            ? "Try adjusting your search"
                                                            : "Add your first broker to get started"}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredBrokers.map((broker) => (
                                        <TableRow
                                            key={broker.id}
                                            className="border-border hover:bg-muted/20 transition-all duration-200 group"
                                        >
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-primary/10 rounded-lg group-hover:bg-primary/20 transition-colors">
                                                        <Building className="w-4 h-4 text-primary" />
                                                    </div>
                                                    <span className="font-medium">{broker.name}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span>{broker.contact_person}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-mono text-sm">{broker.phone}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {broker.email ? (
                                                    <div className="flex items-center gap-2">
                                                        <Mail className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm">{broker.email}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={broker.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                    className={cn(
                                                        "font-medium",
                                                        broker.status === 'ACTIVE'
                                                            ? "bg-green-100 text-green-700 border-green-200"
                                                            : "bg-gray-100 text-gray-700 border-gray-200"
                                                    )}
                                                >
                                                    {broker.status || 'ACTIVE'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-primary/10"
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setEditingBroker(broker);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="hover:bg-primary/10"
                                                            >
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeletingBrokerId(broker.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Broker
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <BrokerModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingBroker(null);
                }}
                onSave={editingBroker ? handleUpdateBroker : handleAddBroker}
                broker={editingBroker}
                title={editingBroker ? "Edit Broker" : "Add New Broker"}
            />

            {/* Import Modal */}
            <ImportBrokersModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={fetchBrokers}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingBrokerId} onOpenChange={() => setDeletingBrokerId(null)}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-left">
                            This action cannot be undone. This will permanently delete the broker.
                            <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                <p className="text-sm font-medium text-destructive">
                                    ⚠️ Warning:
                                </p>
                                <p className="text-xs mt-1">
                                    Make sure this broker has no associated vehicles before deletion.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBroker}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Broker
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Broker;