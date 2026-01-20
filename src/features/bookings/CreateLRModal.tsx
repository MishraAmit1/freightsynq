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
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Plus,
  Trash2,
  Package,
  FileText,
  Loader2,
  MapPin,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileEdit,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchEwayBillDetails, formatValidityDate } from "@/api/ewayBill";
import {
  fetchLRCities,
  LRCitySequence,
  updateLRCityNumber,
} from "@/api/lr-sequences";
import { cn } from "@/lib/utils";
import { LRCityQuickSetup } from "@/components/LRCityQuickSetup";
import { supabase } from "@/lib/supabase";

// ============================================
// INTERFACES
// ============================================

export interface LRData {
  lrNumber: string;
  lrDate: string;
  biltiNumber?: string;
  invoiceNumber?: string;
  cargoUnitsString: string;
  materialDescription: string;
  ewayBillDetails?: any[];
  isOfflineLR?: boolean;
}

// ============================================
// ZOD SCHEMAS
// ============================================

const lrItemSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_type: z.enum(["BOX", "CARTOON", "OTHERS"]),
  custom_unit_type: z.string().optional(),
  material_description: z.string().min(1, "Material description is required"),
});

const documentSchema = z.object({
  ewayBill: z
    .string()
    .regex(/^\d{12}$/, "E-way bill must be exactly 12 digits")
    .or(z.literal("")),
  invoice: z.string(),
});

const lrSchema = z
  .object({
    lrNumber: z.string().min(1, "LR number is required"),
    lrDate: z.string().min(1, "LR date is required"),
    documents: z.array(documentSchema),
    items: z.array(lrItemSchema),
    isOfflineLR: z.boolean().default(false),
  })
  .refine(
    (data) => {
      if (!data.isOfflineLR && data.items.length === 0) {
        return false;
      }
      return true;
    },
    {
      message: "At least one item is required for digital LR",
      path: ["items"],
    },
  );

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
    materialDescription?: string;
    cargoUnits?: string;
    eway_bill_details?: any[];
  } | null;
  nextLRNumber: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const getNextLRNumberForCity = (city: LRCitySequence): string => {
  const nextNumber = (city.current_lr_number + 1).toString().padStart(6, "0");
  return `${city.prefix}${nextNumber}`;
};

const mapUnitType = (unit: string): "BOX" | "CARTOON" | "OTHERS" => {
  if (!unit) return "BOX";
  const upperUnit = unit.toUpperCase();
  if (upperUnit === "BOX" || upperUnit === "BOXES" || upperUnit === "BX")
    return "BOX";
  if (upperUnit === "CARTOON" || upperUnit === "CARTON" || upperUnit === "CTN")
    return "CARTOON";
  if (upperUnit === "NOS" || upperUnit === "PCS" || upperUnit === "PIECES")
    return "OTHERS";
  return "OTHERS";
};

// ============================================
// MAIN COMPONENT
// ============================================

