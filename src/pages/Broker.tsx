import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Building2,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Phone,
    Mail,
    User,
    Loader2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Broker Interface
interface Broker {
    id: string;
    name: string;
    contact_person: string;
    phone: string;
    email?: string;
    created_at?: string;
}

interface BrokerFormData {
    name: string;
    contactPerson: string;
    phone: string;
    email: string;
}

// Edit/Add Broker Modal Component
// Edit/Add Broker Modal Component
const BrokerModal = ({
    isOpen,
    onClose,
    onSave,
    broker = null,
    title = "Add New Broker"
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (brokerData: BrokerFormData) => Promise<void>;
    broker?: Broker | null;
    title?: string;
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [brokerData, setBrokerData] = useState<BrokerFormData>({
        name: "",
        contactPerson: "",
        phone: "",
        email: ""
    });

    useEffect(() => {
        if (broker) {
            setBrokerData({
                name: broker.name || "",
                contactPerson: broker.contact_person || "",
                phone: broker.phone || "",
                email: broker.email || ""
            });
        } else {
            setBrokerData({
                name: "",
                contactPerson: "",
                phone: "",
                email: ""
            });
        }
    }, [broker, isOpen]);

    // Add ESC key listener
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen) {
                handleClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [isOpen]);

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
            handleClose();
        } catch (error) {
            console.error('Error saving broker:', error);
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

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50">
            {/* Backdrop with blur effect */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}
                onClick={handleClose}
            />

            {/* Modal Content */}
            <div className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg">
                <div className="flex flex-col space-y-1.5">
                    <h3 className="text-lg font-semibold leading-none tracking-tight flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {title}
                    </h3>
                </div>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium">Company Name *</label>
                        <Input
                            value={brokerData.name}
                            onChange={(e) => setBrokerData({ ...brokerData, name: e.target.value })}
                            placeholder="ABC Transport Company"
                            disabled={loading}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Contact Person *</label>
                        <Input
                            value={brokerData.contactPerson}
                            onChange={(e) => setBrokerData({ ...brokerData, contactPerson: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Phone Number *</label>
                        <Input
                            value={brokerData.phone}
                            onChange={(e) => setBrokerData({ ...brokerData, phone: e.target.value })}
                            placeholder="+91-9876543210"
                            maxLength={15}
                            disabled={loading}
                            className="mt-1"
                        />
                    </div>

                    <div>
                        <label className="text-sm font-medium">Email (Optional)</label>
                        <Input
                            type="email"
                            value={brokerData.email}
                            onChange={(e) => setBrokerData({ ...brokerData, email: e.target.value })}
                            placeholder="broker@company.com"
                            disabled={loading}
                            className="mt-1"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            broker ? "Update Broker" : "Add Broker"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
};
// Main Broker Component
const Broker = () => {
    const { toast } = useToast();
    const [brokers, setBrokers] = useState<Broker[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBroker, setEditingBroker] = useState<Broker | null>(null);
    const [deletingBrokerId, setDeletingBrokerId] = useState<string | null>(null);

    useEffect(() => {
        fetchBrokers();
    }, []);

    const fetchBrokers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('brokers')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;

            setBrokers(data || []);
        } catch (error) {
            console.error('Error fetching brokers:', error);
            toast({
                title: "Error",
                description: "Failed to load brokers",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddBroker = async (brokerData: BrokerFormData) => {
        try {
            const { data, error } = await supabase
                .from('brokers')
                .insert([{
                    name: brokerData.name,
                    contact_person: brokerData.contactPerson,
                    phone: brokerData.phone,
                    email: brokerData.email || null
                }])
                .select()
                .single();

            if (error) throw error;

            await fetchBrokers();
            toast({
                title: "Success",
                description: "Broker added successfully",
            });
        } catch (error) {
            console.error('Error adding broker:', error);
            toast({
                title: "Error",
                description: "Failed to add broker",
                variant: "destructive"
            });
            throw error;
        }
    };

    const handleUpdateBroker = async (brokerData: BrokerFormData) => {
        if (!editingBroker) return;

        try {
            const { error } = await supabase
                .from('brokers')
                .update({
                    name: brokerData.name,
                    contact_person: brokerData.contactPerson,
                    phone: brokerData.phone,
                    email: brokerData.email || null
                })
                .eq('id', editingBroker.id);

            if (error) throw error;

            await fetchBrokers();
            toast({
                title: "Success",
                description: "Broker updated successfully",
            });
            setEditingBroker(null);
        } catch (error) {
            console.error('Error updating broker:', error);
            toast({
                title: "Error",
                description: "Failed to update broker",
                variant: "destructive"
            });
            throw error;
        }
    };

    const handleDeleteBroker = async () => {
        if (!deletingBrokerId) return;

        try {
            // Check if broker has associated vehicles
            const { data: vehicles } = await supabase
                .from('hired_vehicles')
                .select('id')
                .eq('broker_id', deletingBrokerId)
                .limit(1);

            if (vehicles && vehicles.length > 0) {
                toast({
                    title: "Cannot Delete",
                    description: "This broker has associated vehicles. Please remove them first.",
                    variant: "destructive"
                });
                setDeletingBrokerId(null);
                return;
            }

            const { error } = await supabase
                .from('brokers')
                .delete()
                .eq('id', deletingBrokerId);

            if (error) throw error;

            await fetchBrokers();
            toast({
                title: "Success",
                description: "Broker deleted successfully",
            });
        } catch (error) {
            console.error('Error deleting broker:', error);
            toast({
                title: "Error",
                description: "Failed to delete broker",
                variant: "destructive"
            });
        } finally {
            setDeletingBrokerId(null);
        }
    };

    const filteredBrokers = brokers.filter(broker =>
        broker.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        broker.contact_person.toLowerCase().includes(searchTerm.toLowerCase()) ||
        broker.phone.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="ml-2">Loading brokers...</span>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Brokers</h1>
                    <p className="text-muted-foreground">Manage your transport brokers and partners</p>
                </div>
                <Button
                    onClick={() => {
                        setEditingBroker(null);
                        setIsModalOpen(true);
                    }}
                    className="bg-gradient-to-r from-primary to-primary-hover"
                >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Broker
                </Button>
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, contact person, or phone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Brokers Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Brokers ({filteredBrokers.length})</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Company Name</TableHead>
                                <TableHead>Contact Person</TableHead>
                                <TableHead>Phone</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredBrokers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-8">
                                        <div className="text-muted-foreground">
                                            {searchTerm ? "No brokers found matching your search" : "No brokers added yet"}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredBrokers.map((broker) => (
                                    <TableRow key={broker.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                                {broker.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <User className="w-4 h-4 text-muted-foreground" />
                                                {broker.contact_person}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Phone className="w-4 h-4 text-muted-foreground" />
                                                {broker.phone}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {broker.email ? (
                                                <div className="flex items-center gap-2">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                    {broker.email}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem
                                                        onClick={() => {
                                                            setEditingBroker(broker);
                                                            setIsModalOpen(true);
                                                        }}
                                                    >
                                                        <Edit className="w-4 h-4 mr-2" />
                                                        Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => setDeletingBrokerId(broker.id)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add/Edit Modal */}
            <BrokerModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingBroker(null);
                }}
                onSave={editingBroker ? handleUpdateBroker : handleAddBroker}
                broker={editingBroker}
                title={editingBroker ? "Edit Broker" : "Add New Broker"}
            />

            {/* Delete Confirmation */}
            <AlertDialog open={!!deletingBrokerId} onOpenChange={() => setDeletingBrokerId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the broker.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBroker}
                            className="bg-destructive text-destructive-foreground"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Broker;