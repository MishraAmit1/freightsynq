import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
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
    FileSpreadsheet
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

// Types
interface Party {
    id: string;
    name: string;
    contact_person?: string | null;
    phone: string;
    email?: string | null;
    address_line1: string;
    address_line2?: string | null;
    city: string;
    state: string;
    pincode: string;
    gst_number?: string | null;
    pan_number?: string | null;
    party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
    status: 'ACTIVE' | 'INACTIVE';
    created_at?: string;
    updated_at?: string;
}

interface PartyFormData {
    name: string;
    contact_person: string;
    phone: string;
    email: string;
    address_line1: string;
    address_line2: string;
    city: string;
    state: string;
    pincode: string;
    gst_number: string;
    pan_number: string;
    party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
    status: 'ACTIVE' | 'INACTIVE';
}

interface PartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    party: Party | null;
    onSave: () => void;
    mode: 'create' | 'edit';
}

interface Stats {
    total: number;
    consignors: number;
    consignees: number;
    active: number;
}

interface ImportRow {
    name: string;
    contact_person?: string;
    phone: string;
    email?: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    state: string;
    pincode: string;
    gst_number?: string;
    pan_number?: string;
    party_type?: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
    status?: 'ACTIVE' | 'INACTIVE';
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

// Party Modal Component
const PartyModal: React.FC<PartyModalProps> = ({ isOpen, onClose, party = null, onSave, mode = "create" }) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<PartyFormData>({
        name: "",
        contact_person: "",
        phone: "",
        email: "",
        address_line1: "",
        address_line2: "",
        city: "",
        state: "",
        pincode: "",
        gst_number: "",
        pan_number: "",
        party_type: "BOTH",
        status: "ACTIVE"
    });

    // Reset/Load form data when modal opens
    useEffect(() => {
        if (isOpen) {
            if (party && mode === "edit") {
                setFormData({
                    name: party.name || "",
                    contact_person: party.contact_person || "",
                    phone: party.phone || "",
                    email: party.email || "",
                    address_line1: party.address_line1 || "",
                    address_line2: party.address_line2 || "",
                    city: party.city || "",
                    state: party.state || "",
                    pincode: party.pincode || "",
                    gst_number: party.gst_number || "",
                    pan_number: party.pan_number || "",
                    party_type: party.party_type || "BOTH",
                    status: party.status || "ACTIVE"
                });
            } else {
                // Reset for create mode
                setFormData({
                    name: "",
                    contact_person: "",
                    phone: "",
                    email: "",
                    address_line1: "",
                    address_line2: "",
                    city: "",
                    state: "",
                    pincode: "",
                    gst_number: "",
                    pan_number: "",
                    party_type: "BOTH",
                    status: "ACTIVE"
                });
            }
        }
    }, [isOpen, party, mode]);

    const handleSubmit = async () => {
        // Validation
        if (!formData.name || !formData.phone || !formData.address_line1 ||
            !formData.city || !formData.state || !formData.pincode) {
            toast({
                title: "Validation Error",
                description: "Please fill all required fields",
                variant: "destructive"
            });
            return;
        }

        // Phone number validation
        if (!/^[0-9]{10}$/.test(formData.phone.replace(/\D/g, ""))) {
            toast({
                title: "Invalid Phone",
                description: "Please enter a valid 10-digit phone number",
                variant: "destructive"
            });
            return;
        }

        // Pincode validation
        if (!/^[0-9]{6}$/.test(formData.pincode)) {
            toast({
                title: "Invalid Pincode",
                description: "Please enter a valid 6-digit pincode",
                variant: "destructive"
            });
            return;
        }

        // Email validation (if provided)
        if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            toast({
                title: "Invalid Email",
                description: "Please enter a valid email address",
                variant: "destructive"
            });
            return;
        }

