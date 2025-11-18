import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { User, Save, X, Loader2, Phone, CreditCard, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DriverFormData {
    name: string;
    phone: string;
    license_number: string;
    experience: string;
}

interface AddDriverModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (driverData: DriverFormData) => Promise<void>;
}

export const AddDriverModal = ({ isOpen, onClose, onSave }: AddDriverModalProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [driverData, setDriverData] = useState<DriverFormData>({
        name: "",
        phone: "",
        license_number: "",
        experience: "",
    });

    const handleSubmit = async () => {
        // Validation
        if (!driverData.name.trim() || !driverData.phone.trim() || !driverData.license_number.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        if (driverData.phone.length < 10) {
            toast({
                title: "❌ Validation Error",
                description: "Please enter a valid phone number",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            await onSave(driverData);

            // Reset form
            setDriverData({
                name: "",
                phone: "",
                license_number: "",
                experience: "",
            });

            onClose();
        } catch (error) {
            console.error('Error saving driver:', error);
            toast({
                title: "❌ Error",
                description: "Failed to add driver. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDriverData({
            name: "",
            phone: "",
            license_number: "",
            experience: "",
        });
        onClose();
    };

    return (
        <Sheet open={isOpen} onOpenChange={handleClose}>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Add New Driver
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-5 py-6">
                    {/* Driver Name */}
                    <div>
                        <Label className="text-xs">
                            Full Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={driverData.name}
                            onChange={(e) => setDriverData({ ...driverData, name: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                            className="h-9 text-sm mt-1"
                        />
                    </div>

                    <Separator className="my-4" />

                    {/* Phone & License in 2 columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">
                                Phone Number <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={driverData.phone}
                                    onChange={(e) => setDriverData({ ...driverData, phone: e.target.value })}
                                    placeholder="9876543210"
                                    maxLength={15}
                                    disabled={loading}
                                    className="pl-9 h-9 text-sm mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label className="text-xs">
                                License Number <span className="text-red-500">*</span>
                            </Label>
                            <div className="relative">
                                <CreditCard className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    value={driverData.license_number}
                                    onChange={(e) => setDriverData({ ...driverData, license_number: e.target.value.toUpperCase() })}
                                    placeholder="MH123456789"
                                    disabled={loading}
                                    className="pl-9 h-9 text-sm mt-1 uppercase"
                                />
                            </div>
                        </div>
                    </div>

                    <Separator className="my-4" />

                    {/* Rating */}
                    <div>
                        <Label className="text-xs">
                            Rating (Out of 5)
                        </Label>
                        <div className="relative">
                            <Star className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                value={driverData.experience}
                                onChange={(e) => setDriverData({ ...driverData, experience: e.target.value })}
                                placeholder="e.g., 5 or 3"
                                disabled={loading}
                                className="pl-9 h-9 text-sm mt-1"
                            />
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                            Optional - Rate driver performance (1-5)
                        </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            disabled={loading}
                            size="sm"
                        >
                            <X className="w-3.5 h-3.5 mr-2" />
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmit}
                            disabled={loading}
                            size="sm"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="w-3.5 h-3.5 mr-2" />
                                    Save Driver
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};