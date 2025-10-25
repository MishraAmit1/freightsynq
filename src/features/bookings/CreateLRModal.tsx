// components/CreateLRModal.tsx (COMPLETE UPDATED VERSION)
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package, FileText, Loader2, MapPin, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// ✅ NEW IMPORT
import { getNextLRNumber, incrementLRNumber } from '@/api/lr-sequences';

// Update the LRData interface
export interface LRData {
  lrNumber: string;
  lrDate: string;
  biltiNumber?: string;
  invoiceNumber?: string;
  cargoUnitsString: string;
  materialDescription: string;
}

// Validate LR Date
const validateLRDate = (dateString: string): string | null => {
  if (!dateString) return "LR date is required";

  const selectedDate = new Date(dateString);

  if (isNaN(selectedDate.getTime())) {
    return "Invalid date format";
  }

  // No restrictions - any date allowed
  return null;
};

// ZOD SCHEMA
const lrItemSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_type: z.enum(["BOX", "CARTOON", "OTHERS"]),
  custom_unit_type: z.string().optional(),
  material_description: z.string().min(1, "Material description is required"),
});

const documentSchema = z.object({
  ewayBill: z.string()
    .regex(/^\d{12}$/, "E-way bill must be exactly 12 digits")
    .or(z.literal("")),
  invoice: z.string(),
});

const lrSchema = z.object({
  lrNumber: z.string().min(1, "LR number is required"),
  lrDate: z.string().min(1, "LR date is required"),
  documents: z.array(documentSchema),
  items: z.array(lrItemSchema).min(1, "At least one item is required"),
});

type LRFormData = z.infer<typeof lrSchema>;

interface CreateLRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingId: string, lrData: LRData) => void;
  booking: {
    id: string;
    bookingId: string;
    fromLocation: string;
    toLocation: string;
    lrNumber?: string;
    bilti_number?: string;
    invoice_number?: string;
  } | null;
  nextLRNumber: number; // This won't be used anymore but keeping for compatibility
}

