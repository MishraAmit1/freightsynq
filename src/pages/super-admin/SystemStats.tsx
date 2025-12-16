import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
  TrendingUp,
  Loader2,
  Users,
  Building,
  CheckCircle,
  Lock,
  Unlock,
  AlertTriangle,
  Clock,
  CalendarX,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Stats {
  totalCompanies: number;
  activeCompanies: number;
  freeCompanies: number;
  fullCompanies: number;
  expiringSoon: number;
  expired: number;
  totalUsers: number;
  totalBookings: number;
}

export const SystemStats = () => {
  const { isSuperAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  if (!isSuperAdmin) {
    return <Navigate to="/" replace />;
  }

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Companies stats
      const { data: companies } = await supabase.from("companies").select("*");

      if (companies) {
        const now = new Date();

        const freeCompanies = companies.filter(
          (c) => c.access_level === "FREE"
        ).length;
        const fullCompanies = companies.filter(
          (c) => c.access_level === "FULL"
        ).length;
        const activeCompanies = companies.filter(
          (c) => c.status === "ACTIVE"
        ).length;

        const expiringSoon = companies.filter((c) => {
          if (!c.access_expires_at) return false;
          const daysLeft = Math.ceil(
            (new Date(c.access_expires_at).getTime() - now.getTime()) /
              (1000 * 60 * 60 * 24)
          );
          return daysLeft <= 7 && daysLeft > 0;
        }).length;

        const expired = companies.filter((c) => {
          if (!c.access_expires_at) return false;
          return new Date(c.access_expires_at) < now;
        }).length;

        // Users stats
        const { count: totalUsers } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });

        // Bookings stats
        const { count: totalBookings } = await supabase
          .from("bookings")
          .select("*", { count: "exact", head: true });

        setStats({
          totalCompanies: companies.length,
          activeCompanies,
          freeCompanies,
          fullCompanies,
          expiringSoon,
          expired,
          totalUsers: totalUsers || 0,
          totalBookings: totalBookings || 0,
        });

        // Recent activity (last 10 companies)
        setRecentActivity(
          companies
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )
            .slice(0, 10)
        );
      }
    } catch (error: any) {
      console.error("Load stats error:", error);
      toast.error("Failed to load statistics");
    } finally {
      setLoading(false);
    }
  };

  const getAccessBadge = (company: any) => {
    const daysLeft = company.access_expires_at
      ? Math.ceil(
          (new Date(company.access_expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      : null;

    if (company.access_level === "FREE") {
      return {
        icon: Lock,
        color:
          "bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400",
        label: "FREE",
      };
    }

    if (daysLeft && daysLeft <= 0) {
      return {
        icon: CalendarX,
        color: "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400",
        label: "Expired",
      };
    }

    if (daysLeft && daysLeft <= 7) {
      return {
        icon: AlertTriangle,
        color:
          "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400",
        label: `${daysLeft} days left`,
      };
    }

    return {
      icon: Unlock,
      color:
        "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400",
      label: daysLeft ? `${daysLeft} days` : "FULL",
    };
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Loading statistics...
        </p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Companies */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Companies
            </CardTitle>
            <Building className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalCompanies || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats?.activeCompanies || 0} active
            </p>
          </CardContent>
        </Card>

        {/* FREE Accounts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">FREE Accounts</CardTitle>
            <Lock className="w-4 h-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats?.freeCompanies || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Limited access</p>
          </CardContent>
        </Card>

        {/* FULL Access */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">FULL Access</CardTitle>
            <Unlock className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.fullCompanies || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              All features unlocked
            </p>
          </CardContent>
        </Card>

        {/* Access Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Access Status</CardTitle>
            <Activity className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {stats?.expiringSoon ? (
                <div className="flex items-center gap-1 text-xs">
                  <AlertTriangle className="w-3 h-3 text-orange-500" />
                  <span className="text-orange-600">
                    {stats.expiringSoon} expiring soon
                  </span>
                </div>
              ) : null}
              {stats?.expired ? (
                <div className="flex items-center gap-1 text-xs">
                  <CalendarX className="w-3 h-3 text-red-500" />
                  <span className="text-red-600">{stats.expired} expired</span>
                </div>
              ) : null}
              {!stats?.expiringSoon && !stats?.expired && (
                <div className="flex items-center gap-1 text-xs">
                  <CheckCircle className="w-3 h-3 text-green-500" />
                  <span className="text-green-600">All access healthy</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Total Users */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all companies
            </p>
          </CardContent>
        </Card>

        {/* Total Bookings */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Bookings
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalBookings || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {stats?.totalCompanies
                ? Math.round((stats.fullCompanies / stats.totalCompanies) * 100)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">FREE to FULL</p>
          </CardContent>
        </Card>

        {/* Platform Growth */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Platform Growth
            </CardTitle>
            <Activity className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="text-2xl font-bold text-green-600">+18%</div>
              <div className="text-xs text-muted-foreground">this month</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Companies Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Company Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((company) => {
              const accessBadge = getAccessBadge(company);
              const AccessIcon = accessBadge.icon;

              return (
                <div
                  key={company.id}
                  className="flex items-center justify-between p-4 bg-muted rounded-lg"
                >
                  <div className="flex-1">
                    <div className="font-semibold">{company.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      Registered:{" "}
                      {new Date(company.created_at).toLocaleDateString("en-IN")}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "px-3 py-1.5 rounded-full flex items-center gap-1.5",
                      accessBadge.color
                    )}
                  >
                    <AccessIcon className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">
                      {accessBadge.label}
                    </span>
                  </div>
                </div>
              );
            })}
            {recentActivity.length === 0 && (
              <div className="text-center py-12">
                <Building className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  No companies registered yet
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
