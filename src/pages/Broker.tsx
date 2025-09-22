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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
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
    AlertCircle
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

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

// Import Modal Component
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
            title: "Import Completed",
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
            title: "Template Downloaded",
            description: "Use this template to prepare your import data",
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Import Brokers</DialogTitle>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Upload CSV or Excel file with broker data
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
                                <li>name - Company name (must be unique)</li>
                                <li>contact_person - Contact person name</li>
                                <li>phone - Phone number (minimum 10 digits)</li>
                                <li>email (optional) - Email address</li>
                                <li>status (optional) - ACTIVE or INACTIVE (defaults to ACTIVE)</li>
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
                                                <TableHead>Company Name</TableHead>
                                                <TableHead>Contact Person</TableHead>
                                                <TableHead>Phone</TableHead>
                                                <TableHead>Email</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.valid.map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>{row.name}</TableCell>
                                                    <TableCell>{row.contact_person}</TableCell>
                                                    <TableCell>{row.phone}</TableCell>
                                                    <TableCell>{row.email || '-'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={row.status === 'ACTIVE' ? 'default' : 'secondary'}>
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
                                                <TableHead>Company Name</TableHead>
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
                            {progress.current} of {progress.total} brokers imported
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

// Edit/Add Broker Modal Component (keeping your existing)
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
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        if (brokerData.phone.length < 10) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid phone number",
                variant: "destructive"
            });
            return;
        }

        if (brokerData.email && !brokerData.email.includes('@')) {
            toast({
                title: "Validation Error",
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

            <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
                <div className="flex flex-col space-y-1.5">
                    <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {title}
                    </h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Company Name *</label>
                        <Input
                            value={brokerData.name}
                            onChange={(e) => setBrokerData({ ...brokerData, name: e.target.value })}
                            placeholder="ABC Transport Company"
                            disabled={loading}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Contact Person *</label>
                        <Input
                            value={brokerData.contactPerson}
                            onChange={(e) => setBrokerData({ ...brokerData, contactPerson: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Phone Number *</label>
                        <Input
                            value={brokerData.phone}
                            onChange={(e) => setBrokerData({ ...brokerData, phone: e.target.value })}
                            placeholder="+91-9876543210"
                            maxLength={15}
                            disabled={loading}
                            className="mt-1"
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
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
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

// Main Broker Component
const Broker = () => {
    const { toast } = useToast();
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
    const [deletingBrokerId, setDeletingBrokerId] = useState<string | null>(null);

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
                title: "Error",
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
                title: "Success",
                description: "Broker added successfully",
            });
        } catch (error) {
            console.error('Error adding broker:', error);
            toast({
                title: "Error",
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
                title: "Success",
                description: "Broker updated successfully",
            });
            setEditingBroker(null);
        } catch (error) {
            console.error('Error updating broker:', error);
            toast({
                title: "Error",
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
                    title: "Cannot Delete",
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
                title: "Success",
                description: "Broker deleted successfully",
            });
        } catch (error) {
            console.error('Error deleting broker:', error);
            toast({
                title: "Error",
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
            title: "Exported Successfully",
            description: `${filteredBrokers.length} brokers exported to CSV`,
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading brokers...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Brokers</h1>
                    <p className="text-muted-foreground">Manage your transport brokers and partners</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowImportModal(true)}
                    >
                        <Upload className="w-4 h-4 mr-2" />
                        Import
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleExport}
                    >
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        onClick={() => {
                            setEditingBroker(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-primary to-primary-hover"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Broker
                    </Button>
                </div>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, contact person, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Brokers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Brokers ({filteredBrokers.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBrokers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <div className="text-muted-foreground">
                                            {searchTerm ? "No brokers found matching your search" : "No brokers added yet"}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBrokers.map((broker) => (
                                    <TableRow key={broker.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                {broker.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                {broker.contact_person}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                {broker.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {broker.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                    {broker.email}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingBroker(broker);
                                                            setIsModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setDeletingBrokerId(broker.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
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
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the broker.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBroker}
                            className="bg-destructive text-destructive-foreground"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Broker;