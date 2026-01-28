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
import { fetchCompanyBranches, CompanyBranch } from "@/api/bookings";
import { fetchLRCities, LRCitySequence } from "@/api/lr-sequences";
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
import {
  Plus,
  Trash2,
  Package,
  Loader2,
  Save,
  X,
  FileText,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileEdit, // ✅ NEW IMPORT
} from "lucide-react";
import { getNextLRNumber } from "@/api/lr-sequences";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { fetchEwayBillDetails, formatValidityDate } from "@/api/ewayBill";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox"; // ✅ NEW IMPORT

// Update the LRData interface
export interface LRData {
  lrNumber?: string;
  lrDate?: string;
  biltiNumber?: string;
  invoiceNumber?: string;
  cargoUnitsString: string;
  materialDescription: string;
  ewayBillDetails?: any[];
  isOfflineLR?: boolean; // ✅ NEW FIELD
}

// Re-using validation functions from CreateLRModal/BookingFormModal
const validatePickupDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null;

  const selectedDate = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

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
  if (!dateString) return null;
  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (isNaN(selectedDate.getTime())) return "Invalid date format";
  if (selectedDate < today) return "Date cannot be in the past";
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (selectedDate > maxDate)
    return "Date cannot be more than 90 days in the future";
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
  ewayBill: z
    .string()
    .regex(/^\d{12}$/, "E-way bill must be exactly 12 digits")
    .or(z.literal("")),
  invoice: z.string(),
});

// ✅ UPDATED SCHEMA - Conditional validation for items
const fullBookingSchema = z
  .object({
    bookingId: z.string().min(1, "Booking ID is required"),
    consignorName: z.string().min(1, "Consignor name is required"),
    consigneeName: z.string().min(1, "Consignee name is required"),
    fromLocation: z.string().min(1, "Pickup location is required"),
    toLocation: z.string().min(1, "Drop location is required"),
    serviceType: z.enum(["FTL", "PTL"]),
    branch_id: z.string().optional(),
    lr_city_id: z.string().optional(),
    pickupDate: z
      .string()
      .optional()
      .refine(
        (date) => {
          const error = validatePickupDate(date);
          return error === null;
        },
        {
          message: "Invalid pickup date",
        },
      ),
    lrNumber: z.string().optional(),
    lrDate: z
      .string()
      .optional()
      .refine(
        (date) => {
          const error = validateLRDate(date);
          return error === null;
        },
        {
          message: "Invalid LR date",
        },
      ),
    documents: z.array(documentSchema),
    items: z.array(lrItemSchema).optional().nullable(), // ✅ ADD nullable
    isOfflineLR: z.boolean().default(false),
  })
  .refine(
    (data) => {
      // ✅ FIXED: Better check
      console.log("🔍 Zod validation:", {
        isOfflineLR: data.isOfflineLR,
        items: data.items,
        itemsLength: data.items?.length,
      });

      // If offline, don't validate items
      if (data.isOfflineLR) {
        return true; // ✅ Always pass for offline
      }

      // For digital LR, items required
      if (!data.items || data.items.length === 0) {
        return false; // ❌ Items required
      }

      return true;
    },
    {
      message: "At least one item is required for digital LR",
      path: ["items"],
    },
  );

type FullBookingFormData = z.infer<typeof fullBookingSchema>;

interface EditFullBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    bookingId: string,
    generalData: {
      consignor_id?: string;
      consignee_id?: string;
      from_location: string;
      to_location: string;
      service_type: "FTL" | "PTL";
      pickup_date?: string;
    },
    lrData: LRData,
  ) => void;
  editingBooking: {
    id: string;
    bookingId: string;
    consignor_id?: string;
    consignee_id?: string;
    consignorName: string;
    consigneeName: string;
    fromLocation: string;
    toLocation: string;
    serviceType: "FTL" | "PTL";
    pickupDate?: string;
    lrNumber?: string;
    lrDate?: string;
    bilti_number?: string;
    invoice_number?: string;
    cargoUnits?: string;
    materialDescription?: string;
    branch_id?: string;
    lr_city_id?: string;
    is_offline_lr?: boolean; // ✅ NEW FIELD
  } | null;
  nextLRNumber: number;
}

