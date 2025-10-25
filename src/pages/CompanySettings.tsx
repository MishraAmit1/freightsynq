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
    AlertCircle
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
        <div className="space-y-8 p-2">
            {/* Header Section with Gradient */}
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-8 border border-primary/20">
                <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
                <div className="relative flex items-center justify-between">
                    <div>
                        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                            Company Settings
                        </h1>
                        <p className="text-muted-foreground mt-2 text-lg">
                            Manage your company settings, templates and employees
                        </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl">
                        <Building2 className="w-8 h-8 text-primary" />
                    </div>
                </div>
            </div>

            <div className="grid gap-6">
                {/* LR Template Section */}
                <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
                    <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                        <CardTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <FileText className="w-5 h-5 text-primary" />
                            </div>
                            LR Template Configuration
                        </CardTitle>
                        <CardDescription>
                            Configure how your Lorry Receipts will look when generated
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {templateLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                                </div>
                                <p className="text-muted-foreground">Loading template configuration...</p>
                            </div>
                        ) : currentTemplate ? (
                            <div className="space-y-6">
                                {/* Current Template Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-muted/30 rounded-xl border border-border/50">
                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <FileSignature className="w-4 h-4 text-primary" />
                                            Current Template
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="default" className="font-medium bg-primary/20 text-primary border-primary/30 hover:text-white">
                                                {currentTemplate.template_name}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Palette className="w-4 h-4 text-primary" />
                                            Primary Color
                                        </Label>
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="w-6 h-6 rounded-full border shadow-sm"
                                                style={{ backgroundColor: currentTemplate.style_config?.primary_color }}
                                            ></div>
                                            <span className="text-sm font-mono">{currentTemplate.style_config?.primary_color}</span>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Type className="w-4 h-4 text-primary" />
                                            Font Family
                                        </Label>
                                        <div className="mt-1">
                                            <Badge variant="outline" className="font-medium">
                                                {currentTemplate.style_config?.font_family}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <Image className="w-4 h-4 text-primary" />
                                            Logo Display
                                        </Label>
                                        <div className="mt-1">
                                            <Badge
                                                variant={currentTemplate.header_config?.show_logo ? "default" : "secondary"}
                                                className={currentTemplate.header_config?.show_logo ?
                                                    "bg-green-100 text-green-700 border-green-200" :
                                                    "bg-gray-100 text-gray-700 border-gray-200"}
                                            >
                                                {currentTemplate.header_config?.show_logo ? "Enabled" : "Disabled"}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>

                                {/* Template Actions */}
                                <div className="flex flex-wrap gap-3">
                                    <Button
                                        onClick={handleTemplateChange}
                                        className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Change Template
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={handleTemplatePreview}
                                        className="hover:bg-primary/10 hover:border-primary transition-all"
                                    >
                                        <Eye className="w-4 h-4 mr-2" />
                                        Preview Current
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={loadTemplateData}
                                        className="hover:bg-primary/10 hover:border-primary transition-all"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Reload
                                    </Button>
                                </div>

                                {/* Configuration Summary */}
                                <div className="space-y-4 mt-2">
                                    <div className="p-4 rounded-lg bg-gradient-to-r from-background to-muted/30 border border-border/50">
                                        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                                            <Settings className="w-4 h-4 text-primary" />
                                            Header Configuration
                                        </Label>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                                <div className="text-xs text-muted-foreground">GST Display</div>
                                                <div className="font-medium mt-1 flex items-center gap-1">
                                                    {currentTemplate.header_config?.show_gst ?
                                                        <CheckCircle className="w-3.5 h-3.5 text-green-600" /> :
                                                        <XCircle className="w-3.5 h-3.5 text-red-600" />}
                                                    {currentTemplate.header_config?.show_gst ? "Shown" : "Hidden"}
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                                <div className="text-xs text-muted-foreground">Address Display</div>
                                                <div className="font-medium mt-1 flex items-center gap-1">
                                                    {currentTemplate.header_config?.show_address ?
                                                        <CheckCircle className="w-3.5 h-3.5 text-green-600" /> :
                                                        <XCircle className="w-3.5 h-3.5 text-red-600" />}
                                                    {currentTemplate.header_config?.show_address ? "Shown" : "Hidden"}
                                                </div>
                                            </div>

                                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                                <div className="text-xs text-muted-foreground">Logo Position</div>
                                                <div className="font-medium mt-1 capitalize">{currentTemplate.header_config?.logo_position}</div>
                                            </div>

                                            <div className="p-3 rounded-lg bg-muted/50 border border-border/50">
                                                <div className="text-xs text-muted-foreground">Company Name Size</div>
                                                <div className="font-medium mt-1 capitalize">{currentTemplate.header_config?.company_name_size}</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-gradient-to-r from-background to-muted/30 border border-border/50">
                                        <Label className="text-sm font-medium flex items-center gap-2 mb-3">
                                            <FileText className="w-4 h-4 text-primary" />
                                            Footer Configuration
                                        </Label>
                                        <div className="mt-1">
                                            <p className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg border">
                                                <strong>Terms:</strong> "{currentTemplate.footer_config?.terms_text}"
                                            </p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <span className="text-xs font-medium text-muted-foreground">Signatures:</span>
                                                {currentTemplate.footer_config?.signature_labels?.map((label, index) => (
                                                    <Badge key={index} variant="outline" className="text-xs">
                                                        {label}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-12">
                                <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No LR Template Configured</h3>
                                <p className="text-muted-foreground mb-4">
                                    Set up your Lorry Receipt template to start generating professional LRs
                                </p>
                                <Button
                                    onClick={handleTemplateChange}
                                    className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
                                >
                                    <Settings className="w-4 h-4 mr-2" />
                                    Configure LR Template
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* ✅ NEW: LR City Configuration Card */}
                <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
                    <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                        <CardTitle className="flex items-center justify-between text-xl">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <MapPin className="w-5 h-5 text-primary" />
                                </div>
                                LR City Numbering
                            </div>
                            {isAdmin && (
                                <Button
                                    onClick={() => setShowAddCityModal(true)}
                                    size="sm"
                                    className="bg-gradient-to-r from-primary to-primary/80"
                                >
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add City
                                </Button>
                            )}
                        </CardTitle>
                        <CardDescription>
                            Manage city-wise LR number sequences. Only one city can be active at a time.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        {lrCitiesLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <div className="relative">
                                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                                </div>
                                <p className="text-muted-foreground">Loading LR cities...</p>
                            </div>
                        ) : lrCities.length === 0 ? (
                            <div className="text-center py-12">
                                <MapPin className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                                <h3 className="text-lg font-medium mb-2">No Cities Configured</h3>
                                <p className="text-muted-foreground mb-4">
                                    Add your first city to start managing LR numbers
                                </p>
                                {isAdmin && (
                                    <Button onClick={() => setShowAddCityModal(true)}>
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
                                            "p-4 rounded-lg border transition-all",
                                            city.is_active
                                                ? "bg-primary/5 border-primary shadow-sm"
                                                : "bg-muted/30 border-border/50"
                                        )}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className={cn(
                                                        "w-3 h-3 rounded-full",
                                                        city.is_active ? "bg-green-500 animate-pulse" : "bg-gray-300"
                                                    )}
                                                />
                                                <div>
                                                    <div className="font-semibold text-lg">{city.city_name}</div>
                                                    <div className="text-sm text-muted-foreground">
                                                        Current: <span className="font-mono font-medium">
                                                            {city.prefix}{city.current_lr_number}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                {city.is_active ? (
                                                    <Badge className="bg-green-100 text-green-700 border-green-200">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    isAdmin && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleSetActiveCity(city.id, city.city_name)}
                                                            className="hover:bg-primary/10 hover:border-primary"
                                                        >
                                                            Set Active
                                                        </Button>
                                                    )
                                                )}

                                                {isAdmin && (
                                                    <>
                                                        <TooltipProvider>
                                                            <Tooltip>
                                                                <TooltipTrigger asChild>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleEditCity(city)}
                                                                        className="hover:bg-primary/10"
                                                                    >
                                                                        <Edit className="w-4 h-4" />
                                                                    </Button>
                                                                </TooltipTrigger>
                                                                <TooltipContent>
                                                                    <p>Edit LR Number</p>
                                                                </TooltipContent>
                                                            </Tooltip>
                                                        </TooltipProvider>

                                                        {!city.is_active && (
                                                            <TooltipProvider>
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => handleDeleteCity(city.id, city.city_name)}
                                                                            className="hover:bg-destructive/10 hover:text-destructive"
                                                                        >
                                                                            <Trash2 className="w-4 h-4" />
                                                                        </Button>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent>
                                                                        <p>Delete City</p>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            </TooltipProvider>
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

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Company Code Card */}
                    <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Shield className="w-5 h-5 text-primary" />
                                </div>
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
                                        className="font-mono text-lg h-11 border-muted-foreground/20"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={copyCodeToClipboard}
                                        className="h-11 w-11 hover:bg-primary/10 hover:border-primary transition-all"
                                    >
                                        <Copy className="h-4 w-4" />
                                    </Button>
                                </div>

                                {isAdmin && (
                                    <Button
                                        variant="outline"
                                        onClick={generateNewCode}
                                        disabled={loading}
                                        className="w-full hover:bg-primary/10 hover:border-primary transition-all"
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
                                    <AlertDescription className="text-yellow-700">
                                        Anyone with this code can join your company. Generate a new code to revoke access.
                                    </AlertDescription>
                                </Alert>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Employees Card */}
                    <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
                        <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                            <CardTitle className="flex items-center gap-2">
                                <div className="p-2 bg-primary/10 rounded-lg">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                Employees ({employees.length})
                            </CardTitle>
                            <CardDescription>
                                People with access to your company data
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {loading ? (
                                <div className="flex justify-center py-4">
                                    <Loader2 className="h-6 w-6 animate-spin" />
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {employees.length === 0 ? (
                                        <div className="text-center py-8 text-muted-foreground">
                                            No employees found
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {employees.map((employee) => (
                                                <div
                                                    key={employee.id}
                                                    className="flex items-center justify-between p-3 bg-muted/30 rounded-lg border border-border/50"
                                                >
                                                    <div>
                                                        <div className="font-medium">{employee.name}</div>
                                                        <div className="text-xs text-muted-foreground">{employee.email}</div>
                                                    </div>
                                                    <Badge
                                                        variant={employee.role === 'admin' ? 'default' : 'secondary'}
                                                        className={employee.role === 'admin' ? 'bg-primary/20 text-primary border-primary/30' : ''}
                                                    >
                                                        {employee.role}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <Button
                                            variant="outline"
                                            className="w-full hover:bg-primary/10 hover:border-primary transition-all"
                                            onClick={() => window.open('/employee-signup', '_blank')}
                                        >
                                            Employee Signup Link
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ✅ NEW: Add City Modal */}
            <Dialog open={showAddCityModal} onOpenChange={setShowAddCityModal}>
                <DialogContent>
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
                                placeholder="e.g., Vapi, Surat, Mumbai"
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
                                    placeholder="1869"
                                />
                            </div>
                        </div>

                        <Alert>
                            <AlertDescription>
                                LR numbers will be generated as: <strong>{newCityForm.prefix}{newCityForm.current_lr_number}</strong>
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddCityModal(false);
                                setNewCityForm({ city_name: '', prefix: 'LR', current_lr_number: 1001 });
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleAddCity}
                            disabled={!newCityForm.city_name || !newCityForm.current_lr_number}
                        >
                            Add City
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ✅ NEW: Edit City Number Modal */}
            <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
                <DialogContent>
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
                            <AlertDescription className="text-yellow-700">
                                <strong>Warning:</strong> Changing this number will affect the next LR generated for this city.
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowEditModal(false);
                                setEditingCity(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateCityNumber}>
                            Update Number
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};  