export const CreateLRModal = ({
  isOpen,
  onClose,
  onSave,
  booking,
  nextLRNumber
}: CreateLRModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lrDateError, setLrDateError] = useState<string | null>(null);

  // ✅ NEW STATES
  const [activeLRCity, setActiveLRCity] = useState<{
    city_name: string;
    prefix: string;
    lr_number: string;
  } | null>(null);
  const [loadingLRNumber, setLoadingLRNumber] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger
  } = useForm<LRFormData>({
    resolver: zodResolver(lrSchema),
    defaultValues: {
      items: [{
        quantity: 1,
        unit_type: "BOX",
        material_description: ""
      }],
      documents: [{
        ewayBill: "",
        invoice: ""
      }]
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

  const handleLRDateChange = (date: Date | null) => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const isoString = `${year}-${month}-${day}`;

      setValue("lrDate", isoString);
      setLrDateError(null);
    } else {
      setValue("lrDate", '');
      setLrDateError("LR date is required");
    }
  };

  const handleAddDocument = async () => {
    const isValid = await trigger("documents");

    if (!isValid) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in existing E-way bills before adding new ones",
        variant: "destructive",
      });
      return;
    }

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

  // ✅ NEW FUNCTION: Load LR number from active city
  const loadLRNumberFromCity = async () => {
    setLoadingLRNumber(true);
    try {
      const cityData = await getNextLRNumber();
      setActiveLRCity({
        city_name: cityData.city_name,
        prefix: cityData.prefix,
        lr_number: cityData.lr_number
      });
      setValue("lrNumber", cityData.lr_number);
    } catch (error: any) {
      console.error('Error loading LR number:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load LR number. Please configure cities in Settings.",
        variant: "destructive",
      });
      // Set a fallback
      setActiveLRCity(null);
    } finally {
      setLoadingLRNumber(false);
    }
  };

  // ✅ MODIFIED useEffect
  useEffect(() => {
    if (isOpen && booking) {
      loadLRNumberFromCity(); // ✅ Call new function
      setValue("lrDate", new Date().toISOString().split('T')[0]);

      // Parse existing e-way bills and invoices if any
      const ewayBills = booking.bilti_number ? booking.bilti_number.split(',').map(num => num.trim()) : [];
      const invoices = booking.invoice_number ? booking.invoice_number.split(',').map(num => num.trim()) : [];

      const maxLength = Math.max(ewayBills.length, invoices.length, 1);
      const documents = [];

      for (let i = 0; i < maxLength; i++) {
        documents.push({
          ewayBill: ewayBills[i] || "",
          invoice: invoices[i] || ""
        });
      }

      setValue("documents", documents.length > 0 ? documents : [{ ewayBill: "", invoice: "" }]);
      setValue("items", [{ quantity: 1, unit_type: "BOX", material_description: "" }]);
    } else if (!isOpen) {
      reset();
      setLrDateError(null);
      setActiveLRCity(null); // ✅ Reset city info
    }
  }, [isOpen, booking, reset, setValue]);

  const generateCargoStrings = (items: LRFormData['items']) => {
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

  const generateDisplayFormat = (items: LRFormData['items']) => {
    if (!items || items.length === 0) return "No items added";

    return items.map(item => {
      let unitType = item.unit_type;
      if (item.unit_type === 'OTHERS' && item.custom_unit_type) {
        unitType = item.custom_unit_type;
      }
      return `${item.quantity} ${unitType} - ${item.material_description}`;
    }).join('\n');
  };

  // ✅ MODIFIED onSubmit - Add increment call
  const onSubmit = async (data: LRFormData) => {
    setIsSubmitting(true);

    try {
      const invalidItems = data.items.filter(item =>
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

      const { units, materials } = generateCargoStrings(data.items);

      const ewayBillsString = data.documents
        .map(doc => doc.ewayBill)
        .filter(eb => eb)
        .join(',');

      const invoicesString = data.documents
        .map(doc => doc.invoice)
        .filter(inv => inv)
        .join(',');

      if (booking?.id) {
        await onSave(booking.id, {
          lrNumber: data.lrNumber,
          lrDate: data.lrDate,
          biltiNumber: ewayBillsString || undefined,
          invoiceNumber: invoicesString || undefined,
          cargoUnitsString: units,
          materialDescription: materials
        });

        // ✅ NEW: Increment LR number after successful save
        try {
          await incrementLRNumber();
          console.log('✅ LR number incremented successfully');
        } catch (incrementError) {
          console.error('Warning: Failed to increment LR number:', incrementError);
          // Don't throw - LR is already saved, just log the error
        }

        onClose();
      } else {
        toast({
          title: "Error",
          description: "Booking ID is missing for LR creation.",
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
    } catch (error) {
      console.error('Error in LR submission:', error);
      toast({
        title: "Error",
        description: "Failed to save LR. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setLrDateError(null);
    setActiveLRCity(null);
    onClose();
  };

  if (!booking) return null;

  const watchedItems = watch("items") || [];
  const watchedDocuments = watch("documents") || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Lorry Receipt (LR)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Booking Info */}
          <div className="p-3 bg-muted/50 rounded-lg text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-muted-foreground">Booking:</span>
                <span className="ml-2 font-medium">{booking.bookingId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Route:</span>
                <span className="ml-2">{booking.fromLocation} → {booking.toLocation}</span>
              </div>
            </div>
          </div>

          {/* ✅ NEW: Active LR City Info */}
          {loadingLRNumber ? (
            <div className="flex items-center justify-center p-3 bg-muted/50 rounded-lg">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              <span className="text-sm">Loading LR configuration...</span>
            </div>
          ) : activeLRCity ? (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-primary" />
                <span className="font-medium">Current LR City:</span>
                <Badge variant="default" className="bg-primary/20 text-primary border-primary/30">
                  {activeLRCity.city_name}
                </Badge>
                <span className="text-muted-foreground ml-2">
                  (Next: {activeLRCity.lr_number})
                </span>
              </div>
            </div>
          ) : (
            <Alert className="border-destructive/50 bg-destructive/10">
              <AlertCircle className="w-4 h-4" />
              <AlertDescription className="text-sm">
                No active LR city configured. Please contact admin to set up cities in Company Settings.
              </AlertDescription>
            </Alert>
          )}

          {/* LR Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>LR Number</Label>
              <Input
                {...register("lrNumber")}
                disabled // ✅ Always disabled - auto-generated
                className="bg-muted cursor-not-allowed"
              />
              {errors.lrNumber && (
                <p className="text-sm text-destructive mt-1">{errors.lrNumber.message}</p>
              )}
            </div>
            <div>
              <Label>LR Date *</Label>
              <DatePicker
                selected={watch("lrDate") ? new Date(watch("lrDate")) : null}
                onChange={handleLRDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select any date"
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${(errors.lrDate || lrDateError) ? 'border-destructive' : 'border-input'
                  }`}
                disabled={isSubmitting}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
                scrollableYearDropdown
              />
              {(errors.lrDate || lrDateError) && (
                <p className="text-sm text-destructive mt-1">
                  {errors.lrDate?.message || lrDateError}
                </p>
              )}
            </div>
          </div>

          {/* E-way Bills and Invoices */}
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
                disabled={documentFields.length >= 10}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-2">
              {documentFields.map((field, index) => (
                <div key={field.id} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      {...register(`documents.${index}.ewayBill`)}
                      placeholder="12-digit E-way bill (optional)"
                      maxLength={12}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '');
                        setValue(`documents.${index}.ewayBill`, value);
                      }}
                    />
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
                    />
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeDocument(index)}
                    disabled={documentFields.length === 1}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              ))}
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
                disabled={itemFields.length >= 5}
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
                      />

                      <Select
                        value={itemType}
                        onValueChange={(value) =>
                          setValue(`items.${index}.unit_type`, value as any)
                        }
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
                        />
                      )}

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => itemFields.length > 1 && removeItem(index)}
                        disabled={itemFields.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    <Input
                      {...register(`items.${index}.material_description`)}
                      placeholder="Material description (e.g., Rice Bags 50kg)"
                      className="w-full"
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

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !activeLRCity}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create LR"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};