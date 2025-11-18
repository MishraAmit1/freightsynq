import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
    Building2,
    Plus,
    MapPin,
    Edit,
    Trash2,
    Loader2,
    Star,
    Package,
    TrendingUp,
    Users,
    Calendar
} from "lucide-react";
import {
    CompanyBranch,
    fetchCompanyBranches,
    createBranch
} from "@/api/bookings";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface BranchStats {
    totalBookings: number;
    activeBookings: number;
    lastBookingDate?: string;
    currentCounter: number;
}

export const BranchManagement = () => {
    const { toast } = useToast();
    const [branches, setBranches] = useState<CompanyBranch[]>([]);
    const [branchStats, setBranchStats] = useState<Record<string, BranchStats>>({});
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
    const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);

    // Form data
    const [formData, setFormData] = useState({
        branch_name: "",
        city: "",
        address: ""
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadBranches();
    }, []);

    const loadBranches = async () => {
        try {
            setLoading(true);

            // Fetch branches
            const branchData = await fetchCompanyBranches();
            setBranches(branchData);

            // Fetch stats for each branch
            const stats: Record<string, BranchStats> = {};

            for (const branch of branchData) {
                // Get booking count and stats
                const { data: bookingData, error: bookingError } = await supabase
                    .from('bookings')
                    .select('id, created_at, status')
                    .eq('branch_id', branch.id);

                if (!bookingError && bookingData) {
                    stats[branch.id] = {
                        totalBookings: bookingData.length,
                        activeBookings: bookingData.filter(b =>
                            !['DELIVERED', 'CANCELLED'].includes(b.status)
                        ).length,
                        lastBookingDate: bookingData[0]?.created_at,
                        currentCounter: 0
                    };
                }

                // Get current counter value
                const { data: counterData } = await supabase
                    .from('booking_counters')
                    .select('current_number')
                    .eq('branch_id', branch.id)
                    .single();

                if (counterData) {
                    stats[branch.id] = {
                        ...stats[branch.id],
                        currentCounter: counterData.current_number
                    };
                }
            }

            setBranchStats(stats);
        } catch (error) {
            console.error('Error loading branches:', error);
            toast({
                title: "❌ Error",
                description: "Failed to load branches",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleAddBranch = async () => {
        if (!formData.branch_name || !formData.city) {
            toast({
                title: "❌ Validation Error",
                description: "Branch name and city are required",
                variant: "destructive",
            });
            return;
        }

        try {
            setSaving(true);

            const newBranch = await createBranch({
                branch_name: formData.branch_name,
                city: formData.city,
                address: formData.address
            });

            toast({
                title: "✅ Branch Created",
                description: `${newBranch.branch_name} (${newBranch.branch_code}) has been created`,
            });

            setIsAddModalOpen(false);
            setFormData({ branch_name: "", city: "", address: "" });
            loadBranches();
        } catch (error: any) {
            console.error('Error creating branch:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to create branch",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleEditBranch = async () => {
        if (!editingBranch) return;

        try {
            setSaving(true);

            const { error } = await supabase
                .from('company_branches')
                .update({
                    branch_name: formData.branch_name,
                    city: formData.city,
                    address: formData.address
                })
                .eq('id', editingBranch.id);

            if (error) throw error;

            toast({
                title: "✅ Branch Updated",
                description: `${formData.branch_name} has been updated`,
            });

            setIsEditModalOpen(false);
            setEditingBranch(null);
            setFormData({ branch_name: "", city: "", address: "" });
            loadBranches();
        } catch (error: any) {
            console.error('Error updating branch:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to update branch",
                variant: "destructive",
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteBranch = async () => {
        if (!deletingBranchId) return;

        try {
            // Check if branch has bookings
            const { data: bookings } = await supabase
                .from('bookings')
                .select('id')
                .eq('branch_id', deletingBranchId)
                .limit(1);

            if (bookings && bookings.length > 0) {
                toast({
                    title: "❌ Cannot Delete",
                    description: "This branch has existing bookings",
                    variant: "destructive",
                });
                setDeletingBranchId(null);
                return;
            }

            // Delete branch
            const { error } = await supabase
                .from('company_branches')
                .delete()
                .eq('id', deletingBranchId);

            if (error) throw error;

            toast({
                title: "✅ Branch Deleted",
                description: "Branch has been deleted successfully",
            });

            loadBranches();
        } catch (error: any) {
            console.error('Error deleting branch:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to delete branch",
                variant: "destructive",
            });
        } finally {
            setDeletingBranchId(null);
        }
    };

    const openEditModal = (branch: CompanyBranch) => {
        setEditingBranch(branch);
        setFormData({
            branch_name: branch.branch_name,
            city: branch.city || "",
            address: branch.address || ""
        });
        setIsEditModalOpen(true);
    };

    // Calculate next branch code
    const getNextBranchCode = () => {
        if (branches.length >= 26) return "AA"; // After Z, start with AA
        return String.fromCharCode(65 + branches.length);
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-lg font-medium text-muted-foreground">
                    Loading branches...
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Building2 className="w-7 h-7 text-primary" />
                        Branch Management
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your company branches and their booking sequences
                    </p>
                </div>
                <Button onClick={() => setIsAddModalOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                </Button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Branches</p>
                                <p className="text-2xl font-bold">{branches.length}</p>
                            </div>
                            <Building2 className="w-8 h-8 text-primary opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Active Branches</p>
                                <p className="text-2xl font-bold">
                                    {branches.filter(b => b.status === 'ACTIVE').length}
                                </p>
                            </div>
                            <TrendingUp className="w-8 h-8 text-green-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Next Code</p>
                                <p className="text-2xl font-bold">{getNextBranchCode()}</p>
                            </div>
                            <Badge className="text-lg px-3 py-1">{getNextBranchCode()}</Badge>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="p-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Bookings</p>
                                <p className="text-2xl font-bold">
                                    {Object.values(branchStats).reduce(
                                        (sum, stat) => sum + stat.totalBookings, 0
                                    )}
                                </p>
                            </div>
                            <Package className="w-8 h-8 text-blue-500 opacity-20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Branches Table */}
            <Card>
                <CardHeader>
                    <CardTitle>All Branches</CardTitle>
                    <CardDescription>
                        View and manage all company branches
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Branch Code</TableHead>
                                <TableHead>Branch Name</TableHead>
                                <TableHead>City</TableHead>
                                <TableHead>Current Counter</TableHead>
                                <TableHead>Total Bookings</TableHead>
                                <TableHead>Active Bookings</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {branches.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-8">
                                        <div className="flex flex-col items-center gap-2">
                                            <Building2 className="w-12 h-12 text-muted-foreground/50" />
                                            <p className="text-muted-foreground">No branches found</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setIsAddModalOpen(true)}
                                            >
                                                <Plus className="w-4 h-4 mr-2" />
                                                Add First Branch
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                branches.map((branch) => {
                                    const stats = branchStats[branch.id] || {
                                        totalBookings: 0,
                                        activeBookings: 0,
                                        currentCounter: 0
                                    };

                                    return (
                                        <TableRow key={branch.id}>
                                            <TableCell>
                                                <Badge
                                                    variant="outline"
                                                    className="text-lg px-3 py-1 font-mono"
                                                >
                                                    {branch.branch_code}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">{branch.branch_name}</span>
                                                    {branch.is_default && (
                                                        <Badge variant="secondary" className="gap-1">
                                                            <Star className="w-3 h-3" />
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                {branch.city && (
                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <MapPin className="w-3.5 h-3.5" />
                                                        {branch.city}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono">
                                                    {stats.currentCounter.toString().padStart(3, '0')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className="font-medium">{stats.totalBookings}</span>
                                            </TableCell>
                                            <TableCell>
                                                {stats.activeBookings > 0 ? (
                                                    <Badge variant="default">
                                                        {stats.activeBookings} Active
                                                    </Badge>
                                                ) : (
                                                    <span className="text-muted-foreground">-</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={branch.status === 'ACTIVE' ? 'default' : 'secondary'}
                                                    className={cn(
                                                        branch.status === 'ACTIVE'
                                                            ? 'bg-green-100 text-green-700'
                                                            : ''
                                                    )}
                                                >
                                                    {branch.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => openEditModal(branch)}
                                                        className="h-8 w-8"
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => setDeletingBranchId(branch.id)}
                                                        className="h-8 w-8 text-destructive"
                                                        disabled={branch.is_default}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Add Branch Modal */}
            <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Branch</DialogTitle>
                        <DialogDescription>
                            Create a new branch. The next available code ({getNextBranchCode()}) will be assigned automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Branch Code (Auto-assigned)</Label>
                            <Badge variant="outline" className="text-2xl px-4 py-2 font-mono">
                                {getNextBranchCode()}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <Label>Branch Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.branch_name}
                                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                placeholder="e.g., Vapi Main Office"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>City <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="e.g., Vapi"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Full address (optional)"
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsAddModalOpen(false)}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleAddBranch} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Branch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Branch Modal */}
            <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Branch</DialogTitle>
                        <DialogDescription>
                            Update branch details. Branch code cannot be changed.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Branch Code</Label>
                            <Badge variant="outline" className="text-2xl px-4 py-2 font-mono">
                                {editingBranch?.branch_code}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <Label>Branch Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.branch_name}
                                onChange={(e) => setFormData({ ...formData, branch_name: e.target.value })}
                                placeholder="e.g., Vapi Main Office"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>City <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.city}
                                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                                placeholder="e.g., Vapi"
                                disabled={saving}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Address</Label>
                            <Input
                                value={formData.address}
                                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                placeholder="Full address (optional)"
                                disabled={saving}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setIsEditModalOpen(false);
                                setEditingBranch(null);
                            }}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleEditBranch} disabled={saving}>
                            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation */}
            <AlertDialog
                open={!!deletingBranchId}
                onOpenChange={() => setDeletingBranchId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the branch.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBranch}
                            className="bg-destructive text-destructive-foreground"
                        >
                            Delete Branch
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};