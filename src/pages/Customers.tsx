import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom"; // ✅ ADD THIS
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
    DollarSign
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";
import { AddEditPartyDrawer } from "@/components/AddEditPartyDrawer";

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

    // ✅ STATIC DUMMY FIELDS - Just for UI preview
    last_booking_date?: string | null;      // "2024-01-15" or null
    trips_this_month?: number;               // 5, 12, 0, etc.
    has_gst_verified?: boolean;              // true/false
    has_pan_verified?: boolean;              // true/false
    has_documents?: boolean;                 // true/false
    billing_status?: string;                 // "Last Billed 03 Nov" or "Pending >30d"
    outstanding_amount?: number;             // 45000, 0, etc.
    pod_confirmation_rate?: number;          // 85, 92, 100, etc. (percentage)
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
// ✅ STATIC UI HELPERS - Just for preview
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

const getBillingStatusConfig = (status: string) => {
    if (status.includes("Pending")) {
        return {
            color: "bg-red-100 text-red-700 border-red-200",
            icon: "⚠️"
        };
    }
    return {
        color: "bg-green-100 text-green-700 border-green-200",
        icon: "✓"
    };
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
            {party.has_documents && (
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className="w-5 h-5 rounded-full bg-purple-100 flex items-center justify-center">
                                <FileText className="w-3 h-3 text-purple-600" />
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p className="text-xs">Documents uploaded</p>
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
// Email validation with proper domains
const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional

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

// Import Modal Component
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
                is_billing_party: row.is_billing_party?.toString().trim().toUpperCase() === 'TRUE' // ✅ ADDED - Converts 'TRUE'/'FALSE' to boolean
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
                    is_billing_party: row.is_billing_party || false // ✅ ADDED
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
    // Download template
    const downloadTemplate = () => {
        const template = [
            ['name', 'contact_person', 'phone', 'email', 'address_line1', 'city', 'state', 'pincode', 'gst_number', 'pan_number', 'party_type', 'status', 'is_billing_party'], // ✅ ADDED is_billing_party
            ['ABC Traders', 'John Doe', '9876543210', 'abc@gmail.com', '123 Main Street', 'Mumbai', 'Maharashtra', '400001', '27AABCU9603R1ZM', 'AABCU9603R', 'CONSIGNOR', 'ACTIVE', 'TRUE'], // ✅ ADDED TRUE
            ['XYZ Logistics', '', '8765432109', '', '456 Park Avenue', 'Delhi', 'Delhi', '110001', '', '', 'CONSIGNEE', 'ACTIVE', 'FALSE'], // ✅ ADDED FALSE
            ['Quick Transport', 'Rahul Kumar', '7654321098', 'quick@gmail.com', '789 Ring Road', 'Bangalore', 'Karnataka', '560001', '29AABCU9603R1ZM', 'AABCU9603R', 'BOTH', 'ACTIVE', 'TRUE'] // ✅ ADDED example with billing
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

// ✅ MAIN CUSTOMERS COMPONENT
export const Customers = () => {
    const { toast } = useToast();
    const navigate = useNavigate(); // ✅ ADD THIS
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [selectedTab, setSelectedTab] = useState("all");
    const [showImportModal, setShowImportModal] = useState(false);
    const [deletePartyId, setDeletePartyId] = useState<string | null>(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedPartyId, setSelectedPartyId] = useState<string | null>(null);
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
        loadParties(); // Refresh list
    };
    const [stats, setStats] = useState<Stats>({
        total: 0,
        consignors: 0,
        consignees: 0,
        active: 0,
        billing: 0 // ✅ ADDED
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

    // Load parties from database
    const loadParties = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("parties")
                .select("*")
                .order("created_at", { ascending: false });

            if (statusFilter !== "ALL") {
                query = query.eq("status", statusFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            // ✅ ADD STATIC DUMMY DATA TO EACH PARTY
            const partiesWithMetrics = (data || []).map((party, index) => ({
                ...party,
                // Static last booking (random dates)
                last_booking_date: index % 3 === 0 ? null :
                    index % 2 === 0 ? "2024-01-15" : "2024-01-10",

                // Static trips (random numbers)
                trips_this_month: Math.floor(Math.random() * 15),

                // Static verification flags
                has_gst_verified: !!party.gst_number,
                has_pan_verified: !!party.pan_number,
                has_documents: index % 2 === 0,

                // Static billing status
                billing_status: party.is_billing_party ?
                    (index % 3 === 0 ? "Pending >30d" : `Last Billed ${Math.floor(Math.random() * 28) + 1} ${['Jan', 'Dec', 'Nov'][index % 3]}`)
                    : "—",

                // Static outstanding
                outstanding_amount: party.is_billing_party ?
                    Math.floor(Math.random() * 100000) : 0,

                // Static POD rate
                pod_confirmation_rate: party.party_type === 'CONSIGNEE' || party.party_type === 'BOTH' ?
                    Math.floor(Math.random() * 30) + 70 : 0
            }));

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

        } catch (error: any) {
            console.error("Error loading parties:", error);
            toast({
                title: "❌ Error",
                description: "Failed to load parties",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadParties();
    }, [statusFilter]);

    // Toggle party status
    const togglePartyStatus = async (party: Party) => {
        const newStatus = party.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

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

            loadParties();
        } catch (error: any) {
            console.error("Error updating status:", error);
            toast({
                title: "❌ Error",
                description: "Failed to update status",
                variant: "destructive"
            });
        }
    };

    // Delete party
    const handleDeleteParty = async () => {
        if (!deletePartyId) return;

        try {
            // Check if party has any bookings
            const { data: bookings, error: checkError } = await supabase
                .from("bookings")
                .select("id")
                .or(`consignor_id.eq.${deletePartyId},consignee_id.eq.${deletePartyId}`)
                .limit(1);

            if (checkError) throw checkError;

            if (bookings && bookings.length > 0) {
                toast({
                    title: "❌ Cannot Delete",
                    description: "This party has associated bookings",
                    variant: "destructive"
                });
                setDeletePartyId(null);
                return;
            }

            // Delete party
            const { error } = await supabase
                .from("parties")
                .delete()
                .eq("id", deletePartyId);

            if (error) throw error;

            toast({
                title: "✅ Success",
                description: "Party deleted successfully",
            });

            loadParties();
        } catch (error: any) {
            console.error("Error deleting party:", error);
            toast({
                title: "❌ Error",
                description: "Failed to delete party",
                variant: "destructive"
            });
        } finally {
            setDeletePartyId(null);
        }
    };

    // Filter parties based on search and filters
    const filteredParties = parties.filter(party => {
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

        const matchesTab =
            selectedTab === "all" ||
            (selectedTab === "consignors" && (party.party_type === "CONSIGNOR" || party.party_type === "BOTH")) ||
            (selectedTab === "consignees" && (party.party_type === "CONSIGNEE" || party.party_type === "BOTH")) ||
            (selectedTab === "billing" && party.is_billing_party === true); // ✅ ADDED

        return matchesSearch && matchesType && matchesTab;
    });

    // Export to CSV
    // ✅ UPDATED Export to CSV - Added is_billing_party column
    const handleExport = () => {
        const csvContent = [
            ["Name", "Type", "Phone", "Email", "Address", "City", "State", "Pincode", "GST", "PAN", "Status", "Billing Party"], // ✅ ADDED "Billing Party"
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
                party.is_billing_party ? "TRUE" : "FALSE" // ✅ ADDED - Shows TRUE/FALSE
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

    // Handle import complete
    const handleImportComplete = () => {
        setSearchTerm("");
        loadParties();
    };
    if (loading) {
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
            <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-4">
                {/* Stats - Single Card with Dividers */}
                <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-xl flex-1 p-4 sm:p-5">
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-6 sm:gap-0 h-full"> {/* ✅ Changed from grid-cols-4 to grid-cols-5 */}

                        {/* Total Parties */}
                        <div className="sm:px-6 py-4 first:pl-0 relative">
                            <div className="absolute top-1 right-2 opacity-10">
                                <Building2 className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Total Parties
                                </p>
                                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {stats.total}
                                </p>
                            </div>
                            <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
                        </div>

                        {/* Consignors */}
                        <div className="sm:px-6 py-4 relative">
                            <div className="absolute top-1 right-2 opacity-10">
                                <Package className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Consignors
                                </p>
                                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {stats.consignors}
                                </p>
                            </div>
                            <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
                        </div>

                        {/* Consignees */}
                        <div className="sm:px-6 py-4 relative">
                            <div className="absolute top-1 right-2 opacity-10">
                                <Truck className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Consignees
                                </p>
                                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {stats.consignees}
                                </p>
                            </div>
                            <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
                        </div>

                        {/* ✅ NEW - Billing Parties */}
                        <div className="sm:px-6 py-4 relative">
                            <div className="absolute top-1 right-2 opacity-10">
                                <DollarSign className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Billing
                                </p>
                                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {stats.billing}
                                </p>
                            </div>
                            <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-gray-300 dark:bg-gray-600"></div>
                        </div>

                        {/* Active */}
                        <div className="sm:px-6 py-4 last:pr-0 relative">
                            <div className="absolute top-1 right-2 opacity-10">
                                <UserCheck className="w-8 h-8 text-gray-600 dark:text-gray-400" />
                            </div>
                            <div className="relative z-10">
                                <p className="text-xs sm:text-sm text-muted-foreground">
                                    Active
                                </p>
                                <p className="text-2xl sm:text-3xl font-bold text-foreground">
                                    {stats.active}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Buttons - Right Side */}
                <div className="flex flex-wrap gap-2 md:flex-nowrap md:ml-auto md:items-center">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowImportModal(true)}
                                    className="flex-1 sm:flex-none bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <Upload className="w-4 h-4 mr-2" />
                                    Import
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Import parties from file</p>
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
                                    className="flex-1 sm:flex-none bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
                                >
                                    <FileDown className="w-4 h-4 mr-2" />
                                    Export
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                                <p>Export parties to CSV</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Button
                        size="sm"
                        onClick={handleAddParty}
                        className="flex-1 sm:flex-none"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Party
                    </Button>
                </div>
            </div>

            {/* 🔥 CARD 2: Tabs + Search + Table */}
            <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">

                {/* Tabs Section */}
                <div className="border-b border-gray-200 dark:border-gray-800">
                    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                        <div className="px-4 sm:px-6 overflow-x-auto">
                            <TabsList className="bg-transparent border-0 p-0 h-auto inline-flex min-w-max">
                                <TabsTrigger
                                    value="all"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3 transition-all duration-300 text-xs sm:text-sm"
                                >
                                    All ({parties.length})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="consignors"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3 transition-all duration-300 text-xs sm:text-sm"
                                >
                                    Consignors ({stats.consignors})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="consignees"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3 transition-all duration-300 text-xs sm:text-sm"
                                >
                                    Consignees ({stats.consignees})
                                </TabsTrigger>
                                {/* ✅ NEW TAB - Billing Parties */}
                                <TabsTrigger
                                    value="billing"
                                    className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3 transition-all duration-300 text-xs sm:text-sm"
                                >
                                    <DollarSign className="w-3.5 h-3.5 mr-1 inline" />
                                    Billing Parties ({stats.billing})
                                </TabsTrigger>
                            </TabsList>
                        </div>
                    </Tabs>
                </div>

                {/* Search and Filters Section */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        {/* Search Bar */}
                        <div className="relative w-full sm:w-96">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, phone, city..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-10 border border-gray-200 text-sm sm:text-base"
                            />
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                    onClick={() => setSearchTerm("")}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}
                        </div>
                        {/* Filters */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                            <Select value={typeFilter} onValueChange={setTypeFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Types</SelectItem>
                                    <SelectItem value="CONSIGNOR">Consignors</SelectItem>
                                    <SelectItem value="CONSIGNEE">Consignees</SelectItem>
                                    <SelectItem value="BOTH">Both</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Status</SelectItem>
                                    <SelectItem value="ACTIVE">Active Only</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                {/* Table Section */}
                <div className="p-4 sm:p-6">
                    {/* Desktop Table View */}
                    {/* Desktop Table View */}
                    <div className="hidden md:block">
                        <div className="w-full overflow-auto no-scrollbar">
                            <Table className="customers-table min-w-full">
                                <TableHeader>
                                    <TableRow className="hover:bg-muted/50 bg-muted/30">
                                        {/* ✅ DYNAMIC HEADERS BASED ON TAB */}
                                        {selectedTab === "all" && (
                                            <>
                                                <TableHead style={{ width: '40%' }} className="font-semibold">
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                                        Party Name
                                                    </div>
                                                </TableHead>
                                                <TableHead style={{ width: '10%' }} className="font-semibold">Type</TableHead>
                                                <TableHead style={{ width: '14%' }} className="font-semibold">City / State</TableHead>
                                                <TableHead style={{ width: '12%' }} className="font-semibold">Last Booking</TableHead>
                                                <TableHead style={{ width: '12%' }} className="font-semibold">Trips (Month)</TableHead>
                                                <TableHead style={{ width: '8%' }} className="font-semibold">Verified</TableHead>
                                                <TableHead style={{ width: '8%' }} className="font-semibold">Status</TableHead>
                                                <TableHead style={{ width: '4%' }} className="font-semibold text-center">⋮</TableHead>
                                            </>
                                        )}

                                        {selectedTab === "billing" && (
                                            <>
                                                <TableHead style={{ width: '40%' }} className="font-semibold">Party Name</TableHead>
                                                <TableHead style={{ width: '10%' }} className="font-semibold">Type</TableHead>
                                                <TableHead style={{ width: '14%' }} className="font-semibold">City / State</TableHead>
                                                <TableHead style={{ width: '12%' }} className="font-semibold">Last Booking</TableHead>
                                                <TableHead style={{ width: '10%' }} className="font-semibold">Trips</TableHead>
                                                <TableHead style={{ width: '12%' }} className="font-semibold">Billing Status</TableHead>
                                                <TableHead style={{ width: '8%' }} className="font-semibold">Outstanding</TableHead>
                                                <TableHead style={{ width: '4%' }} className="font-semibold text-center">⋮</TableHead>
                                            </>
                                        )}

                                        {selectedTab === "consignors" && (
                                            <>
                                                <TableHead style={{ width: '50%' }} className="font-semibold">Party Name</TableHead>
                                                <TableHead style={{ width: '18%' }} className="font-semibold">City / State</TableHead>
                                                <TableHead style={{ width: '12%' }} className="font-semibold">Trips (Month)</TableHead>
                                                <TableHead style={{ width: '10%' }} className="font-semibold">Last Booking</TableHead>
                                                <TableHead style={{ width: '6%' }} className="font-semibold">Billing?</TableHead>
                                                <TableHead style={{ width: '4%' }} className="font-semibold">Status</TableHead>
                                            </>
                                        )}

                                        {selectedTab === "consignees" && (
                                            <>
                                                <TableHead style={{ width: '50%' }} className="font-semibold">Party Name</TableHead>
                                                <TableHead style={{ width: '18%' }} className="font-semibold">City / State</TableHead>
                                                <TableHead style={{ width: '10%' }} className="font-semibold">Last Booking</TableHead>
                                                <TableHead style={{ width: '10%' }} className="font-semibold">Trips</TableHead>
                                                <TableHead style={{ width: '8%' }} className="font-semibold">POD Rate</TableHead>
                                                <TableHead style={{ width: '4%' }} className="font-semibold">Status</TableHead>
                                            </>
                                        )}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredParties.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-16">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="p-4 bg-muted/30 rounded-full">
                                                        <Users className="w-12 h-12 text-muted-foreground/50" />
                                                    </div>
                                                    <div className="text-muted-foreground">
                                                        <p className="text-lg font-medium">No parties found</p>
                                                        <p className="text-sm mt-1">
                                                            {searchTerm || typeFilter !== "ALL"
                                                                ? "Try adjusting your filters"
                                                                : "Add your first party to get started"}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredParties.map((party) => {
                                            const typeConfig = partyTypeConfig[party.party_type];
                                            const TypeIcon = typeConfig.icon;
                                            const billingConfig = getBillingStatusConfig(party.billing_status || "");

                                            return (
                                                <TableRow
                                                    key={party.id}
                                                    className="hover:bg-muted/50 transition-colors"
                                                >
                                                    {/* ✅ ALL PARTIES TAB */}
                                                    {selectedTab === "all" && (
                                                        <>
                                                            <TableCell style={{ width: '40%' }}>
                                                                <div className="font-semibold">{party.name}</div>
                                                                {party.contact_person && (
                                                                    <div className="text-xs text-muted-foreground">{party.contact_person}</div>
                                                                )}
                                                            </TableCell>
                                                            <TableCell style={{ width: '10%' }}>
                                                                <Badge className={cn("gap-1", typeConfig.color)}>
                                                                    <TypeIcon className="w-3 h-3" />
                                                                    {typeConfig.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '14%' }}>
                                                                {party.city}, {party.state}
                                                            </TableCell>
                                                            <TableCell style={{ width: '12%' }}>
                                                                <span className="text-sm">{getLastBookingDisplay(party.last_booking_date || null)}</span>
                                                            </TableCell>
                                                            <TableCell style={{ width: '12%' }}>
                                                                <Badge variant="outline" className="font-mono">
                                                                    {party.trips_this_month || 0}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '8%' }}>
                                                                <VerifiedBadges party={party} />
                                                            </TableCell>
                                                            <TableCell style={{ width: '8%' }}>
                                                                <Badge
                                                                    variant={party.status === "ACTIVE" ? "default" : "secondary"}
                                                                    className={cn(
                                                                        "cursor-pointer",
                                                                        party.status === "ACTIVE"
                                                                            ? "bg-green-100 text-green-700 border-green-200"
                                                                            : "bg-gray-100 text-gray-700 border-gray-200"
                                                                    )}
                                                                    onClick={() => togglePartyStatus(party)}
                                                                >
                                                                    {party.status === "ACTIVE" ? <CheckCircle className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                                                                    {party.status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '4%' }}>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => handleEditParty(party.id)}>
                                                                            <Edit className="mr-2 h-4 w-4" />
                                                                            Edit Details
                                                                        </DropdownMenuItem>
                                                                        <DropdownMenuSeparator />
                                                                        <DropdownMenuItem className="text-destructive" onClick={() => setDeletePartyId(party.id)}>
                                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                                            Delete Party
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </>
                                                    )}

                                                    {/* ✅ BILLING PARTIES TAB */}
                                                    {selectedTab === "billing" && (
                                                        <>
                                                            <TableCell style={{ width: '40%' }}>
                                                                <div className="font-semibold">{party.name}</div>
                                                            </TableCell>
                                                            <TableCell style={{ width: '10%' }}>
                                                                <Badge className={cn("gap-1", typeConfig.color)}>
                                                                    <TypeIcon className="w-3 h-3" />
                                                                    {typeConfig.label}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '14%' }}>{party.city}, {party.state}</TableCell>
                                                            <TableCell style={{ width: '12%' }}>{getLastBookingDisplay(party.last_booking_date || null)}</TableCell>
                                                            <TableCell style={{ width: '10%' }}>
                                                                <Badge variant="outline">{party.trips_this_month || 0}</Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '12%' }}>
                                                                <Badge className={cn("text-xs", billingConfig.color)}>
                                                                    {billingConfig.icon} {party.billing_status}
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '8%' }}>
                                                                {party.outstanding_amount ? (
                                                                    <TooltipProvider>
                                                                        <Tooltip>
                                                                            <TooltipTrigger>
                                                                                <span className="text-sm font-semibold text-red-600">
                                                                                    ₹{(party.outstanding_amount / 1000).toFixed(0)}k
                                                                                </span>
                                                                            </TooltipTrigger>
                                                                            <TooltipContent>
                                                                                <p>Outstanding: ₹{party.outstanding_amount.toLocaleString('en-IN')}</p>
                                                                                <p className="text-xs text-muted-foreground mt-1">Last 3 bills pending</p>
                                                                            </TooltipContent>
                                                                        </Tooltip>
                                                                    </TooltipProvider>
                                                                ) : (
                                                                    <span className="text-sm text-muted-foreground">—</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell style={{ width: '4%' }}>
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                            <MoreVertical className="h-4 w-4" />
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuItem onClick={() => navigate(`/customers/edit/${party.id}`)}>
                                                                            <Edit className="mr-2 h-4 w-4" />
                                                                            Edit Details
                                                                        </DropdownMenuItem>
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </TableCell>
                                                        </>
                                                    )}

                                                    {/* ✅ CONSIGNORS TAB */}
                                                    {selectedTab === "consignors" && (
                                                        <>
                                                            <TableCell style={{ width: '50%' }}>
                                                                <div className="font-semibold text-base">{party.name}</div>
                                                            </TableCell>
                                                            <TableCell style={{ width: '18%' }}>{party.city}, {party.state}</TableCell>
                                                            <TableCell style={{ width: '12%' }}>
                                                                <Badge variant="outline">{party.trips_this_month || 0}</Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '10%' }}>{getLastBookingDisplay(party.last_booking_date || null)}</TableCell>
                                                            <TableCell style={{ width: '6%' }}>
                                                                {party.is_billing_party ? (
                                                                    <Badge className="bg-green-100 text-green-700 text-xs">Y</Badge>
                                                                ) : (
                                                                    <span className="text-muted-foreground text-xs">N</span>
                                                                )}
                                                            </TableCell>
                                                            <TableCell style={{ width: '4%' }}>
                                                                <Badge
                                                                    variant={party.status === "ACTIVE" ? "default" : "secondary"}
                                                                    className={cn(
                                                                        party.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                                                    )}
                                                                >
                                                                    {party.status === "ACTIVE" ? "✓" : "✗"}
                                                                </Badge>
                                                            </TableCell>
                                                        </>
                                                    )}

                                                    {/* ✅ CONSIGNEES TAB */}
                                                    {selectedTab === "consignees" && (
                                                        <>
                                                            <TableCell style={{ width: '50%' }}>
                                                                <div className="font-semibold text-base">{party.name}</div>
                                                            </TableCell>
                                                            <TableCell style={{ width: '18%' }}>{party.city}, {party.state}</TableCell>
                                                            <TableCell style={{ width: '10%' }}>{getLastBookingDisplay(party.last_booking_date || null)}</TableCell>
                                                            <TableCell style={{ width: '10%' }}>
                                                                <Badge variant="outline">{party.trips_this_month || 0}</Badge>
                                                            </TableCell>
                                                            <TableCell style={{ width: '8%' }}>
                                                                <TooltipProvider>
                                                                    <Tooltip>
                                                                        <TooltipTrigger>
                                                                            <Badge
                                                                                className={cn(
                                                                                    "font-mono",
                                                                                    party.pod_confirmation_rate && party.pod_confirmation_rate >= 90
                                                                                        ? "bg-green-100 text-green-700"
                                                                                        : party.pod_confirmation_rate && party.pod_confirmation_rate >= 70
                                                                                            ? "bg-yellow-100 text-yellow-700"
                                                                                            : "bg-red-100 text-red-700"
                                                                                )}
                                                                            >
                                                                                {party.pod_confirmation_rate || 0}%
                                                                            </Badge>
                                                                        </TooltipTrigger>
                                                                        <TooltipContent>
                                                                            <p>POD Confirmation Rate</p>
                                                                            <p className="text-xs text-muted-foreground">Based on delivery confirmations</p>
                                                                        </TooltipContent>
                                                                    </Tooltip>
                                                                </TooltipProvider>
                                                            </TableCell>
                                                            <TableCell style={{ width: '4%' }}>
                                                                <Badge
                                                                    variant={party.status === "ACTIVE" ? "default" : "secondary"}
                                                                    className={cn(
                                                                        party.status === "ACTIVE" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                                                                    )}
                                                                >
                                                                    {party.status === "ACTIVE" ? "✓" : "✗"}
                                                                </Badge>
                                                            </TableCell>
                                                        </>
                                                    )}
                                                </TableRow>
                                            );
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3">
                        {filteredParties.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="flex flex-col items-center gap-4">
                                    <div className="p-4 bg-muted/30 rounded-full">
                                        <Users className="w-12 h-12 text-muted-foreground/50" />
                                    </div>
                                    <div className="text-muted-foreground">
                                        <p className="text-lg font-medium">No parties found</p>
                                        <p className="text-sm mt-1">
                                            {searchTerm || typeFilter !== "ALL"
                                                ? "Try adjusting your filters"
                                                : "Add your first party to get started"}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            filteredParties.map((party) => {
                                const typeConfig = partyTypeConfig[party.party_type];
                                const TypeIcon = typeConfig.icon;

                                return (
                                    <div key={party.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg p-4 space-y-3 shadow-sm">
                                        {/* Header */}
                                        <div className="flex items-start justify-between">
                                            <div className="space-y-1 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <Building className="w-4 h-4 text-muted-foreground" />
                                                    <span className="font-semibold text-sm">{party.name}</span>
                                                </div>
                                                {party.contact_person && (
                                                    <div className="flex items-center gap-1 text-xs text-muted-foreground ml-6">
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
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuItem
                                                        onClick={() => navigate(`/customers/edit/${party.id}`)}
                                                    >
                                                        <Edit className="mr-2 h-4 w-4" />
                                                        Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setDeletePartyId(party.id)}
                                                    >
                                                        <Trash2 className="mr-2 h-4 w-4" />
                                                        Delete Party
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>

                                        {/* Type and Status */}
                                        <div className="flex items-center gap-2">
                                            <Badge className={cn("gap-1 text-xs", typeConfig.color)}>
                                                <TypeIcon className="w-3 h-3" />
                                                {typeConfig.label}
                                            </Badge>
                                            <Badge
                                                variant={party.status === "ACTIVE" ? "default" : "secondary"}
                                                className={cn(
                                                    "cursor-pointer text-xs",
                                                    party.status === "ACTIVE"
                                                        ? "bg-green-100 text-green-700 border-green-200"
                                                        : "bg-gray-100 text-gray-700 border-gray-200"
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
                                        </div>

                                        {/* Contact Info */}
                                        <div className="space-y-2 text-sm pt-2 border-t border-gray-200 dark:border-gray-800">
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                                                <span>{party.phone}</span>
                                            </div>
                                            {party.email && (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span className="text-xs truncate">{party.email}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Address */}
                                        <div className="space-y-1 pt-2 border-t border-gray-200 dark:border-gray-800">
                                            <div className="flex items-start gap-2 text-sm">
                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5" />
                                                <div className="text-xs">
                                                    <div>{party.address_line1}</div>
                                                    <div>{party.city}, {party.state} - {party.pincode}</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Tax Info */}
                                        {(party.gst_number || party.pan_number) && (
                                            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200 dark:border-gray-800">
                                                {party.gst_number && (
                                                    <Badge variant="outline" className="text-xs">
                                                        GST: {party.gst_number}
                                                    </Badge>
                                                )}
                                                {party.pan_number && (
                                                    <Badge variant="outline" className="text-xs">
                                                        PAN: {party.pan_number}
                                                    </Badge>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            </div>

            {/* Modals */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={handleImportComplete}
            />

            <AlertDialog open={!!deletePartyId} onOpenChange={() => setDeletePartyId(null)}>
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-left">
                            This action cannot be undone. This will permanently delete the party.
                            <div className="mt-3 p-3 bg-destructive/10 rounded-lg border border-destructive/20">
                                <p className="text-sm font-medium text-destructive">
                                    ⚠️ Warning:
                                </p>
                                <p className="text-xs mt-1">
                                    If this party has any associated bookings, it cannot be deleted.
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteParty}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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