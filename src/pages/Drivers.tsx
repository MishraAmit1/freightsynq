import { useState, useEffect, useCallback } from "react";
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
    DropdownMenuSeparator,
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
    UserCog,
    Plus,
    Search,
    MoreVertical,
    Edit,
    Trash2,
    Phone,
    User,
    Loader2,
    UserCheck,
    Shield,
    FileLock,
    Star,
    AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";

// Types
interface Driver {
    id: string;
    name: string;
    phone: string;
    license_number: string;
    experience?: string;
    status?: string;
    created_at?: string;
}

interface DriverFormData {
    name: string;
    phone: string;
    licenseNumber: string;
    experience: string;
}

// Edit/Add Driver Modal Component
const DriverModal = ({
    isOpen,
    onClose,
    onSave,
    driver = null,
    title = "Add New Driver",
}: {
    isOpen: boolean;
    onClose: () => void;
    onSave: (driverData: DriverFormData) => Promise<void>;
    driver?: Driver | null;
    title?: string;
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [driverData, setDriverData] = useState<DriverFormData>({
        name: "",
        phone: "",
        licenseNumber: "",
        experience: "",
    });

    useEffect(() => {
        if (driver) {
            setDriverData({
                name: driver.name || "",
                phone: driver.phone || "",
                licenseNumber: driver.license_number || "",
                experience: driver.experience || "",
            });
        } else {
            setDriverData({
                name: "",
                phone: "",
                licenseNumber: "",
                experience: "",
            });
        }
    }, [driver, isOpen]);

    const handleSubmit = async () => {
        if (
            !driverData.name.trim() ||
            !driverData.phone.trim() ||
            !driverData.licenseNumber.trim()
        ) {
            toast({
                title: "❌ Validation Error",
                description: "Name, Phone, and License Number are required",
                variant: "destructive",
            });
            return;
        }

        if (driverData.phone.length < 10) {
            toast({
                title: "❌ Validation Error",
                description: "Please enter a valid 10-digit phone number",
                variant: "destructive",
            });
            return;
        }

        try {
            setLoading(true);
            await onSave(driverData);
            handleClose();
        } catch (error) {
            console.error("Error saving driver:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setDriverData({ name: "", phone: "", licenseNumber: "", experience: "" });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-primary" />
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div>
                        <label className="text-sm font-medium">
                            Name <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={driverData.name}
                            onChange={(e) =>
                                setDriverData({ ...driverData, name: e.target.value })
                            }
                            placeholder="Enter driver's name"
                            disabled={loading}
                            className="mt-1 h-11"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">
                            Phone <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={driverData.phone}
                            onChange={(e) =>
                                setDriverData({ ...driverData, phone: e.target.value })
                            }
                            placeholder="10-digit mobile number"
                            maxLength={10}
                            disabled={loading}
                            className="mt-1 h-11"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">
                            License Number <span className="text-red-500">*</span>
                        </label>
                        <Input
                            value={driverData.licenseNumber}
                            onChange={(e) =>
                                setDriverData({
                                    ...driverData,
                                    licenseNumber: e.target.value.toUpperCase(),
                                })
                            }
                            placeholder="e.g., MH1420110012345"
                            disabled={loading}
                            className="mt-1 h-11"
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium">Rating (Out of 5)</label>
                        <Input
                            value={driverData.experience}
                            onChange={(e) =>
                                setDriverData({ ...driverData, experience: e.target.value })
                            }
                            placeholder="e.g., 5 or 3"
                            disabled={loading}
                            className="mt-1 h-11"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={handleClose} disabled={loading}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-gradient-to-r from-primary to-primary/80"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                            </>
                        ) : driver ? (
                            "Update Driver"
                        ) : (
                            "Add Driver"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

// Main Driver Component
const Drivers = () => {
    const { toast } = useToast();
    const [drivers, setDrivers] = useState<Driver[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
    const [deletingDriverId, setDeletingDriverId] = useState<string | null>(null);

    useEffect(() => {
        const styleElement = document.createElement("style");
        styleElement.innerHTML = `
            .driver-table td { position: relative; }
            .driver-table td::before { content: ''; position: absolute; left: 0; right: 0; top: -1px; bottom: -1px; background: transparent; pointer-events: none; transition: background-color 0.2s ease; z-index: 0; }
            .driver-table tr:hover td > * { position: relative; z-index: 1; }
        `;
        document.head.appendChild(styleElement);
        return () => document.head.removeChild(styleElement);
    }, []);

    useEffect(() => {
        fetchDrivers();
    }, []);

    const fetchDrivers = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from("drivers")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            setDrivers(data || []);
        } catch (error) {
            console.error("Error fetching drivers:", error);
            toast({
                title: "❌ Error",
                description: "Failed to load drivers",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddDriver = async (driverData: DriverFormData) => {
        try {
            const { error } = await supabase
                .from("drivers")
                .insert([
                    {
                        name: driverData.name,
                        phone: driverData.phone,
                        license_number: driverData.licenseNumber,
                        experience: driverData.experience || null,
                        status: "ACTIVE",
                    },
                ])
                .select()
                .single();
            if (error) {
                if (error.code === "23505")
                    throw new Error(
                        `A driver with license number ${driverData.licenseNumber} already exists.`
                    );
                throw error;
            }
            await fetchDrivers();
            toast({ title: "✅ Success", description: "Driver added successfully" });
        } catch (error: any) {
            console.error("Error adding driver:", error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to add driver",
                variant: "destructive",
            });
            throw error;
        }
    };

    const handleUpdateDriver = async (driverData: DriverFormData) => {
        if (!editingDriver) return;
        try {
            const { error } = await supabase
                .from("drivers")
                .update({
                    name: driverData.name,
                    phone: driverData.phone,
                    license_number: driverData.licenseNumber,
                    experience: driverData.experience || null,
                })
                .eq("id", editingDriver.id);
            if (error) {
                if (error.code === "23505")
                    throw new Error(
                        `A driver with license number ${driverData.licenseNumber} already exists.`
                    );
                throw error;
            }
            await fetchDrivers();
            toast({
                title: "✅ Success",
                description: "Driver updated successfully",
            });
            setEditingDriver(null);
        } catch (error: any) {
            console.error("Error updating driver:", error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to update driver",
                variant: "destructive",
            });
            throw error;
        }
    };

    const handleDeleteDriver = async () => {
        if (!deletingDriverId) return;
        try {
            const { error } = await supabase
                .from("drivers")
                .delete()
                .eq("id", deletingDriverId);
            if (error) throw error;
            await fetchDrivers();
            toast({
                title: "✅ Success",
                description: "Driver deleted successfully",
            });
        } catch (error) {
            console.error("Error deleting driver:", error);
            toast({
                title: "❌ Error",
                description: "Failed to delete driver",
                variant: "destructive",
            });
        } finally {
            setDeletingDriverId(null);
        }
    };

    const filteredDrivers = drivers.filter(
        (driver) =>
            driver.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
            driver.license_number.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                </div>
                <p className="text-lg font-medium text-muted-foreground animate-pulse">
                    Loading drivers...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8 p-2">
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Driver Management
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Manage your vehicle drivers
                        </p>
                    </div>
                    <Button
                        onClick={() => {
                            setEditingDriver(null);
                            setIsModalOpen(true);
                        }}
                        className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Driver
                    </Button>
                </div>
            </div>

            <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/10">
                <CardContent className="pt-6">
                    <div className="relative group">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Search by name, phone, or license..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-11 h-11 border-muted-foreground/20 focus:border-primary transition-all duration-200 bg-background/50 backdrop-blur-sm"
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border shadow-xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
                    <CardTitle className="flex items-center justify-between text-xl">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <UserCog className="w-5 h-5 text-primary" />
                            </div>
                            <span>All Drivers ({filteredDrivers.length})</span>
                        </div>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table className="driver-table">
                            <TableHeader>
                                <TableRow className="border-border hover:bg-muted/30 bg-muted/10">
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-2">
                                            <User className="w-4 h-4 text-muted-foreground" />
                                            Name
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-muted-foreground" />
                                            Phone
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-2">
                                            <FileLock className="w-4 h-4 text-muted-foreground" />
                                            License No.
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">
                                        <div className="flex items-center gap-2">
                                            <Star className="w-4 h-4 text-muted-foreground" />
                                            Experience
                                        </div>
                                    </TableHead>
                                    <TableHead className="font-semibold">Status</TableHead>
                                    <TableHead className="font-semibold text-center">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredDrivers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-16">
                                            <div className="flex flex-col items-center gap-4">
                                                <div className="p-4 bg-muted/30 rounded-full">
                                                    <UserCog className="w-12 h-12 text-muted-foreground/50" />
                                                </div>
                                                <div className="text-muted-foreground">
                                                    <p className="text-lg font-medium">
                                                        No drivers found
                                                    </p>
                                                    <p className="text-sm mt-1">
                                                        {searchTerm
                                                            ? "Try adjusting your search"
                                                            : "Add your first driver to get started"}
                                                    </p>
                                                </div>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredDrivers.map((driver) => (
                                        <TableRow
                                            key={driver.id}
                                            className="border-border hover:bg-muted/20 transition-all duration-200 group"
                                        >
                                            <TableCell>
                                                <div className="font-medium">{driver.name}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-mono text-sm">{driver.phone}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary">
                                                    {driver.license_number}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {driver.experience || (
                                                    <span className="text-muted-foreground">
                                                        Not provided
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={
                                                        driver.status === "ACTIVE" ? "default" : "secondary"
                                                    }
                                                    className={cn(
                                                        "font-medium",
                                                        driver.status === "ACTIVE"
                                                            ? "bg-green-100 text-green-700 border-green-200"
                                                            : "bg-gray-100 text-gray-700 border-gray-200"
                                                    )}
                                                >
                                                    {driver.status || "ACTIVE"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center justify-center">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 hover:bg-primary/10"
                                                            >
                                                                <MoreVertical className="w-4 h-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    setEditingDriver(driver);
                                                                    setIsModalOpen(true);
                                                                }}
                                                                className="hover:bg-primary/10"
                                                            >
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Edit Details
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                className="text-destructive hover:bg-destructive/10"
                                                                onClick={() => setDeletingDriverId(driver.id)}
                                                            >
                                                                <Trash2 className="w-4 h-4 mr-2" />
                                                                Delete Driver
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <DriverModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setEditingDriver(null);
                }}
                onSave={editingDriver ? handleUpdateDriver : handleAddDriver}
                driver={editingDriver}
                title={editingDriver ? "Edit Driver" : "Add New Driver"}
            />
            <AlertDialog
                open={!!deletingDriverId}
                onOpenChange={() => setDeletingDriverId(null)}
            >
                <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-destructive" />
                            Are you absolutely sure?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-left">
                            This action will permanently delete the driver. This cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteDriver}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Driver
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default Drivers;
