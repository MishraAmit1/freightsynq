// src/pages/super-admin/SuperAdminDashboard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Building,
    Users,
    Package,
    TrendingUp,
    DollarSign,
    Activity,
    AlertCircle,
    CheckCircle,
    Plus,
    ArrowUpRight,
    ArrowDownRight,
    Server,
    HardDrive,
    Zap,
    BarChart3,
    Shield,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const SuperAdminDashboard = () => {
    const navigate = useNavigate();
    const [stats, setStats] = useState({
        companies: { total: 0, active: 0, growth: 0 },
        users: { total: 0, active: 0, growth: 0 },
        bookings: { total: 0, today: 0, growth: 0 },
        revenue: { total: 0, monthly: 0, growth: 0 },
        systemHealth: { cpu: 45, memory: 62, storage: 38 }
    });
    const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);

            // Fetch companies
            const { data: companies, error: compError } = await supabase
                .from('companies')
                .select('id, name, created_at');

            // Fetch users
            const { data: users, error: userError } = await supabase
                .from('users')
                .select('id, created_at');

            // Fetch bookings
            const { data: bookings, error: bookingError } = await supabase
                .from('bookings')
                .select('id, created_at, status');

            // Calculate stats
            const now = new Date();
            const today = new Date(now.setHours(0, 0, 0, 0));
            const lastMonth = new Date(now.setMonth(now.getMonth() - 1));

            if (companies) {
                const activeCompanies = companies.filter(c => {
                    const created = new Date(c.created_at);
                    return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 30;
                }).length;

                const lastMonthCompanies = companies.filter(c =>
                    new Date(c.created_at) < lastMonth
                ).length;

                const growth = lastMonthCompanies > 0
                    ? ((companies.length - lastMonthCompanies) / lastMonthCompanies * 100)
                    : 100;

                setStats(prev => ({
                    ...prev,
                    companies: {
                        total: companies.length,
                        active: activeCompanies,
                        growth: Math.round(growth)
                    }
                }));

                // Recent companies
                setRecentCompanies(
                    companies
                        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                        .slice(0, 5)
                );
            }

            if (users) {
                setStats(prev => ({
                    ...prev,
                    users: {
                        total: users.length,
                        active: users.filter(u => {
                            const created = new Date(u.created_at);
                            return (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7;
                        }).length,
                        growth: 15 // Mock
                    }
                }));
            }

            if (bookings) {
                const todayBookings = bookings.filter(b =>
                    new Date(b.created_at) >= today
                ).length;

                setStats(prev => ({
                    ...prev,
                    bookings: {
                        total: bookings.length,
                        today: todayBookings,
                        growth: 23 // Mock
                    }
                }));
            }

            // Mock revenue (you can calculate from actual data)
            setStats(prev => ({
                ...prev,
                revenue: {
                    total: 1250000,
                    monthly: 125000,
                    growth: 18
                }
            }));

        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    const formatNumber = (num: number) => {
        if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
        if (num >= 1000) return `${(num / 1000).toFixed(1)}k`;
        return num.toString();
    };

    const getTimeAgo = (date: string) => {
        const diff = Date.now() - new Date(date).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        return `${days} days ago`;
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            {/* <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <Shield className="w-8 h-8 text-primary" />
                        Super Admin Dashboard
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        System overview and management
                    </p>
                </div>
                <Button onClick={() => navigate('/super-admin/invites')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Invite
                </Button>
            </div> */}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Companies Card */}
                <Card className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Companies
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline justify-between">
                            <div>
                                <p className="text-3xl font-bold">{stats.companies.total}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.companies.active} active
                                </p>
                            </div>
                            <div className={cn(
                                "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                                stats.companies.growth > 0
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                            )}>
                                {stats.companies.growth > 0 ? (
                                    <ArrowUpRight className="w-3 h-3" />
                                ) : (
                                    <ArrowDownRight className="w-3 h-3" />
                                )}
                                {Math.abs(stats.companies.growth)}%
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <Building className="w-24 h-24" />
                        </div>
                    </CardContent>
                </Card>

                {/* Users Card */}
                <Card className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Users
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline justify-between">
                            <div>
                                <p className="text-3xl font-bold">{stats.users.total}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.users.active} active this week
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3" />
                                {stats.users.growth}%
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <Users className="w-24 h-24" />
                        </div>
                    </CardContent>
                </Card>

                {/* Bookings Card */}
                <Card className="relative overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Bookings
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline justify-between">
                            <div>
                                <p className="text-3xl font-bold">{formatNumber(stats.bookings.total)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {stats.bookings.today} today
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3" />
                                {stats.bookings.growth}%
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <Package className="w-24 h-24" />
                        </div>
                    </CardContent>
                </Card>

                {/* Revenue Card */}
                <Card className="relative overflow-hidden bg-gradient-to-br from-primary/5 to-primary/10">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Revenue
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline justify-between">
                            <div>
                                <p className="text-3xl font-bold">₹{formatNumber(stats.revenue.total)}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    ₹{formatNumber(stats.revenue.monthly)}/month
                                </p>
                            </div>
                            <div className="flex items-center gap-1 text-xs font-medium bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-2 py-1 rounded-full">
                                <ArrowUpRight className="w-3 h-3" />
                                {stats.revenue.growth}%
                            </div>
                        </div>
                        <div className="absolute -right-4 -bottom-4 opacity-10">
                            <DollarSign className="w-24 h-24" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* System Health & Recent Companies */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* System Health */}
                <Card className="lg:col-span-1">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Activity className="w-5 h-5 text-primary" />
                            System Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* CPU Usage */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-blue-500" />
                                    CPU Usage
                                </span>
                                <span className="text-sm font-bold">{stats.systemHealth.cpu}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-blue-500 h-2 rounded-full transition-all"
                                    style={{ width: `${stats.systemHealth.cpu}%` }}
                                />
                            </div>
                        </div>

                        {/* Memory */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <Server className="w-4 h-4 text-green-500" />
                                    Memory
                                </span>
                                <span className="text-sm font-bold">{stats.systemHealth.memory}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-green-500 h-2 rounded-full transition-all"
                                    style={{ width: `${stats.systemHealth.memory}%` }}
                                />
                            </div>
                        </div>

                        {/* Storage */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium flex items-center gap-2">
                                    <HardDrive className="w-4 h-4 text-orange-500" />
                                    Storage
                                </span>
                                <span className="text-sm font-bold">{stats.systemHealth.storage}%</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                <div
                                    className="bg-orange-500 h-2 rounded-full transition-all"
                                    style={{ width: `${stats.systemHealth.storage}%` }}
                                />
                            </div>
                        </div>

                        <div className="pt-2 border-t">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span className="text-sm text-muted-foreground">All systems operational</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Recent Companies */}
                <Card className="lg:col-span-2">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Building className="w-5 h-5 text-primary" />
                            Recent Companies
                        </CardTitle>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate('/super-admin/companies')}
                        >
                            View All
                        </Button>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {recentCompanies.length === 0 ? (
                                <p className="text-center text-muted-foreground py-8">No companies yet</p>
                            ) : (
                                recentCompanies.map((company) => (
                                    <div
                                        key={company.id}
                                        className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors cursor-pointer"
                                        onClick={() => navigate('/super-admin/companies')}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                                                <Building className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="font-medium">{company.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    ID: {company.id.slice(0, 8)}...
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-xs">
                                                {getTimeAgo(company.created_at)}
                                            </Badge>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card
                    className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20 hover:border-primary/40"
                    onClick={() => navigate('/super-admin/invites')}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-lg">
                            <Plus className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="font-semibold">Create Invite</p>
                            <p className="text-xs text-muted-foreground">Generate new company invite</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20 hover:border-primary/40"
                    onClick={() => navigate('/super-admin/companies')}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                            <Building className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="font-semibold">Manage Companies</p>
                            <p className="text-xs text-muted-foreground">View and manage all companies</p>
                        </div>
                    </CardContent>
                </Card>

                <Card
                    className="hover:shadow-lg transition-shadow cursor-pointer border-primary/20 hover:border-primary/40"
                    onClick={() => navigate('/super-admin/stats')}
                >
                    <CardContent className="p-6 flex items-center gap-4">
                        <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                            <p className="font-semibold">System Stats</p>
                            <p className="text-xs text-muted-foreground">View detailed analytics</p>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};