import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { User, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DriverFormData {
    name: string;
    phone: string;
    license_number: string;
    experience: string;
    // ❌ REMOVED: address field
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
        // ❌ REMOVED: address: ""
    });

    const handleSubmit = async () => {
        // Validation
        if (!driverData.name.trim() || !driverData.phone.trim() || !driverData.license_number.trim()) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        if (driverData.phone.length < 10) {
            toast({
                title: "Validation Error",
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
                // ❌ REMOVED: address: ""
            });

            onClose();
        } catch (error) {
            console.error('Error saving driver:', error);
            toast({
                title: "Error",
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
            // ❌ REMOVED: address: ""
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <User className="w-5 h-5 text-primary" />
                        Add New Driver
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="driverName">Full Name *</Label>
                        <Input
                            id="driverName"
                            value={driverData.name}
                            onChange={(e) => setDriverData({ ...driverData, name: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                            id="phone"
                            value={driverData.phone}
                            onChange={(e) => setDriverData({ ...driverData, phone: e.target.value })}
                            placeholder="+91-9876543210"
                            maxLength={15}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label htmlFor="licenseNumber">License Number *</Label>
                        <Input
                            id="licenseNumber"
                            value={driverData.license_number}
                            onChange={(e) => setDriverData({ ...driverData, license_number: e.target.value.toUpperCase() })}
                            placeholder="MH123456789"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label htmlFor="experience">Rating (Out of 5)</Label>
                        <Input
                            id="experience"
                            value={driverData.experience}
                            onChange={(e) => setDriverData({ ...driverData, experience: e.target.value })}
                            placeholder="e.g., 5 or 3"

                            disabled={loading}
                        />
                    </div>

                    {/* ❌ REMOVED: Address field completely */}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? "Saving..." : "Save Driver"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};