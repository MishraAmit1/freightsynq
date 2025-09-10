import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { 
  ArrowLeft, 
  Save, 
  CheckCircle,
  FileText,
  Calendar
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { createBooking, patchBooking, BookingPayload } from "./bookings.api";

const bookingSchema = z.object({
  consignorName: z.string().min(2, "Consignor name must be at least 2 characters"),
  consigneeName: z.string().min(2, "Consignee name must be at least 2 characters"),
  fromLocation: z.string().min(1, "From location is required"),
  toLocation: z.string().min(1, "To location is required"),
  cargoUnits: z.coerce.number().min(1, "Cargo units must be at least 1"),
  materialDescription: z.string().min(3, "Material description must be at least 3 characters"),
  serviceType: z.enum(["FTL", "PTL"]),
  pickupDate: z.string().optional().refine((val) => {
    if (!val) return true;
    const date = new Date(val);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date >= today;
  }, "Pickup date cannot be in the past"),
  invoiceNumber: z.string().optional(),
}).refine((data) => data.fromLocation !== data.toLocation, {
  message: "Destination must be different from origin",
  path: ["toLocation"],
});

type BookingFormData = z.infer<typeof bookingSchema>;

export const BookingForm = () => {
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [bookingUuid, setBookingUuid] = useState<string | null>(null);
  const [status, setStatus] = useState<'DRAFT' | 'CONFIRMED' | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const form = useForm<BookingFormData>({
    resolver: zodResolver(bookingSchema),
    defaultValues: {
      serviceType: "FTL",
    },
  });

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (response, variables) => {
      const { data } = response;
      setBookingId(data.bookingId);
      setBookingUuid(data.id);
      setStatus(data.status);
      
      if (variables.status === 'DRAFT') {
        toast({
          title: "Draft Saved",
          description: `Booking ${data.bookingId} draft has been saved successfully.`,
        });
      } else {
        toast({
          title: "Booking Created",
          description: `Booking ${data.bookingId} has been created successfully.`,
          action: (
            <Button variant="outline" size="sm" onClick={() => navigate(`/bookings/${data.id}`)}>
              View Details
            </Button>
          ),
        });
        // Redirect to booking detail after successful confirmation
        setTimeout(() => navigate(`/bookings/${data.id}`), 2000);
      }
    },
    onError: (error: any) => {
      if (error.response?.data?.errors) {
        // Map server field errors to form
        const serverErrors = error.response.data.errors;
        Object.keys(serverErrors).forEach((field) => {
          form.setError(field as keyof BookingFormData, {
            type: 'server',
            message: serverErrors[field]
          });
        });
      } else {
        toast({
          title: "Error",
          description: "Server error. Please try again.",
          variant: "destructive"
        });
      }
    },
  });

  const patchBookingMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<BookingPayload> }) => 
      patchBooking(id, payload),
    onSuccess: (response) => {
      const { data } = response;
      toast({
        title: "Draft Updated",
        description: `Booking ${data.bookingId} has been updated successfully.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update draft. Please try again.",
        variant: "destructive"
      });
    },
  });

  const onSubmit = async (data: BookingFormData, action: 'draft' | 'confirm') => {
    if (isSubmitting) return; // Prevent double submission
    
    setIsSubmitting(true);
    
    try {
      const payload: BookingPayload = {
        consignorName: data.consignorName,
        consigneeName: data.consigneeName,
        fromLocation: data.fromLocation,
        toLocation: data.toLocation,
        cargoUnits: Number(data.cargoUnits),
        materialDescription: data.materialDescription,
        serviceType: data.serviceType,
        status: action === 'draft' ? 'DRAFT' : 'CONFIRMED',
        ...(data.pickupDate && { pickupDate: data.pickupDate }),
        ...(data.invoiceNumber && { invoiceNumber: data.invoiceNumber }),
      };

      if (bookingUuid && status === 'DRAFT') {
        // Update existing draft
        patchBookingMutation.mutate({ id: bookingUuid, payload });
      } else {
        // Create new booking
        createBookingMutation.mutate(payload);
      }
    } catch (error) {
      console.error('Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getCurrentDateTime = () => {
    return new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const isFormDisabled = status === 'CONFIRMED';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" onClick={() => navigate('/bookings')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Bookings
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Create New Booking</h1>
            <p className="text-muted-foreground">Enter consignor, consignee and cargo details</p>
          </div>
        </div>
        
        {/* Booking ID Display */}
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Booking ID</p>
          <p className="text-lg font-mono font-semibold">
            {bookingId || '—'}
          </p>
          {status && (
            <Badge variant={status === 'CONFIRMED' ? 'default' : 'secondary'} className="mt-1">
              {status}
            </Badge>
          )}
        </div>
      </div>

      {/* Current Date/Time Display */}
      <Card className="border-border shadow-sm bg-muted/30">
        <CardContent className="pt-4">
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Booking Date/Time:</span>
            <span className="font-medium">{getCurrentDateTime()}</span>
          </div>
        </CardContent>
      </Card>

      {/* Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => onSubmit(data, 'confirm'))}>
          <Card className="border-border shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-primary" />
                <span>Booking Details</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Parties Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="consignorName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consignor Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter consignor name" 
                          disabled={isFormDisabled}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="consigneeName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Consignee Name *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter consignee name" 
                          disabled={isFormDisabled}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Route Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="fromLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>From Location *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter pickup location" 
                          disabled={isFormDisabled}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Enter city, state or search for locations
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="toLocation"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>To Location *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter delivery location" 
                          disabled={isFormDisabled}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Must be different from pickup location
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Cargo Details Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="cargoUnits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cargo Units *</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="Enter number of units" 
                          disabled={isFormDisabled}
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription className="text-xs">
                        Enter number of boxes, bags or units
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="invoiceNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Invoice Number</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Enter invoice number (optional)" 
                          disabled={isFormDisabled}
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="materialDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Material Description *</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the materials being shipped" 
                        className="resize-none"
                        disabled={isFormDisabled}
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Type */}
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type *</FormLabel>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className="flex space-x-6"
                        disabled={isFormDisabled}
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="FTL" id="ftl" />
                          <Label htmlFor="ftl" className="font-medium">FTL (Full Truck Load)</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="PTL" id="ptl" />
                          <Label htmlFor="ptl" className="font-medium">PTL (Part Truck Load)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Pickup Date */}
              <FormField
                control={form.control}
                name="pickupDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pickup Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        disabled={isFormDisabled}
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Optional - if provided, must be today or later
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-6">
            <div />
            
            <div className="flex space-x-3">
              {!isFormDisabled && (
                <>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => onSubmit(form.getValues(), 'draft')}
                    disabled={isSubmitting || createBookingMutation.isPending || patchBookingMutation.isPending}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {bookingUuid && status === 'DRAFT' ? 'Update Draft' : 'Save Draft'}
                  </Button>
                  
                  <Button 
                    type="submit"
                    disabled={isSubmitting || createBookingMutation.isPending || patchBookingMutation.isPending}
                    className="bg-gradient-to-r from-success to-success hover:from-success/90 hover:to-success/90 relative"
                  >
                    {(isSubmitting || createBookingMutation.isPending) ? (
                      <>
                        <div className="w-4 h-4 mr-2 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Creating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Confirm & Generate LR
                      </>
                    )}
                  </Button>
                </>
              )}
              
              {status === 'CONFIRMED' && (
                <Button 
                  variant="outline"
                  onClick={() => navigate(`/bookings/${bookingUuid}`)}
                >
                  <FileText className="w-4 h-4 mr-2" />
                  View Booking Details
                </Button>
              )}
            </div>
          </div>

          {/* Confirm Button Helper */}
          {!isFormDisabled && (
            <p className="text-xs text-muted-foreground mt-2 text-right">
              💡 Confirm will generate LR and lock some editable fields
            </p>
          )}
        </form>
      </Form>
    </div>
  );
};