// src/pages/super-admin/SuperAdminDashboard.tsx
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building,
  Users,
  Package,
  ArrowUpRight,
  ArrowDownRight,
  Lock,
  Unlock,
  AlertTriangle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    companies: {
      total: 0,
      free: 0,
      full: 0,
      expiringSoon: 0,
      growth: 0,
    },
    users: { total: 0, active: 0, growth: 0 },
    bookings: { total: 0, today: 0, growth: 0 },
    systemHealth: { cpu: 45, memory: 62, storage: 38 },
  });
  const [recentCompanies, setRecentCompanies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch companies with access levels
      const { data: companies, error: compError } = await supabase
        .from("companies")
        .select("*");

      // Fetch users
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, created_at");

      // Fetch bookings
      const { data: bookings, error: bookingError } = await supabase
        .from("bookings")
        .select("id, created_at, status");

      const now = new Date();
      const today = new Date(now.setHours(0, 0, 0, 0));
      const lastMonth = new Date(now.setMonth(now.getMonth() - 1));

      if (companies) {
        // Count FREE vs FULL
        const freeCompanies = companies.filter(
          (c) => c.access_level === "FREE"
        ).length;
        const fullCompanies = companies.filter(
          (c) => c.access_level === "FULL"
        ).length;

        // Count expiring soon (< 7 days)
        const expiringSoon = companies.filter((c) => {
          if (!c.access_expires_at) return false;
          const daysLeft = Math.ceil(
            (new Date(c.access_expires_at).getTime() - Date.now()) /
              (1000 * 60 * 60 * 24)
          );
          return daysLeft <= 7 && daysLeft > 0;
        }).length;

        const lastMonthCompanies = companies.filter(
          (c) => new Date(c.created_at) < lastMonth
        ).length;

        const growth =
          lastMonthCompanies > 0
            ? ((companies.length - lastMonthCompanies) / lastMonthCompanies) *
              100
            : 100;

        setStats((prev) => ({
          ...prev,
          companies: {
            total: companies.length,
            free: freeCompanies,
            full: fullCompanies,
            expiringSoon: expiringSoon,
            growth: Math.round(growth),
          },
        }));

        // Recent companies with access level
        setRecentCompanies(
          companies
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 5)
        );
      }

      if (users) {
        setStats((prev) => ({
          ...prev,
          users: {
            total: users.length,
            active: users.filter((u) => {
              const created = new Date(u.created_at);
              return (
                (Date.now() - created.getTime()) / (1000 * 60 * 60 * 24) <= 7
              );
            }).length,
            growth: 15,
          },
        }));
      }

      if (bookings) {
        const todayBookings = bookings.filter(
          (b) => new Date(b.created_at) >= today
        ).length;

        setStats((prev) => ({
          ...prev,
          bookings: {
            total: bookings.length,
            today: todayBookings,
            growth: 23,
          },
        }));
      }
    } catch (error) {
      console.error("Error loading dashboard:", error);
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
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days} days ago`;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Companies */}
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
                <div className="flex gap-3 mt-1">
                  <span className="text-xs text-green-600 dark:text-green-400">
                    {stats.companies.full} FULL
                  </span>
                  <span className="text-xs text-orange-600 dark:text-orange-400">
                    {stats.companies.free} FREE
                  </span>
                </div>
              </div>
              <div
                className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  stats.companies.growth > 0
                    ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400"
                )}
              >
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

        {/* Access Levels */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Access Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Unlock className="w-4 h-4 text-green-600" />
                  <span className="text-sm">FULL Access</span>
                </div>
                <span className="text-2xl font-bold text-green-600">
                  {stats.companies.full}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm">FREE Access</span>
                </div>
                <span className="text-2xl font-bold text-orange-600">
                  {stats.companies.free}
                </span>
              </div>
              {stats.companies.expiringSoon > 0 && (
                <div className="pt-2 border-t">
                  <div className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400">
                    <AlertTriangle className="w-3 h-3" />
                    {stats.companies.expiringSoon} expiring soon
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
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

        {/* Total Bookings */}
        <Card className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Bookings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between">
              <div>
                <p className="text-3xl font-bold">
                  {formatNumber(stats.bookings.total)}
                </p>
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
      </div>

      {/* System Health & Recent Companies */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* System Health */}
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
              onClick={() => navigate("/super-admin/companies")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentCompanies.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No companies yet
                </p>
              ) : (
                recentCompanies.map((company) => (
                  <div
                    key={company.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-accent transition-colors cursor-pointer"
                    onClick={() => navigate("/super-admin/companies")}
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
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          company.access_level === "FREE"
                            ? "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400"
                            : "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400"
                        )}
                      >
                        {company.access_level === "FREE" ? (
                          <Lock className="w-3 h-3 mr-1" />
                        ) : (
                          <Unlock className="w-3 h-3 mr-1" />
                        )}
                        {company.access_level}
                      </Badge>
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
    </div>
  );
};
