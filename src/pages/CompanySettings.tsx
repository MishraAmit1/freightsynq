// pages/CompanySettings.tsx (COMPLETE UPDATED VERSION)
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ApiUsageDashboard } from '@/components/ApiUsageDashboard';
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
    Truck
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
// ✅ NEW IMPORT
import {
    fetchLRCities,
    addLRCity,
    setActiveLRCity,
    updateLRCityNumber,
    deleteLRCity,
    LRCitySequence
} from '@/api/lr-sequences';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useNavigate } from 'react-router-dom';

export const CompanySettings = () => {
    const { company, userProfile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [companyCode, setCompanyCode] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    // LR Template states
    const [templateLoading, setTemplateLoading] = useState(false);
    const [currentTemplate, setCurrentTemplate] = useState(null);
    const [showTemplateOnboarding, setShowTemplateOnboarding] = useState(false);

    // ✅ NEW: LR City states
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
    const navigate = useNavigate();
    useEffect(() => {
        if (company) {
            loadData();
            loadTemplateData();
            loadLRCities(); // ✅ NEW
            setIsAdmin(userProfile?.role === 'admin');
        }
    }, [company, userProfile]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get company code
            const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .select('company_code')
                .eq('id', company.id)
                .single();

            if (companyError) throw companyError;
            setCompanyCode(companyData.company_code || '');

            // Get employees
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

    // ✅ NEW: Load LR Cities
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

    // ✅ NEW: Add new city handler
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

    // ✅ NEW: Set active city handler
    const handleSetActiveCity = async (cityId: string, cityName: string) => {
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

    // ✅ NEW: Delete city handler
    const handleDeleteCity = async (cityId: string, cityName: string) => {
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

    // ✅ NEW: Edit city number handler
    const handleEditCity = (city: LRCitySequence) => {
        setEditingCity(city);
        setShowEditModal(true);
    };

    const handleUpdateCityNumber = async () => {
        if (!editingCity) return;

        try {
            await updateLRCityNumber(editingCity.id, editingCity.current_lr_number);
            await loadLRCities();
            setShowEditModal(false);
            setEditingCity(null);
            toast({
                title: '✅ Number Updated',
                description: `${editingCity.city_name} LR number has been updated`,
            });
        } catch (error: any) {
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to update city number',
                variant: 'destructive',
            });
        }
    };

    const generateNewCode = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            // Generate a new code
            const newCode = `${company.name.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`;

            // Update company
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
    // Add these functions after generateNewCode function

    // Change employee role
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

            // Reload employees list
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

    // Delete employee
    const handleDeleteEmployee = async (employeeId: string, employeeName: string) => {
        if (!confirm(`Are you sure you want to remove ${employeeName} from your company?\n\nThis will revoke their access immediately.`)) {
            return;
        }

        setLoading(true);
        try {
            // Option 1: Complete delete from users table
            const { error } = await supabase
                .from('users')
                .delete()
                .eq('id', employeeId);

            // Option 2: Just remove company_id (keep user account but revoke access)
            // const { error } = await supabase
            //     .from('users')
            //     .update({ company_id: null })
            //     .eq('id', employeeId);

            if (error) throw error;

            toast({
                title: '✅ Employee Removed',
                description: `${employeeName} has been removed from your company`,
            });

            // Reload employees list
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
    // If showing template onboarding, render that instead
    if (showTemplateOnboarding) {
        return (
            <div className="min-h-screen">
                <div className="mb-4">
                    <Button
                        variant="outline"
                        onClick={() => setShowTemplateOnboarding(false)}
                        className="flex items-center gap-2 hover:bg-primary/10 hover:border-primary transition-all"
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
            <div className="space-y-4">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-inter">
                            Company Settings
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground mt-1">
                            Manage your company settings, templates and employees
                        </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Building2 className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
                    </div>
                </div>
            </div>

            <div className="space-y-6">
                {/* Company Code & Employees Cards */}
                <div className="grid gap-6 md:grid-cols-2">
                    {/* Company Code Card */}
                    <Card className="border shadow-sm">
                        <CardHeader className="border-b">
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Shield className="w-5 h-5 text-primary" />
                                Company Code
                            </CardTitle>
                            <CardDescription>
                                Share this code with employees to join your company
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Input
                                        value={companyCode}
                                        readOnly
                                        className="font-mono text-base sm:text-lg h-10 sm:h-11"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyCodeToClipboard}
                                        className="h-10 w-10 sm:h-11 sm:w-11 shrink-0"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>

                                {isAdmin && (
                                    <Button
                                        variant="outline"
                                        onClick={generateNewCode}
                                        disabled={loading}
                                        className="w-full"
                                    >
                                        {loading ? (
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                        ) : (
                                            <RefreshCw className="h-4 w-4 mr-2" />
                                        )}
                                        Generate New Code
                                    </Button>
                                )}

                                <Alert className="border-yellow-200 bg-yellow-50/50">
                                    <AlertDescription className="text-yellow-700 text-xs sm:text-sm">
                                        Anyone with this code can join your company. Generate a new code to revoke access.
                                    </AlertDescription>
                                </Alert>

                                <Button
                                    variant="outline"
                                    onClick={() => navigate('/company-profile')}
                                    className="w-full"
                                >
                                    <Building2 className="h-4 w-4 mr-2" />
                                    View Company Profile
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Employees Card */}
                    <Card className="border shadow-sm">
                        <CardHeader className="border-b">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                                <div className="flex-1">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <Users className="w-5 h-5 text-primary" />
                                        Team Members
                                    </CardTitle>
                                    <CardDescription className="mt-1">
                                        {filteredEmployees.length} of {employees.length} employees
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="text-sm shrink-0">
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
                                        className="h-9 pl-9 text-sm"
                                    />
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    {employeeSearch && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            onClick={() => setEmployeeSearch('')}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                                        >
                                            <XCircle className="w-3.5 h-3.5" />
                                        </Button>
                                    )}
                                </div>

                                <Select value={employeeRoleFilter} onValueChange={setEmployeeRoleFilter}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder="Filter by role" />
                                    </SelectTrigger>
                                    <SelectContent>
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
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : filteredEmployees.length === 0 ? (
                                <div className="text-center py-8">
                                    <Users className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                                    <p className="text-sm text-muted-foreground">
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
                                            className="mt-2"
                                        >
                                            Clear filters
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Employee List */}
                                    <div className="max-h-[400px] overflow-y-auto pr-2 space-y-2">
                                        {filteredEmployees.map((employee) => (
                                            <div
                                                key={employee.id}
                                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <div className="font-medium text-sm truncate">
                                                            {employee.name}
                                                        </div>
                                                        {employee.id === userProfile?.id && (
                                                            <Badge variant="outline" className="text-xs shrink-0">
                                                                You
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground truncate mt-0.5">
                                                        {employee.email}
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 ml-2">
                                                    {isAdmin && employee.id !== userProfile?.id ? (
                                                        <Select
                                                            value={employee.role}
                                                            onValueChange={(newRole) => handleChangeRole(employee.id, newRole, employee.name)}
                                                        >
                                                            <SelectTrigger className="w-28 h-7 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                                <SelectItem value="dispatcher">Dispatcher</SelectItem>
                                                                <SelectItem value="warehouse">Warehouse</SelectItem>
                                                                <SelectItem value="accounts">Accounts</SelectItem>
                                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Badge variant={employee.role === 'admin' ? 'default' : 'secondary'} className="text-xs">
                                                            {employee.role}
                                                        </Badge>
                                                    )}

                                                    {isAdmin && employee.id !== userProfile?.id && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleDeleteEmployee(employee.id, employee.name)}
                                                            className="h-7 w-7 p-0 hover:bg-destructive/10 hover:text-destructive"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Copy Signup Link */}
                                    <Button
                                        variant="outline"
                                        className="w-full"
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
                <Card className="border shadow-sm">
                    <CardHeader className="border-b">
                        <CardTitle className="flex items-center gap-2 text-lg">
                            <FileText className="w-5 h-5 text-primary" />
                            LR Template Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure how your Lorry Receipts will look when generated
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {templateLoading ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                <p className="text-muted-foreground mt-4">Loading template...</p>
                            </div>
                        ) : currentTemplate ? (
                            <div className="space-y-6">
                                {/* Template Info Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg border">
                                    <div className="space-y-2">
                                        <Label className="text-sm flex items-center gap-2">
                                            <FileSignature className="w-4 h-4 text-primary" />
                                            Current Template
                                        </Label>
                                        <Badge variant="default">{currentTemplate.template_name}</Badge>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-primary" />
                                            Primary Color
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-full border"
                                                style={{ backgroundColor: currentTemplate.style_config?.primary_color }}
                                            />
                                            <span className="text-sm font-mono">{currentTemplate.style_config?.primary_color}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex flex-wrap gap-2">
                                    <Button onClick={handleTemplateChange} className="flex-1 sm:flex-none">
                                        <Edit className="w-4 h-4 mr-2" />
                                        Change Template
                                    </Button>
                                    <Button variant="outline" onClick={handleTemplatePreview} className="flex-1 sm:flex-none">
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Template Configured</h3>
                                <Button onClick={handleTemplateChange} className="mt-4">
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configure Template
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* LR City Card */}
                <Card className="border shadow-sm">
                    <CardHeader className="border-b">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div>
                                <CardTitle className="flex items-center gap-2 text-lg">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    LR City Numbering
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Manage city-wise LR number sequences
                                </CardDescription>
                            </div>
                            {isAdmin && (
                                <Button
                                    onClick={() => setShowAddCityModal(true)}
                                    size="sm"
                                    className="w-full sm:w-auto"
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
                                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                            </div>
                        ) : lrCities.length === 0 ? (
                            <div className="text-center py-12">
                                <MapPin className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Cities Configured</h3>
                                {isAdmin && (
                                    <Button onClick={() => setShowAddCityModal(true)} className="mt-4">
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
                                        className={cn(
                                            "p-4 rounded-lg border",
                                            city.is_active ? "bg-primary/5 border-primary" : "bg-muted/30"
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
                                                    <div className="font-semibold text-base sm:text-lg truncate">{city.city_name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Current: <span className="font-mono font-medium">
                                                            {city.prefix}{city.current_lr_number}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 flex-wrap">
                                                {city.is_active ? (
                                                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                                                ) : (
                                                    isAdmin && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleSetActiveCity(city.id, city.city_name)}
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
                                                            onClick={() => handleEditCity(city)}
                                                        >
                                                            <Edit className="w-4 h-4" />
                                                        </Button>

                                                        {!city.is_active && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteCity(city.id, city.city_name)}
                                                                className="hover:text-destructive"
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
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

            {/* Add City Modal */}
            <Dialog open={showAddCityModal} onOpenChange={setShowAddCityModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Add New LR City</DialogTitle>
                        <DialogDescription>
                            Configure LR numbering for a new city
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>City Name *</Label>
                            <Input
                                value={newCityForm.city_name}
                                onChange={(e) => setNewCityForm({
                                    ...newCityForm,
                                    city_name: e.target.value
                                })}
                                placeholder="e.g., Vapi, Surat"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Prefix</Label>
                                <Input
                                    value={newCityForm.prefix}
                                    onChange={(e) => setNewCityForm({
                                        ...newCityForm,
                                        prefix: e.target.value
                                    })}
                                    placeholder="LR"
                                />
                            </div>

                            <div>
                                <Label>Starting Number *</Label>
                                <Input
                                    type="number"
                                    value={newCityForm.current_lr_number}
                                    onChange={(e) => setNewCityForm({
                                        ...newCityForm,
                                        current_lr_number: parseInt(e.target.value) || 1001
                                    })}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowAddCityModal(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCity}
                            disabled={!newCityForm.city_name}
                            className="w-full sm:w-auto"
                        >
                            Add City
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit City Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit LR Number</DialogTitle>
                        <DialogDescription>
                            Update the current LR number for {editingCity?.city_name}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>Current LR Number</Label>
                            <Input
                                type="number"
                                value={editingCity?.current_lr_number || 1001}
                                onChange={(e) => setEditingCity(editingCity ? {
                                    ...editingCity,
                                    current_lr_number: parseInt(e.target.value) || 1001
                                } : null)}
                            />
                        </div>

                        <Alert className="border-yellow-200 bg-yellow-50/50">
                            <AlertCircle className="w-4 h-4 text-yellow-600" />
                            <AlertDescription className="text-yellow-700 text-sm">
                                Changing this will affect the next LR generated
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setShowEditModal(false)}
                            className="w-full sm:w-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpdateCityNumber}
                            className="w-full sm:w-auto"
                        >
                            Update Number
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};  