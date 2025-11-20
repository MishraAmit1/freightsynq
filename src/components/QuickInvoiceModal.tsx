import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, Receipt, Calendar } from "lucide-react";

interface QuickInvoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: {
        id: string;
        bookingId: string;
        consignorName: string;
        consigneeName: string;
        fromLocation: string;
        toLocation: string;
    } | null;
    onSuccess: () => void;
}

export const QuickInvoiceModal = ({
    isOpen,
    onClose,
    booking,
    onSuccess
}: QuickInvoiceModalProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [invoiceNumber, setInvoiceNumber] = useState("");

    // Auto-generate invoice number when modal opens
    useState(() => {
        if (isOpen && !invoiceNumber) {
            generateInvoiceNumber();
        }
    });

    const generateInvoiceNumber = async () => {
        try {
            // Get current user's company
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: userProfile } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user.id)
                .single();

            if (!userProfile?.company_id) return;

            // Get count of billed bookings for this company
            const { count } = await supabase
                .from('bookings')
                .select('*', { count: 'exact', head: true })
                .eq('company_id', userProfile.company_id)
                .not('billed_at', 'is', null);

            // Generate invoice number: INV-YYMMDD-XXXX
            const date = new Date();
            const year = date.getFullYear().toString().slice(-2);
            const month = (date.getMonth() + 1).toString().padStart(2, '0');
            const day = date.getDate().toString().padStart(2, '0');
            const sequence = ((count || 0) + 1).toString().padStart(4, '0');

            const generatedNumber = `INV-${year}${month}${day}-${sequence}`;
            setInvoiceNumber(generatedNumber);
        } catch (error) {
            console.error('Error generating invoice number:', error);
            // Fallback to simple number
            setInvoiceNumber(`INV-${Date.now().toString().slice(-8)}`);
        }
    };

    const handleGenerate = async () => {
        if (!booking || !invoiceNumber.trim()) {
            toast({
                title: "❌ Error",
                description: "Invoice number is required",
                variant: "destructive"
            });
            return;
        }

        setLoading(true);

        try {
            // Update booking with invoice details
            const { error: updateError } = await supabase
                .from('bookings')
                .update({
                    invoice_number: invoiceNumber.trim(),
                    billed_at: new Date().toISOString(),
                    billing_status: 'BILLED'
                })
                .eq('id', booking.id);

            if (updateError) throw updateError;

            // Add timeline entry
            await supabase
                .from('booking_timeline')
                .insert({
                    booking_id: booking.id,
                    action: 'INVOICE_GENERATED',
                    description: `Invoice ${invoiceNumber} generated`
                });

            toast({
                title: "✅ Invoice Generated",
                description: `Invoice ${invoiceNumber} has been created successfully`,
            });

            onSuccess();
            onClose();

            // Reset for next use
            setInvoiceNumber("");
        } catch (error: any) {
            console.error('Error generating invoice:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to generate invoice",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setInvoiceNumber("");
            onClose();
        }
    };

    if (!booking) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="w-5 h-5 text-primary" />
                        Generate Invoice
                    </DialogTitle>
                    <DialogDescription>
                        Create invoice for booking {booking.bookingId}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Booking Summary */}
                    <div className="p-3 bg-muted/50 rounded-lg space-y-2 text-sm">
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Booking:</span>
                            <span className="font-semibold">{booking.bookingId}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Route:</span>
                            <span className="font-medium">
                                {booking.fromLocation} → {booking.toLocation}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-muted-foreground">Consignor:</span>
                            <span className="font-medium">{booking.consignorName}</span>
                        </div>
                    </div>

                    {/* Invoice Number Input */}
                    <div className="space-y-2">
                        <Label htmlFor="invoice-number">Invoice Number</Label>
                        <div className="flex gap-2">
                            <Input
                                id="invoice-number"
                                value={invoiceNumber}
                                onChange={(e) => setInvoiceNumber(e.target.value)}
                                placeholder="INV-240115-0001"
                                className="font-mono"
                            />
                            <Button
                                variant="outline"
                                size="icon"
                                onClick={generateInvoiceNumber}
                                title="Generate new number"
                            >
                                <Calendar className="w-4 h-4" />
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Auto-generated. You can edit if needed.
                        </p>
                    </div>

                    {/* Invoice Date */}
                    <div className="space-y-2">
                        <Label>Invoice Date</Label>
                        <div className="p-2 bg-muted/50 rounded text-sm font-medium">
                            {new Date().toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                            })}
                        </div>
                    </div>

                    {/* Info Note */}
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <p className="text-xs text-blue-700 dark:text-blue-300">
                            <strong>Note:</strong> This will mark the booking as billed and update the billing status.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={handleClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleGenerate}
                        disabled={loading || !invoiceNumber.trim()}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating...
                            </>
                        ) : (
                            <>
                                <Receipt className="w-4 h-4 mr-2" />
                                Generate Invoice
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};