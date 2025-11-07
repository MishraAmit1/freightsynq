import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Package, Loader2, Save, X, FileText, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { getNextLRNumber } from "@/api/lr-sequences";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchEwayBillDetails, formatValidityDate } from '@/api/ewayBill';
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
// Update the LRData interface
export interface LRData {
    lrNumber?: string;
    lrDate?: string;
    biltiNumber?: string; // This will store comma-separated e-way bills
    invoiceNumber?: string; // This will store comma-separated invoice numbers
    cargoUnitsString: string;
    materialDescription: string;
    ewayBillDetails?: any[];
}

// Re-using validation functions from CreateLRModal/BookingFormModal
const validatePickupDate = (dateString: string | undefined): string | null => {
    if (!dateString) return null;

    // ✅ FIX: Local date banao, UTC nahi
    const selectedDate = new Date(dateString + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Allow 2 days in the past
    const twoDaysAgo = new Date(today);
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);

    if (isNaN(selectedDate.getTime())) {
        return "Invalid date format";
    }

    if (selectedDate < twoDaysAgo) {
        return "Pickup date cannot be more than 2 days in the past";
    }

    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    if (selectedDate > maxDate) {
        return "Pickup date cannot be more than 1 year in the future";
    }

    return null;
};

const validateLRDate = (dateString: string | undefined): string | null => {
    if (!dateString) return null; // Allow empty string / undefined if LR is not being set/edited
    const selectedDate = new Date(dateString);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (isNaN(selectedDate.getTime())) return "Invalid date format";
    if (selectedDate < today) return "Date cannot be in the past";
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 90);
    if (selectedDate > maxDate) return "Date cannot be more than 90 days in the future";
    return null;
};

// ZOD SCHEMAS (Combined)
const lrItemSchema = z.object({
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unit_type: z.enum(["BOX", "CARTOON", "OTHERS"]),
    custom_unit_type: z.string().optional(),
    material_description: z.string().min(1, "Material description is required"),
});

const documentSchema = z.object({
    ewayBill: z.string()
        .regex(/^\d{12}$/, "E-way bill must be exactly 12 digits")
        .or(z.literal("")), // Allow empty string
    invoice: z.string(), // Invoice can be any string
});

const fullBookingSchema = z.object({
    // General Booking Fields
    bookingId: z.string().min(1, "Booking ID is required"), // Read-only but part of form data
    consignorName: z.string().min(1, "Consignor name is required"),
    consigneeName: z.string().min(1, "Consignee name is required"),
    fromLocation: z.string().min(1, "Pickup location is required"),
    toLocation: z.string().min(1, "Drop location is required"),
    serviceType: z.enum(["FTL", "PTL"]),
    pickupDate: z.string().optional().refine((date) => {
        const error = validatePickupDate(date);
        return error === null;
    }, {
        message: "Invalid pickup date"
    }),

    // LR Specific Fields
    lrNumber: z.string().optional(), // Optional initially, can be empty
    lrDate: z.string().optional().refine((date) => { // Optional initially
        const error = validateLRDate(date);
        return error === null;
    }, {
        message: "Invalid LR date"
    }),
    documents: z.array(documentSchema),
    items: z.array(lrItemSchema).optional(), // Can be empty if no LR yet
});

type FullBookingFormData = z.infer<typeof fullBookingSchema>;

interface EditFullBookingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (
        bookingId: string,
        generalData: {
            consignor_id?: string;  // Changed from consignor_name
            consignee_id?: string;
            from_location: string;
            to_location: string;
            service_type: "FTL" | "PTL";
            pickup_date?: string;
        },
        lrData: LRData
    ) => void;
    editingBooking: { // Full Booking object expected
        id: string;
        bookingId: string;
        consignor_id?: string;  // Add this
        consignee_id?: string;
        fromLocation: string;
        toLocation: string;
        serviceType: "FTL" | "PTL";
        pickupDate?: string;
        lrNumber?: string;
        lrDate?: string;
        bilti_number?: string;
        invoice_number?: string;
        cargoUnits?: string; // Comma-separated
        materialDescription?: string; // Comma-separated
    } | null;
    nextLRNumber: number; // For generating new LR if needed
}

