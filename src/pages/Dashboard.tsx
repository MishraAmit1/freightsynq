import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  FileText,
  Truck,
  Clock,
  CheckCircle,
  Plus,
  TrendingUp,
  Package,
  Building2,
  Users,
  MapPin,
  AlertCircle,
  Activity,
  DollarSign,
  ArrowUp,
  ArrowDown,
  Eye,
  Calendar,
  BarChart3,
  PieChart,
  Loader2,
  Navigation,
  Shield,
  Warehouse,
  UserCheck,
  TrendingDown,
  Timer,
  Target,
  Zap,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MoreVertical,
  ArrowRight,
  RefreshCw,
  Search
} from "lucide-react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart as RePieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
  ComposedChart
} from "recharts";
import { BookingFormModal } from "@/features/bookings/BookingFormModal";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format, subDays, startOfDay, endOfDay } from "date-fns";

// Chart color palette
const COLORS = {
  primary: "hsl(var(--primary))",
  secondary: "#8b5cf6",
  success: "#10b981",
  warning: "#f59e0b",
  danger: "#ef4444",
  info: "#3b82f6",
  muted: "hsl(var(--muted))"
};

// Interfaces
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
  type: 'booking' | 'vehicle' | 'warehouse' | 'payment';
  title: string;
  description: string;
  timestamp: string;
  status?: string;
}

