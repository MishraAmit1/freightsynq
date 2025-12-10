import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiUsageDashboard } from '@/components/ApiUsageDashboard';
import { Separator } from "@/components/ui/separator";
import {
    Loader2,
    Copy,
    Users,
    Building2,
    RefreshCw,
    FileText,
    Settings,
    Edit,
    Eye,
    ArrowLeft,
    CheckCircle,
    Shield,
    UserCheck,
    FileDown,
    Palette,
    Type,
    Image,
    FileSignature,
    Zap,
    XCircle,
    MapPin,
    Plus,
    Trash2,
    AlertCircle,
    Search,
    UserCog,
    User,
    CreditCard,
    Warehouse,
    Truck,
    Star,
    Package,
    TrendingUp,
    Hash,
    Calendar,
    ArrowRight,
    Download
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { checkTemplateStatus, getCurrentTemplateWithCompany, generateLRWithTemplate } from '@/api/lr-templates';
import { LRTemplateOnboarding } from '@/components/LRTemplateOnboarding';
import { cn } from '@/lib/utils';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
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
import {
    fetchLRCities,
    addLRCity,
    setActiveLRCity,
    updateLRCityNumber,
    deleteLRCity,
    LRCitySequence,
    fetchLRsByCity, // ✅ NEW IMPORT
    CityLR // ✅ NEW IMPORT
} from '@/api/lr-sequences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';
import { CompanyBranch, fetchCompanyBranches, createBranch } from "@/api/bookings";
import { format } from 'date-fns';

// ✅ Branch Stats Interface
interface BranchStats {
    totalBookings: number;
    activeBookings: number;
    currentCounter: number;
}

export const CompanySettings = () => {
    const { company, userProfile } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [companyCode, setCompanyCode] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    // LR Template states
    const [templateLoading, setTemplateLoading] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [showTemplateOnboarding, setShowTemplateOnboarding] = useState(false);

    // LR City states
    const [lrCities, setLrCities] = useState<LRCitySequence[]>([]);
    const [lrCitiesLoading, setLrCitiesLoading] = useState(false);
    const [showAddCityModal, setShowAddCityModal] = useState(false);
    const [editingCity, setEditingCity] = useState<LRCitySequence | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [newCityForm, setNewCityForm] = useState({
        city_name: '',
        prefix: 'LR',
        current_lr_number: 1001
    });
    const [employeeSearch, setEmployeeSearch] = useState('');
    const [employeeRoleFilter, setEmployeeRoleFilter] = useState<string>('all');

    // ✅ NEW: City LRs Modal States
    const [selectedCity, setSelectedCity] = useState<LRCitySequence | null>(null);
    const [cityLRs, setCityLRs] = useState<CityLR[]>([]);
    const [loadingCityLRs, setLoadingCityLRs] = useState(false);
    const [showCityLRsModal, setShowCityLRsModal] = useState(false);
    const [lrSearchTerm, setLrSearchTerm] = useState('');

    // ✅ Branch states
    const [branches, setBranches] = useState<CompanyBranch[]>([]);
    const [branchStats, setBranchStats] = useState<Record<string, BranchStats>>({});
    const [branchesLoading, setBranchesLoading] = useState(false);
    const [showAddBranchModal, setShowAddBranchModal] = useState(false);
    const [showEditBranchModal, setShowEditBranchModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState<CompanyBranch | null>(null);
    const [deletingBranchId, setDeletingBranchId] = useState<string | null>(null);
    const [branchFormData, setBranchFormData] = useState({
        branch_name: "",
        city: "",
        address: ""
    });
    const [branchSaving, setBranchSaving] = useState(false);

    useEffect(() => {
        if (company) {
            loadData();
            loadTemplateData();
            loadLRCities();
            loadBranches();
            setIsAdmin(userProfile?.role === 'admin');
        }
    }, [company, userProfile]);

    const loadData = async () => {
        setLoading(true);
        try {
            const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .select('company_code')
                .eq('id', company.id)
                .single();

            if (companyError) throw companyError;
            setCompanyCode(companyData.company_code || '');

            const { data: employeesData, error: employeesError } = await supabase
                .from('users')
                .select('id, name, email, phone, role, created_at')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });

            if (employeesError) throw employeesError;
            setEmployees(employeesData || []);
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to load data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const loadTemplateData = async () => {
        setTemplateLoading(true);
        try {
            const { hasTemplate, template } = await checkTemplateStatus();
            setCurrentTemplate(hasTemplate ? template : null);
        } catch (error) {
            console.error('Error loading template data:', error);
        } finally {
            setTemplateLoading(false);
        }
    };

    const loadLRCities = async () => {
        setLrCitiesLoading(true);
        try {
            const cities = await fetchLRCities();
            setLrCities(cities);
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to load LR cities',
                variant: 'destructive',
            });
        } finally {
            setLrCitiesLoading(false);
        }
    };

    // ✅ Load Branches Function
    const loadBranches = async () => {
        setBranchesLoading(true);
        try {
            const branchData = await fetchCompanyBranches();
            setBranches(branchData);

            // Fetch stats for each branch
            const stats: Record<string, BranchStats> = {};

            for (const branch of branchData) {
                const { data: bookingData } = await supabase
                    .from('bookings')
                    .select('id, status')
                    .eq('branch_id', branch.id);

                const { data: counterData } = await supabase
                    .from('booking_counters')
                    .select('current_number')
                    .eq('branch_id', branch.id)
                    .single();

                stats[branch.id] = {
                    totalBookings: bookingData?.length || 0,
                    activeBookings: bookingData?.filter(b => !['DELIVERED', 'CANCELLED'].includes(b.status)).length || 0,
                    currentCounter: counterData?.current_number || 0
                };
            }

            setBranchStats(stats);
        } catch (error) {
            console.error('Error loading branches:', error);
        } finally {
            setBranchesLoading(false);
        }
    };

    // ✅ Branch CRUD Functions
    const getNextBranchCode = () => {
        if (branches.length >= 26) return "AA";
        return String.fromCharCode(65 + branches.length);
    };

    const handleAddBranch = async () => {
        if (!branchFormData.branch_name || !branchFormData.city) {
            toast({
                title: "❌ Validation Error",
                description: "Branch name and city are required",
                variant: "destructive",
            });
            return;
        }

        try {
            setBranchSaving(true);

            const newBranch = await createBranch({
                branch_name: branchFormData.branch_name,
                city: branchFormData.city,
                address: branchFormData.address
            });

            toast({
                title: "✅ Branch Created",
                description: `${newBranch.branch_name} (${newBranch.branch_code}) has been created`,
            });

            setShowAddBranchModal(false);
            setBranchFormData({ branch_name: "", city: "", address: "" });
            loadBranches();
        } catch (error: any) {
            toast({
                title: "❌ Error",
                description: error.message || "Failed to create branch",
                variant: "destructive",
            });
        } finally {
            setBranchSaving(false);
        }
    };

    const handleEditBranch = async () => {
        if (!editingBranch) return;

        try {
            setBranchSaving(true);

            const { error } = await supabase
                .from('company_branches')
                .update({
                    branch_name: branchFormData.branch_name,
                    city: branchFormData.city,
                    address: branchFormData.address
                })
                .eq('id', editingBranch.id);

            if (error) throw error;

            toast({
                title: "✅ Branch Updated",
                description: `${branchFormData.branch_name} has been updated`,
            });

            setShowEditBranchModal(false);
            setEditingBranch(null);
            setBranchFormData({ branch_name: "", city: "", address: "" });
            loadBranches();
        } catch (error: any) {
            toast({
                title: "❌ Error",
                description: error.message || "Failed to update branch",
                variant: "destructive",
            });
        } finally {
            setBranchSaving(false);
        }
    };

    const handleDeleteBranch = async () => {
        if (!deletingBranchId) return;

        try {
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
            toast({
                title: "❌ Error",
                description: error.message || "Failed to delete branch",
                variant: "destructive",
            });
        } finally {
            setDeletingBranchId(null);
        }
    };

    const openEditBranchModal = (branch: CompanyBranch) => {
        setEditingBranch(branch);
        setBranchFormData({
            branch_name: branch.branch_name,
            city: branch.city || "",
            address: branch.address || ""
        });
        setShowEditBranchModal(true);
    };

    const handleAddCity = async () => {
        if (!newCityForm.city_name.trim()) {
            toast({
                title: '❌ Validation Error',
                description: 'City name is required',
                variant: 'destructive',
            });
            return;
        }

        try {
            await addLRCity(newCityForm);
            await loadLRCities();
            setShowAddCityModal(false);
            setNewCityForm({ city_name: '', prefix: 'LR', current_lr_number: 1001 });
            toast({
                title: '✅ City Added',
                description: `${newCityForm.city_name} has been added successfully`,
            });
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to add city',
                variant: 'destructive',
            });
        }
    };

    const handleSetActiveCity = async (cityId: string, cityName: string, event: React.MouseEvent) => {
        event.stopPropagation(); // ✅ Prevent card click event

        try {
            await setActiveLRCity(cityId);
            await loadLRCities();
            toast({
                title: '✅ Active City Changed',
                description: `${cityName} is now active for LR generation`,
            });
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to set active city',
                variant: 'destructive',
            });
        }
    };

    const handleDeleteCity = async (cityId: string, cityName: string, event: React.MouseEvent) => {
        event.stopPropagation(); // ✅ Prevent card click event

        if (!confirm(`Are you sure you want to delete ${cityName}?`)) return;

        try {
            await deleteLRCity(cityId);
            await loadLRCities();
            toast({
                title: '✅ City Deleted',
                description: `${cityName} has been removed`,
            });
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to delete city. Make sure it is not the active city.',
                variant: 'destructive',
            });
        }
    };

    const handleEditCity = (city: LRCitySequence, event: React.MouseEvent) => {
        event.stopPropagation(); // ✅ Prevent card click event
        setEditingCity(city);
        setShowEditModal(true);
    };

    // ✅ ENHANCED: Update city with all fields
    const handleUpdateCityNumber = async () => {
        if (!editingCity) return;

        // Validate
        if (!editingCity.city_name?.trim()) {
            toast({
                title: '❌ Validation Error',
                description: 'City name is required',
                variant: 'destructive',
            });
            return;
        }

        if (!editingCity.prefix?.trim()) {
            toast({
                title: '❌ Validation Error',
                description: 'Prefix is required',
                variant: 'destructive',
            });
            return;
        }

        // Check for duplicate prefix
        const duplicatePrefix = lrCities.find(c =>
            c.id !== editingCity.id &&
            c.prefix === editingCity.prefix
        );

        if (duplicatePrefix) {
            toast({
                title: '❌ Duplicate Prefix',
                description: `Prefix "${editingCity.prefix}" is already used by ${duplicatePrefix.city_name}`,
                variant: 'destructive',
            });
            return;
        }

        try {
            // ✅ Update all fields
            const { error } = await supabase
                .from('lr_city_sequences')
                .update({
                    city_name: editingCity.city_name,
                    prefix: editingCity.prefix,
                    current_lr_number: editingCity.current_lr_number,
                    updated_at: new Date().toISOString()
                })
                .eq('id', editingCity.id);

            if (error) throw error;

            await loadLRCities();
            setShowEditModal(false);
            setEditingCity(null);

            toast({
                title: '✅ City Updated',
                description: `${editingCity.city_name} configuration has been updated`,
            });
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to update city configuration',
                variant: 'destructive',
            });
        }
    };
    // ✅ NEW: Handle View City LRs
    // ✅ SMART VERSION - Works with both old and new data
    const handleViewCityLRs = async (city: LRCitySequence) => {
        setSelectedCity(city);
        setShowCityLRsModal(true);
        setLoadingCityLRs(true);
        setLrSearchTerm('');

        try {
            // ✅ Pass both prefix and ID - function will use best method
            const lrs = await fetchLRsByCity(city.prefix, city.id);
            setCityLRs(lrs);

            // ✅ Show info if using old method
            if (lrs.length > 0 && !lrs[0].lr_city_id) {
                console.log('ℹ️ Using prefix-based filtering (legacy mode)');
            }
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to fetch LRs',
                variant: 'destructive',
            });
            setCityLRs([]);
        } finally {
            setLoadingCityLRs(false);
        }
    };

    // ✅ NEW: Filter City LRs
    const filteredCityLRs = cityLRs.filter(lr => {
        if (!lrSearchTerm) return true;

        const searchLower = lrSearchTerm.toLowerCase();
        return (
            lr.lr_number?.toLowerCase().includes(searchLower) ||
            lr.booking_id?.toLowerCase().includes(searchLower) ||
            lr.consignor?.name?.toLowerCase().includes(searchLower) ||
            lr.consignee?.name?.toLowerCase().includes(searchLower) ||
            lr.from_location?.toLowerCase().includes(searchLower) ||
            lr.to_location?.toLowerCase().includes(searchLower)
        );
    });

    // ✅ NEW: Export City LRs to CSV
    const handleExportCityLRs = () => {
        if (filteredCityLRs.length === 0) {
            toast({
                title: 'No Data',
                description: 'No LRs to export',
                variant: 'destructive',
            });
            return;
        }

        const csvContent = [
            ['LR Number', 'Booking Number', 'LR Date', 'From', 'To', 'Consignor', 'Consignee', 'Status'],
            ...filteredCityLRs.map(lr => [
                lr.lr_number,
                lr.booking_id,
                lr.lr_date ? format(new Date(lr.lr_date), 'dd/MM/yyyy') : '',
                lr.from_location,
                lr.to_location,
                lr.consignor?.name || '',
                lr.consignee?.name || '',
                lr.status
            ])
        ].map(row => row.join(',')).join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${selectedCity?.city_name}_LRs_${format(new Date(), 'dd-MM-yyyy')}.csv`;
        a.click();
        window.URL.revokeObjectURL(url);

        toast({
            title: '✅ Exported',
            description: 'LRs exported successfully',
        });
    };

    const generateNewCode = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            const newCode = `${company.name.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`;

            const { error } = await supabase
                .from('companies')
                .update({ company_code: newCode })
                .eq('id', company.id);

            if (error) throw error;

            setCompanyCode(newCode);
            toast({
                title: '✅ Success',
                description: 'Company code updated successfully',
            });
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to update company code',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleChangeRole = async (employeeId: string, newRole: string, employeeName: string) => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ role: newRole })
                .eq('id', employeeId);

            if (error) throw error;

            toast({
                title: '✅ Role Updated',
                description: `${employeeName}'s role changed to ${newRole}`,
            });

            await loadData();
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to update role',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
        if (!confirm(`Are you sure you want to remove ${employeeName} from your company?\n\nThis will revoke their access immediately.`)) {
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', employeeId);

            if (error) throw error;

            toast({
                title: '✅ Employee Removed',
                description: `${employeeName} has been removed from your company`,
            });

            await loadData();
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to remove employee',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const copyCodeToClipboard = () => {
        navigator.clipboard.writeText(companyCode);
        toast({
            title: '✅ Copied!',
            description: 'Company code copied to clipboard',
        });
    };

    const handleTemplateChange = () => {
        setShowTemplateOnboarding(true);
    };

    const handleTemplatePreview = async () => {
        try {
            await generateLRWithTemplate('preview-mode');
            toast({
                title: "✅ Preview Generated",
                description: "Template preview has been downloaded as PDF",
            });
        } catch (error) {
            console.error('Error generating preview:', error);
            toast({
                title: "ℹ️ Preview",
                description: "Create a test booking and generate LR to see your template design",
            });
        }
    };

    const handleTemplateUpdated = () => {
        setShowTemplateOnboarding(false);
        loadTemplateData();
        toast({
            title: '✅ Template Updated',
            description: 'Your LR template has been updated successfully',
        });
    };

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = emp.name.toLowerCase().includes(employeeSearch.toLowerCase()) ||
            emp.email.toLowerCase().includes(employeeSearch.toLowerCase());
        const matchesRole = employeeRoleFilter === 'all' || emp.role === employeeRoleFilter;
        return matchesSearch && matchesRole;
    });

    if (showTemplateOnboarding) {
        return (
            <div className="min-h-screen">
                <div className="mb-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowTemplateOnboarding(false)}
                        className="flex items-center gap-2 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary transition-all"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Settings
                    </Button>
                </div>
                <LRTemplateOnboarding
                    onComplete={handleTemplateUpdated}
                    changeMode={true}
                />
            </div>
        );
    }

    return (
        <div className="space-y-8 -mt-1">
            {/* Header Section */}
            <div className="space-y-6">
                {/* ✅ BRANCHES CARD */}
                <Card className="bg-card border border-border dark:border-border shadow-sm">
                    <CardHeader className="border-b border-border dark:border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
                                    <div className="p-1.5 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                                        <Building2 className="w-5 h-5 text-purple-600" />
                                    </div>
                                    Company Branches
                                </CardTitle>
                                <CardDescription className="mt-1 text-muted-foreground dark:text-muted-foreground">
                                    Manage branches and their booking sequences
                                </CardDescription>
                            </div>
                            <div className="flex items-center gap-2">
                                <Badge variant="outline" className="border-border dark:border-border">
                                    {branches.length} Branch{branches.length !== 1 ? 'es' : ''}
                                </Badge>
                                {isAdmin && (
                                    <Button
                                        onClick={() => setShowAddBranchModal(true)}
                                        size="sm"
                                        className="bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add Branch
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {branchesLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                                </div>
                            </div>
                        ) : branches.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <Building2 className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium mb-2 text-foreground dark:text-white">No Branches</h3>
                                <p className="text-sm text-muted-foreground dark:text-muted-foreground mb-4">
                                    Create your first branch to start managing locations
                                </p>
                                {isAdmin && (
                                    <Button
                                        onClick={() => setShowAddBranchModal(true)}
                                        className="bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add First Branch
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Quick Stats */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                                    <div className="bg-muted rounded-lg p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Total</p>
                                        <p className="text-xl font-bold text-foreground dark:text-white">{branches.length}</p>
                                    </div>
                                    <div className="bg-muted rounded-lg p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Active</p>
                                        <p className="text-xl font-bold text-green-600">{branches.filter(b => b.status === 'ACTIVE').length}</p>
                                    </div>
                                    <div className="bg-muted rounded-lg p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Next Code</p>
                                        <Badge className="text-lg px-2 py-0.5">{getNextBranchCode()}</Badge>
                                    </div>
                                    <div className="bg-muted rounded-lg p-3 text-center">
                                        <p className="text-xs text-muted-foreground">Total Bookings</p>
                                        <p className="text-xl font-bold text-foreground dark:text-white">
                                            {Object.values(branchStats).reduce((sum, stat) => sum + stat.totalBookings, 0)}
                                        </p>
                                    </div>
                                </div>

                                <Separator className="bg-border dark:bg-border" />

                                {/* Branch List */}
                                <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                                    {branches.map((branch) => {
                                        const stats = branchStats[branch.id] || {
                                            totalBookings: 0,
                                            activeBookings: 0,
                                            currentCounter: 0
                                        };

                                        return (
                                            <div
                                                key={branch.id}
                                                className={cn(
                                                    "p-4 rounded-lg border transition-all",
                                                    branch.is_default
                                                        ? "bg-accent dark:bg-primary/10 border-primary"
                                                        : "bg-muted border-border dark:border-border"
                                                )}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                                    <div className="flex items-center gap-3">
                                                        <Badge
                                                            variant="outline"
                                                            className="text-lg px-3 py-1 font-mono border-border dark:border-border"
                                                        >
                                                            {branch.branch_code}
                                                        </Badge>
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-semibold text-foreground dark:text-white truncate">
                                                                    {branch.branch_name}
                                                                </span>
                                                                {branch.is_default && (
                                                                    <Badge className="text-xs bg-primary text-primary-foreground border-0">
                                                                        <Star className="w-3 h-3 mr-1" />
                                                                        Default
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            {branch.city && (
                                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground dark:text-muted-foreground mt-0.5">
                                                                    <MapPin className="w-3 h-3" />
                                                                    {branch.city}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-2">
                                                        {/* Stats Badges */}
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge variant="secondary" className="font-mono text-xs">
                                                                        <Hash className="w-3 h-3 mr-1" />
                                                                        {stats.currentCounter.toString().padStart(3, '0')}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Current Counter</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Badge variant="outline" className="text-xs border-border">
                                                                        <Package className="w-3 h-3 mr-1" />
                                                                        {stats.totalBookings}
                                                                    </Badge>
                                                                </TooltipTrigger>
                                                                <TooltipContent>Total Bookings</TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        {stats.activeBookings > 0 && (
                                                            <Badge className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-0">
                                                                {stats.activeBookings} Active
                                                            </Badge>
                                                        )}

                                                        {/* Status Badge */}
                                                        <Badge
                                                            className={cn(
                                                                "text-xs",
                                                                branch.status === 'ACTIVE'
                                                                    ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50"
                                                                    : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 border-gray-200 dark:border-gray-700"
                                                            )}
                                                        >
                                                            {branch.status}
                                                        </Badge>

                                                        {/* Actions */}
                                                        {isAdmin && (
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    onClick={() => openEditBranchModal(branch)}
                                                                    className="h-7 w-7 p-0 hover:bg-accent dark:hover:bg-secondary"
                                                                >
                                                                    <Edit className="w-3.5 h-3.5" />
                                                                </Button>

                                                                {!branch.is_default && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => setDeletingBranchId(branch.id)}
                                                                        className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                                                                    >
                                                                        <Trash2 className="w-3.5 h-3.5" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Company Code & Employees Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Company Code Card */}
                    <Card className="bg-card border border-border dark:border-border shadow-sm">
                        <CardHeader className="border-b border-border dark:border-border">
                            <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
                                <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
                                    <Shield className="w-5 h-5 text-primary dark:text-primary" />
                                </div>
                                Company Code
                            </CardTitle>
                            <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                                Share this code with employees to join your company
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Input
                                        value={companyCode}
                                        readOnly
                                        className="font-mono text-base sm:text-lg h-10 sm:h-11 border-border dark:border-border bg-muted text-foreground dark:text-white"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyCodeToClipboard}
                                        className="h-10 w-10 sm:h-11 sm:w-11 shrink-0 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>

                                {isAdmin && (
                                    <Button
                                        variant="outline"
                                        onClick={generateNewCode}
                                        disabled={loading}
                                        className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Generate New Code
                                    </Button>
                                )}

                                <Alert className="border-yellow-200 dark:border-yellow-900/50 bg-yellow-50/50 dark:bg-yellow-900/10">
                                    <AlertCircle className="w-4 h-4 text-yellow-600" />
                                    <AlertDescription className="text-yellow-700 dark:text-yellow-400 text-xs sm:text-sm">
                                        Anyone with this code can join your company. Generate a new code to revoke access.
                                    </AlertDescription>
                                </Alert>

                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/company-profile')}
                                    className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                >
                                    <Building2 className="h-4 w-4 mr-2" />
                                    View Company Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Employees Card */}
                    <Card className="bg-card border border-border dark:border-border shadow-sm">
                        <CardHeader className="border-b border-border dark:border-border">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1">
                                    <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
                                        <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                                            <Users className="w-5 h-5 text-green-600" />
                                        </div>
                                        Team Members
                                    </CardTitle>
                                    <CardDescription className="mt-1 text-muted-foreground dark:text-muted-foreground">
                                        {filteredEmployees.length} of {employees.length} employees
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-sm shrink-0 border-border dark:border-border">
                                    Total: {employees.length}
                                </Badge>
                            </div>

                            {/* Search & Filter */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                                <div className="relative">
                                    <Input
                                        placeholder="Search..."
                                        value={employeeSearch}
                                        onChange={(e) => setEmployeeSearch(e.target.value)}
                                        className="h-9 pl-9 text-sm border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                                    />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                    {employeeSearch && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEmployeeSearch('')}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0 hover:bg-accent dark:hover:bg-secondary"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>

                                <Select value={employeeRoleFilter} onValueChange={setEmployeeRoleFilter}>
                                    <SelectTrigger className="h-9 border-border dark:border-border bg-card">
                                        <SelectValue placeholder="Filter by role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border dark:border-border">
                                        <SelectItem value="all">All Roles</SelectItem>
                                        <SelectItem value="admin">👑 Admin</SelectItem>
                                        <SelectItem value="dispatcher">🚚 Dispatcher</SelectItem>
                                        <SelectItem value="warehouse">📦 Warehouse</SelectItem>
                                        <SelectItem value="accounts">💰 Accounts</SelectItem>
                                        <SelectItem value="viewer">👁️ Viewer</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-6">
                            {loading ? (
                                <div className="flex justify-center py-8">
                                    <div className="relative">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                                        <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                                    </div>
                                </div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                        <Users className="w-6 h-6 text-muted-foreground dark:text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                                        {employeeSearch || employeeRoleFilter !== 'all'
                                            ? 'No employees found matching your filters'
                                            : 'No employees found'}
                                    </p>
                                    {(employeeSearch || employeeRoleFilter !== 'all') && (
                                        <Button
                                            variant="link"
                                            size="sm"
                                            onClick={() => {
                                                setEmployeeSearch('');
                                                setEmployeeRoleFilter('all');
                                            }}
                                            className="mt-2 text-primary dark:text-primary hover:text-primary dark:text-primary"
                                        >
                                            Clear filters
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                                        {filteredEmployees.map((employee) => (
                                            <div
                                                key={employee.id}
                                                className="flex items-center justify-between p-3 bg-muted rounded-lg border border-border dark:border-border"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium text-sm truncate text-foreground dark:text-white">
                                                            {employee.name}
                                                        </div>
                                                        {employee.id === userProfile?.id && (
                                                            <Badge variant="outline" className="text-xs shrink-0 bg-accent dark:bg-primary/10 text-primary dark:text-primary border-primary/30">
                                                                You
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground dark:text-muted-foreground truncate mt-0.5">
                                                        {employee.email}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    {isAdmin && employee.id !== userProfile?.id ? (
                                                        <Select
                                                            value={employee.role}
                                                            onValueChange={(newRole) => handleChangeRole(employee.id, newRole, employee.name)}
                                                        >
                                                            <SelectTrigger className="w-28 h-7 text-xs border-border dark:border-border bg-card">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent className="bg-card border-border dark:border-border">
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                                <SelectItem value="dispatcher">Dispatcher</SelectItem>
                                                                <SelectItem value="warehouse">Warehouse</SelectItem>
                                                                <SelectItem value="accounts">Accounts</SelectItem>
                                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Badge
                                                            variant={employee.role === 'admin' ? 'default' : 'secondary'}
                                                            className={cn(
                                                                "text-xs",
                                                                employee.role === 'admin'
                                                                    ? "bg-primary text-primary-foreground border-0"
                                                                    : "bg-muted text-muted-foreground dark:text-muted-foreground"
                                                            )}
                                                        >
                                                            {employee.role}
                                                        </Badge>
                                                    )}

                                                    {isAdmin && employee.id !== userProfile?.id && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                                            className="h-7 w-7 p-0 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                        onClick={() => {
                                            const signupUrl = `${window.location.origin}/employee-signup`;
                                            navigator.clipboard.writeText(signupUrl);
                                            toast({
                                                title: '✅ Link Copied!',
                                                description: 'Share this link with employees to join',
                                            });
                                        }}
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Signup Link
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* LR Template Card */}
                <Card className="bg-card border border-border dark:border-border shadow-sm">
                    <CardHeader className="border-b border-border dark:border-border">
                        <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
                            <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
                                <FileText className="w-5 h-5 text-primary dark:text-primary" />
                            </div>
                            LR Template Configuration
                        </CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                            Configure how your Lorry Receipts will look when generated
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {templateLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                                </div>
                                <p className="text-muted-foreground dark:text-muted-foreground mt-4">Loading template...</p>
                            </div>
                        ) : currentTemplate ? (
                            <div className="space-y-6">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted rounded-lg border border-border dark:border-border">
                                    <div className="space-y-2">
                                        <Label className="text-sm flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
                                            <FileSignature className="w-4 h-4 text-primary dark:text-primary" />
                                            Current Template
                                        </Label>
                                        <Badge className="bg-primary text-primary-foreground border-0">{currentTemplate.template_name}</Badge>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm flex items-center gap-2 text-muted-foreground dark:text-muted-foreground">
                                            <Palette className="w-4 h-4 text-primary dark:text-primary" />
                                            Primary Color
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-full border border-border dark:border-border"
                                                style={{ backgroundColor: currentTemplate.style_config?.primary_color }}
                                            />
                                            <span className="text-sm font-mono text-foreground dark:text-white">{currentTemplate.style_config?.primary_color}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-wrap gap-2">
                                    <Button
                                        onClick={handleTemplateChange}
                                        className="flex-1 sm:flex-none bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Change Template
                                    </Button>
                                    <Button
                                        variant="outline"
                                        onClick={handleTemplatePreview}
                                        className="flex-1 sm:flex-none bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <FileText className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium mb-2 text-foreground dark:text-white">No Template Configured</h3>
                                <Button
                                    onClick={handleTemplateChange}
                                    className="mt-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configure Template
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ✅ UPDATED: LR City Card - Clickable Cards */}
                <Card className="bg-card border border-border dark:border-border shadow-sm">
                    <CardHeader className="border-b border-border dark:border-border">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
                                    <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                                        <MapPin className="w-5 h-5 text-blue-600" />
                                    </div>
                                    LR City Numbering
                                </CardTitle>
                                <CardDescription className="mt-1 text-muted-foreground dark:text-muted-foreground">
                                    Manage city-wise LR number sequences
                                </CardDescription>
                            </div>
                            {isAdmin && (
                                <Button
                                    onClick={() => setShowAddCityModal(true)}
                                    size="sm"
                                    className="w-full sm:w-auto bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add City
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {lrCitiesLoading ? (
                            <div className="flex justify-center py-12">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                                </div>
                            </div>
                        ) : lrCities.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <MapPin className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium mb-2 text-foreground dark:text-white">No Cities Configured</h3>
                                {isAdmin && (
                                    <Button
                                        onClick={() => setShowAddCityModal(true)}
                                        className="mt-4 bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                                    >
                                        <Plus className="w-4 h-4 mr-2" />
                                        Add First City
                                    </Button>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {lrCities.map((city) => (
                                    <div
                                        key={city.id}
                                        onClick={() => handleViewCityLRs(city)} // ✅ NEW: Click to view LRs
                                        className={cn(
                                            "p-4 rounded-lg border transition-all cursor-pointer", // ✅ NEW: cursor-pointer
                                            "hover:shadow-md hover:border-primary", // ✅ NEW: hover effect
                                            city.is_active
                                                ? "bg-accent dark:bg-primary/10 border-primary"
                                                : "bg-muted border-border dark:border-border"
                                        )}
                                    >
                                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "w-3 h-3 rounded-full shrink-0",
                                                        city.is_active ? "bg-green-500 animate-pulse" : "bg-gray-300"
                                                    )}
                                                />
                                                <div className="min-w-0">
                                                    <div className="font-semibold text-base sm:text-lg truncate text-foreground dark:text-white">{city.city_name}</div>
                                                    <div className="text-sm text-muted-foreground dark:text-muted-foreground">
                                                        Current: <span className="font-mono font-medium text-foreground dark:text-white">
                                                            {city.prefix}{city.current_lr_number}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                {city.is_active ? (
                                                    <Badge className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    isAdmin && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={(e) => handleSetActiveCity(city.id, city.city_name, e)} // ✅ NEW: stopPropagation
                                                            className="bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                                        >
                                                            Set Active
                                                        </Button>
                                                    )
                                                )}

                                                {isAdmin && (
                                                    <>
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={(e) => handleEditCity(city, e)} // ✅ NEW: stopPropagation
                                                            className="hover:bg-accent dark:hover:bg-secondary"
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>

                                                        {!city.is_active && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={(e) => handleDeleteCity(city.id, city.city_name, e)} // ✅ NEW: stopPropagation
                                                                className="hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}

                                                {/* ✅ NEW: View LRs Hint */}
                                                <TooltipProvider>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild>
                                                            <Eye className="w-4 h-4 text-muted-foreground" />
                                                        </TooltipTrigger>
                                                        <TooltipContent>Click to view all LRs</TooltipContent>
                                                    </Tooltip>
                                                </TooltipProvider>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <ApiUsageDashboard />
            </div>

            {/* ✅ EXISTING MODALS - Branch Add/Edit/Delete */}
            <Dialog open={showAddBranchModal} onOpenChange={setShowAddBranchModal}>
                <DialogContent className="sm:max-w-md bg-card border-border dark:border-border">
                    <DialogHeader className="border-b border-border dark:border-border pb-4">
                        <DialogTitle className="text-foreground dark:text-white">Add New Branch</DialogTitle>
                        <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
                            Create a new branch. The next available code ({getNextBranchCode()}) will be assigned automatically.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">Branch Code (Auto-assigned)</Label>
                            <Badge variant="outline" className="text-2xl px-4 py-2 font-mono border-border">
                                {getNextBranchCode()}
                            </Badge>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">Branch Name <span className="text-red-500">*</span></Label>
                            <Input
                                value={branchFormData.branch_name}
                                onChange={(e) => setBranchFormData({ ...branchFormData, branch_name: e.target.value })}
                                placeholder="e.g., Vapi Main Office"
                                disabled={branchSaving}
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">City <span className="text-red-500">*</span></Label>
                            <Input
                                value={branchFormData.city}
                                onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                                placeholder="e.g., Vapi"
                                disabled={branchSaving}
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">Address (Optional)</Label>
                            <Input
                                value={branchFormData.address}
                                onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                                placeholder="Full address"
                                disabled={branchSaving}
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>
                    </div>
                    <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border dark:border-border pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowAddBranchModal(false)}
                            disabled={branchSaving}
                            className="w-full sm:w-auto bg-card border-border dark:border-border hover:bg-muted dark:hover:bg-secondary"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddBranch}
                            disabled={branchSaving || !branchFormData.branch_name || !branchFormData.city}
                            className="w-full sm:w-auto bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                        >
                            {branchSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Create Branch
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={showEditBranchModal} onOpenChange={setShowEditBranchModal}>
                <DialogContent className="sm:max-w-md bg-card border-border dark:border-border">
                    <DialogHeader className="border-b border-border dark:border-border pb-4">
                        <DialogTitle className="text-foreground dark:text-white">Edit Branch</DialogTitle>
                        <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
                            Update branch details. Code cannot be changed.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">Branch Code</Label>
                            <Badge variant="outline" className="text-2xl px-4 py-2 font-mono border-border">
                                {editingBranch?.branch_code}
                            </Badge>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">Branch Name *</Label>
                            <Input
                                value={branchFormData.branch_name}
                                onChange={(e) => setBranchFormData({ ...branchFormData, branch_name: e.target.value })}
                                placeholder="e.g., Vapi Main Office"
                                disabled={branchSaving}
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">City *</Label>
                            <Input
                                value={branchFormData.city}
                                onChange={(e) => setBranchFormData({ ...branchFormData, city: e.target.value })}
                                placeholder="e.g., Vapi"
                                disabled={branchSaving}
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">Address (Optional)</Label>
                            <Input
                                value={branchFormData.address}
                                onChange={(e) => setBranchFormData({ ...branchFormData, address: e.target.value })}
                                placeholder="Full address"
                                disabled={branchSaving}
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border dark:border-border pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowEditBranchModal(false);
                                setEditingBranch(null);
                            }}
                            disabled={branchSaving}
                            className="w-full sm:w-auto bg-card border-border dark:border-border hover:bg-muted dark:hover:bg-secondary"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditBranch}
                            disabled={branchSaving}
                            className="w-full sm:w-auto bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                        >
                            {branchSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deletingBranchId} onOpenChange={() => setDeletingBranchId(null)}>
                <AlertDialogContent className="bg-card border-border dark:border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-foreground dark:text-white">
                            <AlertCircle className="w-5 h-5 text-red-600" />
                            Delete Branch?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground dark:text-muted-foreground">
                            This action cannot be undone. Make sure no bookings are associated with this branch.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border dark:border-border">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteBranch}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            Delete Branch
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Add City Modal */}
            <Dialog open={showAddCityModal} onOpenChange={setShowAddCityModal}>
                <DialogContent className="sm:max-w-md bg-card border-border dark:border-border">
                    <DialogHeader className="border-b border-border dark:border-border pb-4">
                        <DialogTitle className="text-foreground dark:text-white">Add New LR City</DialogTitle>
                        <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
                            Configure LR numbering for a new city
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">City Name *</Label>
                            <Input
                                value={newCityForm.city_name}
                                onChange={(e) => setNewCityForm({
                                    ...newCityForm,
                                    city_name: e.target.value
                                })}
                                placeholder="e.g., Vapi, Surat"
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-foreground dark:text-white">Prefix</Label>
                                <Input
                                    value={newCityForm.prefix}
                                    onChange={(e) => setNewCityForm({
                                        ...newCityForm,
                                        prefix: e.target.value
                                    })}
                                    placeholder="LR"
                                    className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label className="text-foreground dark:text-white">Starting Number *</Label>
                                <Input
                                    type="number"
                                    value={newCityForm.current_lr_number}
                                    onChange={(e) => setNewCityForm({
                                        ...newCityForm,
                                        current_lr_number: parseInt(e.target.value) || 1001
                                    })}
                                    className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border dark:border-border pt-4">
                        <Button
                            variant="outline"
                            onClick={() => setShowAddCityModal(false)}
                            className="w-full sm:w-auto bg-card border-border dark:border-border hover:bg-muted dark:hover:bg-secondary"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCity}
                            disabled={!newCityForm.city_name}
                            className="w-full sm:w-auto bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                        >
                            Add City
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit City Modal */}
            {/* ✅ ENHANCED Edit City Modal - Full Edit */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="sm:max-w-md bg-card border-border dark:border-border">
                    <DialogHeader className="border-b border-border dark:border-border pb-4">
                        <DialogTitle className="text-foreground dark:text-white">
                            Edit LR City Configuration
                        </DialogTitle>
                        <DialogDescription className="text-muted-foreground dark:text-muted-foreground">
                            Update city name, prefix, and current LR number
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        {/* ✅ NEW: City Name Edit */}
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">
                                City Name <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                value={editingCity?.city_name || ''}
                                onChange={(e) => setEditingCity(editingCity ? {
                                    ...editingCity,
                                    city_name: e.target.value
                                } : null)}
                                placeholder="e.g., Vapi, Ahmedabad"
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>

                        {/* ✅ NEW: Prefix Edit */}
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">
                                Prefix <span className="text-red-500">*</span>
                            </Label>
                            <div className="flex items-center gap-2">
                                <Input
                                    value={editingCity?.prefix || ''}
                                    onChange={(e) => setEditingCity(editingCity ? {
                                        ...editingCity,
                                        prefix: e.target.value.toUpperCase()
                                    } : null)}
                                    placeholder="e.g., VPI, AMD"
                                    maxLength={10}
                                    className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                                />
                                <Badge variant="outline" className="px-3 py-2 font-mono">
                                    Preview: {editingCity?.prefix || 'XX'}{(editingCity?.current_lr_number || 0).toString().padStart(6, '0')}
                                </Badge>
                            </div>

                        </div>

                        {/* ✅ EXISTING: Current LR Number */}
                        <div className="space-y-2">
                            <Label className="text-foreground dark:text-white">
                                Current LR Number <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                type="number"
                                value={editingCity?.current_lr_number || 1001}
                                onChange={(e) => setEditingCity(editingCity ? {
                                    ...editingCity,
                                    current_lr_number: parseInt(e.target.value) || 1001
                                } : null)}
                                min="0"
                                className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                            <p className="text-xs text-muted-foreground">
                                Next LR will be: {editingCity?.prefix || 'XX'}{((editingCity?.current_lr_number || 0) + 1).toString().padStart(6, '0')}
                            </p>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2 border-t border-border dark:border-border pt-4">
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowEditModal(false);
                                setEditingCity(null);
                            }}
                            className="w-full sm:w-auto bg-card border-border dark:border-border hover:bg-muted dark:hover:bg-secondary"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateCityNumber}
                            disabled={
                                !editingCity?.city_name ||
                                !editingCity?.prefix ||
                                editingCity.current_lr_number < 0 ||
                                // Check for duplicate prefix
                                lrCities.some(c => c.id !== editingCity.id && c.prefix === editingCity.prefix)
                            }
                            className="w-full sm:w-auto bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
                        >
                            Save Changes
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* ✅ UPDATED: City LRs Modal */}
            <Dialog open={showCityLRsModal} onOpenChange={setShowCityLRsModal}>
                <DialogContent className="sm:max-w-5xl max-h-[85vh] bg-card border-border dark:border-border flex flex-col overflow-hidden">
                    <DialogHeader className="border-b border-border dark:border-border pb-4 shrink-0">
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle className="flex items-center gap-2 text-foreground dark:text-white">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    {selectedCity?.city_name} - LR Records
                                </DialogTitle>
                                <DialogDescription className="mt-1 text-muted-foreground dark:text-muted-foreground">
                                    All LRs with prefix: <span className="font-mono font-medium">{selectedCity?.prefix}</span>
                                </DialogDescription>
                            </div>
                            <Badge variant="outline" className="text-sm border-border">
                                {filteredCityLRs.length} LR{filteredCityLRs.length !== 1 ? 's' : ''}
                            </Badge>
                        </div>
                    </DialogHeader>

                    {/* Search & Export Bar */}
                    <div className="flex items-center gap-2 py-4 shrink-0">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search LR number, consignor, route..."
                                value={lrSearchTerm}
                                onChange={(e) => setLrSearchTerm(e.target.value)}
                                className="pl-9 h-9 border-border dark:border-border"
                            />
                            {lrSearchTerm && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setLrSearchTerm('')}
                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                >
                                    <XCircle className="w-3.5 h-3.5" />
                                </Button>
                            )}
                        </div>
                        {filteredCityLRs.length > 0 && (
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={handleExportCityLRs}
                                className="h-9 border-border dark:border-border"
                            >
                                <Download className="w-4 h-4 mr-2" />
                                Export CSV
                            </Button>
                        )}
                    </div>

                    {/* LRs Table */}
                    <div className="flex-1 min-h-0 overflow-hidden border rounded-lg border-border dark:border-border">
                        {loadingCityLRs ? (
                            <div className="flex flex-col items-center justify-center py-16">
                                <Loader2 className="w-10 h-10 animate-spin text-primary mb-3" />
                                <p className="text-sm text-muted-foreground">Loading LRs...</p>
                            </div>
                        ) : filteredCityLRs.length === 0 ? (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <Package className="w-8 h-8 text-muted-foreground" />
                                </div>
                                <h3 className="text-lg font-medium mb-1 text-foreground dark:text-white">
                                    {lrSearchTerm ? 'No matching LRs found' : 'No LRs generated yet'}
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    {lrSearchTerm
                                        ? 'Try adjusting your search'
                                        : `No LRs have been created for ${selectedCity?.city_name} yet`}
                                </p>
                            </div>
                        ) : (
                            <div className="overflow-auto h-full">
                                <table className="w-full">
                                    {/* Table Header */}
                                    <thead className="bg-muted/50 dark:bg-secondary/50 sticky top-0 z-10">
                                        <tr className="border-b border-border dark:border-border">
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                                                LR No.
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                                                Consignor
                                            </th>
                                            <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                                                Route
                                            </th>
                                            <th className="text-center px-4 py-3 text-xs font-semibold text-muted-foreground dark:text-muted-foreground uppercase tracking-wider">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>

                                    {/* Table Body */}
                                    <tbody className="divide-y divide-border dark:divide-border">
                                        {filteredCityLRs.map((lr) => (
                                            <tr
                                                key={lr.id}
                                                className="hover:bg-accent/50 dark:hover:bg-secondary/30 transition-colors"
                                            >
                                                {/* LR Number */}
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="font-mono text-xs">
                                                        {lr.lr_number}
                                                    </Badge>
                                                </td>

                                                {/* Date */}
                                                <td className="px-4 py-3">
                                                    <span className="text-sm text-foreground dark:text-white whitespace-nowrap">
                                                        {lr.lr_date
                                                            ? format(new Date(lr.lr_date), 'dd MMM yyyy')
                                                            : '-'
                                                        }
                                                    </span>
                                                </td>

                                                {/* Consignor */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2">
                                                        <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-sm text-foreground dark:text-white truncate max-w-[180px]">
                                                            {lr.consignor?.name || '-'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Route (From → To) */}
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center gap-2 text-sm">
                                                        <span className="text-foreground dark:text-white truncate max-w-[120px]">
                                                            {lr.from_location || '-'}
                                                        </span>
                                                        <ArrowRight className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                                                        <span className="text-foreground dark:text-white truncate max-w-[120px]">
                                                            {lr.to_location || '-'}
                                                        </span>
                                                    </div>
                                                </td>

                                                {/* Status */}
                                                <td className="px-4 py-3 text-center">
                                                    <Badge
                                                        className={cn(
                                                            "text-xs",
                                                            lr.status === 'DELIVERED' && "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50",
                                                            lr.status === 'IN_TRANSIT' && "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
                                                            lr.status === 'CANCELLED' && "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50",
                                                            lr.status === 'PENDING' && "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50"
                                                        )}
                                                    >
                                                        {lr.status.replace('_', ' ')}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
};