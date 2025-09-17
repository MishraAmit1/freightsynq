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
import { Plus, Trash2, Package } from "lucide-react";
import { generateLRNumber } from "@/api/bookings";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { LRData } from "./BookingList"; // Import LRData interface

const validateLRDate = (dateString: string): string | null => {
  if (!dateString) return "LR date is required";

  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(selectedDate.getTime())) {
    return "Invalid date format";
  }

  if (selectedDate < today) {
    return "Date cannot be in the past";
  }

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 90);
  if (selectedDate > maxDate) {
    return "Date cannot be more than 90 days in the future";
  }

  return null;
};

// ZOD SCHEMA
const lrItemSchema = z.object({
  quantity: z.number().min(1, "Quantity must be at least 1"),
  unit_type: z.enum(["BOX", "CARTOON", "OTHERS"]),
  custom_unit_type: z.string().optional(),
  material_description: z.string().min(1, "Material description is required"),
});

const lrSchema = z.object({
  lrNumber: z.string().min(1, "LR number is required"),
  lrDate: z.string()
    .min(1, "LR date is required")
    .refine((date) => {
      const error = validateLRDate(date);
      return error === null;
    }, {
      message: "Invalid date selection"
    }),
  biltiNumber: z.string().optional(),
  invoiceNumber: z.string().optional(),
  items: z.array(lrItemSchema).min(1, "At least one item is required"),
});

type LRFormData = z.infer<typeof lrSchema>;

interface CreateLRModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (bookingId: string, lrData: LRData) => void; // onSave now accepts bookingId
  booking: {
    id: string; // Booking ID is always available
    bookingId: string;
    fromLocation: string;
    toLocation: string;
    lrNumber?: string; // Expect undefined for CreateLRModal use case
    // No need for other LR specific fields here for *creation*
  } | null;
  nextLRNumber: number; // For generating next LR if new
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

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch
  } = useForm<LRFormData>({
    resolver: zodResolver(lrSchema),
    defaultValues: {
      items: [{
        quantity: 1,
        unit_type: "BOX",
        material_description: ""
      }]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const handleLRDateChange = (date: Date | null) => {
    const isoString = date ? date.toISOString().split('T')[0] : '';
    const error = validateLRDate(isoString);
    setLrDateError(error);
    setValue("lrDate", isoString);
  };

  useEffect(() => {
    if (isOpen && booking) {
      // This modal is strictly for creating a *new* LR.
      // So, we assume booking.lrNumber will be undefined/null here.
      loadLRNumber(); // Generate new LR number
      setValue("lrDate", new Date().toISOString().split('T')[0]); // Default to today
      setValue("biltiNumber", "");
      setValue("invoiceNumber", "");
      setValue("items", [{ quantity: 1, unit_type: "BOX", material_description: "" }]);
    } else if (!isOpen) {
      reset();
      setLrDateError(null);
    }
  }, [isOpen, booking, reset, setValue]); // Added reset to dependency array

  const loadLRNumber = async () => {
    try {
      const lrNumber = await generateLRNumber();
      setValue("lrNumber", lrNumber);
    } catch (error) {
      setValue("lrNumber", `LR${nextLRNumber}`); // Fallback
    }
  };

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
      const lrDateValidationError = validateLRDate(data.lrDate);
      if (lrDateValidationError) {
        toast({
          title: "Invalid LR Date",
          description: lrDateValidationError,
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      const { units, materials } = generateCargoStrings(data.items);

      if (booking?.id) {
        await onSave(booking.id, { // Pass booking.id explicitly
          lrNumber: data.lrNumber,
          lrDate: data.lrDate,
          biltiNumber: data.biltiNumber,
          invoiceNumber: data.invoiceNumber,
          cargoUnitsString: units,
          materialDescription: materials
        });
        onClose(); // Close on successful save
      } else {
        toast({
          title: "Error",
          description: "Booking ID is missing for LR creation.",
          variant: "destructive",
        });
        setIsSubmitting(false);
      }
    } catch (error) {
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
    onClose();
  };

  if (!booking) return null;

  const watchedItems = watch("items") || [];

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
          {/* LR Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>LR Number</Label>
              <Input {...register("lrNumber")} disabled={isSubmitting} readOnly />
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


          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Bilti Number</Label>
              <Input {...register("biltiNumber")} placeholder="Optional" disabled={isSubmitting} />
            </div>
            <div>
              <Label>Invoice Number</Label>
              <Input {...register("invoiceNumber")} placeholder="Optional" disabled={isSubmitting} />
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
                onClick={() => fields.length < 5 && append({
                  quantity: 1,
                  unit_type: "BOX",
                  material_description: ""
                })}
                disabled={fields.length >= 5}
              >
                <Plus className="w-3 h-3 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-2">
              {fields.map((field, index) => {
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
                        onClick={() => fields.length > 1 && remove(index)}
                        disabled={fields.length === 1}
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
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create LR"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};