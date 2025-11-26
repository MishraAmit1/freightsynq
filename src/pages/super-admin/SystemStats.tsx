import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import {
    TrendingUp,
    Loader2,
    Users,
    Building,
    Mail,
    CheckCircle,
    XCircle,
    Clock,
    RefreshCw
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Stats {
    totalCompanies: number;
    activeCompanies: number;
    totalInvites: number;
    pendingInvites: number;
    usedInvites: number;
    expiredInvites: number;
}

export const SystemStats = () => {
    const { isSuperAdmin } = useAuth();
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [recentInvites, setRecentInvites] = useState<any[]>([]);

    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        setLoading(true);
        try {
            const { count: totalCompanies } = await supabase
                .from('companies')
                .select('*', { count: 'exact', head: true });

            const { count: activeCompanies } = await supabase
                .from('companies')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ACTIVE');

            const { count: totalInvites } = await supabase
                .from('company_invites')
                .select('*', { count: 'exact', head: true });

            const { count: pendingInvites } = await supabase
                .from('company_invites')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            const { count: usedInvites } = await supabase
                .from('company_invites')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'used');

            const { count: expiredInvites } = await supabase
                .from('company_invites')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'expired');

            const { data: invites } = await supabase
                .from('company_invites')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);

            setStats({
                totalCompanies: totalCompanies || 0,
                activeCompanies: activeCompanies || 0,
                totalInvites: totalInvites || 0,
                pendingInvites: pendingInvites || 0,
                usedInvites: usedInvites || 0,
                expiredInvites: expiredInvites || 0,
            });

            setRecentInvites(invites || []);
        } catch (error: any) {
            console.error('Load stats error:', error);
            toast.error('Failed to load statistics');
        } finally {
            setLoading(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return {
                    icon: Clock,
                    color: 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-900/50',
                    label: 'Pending'
                };
            case 'used':
                return {
                    icon: CheckCircle,
                    color: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-900/50',
                    label: 'Used'
                };
            case 'expired':
                return {
                    icon: XCircle,
                    color: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-900/50',
                    label: 'Expired'
                };
            default:
                return {
                    icon: Clock,
                    color: 'bg-muted text-muted-foreground dark:text-muted-foreground border border-border dark:border-border',
                    label: status
                };
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
                <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin text-primary" />
                    <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                </div>
                <p className="text-lg font-medium text-muted-foreground dark:text-muted-foreground animate-pulse">
                    Loading statistics...
                </p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground dark:text-white">
                        <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                            <TrendingUp className="w-8 h-8 text-primary dark:text-primary" />
                        </div>
                        System Statistics
                    </h1>
                    <p className="text-muted-foreground dark:text-muted-foreground mt-2">
                        Platform overview and analytics
                    </p>
                </div>
                <Button
                    onClick={loadStats}
                    variant="outline"
                    className="bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Total Companies */}
                <Card className="bg-card border border-border dark:border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Total Companies</CardTitle>
                        <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                            <Building className="w-4 h-4 text-primary dark:text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground dark:text-white">{stats?.totalCompanies || 0}</div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                            {stats?.activeCompanies || 0} active
                        </p>
                    </CardContent>
                </Card>

                {/* Total Invites */}
                <Card className="bg-card border border-border dark:border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Total Invites</CardTitle>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Mail className="w-4 h-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground dark:text-white">{stats?.totalInvites || 0}</div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                            All time generated
                        </p>
                    </CardContent>
                </Card>

                {/* Pending Invites */}
                <Card className="bg-card border border-border dark:border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Pending Invites</CardTitle>
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Clock className="w-4 h-4 text-blue-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{stats?.pendingInvites || 0}</div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                            Waiting to be used
                        </p>
                    </CardContent>
                </Card>

                {/* Used Invites */}
                <Card className="bg-card border border-border dark:border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Used Invites</CardTitle>
                        <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{stats?.usedInvites || 0}</div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                            Successfully converted
                        </p>
                    </CardContent>
                </Card>

                {/* Expired Invites */}
                <Card className="bg-card border border-border dark:border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Expired Invites</CardTitle>
                        <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                            <XCircle className="w-4 h-4 text-red-600" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{stats?.expiredInvites || 0}</div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                            Not used in time
                        </p>
                    </CardContent>
                </Card>

                {/* Conversion Rate */}
                <Card className="bg-card border border-border dark:border-border hover:shadow-md transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">Conversion Rate</CardTitle>
                        <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                            <TrendingUp className="w-4 h-4 text-primary dark:text-primary" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-foreground dark:text-white">
                            {stats?.totalInvites
                                ? Math.round((stats.usedInvites / stats.totalInvites) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                            Invites to signups
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Invites */}
            <Card className="bg-card border border-border dark:border-border">
                <CardHeader className="border-b border-border dark:border-border">
                    <CardTitle className="text-foreground dark:text-white">Recent Invites</CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                    <div className="space-y-3">
                        {recentInvites.map((invite) => {
                            const statusBadge = getStatusBadge(invite.status);
                            const StatusIcon = statusBadge.icon;

                            return (
                                <div
                                    key={invite.id}
                                    className="flex items-center justify-between p-4 bg-muted border border-border dark:border-border rounded-lg hover:bg-accent dark:hover:bg-muted transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="font-semibold text-foreground dark:text-white">{invite.company_name}</div>
                                        <div className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                                            Code: <span className="font-mono bg-card px-2 py-0.5 rounded border border-border dark:border-border text-foreground dark:text-white">{invite.invite_code}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                                            Created: {new Date(invite.created_at).toLocaleString('en-IN', {
                                                day: '2-digit',
                                                month: 'short',
                                                year: 'numeric',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </div>
                                        {invite.used_at && (
                                            <div className="text-xs text-green-600 dark:text-green-400 mt-0.5">
                                                Used: {new Date(invite.used_at).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </div>
                                        )}
                                    </div>
                                    <div className={cn("px-3 py-1.5 rounded-full flex items-center gap-1.5 flex-shrink-0 ml-4", statusBadge.color)}>
                                        <StatusIcon className="w-3.5 h-3.5" />
                                        <span className="text-xs font-medium">{statusBadge.label}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {recentInvites.length === 0 && (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                    <Mail className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
                                </div>
                                <p className="text-muted-foreground dark:text-muted-foreground">No invites generated yet</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};