        // GST validation (if provided)
        if (formData.gst_number && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
            toast({
                title: "Invalid GST",
                description: "Please enter a valid GST number",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);
        try {
            // Prepare data for database
            const dataToSave = {
                ...formData,
                contact_person: formData.contact_person || null,
                email: formData.email || null,
                address_line2: formData.address_line2 || null,
                gst_number: formData.gst_number || null,
                pan_number: formData.pan_number || null,
            };

            if (mode === "edit" && party) {
                // Update existing party
                const { error } = await supabase
                    .from("parties")
                    .update(dataToSave)
                    .eq("id", party.id);

                if (error) throw error;

                toast({
                    title: "Success",
                    description: "Party updated successfully",
                });
            } else {
                // Create new party
                const { error } = await supabase
                    .from("parties")
                    .insert([dataToSave]);

                if (error) throw error;

                toast({
                    title: "Success",
                    description: "Party created successfully",
                });
            }

            onSave();
            onClose();
        } catch (error: any) {
            console.error("Error saving party:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to save party",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "edit" ? "Edit Party" : "Add New Party"}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Party Type Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Party Type *</Label>
                            <Select
                                value={formData.party_type}
                                onValueChange={(value: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH') =>
                                    setFormData({ ...formData, party_type: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CONSIGNOR">Consignor Only</SelectItem>
                                    <SelectItem value="CONSIGNEE">Consignee Only</SelectItem>
                                    <SelectItem value="BOTH">Both (Can be either)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Status</Label>
                            <Select
                                value={formData.status}
                                onValueChange={(value: 'ACTIVE' | 'INACTIVE') =>
                                    setFormData({ ...formData, status: value })
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Basic Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground">Basic Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Party Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter party name"
                                />
                            </div>
                            <div>
                                <Label>Contact Person</Label>
                                <Input
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Contact person name"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground">Contact Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Phone Number *</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="10-digit phone number"
                                    maxLength={10}
                                />
                            </div>
                            <div>
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@example.com"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground">Address Details</h3>
                        <div className="space-y-4">
                            <div>
                                <Label>Address Line 1 *</Label>
                                <Input
                                    value={formData.address_line1}
                                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                    placeholder="Building/Street address"
                                />
                            </div>
                            <div>
                                <Label>Address Line 2</Label>
                                <Input
                                    value={formData.address_line2}
                                    onChange={(e) => setFormData({ ...formData, address_line2: e.target.value })}
                                    placeholder="Area/Landmark (optional)"
                                />
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div>
                                    <Label>City *</Label>
                                    <Input
                                        value={formData.city}
                                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                        placeholder="City"
                                    />
                                </div>
                                <div>
                                    <Label>State *</Label>
                                    <Input
                                        value={formData.state}
                                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                                        placeholder="State"
                                    />
                                </div>
                                <div>
                                    <Label>Pincode *</Label>
                                    <Input
                                        value={formData.pincode}
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                        placeholder="6-digit pincode"
                                        maxLength={6}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tax Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground">Tax Information (Optional)</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>GST Number</Label>
                                <Input
                                    value={formData.gst_number}
                                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                                    placeholder="15-character GST number"
                                    maxLength={15}
                                />
                            </div>
                            <div>
                                <Label>PAN Number</Label>
                                <Input
                                    value={formData.pan_number}
                                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                                    placeholder="10-character PAN"
                                    maxLength={10}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {mode === "edit" ? "Update Party" : "Add Party"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
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

        const valid: ImportRow[] = [];
        const invalid: { row: ImportRow; errors: ValidationError[] }[] = [];
        const phoneNumbers: string[] = [];
        const gstNumbers: string[] = [];

        // Collect all phone and GST numbers for duplicate check
        data.forEach((row) => {
            if (row.phone) phoneNumbers.push(row.phone.toString().trim());
            if (row.gst_number) gstNumbers.push(row.gst_number.toString().trim().toUpperCase());
        });

        // Check existing duplicates in database
        let existingPhones: string[] = [];
        let existingGSTs: string[] = [];

        if (phoneNumbers.length > 0) {
            const { data: existingData } = await supabase
                .from('parties')
                .select('phone, gst_number')
                .or(`phone.in.(${phoneNumbers.join(',')}),gst_number.in.(${gstNumbers.filter(g => g).join(',')})`);

            if (existingData) {
                existingPhones = existingData.map(p => p.phone).filter(Boolean);
                existingGSTs = existingData.map(p => p.gst_number).filter(Boolean);
            }
        }

        // Validate each row
        const duplicates: { row: ImportRow; field: string; value: string }[] = [];

        data.forEach((row, index) => {
            const errors: ValidationError[] = [];
            const processedRow: ImportRow = {
                name: row.name?.toString().trim() || '',
                contact_person: row.contact_person?.toString().trim() || '',
                phone: row.phone?.toString().trim() || '',
                email: row.email?.toString().trim() || '',
                address_line1: row.address_line1?.toString().trim() || '',
                address_line2: row.address_line2?.toString().trim() || '',
                city: row.city?.toString().trim() || '',
                state: row.state?.toString().trim() || '',
                pincode: row.pincode?.toString().trim() || '',
                gst_number: row.gst_number?.toString().trim().toUpperCase() || '',
                pan_number: row.pan_number?.toString().trim().toUpperCase() || '',
                party_type: (row.party_type?.toString().trim().toUpperCase() as any) || 'BOTH',
                status: (row.status?.toString().trim().toUpperCase() as any) || 'ACTIVE'
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
            if (processedRow.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(processedRow.email)) {
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
            if (!['CONSIGNOR', 'CONSIGNEE', 'BOTH'].includes(processedRow.party_type)) {
                processedRow.party_type = 'BOTH';
            }
            if (!['ACTIVE', 'INACTIVE'].includes(processedRow.status)) {
                processedRow.status = 'ACTIVE';
            }

            // Check duplicates
            if (existingPhones.includes(processedRow.phone)) {
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
                    contact_person: row.contact_person || null,
                    phone: row.phone,
                    email: row.email || null,
                    address_line1: row.address_line1,
                    address_line2: row.address_line2 || null,
                    city: row.city,
                    state: row.state,
                    pincode: row.pincode,
                    gst_number: row.gst_number || null,
                    pan_number: row.pan_number || null,
                    party_type: row.party_type || 'BOTH',
                    status: row.status || 'ACTIVE'
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
            title: "Import Completed",
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
            ['name', 'contact_person', 'phone', 'email', 'address_line1', 'address_line2', 'city', 'state', 'pincode', 'gst_number', 'pan_number', 'party_type', 'status'],
            ['ABC Traders', 'John Doe', '9876543210', 'abc@email.com', '123 Main Street', 'Near Mall', 'Mumbai', 'Maharashtra', '400001', '27AABCU9603R1ZM', 'AABCU9603R', 'CONSIGNOR', 'ACTIVE'],
            ['XYZ Logistics', '', '8765432109', '', '456 Park Avenue', '', 'Delhi', 'Delhi', '110001', '', '', 'CONSIGNEE', 'ACTIVE']
        ];

        const ws = XLSX.utils.aoa_to_sheet(template);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Parties');
        XLSX.writeFile(wb, 'parties_import_template.xlsx');

        toast({
            title: "Template Downloaded",
            description: "Use this template to prepare your import data",
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh]">
                <DialogHeader>
                    <DialogTitle>Import Parties</DialogTitle>
                </DialogHeader>

                {step === 'upload' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center">
                            <p className="text-sm text-muted-foreground">
                                Upload CSV or Excel file with party data
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
                                                <TableHead>Phone</TableHead>
                                                <TableHead>City</TableHead>
                                                <TableHead>Type</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {preview.valid.map((row, index) => (
                                                <TableRow key={index}>
                                                    <TableCell>{index + 1}</TableCell>
                                                    <TableCell>{row.name}</TableCell>
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
                                                <TableHead>Name</TableHead>
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
                            {progress.current} of {progress.total} parties imported
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

// Main Customers Component
export const Customers = () => {
    const { toast } = useToast();
    const [parties, setParties] = useState<Party[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ACTIVE");
    const [selectedTab, setSelectedTab] = useState("all");
    const [showImportModal, setShowImportModal] = useState(false);
    const [partyModal, setPartyModal] = useState<{
        isOpen: boolean;
        party: Party | null;
        mode: 'create' | 'edit';
    }>({
        isOpen: false,
        party: null,
        mode: "create"
    });
    const [deletePartyId, setDeletePartyId] = useState<string | null>(null);
    const [stats, setStats] = useState<Stats>({
        total: 0,
        consignors: 0,
        consignees: 0,
        active: 0
    });

    // Load parties from database
    const loadParties = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("parties")
                .select("*")
                .order("created_at", { ascending: false });

            // Apply filters
            if (statusFilter !== "ALL") {
                query = query.eq("status", statusFilter);
            }

            const { data, error } = await query;

            if (error) throw error;

            setParties(data || []);

            // Calculate stats
            const totalParties = data?.length || 0;
            const activeParties = data?.filter(p => p.status === "ACTIVE").length || 0;
            const consignorParties = data?.filter(p =>
                p.party_type === "CONSIGNOR" || p.party_type === "BOTH"
            ).length || 0;
            const consigneeParties = data?.filter(p =>
                p.party_type === "CONSIGNEE" || p.party_type === "BOTH"
            ).length || 0;

            setStats({
                total: totalParties,
                consignors: consignorParties,
                consignees: consigneeParties,
                active: activeParties
            });

        } catch (error: any) {
            console.error("Error loading parties:", error);
            toast({
                title: "Error",
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
                    title: "Cannot Delete",
                    description: "This party has associated bookings and cannot be deleted",
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
                title: "Success",
                description: "Party deleted successfully",
            });

            loadParties();
        } catch (error: any) {
            console.error("Error deleting party:", error);
            toast({
                title: "Error",
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
            (selectedTab === "consignees" && (party.party_type === "CONSIGNEE" || party.party_type === "BOTH"));

        return matchesSearch && matchesType && matchesTab;
    });

    // Export to CSV
    const handleExport = () => {
        const csvContent = [
            ["Name", "Type", "Phone", "Email", "City", "State", "Pincode", "GST", "Status"],
            ...filteredParties.map(party => [
                party.name,
                party.party_type,
                party.phone,
                party.email || "",
                party.city,
                party.state,
                party.pincode,
                party.gst_number || "",
                party.status
            ])
        ].map(row => row.join(",")).join("\n");

        const blob = new Blob([csvContent], { type: "text/csv" });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `parties_${new Date().toISOString().split("T")[0]}.csv`;
        a.click();

        toast({
            title: "Exported",
            description: `${filteredParties.length} parties exported to CSV`,
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading parties...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Customers</h1>
                    <p className="text-muted-foreground">Manage your consignors and consignees</p>
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
                    <Button onClick={() => setPartyModal({ isOpen: true, party: null, mode: "create" })}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Party
                    </Button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Parties</p>
                                <p className="text-2xl font-bold">{stats.total}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-primary opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Consignors</p>
                                <p className="text-2xl font-bold">{stats.consignors}</p>
                            </div>
                            <Package className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Consignees</p>
                                <p className="text-2xl font-bold">{stats.consignees}</p>
                            </div>
                            <Truck className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active</p>
                                <p className="text-2xl font-bold">{stats.active}</p>
                            </div>
                            <Check className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col sm:flex-row gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, phone, city or GST..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="w-full sm:w-48">
                                <Filter className="w-4 h-4 mr-2" />
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
                            <SelectTrigger className="w-full sm:w-48">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Status</SelectItem>
                                <SelectItem value="ACTIVE">Active Only</SelectItem>
                                <SelectItem value="INACTIVE">Inactive Only</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs and Table */}
            <Card>
                <CardHeader>
                    <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                        <TabsList>
                            <TabsTrigger value="all">All Parties ({parties.length})</TabsTrigger>
                            <TabsTrigger value="consignors">Consignors ({stats.consignors})</TabsTrigger>
                            <TabsTrigger value="consignees">Consignees ({stats.consignees})</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Contact</TableHead>
                                    <TableHead>Address</TableHead>
                                    <TableHead>GST/PAN</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredParties.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-8">
                                            <div className="text-muted-foreground">
                                                {searchTerm || typeFilter !== "ALL"
                                                    ? "No parties found matching your criteria"
                                                    : "No parties yet. Add your first party!"}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredParties.map((party) => (
                                        <TableRow key={party.id}>
                                            <TableCell>
                                                <div>
                                                    <div className="font-medium">{party.name}</div>
                                                    {party.contact_person && (
                                                        <div className="text-xs text-muted-foreground">
                                                            {party.contact_person}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={
                                                    party.party_type === "BOTH" ? "default" :
                                                        party.party_type === "CONSIGNOR" ? "secondary" : "outline"
                                                }>
                                                    {party.party_type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1 text-sm">
                                                        <Phone className="w-3 h-3" />
                                                        {party.phone}
                                                    </div>
                                                    {party.email && (
                                                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                            <Mail className="w-3 h-3" />
                                                            {party.email}
                                                        </div>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    <div className="flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {party.city}, {party.state}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {party.pincode}
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">
                                                    {party.gst_number && (
                                                        <div className="text-xs">
                                                            <span className="font-medium">GST:</span> {party.gst_number}
                                                        </div>
                                                    )}
                                                    {party.pan_number && (
                                                        <div className="text-xs">
                                                            <span className="font-medium">PAN:</span> {party.pan_number}
                                                        </div>
                                                    )}
                                                    {!party.gst_number && !party.pan_number && (
                                                        <span className="text-muted-foreground">-</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={party.status === "ACTIVE" ? "success" : "secondary"}>
                                                    {party.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuItem
                                                            onClick={() => setPartyModal({
                                                                isOpen: true,
                                                                party: party,
                                                                mode: "edit"
                                                            })}
                                                        >
                                                            <Edit className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            className="text-destructive"
                                                            onClick={() => setDeletePartyId(party.id)}
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
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
                    </div>
                </CardContent>
            </Card>

            {/* Party Modal */}
            <PartyModal
                isOpen={partyModal.isOpen}
                onClose={() => setPartyModal({ isOpen: false, party: null, mode: "create" })}
                party={partyModal.party}
                mode={partyModal.mode}
                onSave={loadParties}
            />

            {/* Import Modal */}
            <ImportModal
                isOpen={showImportModal}
                onClose={() => setShowImportModal(false)}
                onImportComplete={loadParties}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletePartyId} onOpenChange={() => setDeletePartyId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the party.
                            If this party has any associated bookings, it cannot be deleted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteParty}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};