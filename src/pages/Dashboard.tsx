import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  FileText,
  Truck,
  Clock,
  CheckCircle,
  Plus,
  TrendingUp,
  Package,
  Users,
  Activity,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Loader2,
  Warehouse,
  UserCheck,
  Zap,
  CheckCircle2,
  ArrowRight,
  BarChart3,
  PieChart as PieChartIcon,
  Shield,
  AlertTriangle,
  Lock,
  Sparkles,
  MapPin,
  Navigation,
} from "lucide-react";
import {
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { BookingFormModal } from "@/features/bookings/BookingFormModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format, subDays, startOfDay } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { RequestStatusCard } from "@/components/RequestStatusCard";
import { AccessRequestModal } from "@/components/AccessRequestModal";

// ✅ THEME COLORS
const CHART_COLORS = {
  primary: "#FCC52C",
  primaryDark: "#F38810",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  muted: "#9CA3AF",
};

interface DashboardStats {
  bookings: {
    total: number;
    active: number;
    completed: number;
    pending: number;
    cancelled: number;
    todayCount: number;
    weekGrowth: number;
    monthGrowth: number;
  };
  vehicles: {
    total: number;
    owned: number;
    hired: number;
    available: number;
    occupied: number;
    maintenance: number;
    verified: number;
    utilization: number;
  };
  warehouses: {
    total: number;
    totalCapacity: number;
    currentStock: number;
    utilization: number;
    nearCapacity: number;
  };
  customers: {
    total: number;
    consignors: number;
    consignees: number;
    active: number;
    newThisMonth: number;
  };
  revenue: {
    today: number;
    week: number;
    month: number;
    pending: number;
    monthGrowth: number;
  };
}

interface RecentActivity {
  id: string;
  type: "booking" | "vehicle" | "warehouse" | "payment";
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { company, accessLevel } = useAuth(); // ✅ Get accessLevel
  const isFreeUser = accessLevel === "FREE"; // ✅ Check if FREE user

  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAccessRequestModal, setShowAccessRequestModal] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    bookings: {
      total: 0,
      active: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
      todayCount: 0,
      weekGrowth: 0,
      monthGrowth: 0,
    },
    vehicles: {
      total: 0,
      owned: 0,
      hired: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
      verified: 0,
      utilization: 0,
    },
    warehouses: {
      total: 0,
      totalCapacity: 0,
      currentStock: 0,
      utilization: 0,
      nearCapacity: 0,
    },
    customers: {
      total: 0,
      consignors: 0,
      consignees: 0,
      active: 0,
      newThisMonth: 0,
    },
    revenue: {
      today: 0,
      week: 0,
      month: 0,
      pending: 0,
      monthGrowth: 0,
    },
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>(
    []
  );
  const [chartData, setChartData] = useState<any>({
    bookingTrends: [],
    vehicleStatus: [],
    fleetPerformance: [],
  });

  useEffect(() => {
    if (company?.id) {
      if (isFreeUser) {
        setLoading(false); // No data load needed for FREE users
      } else {
        loadDashboardData();
      }
    }
  }, [company, isFreeUser]);

  const loadDashboardData = async () => {
    if (!company?.id) return;

    try {
      setLoading(true);

      const [
        bookingsData,
        vehiclesData,
        warehousesData,
        customersData,
        activitiesData,
        bookingTrendsData,
        fleetData,
      ] = await Promise.all([
        fetchBookingStats(),
        fetchVehicleStats(),
        fetchWarehouseStats(),
        fetchCustomerStats(),
        fetchRecentActivities(),
        fetchBookingTrends(),
        fetchFleetPerformance(),
      ]);

      const dashboardStats: DashboardStats = {
        bookings: bookingsData,
        vehicles: vehiclesData,
        warehouses: warehousesData,
        customers: customersData,
        revenue: calculateRevenue(bookingsData),
      };

      setStats(dashboardStats);
      setRecentActivities(activitiesData);

      setChartData({
        bookingTrends: bookingTrendsData,
        vehicleStatus: generateVehicleStatusChart(vehiclesData),
        fleetPerformance: fleetData,
      });
    } catch (error) {
      console.error("Error loading dashboard data:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingTrends = async () => {
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = subDays(new Date(), i);
      const dateStart = startOfDay(date);
      const dateEnd = new Date(dateStart);
      dateEnd.setHours(23, 59, 59, 999);

      const { count: totalCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company?.id)
        .gte("created_at", dateStart.toISOString())
        .lte("created_at", dateEnd.toISOString());

      const { count: deliveredCount } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company?.id)
        .eq("status", "DELIVERED")
        .gte("created_at", dateStart.toISOString())
        .lte("created_at", dateEnd.toISOString());

      trends.push({
        date: format(date, "MMM dd"),
        bookings: totalCount || 0,
        delivered: deliveredCount || 0,
      });
    }
    return trends;
  };

  const fetchFleetPerformance = async () => {
    const { data: ownedVehicles } = await supabase
      .from("owned_vehicles")
      .select("status")
      .eq("company_id", company?.id);

    const { data: hiredVehicles } = await supabase
      .from("hired_vehicles")
      .select("status")
      .eq("company_id", company?.id);

    const ownedStats = {
      available:
        ownedVehicles?.filter((v) => v.status === "AVAILABLE").length || 0,
      occupied:
        ownedVehicles?.filter((v) => v.status === "OCCUPIED").length || 0,
      maintenance:
        ownedVehicles?.filter((v) => v.status === "MAINTENANCE").length || 0,
    };

    const hiredStats = {
      available:
        hiredVehicles?.filter((v) => v.status === "AVAILABLE").length || 0,
      occupied:
        hiredVehicles?.filter((v) => v.status === "OCCUPIED").length || 0,
      maintenance:
        hiredVehicles?.filter((v) => v.status === "MAINTENANCE").length || 0,
    };

    return [
      {
        name: "Owned",
        available: ownedStats.available,
        occupied: ownedStats.occupied,
        maintenance: ownedStats.maintenance,
      },
      {
        name: "Hired",
        available: hiredStats.available,
        occupied: hiredStats.occupied,
        maintenance: hiredStats.maintenance,
      },
    ];
  };

  const fetchBookingStats = async () => {
    const { data: bookings } = await supabase
      .from("bookings")
      .select("*")
      .eq("company_id", company?.id);

    const today = new Date();
    const todayStart = startOfDay(today);
    const weekAgo = subDays(today, 7);

    const todayBookings =
      bookings?.filter((b) => new Date(b.created_at) >= todayStart).length || 0;

    const weekBookings =
      bookings?.filter((b) => new Date(b.created_at) >= weekAgo).length || 0;

    const lastWeekBookings =
      bookings?.filter((b) => {
        const date = new Date(b.created_at);
        return date >= subDays(weekAgo, 7) && date < weekAgo;
      }).length || 0;

    const weekGrowth =
      lastWeekBookings > 0
        ? ((weekBookings - lastWeekBookings) / lastWeekBookings) * 100
        : weekBookings > 0
        ? 100
        : 0;

    const monthBookings =
      bookings?.filter((b) => new Date(b.created_at) >= subDays(today, 30))
        .length || 0;

    const lastMonthBookings =
      bookings?.filter((b) => {
        const date = new Date(b.created_at);
        return date >= subDays(today, 60) && date < subDays(today, 30);
      }).length || 0;

    const monthGrowth =
      lastMonthBookings > 0
        ? ((monthBookings - lastMonthBookings) / lastMonthBookings) * 100
        : monthBookings > 0
        ? 100
        : 0;

    return {
      total: bookings?.length || 0,
      active:
        bookings?.filter((b) =>
          ["CONFIRMED", "DISPATCHED", "IN_TRANSIT"].includes(b.status)
        ).length || 0,
      completed: bookings?.filter((b) => b.status === "DELIVERED").length || 0,
      pending:
        bookings?.filter((b) => b.status === "DRAFT" || b.status === "QUOTED")
          .length || 0,
      cancelled: bookings?.filter((b) => b.status === "CANCELLED").length || 0,
      todayCount: todayBookings,
      weekGrowth: Math.round(weekGrowth * 10) / 10,
      monthGrowth: Math.round(monthGrowth * 10) / 10,
    };
  };

  const fetchVehicleStats = async () => {
    const { data: ownedVehicles } = await supabase
      .from("owned_vehicles")
      .select("*")
      .eq("company_id", company?.id);

    const { data: hiredVehicles } = await supabase
      .from("hired_vehicles")
      .select("*")
      .eq("company_id", company?.id);

    const allVehicles = [...(ownedVehicles || []), ...(hiredVehicles || [])];
    const available = allVehicles.filter(
      (v) => v.status === "AVAILABLE"
    ).length;
    const occupied = allVehicles.filter((v) => v.status === "OCCUPIED").length;
    const total = allVehicles.length;

    return {
      total: total,
      owned: ownedVehicles?.length || 0,
      hired: hiredVehicles?.length || 0,
      available: available,
      occupied: occupied,
      maintenance: allVehicles.filter((v) => v.status === "MAINTENANCE").length,
      verified: allVehicles.filter((v) => v.is_verified).length,
      utilization: total > 0 ? Math.round((occupied / total) * 100) : 0,
    };
  };

  const fetchWarehouseStats = async () => {
    const { data: warehouses } = await supabase
      .from("warehouses")
      .select("*")
      .eq("company_id", company?.id);

    const totalCapacity =
      warehouses?.reduce((sum, w) => sum + (w.capacity || 0), 0) || 0;
    const currentStock =
      warehouses?.reduce((sum, w) => sum + (w.current_stock || 0), 0) || 0;
    const nearCapacity =
      warehouses?.filter((w) => {
        const util = (w.current_stock / w.capacity) * 100;
        return util > 85;
      }).length || 0;

    return {
      total: warehouses?.length || 0,
      totalCapacity,
      currentStock,
      utilization:
        totalCapacity > 0
          ? Math.round((currentStock / totalCapacity) * 100)
          : 0,
      nearCapacity,
    };
  };

  const fetchCustomerStats = async () => {
    const { data: parties } = await supabase
      .from("parties")
      .select("*")
      .eq("company_id", company?.id);

    const monthAgo = subDays(new Date(), 30);
    const newThisMonth =
      parties?.filter((p) => new Date(p.created_at) >= monthAgo).length || 0;

    return {
      total: parties?.length || 0,
      consignors:
        parties?.filter(
          (p) => p.party_type === "CONSIGNOR" || p.party_type === "BOTH"
        ).length || 0,
      consignees:
        parties?.filter(
          (p) => p.party_type === "CONSIGNEE" || p.party_type === "BOTH"
        ).length || 0,
      active: parties?.filter((p) => p.status === "ACTIVE").length || 0,
      newThisMonth,
    };
  };

  const fetchRecentActivities = async (): Promise<RecentActivity[]> => {
    const activities: RecentActivity[] = [];

    const { data: recentBookings } = await supabase
      .from("bookings")
      .select("id, booking_id, from_location, to_location, status, created_at")
      .eq("company_id", company?.id)
      .order("created_at", { ascending: false })
      .limit(8);

    recentBookings?.forEach((booking) => {
      const timeDiff = Date.now() - new Date(booking.created_at).getTime();
      const hoursAgo = Math.floor(timeDiff / (1000 * 60 * 60));
      const timeStr =
        hoursAgo < 1
          ? "Just now"
          : hoursAgo < 24
          ? `${hoursAgo}h ago`
          : `${Math.floor(hoursAgo / 24)}d ago`;

      activities.push({
        id: booking.id,
        type: "booking",
        title: "New Booking Created",
        description: `${booking.booking_id} from ${booking.from_location} to ${booking.to_location}`,
        timestamp: timeStr,
        status: booking.status,
      });
    });

    return activities;
  };

  const calculateRevenue = (bookingStats: any) => {
    const estimatedPerBooking = 50000;

    return {
      today: bookingStats.todayCount * estimatedPerBooking,
      week: Math.round(bookingStats.total * estimatedPerBooking * 0.15),
      month: Math.round(bookingStats.total * estimatedPerBooking * 0.5),
      pending: Math.round(bookingStats.pending * estimatedPerBooking),
      monthGrowth: bookingStats.monthGrowth,
    };
  };

  const generateVehicleStatusChart = (vehicleStats: any) => {
    return [
      {
        name: "Available",
        value: vehicleStats.available,
        color: CHART_COLORS.success,
      },
      {
        name: "Occupied",
        value: vehicleStats.occupied,
        color: CHART_COLORS.primary,
      },
      {
        name: "Maintenance",
        value: vehicleStats.maintenance,
        color: CHART_COLORS.danger,
      },
    ];
  };

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    iconBgColor,
    iconColor,
    onClick,
  }: any) => {
    const isPositive = trend === "up";
    const TrendIcon = isPositive ? ArrowUp : ArrowDown;

    return (
      <Card
        className={cn(
          "bg-card border border-border dark:border-border shadow-sm hover:shadow-md transition-all duration-300",
          onClick && "cursor-pointer hover:border-primary/30"
        )}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                {title}
              </p>
              <p className="text-3xl font-bold text-foreground dark:text-white">
                {value}
              </p>
              {trendValue !== undefined && (
                <div
                  className={cn(
                    "flex items-center gap-1 text-xs font-medium",
                    isPositive ? "text-green-600" : "text-red-600"
                  )}
                >
                  <TrendIcon className="w-3 h-3" />
                  <span>{Math.abs(trendValue)}%</span>
                  <span className="text-muted-foreground dark:text-muted-foreground">
                    vs last period
                  </span>
                </div>
              )}
            </div>
            <div className={cn("p-3 rounded-xl", iconBgColor)}>
              <Icon className={cn("w-6 h-6", iconColor)} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  // ✅ FREE USER DASHBOARD VIEW
  if (isFreeUser) {
    return (
      <div className="space-y-6">
        {/* ✅ Access Request Modal */}
        <AccessRequestModal
          open={showAccessRequestModal}
          onOpenChange={setShowAccessRequestModal}
          featureName="All Features"
          featureIcon={Sparkles}
          features={[
            "Customer & Party Management",
            "Complete Booking System",
            "Fleet & Vehicle Management",
            "Warehouse Operations",
          ]}
        />

        {/* ✅ Request Status Card - Shows pending/rejected/approved status */}
        <RequestStatusCard
          onRequestAgain={() => {
            setShowAccessRequestModal(true); // ✅ Opens the modal!
          }}
        />

        {/* Welcome Banner */}
        <Card className="bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-foreground dark:text-white flex items-center gap-2">
                  Welcome to FreightSynQ
                  <Badge
                    variant="outline"
                    className="bg-green-100 text-green-700 border-green-200"
                  >
                    FREE Plan
                  </Badge>
                </h1>
                <p className="text-muted-foreground">
                  You have access to limited features. Upgrade to unlock full
                  potential.
                </p>
              </div>
              <Button
                onClick={() => setShowAccessRequestModal(true)} // ✅ Updated - Opens modal
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Request Full Access
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Available Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Tracking Card */}
          <Card
            className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-primary"
            onClick={() => navigate("/tracking")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Navigation className="w-6 h-6 text-primary" />
                </div>
                Vehicle Tracking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Track any vehicle using FASTag data. View live location and
                journey history.
              </p>
              <Button variant="outline" className="w-full">
                Open Tracking
              </Button>
            </CardContent>
          </Card>

          {/* LR Generator Card */}
          <Card
            className="hover:shadow-md transition-all cursor-pointer border-l-4 border-l-green-500"
            onClick={() => navigate("/lr-generator")}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <FileText className="w-6 h-6 text-green-600" />
                </div>
                LR Generator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Create professional Lorry Receipts instantly. Download PDF and
                share.
              </p>
              <Button variant="outline" className="w-full">
                Create LR
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Locked Features Preview */}
        <div>
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Lock className="w-5 h-5 text-muted-foreground" />
            Locked Features
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 opacity-70 grayscale-[0.5]">
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                <Package className="w-8 h-8 text-muted-foreground" />
                <h3 className="font-medium">Bookings Management</h3>
                <p className="text-xs text-muted-foreground">
                  Create and manage shipments
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                <Truck className="w-8 h-8 text-muted-foreground" />
                <h3 className="font-medium">Fleet Management</h3>
                <p className="text-xs text-muted-foreground">
                  Manage owned and hired vehicles
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                <Warehouse className="w-8 h-8 text-muted-foreground" />
                <h3 className="font-medium">Warehouse</h3>
                <p className="text-xs text-muted-foreground">
                  Inventory and stock tracking
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 flex flex-col items-center text-center gap-2">
                <Users className="w-8 h-8 text-muted-foreground" />
                <h3 className="font-medium">Customer Database</h3>
                <p className="text-xs text-muted-foreground">
                  Manage consignors and consignees
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }
  // ✅ FULL USER DASHBOARD (Normal View)
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground dark:text-muted-foreground animate-pulse">
          Loading dashboard analytics...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 -mt-1">
      {/* Key Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Bookings"
          value={stats.bookings.total.toLocaleString()}
          icon={FileText}
          trend={stats.bookings.weekGrowth >= 0 ? "up" : "down"}
          trendValue={stats.bookings.weekGrowth}
          iconBgColor="bg-accent dark:bg-primary/10"
          iconColor="text-primary dark:text-primary"
          onClick={() => navigate("/bookings")}
        />
        <MetricCard
          title="Active Shipments"
          value={stats.bookings.active}
          icon={Truck}
          trend="up"
          trendValue={8.2}
          iconBgColor="bg-blue-100 dark:bg-blue-900/20"
          iconColor="text-blue-600"
          onClick={() => navigate("/bookings")}
        />
        <MetricCard
          title="Fleet Utilization"
          value={`${stats.vehicles.utilization}%`}
          icon={Activity}
          trend={stats.vehicles.utilization > 70 ? "up" : "down"}
          trendValue={stats.vehicles.utilization > 70 ? 5.4 : 3.2}
          iconBgColor="bg-accent dark:bg-primary/10"
          iconColor="text-primary dark:text-primary"
          onClick={() => navigate("/vehicles")}
        />
        <MetricCard
          title="Revenue (Month)"
          value={`₹${(stats.revenue.month / 100000).toFixed(1)}L`}
          icon={DollarSign}
          trend="up"
          trendValue={stats.revenue.monthGrowth}
          iconBgColor="bg-green-100 dark:bg-green-900/20"
          iconColor="text-green-600"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* BOOKING TRENDS */}
        <Card className="lg:col-span-2 bg-card border border-border dark:border-border shadow-sm">
          <CardHeader className="border-b border-border dark:border-border">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
                <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
                  <BarChart3 className="w-5 h-5 text-primary dark:text-primary" />
                </div>
                Booking Trends
              </CardTitle>
              <Badge className="w-fit bg-muted text-muted-foreground dark:text-muted-foreground border-border dark:border-border">
                Last 7 Days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            {chartData.bookingTrends.length > 0 ? (
              <div className="w-full overflow-x-auto">
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={chartData.bookingTrends}>
                    <defs>
                      <linearGradient
                        id="bookingGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={CHART_COLORS.primary}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={CHART_COLORS.primary}
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="deliveredGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor={CHART_COLORS.success}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={CHART_COLORS.success}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="date"
                      stroke="#6B7280"
                      style={{ fontSize: "12px" }}
                    />
                    <YAxis stroke="#6B7280" style={{ fontSize: "12px" }} />
                    <RechartsTooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #E5E7EB",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="bookings"
                      stroke={CHART_COLORS.primary}
                      fill="url(#bookingGradient)"
                      strokeWidth={2}
                      name="Total Bookings"
                    />
                    <Area
                      type="monotone"
                      dataKey="delivered"
                      stroke={CHART_COLORS.success}
                      fill="url(#deliveredGradient)"
                      strokeWidth={2}
                      name="Delivered"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <BarChart3 className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  No booking data available yet
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                  Create bookings to see trends
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vehicle Status Distribution */}
        <Card className="bg-card border border-border dark:border-border shadow-sm">
          <CardHeader className="border-b border-border dark:border-border">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
              <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
                <PieChartIcon className="w-5 h-5 text-primary dark:text-primary" />
              </div>
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {stats.vehicles.total > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={chartData.vehicleStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.vehicleStatus.map(
                        (entry: any, index: number) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        )
                      )}
                    </Pie>
                    <RechartsTooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2 mt-4">
                  {chartData.vehicleStatus.map((status: any, index: number) => (
                    <div
                      key={index}
                      className="flex items-center justify-between text-sm"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: status.color }}
                        />
                        <span className="text-xs sm:text-sm text-foreground dark:text-white">
                          {status.name}
                        </span>
                      </div>
                      <span className="text-xs sm:text-sm font-medium text-foreground dark:text-white">
                        {status.value}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <Truck className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  No vehicles added yet
                </p>
                <Button
                  size="sm"
                  className="mt-3 bg-primary hover:bg-primary-hover text-foreground"
                  onClick={() => navigate("/vehicles")}
                >
                  Add Vehicle
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Warehouse */}
        <Card className="bg-card border border-border dark:border-border shadow-sm">
          <CardHeader className="border-b border-border dark:border-border pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
                  <Warehouse className="w-4 h-4 text-primary dark:text-primary" />
                </div>
                <span className="text-sm sm:text-base text-foreground dark:text-white">
                  Warehouse
                </span>
              </div>
              <Badge
                className={cn(
                  "text-xs",
                  stats.warehouses.utilization > 85
                    ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50"
                    : "bg-accent dark:bg-primary/10 text-primary dark:text-primary border-primary/30"
                )}
              >
                {stats.warehouses.utilization}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <Progress value={stats.warehouses.utilization} className="h-2" />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">
                    {stats.warehouses.total}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Total
                  </p>
                </div>
                <div>
                  <p className="text-xl sm:text-2xl font-bold text-primary dark:text-primary">
                    {stats.warehouses.nearCapacity}
                  </p>
                  <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                    Near Full
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card className="bg-card border border-border dark:border-border shadow-sm">
          <CardHeader className="border-b border-border dark:border-border pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Users className="w-4 h-4 text-green-600" />
                </div>
                <span className="text-sm sm:text-base text-foreground dark:text-white">
                  Customers
                </span>
              </div>
              <Badge className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50">
                +{stats.customers.newThisMonth}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xl sm:text-2xl font-bold text-foreground dark:text-white">
                  {stats.customers.total}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Total
                </p>
              </div>
              <div>
                <p className="text-xl sm:text-2xl font-bold text-green-600">
                  {stats.customers.active}
                </p>
                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                  Active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Today's Performance */}
        <Card className="bg-card border border-border dark:border-border shadow-sm">
          <CardHeader className="border-b border-border dark:border-border pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <div className="p-1.5 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Zap className="w-4 h-4 text-blue-600" />
              </div>
              <span className="text-sm sm:text-base text-foreground dark:text-white">
                Today
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-xs sm:text-sm text-foreground dark:text-white">
                    Completed
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground dark:text-white">
                  {stats.bookings.completed}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary dark:text-primary" />
                  <span className="text-xs sm:text-sm text-foreground dark:text-white">
                    Pending
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground dark:text-white">
                  {stats.bookings.pending}
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-xs sm:text-sm text-foreground dark:text-white">
                    Revenue
                  </span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-foreground dark:text-white">
                  ₹{(stats.revenue.today / 1000).toFixed(0)}K
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Fleet Performance & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fleet Performance */}
        <Card className="bg-card border border-border dark:border-border shadow-sm">
          <CardHeader className="border-b border-border dark:border-border">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
                  <Shield className="w-5 h-5 text-primary dark:text-primary" />
                </div>
                <span className="text-foreground dark:text-white">
                  Fleet Performance
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/vehicles")}
                className="hover:bg-accent dark:hover:bg-secondary"
              >
                View Fleet
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {chartData.fleetPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData.fleetPerformance}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="name"
                    stroke="#6B7280"
                    style={{ fontSize: "12px" }}
                  />
                  <YAxis stroke="#6B7280" style={{ fontSize: "12px" }} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #E5E7EB",
                      borderRadius: "8px",
                      fontSize: "12px",
                    }}
                  />
                  <Legend />
                  <Bar
                    dataKey="available"
                    fill={CHART_COLORS.success}
                    name="Available"
                  />
                  <Bar
                    dataKey="occupied"
                    fill={CHART_COLORS.primary}
                    name="Occupied"
                  />
                  <Bar
                    dataKey="maintenance"
                    fill={CHART_COLORS.danger}
                    name="Maintenance"
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <Truck className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  No fleet data available
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="bg-card border border-border dark:border-border shadow-sm">
          <CardHeader className="border-b border-border dark:border-border">
            <CardTitle className="flex items-center justify-between text-lg">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
                  <Activity className="w-5 h-5 text-green-600" />
                </div>
                <span className="text-foreground dark:text-white">
                  Recent Activities
                </span>
              </div>
              <Badge className="text-xs bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.slice(0, 4).map((activity) => {
                  const icons = {
                    booking: FileText,
                    vehicle: Truck,
                    warehouse: Warehouse,
                    payment: DollarSign,
                  };
                  const Icon = icons[activity.type];

                  return (
                    <div
                      key={activity.id}
                      className="flex gap-3 p-2 rounded-lg bg-muted hover:bg-accent dark:hover:bg-muted transition-colors"
                    >
                      <div
                        className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                          activity.type === "booking"
                            ? "bg-accent dark:bg-primary/10 text-primary dark:text-primary"
                            : activity.type === "vehicle"
                            ? "bg-blue-100 dark:bg-blue-900/20 text-blue-600"
                            : "bg-green-100 dark:bg-green-900/20 text-green-600"
                        )}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate text-foreground dark:text-white">
                          {activity.title}
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground truncate">
                          {activity.description}
                        </p>
                        <p className="text-xs text-muted-foreground dark:text-muted-foreground mt-1">
                          {activity.timestamp}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[300px]">
                <Activity className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                  No recent activities
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-card border border-border dark:border-border shadow-sm">
        <CardHeader className="border-b border-border dark:border-border">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-white">
            <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
              <Zap className="w-5 h-5 text-primary dark:text-primary" />
            </div>
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary hover:border-primary/30"
              onClick={() => setIsBookingFormOpen(true)}
            >
              <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground dark:text-white">
                Create Booking
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary hover:border-primary/30"
              onClick={() => navigate("/vehicles?openModal=owned")}
            >
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground dark:text-white">
                Add Vehicle
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary hover:border-primary/30"
              onClick={() => navigate("/customers")}
            >
              <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <UserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground dark:text-white">
                Add Customer
              </span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary hover:border-primary/30"
              onClick={() => navigate("/warehouses")}
            >
              <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                <Package className="w-4 h-4 sm:w-5 sm:h-5 text-primary dark:text-primary" />
              </div>
              <span className="text-xs sm:text-sm font-medium text-foreground dark:text-white">
                View Warehouses
              </span>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Booking Form Modal */}
      <BookingFormModal
        isOpen={isBookingFormOpen}
        onClose={() => setIsBookingFormOpen(false)}
        onSave={async (bookingData) => {
          toast({
            title: "✅ Booking Created",
            description: `Booking has been created successfully`,
          });
          await loadDashboardData();
        }}
      />
    </div>
  );
};
