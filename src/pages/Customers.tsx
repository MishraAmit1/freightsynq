import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    MoreVertical,
    User,
    MapPin,
    Phone,
    Mail,
    Building2,
    FileText,
    Download,
    Upload,
    Filter,
    Loader2,
    Package,
    Truck,
    Check,
    X,
    AlertCircle,
    FileUp,
    CheckCircle,
    XCircle,
    UserCheck,
    Users,
    FileDown,
    Building,
    Hash,
    DollarSign,
    ChevronRight,
    ChevronLeft,
    ChevronsLeft,
    ChevronsRight
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";
import { AddEditPartyDrawer } from "@/components/AddEditPartyDrawer";
import { fetchPartiesWithMetrics } from "@/api/parties";

// Types
interface Party {
    id: string;
    name: string;
    contact_person?: string | null;
    phone: string;
    email?: string | null;
    address_line1: string;
    city: string;
    state: string;
    pincode: string;
    gst_number?: string | null;
    pan_number?: string | null;
    party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
    status: 'ACTIVE' | 'INACTIVE';
    is_billing_party?: boolean;
    created_at?: string;
    updated_at?: string;

    // Metrics fields
    last_booking_date?: string | null;
    trips_this_month?: number;
    has_gst_verified?: boolean;
    has_pan_verified?: boolean;
    has_documents?: boolean;
    billing_status?: string;
    outstanding_amount?: number;
    pod_confirmation_rate?: number;
}

interface Stats {
    total: number;
    consignors: number;
    consignees: number;
    active: number;
    billing: number;
}

interface ImportRow {
    name: string;
    contact_person?: string;
    phone: string;
    email?: string;
    address_line1: string;
    city: string;
    state: string;
    pincode: string;
    gst_number?: string;
    pan_number?: string;
    party_type?: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
    status?: 'ACTIVE' | 'INACTIVE';
    is_billing_party?: boolean;
}

interface ValidationError {
    row: number;
    field: string;
    message: string;
}

interface ImportPreviewData {
    valid: ImportRow[];
    invalid: { row: ImportRow; errors: ValidationError[] }[];
    duplicates: { row: ImportRow; field: string; value: string }[];
}

interface ImportProgress {
    current: number;
    total: number;
    status: 'idle' | 'validating' | 'importing' | 'completed' | 'error';
    message: string;
}

// Party type badge config
const partyTypeConfig = {
    CONSIGNOR: {
        label: "Consignor",
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: Package
    },
    CONSIGNEE: {
        label: "Consignee",
        color: "bg-green-100 text-green-700 border-green-200",
        icon: Truck
    },
    BOTH: {
        label: "Both",
        color: "bg-purple-100 text-purple-700 border-purple-200",
        icon: Users
    }
};

