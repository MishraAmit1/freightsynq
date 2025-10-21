import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Building2, Loader2, MapPin } from "lucide-react"; // ✅ Add MapPin
import { useToast } from "@/hooks/use-toast";

interface AddBrokerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (brokerData: {
        name: string;
        contactPerson: string;
        phone: string;
        email: string;
        city: string; // ✅ NEW
    }) => void;
}

export const AddBrokerModal = ({ isOpen, onClose, onSave }: AddBrokerModalProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        city: "" // ✅ NEW
    });

    useEffect(() => {
        if (!isOpen) {
            setFormData({
                name: "",
                contactPerson: "",
                phone: "",
                email: "",
                city: "" // ✅ NEW
            });
        }
    }, [isOpen]);

    const handleSubmit = async () => {
        // ✅ UPDATED VALIDATION
        if (!formData.name.trim() || !formData.contactPerson.trim() ||
            !formData.phone.trim() || !formData.city.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        if (formData.phone.length < 10) {
            toast({
                title: "❌ Invalid Phone",
                description: "Phone number must be at least 10 digits",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving broker:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5" />
                        Add New Broker
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div>
                        <Label>
                            Company Name
                            <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Enter company name"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label>
                            Contact Person
                            <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                            value={formData.contactPerson}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            placeholder="Enter contact person name"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label>
                            Phone Number
                            <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <Input
                            value={formData.phone}
                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            placeholder="Enter phone number"
                            maxLength={15}
                            disabled={loading}
                        />
                    </div>

                    {/* ✅ NEW CITY FIELD */}
                    <div>
                        <Label>
                            City
                            <span className="text-red-500 ml-1">*</span>
                        </Label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="Enter city"
                                className="pl-10"
                                disabled={loading}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Email (Optional)</Label>
                        <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            placeholder="Enter email address"
                            disabled={loading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Add Broker
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};