export const CreateLRModal = ({
  isOpen,
  onClose,
  onSave,
  booking,
  nextLRNumber,
}: CreateLRModalProps) => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lrDateError, setLrDateError] = useState<string | null>(null);

  // LR Cities state
  const [lrCities, setLrCities] = useState<LRCitySequence[]>([]);
  const [loadingLRCities, setLoadingLRCities] = useState(true);
  const [selectedCityId, setSelectedCityId] = useState<string>("");
  const [selectedCity, setSelectedCity] = useState<LRCitySequence | null>(null);

  const [isOfflineLR, setIsOfflineLR] = useState(false);

  const [ewayBillValidations, setEwayBillValidations] = useState<{
    [key: number]: {
      loading: boolean;
      valid: boolean;
      validUntil?: string;
      details?: any;
      error?: string;
    };
  }>({});

  const [ewayBillValues, setEwayBillValues] = useState<{
    [key: number]: string;
  }>({});

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger,
    getValues,
  } = useForm<LRFormData>({
    resolver: zodResolver(lrSchema),
    defaultValues: {
      items: [
        {
          quantity: 1,
          unit_type: "BOX",
          material_description: "",
        },
      ],
      documents: [
        {
          ewayBill: "",
          invoice: "",
        },
      ],
      isOfflineLR: false,
    },
  });

  const {
    fields: itemFields,
    append: appendItem,
    remove: removeItem,
  } = useFieldArray({
    control,
    name: "items",
  });

  const {
    fields: documentFields,
    append: appendDocument,
    remove: removeDocument,
  } = useFieldArray({
    control,
    name: "documents",
  });

  // Load LR cities
  const loadLRCities = async () => {
    setLoadingLRCities(true);
    try {
      const cities = await fetchLRCities();
      setLrCities(cities);

      const activeCity = cities.find((c) => c.is_active) || cities[0];
      if (activeCity) {
        setSelectedCityId(activeCity.id);
        setSelectedCity(activeCity);
        setValue("lrNumber", getNextLRNumberForCity(activeCity));
      }
    } catch (error) {
      console.error("Error loading LR cities:", error);
      setLrCities([]);
    } finally {
      setLoadingLRCities(false);
    }
  };

  const handleCityChange = (cityId: string) => {
    const city = lrCities.find((c) => c.id === cityId);
    if (city) {
      setSelectedCityId(cityId);
      setSelectedCity(city);
      setValue("lrNumber", getNextLRNumberForCity(city));
    }
  };

  const handleOfflineToggle = (checked: boolean) => {
    setIsOfflineLR(checked);
    setValue("isOfflineLR", checked);

    if (checked) {
      setValue("items", []);
    } else {
      setValue("items", [
        {
          quantity: 1,
          unit_type: "BOX",
          material_description: "",
        },
      ]);
    }
  };

  // E-way bill validation
  const validateEwayBill = async (ewayBillNumber: string, index: number) => {
    if (!ewayBillNumber || ewayBillNumber.length !== 12) {
      setEwayBillValidations((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }

    setValue(`documents.${index}.ewayBill`, ewayBillNumber);
    setEwayBillValues((prev) => ({
      ...prev,
      [index]: ewayBillNumber,
    }));

    setEwayBillValidations((prev) => ({
      ...prev,
      [index]: { loading: true, valid: false },
    }));

    try {
      const response = await fetchEwayBillDetails(ewayBillNumber);

      setValue(`documents.${index}.ewayBill`, ewayBillNumber);

      if (response.success && response.data) {
        const { isExpired, isExpiringSoon, formatted } = formatValidityDate(
          response.data.valid_until,
        );

        setEwayBillValidations((prev) => ({
          ...prev,
          [index]: {
            loading: false,
            valid: !isExpired,
            validUntil: formatted,
            details: response.data,
            error: isExpired ? "E-way bill has expired" : undefined,
          },
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
          });
        } else {
          toast({
            title: "✅ E-way Bill Valid",
            description: `Valid until ${formatted}`,
          });
        }
      }
    } catch (error: any) {
      console.error("E-way bill validation error:", error);

      setValue(`documents.${index}.ewayBill`, ewayBillNumber);

      setEwayBillValidations((prev) => ({
        ...prev,
        [index]: {
          loading: false,
          valid: false,
          error: error.message || "Failed to validate E-way bill",
        },
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
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const isoString = `${year}-${month}-${day}`;

      setValue("lrDate", isoString);
      setLrDateError(null);
    } else {
      setValue("lrDate", "");
      setLrDateError("LR date is required");
    }
  };

  const handleAddDocument = async () => {
    const isValid = await trigger("documents");

    if (!isValid) {
      toast({
        title: "Validation Error",
        description:
          "Please fix the errors in existing E-way bills before adding new ones",
        variant: "destructive",
      });
      return;
    }

    const documents = watch("documents");
    const lastDoc = documents[documents.length - 1];

    if (lastDoc && lastDoc.ewayBill && lastDoc.ewayBill.length !== 12) {
      toast({
        title: "Invalid E-way Bill",
        description:
          "Please enter a valid 12-digit E-way bill before adding a new row",
        variant: "destructive",
      });
      return;
    }

    if (documentFields.length < 10) {
      appendDocument({ ewayBill: "", invoice: "" });
    }
  };

  // Initialize form
  useEffect(() => {
    if (isOpen && booking) {
      loadLRCities();
      setValue("lrDate", new Date().toISOString().split("T")[0]);
      setIsOfflineLR(false);
      setValue("isOfflineLR", false);

      if (booking.eway_bill_details && booking.eway_bill_details.length > 0) {
        const documents = booking.eway_bill_details.map((ewb, idx) => {
          const ewayBillNumber = ewb.number || "";
          if (ewayBillNumber) {
            setEwayBillValues((prev) => ({
              ...prev,
              [idx]: ewayBillNumber,
            }));
          }
          return {
            ewayBill: ewayBillNumber,
            invoice: ewb.document_number || "",
          };
        });

        setValue("documents", documents);

        const firstEway = booking.eway_bill_details[0];

        if (
          firstEway.raw_data?.itemList &&
          firstEway.raw_data.itemList.length > 0
        ) {
          const items = firstEway.raw_data.itemList.map((item: any) => {
            const unitType = mapUnitType(item.qtyUnit);
            return {
              quantity: item.quantity || 1,
              unit_type: unitType,
              custom_unit_type: unitType === "OTHERS" ? item.qtyUnit : "",
              material_description:
                item.productName || item.productDesc || "Goods",
            };
          });

          setValue("items", items);

          booking.eway_bill_details.forEach((ewb, index) => {
            const { formatted, isExpired } = formatValidityDate(
              ewb.valid_until,
            );
            setEwayBillValidations((prev) => ({
              ...prev,
              [index]: {
                loading: false,
                valid: !isExpired,
                validUntil: formatted,
                details: ewb,
                error: isExpired ? "E-way bill has expired" : undefined,
              },
            }));
          });

          toast({
            title: "🎉 Auto-filled from E-way Bill",
            description: `All details imported from E-way bill #${documents[0].ewayBill}`,
          });
        } else {
          setValue("items", [
            {
              quantity: 1,
              unit_type: "BOX",
              material_description: booking.materialDescription || "",
            },
          ]);
        }
      } else {
        const ewayBills = booking.bilti_number
          ? booking.bilti_number.split(",").map((num) => num.trim())
          : [];
        const invoices = booking.invoice_number
          ? booking.invoice_number.split(",").map((num) => num.trim())
          : [];

        const maxLength = Math.max(ewayBills.length, invoices.length, 1);
        const documents = [];

        for (let i = 0; i < maxLength; i++) {
          const ewayBillNumber = ewayBills[i] || "";
          if (ewayBillNumber) {
            setEwayBillValues((prev) => ({
              ...prev,
              [i]: ewayBillNumber,
            }));
          }
          documents.push({
            ewayBill: ewayBillNumber,
            invoice: invoices[i] || "",
          });
        }

        setValue("documents", documents);

        if (booking.materialDescription && booking.cargoUnits) {
          const parts = booking.cargoUnits.split(" ");
          const quantity = parseInt(parts[0] || "1");
          const unit = parts.slice(1).join(" ");
          const unitType = mapUnitType(unit);

          setValue("items", [
            {
              quantity: quantity,
              unit_type: unitType,
              custom_unit_type: unitType === "OTHERS" ? unit : "",
              material_description: booking.materialDescription,
            },
          ]);
        } else {
          setValue("items", [
            { quantity: 1, unit_type: "BOX", material_description: "" },
          ]);
        }
      }
    } else if (!isOpen) {
      reset();
      setLrDateError(null);
      setLrCities([]);
      setSelectedCityId("");
      setSelectedCity(null);
      setEwayBillValidations({});
      setEwayBillValues({});
      setIsOfflineLR(false);
    }
  }, [isOpen, booking]);

  const generateCargoStrings = (items: LRFormData["items"]) => {
    if (!items || items.length === 0) return { units: "", materials: "" };

    const units = items
      .map((item) => {
        let unitType = item.unit_type;
        if (item.unit_type === "OTHERS" && item.custom_unit_type) {
          unitType = item.custom_unit_type;
        }
        return `${item.quantity} ${unitType}`;
      })
      .join(", ");

    const materials = items.map((item) => item.material_description).join(", ");

    return { units, materials };
  };

  const generateDisplayFormat = (items: LRFormData["items"]) => {
    if (!items || items.length === 0) return "No items added";

    return items
      .map((item) => {
        let unitType = item.unit_type;
        if (item.unit_type === "OTHERS" && item.custom_unit_type) {
          unitType = item.custom_unit_type;
        }
        return `${item.quantity} ${unitType} - ${item.material_description}`;
      })
      .join("\n");
  };

  const onSubmit = async (data: LRFormData) => {
    setIsSubmitting(true);

    try {
      if (!isOfflineLR) {
        const ewayBillsToValidate = data.documents
          .map((doc, index) => ({ number: doc.ewayBill, index }))
          .filter((item) => item.number && item.number.length === 12);

        for (const item of ewayBillsToValidate) {
          if (!ewayBillValidations[item.index]?.details) {
            toast({
              title: "⏳ Validating E-way Bills",
              description: "Please wait while we validate all E-way bills...",
            });
            await validateEwayBill(item.number, item.index);
          }
        }

        const invalidItems = data.items.filter(
          (item) =>
            item.unit_type === "OTHERS" && !item.custom_unit_type?.trim(),
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
      }

      const { units, materials } = isOfflineLR
        ? { units: "", materials: "" }
        : generateCargoStrings(data.items);

      const ewayBillDetailsArray = data.documents
        .map((doc, index) => {
          if (doc.ewayBill && ewayBillValidations[index]?.details) {
            return ewayBillValidations[index].details;
          }
          if (doc.ewayBill && isOfflineLR) {
            return { number: doc.ewayBill, is_offline: true };
          }
          return null;
        })
        .filter(Boolean);

      const ewayBillsString = data.documents
        .map((doc) => doc.ewayBill)
        .filter((eb) => eb)
        .join(",");

      const invoicesString = data.documents
        .map((doc) => doc.invoice)
        .filter((inv) => inv)
        .join(",");

      if (booking?.id) {
        const updateData: any = {
          lr_number: data.lrNumber,
          lr_date: data.lrDate,
          bilti_number: ewayBillsString || null,
          invoice_number: invoicesString || null,
          cargo_units: units || null,
          material_description: materials || null,
          eway_bill_details:
            ewayBillDetailsArray.length > 0 ? ewayBillDetailsArray : null,
          is_offline_lr: isOfflineLR,
        };

        if (selectedCity?.id) {
          updateData.lr_city_id = selectedCity.id;
        }

        const { error: updateError } = await supabase
          .from("bookings")
          .update(updateData)
          .eq("id", booking.id);

        if (updateError) {
          console.error("Error updating booking with LR:", updateError);
          throw updateError;
        }

        await onSave(booking.id, {
          lrNumber: data.lrNumber,
          lrDate: data.lrDate,
          biltiNumber: ewayBillsString || undefined,
          invoiceNumber: invoicesString || undefined,
          cargoUnitsString: units,
          materialDescription: materials,
          ewayBillDetails: ewayBillDetailsArray,
          isOfflineLR: isOfflineLR,
        });

        try {
          if (selectedCity) {
            await updateLRCityNumber(
              selectedCity.id,
              selectedCity.current_lr_number + 1,
            );
          }
        } catch (incrementError) {
          console.error(
            "Warning: Failed to increment LR number:",
            incrementError,
          );
        }

        toast({
          title: isOfflineLR
            ? "✅ Offline LR Created"
            : "✅ LR Created Successfully",
          description: isOfflineLR
            ? `Offline LR ${data.lrNumber} created. You can upload the physical LR later.`
            : `LR ${data.lrNumber} created for ${selectedCity?.city_name || "default city"}`,
        });

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
      console.error("Error in LR submission:", error);
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
    setLrCities([]);
    setSelectedCityId("");
    setSelectedCity(null);
    setEwayBillValidations({});
    setEwayBillValues({});
    setIsOfflineLR(false);
    onClose();
  };

  if (!booking) return null;

  const watchedItems = watch("items") || [];
  const watchedDocuments = watch("documents") || [];

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-3xl min-[2000px]:sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="min-[2000px]:pb-2">
          <DialogTitle className="text-lg min-[2000px]:text-xl">
            Create Lorry Receipt (LR)
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 min-[2000px]:space-y-5"
        >
          {/* Booking Info */}
          <div className="p-3 min-[2000px]:p-4 bg-muted/50 rounded-lg text-sm min-[2000px]:text-base">
            <div className="grid grid-cols-2 gap-2 min-[2000px]:gap-3">
              <div>
                <span className="text-muted-foreground">Booking:</span>
                <span className="ml-2 font-medium">{booking.bookingId}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Route:</span>
                <span className="ml-2">
                  {booking.fromLocation} → {booking.toLocation}
                </span>
              </div>
            </div>
          </div>

          {/* LR City Selection */}
          <div className="space-y-2 min-[2000px]:space-y-3">
            <Label className="text-sm min-[2000px]:text-base font-medium">
              LR City <span className="text-destructive">*</span>
            </Label>
            {loadingLRCities ? (
              <div className="flex items-center gap-2 h-10 min-[2000px]:h-12 px-3 min-[2000px]:px-4 border border-input rounded-md bg-muted">
                <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 animate-spin text-primary" />
                <span className="text-sm min-[2000px]:text-base text-muted-foreground">
                  Loading LR cities...
                </span>
              </div>
            ) : lrCities.length > 0 ? (
              <Select
                value={selectedCityId}
                onValueChange={handleCityChange}
                disabled={isSubmitting}
              >
                <SelectTrigger className="h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base">
                  <SelectValue placeholder="Select LR city">
                    {selectedCity && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-primary" />
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs min-[2000px]:text-sm min-[2000px]:h-6"
                        >
                          {selectedCity.prefix}
                        </Badge>
                        <span>{selectedCity.city_name}</span>
                        <span className="text-xs min-[2000px]:text-sm text-muted-foreground ml-auto">
                          Next: {getNextLRNumberForCity(selectedCity)}
                        </span>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {lrCities.map((city) => (
                    <SelectItem
                      key={city.id}
                      value={city.id}
                      className="p-2 min-[2000px]:p-3"
                    >
                      <div className="flex items-center gap-2 w-full">
                        <MapPin className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-muted-foreground" />
                        <Badge
                          variant="secondary"
                          className="font-mono text-xs min-[2000px]:text-sm min-[2000px]:h-6"
                        >
                          {city.prefix}
                        </Badge>
                        <span className="text-sm min-[2000px]:text-base">
                          {city.city_name}
                        </span>
                        {city.is_active && (
                          <Badge
                            variant="outline"
                            className="text-xs min-[2000px]:text-sm text-green-600 border-green-600 ml-2"
                          >
                            Active
                          </Badge>
                        )}
                        <span className="text-xs min-[2000px]:text-sm text-muted-foreground ml-auto">
                          Next: {getNextLRNumberForCity(city)}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <LRCityQuickSetup onCityConfigured={loadLRCities} />
            )}
          </div>

          {/* LR Number & Date */}
          <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
            <div>
              <Label className="text-sm min-[2000px]:text-base">
                LR Number
              </Label>
              <Input
                {...register("lrNumber")}
                className="bg-muted h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base"
              />
              {errors.lrNumber && (
                <p className="text-sm min-[2000px]:text-base text-destructive mt-1">
                  {errors.lrNumber.message}
                </p>
              )}
            </div>
            <div>
              <Label className="text-sm min-[2000px]:text-base">
                LR Date *
              </Label>
              <DatePicker
                selected={watch("lrDate") ? new Date(watch("lrDate")) : null}
                onChange={handleLRDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="Select any date"
                className={`flex h-10 min-[2000px]:h-12 w-full rounded-md border bg-background px-3 min-[2000px]:px-4 py-2 min-[2000px]:py-3 text-sm min-[2000px]:text-base ${errors.lrDate || lrDateError ? "border-destructive" : "border-input"}`}
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
                <p className="text-sm min-[2000px]:text-base text-destructive mt-1">
                  {errors.lrDate?.message || lrDateError}
                </p>
              )}
            </div>
          </div>

          {/* E-way Bills Section */}
          <div className="space-y-3 min-[2000px]:space-y-4">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-2 text-sm min-[2000px]:text-base">
                <FileText className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                E-way Bills & Invoice Numbers
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddDocument}
                disabled={documentFields.length >= 10}
                className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm"
              >
                <Plus className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-2 min-[2000px]:space-y-3">
              {documentFields.map((field, index) => {
                const validation = ewayBillValidations[index];

                return (
                  <div key={field.id} className="space-y-2">
                    <div className="flex gap-2 min-[2000px]:gap-3">
                      <div className="flex-1">
                        <div className="flex gap-2 min-[2000px]:gap-3">
                          <div className="relative flex-1">
                            <Controller
                              name={`documents.${index}.ewayBill`}
                              control={control}
                              render={({ field }) => (
                                <Input
                                  placeholder="12-digit E-way bill (optional)"
                                  maxLength={12}
                                  className={cn(
                                    "pr-10 min-[2000px]:pr-12 h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base",
                                    validation?.error && "border-destructive",
                                  )}
                                  value={
                                    field.value || ewayBillValues[index] || ""
                                  }
                                  onChange={(e) => {
                                    const val = e.target.value.replace(
                                      /\D/g,
                                      "",
                                    );
                                    field.onChange(val);
                                    setEwayBillValues((prev) => ({
                                      ...prev,
                                      [index]: val,
                                    }));
                                  }}
                                  onBlur={field.onBlur}
                                />
                              )}
                            />
                            {validation?.loading && (
                              <div className="absolute right-2 min-[2000px]:right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 animate-spin text-muted-foreground" />
                              </div>
                            )}
                            {!validation?.loading && validation?.valid && (
                              <div className="absolute right-2 min-[2000px]:right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-green-600" />
                              </div>
                            )}
                            {!validation?.loading && validation?.error && (
                              <div className="absolute right-2 min-[2000px]:right-3 top-1/2 -translate-y-1/2">
                                <XCircle className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-destructive" />
                              </div>
                            )}
                          </div>

                          {!isOfflineLR && (
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const currentValue =
                                  getValues(`documents.${index}.ewayBill`) ||
                                  ewayBillValues[index] ||
                                  "";
                                if (
                                  currentValue &&
                                  currentValue.length === 12
                                ) {
                                  validateEwayBill(currentValue, index);
                                } else {
                                  toast({
                                    title: "❌ Invalid Format",
                                    description:
                                      "E-way bill must be exactly 12 digits",
                                    variant: "destructive",
                                  });
                                }
                              }}
                              disabled={validation?.loading}
                              className="h-10 min-[2000px]:h-12 text-xs min-[2000px]:text-sm hover:bg-primary/10 hover:border-primary"
                            >
                              {validation?.loading ? (
                                <>
                                  <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-1 animate-spin" />
                                  Checking
                                </>
                              ) : validation?.valid ? (
                                <>
                                  <CheckCircle2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-1" />
                                  Valid
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-1" />
                                  Validate
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                        {errors.documents?.[index]?.ewayBill && (
                          <p className="text-xs min-[2000px]:text-sm text-destructive mt-1">
                            {errors.documents[index]?.ewayBill?.message}
                          </p>
                        )}
                      </div>

                      <div className="flex-1">
                        <Input
                          {...register(`documents.${index}.invoice`)}
                          placeholder="Invoice number (optional)"
                          className="h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base"
                        />
                      </div>

                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          removeDocument(index);
                          setEwayBillValidations((prev) => {
                            const updated = { ...prev };
                            delete updated[index];
                            return updated;
                          });
                          setEwayBillValues((prev) => {
                            const updated = { ...prev };
                            delete updated[index];
                            return updated;
                          });
                        }}
                        disabled={documentFields.length === 1}
                        className="h-10 min-[2000px]:h-12 w-10 min-[2000px]:w-12"
                      >
                        <Trash2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-destructive" />
                      </Button>
                    </div>

                    {validation?.validUntil && !isOfflineLR && (
                      <div className="flex items-center gap-2 px-2 min-[2000px]:px-3">
                        <Badge
                          variant={validation.valid ? "default" : "destructive"}
                          className="text-xs min-[2000px]:text-sm min-[2000px]:h-6"
                        >
                          {validation.valid ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                              Valid until: {validation.validUntil}
                            </>
                          ) : (
                            <>
                              <XCircle className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                              Expired: {validation.validUntil}
                            </>
                          )}
                        </Badge>
                        {validation.details?.is_mock && (
                          <Badge
                            variant="outline"
                            className="text-xs min-[2000px]:text-sm min-[2000px]:h-6"
                          >
                            <AlertTriangle className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
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

          {/* Offline LR Checkbox */}
          <div className="flex items-center space-x-3 min-[2000px]:space-x-4 p-3 min-[2000px]:p-4 border border-dashed rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
            <Checkbox
              id="offline-lr"
              checked={isOfflineLR}
              onCheckedChange={handleOfflineToggle}
              disabled={isSubmitting}
              className="min-[2000px]:h-5 min-[2000px]:w-5"
            />
            <div className="flex-1">
              <Label
                htmlFor="offline-lr"
                className="text-sm min-[2000px]:text-base font-medium cursor-pointer flex items-center gap-2"
              >
                <FileEdit className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-amber-600" />
                Create LR Offline (Manual/Physical LR)
              </Label>
              <p className="text-xs min-[2000px]:text-sm text-muted-foreground mt-0.5">
                Check this if you're creating a physical LR. You can upload the
                scanned copy later.
              </p>
            </div>
          </div>

          {/* Cargo Items Section - HIDDEN when offline */}
          {!isOfflineLR && (
            <div className="space-y-3 min-[2000px]:space-y-4">
              <div className="flex justify-between">
                <Label className="flex items-center gap-2 text-sm min-[2000px]:text-base">
                  <Package className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                  Cargo Items & Materials
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    itemFields.length < 5 &&
                    appendItem({
                      quantity: 1,
                      unit_type: "BOX",
                      material_description: "",
                    })
                  }
                  disabled={itemFields.length >= 5}
                  className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm"
                >
                  <Plus className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4 mr-1" />
                  Add Item
                </Button>
              </div>

              <div className="space-y-2 min-[2000px]:space-y-3">
                {itemFields.map((field, index) => {
                  const itemType = watch(`items.${index}.unit_type`);

                  return (
                    <div
                      key={field.id}
                      className="p-3 min-[2000px]:p-4 border rounded-lg bg-background"
                    >
                      <div className="flex gap-2 min-[2000px]:gap-3 mb-2">
                        <Input
                          type="number"
                          min="1"
                          {...register(`items.${index}.quantity`, {
                            valueAsNumber: true,
                          })}
                          placeholder="Qty"
                          className="w-20 min-[2000px]:w-24 h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base"
                        />

                        <Select
                          value={itemType}
                          onValueChange={(value) =>
                            setValue(`items.${index}.unit_type`, value as any)
                          }
                        >
                          <SelectTrigger className="w-32 min-[2000px]:w-36 h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem
                              value="BOX"
                              className="text-sm min-[2000px]:text-base"
                            >
                              Box
                            </SelectItem>
                            <SelectItem
                              value="CARTOON"
                              className="text-sm min-[2000px]:text-base"
                            >
                              Cartoon
                            </SelectItem>
                            <SelectItem
                              value="OTHERS"
                              className="text-sm min-[2000px]:text-base"
                            >
                              Others
                            </SelectItem>
                          </SelectContent>
                        </Select>

                        {itemType === "OTHERS" && (
                          <Input
                            {...register(`items.${index}.custom_unit_type`)}
                            placeholder="Specify type"
                            className="flex-1 h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base"
                          />
                        )}

                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            itemFields.length > 1 && removeItem(index)
                          }
                          disabled={itemFields.length === 1}
                          className="h-10 min-[2000px]:h-12 w-10 min-[2000px]:w-12"
                        >
                          <Trash2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-destructive" />
                        </Button>
                      </div>

                      <Input
                        {...register(`items.${index}.material_description`)}
                        placeholder="Material description (e.g., Rice Bags 50kg)"
                        className="w-full h-10 min-[2000px]:h-12 text-sm min-[2000px]:text-base"
                      />
                      {errors.items?.[index]?.material_description && (
                        <p className="text-xs min-[2000px]:text-sm text-destructive mt-1">
                          {errors.items[index]?.material_description?.message}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Preview */}
              <div className="p-3 min-[2000px]:p-4 bg-muted rounded-lg">
                <p className="text-sm min-[2000px]:text-base text-muted-foreground mb-2">
                  Preview (LR Format):
                </p>
                <pre className="text-sm min-[2000px]:text-base font-medium whitespace-pre-wrap">
                  {generateDisplayFormat(watchedItems)}
                </pre>

                {watchedDocuments.some(
                  (doc) => doc.ewayBill || doc.invoice,
                ) && (
                  <div className="mt-3 space-y-2">
                    {watchedDocuments.some((doc) => doc.ewayBill) && (
                      <div>
                        <p className="text-sm min-[2000px]:text-base text-muted-foreground">
                          E-way Bills:
                        </p>
                        <p className="text-sm min-[2000px]:text-base">
                          {watchedDocuments
                            .map((doc) => doc.ewayBill)
                            .filter((eb) => eb)
                            .join(", ")}
                        </p>
                      </div>
                    )}
                    {watchedDocuments.some((doc) => doc.invoice) && (
                      <div>
                        <p className="text-sm min-[2000px]:text-base text-muted-foreground">
                          Invoice Numbers:
                        </p>
                        <p className="text-sm min-[2000px]:text-base">
                          {watchedDocuments
                            .map((doc) => doc.invoice)
                            .filter((inv) => inv)
                            .join(", ")}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Offline LR Info Box */}
          {isOfflineLR && (
            <div className="p-4 min-[2000px]:p-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <div className="flex items-start gap-3 min-[2000px]:gap-4">
                <FileEdit className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-amber-600 mt-0.5" />
                <div>
                  <p className="font-medium text-base min-[2000px]:text-lg text-amber-900 dark:text-amber-100">
                    Offline LR Mode
                  </p>
                  <p className="text-sm min-[2000px]:text-base text-amber-700 dark:text-amber-300 mt-1">
                    You're creating an offline/physical LR. Only LR number,
                    date, and document numbers will be saved. You can upload the
                    scanned copy of the physical LR later from the booking list.
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-4 min-[2000px]:pt-5 gap-2 min-[2000px]:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !selectedCityId || loadingLRCities}
              className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2 animate-spin" />
                  Creating...
                </>
              ) : isOfflineLR ? (
                <>
                  <FileEdit className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
                  Create Offline LR
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
