import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Loader2, MessageSquare } from "lucide-react";

interface EditRemarksModalProps {
    isOpen: boolean;
    onClose: () => void;
    booking: {
        id: string;
        bookingId: string;
        remarks?: string;
    } | null;
    onSuccess: () => void;
}

export const EditRemarksModal = ({
    isOpen,
    onClose,
    booking,
    onSuccess
}: EditRemarksModalProps) => {
    const { toast } = useToast();
    const [remarks, setRemarks] = useState("");
    const [loading, setLoading] = useState(false);

    // Update remarks when booking changes
    useEffect(() => {
        if (booking) {
            setRemarks(booking.remarks || "");
        }
    }, [booking]);

    const handleSave = async () => {
        if (!booking) return;

        setLoading(true);

        try {
            const trimmedRemarks = remarks.trim();

            // Update booking
            const { error } = await supabase
                .from('bookings')
                .update({ remarks: trimmedRemarks || null })
                .eq('id', booking.id);

            if (error) throw error;

            // Add timeline entry
            await supabase
                .from('booking_timeline')
                .insert({
                    booking_id: booking.id,
                    action: 'REMARKS_UPDATED',
                    description: trimmedRemarks
                        ? 'Remarks updated'
                        : 'Remarks removed'
                });

            toast({
                title: "✅ Remarks Updated",
                description: "Booking remarks have been saved successfully",
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error updating remarks:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to update remarks",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        if (!loading) {
            setRemarks(booking?.remarks || "");
            onClose();
        }
    };

    if (!booking) return null;

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Edit Remarks
                    </DialogTitle>
                    <DialogDescription>
                        Add notes or special instructions for <strong>{booking.bookingId}</strong>
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="remarks">Remarks / Notes</Label>
                        <Textarea
                            id="remarks"
                            value={remarks}
                            onChange={(e) => setRemarks(e.target.value)}
                            placeholder="Add any special instructions, issues, or notes..."
                            rows={6}
                            className="resize-none"
                            disabled={loading}
                        />
                        <p className="text-xs text-muted-foreground">
                            {remarks.length} characters
                        </p>
                    </div>

                    {/* Examples */}
                    <div className="p-3 bg-muted/50 rounded-lg border">
                        <p className="text-xs font-semibold mb-2">💡 Examples:</p>
                        <ul className="text-xs text-muted-foreground space-y-1">
                            <li>• Customer requested priority delivery</li>
                            <li>• Fragile items - handle with care</li>
                            <li>• Vehicle delayed due to weather</li>
                            <li>• Contact consignee before delivery</li>
                        </ul>
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
                        onClick={handleSave}
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <MessageSquare className="w-4 h-4 mr-2" />
                                Save Remarks
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};