export const Dashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateRange, setDateRange] = useState("week");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    bookings: {
      total: 0,
      active: 0,
      completed: 0,
      pending: 0,
      cancelled: 0,
      todayCount: 0,
      weekGrowth: 0,
      monthGrowth: 0
    },
    vehicles: {
      total: 0,
      owned: 0,
      hired: 0,
      available: 0,
      occupied: 0,
      maintenance: 0,
      verified: 0,
      utilization: 0
    },
    warehouses: {
      total: 0,
      totalCapacity: 0,
      currentStock: 0,
      utilization: 0,
      nearCapacity: 0
    },
    customers: {
      total: 0,
      consignors: 0,
      consignees: 0,
      active: 0,
      newThisMonth: 0
    },
    revenue: {
      today: 0,
      week: 0,
      month: 0,
      pending: 0,
      monthGrowth: 0
    }
  });

  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [chartData, setChartData] = useState<any>({
    bookingTrends: [],
    vehicleStatus: [],
    warehouseCapacity: [],
    revenueData: [],
    routeAnalysis: []
  });

  useEffect(() => {
    loadDashboardData();
  }, [dateRange]);

  // Handle search
  useEffect(() => {
    if (searchTerm.length >= 3) {
      searchData(searchTerm);
    } else {
      setSearchResults([]);
    }
  }, [searchTerm]);

  const searchData = async (term: string) => {
    setIsSearching(true);
    try {
      // Search in bookings
      const { data: bookingResults } = await supabase
        .from('bookings')
        .select('id, booking_id, from_location, to_location, status')
        .or(`booking_id.ilike.%${term}%, lr_number.ilike.%${term}%`)
        .limit(5);

      // Set results
      setSearchResults(bookingResults || []);
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setIsSearching(false);
    }
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [
        bookingsData,
        vehiclesData,
        warehousesData,
        customersData,
        activitiesData
      ] = await Promise.all([
        fetchBookingStats(),
        fetchVehicleStats(),
        fetchWarehouseStats(),
        fetchCustomerStats(),
        fetchRecentActivities()
      ]);

      // Calculate statistics
      const dashboardStats: DashboardStats = {
        bookings: bookingsData,
        vehicles: vehiclesData,
        warehouses: warehousesData,
        customers: customersData,
        revenue: calculateRevenue(bookingsData)
      };

      setStats(dashboardStats);
      setRecentActivities(activitiesData);
      setChartData(generateChartData(dashboardStats));

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "❌ Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBookingStats = async () => {
    const { data: bookings } = await supabase
      .from('bookings')
      .select('*');

    const today = new Date();
    const todayStart = startOfDay(today);
    const weekAgo = subDays(today, 7);
    const monthAgo = subDays(today, 30);

    const todayBookings = bookings?.filter(b =>
      new Date(b.created_at) >= todayStart
    ).length || 0;

    const weekBookings = bookings?.filter(b =>
      new Date(b.created_at) >= weekAgo
    ).length || 0;

    const lastWeekBookings = bookings?.filter(b => {
      const date = new Date(b.created_at);
      return date >= subDays(weekAgo, 7) && date < weekAgo;
    }).length || 0;

    const weekGrowth = lastWeekBookings > 0
      ? ((weekBookings - lastWeekBookings) / lastWeekBookings) * 100
      : 0;

    return {
      total: bookings?.length || 0,
      active: bookings?.filter(b => ['CONFIRMED', 'DISPATCHED', 'IN_TRANSIT'].includes(b.status)).length || 0,
      completed: bookings?.filter(b => b.status === 'DELIVERED').length || 0,
      pending: bookings?.filter(b => b.status === 'DRAFT' || b.status === 'QUOTED').length || 0,
      cancelled: bookings?.filter(b => b.status === 'CANCELLED').length || 0,
      todayCount: todayBookings,
      weekGrowth: weekGrowth,
      monthGrowth: 15.3 // Mock data
    };
  };

  const fetchVehicleStats = async () => {
    const { data: ownedVehicles } = await supabase
      .from('owned_vehicles')
      .select('*');

    const { data: hiredVehicles } = await supabase
      .from('hired_vehicles')
      .select('*');

    const allVehicles = [...(ownedVehicles || []), ...(hiredVehicles || [])];
    const available = allVehicles.filter(v => v.status === 'AVAILABLE').length;
    const occupied = allVehicles.filter(v => v.status === 'OCCUPIED').length;
    const total = allVehicles.length;

    return {
      total: total,
      owned: ownedVehicles?.length || 0,
      hired: hiredVehicles?.length || 0,
      available: available,
      occupied: occupied,
      maintenance: allVehicles.filter(v => v.status === 'MAINTENANCE').length,
      verified: allVehicles.filter(v => v.is_verified).length,
      utilization: total > 0 ? (occupied / total) * 100 : 0
    };
  };

  const fetchWarehouseStats = async () => {
    const { data: warehouses } = await supabase
      .from('warehouses')
      .select('*');

    const totalCapacity = warehouses?.reduce((sum, w) => sum + (w.capacity || 0), 0) || 0;
    const currentStock = warehouses?.reduce((sum, w) => sum + (w.current_stock || 0), 0) || 0;
    const nearCapacity = warehouses?.filter(w => {
      const util = (w.current_stock / w.capacity) * 100;
      return util > 85;
    }).length || 0;

    return {
      total: warehouses?.length || 0,
      totalCapacity,
      currentStock,
      utilization: totalCapacity > 0 ? (currentStock / totalCapacity) * 100 : 0,
      nearCapacity
    };
  };

  const fetchCustomerStats = async () => {
    const { data: parties } = await supabase
      .from('parties')
      .select('*');

    const monthAgo = subDays(new Date(), 30);
    const newThisMonth = parties?.filter(p =>
      new Date(p.created_at) >= monthAgo
    ).length || 0;

    return {
      total: parties?.length || 0,
      consignors: parties?.filter(p => p.party_type === 'CONSIGNOR' || p.party_type === 'BOTH').length || 0,
      consignees: parties?.filter(p => p.party_type === 'CONSIGNEE' || p.party_type === 'BOTH').length || 0,
      active: parties?.filter(p => p.status === 'ACTIVE').length || 0,
      newThisMonth
    };
  };

  const fetchRecentActivities = async (): Promise<RecentActivity[]> => {
    // Mock recent activities - in production, fetch from actual activity log
    return [
      {
        id: '1',
        type: 'booking',
        title: 'New Booking Created',
        description: 'Booking #BK2024001 from Mumbai to Delhi',
        timestamp: '2 hours ago',
        status: 'CONFIRMED'
      },
      {
        id: '2',
        type: 'vehicle',
        title: 'Vehicle Assigned',
        description: 'MH12AB1234 assigned to booking #BK2024001',
        timestamp: '3 hours ago'
      },
      {
        id: '3',
        type: 'warehouse',
        title: 'Stock Updated',
        description: 'Mumbai Warehouse stock increased by 150 units',
        timestamp: '5 hours ago'
      },
      {
        id: '4',
        type: 'payment',
        title: 'Payment Received',
        description: '₹45,000 received for booking #BK2023998',
        timestamp: '1 day ago'
      }
    ];
  };

  const calculateRevenue = (bookingStats: any) => {
    // Mock revenue calculation
    return {
      today: 125000,
      week: 875000,
      month: 3450000,
      pending: 560000,
      monthGrowth: 18.5
    };
  };

  const generateChartData = (stats: DashboardStats) => {
    // Booking trends data
    const bookingTrends = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(new Date(), 6 - i);
      return {
        date: format(date, 'MMM dd'),
        bookings: Math.floor(Math.random() * 50) + 20,
        delivered: Math.floor(Math.random() * 30) + 10,
        cancelled: Math.floor(Math.random() * 5)
      };
    });

    // Vehicle status distribution
    const vehicleStatus = [
      { name: 'Available', value: stats.vehicles.available, color: COLORS.success },
      { name: 'Occupied', value: stats.vehicles.occupied, color: COLORS.warning },
      { name: 'Maintenance', value: stats.vehicles.maintenance, color: COLORS.danger },
    ];

    // Warehouse capacity data
    const warehouseCapacity = [
      { name: 'Used', value: stats.warehouses.currentStock, fill: COLORS.primary },
      { name: 'Available', value: stats.warehouses.totalCapacity - stats.warehouses.currentStock, fill: COLORS.muted }
    ];

    // Revenue data
    const revenueData = Array.from({ length: 12 }, (_, i) => ({
      month: format(subDays(new Date(), (11 - i) * 30), 'MMM'),
      revenue: Math.floor(Math.random() * 500000) + 200000,
      target: 400000
    }));

    // Route analysis
    const routeAnalysis = [
      { route: 'Mumbai-Delhi', bookings: 145, revenue: 580000 },
      { route: 'Delhi-Bangalore', bookings: 98, revenue: 420000 },
      { route: 'Chennai-Kolkata', bookings: 76, revenue: 310000 },
      { route: 'Pune-Hyderabad', bookings: 65, revenue: 280000 },
      { route: 'Ahmedabad-Jaipur', bookings: 54, revenue: 220000 }
    ];

    return {
      bookingTrends,
      vehicleStatus,
      warehouseCapacity,
      revenueData,
      routeAnalysis
    };
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
    toast({
      title: "✅ Dashboard Refreshed",
      description: "All data has been updated",
    });
  };

  const handleSearchResultClick = (result: any) => {
    navigate(`/bookings/${result.id}`);
    setSearchTerm("");
    setSearchResults([]);
  };

  const MetricCard = ({
    title,
    value,
    icon: Icon,
    trend,
    trendValue,
    color = "primary",
    onClick
  }: any) => {
    const isPositive = trend === 'up';
    const TrendIcon = isPositive ? ArrowUp : ArrowDown;

    return (
      <Card
        className={cn(
          "border-border shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] cursor-pointer bg-gradient-to-br from-background to-muted/30",
          onClick && "cursor-pointer"
        )}
        onClick={onClick}
      >
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {value}
              </p>
              {trendValue && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  isPositive ? "text-green-600" : "text-red-600"
                )}>
                  <TrendIcon className="w-3 h-3" />
                  <span>{trendValue}%</span>
                  <span className="text-muted-foreground">vs last period</span>
                </div>
              )}
            </div>
            <div className={cn(
              "p-3 rounded-xl",
              `bg-${color}-500/10`
            )}>
              <Icon className={cn("w-6 h-6", `text-${color}-600`)} />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[600px] space-y-4">
        <div className="relative">
          <Loader2 className="w-16 h-16 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Loading dashboard analytics...
        </p>
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
              Dashboard Overview
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Welcome back! Here's your freight management overview
            </p>
          </div>
          <div className="flex gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search booking or LR number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 h-10 border-primary/20 bg-background/50 backdrop-blur-sm"
              />
              {isSearching && (
                <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 animate-spin" />
              )}

              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-[250px] overflow-auto">
                  {searchResults.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 hover:bg-muted cursor-pointer border-b last:border-b-0"
                      onClick={() => handleSearchResultClick(result)}
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-primary" />
                        <div>
                          <p className="font-medium text-sm">{result.booking_id}</p>
                          <p className="text-xs text-muted-foreground">
                            {result.from_location} → {result.to_location}
                          </p>
                        </div>
                        <Badge className="ml-auto">{result.status}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-32 h-10 border-primary/20 bg-background/50 backdrop-blur-sm">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="border-primary/20 hover:bg-primary/10"
                  >
                    <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Refresh Dashboard</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              onClick={() => setIsBookingFormOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Booking
            </Button>
          </div>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Bookings"
          value={stats.bookings.total.toLocaleString()}
          icon={FileText}
          trend="up"
          trendValue={stats.bookings.weekGrowth.toFixed(1)}
          color="primary"
          onClick={() => navigate('/bookings')}
        />
        <MetricCard
          title="Active Shipments"
          value={stats.bookings.active}
          icon={Truck}
          trend="up"
          trendValue="8.2"
          color="info"
          onClick={() => navigate('/bookings')}
        />
        <MetricCard
          title="Fleet Utilization"
          value={`${stats.vehicles.utilization.toFixed(0)}%`}
          icon={Activity}
          trend={stats.vehicles.utilization > 70 ? "up" : "down"}
          trendValue={stats.vehicles.utilization > 70 ? "5.4" : "-3.2"}
          color="warning"
          onClick={() => navigate('/vehicles')}
        />
        <MetricCard
          title="Revenue (Month)"
          value={`₹${(stats.revenue.month / 100000).toFixed(1)}L`}
          icon={DollarSign}
          trend="up"
          trendValue={stats.revenue.monthGrowth.toFixed(1)}
          color="success"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Booking Trends Chart */}
        <Card className="lg:col-span-2 border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Booking Trends
              </CardTitle>
              <Badge variant="secondary">Last 7 Days</Badge>
            </div>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.bookingTrends}>
                <defs>
                  <linearGradient id="bookingGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="deliveredGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.success} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={COLORS.success} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="bookings"
                  stroke={COLORS.primary}
                  fill="url(#bookingGradient)"
                  strokeWidth={2}
                  name="Total Bookings"
                />
                <Area
                  type="monotone"
                  dataKey="delivered"
                  stroke={COLORS.success}
                  fill="url(#deliveredGradient)"
                  strokeWidth={2}
                  name="Delivered"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Vehicle Status Distribution */}
        <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-primary" />
              Fleet Status
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={300}>
              <RePieChart>
                <Pie
                  data={chartData.vehicleStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.vehicleStatus.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--background))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: '8px',
                    color: 'hsl(var(--foreground))'
                  }}
                  formatter={(value: any, name: any) => [`${value} vehicles`, name]}
                />
              </RePieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 mt-4">
              {chartData.vehicleStatus.map((status: any, index: number) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: status.color }} />
                    <span className="text-sm">{status.name}</span>
                  </div>
                  <span className="text-sm font-medium">{status.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Warehouse Utilization */}
        <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Warehouse className="w-4 h-4 text-primary" />
                Warehouse Capacity
              </div>
              <Badge
                variant={stats.warehouses.utilization > 85 ? "destructive" : "default"}
                className="text-xs"
              >
                {stats.warehouses.utilization.toFixed(0)}% Used
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Overall Utilization</span>
                  <span className="font-medium">
                    {stats.warehouses.currentStock.toLocaleString()} / {stats.warehouses.totalCapacity.toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={stats.warehouses.utilization}
                  className="h-3"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.warehouses.total}</p>
                  <p className="text-xs text-muted-foreground">Total Warehouses</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-orange-600">{stats.warehouses.nearCapacity}</p>
                  <p className="text-xs text-muted-foreground">Near Capacity</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Customer Overview */}
        <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                Customer Overview
              </div>
              <Badge variant="secondary" className="text-xs">
                +{stats.customers.newThisMonth} New
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-2xl font-bold">{stats.customers.total}</p>
                  <p className="text-xs text-muted-foreground">Total Parties</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-green-600">{stats.customers.active}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consignors</span>
                  <span className="text-sm font-medium">{stats.customers.consignors}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Consignees</span>
                  <span className="text-sm font-medium">{stats.customers.consignees}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
          <CardHeader className="border-b pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              Today's Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Completed</span>
                </div>
                <span className="text-sm font-bold">{stats.bookings.completed}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  <span className="text-sm">Pending</span>
                </div>
                <span className="text-sm font-bold">{stats.bookings.pending}</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">Revenue</span>
                </div>
                <span className="text-sm font-bold">₹{(stats.revenue.today / 1000).toFixed(0)}K</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Analysis & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Routes */}
        <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-5 h-5 text-primary" />
                Top Routes
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/bookings')}>
                View All
                <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {chartData.routeAnalysis.map((route: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold",
                      index === 0 ? "bg-primary/20 text-primary" :
                        index === 1 ? "bg-blue-100 text-blue-700" :
                          index === 2 ? "bg-green-100 text-green-700" :
                            "bg-muted text-muted-foreground"
                    )}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{route.route}</p>
                      <p className="text-xs text-muted-foreground">{route.bookings} bookings</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sm">₹{(route.revenue / 1000).toFixed(0)}K</p>
                    <Badge variant="secondary" className="text-xs">
                      {((route.bookings / stats.bookings.total) * 100).toFixed(0)}%
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activities */}
        <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
          <CardHeader className="border-b">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Recent Activities
              </div>
              <Badge variant="outline" className="text-xs">
                Live
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-3">
              {recentActivities.map((activity) => {
                const icons = {
                  booking: FileText,
                  vehicle: Truck,
                  warehouse: Warehouse,
                  payment: DollarSign
                };
                const Icon = icons[activity.type];

                return (
                  <div key={activity.id} className="flex gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
                      activity.type === 'booking' ? "bg-primary/10 text-primary" :
                        activity.type === 'vehicle' ? "bg-blue-100 text-blue-600" :
                          activity.type === 'warehouse' ? "bg-green-100 text-green-600" :
                            "bg-orange-100 text-orange-600"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{activity.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">{activity.timestamp}</p>
                    </div>
                    {activity.status && (
                      <Badge variant="secondary" className="text-xs">
                        {activity.status}
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 hover:bg-primary/10 hover:border-primary transition-all hover:text-foreground"
              onClick={() => setIsBookingFormOpen(true)}
            >
              <div className="p-2 bg-primary/10 rounded-lg">
                <Plus className="w-5 h-5 text-primary" />
              </div>
              <span className="text-sm font-medium">Create Booking</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 hover:bg-blue-500/10 hover:border-blue-500 transition-all hover:text-foreground"
              onClick={() => navigate('/vehicles?openModal=owned')}
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Truck className="w-5 h-5 text-blue-600" />
              </div>
              <span className="text-sm font-medium">Add Vehicle</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 hover:bg-green-500/10 hover:border-green-500 transition-all hover:text-foreground"
              onClick={() => navigate('/customers')}
            >
              <div className="p-2 bg-green-100 rounded-lg">
                <UserCheck className="w-5 h-5 text-green-600" />
              </div>
              <span className="text-sm font-medium">Add Customer</span>
            </Button>

            <Button
              variant="outline"
              className="h-auto flex-col gap-2 p-4 hover:bg-orange-500/10 hover:border-orange-500 transition-all hover:text-foreground"
              onClick={() => navigate('/warehouses')}
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <span className="text-sm font-medium">View Warehouses</span>
            </Button>
          </div>
        </CardContent>
      </Card>
      {/* Booking Form Modal */}
      <BookingFormModal
        isOpen={isBookingFormOpen}
        onClose={() => setIsBookingFormOpen(false)}
        onSave={(bookingData) => {
          toast({
            title: "✅ Booking Created",
            description: `Booking ${bookingData.bookingId} has been created successfully`,
          });
          navigate('/bookings');
        }}
      />
    </div>
  );
};