export const EditFullBookingModal = ({
  isOpen,
  onClose,
  onSave,
  editingBooking,
  nextLRNumber,
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
    };
  }>({});
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [lrCities, setLrCities] = useState<LRCitySequence[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(false);
  const [loadingLRCities, setLoadingLRCities] = useState(false);
  const [isOfflineLR, setIsOfflineLR] = useState(false); // ✅ NEW STATE

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
    trigger,
  } = useForm<FullBookingFormData>({
    resolver: zodResolver(fullBookingSchema),
    defaultValues: {
      items: [{ quantity: 1, unit_type: "BOX", material_description: "" }],
      documents: [{ ewayBill: "", invoice: "" }],
      isOfflineLR: false, // ✅ NEW DEFAULT
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

  // ✅ NEW HANDLER - Offline LR toggle
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

  const handleAddDocument = async () => {
    const isValid = await trigger("documents");

    if (!isValid) {
      toast({
        title: "Validation Error",
        description:
          "Please fix the errors in existing E-way Bills before adding new ones",
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

  useEffect(() => {
    if (isOpen) {
      loadBranchesAndCities();
    }
  }, [isOpen]);

  const loadBranchesAndCities = async () => {
    try {
      setLoadingBranches(true);
      setLoadingLRCities(true);

      const [branchesData, citiesData] = await Promise.all([
        fetchCompanyBranches(),
        fetchLRCities(),
      ]);

      setBranches(branchesData);
      setLrCities(citiesData);
    } catch (error) {
      console.error("Error loading branches/cities:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load branches or LR cities",
        variant: "destructive",
      });
    } finally {
      setLoadingBranches(false);
      setLoadingLRCities(false);
    }
  };

  // ✅ UPDATED useEffect - Initialize offline LR state
  // ✅ UPDATED - Smart offline LR detection
  useEffect(() => {
    if (isOpen && editingBooking) {
      setValue("bookingId", editingBooking.bookingId);
      setValue("consignorName", editingBooking.consignorName);
      setValue("consigneeName", editingBooking.consigneeName);
      setValue("fromLocation", editingBooking.fromLocation);
      setValue("toLocation", editingBooking.toLocation);
      setValue("serviceType", editingBooking.serviceType);
      setValue("pickupDate", editingBooking.pickupDate || undefined);
      setValue("lrNumber", editingBooking.lrNumber || "");
      setValue("lrDate", editingBooking.lrDate || "");
      setValue("branch_id", editingBooking.branch_id || "");
      setValue("lr_city_id", editingBooking.lr_city_id || "");

      // ✅ FIXED - Detect offline mode
      let isOffline = false;

      if (editingBooking.is_offline_lr !== undefined) {
        isOffline = editingBooking.is_offline_lr;
      } else {
        isOffline =
          !editingBooking.cargoUnits && !editingBooking.materialDescription;
      }

      console.log("🔍 Initializing edit mode:", {
        bookingId: editingBooking.bookingId,
        is_offline_lr: editingBooking.is_offline_lr,
        detected_isOffline: isOffline,
        cargoUnits: editingBooking.cargoUnits,
        materialDescription: editingBooking.materialDescription,
      });

      // ✅ CRITICAL: Set offline FIRST, before items
      setIsOfflineLR(isOffline);
      setValue("isOfflineLR", isOffline, { shouldValidate: true }); // ← Force validation

      // Documents initialization (existing code)
      const ewayBills = editingBooking.bilti_number
        ? editingBooking.bilti_number.split(",").map((num) => num.trim())
        : [];
      const invoices = editingBooking.invoice_number
        ? editingBooking.invoice_number.split(",").map((num) => num.trim())
        : [];

      const maxLength = Math.max(ewayBills.length, invoices.length, 1);
      const documents = [];

      for (let i = 0; i < maxLength; i++) {
        documents.push({
          ewayBill: ewayBills[i] || "",
          invoice: invoices[i] || "",
        });
      }

      setValue(
        "documents",
        documents.length > 0 ? documents : [{ ewayBill: "", invoice: "" }],
      );

      // ✅ FIXED - Conditional items initialization
      if (isOffline) {
        // ❌ OLD: setValue("items", []);
        // ✅ NEW: Don't set items at all, or set undefined
        setValue("items", undefined, { shouldValidate: false }); // ← Don't validate empty
        console.log(
          "✅ Offline LR - Items set to undefined (validation skipped)",
        );
      } else if (
        editingBooking.cargoUnits &&
        editingBooking.materialDescription
      ) {
        // Online LR - parse existing items
        const unitsArray = editingBooking.cargoUnits
          .split(",")
          .map((u: string) => u.trim());
        const materialsArray = editingBooking.materialDescription
          .split(",")
          .map((m: string) => m.trim());

        if (
          unitsArray.length === materialsArray.length &&
          unitsArray.length > 0
        ) {
          const parsedItems = unitsArray.map((unitString, index) => {
            const material_description = materialsArray[index] || "";
            const match = unitString.match(/(\d+)\s*(.*)/i);

            let quantity = 1;
            let unitType: "BOX" | "CARTOON" | "OTHERS" = "OTHERS";
            let customUnitType: string | undefined = undefined;

            if (match && match[1]) {
              quantity = parseInt(match[1]);
              const typePart = match[2].trim().toLowerCase();

              if (typePart === "box" || typePart === "boxes") {
                unitType = "BOX";
              } else if (typePart === "cartoon" || typePart === "cartoons") {
                unitType = "CARTOON";
              } else {
                unitType = "OTHERS";
                customUnitType = typePart;
              }
            }
            return {
              quantity,
              unit_type: unitType,
              custom_unit_type: customUnitType,
              material_description: material_description,
            };
          });
          setValue("items", parsedItems);
          console.log("✅ Online LR - Items loaded:", parsedItems);
        } else {
          setValue("items", [
            { quantity: 1, unit_type: "BOX", material_description: "" },
          ]);
        }
      } else {
        // Default - one empty item
        setValue("items", [
          { quantity: 1, unit_type: "BOX", material_description: "" },
        ]);
        console.log("✅ Default - Empty item loaded");
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
        items: [{ quantity: 1, unit_type: "BOX", material_description: "" }],
        isOfflineLR: false,
      });
      loadNewLRNumber();
      setPickupDateError(null);
      setLrDateError(null);
      setEwayBillValidations({});
      setIsOfflineLR(false);
    }
  }, [isOpen, editingBooking, setValue, reset]);
  const loadNewLRNumber = async () => {
    if (!editingBooking?.lrNumber) {
      try {
        const cityData = await getNextLRNumber();
        setValue("lrNumber", cityData.lr_number);
      } catch (error) {
        console.error("Error loading LR number:", error);
        setValue("lrNumber", `LR${nextLRNumber}`);
      }
    }
  };

  const handlePickupDateChange = (date: Date | null) => {
    const isoString = date ? date.toISOString().split("T")[0] : undefined;
    const error = validatePickupDate(isoString);
    setPickupDateError(error);
    setValue("pickupDate", isoString);
  };

  const handleLRDateChange = (date: Date | null) => {
    const isoString = date ? date.toISOString().split("T")[0] : undefined;
    const error = validateLRDate(isoString);
    setLrDateError(error);
    setValue("lrDate", isoString);
  };

  const generateCargoStrings = (items: FullBookingFormData["items"]) => {
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

  const generateDisplayFormat = (items: FullBookingFormData["items"]) => {
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

  const validateEwayBill = async (ewayBillNumber: string, index: number) => {
    if (!ewayBillNumber || ewayBillNumber.length !== 12) {
      setEwayBillValidations((prev) => {
        const updated = { ...prev };
        delete updated[index];
        return updated;
      });
      return;
    }

    setEwayBillValidations((prev) => ({
      ...prev,
      [index]: { loading: true, valid: false },
    }));

    try {
      const response = await fetchEwayBillDetails(ewayBillNumber);

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
      console.error("E-way bill validation error:", error);

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

  // ✅ UPDATED onSubmit - Handle offline LR
  const onSubmit = async (data: FullBookingFormData) => {
    setIsSubmitting(true);

    try {
      if (!editingBooking?.id) {
        toast({
          title: "Error",
          description: "Booking ID is missing for update.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

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

      const hasInvalidEwayBills = ewayBillsToValidate.some((item) => {
        const validation = ewayBillValidations[item.index];
        return !validation || !validation.details;
      });

      if (hasInvalidEwayBills) {
        toast({
          title: "❌ Validation Incomplete",
          description:
            "Please wait for all E-way bills to be validated before saving",
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

      console.log("💾 Saving E-way bill details:", ewayBillDetailsArray);

      const pickupDateValidationError = validatePickupDate(data.pickupDate);
      if (pickupDateValidationError) {
        toast({
          title: "Validation Error",
          description: pickupDateValidationError,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const isLRDataProvided = !!data.lrNumber?.trim();

      // ✅ UPDATED - Only validate items if NOT offline LR
      if (isLRDataProvided && !isOfflineLR) {
        const lrDateValidationError = validateLRDate(data.lrDate || "");
        if (lrDateValidationError) {
          toast({
            title: "Validation Error",
            description: lrDateValidationError,
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }

        const invalidItems = (data.items || []).filter(
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

        if ((data.items || []).length === 0) {
          toast({
            title: "Validation Error",
            description:
              "At least one cargo item is required if LR number is provided.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
      }

      const generalData = {
        consignor_id: editingBooking.consignor_id,
        consignee_id: editingBooking.consignee_id,
        from_location: data.fromLocation,
        to_location: data.toLocation,
        service_type: data.serviceType,
        pickup_date: data.pickupDate || undefined,
        branch_id: data.branch_id || undefined,
        lr_city_id: data.lr_city_id || undefined,
      };

      // ✅ UPDATED - Empty strings if offline LR
      const { units, materials } = isOfflineLR
        ? { units: "", materials: "" }
        : generateCargoStrings(data.items);

      const ewayBillsString = data.documents
        .map((doc) => doc.ewayBill)
        .filter((eb) => eb)
        .join(",");

      const invoicesString = data.documents
        .map((doc) => doc.invoice)
        .filter((inv) => inv)
        .join(",");

      const lrData: LRData = {
        lrNumber: data.lrNumber || undefined,
        lrDate: data.lrDate || undefined,
        biltiNumber: ewayBillsString || undefined,
        invoiceNumber: invoicesString || undefined,
        cargoUnitsString: units,
        materialDescription: materials,
        ewayBillDetails: ewayBillDetailsArray,
        isOfflineLR: isOfflineLR, // ✅ NEW
      };

      await onSave(editingBooking.id, generalData, lrData);
      console.log("💾 Saving LR Data:", {
        isOfflineLR: isOfflineLR,
        hasItems: data.items?.length || 0,
        cargoUnitsString: units,
        materialDescription: materials,
      });
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
    setIsOfflineLR(false); // ✅ NEW
    onClose();
  };

  if (!editingBooking) return null;

  const watchedItems = watch("items") || [];
  const watchedDocuments = watch("documents") || [];
  const watchedLrNumber = watch("lrNumber");

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-4xl min-[2000px]:sm:max-w-5xl max-h-[90vh] overflow-y-auto bg-card border border-border dark:border-border">
        <DialogHeader className="border-b border-border dark:border-border pb-4 min-[2000px]:pb-5">
          <DialogTitle className="text-xl min-[2000px]:text-2xl font-semibold text-foreground dark:text-white flex items-center gap-2 min-[2000px]:gap-3">
            <div className="p-2 min-[2000px]:p-3 bg-accent dark:bg-primary/10 rounded-lg">
              <Package className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-primary" />
            </div>
            Edit Booking Details - {editingBooking.bookingId}
          </DialogTitle>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-6 min-[2000px]:space-y-8 py-4 min-[2000px]:py-6"
        >
          {/* General Booking Details */}
          <div className="space-y-4 min-[2000px]:space-y-5 border border-border dark:border-border p-4 min-[2000px]:p-6 rounded-lg bg-muted">
            <h3 className="font-semibold text-base min-[2000px]:text-lg text-foreground dark:text-white flex items-center gap-2">
              General Booking Information
            </h3>
            <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
              <div>
                <Label
                  htmlFor="bookingId"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  Booking ID
                </Label>
                <Input
                  id="bookingId"
                  {...register("bookingId")}
                  readOnly
                  disabled
                  className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-muted dark:bg-secondary text-muted-foreground dark:text-muted-foreground"
                />
              </div>
              <div>
                <Label
                  htmlFor="service"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  Service Type <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={watch("serviceType")}
                  onValueChange={(value: "FTL" | "PTL") =>
                    setValue("serviceType", value)
                  }
                  disabled={isSubmitting}
                >
                  <SelectTrigger className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border dark:border-border">
                    <SelectItem
                      value="FTL"
                      className="hover:bg-accent dark:hover:bg-secondary text-sm min-[2000px]:text-base p-2 min-[2000px]:p-3"
                    >
                      Full Truck Load (FTL)
                    </SelectItem>
                    <SelectItem
                      value="PTL"
                      className="hover:bg-accent dark:hover:bg-secondary text-sm min-[2000px]:text-base p-2 min-[2000px]:p-3"
                    >
                      Part Truck Load (PTL)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Branch & LR City Row */}
            <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
              {/* Branch Selector */}
              <div>
                <Label
                  htmlFor="branch"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  Branch
                </Label>
                <Select
                  value={watch("branch_id") || ""}
                  onValueChange={(value) => setValue("branch_id", value)}
                  disabled={isSubmitting || loadingBranches}
                >
                  <SelectTrigger className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white">
                    <SelectValue placeholder="Select branch" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border dark:border-border">
                    {loadingBranches ? (
                      <SelectItem
                        value="loading"
                        disabled
                        className="text-sm min-[2000px]:text-base"
                      >
                        Loading branches...
                      </SelectItem>
                    ) : branches.length === 0 ? (
                      <SelectItem
                        value="none"
                        disabled
                        className="text-sm min-[2000px]:text-base"
                      >
                        No branches found
                      </SelectItem>
                    ) : (
                      branches.map((branch) => (
                        <SelectItem
                          key={branch.id}
                          value={branch.id}
                          className="hover:bg-accent dark:hover:bg-secondary text-sm min-[2000px]:text-base p-2 min-[2000px]:p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {branch.branch_code}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span>{branch.branch_name}</span>
                            {branch.city && (
                              <span className="text-xs text-muted-foreground">
                                ({branch.city})
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* LR City Selector */}
              <div>
                <Label
                  htmlFor="lr_city"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  LR City Sequence
                </Label>
                <Select
                  value={watch("lr_city_id") || ""}
                  onValueChange={(value) => setValue("lr_city_id", value)}
                  disabled={isSubmitting || loadingLRCities}
                >
                  <SelectTrigger className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white">
                    <SelectValue placeholder="Select LR city" />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border dark:border-border">
                    {loadingLRCities ? (
                      <SelectItem
                        value="loading"
                        disabled
                        className="text-sm min-[2000px]:text-base"
                      >
                        Loading cities...
                      </SelectItem>
                    ) : lrCities.length === 0 ? (
                      <SelectItem
                        value="none"
                        disabled
                        className="text-sm min-[2000px]:text-base"
                      >
                        No LR cities configured
                      </SelectItem>
                    ) : (
                      lrCities.map((city) => (
                        <SelectItem
                          key={city.id}
                          value={city.id}
                          className="hover:bg-accent dark:hover:bg-secondary text-sm min-[2000px]:text-base p-2 min-[2000px]:p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">
                              {city.city_name}
                            </span>
                            <span className="text-muted-foreground">-</span>
                            <span className="text-xs text-muted-foreground">
                              {city.prefix}
                              {city.current_lr_number + 1}
                            </span>
                            {city.is_active && (
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0"
                              >
                                Active
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
              <div>
                <Label
                  htmlFor="consignor"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  Consignor Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="consignor"
                  {...register("consignorName")}
                  placeholder="Enter consignor name"
                  disabled={isSubmitting}
                  className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                />
                {errors.consignorName && (
                  <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                    {errors.consignorName.message}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="consignee"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  Consignee Name <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="consignee"
                  {...register("consigneeName")}
                  placeholder="Enter consignee name"
                  disabled={isSubmitting}
                  className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                />
                {errors.consigneeName && (
                  <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                    {errors.consigneeName.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
              <div>
                <Label
                  htmlFor="from"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  Pickup Location <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="from"
                  {...register("fromLocation")}
                  placeholder="Enter pickup location"
                  disabled={isSubmitting}
                  className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                />
                {errors.fromLocation && (
                  <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                    {errors.fromLocation.message}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="to"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  Drop Location <span className="text-red-600">*</span>
                </Label>
                <Input
                  id="to"
                  {...register("toLocation")}
                  placeholder="Enter drop location"
                  disabled={isSubmitting}
                  className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                />
                {errors.toLocation && (
                  <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                    {errors.toLocation.message}
                  </p>
                )}
              </div>
            </div>

            <div>
              <Label
                htmlFor="pickup"
                className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
              >
                Pickup Date
              </Label>
              <DatePicker
                selected={
                  watch("pickupDate") ? new Date(watch("pickupDate")!) : null
                }
                onChange={handlePickupDateChange}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                minDate={new Date()}
                maxDate={
                  new Date(new Date().setFullYear(new Date().getFullYear() + 1))
                }
                className={cn(
                  "flex h-9 min-[2000px]:h-12 w-full rounded-lg border px-3 min-[2000px]:px-4 py-2 min-[2000px]:py-3 text-sm min-[2000px]:text-base mt-1",
                  "bg-card text-foreground dark:text-white",
                  "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                  errors.pickupDate || pickupDateError
                    ? "border-red-600"
                    : "border-border dark:border-border",
                )}
                disabled={isSubmitting}
              />
              {(errors.pickupDate || pickupDateError) && (
                <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                  {errors.pickupDate?.message || pickupDateError}
                </p>
              )}
            </div>
          </div>

          {/* LR Details Section */}
          <div className="space-y-4 min-[2000px]:space-y-5 border border-border dark:border-border p-4 min-[2000px]:p-6 rounded-lg bg-card">
            <h3 className="font-semibold text-base min-[2000px]:text-lg text-foreground dark:text-white flex items-center gap-2">
              <FileText className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-primary" />
              Lorry Receipt (LR) Details
            </h3>
            <div className="grid grid-cols-2 gap-4 min-[2000px]:gap-5">
              <div>
                <Label
                  htmlFor="lrNumber"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  LR Number
                </Label>
                <Input
                  {...register("lrNumber")}
                  placeholder="Optional / Generate"
                  disabled={isSubmitting}
                  className="mt-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                />
                {!watchedLrNumber && !isSubmitting && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadNewLRNumber}
                    className="mt-2 h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
                    disabled={isSubmitting}
                  >
                    Generate LR Number
                  </Button>
                )}
                {errors.lrNumber && (
                  <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                    {errors.lrNumber.message}
                  </p>
                )}
              </div>
              <div>
                <Label
                  htmlFor="lrDate"
                  className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground"
                >
                  LR Date
                </Label>
                <DatePicker
                  selected={watch("lrDate") ? new Date(watch("lrDate")!) : null}
                  onChange={handleLRDateChange}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="DD/MM/YYYY"
                  minDate={new Date()}
                  maxDate={
                    new Date(new Date().setDate(new Date().getDate() + 90))
                  }
                  className={cn(
                    "flex h-9 min-[2000px]:h-12 w-full rounded-lg border px-3 min-[2000px]:px-4 py-2 min-[2000px]:py-3 text-sm min-[2000px]:text-base mt-1",
                    "bg-card text-foreground dark:text-white",
                    "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                    errors.lrDate || lrDateError
                      ? "border-red-600"
                      : "border-border dark:border-border",
                  )}
                  disabled={isSubmitting}
                />
                {(errors.lrDate || lrDateError) && (
                  <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                    {errors.lrDate?.message || lrDateError}
                  </p>
                )}
              </div>
            </div>

            {/* E-way Bills and Invoices */}
            <div className="space-y-3 min-[2000px]:space-y-4">
              <div className="flex justify-between items-center">
                <Label className="flex items-center gap-2 text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  <FileText className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                  E-way Bills & Invoice Numbers
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddDocument}
                  disabled={documentFields.length >= 10 || isSubmitting}
                  className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
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
                          <div className="relative">
                            <Input
                              {...register(`documents.${index}.ewayBill`)}
                              placeholder="12-digit E-way bill (optional)"
                              maxLength={12}
                              className={cn(
                                "pr-10 min-[2000px]:pr-12 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                                validation?.error
                                  ? "border-red-600"
                                  : "border-border dark:border-border",
                              )}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, "");
                                setValue(`documents.${index}.ewayBill`, value);
                              }}
                              onBlur={(e) => {
                                const value = e.target.value;
                                if (value && value.length === 12) {
                                  validateEwayBill(value, index);
                                }
                              }}
                              disabled={isSubmitting}
                            />

                            {/* Validation Icons */}
                            {validation?.loading && (
                              <div className="absolute right-2 min-[2000px]:right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 animate-spin text-primary" />
                              </div>
                            )}

                            {!validation?.loading && validation?.valid && (
                              <div className="absolute right-2 min-[2000px]:right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-[#059669]" />
                              </div>
                            )}

                            {!validation?.loading && validation?.error && (
                              <div className="absolute right-2 min-[2000px]:right-3 top-1/2 -translate-y-1/2">
                                <XCircle className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-red-600" />
                              </div>
                            )}
                          </div>

                          {errors.documents?.[index]?.ewayBill && (
                            <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                              {errors.documents[index]?.ewayBill?.message}
                            </p>
                          )}
                        </div>

                        <div className="flex-1">
                          <Input
                            {...register(`documents.${index}.invoice`)}
                            placeholder="Invoice number (optional)"
                            disabled={isSubmitting}
                            className="h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
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
                          }}
                          disabled={documentFields.length === 1 || isSubmitting}
                          className="h-9 min-[2000px]:h-12 w-9 min-[2000px]:w-12 hover:bg-accent dark:hover:bg-secondary"
                        >
                          <Trash2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-red-600" />
                        </Button>
                      </div>

                      {/* Validity Badge */}
                      {validation?.validUntil && (
                        <div className="flex items-center gap-2 min-[2000px]:gap-3 px-2 min-[2000px]:px-3">
                          <Badge
                            variant={
                              validation.valid ? "default" : "destructive"
                            }
                            className={cn(
                              "text-xs min-[2000px]:text-sm min-[2000px]:h-6",
                              validation.valid
                                ? "bg-[#ECFDF5] text-[#059669] border-[#A7F3D0] dark:bg-[#059669]/15 dark:text-[#34D399] dark:border-[#059669]/30"
                                : "bg-[#FEE2E2] text-[#DC2626] border-[#FCA5A5] dark:bg-[#DC2626]/15 dark:text-[#F87171] dark:border-[#DC2626]/30",
                            )}
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
                              className="text-xs min-[2000px]:text-sm min-[2000px]:h-6 border-[#FCD34D] text-[#D97706] bg-[#FEF3C7] dark:bg-[#D97706]/15 dark:text-[#FCD34D] dark:border-[#D97706]/30"
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

            {/* ✅ NEW - Offline LR Checkbox */}
            <div className="flex items-center space-x-3 min-[2000px]:space-x-4 p-3 min-[2000px]:p-4 border border-dashed rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
              <Checkbox
                id="offline-lr-edit"
                checked={isOfflineLR}
                onCheckedChange={handleOfflineToggle}
                disabled={isSubmitting}
                className="min-[2000px]:h-5 min-[2000px]:w-5"
              />
              <div className="flex-1">
                <Label
                  htmlFor="offline-lr-edit"
                  className="text-sm min-[2000px]:text-base font-medium cursor-pointer flex items-center gap-2 text-foreground dark:text-white"
                >
                  <FileEdit className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-amber-600" />
                  Offline LR (Manual/Physical LR)
                </Label>
                <p className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground mt-0.5">
                  Check this if this is a physical LR without digital cargo
                  items.
                </p>
              </div>
            </div>

            {/* ✅ UPDATED - Cargo Items (Hidden when offline) */}
            {!isOfflineLR && (
              <div className="space-y-3 min-[2000px]:space-y-4">
                <div className="flex justify-between">
                  <Label className="flex items-center gap-2 text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
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
                    disabled={itemFields.length >= 5 || isSubmitting}
                    className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
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
                        className="p-3 min-[2000px]:p-4 border border-border dark:border-border rounded-lg bg-muted"
                      >
                        <div className="flex gap-2 min-[2000px]:gap-3 mb-2">
                          <Input
                            type="number"
                            min="1"
                            {...register(`items.${index}.quantity`, {
                              valueAsNumber: true,
                            })}
                            placeholder="Qty"
                            className="w-20 min-[2000px]:w-24 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white"
                            disabled={isSubmitting}
                          />

                          <Select
                            value={itemType}
                            onValueChange={(value) =>
                              setValue(`items.${index}.unit_type`, value as any)
                            }
                            disabled={isSubmitting}
                          >
                            <SelectTrigger className="w-32 min-[2000px]:w-36 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-card border-border dark:border-border">
                              <SelectItem
                                value="BOX"
                                className="hover:bg-accent dark:hover:bg-secondary text-sm min-[2000px]:text-base p-2 min-[2000px]:p-3"
                              >
                                Box
                              </SelectItem>
                              <SelectItem
                                value="CARTOON"
                                className="hover:bg-accent dark:hover:bg-secondary text-sm min-[2000px]:text-base p-2 min-[2000px]:p-3"
                              >
                                Cartoon
                              </SelectItem>
                              <SelectItem
                                value="OTHERS"
                                className="hover:bg-accent dark:hover:bg-secondary text-sm min-[2000px]:text-base p-2 min-[2000px]:p-3"
                              >
                                Others
                              </SelectItem>
                            </SelectContent>
                          </Select>

                          {itemType === "OTHERS" && (
                            <Input
                              {...register(`items.${index}.custom_unit_type`)}
                              placeholder="Specify type"
                              className="flex-1 h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                              disabled={isSubmitting}
                            />
                          )}

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              itemFields.length > 1 && removeItem(index)
                            }
                            disabled={itemFields.length === 1 || isSubmitting}
                            className="h-9 min-[2000px]:h-12 w-9 min-[2000px]:w-12 hover:bg-accent dark:hover:bg-secondary"
                          >
                            <Trash2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-red-600" />
                          </Button>
                        </div>

                        <Input
                          {...register(`items.${index}.material_description`)}
                          placeholder="Material description (e.g., Rice Bags 50kg)"
                          className="w-full h-9 min-[2000px]:h-12 text-sm min-[2000px]:text-base border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                          disabled={isSubmitting}
                        />
                        {errors.items?.[index]?.material_description && (
                          <p className="text-xs min-[2000px]:text-sm text-red-600 mt-1">
                            {errors.items[index]?.material_description?.message}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Preview */}
                <div className="p-3 min-[2000px]:p-4 bg-muted rounded-lg border border-border dark:border-border">
                  <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground mb-2 font-medium">
                    Preview (LR Format):
                  </p>
                  <pre className="text-sm min-[2000px]:text-base font-medium text-foreground dark:text-white whitespace-pre-wrap">
                    {generateDisplayFormat(watchedItems)}
                  </pre>

                  {/* Documents Preview */}
                  {watchedDocuments.some(
                    (doc) => doc.ewayBill || doc.invoice,
                  ) && (
                    <div className="mt-3 space-y-2 pt-3 border-t border-border dark:border-border">
                      {watchedDocuments.some((doc) => doc.ewayBill) && (
                        <div>
                          <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground">
                            E-way Bills:
                          </p>
                          <p className="text-sm min-[2000px]:text-base text-foreground dark:text-white font-medium">
                            {watchedDocuments
                              .map((doc) => doc.ewayBill)
                              .filter((eb) => eb)
                              .join(", ")}
                          </p>
                        </div>
                      )}

                      {watchedDocuments.some((doc) => doc.invoice) && (
                        <div>
                          <p className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground">
                            Invoice Numbers:
                          </p>
                          <p className="text-sm min-[2000px]:text-base text-foreground dark:text-white font-medium">
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
          </div>

          <DialogFooter className="border-t border-border dark:border-border pt-4 min-[2000px]:pt-5 gap-2 min-[2000px]:gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
              className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base border-border dark:border-border hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-white"
            >
              <X className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-10 min-[2000px]:h-11 text-sm min-[2000px]:text-base bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
            >
              {isSubmitting && (
                <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2 animate-spin" />
              )}
              <Save className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
