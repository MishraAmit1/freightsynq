// src/pages/super-admin/SystemStats.tsx
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
            // Get companies count
            const { count: totalCompanies } = await supabase
                .from('companies')
                .select('*', { count: 'exact', head: true });

            const { count: activeCompanies } = await supabase
                .from('companies')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ACTIVE');

            // Get invites stats
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

            // Get recent invites
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
                return { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Pending' };
            case 'used':
                return { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Used' };
            case 'expired':
                return { icon: XCircle, color: 'text-red-600 bg-red-50', label: 'Expired' };
            default:
                return { icon: Clock, color: 'text-gray-600 bg-gray-50', label: status };
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <TrendingUp className="w-8 h-8 text-primary" />
                        System Statistics
                    </h1>
                    <p className="text-muted-foreground mt-2">
                        Platform overview and analytics
                    </p>
                </div>
                <Button onClick={loadStats} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {/* Companies Stats */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Companies</CardTitle>
                        <Building className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.totalCompanies || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats?.activeCompanies || 0} active
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Total Invites</CardTitle>
                        <Mail className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{stats?.totalInvites || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            All time generated
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Pending Invites</CardTitle>
                        <Clock className="w-4 h-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-blue-600">{stats?.pendingInvites || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Waiting to be used
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Used Invites</CardTitle>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-green-600">{stats?.usedInvites || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Successfully converted
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Expired Invites</CardTitle>
                        <XCircle className="w-4 h-4 text-red-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold text-red-600">{stats?.expiredInvites || 0}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Not used in time
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                        <TrendingUp className="w-4 h-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {stats?.totalInvites
                                ? Math.round((stats.usedInvites / stats.totalInvites) * 100)
                                : 0}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Invites to signups
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Recent Invites */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Invites</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {recentInvites.map((invite) => {
                            const statusBadge = getStatusBadge(invite.status);
                            const StatusIcon = statusBadge.icon;

                            return (
                                <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg">
                                    <div className="flex-1">
                                        <div className="font-semibold">{invite.company_name}</div>
                                        <div className="text-sm text-muted-foreground">
                                            Code: <span className="font-mono">{invite.invite_code}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            Created: {new Date(invite.created_at).toLocaleString()}
                                        </div>
                                        {invite.used_at && (
                                            <div className="text-xs text-muted-foreground">
                                                Used: {new Date(invite.used_at).toLocaleString()}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`px-3 py-1 rounded-full flex items-center gap-1 ${statusBadge.color}`}>
                                        <StatusIcon className="w-3 h-3" />
                                        <span className="text-xs font-medium">{statusBadge.label}</span>
                                    </div>
                                </div>
                            );
                        })}

                        {recentInvites.length === 0 && (
                            <div className="text-center text-muted-foreground py-8">
                                No invites generated yet
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};