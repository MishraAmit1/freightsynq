// src/pages/super-admin/ManageCompanies.tsx
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    Building,
    Loader2,
    AlertTriangle,
    CheckCircle,
    Clock,
    Search,
    CalendarPlus,
    ChevronDown
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

interface Company {
    id: string;
    name: string;
    email: string;
    company_code: string;
    status: string;
    created_at: string;
    access_expires_at: string | null;
    grace_period_days: number;
    is_trial: boolean;
}

export const ManageCompanies = () => {
    const { isSuperAdmin, userProfile } = useAuth();
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    // Confirmation dialog states
    const [extendDialog, setExtendDialog] = useState(false);
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
    const [selectedDays, setSelectedDays] = useState('30');

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        loadCompanies();
    }, []);

    const loadCompanies = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('companies')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setCompanies(data || []);
        } catch (error: any) {
            console.error('Load companies error:', error);
            toast.error('Failed to load companies');
        } finally {
            setLoading(false);
        }
    };

    const openExtendDialog = (company: Company) => {
        setSelectedCompany(company);
        setSelectedDays('30'); // Default 1 month
        setExtendDialog(true);
    };

    const confirmExtend = async () => {
        if (!selectedCompany) return;

        const days = parseInt(selectedDays);

        try {
            const currentExpiry = selectedCompany.access_expires_at
                ? new Date(selectedCompany.access_expires_at)
                : new Date();

            const newExpiry = new Date(currentExpiry);
            newExpiry.setDate(newExpiry.getDate() + days);

            const { error } = await supabase
                .from('companies')
                .update({
                    access_expires_at: newExpiry.toISOString(),
                    status: 'ACTIVE'
                })
                .eq('id', selectedCompany.id);

            if (error) throw error;

            const periodLabel = days === 15 ? '15 days' :
                days === 30 ? '1 month' :
                    days === 90 ? '3 months' :
                        days === 365 ? '1 year' : `${days} days`;

            toast.success(`✅ Access Extended`, {
                description: `${periodLabel} added to ${selectedCompany.name}`
            });

            setExtendDialog(false);
            setSelectedCompany(null);
            loadCompanies();
        } catch (error: any) {
            console.error('Extend access error:', error);
            toast.error('Failed to extend access');
        }
    };

    const getCompanyStatus = (company: Company) => {
        if (!company.access_expires_at) {
            return { label: 'Unlimited', variant: 'default' as const, icon: CheckCircle };
        }

        const now = new Date();
        const expiry = new Date(company.access_expires_at);
        const daysRemaining = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

        if (daysRemaining < 0) {
            const gracePeriodEnd = new Date(expiry);
            gracePeriodEnd.setDate(gracePeriodEnd.getDate() + (company.grace_period_days || 7));

            if (now < gracePeriodEnd) {
                return {
                    label: 'Grace Period',
                    variant: 'secondary' as const,
                    icon: Clock,
                    daysRemaining: Math.ceil((gracePeriodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                };
            }
            return { label: 'Expired', variant: 'destructive' as const, icon: AlertTriangle };
        }

        if (daysRemaining <= 7) {
            return {
                label: `${daysRemaining} days left`,
                variant: 'outline' as const,
                icon: AlertTriangle,
                daysRemaining
            };
        }

        return {
            label: `${daysRemaining} days`,
            variant: 'default' as const,
            icon: CheckCircle,
            daysRemaining
        };
    };

    const filteredCompanies = companies.filter(company =>
        company.name.toLowerCase().includes(search.toLowerCase()) ||
        company.email.toLowerCase().includes(search.toLowerCase()) ||
        company.company_code.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Building className="w-8 h-8 text-primary" />
                    Manage Companies
                </h1>
                <p className="text-muted-foreground mt-2">
                    View and manage all companies on the platform
                </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold">{companies.length}</div>
                        <div className="text-sm text-muted-foreground">Total Companies</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-green-600">
                            {companies.filter(c => c.status === 'ACTIVE').length}
                        </div>
                        <div className="text-sm text-muted-foreground">Active</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-orange-600">
                            {companies.filter(c => {
                                if (!c.access_expires_at) return false;
                                const days = Math.ceil((new Date(c.access_expires_at).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                return days <= 7 && days >= 0;
                            }).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Expiring Soon</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="text-2xl font-bold text-red-600">
                            {companies.filter(c => {
                                if (!c.access_expires_at) return false;
                                return new Date(c.access_expires_at) < new Date();
                            }).length}
                        </div>
                        <div className="text-sm text-muted-foreground">Expired</div>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search companies..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Companies List */}
            <div className="space-y-4">
                {filteredCompanies.map((company) => {
                    const status = getCompanyStatus(company);
                    const StatusIcon = status.icon;

                    return (
                        <Card key={company.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left - Company Info */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className="w-12 h-12 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <Building className="w-6 h-6 text-primary" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-lg font-semibold truncate">{company.name}</h3>
                                                <div className="flex items-center gap-2 mt-1 flex-wrap">
                                                    <Badge variant={status.variant} className="text-xs">
                                                        <StatusIcon className="w-3 h-3 mr-1" />
                                                        {status.label}
                                                    </Badge>
                                                    {company.is_trial && (
                                                        <Badge variant="outline" className="text-xs">Trial</Badge>
                                                    )}
                                                    <code className="px-2 py-0.5 bg-muted rounded text-xs font-mono">
                                                        {company.company_code}
                                                    </code>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="font-medium text-foreground">Email:</span>
                                                <span className="truncate">{company.email}</span>
                                            </div>
                                            <div className="flex items-center gap-2 text-muted-foreground">
                                                <span className="font-medium text-foreground">Created:</span>
                                                {new Date(company.created_at).toLocaleDateString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric'
                                                })}
                                            </div>
                                            {company.access_expires_at && (
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="font-medium text-foreground">Expires:</span>
                                                    <span className={status.daysRemaining && status.daysRemaining <= 7 ? 'text-orange-600 font-semibold' : 'font-medium'}>
                                                        {new Date(company.access_expires_at).toLocaleDateString('en-IN', {
                                                            day: '2-digit',
                                                            month: 'short',
                                                            year: 'numeric'
                                                        })}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {/* Right - Action Button */}
                                    {userProfile?.company_id === company.id ? (
                                        // ✅ Super Admin's Own Company
                                        <div className="flex-shrink-0">
                                            <Badge variant="secondary" className="px-4 py-2">
                                                <Building className="w-4 h-4 mr-2" />
                                                Your Company
                                            </Badge>
                                        </div>
                                    ) : (
                                        <Button
                                            onClick={() => openExtendDialog(company)}
                                            variant="outline"  // ✅ Light color
                                            className="flex-shrink-0 border-primary/20 hover:bg-primary/5"
                                        >
                                            <CalendarPlus className="w-4 h-4 mr-2" />
                                            Extend Access
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {filteredCompanies.length === 0 && (
                    <Alert>
                        <AlertDescription>
                            No companies found matching your search.
                        </AlertDescription>
                    </Alert>
                )}
            </div>

            {/* Extend Access Dialog */}
            <Dialog open={extendDialog} onOpenChange={setExtendDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarPlus className="w-5 h-5 text-primary" />
                            Extend Portal Access
                        </DialogTitle>
                        <DialogDescription>
                            Choose duration to extend access for this company
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCompany && (
                        <div className="space-y-4 py-4">
                            {/* Company Info */}
                            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Company</span>
                                    <span className="font-semibold">{selectedCompany.name}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-muted-foreground">Current Expiry</span>
                                    <span className="font-medium">
                                        {selectedCompany.access_expires_at
                                            ? new Date(selectedCompany.access_expires_at).toLocaleDateString('en-IN')
                                            : 'Unlimited'}
                                    </span>
                                </div>
                            </div>

                            {/* Extension Period Selector */}
                            <div className="space-y-2">
                                <label className="text-sm font-medium">Extension Period</label>
                                <Select value={selectedDays} onValueChange={setSelectedDays}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">
                                            <span className="flex items-center gap-2">
                                                <span>15 Days</span>
                                                <Badge variant="outline" className="text-xs">Trial</Badge>
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="30">
                                            <span className="flex items-center gap-2">
                                                <span>1 Month (30 days)</span>
                                                <Badge variant="outline" className="text-xs bg-blue-50">Popular</Badge>
                                            </span>
                                        </SelectItem>
                                        <SelectItem value="90">
                                            <span>3 Months (90 days)</span>
                                        </SelectItem>
                                        <SelectItem value="180">
                                            <span>6 Months (180 days)</span>
                                        </SelectItem>
                                        <SelectItem value="365">
                                            <span className="flex items-center gap-2">
                                                <span>1 Year (365 days)</span>
                                                <Badge variant="outline" className="text-xs bg-green-50">Best Value</Badge>
                                            </span>
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Preview */}
                            <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-primary">New Expiry Date</span>
                                    <span className="font-bold text-primary">
                                        {(() => {
                                            const current = selectedCompany.access_expires_at
                                                ? new Date(selectedCompany.access_expires_at)
                                                : new Date();
                                            const newDate = new Date(current);
                                            newDate.setDate(newDate.getDate() + parseInt(selectedDays));
                                            return newDate.toLocaleDateString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric'
                                            });
                                        })()}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setExtendDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={confirmExtend}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Confirm Extension
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};