// UI Helpers
const getLastBookingDisplay = (date: string | null) => {
    if (!date) return "—";
    const bookingDate = new Date(date);
    const today = new Date();
    const diffDays = Math.floor((today.getTime() - bookingDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
    return bookingDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

const VerifiedBadges: React.FC<{ party: Party }> = ({ party }) => {
    return (
        <div className="flex items-center gap-1">
            {party.has_gst_verified && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="w-5 h-5 rounded-full bg-green-100 flex items-center justify-center">
                                <Check className="w-3 h-3 text-green-600" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">GST: {party.gst_number}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {party.has_pan_verified && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center">
                                <FileText className="w-3 h-3 text-blue-600" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">PAN: {party.pan_number}</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {!party.has_gst_verified && !party.has_pan_verified && !party.has_documents && (
                <span className="text-xs text-muted-foreground">—</span>
            )}
        </div>
    );
};

// Email validation
const validateEmail = (email: string): boolean => {
    if (!email) return true;
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;

    const validDomains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'zoho.com', 'protonmail.com', 'icloud.com', 'aol.com',
        'mail.com', 'yandex.com', 'live.com', 'msn.com',
        'rediffmail.com', 'inbox.com'
    ];

    const domain = email.split('@')[1]?.toLowerCase();

    return validDomains.includes(domain) ||
        domain?.endsWith('.com') ||
        domain?.endsWith('.in') ||
        domain?.endsWith('.co') ||
        domain?.endsWith('.org') ||
        domain?.endsWith('.net') ||
        domain?.endsWith('.edu');
};

// 🔥 FULL IMPORT MODAL COMPONENT
const ImportModal: React.FC<{
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
                const text = await file.text();
                const result = Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    transformHeader: (header) => header.trim().toLowerCase().replace(/\s+/g, '_')
                });
                data = result.data;
            } else {
                const buffer = await file.arrayBuffer();
                const workbook = XLSX.read(buffer, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                data = XLSX.utils.sheet_to_json(firstSheet, {
                    header: 1,
                    defval: ''
                });

                if (data.length > 0) {
                    const headers = (data[0] as any[]).map((h: string) =>
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

            await validateData(data);
        } catch (error) {
            console.error('Error processing file:', error);
            toast({
                title: "❌ Error",
                description: "Failed to process file",
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

        const valid: ImportRow[] = [];
        const invalid: { row: ImportRow; errors: ValidationError[] }[] = [];
        const phoneNumbers: string[] = [];
        const gstNumbers: string[] = [];
        const partyNames: string[] = [];

        // Collect all phone, GST numbers and names for duplicate check
        data.forEach((row) => {
            if (row.phone) phoneNumbers.push(row.phone.toString().trim());
            if (row.gst_number) gstNumbers.push(row.gst_number.toString().trim().toUpperCase());
            if (row.name) partyNames.push(row.name.toString().trim().toLowerCase());
        });

        // Check existing duplicates in database
        let existingPhones: string[] = [];
        let existingGSTs: string[] = [];
        let existingNames: string[] = [];

        if (phoneNumbers.length > 0) {
            const { data: existingData } = await supabase
                .from('parties')
                .select('phone, gst_number, name')
                .or(`phone.in.(${phoneNumbers.join(',')}),gst_number.in.(${gstNumbers.filter(g => g).join(',')})`);

            if (existingData) {
                existingPhones = existingData.map(p => p.phone).filter(Boolean);
                existingGSTs = existingData.map(p => p.gst_number).filter(Boolean);
                existingNames = existingData.map(p => p.name.toLowerCase()).filter(Boolean);
            }
        }

        const duplicates: { row: ImportRow; field: string; value: string }[] = [];

        data.forEach((row, index) => {
            const errors: ValidationError[] = [];
            const processedRow: ImportRow = {
                name: row.name?.toString().trim() || '',
                contact_person: row.contact_person?.toString().trim() || '',
                phone: row.phone?.toString().trim() || '',
                email: row.email?.toString().trim() || '',
                address_line1: row.address_line1?.toString().trim() || '',
                city: row.city?.toString().trim() || '',
                state: row.state?.toString().trim() || '',
                pincode: row.pincode?.toString().trim() || '',
                gst_number: row.gst_number?.toString().trim().toUpperCase() || '',
                pan_number: row.pan_number?.toString().trim().toUpperCase() || '',
                party_type: (row.party_type?.toString().trim().toUpperCase() as any) || 'BOTH',
                status: (row.status?.toString().trim().toUpperCase() as any) || 'ACTIVE',
                is_billing_party: row.is_billing_party?.toString().trim().toUpperCase() === 'TRUE'
            };

            // Required field validation
            if (!processedRow.name) {
                errors.push({ row: index + 1, field: 'name', message: 'Name is required' });
            }
            if (!processedRow.phone) {
                errors.push({ row: index + 1, field: 'phone', message: 'Phone is required' });
            }
            if (!processedRow.address_line1) {
                errors.push({ row: index + 1, field: 'address_line1', message: 'Address is required' });
            }
            if (!processedRow.city) {
                errors.push({ row: index + 1, field: 'city', message: 'City is required' });
            }
            if (!processedRow.state) {
                errors.push({ row: index + 1, field: 'state', message: 'State is required' });
            }
            if (!processedRow.pincode) {
                errors.push({ row: index + 1, field: 'pincode', message: 'Pincode is required' });
            }

            // Format validation
            if (processedRow.phone && !/^[0-9]{10}$/.test(processedRow.phone)) {
                errors.push({ row: index + 1, field: 'phone', message: 'Invalid phone number' });
            }
            if (processedRow.pincode && !/^[0-9]{6}$/.test(processedRow.pincode)) {
                errors.push({ row: index + 1, field: 'pincode', message: 'Invalid pincode' });
            }
            if (processedRow.email && !validateEmail(processedRow.email)) {
                errors.push({ row: index + 1, field: 'email', message: 'Invalid email' });
            }
            if (processedRow.gst_number && processedRow.gst_number.length > 0 &&
                !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(processedRow.gst_number)) {
                errors.push({ row: index + 1, field: 'gst_number', message: 'Invalid GST number' });
            }
            if (processedRow.pan_number && processedRow.pan_number.length > 0 &&
                !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(processedRow.pan_number)) {
                errors.push({ row: index + 1, field: 'pan_number', message: 'Invalid PAN number' });
            }

            // Party type validation
            if (!['CONSIGNOR', 'CONSIGNEE', 'BOTH'].includes(processedRow.party_type!)) {
                processedRow.party_type = 'BOTH';
            }
            if (!['ACTIVE', 'INACTIVE'].includes(processedRow.status!)) {
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
            } else if (processedRow.gst_number && existingGSTs.includes(processedRow.gst_number)) {
                duplicates.push({
                    row: processedRow,
                    field: 'gst_number',
                    value: processedRow.gst_number
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
                const dataToInsert = batch.map(row => ({
                    name: row.name,
                    contact_person: row.contact_person || null,
                    phone: row.phone,
                    email: row.email || null,
                    address_line1: row.address_line1,
                    city: row.city,
                    state: row.state,
                    pincode: row.pincode,
                    gst_number: row.gst_number || null,
                    pan_number: row.pan_number || null,
                    party_type: row.party_type || 'BOTH',
                    status: row.status || 'ACTIVE',
                    is_billing_party: row.is_billing_party || false
                }));

                const { error } = await supabase
                    .from('parties')
                    .insert(dataToInsert);

                if (error) throw error;

                successCount += batch.length;

                setProgress({
                    current: Math.min((i + 1) * BATCH_SIZE, preview.valid.length),
                    total: preview.valid.length,
                    status: 'importing',
                    message: `Imported ${successCount} of ${preview.valid.length} parties`
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
            description: `Successfully imported ${successCount} parties${errorCount > 0 ? `, ${errorCount} failed` : ''}`,
        });

        setTimeout(() => {
            onImportComplete();
            onClose();
        }, 2000);
    };

    // Download template
    const downloadTemplate = () => {
        const template = [
            ['name', 'contact_person', 'phone', 'email', 'address_line1', 'city', 'state', 'pincode', 'gst_number', 'pan_number', 'party_type', 'status', 'is_billing_party'],
            ['ABC Traders', 'John Doe', '9876543210', 'abc@gmail.com', '123 Main Street', 'Mumbai', 'Maharashtra', '400001', '27AABCU9603R1ZM', 'AABCU9603R', 'CONSIGNOR', 'ACTIVE', 'TRUE'],
            ['XYZ Logistics', '', '8765432109', '', '456 Park Avenue', 'Delhi', 'Delhi', '110001', '', '', 'CONSIGNEE', 'ACTIVE', 'FALSE'],
            ['Quick Transport', 'Rahul Kumar', '7654321098', 'quick@gmail.com', '789 Ring Road', 'Bangalore', 'Karnataka', '560001', '29AABCU9603R1ZM', 'AABCU9603R', 'BOTH', 'ACTIVE', 'TRUE']
        ];

        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Parties');
        XLSX.writeFile(wb, 'parties_import_template.xlsx');

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
                        Import Parties
                    </DialogTitle>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Upload CSV or Excel file with party data
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
                                                <TableHead>Name</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>City</TableHead>
                                                <TableHead>Type</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.valid.map((row, index) => (
                                                <TableRow key={index} className="hover:bg-muted/30">
                                                    <TableCell className="font-medium">{index + 1}</TableCell>
                                                    <TableCell className="font-medium">{row.name}</TableCell>
                                                    <TableCell>{row.phone}</TableCell>
                                                    <TableCell>{row.city}</TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">
                                                            {row.party_type}
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
                                                <TableHead>Name</TableHead>
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
                            {progress.current} of {progress.total} parties imported
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

// 🔥 MAIN COMPONENT WITH PERFORMANCE FIXES
export const Customers = () => {
    const { toast } = useToast();
    const navigate = useNavigate();

    // States
    const [parties, setParties] = useState<Party[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [selectedTab, setSelectedTab] = useState("all");

    // ✅ Pagination states
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    // Modal states
    const [showImportModal, setShowImportModal] = useState(false);
    const [deletePartyId, setDeletePartyId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);

    const [stats, setStats] = useState<Stats>({
        total: 0,
        consignors: 0,
        consignees: 0,
        active: 0,
        billing: 0
    });

    // Add column hover styles
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.innerHTML = `
            .customers-table td {
                position: relative;
            }
            .customers-table td::before {
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
            .customers-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
            .customers-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
            .customers-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
            .customers-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
            .customers-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
            .customers-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
            .customers-table td > * {
                position: relative;
                z-index: 1;
            }
        `;
        document.head.appendChild(styleElement);

        return () => {
            document.head.removeChild(styleElement);
        };
    }, []);

    // ✅ Load parties ONLY ONCE
    const loadParties = async () => {
        if (!initialLoading) return;

        try {
            const partiesWithMetrics = await fetchPartiesWithMetrics();
            setParties(partiesWithMetrics);

            // Calculate stats
            const totalParties = partiesWithMetrics?.length || 0;
            const activeParties = partiesWithMetrics?.filter(p => p.status === "ACTIVE").length || 0;
            const consignorParties = partiesWithMetrics?.filter(p =>
                p.party_type === "CONSIGNOR" || p.party_type === "BOTH"
            ).length || 0;
            const consigneeParties = partiesWithMetrics?.filter(p =>
                p.party_type === "CONSIGNEE" || p.party_type === "BOTH"
            ).length || 0;
            const billingParties = partiesWithMetrics?.filter(p => p.is_billing_party === true).length || 0;

            setStats({
                total: totalParties,
                consignors: consignorParties,
                consignees: consigneeParties,
                active: activeParties,
                billing: billingParties
            });

        } catch (error) {
            toast({
                title: "❌ Error",
                description: "Failed to load parties",
                variant: "destructive"
            });
        } finally {
            setInitialLoading(false);
        }
    };

    useEffect(() => {
        loadParties();
    }, []);

    // ✅ CLIENT-SIDE FILTERING
    const filteredParties = useMemo(() => {
        return parties.filter(party => {
            const matchesSearch =
                party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                party.phone.includes(searchTerm) ||
                party.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (party.gst_number && party.gst_number.toLowerCase().includes(searchTerm.toLowerCase()));

            const matchesType =
                typeFilter === "ALL" ||
                (typeFilter === "CONSIGNOR" && (party.party_type === "CONSIGNOR" || party.party_type === "BOTH")) ||
                (typeFilter === "CONSIGNEE" && (party.party_type === "CONSIGNEE" || party.party_type === "BOTH")) ||
                (typeFilter === party.party_type);

            const matchesStatus =
                statusFilter === "ALL" || party.status === statusFilter;

            const matchesTab =
                selectedTab === "all" ||
                (selectedTab === "consignors" && (party.party_type === "CONSIGNOR" || party.party_type === "BOTH")) ||
                (selectedTab === "consignees" && (party.party_type === "CONSIGNEE" || party.party_type === "BOTH")) ||
                (selectedTab === "billing" && party.is_billing_party === true);

            return matchesSearch && matchesType && matchesStatus && matchesTab;
        });
    }, [parties, searchTerm, typeFilter, statusFilter, selectedTab]);

    // ✅ PAGINATION LOGIC
    const totalPages = Math.ceil(filteredParties.length / itemsPerPage);

    const paginatedParties = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        return filteredParties.slice(startIndex, endIndex);
    }, [filteredParties, currentPage, itemsPerPage]);

    // ✅ Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, typeFilter, statusFilter, selectedTab]);

    // ✅ Smart pagination buttons
    const getPaginationButtons = () => {
        const pages: (number | string)[] = [];

        if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (currentPage <= 3) {
                pages.push(1, 2, 3, 4, '...', totalPages);
            } else if (currentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
            }
        }

        return pages;
    };

    // Handlers
    const handleAddParty = () => {
        setSelectedPartyId(null);
        setIsDrawerOpen(true);
    };

    const handleEditParty = (partyId: string) => {
        setSelectedPartyId(partyId);
        setIsDrawerOpen(true);
    };

    const handleDrawerClose = () => {
        setIsDrawerOpen(false);
        setSelectedPartyId(null);
    };

    const handleDrawerSuccess = () => {
        setInitialLoading(true);
        loadParties();
    };

    // ✅ OPTIMISTIC STATUS UPDATE
    const togglePartyStatus = async (party: Party) => {
        const newStatus = party.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

        // Optimistic update
        setParties(prev => prev.map(p =>
            p.id === party.id ? { ...p, status: newStatus } : p
        ));

        try {
            const { error } = await supabase
                .from("parties")
                .update({ status: newStatus })
                .eq("id", party.id);

            if (error) throw error;

            toast({
                title: "✅ Status Updated",
                description: `Party is now ${newStatus.toLowerCase()}`,
            });

        } catch (error) {
            // Revert on error
            setParties(prev => prev.map(p =>
                p.id === party.id ? { ...p, status: party.status } : p
            ));

            toast({
                title: "❌ Error",
                description: "Failed to update status",
                variant: "destructive"
            });
        }
    };

    // ✅ OPTIMISTIC DELETE
    const handleDeleteParty = async () => {
        if (!deletePartyId) return;

        const partyToDelete = parties.find(p => p.id === deletePartyId);

        // Optimistic removal
        setParties(prev => prev.filter(p => p.id !== deletePartyId));

        try {
            const { error } = await supabase
                .from("parties")
                .delete()
                .eq("id", deletePartyId);

            if (error) throw error;

            toast({
                title: "✅ Success",
                description: "Party deleted successfully",
            });

        } catch (error) {
            // Revert on error
            if (partyToDelete) {
                setParties(prev => [...prev, partyToDelete]);
            }

            toast({
                title: "❌ Error",
                description: "Failed to delete party",
                variant: "destructive"
            });
        } finally {
            setDeletePartyId(null);
        }
    };

    const handleExport = () => {
        const csvContent = [
            ["Name", "Type", "Phone", "Email", "Address", "City", "State", "Pincode", "GST", "PAN", "Status", "Billing Party"],
            ...filteredParties.map(party => [
                party.name,
                party.party_type,
                party.phone,
                party.email || "",
                party.address_line1 || "",
                party.city,
                party.state,
                party.pincode,
                party.gst_number || "",
                party.pan_number || "",
                party.status,
                party.is_billing_party ? "TRUE" : "FALSE"
            ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parties_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();

        toast({
            title: "✅ Exported",
            description: `${filteredParties.length} parties exported to CSV`,
        });
    };

    const handleImportComplete = () => {
        setSearchTerm("");
        setInitialLoading(true);
        loadParties();
    };

    // ✅ SKELETON LOADER
    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                </div>
                <p className="text-lg font-medium text-muted-foreground animate-pulse">
                    Loading parties...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* HEADER: Stats + Buttons */}
            <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
                <div className="bg-card border border-border dark:border-border rounded-xl flex-1 p-6 shadow-sm">
                    <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[#E5E7EB] dark:divide-[#35353F]">
                        <div className="px-6 py-3 first:pl-0 relative">
                            <div className="absolute top-2 right-2 opacity-10">
                                <Building2 className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">Total Parties</p>
                                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.total}</p>
                            </div>
                        </div>

                        <div className="px-6 py-3 relative">
                            <div className="absolute top-2 right-2 opacity-10">
                                <Package className="w-8 h-8 text-primary dark:text-primary" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">Consignors</p>
                                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.consignors}</p>
                            </div>
                        </div>

                        <div className="px-6 py-3 relative">
                            <div className="absolute top-2 right-2 opacity-10">
                                <Truck className="w-8 h-8 text-primary dark:text-primary" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">Consignees</p>
                                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.consignees}</p>
                            </div>
                        </div>

                        <div className="px-6 py-3 last:pr-0 relative">
                            <div className="absolute top-2 right-2 opacity-10">
                                <DollarSign className="w-8 h-8 text-primary" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs font-medium text-muted-foreground dark:text-muted-foreground mb-1">Billing</p>
                                <p className="text-3xl font-bold text-foreground dark:text-white">{stats.billing}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex flex-col gap-2 lg:flex-shrink-0 lg:min-w-[200px]">
                    <Button
                        size="default"
                        onClick={handleAddParty}
                        className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Party
                    </Button>

                    <div className="flex gap-2">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="default"
                                        onClick={() => setShowImportModal(true)}
                                        className="flex-1 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
                                    >
                                        <Upload className="w-4 h-4 mr-2" />
                                        Import
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>Import parties from CSV/Excel</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="outline"
                                        size="default"
                                        onClick={handleExport}
                                        className="flex-1 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
                                    >
                                        <FileDown className="w-4 h-4 mr-2" />
                                        Export
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="bottom">
                                    <p>Export to CSV</p>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    </div>
                </div>
            </div>

            {/* TABLE CARD */}
            <div className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">

                {/* Tabs */}
                <div className="border-b border-border dark:border-border">
                    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                        <div className="px-6 overflow-x-auto scrollbar-none">
                            <TabsList className="bg-transparent border-0 p-0 h-auto inline-flex min-w-max">
                                <TabsTrigger
                                    value="all"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3.5 transition-all text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                                >
                                    All Parties ({filteredParties.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="consignors"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3.5 transition-all text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                                >
                                    Consignors ({stats.consignors})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="consignees"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3.5 transition-all text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                                >
                                    Consignees ({stats.consignees})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="billing"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3.5 transition-all text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                                >
                                    <DollarSign className="w-4 h-4 mr-1.5 inline" />
                                    Billing Parties ({stats.billing})
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </Tabs>
                </div>

                {/* Search & Filters */}
                <div className="p-6 border-b border-border dark:border-border">
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                            <Input
                                placeholder="Search by name, phone, city..."
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

                        <div className="flex gap-3 w-full sm:w-auto">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[160px] h-10 border-border dark:border-border bg-card text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border dark:border-border">
                                    <SelectItem value="ALL">All Types</SelectItem>
                                    <SelectItem value="CONSIGNOR">Consignors</SelectItem>
                                    <SelectItem value="CONSIGNEE">Consignees</SelectItem>
                                    <SelectItem value="BOTH">Both</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[160px] h-10 border-border dark:border-border bg-card text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border dark:border-border">
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="hidden md:block overflow-x-auto">
                    <Table className="customers-table">
                        <TableHeader>
                            <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                                <TableHead className="w-[30%] font-semibold text-muted-foreground dark:text-muted-foreground pl-6">
                                    <div className="flex items-center gap-2">
                                        <Building2 className="w-4 h-4" />
                                        Party Name
                                    </div>
                                </TableHead>
                                <TableHead className="w-[12%] font-semibold text-muted-foreground dark:text-muted-foreground">Type</TableHead>
                                <TableHead className="w-[15%] font-semibold text-muted-foreground dark:text-muted-foreground">City / State</TableHead>
                                <TableHead className="w-[10%] font-semibold text-muted-foreground dark:text-muted-foreground">Last Booking</TableHead>
                                <TableHead className="w-[8%] font-semibold text-muted-foreground dark:text-muted-foreground">Trips</TableHead>
                                <TableHead className="w-[10%] font-semibold text-muted-foreground dark:text-muted-foreground">Verified</TableHead>
                                <TableHead className="w-[10%] font-semibold text-muted-foreground dark:text-muted-foreground">Status</TableHead>
                                <TableHead className="w-[5%] font-semibold text-muted-foreground dark:text-muted-foreground text-center pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedParties.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-64 text-center">
                                        <div className="flex flex-col items-center justify-center gap-3">
                                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                                                <Users className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                                            </div>
                                            <div>
                                                <p className="text-base font-medium text-foreground dark:text-white">No parties found</p>
                                                <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                                                    {searchTerm || typeFilter !== "ALL"
                                                        ? "Try adjusting your search or filters"
                                                        : "Get started by adding your first party"}
                                                </p>
                                            </div>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                paginatedParties.map((party) => {
                                    const typeConfig = partyTypeConfig[party.party_type];
                                    const TypeIcon = typeConfig.icon;

                                    return (
                                        <TableRow
                                            key={party.id}
                                            className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors"
                                        >
                                            <TableCell className="pl-6 font-medium text-foreground dark:text-white">
                                                <div className="font-semibold">{party.name}</div>
                                                {party.contact_person && (
                                                    <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">{party.contact_person}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={cn("gap-1.5 text-xs font-medium", typeConfig.color)}>
                                                    <TypeIcon className="w-3 h-3" />
                                                    {typeConfig.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm text-foreground dark:text-white">
                                                {party.city}, {party.state}
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground dark:text-muted-foreground">
                                                {getLastBookingDisplay(party.last_booking_date || null)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-xs border-border dark:border-border">
                                                    {party.trips_this_month || 0}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <VerifiedBadges party={party} />
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    className={cn(
                                                        "cursor-pointer transition-all text-xs font-medium",
                                                        party.status === "ACTIVE"
                                                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] hover:bg-[#D1FAE5] dark:bg-[#059669]/15 dark:text-[#34D399] dark:border-[#059669]/30"
                                                            : "bg-[#F3F4F6] text-muted-foreground border border-border hover:bg-[#E5E7EB] dark:bg-secondary dark:text-muted-foreground dark:border-border"
                                                    )}
                                                    onClick={() => togglePartyStatus(party)}
                                                >
                                                    {party.status === "ACTIVE" ? (
                                                        <CheckCircle className="w-3 h-3 mr-1" />
                                                    ) : (
                                                        <XCircle className="w-3 h-3 mr-1" />
                                                    )}
                                                    {party.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
                                                        >
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-48 bg-card border-border dark:border-border"
                                                    >
                                                        <DropdownMenuItem
                                                            onClick={() => handleEditParty(party.id)}
                                                            className="hover:bg-accent dark:hover:bg-secondary cursor-pointer"
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit Details
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator className="bg-[#E5E7EB] dark:bg-secondary" />
                                                        <DropdownMenuItem
                                                            className="text-[#DC2626] hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                                                            onClick={() => setDeletePartyId(party.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete Party
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Mobile View */}
                <div className="md:hidden p-4 space-y-3">
                    {paginatedParties.length === 0 ? (
                        <div className="text-center py-16">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <Users className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                            </div>
                            <p className="text-base font-medium text-foreground dark:text-white">No parties found</p>
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                                {searchTerm ? "Try adjusting your search" : "Add your first party"}
                            </p>
                        </div>
                    ) : (
                        paginatedParties.map((party) => {
                            const typeConfig = partyTypeConfig[party.party_type];
                            const TypeIcon = typeConfig.icon;

                            return (
                                <div
                                    key={party.id}
                                    className="bg-card border border-border dark:border-border rounded-lg p-4 space-y-3 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2">
                                                <Building className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                                <span className="font-semibold text-sm text-foreground dark:text-white">{party.name}</span>
                                            </div>
                                            {party.contact_person && (
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground dark:text-muted-foreground ml-6 mt-1">
                                                    <User className="w-3 h-3" />
                                                    {party.contact_person}
                                                </div>
                                            )}
                                        </div>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <MoreVertical className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end" className="bg-card">
                                                <DropdownMenuItem onClick={() => handleEditParty(party.id)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Edit
                                                </DropdownMenuItem>
                                                <DropdownMenuItem className="text-[#DC2626]" onClick={() => setDeletePartyId(party.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <Badge className={cn("gap-1 text-xs", typeConfig.color)}>
                                            <TypeIcon className="w-3 h-3" />
                                            {typeConfig.label}
                                        </Badge>
                                        <Badge
                                            className={cn(
                                                "text-xs",
                                                party.status === "ACTIVE"
                                                    ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]"
                                                    : "bg-[#F3F4F6] text-muted-foreground border-border"
                                            )}
                                        >
                                            {party.status}
                                        </Badge>
                                    </div>

                                    <div className="space-y-2 pt-2 border-t border-border dark:border-border">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                                            <Phone className="w-3.5 h-3.5" />
                                            <span>{party.phone}</span>
                                        </div>
                                        {party.email && (
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                                                <Mail className="w-3.5 h-3.5" />
                                                <span className="text-xs truncate">{party.email}</span>
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2 text-sm text-muted-foreground dark:text-muted-foreground">
                                            <MapPin className="w-3.5 h-3.5 mt-0.5" />
                                            <div className="text-xs">
                                                <div>{party.address_line1}</div>
                                                <div>{party.city}, {party.state} - {party.pincode}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* ✅ PAGINATION */}
                {filteredParties.length > 0 && (
                    <div className="px-6 py-4 border-t border-border dark:border-border bg-card">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

                            <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                                Showing <span className="font-medium text-foreground dark:text-white">
                                    {((currentPage - 1) * itemsPerPage) + 1}
                                </span> to{" "}
                                <span className="font-medium text-foreground dark:text-white">
                                    {Math.min(currentPage * itemsPerPage, filteredParties.length)}
                                </span>{" "}
                                of <span className="font-medium text-foreground dark:text-white">{filteredParties.length}</span> results
                            </div>

                            <div className="flex items-center gap-2">
                                {currentPage > 2 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(1)}
                                        className="h-9 w-9 p-0 border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white hover:text-foreground dark:hover:text-white"
                                    >
                                        <ChevronsLeft className="h-4 w-4" />
                                    </Button>
                                )}

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === 1}
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    className="h-9 w-9 p-0 border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white hover:text-foreground dark:hover:text-white disabled:opacity-50"
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>

                                <div className="flex items-center gap-1">
                                    {getPaginationButtons().map((page, index) => (
                                        page === '...' ? (
                                            <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground dark:text-muted-foreground">...</span>
                                        ) : (
                                            <Button
                                                key={page}
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setCurrentPage(page as number)}
                                                className={cn(
                                                    "h-9 w-9 p-0 border-border dark:border-border",
                                                    currentPage === page
                                                        ? "bg-primary border-primary text-primary-foreground hover:text-primary-foreground font-medium hover:bg-primary-hover"
                                                        : "bg-card hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white hover:text-foreground dark:hover:text-white"
                                                )}
                                            >
                                                {page}
                                            </Button>
                                        )
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={currentPage === totalPages || totalPages === 0}
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    className="h-9 w-9 p-0 border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white hover:text-foreground dark:hover:text-white disabled:opacity-50"
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>

                                {currentPage < totalPages - 1 && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setCurrentPage(totalPages)}
                                        className="h-9 w-9 p-0 border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white hover:text-foreground dark:hover:text-white"
                                    >
                                        <ChevronsRight className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>

                            <Select
                                value={itemsPerPage.toString()}
                                onValueChange={(value) => {
                                    setItemsPerPage(Number(value));
                                    setCurrentPage(1);
                                }}
                            >
                                <SelectTrigger className="w-[130px] h-9 border-border dark:border-border bg-card text-sm text-foreground dark:text-white hover:text-foreground dark:hover:text-white">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-card border-border dark:border-border">
                                    <SelectItem value="10" className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white">10 per page</SelectItem>
                                    <SelectItem value="25" className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white">25 per page</SelectItem>
                                    <SelectItem value="50" className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white">50 per page</SelectItem>
                                    <SelectItem value="100" className="text-foreground dark:text-white hover:text-foreground dark:hover:text-white">100 per page</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                )}
            </div>

            {/* Modals */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={handleImportComplete}
            />

            <AlertDialog open={!!deletePartyId} onOpenChange={() => setDeletePartyId(null)}>
                <AlertDialogContent className="bg-card border-border dark:border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground dark:text-white">
                            <AlertCircle className="w-5 h-5 text-[#DC2626]" />
                            Delete Party?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground dark:text-muted-foreground">
                            This action cannot be undone. This will permanently delete the party and remove all associated data from our servers.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border dark:border-border hover:bg-muted dark:hover:bg-secondary">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteParty}
                            className="bg-[#DC2626] hover:bg-[#B91C1C] text-white"
                        >
                            Delete Party
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AddEditPartyDrawer
                isOpen={isDrawerOpen}
                onClose={handleDrawerClose}
                partyId={selectedPartyId}
                onSuccess={handleDrawerSuccess}
            />
        </div>
    );
};