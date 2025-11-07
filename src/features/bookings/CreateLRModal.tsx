import { useState, useEffect } from "react";
import { useForm, useFieldArray, Controller } from "react-hook-form";
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
import { Plus, Trash2, Package, FileText, Loader2, MapPin, AlertCircle, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchEwayBillDetails, formatValidityDate } from '@/api/ewayBill';
import { getNextLRNumber, incrementLRNumber } from '@/api/lr-sequences';
import { cn } from "@/lib/utils";
import { LRCityQuickSetup } from "@/components/LRCityQuickSetup";

// Update the LRData interface
export interface LRData {
  lrNumber: string;
  lrDate: string;
  biltiNumber?: string;
  invoiceNumber?: string;
  cargoUnitsString: string;
  materialDescription: string;
  ewayBillDetails?: any[];
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

// ✅ UPDATED PROPS
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
    materialDescription?: string; // For fallback
    cargoUnits?: string;         // For fallback
    eway_bill_details?: any[];   // Main data source
  } | null;
  nextLRNumber: number;
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

  const [activeLRCity, setActiveLRCity] = useState<{
    city_name: string;
    prefix: string;
    lr_number: string;
  } | null>(null);
  const [loadingLRNumber, setLoadingLRNumber] = useState(false);

  const [ewayBillValidations, setEwayBillValidations] = useState<{
    [key: number]: {
      loading: boolean;
      valid: boolean;
      validUntil?: string;
      details?: any;
      error?: string;
    }
  }>({});

  // ✅ ADD THIS STATE TO STORE E-WAY BILL VALUES
  const [ewayBillValues, setEwayBillValues] = useState<{ [key: number]: string }>({});

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger,
    getValues
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

  const validateEwayBill = async (ewayBillNumber: string, index: number) => {
    if (!ewayBillNumber || ewayBillNumber.length !== 12) {
      setEwayBillValidations(prev => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }

    // ✅ PRESERVE THE VALUE BEFORE AND AFTER VALIDATION
    setValue(`documents.${index}.ewayBill`, ewayBillNumber);
    setEwayBillValues(prev => ({
      ...prev,
      [index]: ewayBillNumber
    }));

    setEwayBillValidations(prev => ({
      ...prev,
      [index]: { loading: true, valid: false }
    }));

    try {
      const response = await fetchEwayBillDetails(ewayBillNumber);

      // ✅ ENSURE VALUE PERSISTS AFTER VALIDATION
      setValue(`documents.${index}.ewayBill`, ewayBillNumber);

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

      // ✅ ENSURE VALUE PERSISTS EVEN ON ERROR
      setValue(`documents.${index}.ewayBill`, ewayBillNumber);

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
      console.log('ℹ️ No active LR city configured');
      setActiveLRCity(null);
    } finally {
      setLoadingLRNumber(false);
    }
  };

  const mapUnitType = (unit: string): "BOX" | "CARTOON" | "OTHERS" => {
    if (!unit) return "BOX";
    const upperUnit = unit.toUpperCase();
    if (upperUnit === "BOX" || upperUnit === "BOXES" || upperUnit === "BX") return "BOX";
    if (upperUnit === "CARTOON" || upperUnit === "CARTON" || upperUnit === "CTN") return "CARTOON";
    if (upperUnit === "NOS" || upperUnit === "PCS" || upperUnit === "PIECES") return "OTHERS";
    return "OTHERS";
  };

  useEffect(() => {
    if (isOpen && booking) {
      loadLRNumberFromCity();
      setValue("lrDate", new Date().toISOString().split('T')[0]);

      console.log('🔍 Booking received in LR Modal:', {
        bookingId: booking.bookingId,
        hasEwayDetails: !!booking.eway_bill_details,
        ewayDetailsCount: booking.eway_bill_details?.length || 0,
        ewayDetails: booking.eway_bill_details
      });

      // ✅ SMART DETECTION
      if (booking.eway_bill_details && booking.eway_bill_details.length > 0) {
        console.log('✅ E-way bill booking detected! Auto-filling...');

        const documents = booking.eway_bill_details.map((ewb, idx) => {
          const ewayBillNumber = ewb.number || '';
          // ✅ STORE IN LOCAL STATE
          if (ewayBillNumber) {
            setEwayBillValues(prev => ({
              ...prev,
              [idx]: ewayBillNumber
            }));
          }
          return {
            ewayBill: ewayBillNumber,
            invoice: ewb.document_number || ''
          };
        });

        setValue("documents", documents);

        const firstEway = booking.eway_bill_details[0];

        if (firstEway.raw_data?.itemList && firstEway.raw_data.itemList.length > 0) {
          const items = firstEway.raw_data.itemList.map((item: any) => {
            const unitType = mapUnitType(item.qtyUnit);
            return {
              quantity: item.quantity || 1,
              unit_type: unitType,
              custom_unit_type: unitType === 'OTHERS' ? item.qtyUnit : '',
              material_description: item.productName || item.productDesc || 'Goods'
            };
          });

          setValue("items", items);

          // Pre-validate
          booking.eway_bill_details.forEach((ewb, index) => {
            const { formatted, isExpired } = formatValidityDate(ewb.valid_until);
            setEwayBillValidations(prev => ({
              ...prev,
              [index]: {
                loading: false,
                valid: !isExpired,
                validUntil: formatted,
                details: ewb,
                error: isExpired ? 'E-way bill has expired' : undefined
              }
            }));
          });

          toast({
            title: "🎉 Auto-filled from E-way Bill",
            description: `All details imported from E-way bill #${documents[0].ewayBill}`,
          });

        } else {
          setValue("items", [{
            quantity: 1,
            unit_type: "BOX",
            material_description: booking.materialDescription || ""
          }]);
        }

      } else {
        // MANUAL BOOKING
        console.log('📝 Manual booking - using standard fields');

        const ewayBills = booking.bilti_number ? booking.bilti_number.split(',').map(num => num.trim()) : [];
        const invoices = booking.invoice_number ? booking.invoice_number.split(',').map(num => num.trim()) : [];

        const maxLength = Math.max(ewayBills.length, invoices.length, 1);
        const documents = [];

        for (let i = 0; i < maxLength; i++) {
          const ewayBillNumber = ewayBills[i] || "";
          if (ewayBillNumber) {
            setEwayBillValues(prev => ({
              ...prev,
              [i]: ewayBillNumber
            }));
          }
          documents.push({
            ewayBill: ewayBillNumber,
            invoice: invoices[i] || ""
          });
        }

        setValue("documents", documents);

        if (booking.materialDescription && booking.cargoUnits) {
          const parts = booking.cargoUnits.split(' ');
          const quantity = parseInt(parts[0] || '1');
          const unit = parts.slice(1).join(' ');
          const unitType = mapUnitType(unit);

          setValue("items", [{
            quantity: quantity,
            unit_type: unitType,
            custom_unit_type: unitType === 'OTHERS' ? unit : '',
            material_description: booking.materialDescription
          }]);
        } else {
          setValue("items", [{ quantity: 1, unit_type: "BOX", material_description: "" }]);
        }
      }

    } else if (!isOpen) {
      reset();
      setLrDateError(null);
      setActiveLRCity(null);
      setEwayBillValidations({});
      setEwayBillValues({});
    }
  }, [isOpen, booking]);

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

  const onSubmit = async (data: LRFormData) => {
    setIsSubmitting(true);

    try {
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

      const ewayBillDetailsArray = data.documents
        .map((doc, index) => {
          if (doc.ewayBill && ewayBillValidations[index]?.details) {
            return ewayBillValidations[index].details;
          }
          return null;
        })
        .filter(Boolean);

      console.log('💾 Saving E-way bill details:', ewayBillDetailsArray);

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
          materialDescription: materials,
          ewayBillDetails: ewayBillDetailsArray
        });

        try {
          await incrementLRNumber();
          console.log('✅ LR number incremented successfully');
        } catch (incrementError) {
          console.error('Warning: Failed to increment LR number:', incrementError);
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
    setEwayBillValidations({});
    setEwayBillValues({});
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
            <LRCityQuickSetup onCityConfigured={loadLRNumberFromCity} />
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>LR Number</Label>
              <Input
                {...register("lrNumber")}
                disabled
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
                className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${(errors.lrDate || lrDateError) ? 'border-destructive' : 'border-input'}`}
                disabled={isSubmitting}
                showYearDropdown
                showMonthDropdown
                dropdownMode="select"
                yearDropdownItemNumber={100}
                scrollableYearDropdown
                autoFocus={false}
                shouldCloseOnSelect={true}
                preventOpenOnFocus={true}
              />
              {(errors.lrDate || lrDateError) && (
                <p className="text-sm text-destructive mt-1">
                  {errors.lrDate?.message || lrDateError}
                </p>
              )}
            </div>
          </div>

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
              {documentFields.map((field, index) => {
                const validation = ewayBillValidations[index];

                return (
                  <div key={field.id} className="space-y-2">
                    <div className="flex gap-2">
                      {/* ✅ UPDATED E-WAY BILL INPUT */}
                      <div className="flex-1">
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Controller
                              name={`documents.${index}.ewayBill`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  placeholder="12-digit E-way bill (optional)"
                                  maxLength={12}
                                  className={cn("pr-10", validation?.error && "border-destructive")}
                                  value={field.value || ewayBillValues[index] || ''}
                                  onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '');
                                    field.onChange(val);
                                    // ✅ STORE IN LOCAL STATE
                                    setEwayBillValues(prev => ({
                                      ...prev,
                                      [index]: val
                                    }));
                                  }}
                                  onBlur={field.onBlur}
                                />
                              )}
                            />
                            {/* Validation icons */}
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

                          {/* ✅ UPDATED VALIDATE BUTTON */}
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              const currentValue = getValues(`documents.${index}.ewayBill`) || ewayBillValues[index] || '';

                              if (currentValue && currentValue.length === 12) {
                                validateEwayBill(currentValue, index);
                              } else {
                                toast({
                                  title: "❌ Invalid Format",
                                  description: "E-way bill must be exactly 12 digits",
                                  variant: "destructive",
                                });
                              }
                            }}
                            disabled={validation?.loading}
                            className="hover:bg-primary/10 hover:border-primary"
                          >
                            {validation?.loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                Checking
                              </>
                            ) : validation?.valid ? (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Valid
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="w-4 h-4 mr-1" />
                                Validate
                              </>
                            )}
                          </Button>
                        </div>
                        {errors.documents?.[index]?.ewayBill && (
                          <p className="text-xs text-destructive mt-1">
                            {errors.documents[index]?.ewayBill?.message}
                          </p>
                        )}
                      </div>

                      {/* Invoice Input */}
                      <div className="flex-1">
                        <Input
                          {...register(`documents.${index}.invoice`)}
                          placeholder="Invoice number (optional)"
                        />
                      </div>

                      {/* Delete Button */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeDocument(index);
                          setEwayBillValidations(prev => {
                            const updated = { ...prev };
                            delete updated[index];
                            return updated;
                          });
                          setEwayBillValues(prev => {
                            const updated = { ...prev };
                            delete updated[index];
                            return updated;
                          });
                        }}
                        disabled={documentFields.length === 1}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>

                    {/* Validation Badge */}
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

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground mb-2">Preview (LR Format):</p>
              <pre className="text-sm font-medium whitespace-pre-wrap">
                {generateDisplayFormat(watchedItems)}
              </pre>

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