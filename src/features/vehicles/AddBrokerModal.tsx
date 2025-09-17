import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BrokerFormData {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
}

interface AddBrokerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (brokerData: BrokerFormData) => Promise<void>;
}

export const AddBrokerModal = ({ isOpen, onClose, onSave }: AddBrokerModalProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [brokerData, setBrokerData] = useState<BrokerFormData>({
        name: "",
        contactPerson: "",
        phone: "",
        email: ""
    });

    const handleSubmit = async () => {
        // Validation
        if (!brokerData.name.trim() || !brokerData.contactPerson.trim() || !brokerData.phone.trim()) {
            toast({
                title: "Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        // Phone validation
        if (brokerData.phone.length < 10) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid phone number",
                variant: "destructive"
            });
            return;
        }

        // Email validation (if provided)
        if (brokerData.email && !brokerData.email.includes('@')) {
            toast({
                title: "Validation Error",
                description: "Please enter a valid email address",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            await onSave(brokerData);

            // Reset form
            setBrokerData({
                name: "",
                contactPerson: "",
                phone: "",
                email: ""
            });

            toast({
                title: "Success",
                description: "Broker added successfully",
            });

            onClose();
        } catch (error) {
            console.error('Error saving broker:', error);
            toast({
                title: "Error",
                description: "Failed to add broker. Please try again.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setBrokerData({
            name: "",
            contactPerson: "",
            phone: "",
            email: ""
        });
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Add New Broker
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div>
                        <Label htmlFor="brokerName">Company Name *</Label>
                        <Input
                            id="brokerName"
                            value={brokerData.name}
                            onChange={(e) => setBrokerData({ ...brokerData, name: e.target.value })}
                            placeholder="ABC Transport Company"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label htmlFor="contactPerson">Contact Person *</Label>
                        <Input
                            id="contactPerson"
                            value={brokerData.contactPerson}
                            onChange={(e) => setBrokerData({ ...brokerData, contactPerson: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label htmlFor="phone">Phone Number *</Label>
                        <Input
                            id="phone"
                            value={brokerData.phone}
                            onChange={(e) => setBrokerData({ ...brokerData, phone: e.target.value })}
                            placeholder="+91-9876543210"
                            maxLength={15}
                            disabled={loading}
                        />
                    </div>

                    <div>
                        <Label htmlFor="email">Email (Optional)</Label>
                        <Input
                            id="email"
                            type="email"
                            value={brokerData.email}
                            onChange={(e) => setBrokerData({ ...brokerData, email: e.target.value })}
                            placeholder="broker@company.com"
                            disabled={loading}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        <Save className="w-4 h-4 mr-2" />
                        {loading ? "Saving..." : "Save Broker"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};