export const EditFullBookingModal = ({
    isOpen,
    onClose,
    onSave,
    editingBooking,
    nextLRNumber
}: EditFullBookingModalProps) => {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pickupDateError, setPickupDateError] = useState<string | null>(null);
    const [lrDateError, setLrDateError] = useState<string | null>(null);
    const [ewayBillValidations, setEwayBillValidations] = useState<{
        [key: number]: {
            loading: boolean;
            valid: boolean;
            validUntil?: string;
            details?: any;
            error?: string;
        }
    }>({});
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
        reset,
        setValue,
        watch,
        trigger
    } = useForm<FullBookingFormData>({
        resolver: zodResolver(fullBookingSchema),
        defaultValues: {
            items: [{ quantity: 1, unit_type: "BOX", material_description: "" }],
            documents: [{ ewayBill: "", invoice: "" }]
        }
    });

    const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
        control,
        name: "items"
    });

    const { fields: documentFields, append: appendDocument, remove: removeDocument } = useFieldArray({
        control,
        name: "documents"
    });

    const handleAddDocument = async () => {
        // Validate all existing documents first
        const isValid = await trigger("documents");

        if (!isValid) {
            toast({
                title: "Validation Error",
                description: "Please fix the errors in existing E-way Bills before adding new ones",
                variant: "destructive",
            });
            return;
        }

        // Check if the last document has valid e-way bill (12 digits)
        const documents = watch("documents");
        const lastDoc = documents[documents.length - 1];

        if (lastDoc && lastDoc.ewayBill && lastDoc.ewayBill.length !== 12) {
            toast({
                title: "Invalid E-way Bill",
                description: "Please enter a valid 12-digit E-way bill before adding a new row",
                variant: "destructive",
            });
            return;
        }

        if (documentFields.length < 10) {
            appendDocument({ ewayBill: "", invoice: "" });
        }
    };

    // Handle setting form data when modal opens with an editingBooking
    useEffect(() => {
        if (isOpen && editingBooking) {
            // General booking details
            setValue("bookingId", editingBooking.bookingId);
            setValue("consignorName", editingBooking.consignorName);
            setValue("consigneeName", editingBooking.consigneeName);
            setValue("fromLocation", editingBooking.fromLocation);
            setValue("toLocation", editingBooking.toLocation);
            setValue("serviceType", editingBooking.serviceType);
            setValue("pickupDate", editingBooking.pickupDate || undefined);
            // LR details
            setValue("lrNumber", editingBooking.lrNumber || "");
            setValue("lrDate", editingBooking.lrDate || "");

            // Parse existing e-way bills and invoices if any
            const ewayBills = editingBooking.bilti_number ? editingBooking.bilti_number.split(',').map(num => num.trim()) : [];
            const invoices = editingBooking.invoice_number ? editingBooking.invoice_number.split(',').map(num => num.trim()) : [];

            // Combine them into document pairs
            const maxLength = Math.max(ewayBills.length, invoices.length, 1);
            const documents = [];

            for (let i = 0; i < maxLength; i++) {
                documents.push({
                    ewayBill: ewayBills[i] || "",
                    invoice: invoices[i] || ""
                });
            }

            setValue("documents", documents.length > 0 ? documents : [{ ewayBill: "", invoice: "" }]);

            // Parse existing cargoUnits and materialDescription for items
            if (editingBooking.cargoUnits && editingBooking.materialDescription) {
                const unitsArray = editingBooking.cargoUnits.split(',').map((u: string) => u.trim());
                const materialsArray = editingBooking.materialDescription.split(',').map((m: string) => m.trim());

                if (unitsArray.length === materialsArray.length && unitsArray.length > 0) {
                    const parsedItems = unitsArray.map((unitString, index) => {
                        const material_description = materialsArray[index] || "";
                        const match = unitString.match(/(\d+)\s*(.*)/i);

                        let quantity = 1;
                        let unitType: "BOX" | "CARTOON" | "OTHERS" = "OTHERS";
                        let customUnitType: string | undefined = undefined;

                        if (match && match[1]) {
                            quantity = parseInt(match[1]);
                            const typePart = match[2].trim().toLowerCase();

                            if (typePart === 'box' || typePart === 'boxes') {
                                unitType = 'BOX';
                            } else if (typePart === 'cartoon' || typePart === 'cartoons') {
                                unitType = 'CARTOON';
                            } else {
                                unitType = 'OTHERS';
                                customUnitType = typePart;
                            }
                        }
                        return { quantity, unit_type: unitType, custom_unit_type: customUnitType, material_description: material_description };
                    });
                    setValue("items", parsedItems);
                } else {
                    setValue("items", [{ quantity: 1, unit_type: "BOX", material_description: "" }]);
                }
            } else {
                setValue("items", [{ quantity: 1, unit_type: "BOX", material_description: "" }]);
            }
            setPickupDateError(null);
            setLrDateError(null);
            setEwayBillValidations({});

        } else if (isOpen) {
            reset({
                bookingId: "",
                consignorName: "",
                consigneeName: "",
                fromLocation: "",
                toLocation: "",
                serviceType: "FTL",
                pickupDate: undefined,
                lrNumber: "",
                lrDate: "",
                documents: [{ ewayBill: "", invoice: "" }],
                items: [{ quantity: 1, unit_type: "BOX", material_description: "" }]
            });
            loadNewLRNumber();
            setPickupDateError(null);
            setLrDateError(null);
            setEwayBillValidations({});
        }
    }, [isOpen, editingBooking, setValue, reset]);

    // Generate LR number if none exists for the booking
    const loadNewLRNumber = async () => {
        if (!editingBooking?.lrNumber) {
            try {
                const cityData = await getNextLRNumber();
                setValue("lrNumber", cityData.lr_number);
            } catch (error) {
                console.error('Error loading LR number:', error);
                setValue("lrNumber", `LR${nextLRNumber}`); // Fallback
            }
        }
    };
    const handlePickupDateChange = (date: Date | null) => {
        const isoString = date ? date.toISOString().split('T')[0] : undefined;
        const error = validatePickupDate(isoString);
        setPickupDateError(error);
        setValue("pickupDate", isoString);
    };

    const handleLRDateChange = (date: Date | null) => {
        const isoString = date ? date.toISOString().split('T')[0] : undefined;
        const error = validateLRDate(isoString);
        setLrDateError(error);
        setValue("lrDate", isoString);
    };

    const generateCargoStrings = (items: FullBookingFormData['items']) => {
        if (!items || items.length === 0) return { units: "", materials: "" };

        const units = items.map(item => {
            let unitType = item.unit_type;
            if (item.unit_type === 'OTHERS' && item.custom_unit_type) {
                unitType = item.custom_unit_type;
            }
            return `${item.quantity} ${unitType}`;
        }).join(', ');

        const materials = items.map(item => item.material_description).join(', ');

        return { units, materials };
    };

    const generateDisplayFormat = (items: FullBookingFormData['items']) => {
        if (!items || items.length === 0) return "No items added";

        return items.map(item => {
            let unitType = item.unit_type;
            if (item.unit_type === 'OTHERS' && item.custom_unit_type) {
                unitType = item.custom_unit_type;
            }
            return `${item.quantity} ${unitType} - ${item.material_description}`;
        }).join('\n');
    };
    // ✅ ADD THIS FUNCTION
    const validateEwayBill = async (ewayBillNumber: string, index: number) => {
        if (!ewayBillNumber || ewayBillNumber.length !== 12) {
            setEwayBillValidations(prev => {
                const updated = { ...prev };
                delete updated[index];
                return updated;
            });
            return;
        }

        setEwayBillValidations(prev => ({
            ...prev,
            [index]: { loading: true, valid: false }
        }));

        try {
            const response = await fetchEwayBillDetails(ewayBillNumber);

            if (response.success && response.data) {
                const { isExpired, isExpiringSoon, formatted } = formatValidityDate(response.data.valid_until);

                setEwayBillValidations(prev => ({
                    ...prev,
                    [index]: {
                        loading: false,
                        valid: !isExpired,
                        validUntil: formatted,
                        details: response.data,
                        error: isExpired ? 'E-way bill has expired' : undefined
                    }
                }));

                if (isExpired) {
                    toast({
                        title: "⚠️ E-way Bill Expired",
                        description: `E-way bill ${ewayBillNumber} expired on ${formatted}`,
                        variant: "destructive",
                    });
                } else if (isExpiringSoon) {
                    toast({
                        title: "⏰ E-way Bill Expiring Soon",
                        description: `Valid until ${formatted}`,
                        variant: "default",
                    });
                } else {
                    toast({
                        title: "✅ E-way Bill Valid",
                        description: `Valid until ${formatted}`,
                    });
                }
            }
        } catch (error: any) {
            console.error('E-way bill validation error:', error);

            setEwayBillValidations(prev => ({
                ...prev,
                [index]: {
                    loading: false,
                    valid: false,
                    error: error.message || 'Failed to validate E-way bill'
                }
            }));

            toast({
                title: "❌ Validation Failed",
                description: error.message || "Could not validate E-way bill",
                variant: "destructive",
            });
        }
    };
    const onSubmit = async (data: FullBookingFormData) => {
        setIsSubmitting(true);

        try {
            if (!editingBooking?.id) {
                toast({ title: "Error", description: "Booking ID is missing for update.", variant: "destructive" });
                setIsSubmitting(false);
                return;
            }
            const ewayBillsToValidate = data.documents
                .map((doc, index) => ({ number: doc.ewayBill, index }))
                .filter(item => item.number && item.number.length === 12);
            for (const item of ewayBillsToValidate) {
                if (!ewayBillValidations[item.index]?.details) {
                    toast({
                        title: "⏳ Validating E-way Bills",
                        description: "Please wait while we validate all E-way bills...",
                    });
                    await validateEwayBill(item.number, item.index);
                }
            }
            const hasInvalidEwayBills = ewayBillsToValidate.some(item => {
                const validation = ewayBillValidations[item.index];
                return !validation || !validation.details;
            });
            if (hasInvalidEwayBills) {
                toast({
                    title: "❌ Validation Incomplete",
                    description: "Please wait for all E-way bills to be validated before saving",
                    variant: "destructive",
                });
                setIsSubmitting(false);
                return;
            }
            const ewayBillDetailsArray = data.documents
                .map((doc, index) => {
                    if (doc.ewayBill && ewayBillValidations[index]?.details) {
                        return ewayBillValidations[index].details;
                    }
                    return null;
                })
                .filter(Boolean);

            console.log('💾 Saving E-way bill details:', ewayBillDetailsArray);
            const pickupDateValidationError = validatePickupDate(data.pickupDate);
            if (pickupDateValidationError) {
                toast({ title: "Validation Error", description: pickupDateValidationError, variant: "destructive" });
                setIsSubmitting(false);
                return;
            }
            // Check if LR data is being provided (lrNumber is present and not empty)
            const isLRDataProvided = !!data.lrNumber?.trim();

            if (isLRDataProvided) {
                const lrDateValidationError = validateLRDate(data.lrDate || '');
                if (lrDateValidationError) {
                    toast({ title: "Validation Error", description: lrDateValidationError, variant: "destructive" });
                    setIsSubmitting(false);
                    return;
                }

                const invalidItems = (data.items || []).filter(item =>
                    item.unit_type === 'OTHERS' && !item.custom_unit_type?.trim()
                );
                if (invalidItems.length > 0) {
                    toast({
                        title: "Validation Error",
                        description: "Please specify custom unit type for 'Others' items",
                        variant: "destructive",
                    });
                    setIsSubmitting(false);
                    return;
                }
                if ((data.items || []).length === 0) {
                    toast({
                        title: "Validation Error",
                        description: "At least one cargo item is required if LR number is provided.",
                        variant: "destructive",
                    });
                    setIsSubmitting(false);
                    return;
                }
            }

            const generalData = {
                consignor_id: editingBooking.consignor_id,  // Use ID instead of name
                consignee_id: editingBooking.consignee_id,
                from_location: data.fromLocation,
                to_location: data.toLocation,
                service_type: data.serviceType,
                pickup_date: data.pickupDate || undefined,
            };

            const { units, materials } = generateCargoStrings(data.items);

            // Convert arrays to comma-separated strings
            const ewayBillsString = data.documents
                .map(doc => doc.ewayBill)
                .filter(eb => eb)
                .join(',');

            const invoicesString = data.documents
                .map(doc => doc.invoice)
                .filter(inv => inv)
                .join(',');

            const lrData: LRData = {
                lrNumber: data.lrNumber || undefined,
                lrDate: data.lrDate || undefined,
                biltiNumber: ewayBillsString || undefined,
                invoiceNumber: invoicesString || undefined,
                cargoUnitsString: units,
                materialDescription: materials,
                ewayBillDetails: ewayBillDetailsArray
            };

            await onSave(editingBooking.id, generalData, lrData);

        } catch (error) {
            // Error handling is done in onSave in BookingList
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        reset();
        setPickupDateError(null);
        setLrDateError(null);
        setEwayBillValidations({});
        onClose();
    };

    if (!editingBooking) return null;

    const watchedItems = watch("items") || [];
    const watchedDocuments = watch("documents") || [];
    const watchedLrNumber = watch("lrNumber");

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Edit Booking Details - {editingBooking.bookingId}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
                    {/* General Booking Details */}
                    <div className="space-y-4 border p-4 rounded-lg bg-secondary/50">
                        <h3 className="font-semibold text-lg flex items-center gap-2">General Booking Information</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="bookingId">Booking ID</Label>
                                <Input id="bookingId" {...register("bookingId")} readOnly disabled />
                            </div>
                            <div>
                                <Label htmlFor="service">Service Type *</Label>
                                <Select
                                    value={watch("serviceType")}
                                    onValueChange={(value: "FTL" | "PTL") => setValue("serviceType", value)}
                                    disabled={isSubmitting}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FTL">Full Truck Load (FTL)</SelectItem>
                                        <SelectItem value="PTL">Part Truck Load (PTL)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="consignor">Consignor Name *</Label>
                                <Input
                                    id="consignor"
                                    {...register("consignorName")}
                                    placeholder="Enter consignor name"
                                    disabled={isSubmitting}
                                />
                                {errors.consignorName && (
                                    <p className="text-sm text-destructive mt-1">{errors.consignorName.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="consignee">Consignee Name *</Label>
                                <Input
                                    id="consignee"
                                    {...register("consigneeName")}
                                    placeholder="Enter consignee name"
                                    disabled={isSubmitting}
                                />
                                {errors.consigneeName && (
                                    <p className="text-sm text-destructive mt-1">{errors.consigneeName.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="from">Pickup Location *</Label>
                                <Input
                                    id="from"
                                    {...register("fromLocation")}
                                    placeholder="Enter pickup location"
                                    disabled={isSubmitting}
                                />
                                {errors.fromLocation && (
                                    <p className="text-sm text-destructive mt-1">{errors.fromLocation.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="to">Drop Location *</Label>
                                <Input
                                    id="to"
                                    {...register("toLocation")}
                                    placeholder="Enter drop location"
                                    disabled={isSubmitting}
                                />
                                {errors.toLocation && (
                                    <p className="text-sm text-destructive mt-1">{errors.toLocation.message}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <Label htmlFor="pickup">Pickup Date</Label>
                            <DatePicker
                                selected={watch("pickupDate") ? new Date(watch("pickupDate")!) : null}
                                onChange={handlePickupDateChange}
                                dateFormat="dd/MM/yyyy"
                                placeholderText="DD/MM/YYYY"
                                minDate={new Date()}
                                maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${(errors.pickupDate || pickupDateError) ? 'border-destructive' : 'border-input'
                                    }`}
                                disabled={isSubmitting}
                            />
                            {(errors.pickupDate || pickupDateError) && (
                                <p className="text-sm text-destructive mt-1">
                                    {errors.pickupDate?.message || pickupDateError}
                                </p>
                            )}
                        </div>
                    </div>

                    {/* LR Details Section */}
                    <div className="space-y-4 border p-4 rounded-lg bg-info/10">
                        <h3 className="font-semibold text-lg flex items-center gap-2">Lorry Receipt (LR) Details</h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="lrNumber">LR Number</Label>
                                <Input {...register("lrNumber")} placeholder="Optional / Generate" disabled={isSubmitting} />
                                {!watchedLrNumber && !isSubmitting && (
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={loadNewLRNumber}
                                        className="mt-2"
                                        disabled={isSubmitting}
                                    >
                                        Generate LR Number
                                    </Button>
                                )}
                                {errors.lrNumber && (
                                    <p className="text-sm text-destructive mt-1">{errors.lrNumber.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="lrDate">LR Date</Label>
                                <DatePicker
                                    selected={watch("lrDate") ? new Date(watch("lrDate")!) : null}
                                    onChange={handleLRDateChange}
                                    dateFormat="dd/MM/yyyy"
                                    placeholderText="DD/MM/YYYY"
                                    minDate={new Date()}
                                    maxDate={new Date(new Date().setDate(new Date().getDate() + 90))}
                                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${(errors.lrDate || lrDateError) ? 'border-destructive' : 'border-input'
                                        }`}
                                    disabled={isSubmitting}
                                />
                                {(errors.lrDate || lrDateError) && (
                                    <p className="text-sm text-destructive mt-1">
                                        {errors.lrDate?.message || lrDateError}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* E-way Bills and Invoices */}
                        {/* E-way Bills and Invoices - UPDATED WITH VALIDATION */}
                        <div className="space-y-3">
                            <div className="flex justify-between items-center">
                                <Label className="flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    E-way Bills & Invoice Numbers
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddDocument}
                                    disabled={documentFields.length >= 10 || isSubmitting}
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Row
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {documentFields.map((field, index) => {
                                    const validation = ewayBillValidations[index]; // ✅ NEW

                                    return (
                                        <div key={field.id} className="space-y-2"> {/* ✅ CHANGED */}
                                            <div className="flex gap-2">
                                                <div className="flex-1">
                                                    <div className="relative"> {/* ✅ NEW WRAPPER */}
                                                        <Input
                                                            {...register(`documents.${index}.ewayBill`)}
                                                            placeholder="12-digit E-way bill (optional)"
                                                            maxLength={12}
                                                            className={cn(
                                                                "pr-10", // ✅ PADDING FOR ICON
                                                                validation?.error && "border-destructive"
                                                            )}
                                                            onChange={(e) => {
                                                                const value = e.target.value.replace(/\D/g, '');
                                                                setValue(`documents.${index}.ewayBill`, value);
                                                            }}
                                                            onBlur={(e) => { // ✅ NEW
                                                                const value = e.target.value;
                                                                if (value && value.length === 12) {
                                                                    validateEwayBill(value, index);
                                                                }
                                                            }}
                                                            disabled={isSubmitting}
                                                        />

                                                        {/* ✅ VALIDATION ICONS */}
                                                        {validation?.loading && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                                            </div>
                                                        )}

                                                        {!validation?.loading && validation?.valid && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                                                            </div>
                                                        )}

                                                        {!validation?.loading && validation?.error && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                <XCircle className="w-4 h-4 text-destructive" />
                                                            </div>
                                                        )}
                                                    </div>

                                                    {errors.documents?.[index]?.ewayBill && (
                                                        <p className="text-xs text-destructive mt-1">
                                                            {errors.documents[index]?.ewayBill?.message}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex-1">
                                                    <Input
                                                        {...register(`documents.${index}.invoice`)}
                                                        placeholder="Invoice number (optional)"
                                                        disabled={isSubmitting}
                                                    />
                                                </div>

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        removeDocument(index);
                                                        // ✅ CLEAR VALIDATION
                                                        setEwayBillValidations(prev => {
                                                            const updated = { ...prev };
                                                            delete updated[index];
                                                            return updated;
                                                        });
                                                    }}
                                                    disabled={documentFields.length === 1 || isSubmitting}
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </div>

                                            {/* ✅ VALIDITY BADGE */}
                                            {validation?.validUntil && (
                                                <div className="flex items-center gap-2 px-2">
                                                    <Badge
                                                        variant={validation.valid ? "default" : "destructive"}
                                                        className="text-xs"
                                                    >
                                                        {validation.valid ? (
                                                            <>
                                                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                                                Valid until: {validation.validUntil}
                                                            </>
                                                        ) : (
                                                            <>
                                                                <XCircle className="w-3 h-3 mr-1" />
                                                                Expired: {validation.validUntil}
                                                            </>
                                                        )}
                                                    </Badge>

                                                    {validation.details?.is_mock && (
                                                        <Badge variant="outline" className="text-xs">
                                                            <AlertTriangle className="w-3 h-3 mr-1" />
                                                            Test Data
                                                        </Badge>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Cargo Items */}
                        <div className="space-y-3">
                            <div className="flex justify-between">
                                <Label className="flex items-center gap-2">
                                    <Package className="w-4 h-4" />
                                    Cargo Items & Materials
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => itemFields.length < 5 && appendItem({
                                        quantity: 1,
                                        unit_type: "BOX",
                                        material_description: ""
                                    })}
                                    disabled={itemFields.length >= 5 || isSubmitting}
                                >
                                    <Plus className="w-3 h-3 mr-1" />
                                    Add Item
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {itemFields.map((field, index) => {
                                    const itemType = watch(`items.${index}.unit_type`);

                                    return (
                                        <div key={field.id} className="p-3 border rounded-lg bg-background">
                                            <div className="flex gap-2 mb-2">
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    {...register(`items.${index}.quantity`, { valueAsNumber: true })}
                                                    placeholder="Qty"
                                                    className="w-20"
                                                    disabled={isSubmitting}
                                                />

                                                <Select
                                                    value={itemType}
                                                    onValueChange={(value) =>
                                                        setValue(`items.${index}.unit_type`, value as any)
                                                    }
                                                    disabled={isSubmitting}
                                                >
                                                    <SelectTrigger className="w-32">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="BOX">Box</SelectItem>
                                                        <SelectItem value="CARTOON">Cartoon</SelectItem>
                                                        <SelectItem value="OTHERS">Others</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                {itemType === 'OTHERS' && (
                                                    <Input
                                                        {...register(`items.${index}.custom_unit_type`)}
                                                        placeholder="Specify type"
                                                        className="flex-1"
                                                        disabled={isSubmitting}
                                                    />
                                                )}

                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => itemFields.length > 1 && removeItem(index)}
                                                    disabled={itemFields.length === 1 || isSubmitting}
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </div>

                                            <Input
                                                {...register(`items.${index}.material_description`)}
                                                placeholder="Material description (e.g., Rice Bags 50kg)"
                                                className="w-full"
                                                disabled={isSubmitting}
                                            />
                                            {errors.items?.[index]?.material_description && (
                                                <p className="text-xs text-destructive mt-1">
                                                    {errors.items[index]?.material_description?.message}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Preview */}
                            <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm text-muted-foreground mb-2">Preview (LR Format):</p>
                                <pre className="text-sm font-medium whitespace-pre-wrap">
                                    {generateDisplayFormat(watchedItems)}
                                </pre>

                                {/* Documents Preview */}
                                {watchedDocuments.some(doc => doc.ewayBill || doc.invoice) && (
                                    <div className="mt-3 space-y-2">
                                        {watchedDocuments.some(doc => doc.ewayBill) && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">E-way Bills:</p>
                                                <p className="text-sm">
                                                    {watchedDocuments
                                                        .map(doc => doc.ewayBill)
                                                        .filter(eb => eb)
                                                        .join(', ')}
                                                </p>
                                            </div>
                                        )}

                                        {watchedDocuments.some(doc => doc.invoice) && (
                                            <div>
                                                <p className="text-sm text-muted-foreground">Invoice Numbers:</p>
                                                <p className="text-sm">
                                                    {watchedDocuments
                                                        .map(doc => doc.invoice)
                                                        .filter(inv => inv)
                                                        .join(', ')}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
                            <X className="w-4 h-4 mr-2" />
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            <Save className="w-4 h-4 mr-2" />
                            Save Changes
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
};