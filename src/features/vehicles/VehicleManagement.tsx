import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  Filter,
  Truck,
  Eye,
  CheckCircle,
  AlertCircle,
  User,
  Loader2,
  Building2,
  Shield,
  ShieldCheck,
  Activity,
  Wrench,
  Clock,
  Package,
  FileDown,
  Users,
  TrendingUp,
  MoreVertical,
  Edit,
  Trash2,
  XCircle
} from "lucide-react";
import {
  fetchOwnedVehicles,
  fetchHiredVehicles,
  createOwnedVehicle,
  createHiredVehicle,
  verifyOwnedVehicle,
  verifyHiredVehicle,
  createBroker
} from "@/api/vehicles";
import { AddVehicleModal } from "./AddVehicleModal";
import { AddHiredVehicleModal } from "./AddHiredVehicleModal";
import { VehicleDetailDrawer } from "./VehicleDetailDrawer";
import { useToast } from "@/hooks/use-toast";
import { AddBrokerModal } from "./AddBrokerModal";

// Add custom styles for column hover
const tableStyles = `
  <style>
    .vehicle-mgmt-table td {
      position: relative;
    }
    .vehicle-mgmt-table td::before {
      content: '';
      position: absolute;
      left: 0;
      right: 0;
      top: -1px;
      bottom: -1px;
      background: transparent;
      pointer-events: none;
      transition: background-color 0.2s ease;
      z-index: 0;
    }
    .vehicle-mgmt-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table tr:hover td:nth-child(7)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table tr:hover td:nth-child(8)::before { background: hsl(var(--primary) / 0.03); }
    .vehicle-mgmt-table td > * {
      position: relative;
      z-index: 1;
    }
  </style>
`;

interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: string;
  status: string;
  is_owned: boolean;
  is_verified: boolean;
  added_date?: string;
  created_at?: string;
  broker?: {
    id: string;
    name: string;
    contact_person: string;
    phone: string;
    email?: string;
  };
  vehicle_assignments?: Array<{
    id: string;
    booking_id?: string;
    booking?: {
      booking_id: string;
    };
  }>;
  vehicle_documents?: Array<{
    id: string;
    document_type: string;
    file_name: string;
    is_verified: boolean;
    uploaded_date: string;
    expiry_date?: string;
  }>;
  lastLocation?: {
    latitude: number;
    longitude: number;
    recorded_at: string;
    source: string;
  };
}

// Status configuration with colors and icons
const statusConfig = {
  AVAILABLE: {
    label: "Available",
    color: "bg-green-100 text-green-700 border-green-200",
    icon: CheckCircle,
    gradient: "from-green-500 to-green-600"
  },
  OCCUPIED: {
    label: "Occupied",
    color: "bg-orange-100 text-orange-700 border-orange-200",
    icon: AlertCircle,
    gradient: "from-orange-500 to-orange-600"
  },
  MAINTENANCE: {
    label: "Maintenance",
    color: "bg-red-100 text-red-700 border-red-200",
    icon: Wrench,
    gradient: "from-red-500 to-red-600"
  },
  INACTIVE: {
    label: "Inactive",
    color: "bg-gray-100 text-gray-700 border-gray-200",
    icon: XCircle,
    gradient: "from-gray-500 to-gray-600"
  }
};

export const VehicleManagement = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("owned");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddHiredVehicleOpen, setIsAddHiredVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);
  const [isAddBrokerOpen, setIsAddBrokerOpen] = useState(false);

  // Add column hover styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .vehicle-mgmt-table td {
        position: relative;
      }
      .vehicle-mgmt-table td::before {
        content: '';
        position: absolute;
        left: 0;
        right: 0;
        top: -1px;
        bottom: -1px;
        background: transparent;
        pointer-events: none;
        transition: background-color 0.2s ease;
        z-index: 0;
      }
      .vehicle-mgmt-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(7)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table tr:hover td:nth-child(8)::before { background: hsl(var(--primary) / 0.03); }
      .vehicle-mgmt-table td > * {
        position: relative;
        z-index: 1;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const [ownedData, hiredData] = await Promise.all([
        fetchOwnedVehicles(),
        fetchHiredVehicles()
      ]);

      // Combine both types with is_owned flag
      const combinedVehicles = [
        ...ownedData.map(v => ({
          ...v,
          is_owned: true,
          is_verified: v.is_verified || false,
          added_date: v.created_at
        })),
        ...hiredData.map(v => ({
          ...v,
          is_owned: false,
          is_verified: v.is_verified || false,
          added_date: v.created_at
        }))
      ];

      setVehicles(combinedVehicles);
    } catch (error) {
      console.error('Error loading vehicles:', error);
      toast({
        title: "❌ Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const allOwnedVehicles = vehicles.filter(v => v.is_owned);
  const allHiredVehicles = vehicles.filter(v => !v.is_owned);

  const handleAddBroker = async (brokerData: any) => {
    try {
      const newBroker = await createBroker({
        name: brokerData.name,
        contact_person: brokerData.contactPerson,
        phone: brokerData.phone,
        email: brokerData.email
      });

      toast({
        title: "✅ Broker Added",
        description: `${brokerData.name} has been added as a broker`,
      });

      await loadVehicles();
      setIsAddBrokerOpen(false);
      setIsAddHiredVehicleOpen(true);
    } catch (error) {
      console.error('Error adding broker:', error);
      toast({
        title: "❌ Error",
        description: "Failed to add broker",
        variant: "destructive",
      });
    }
  };

  const handleAddVehicle = async (vehicleData: any) => {
    try {
      await createOwnedVehicle({
        vehicle_number: vehicleData.vehicle_number,
        vehicle_type: vehicleData.vehicle_type,
        capacity: vehicleData.capacity,
        registration_date: vehicleData.registration_date,
        insurance_expiry: vehicleData.insurance_expiry,
        fitness_expiry: vehicleData.fitness_expiry,
        permit_expiry: vehicleData.permit_expiry,
      });

      await loadVehicles();

      toast({
        title: "✅ Vehicle Added",
        description: `Vehicle ${vehicleData.vehicle_number} has been added to your fleet`,
      });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        title: "❌ Error",
        description: "Failed to add vehicle",
        variant: "destructive",
      });
    }
  };

  const handleAddHiredVehicle = async (vehicleData: any) => {
    try {
      await createHiredVehicle({
        vehicle_number: vehicleData.vehicleNumber,
        vehicle_type: vehicleData.vehicleType,
        capacity: vehicleData.capacity,
        broker_id: vehicleData.brokerId,
        rate_per_trip: vehicleData.ratePerTrip ? parseFloat(vehicleData.ratePerTrip) : undefined
      });

      await loadVehicles();

      toast({
        title: "✅ Hired Vehicle Added",
        description: `Vehicle ${vehicleData.vehicleNumber} has been added`,
      });
    } catch (error) {
      console.error('Error adding hired vehicle:', error);
      toast({
        title: "❌ Error",
        description: "Failed to add hired vehicle",
        variant: "destructive",
      });
    }
  };

  const handleVerifyVehicle = async (vehicleId: string, isOwned: boolean) => {
    try {
      if (isOwned) {
        await verifyOwnedVehicle(vehicleId, true);
      } else {
        await verifyHiredVehicle(vehicleId, true);
      }

      await loadVehicles();

      toast({
        title: "✅ Vehicle Verified",
        description: "Vehicle has been marked as verified",
      });
    } catch (error) {
      console.error('Error verifying vehicle:', error);
      toast({
        title: "❌ Error",
        description: "Failed to verify vehicle",
        variant: "destructive",
      });
    }
  };

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicle_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vehicle.vehicle_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (vehicle.broker?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || vehicle.status === statusFilter;
    const matchesTab = activeTab === "owned" ? vehicle.is_owned : !vehicle.is_owned;
    return matchesSearch && matchesStatus && matchesTab;
  });

  const openVehicleDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailDrawerOpen(true);
  };

  const ownedVehicles = filteredVehicles.filter(v => v.is_owned);
  const hiredVehicles = filteredVehicles.filter(v => !v.is_owned);

  // Statistics
  const stats = {
    total: vehicles.length,
    owned: allOwnedVehicles.length,
    hired: allHiredVehicles.length,
    available: vehicles.filter(v => v.status === 'AVAILABLE').length,
    occupied: vehicles.filter(v => v.status === 'OCCUPIED').length,
    maintenance: vehicles.filter(v => v.status === 'MAINTENANCE').length,
    verified: vehicles.filter(v => v.is_verified).length,
    unverified: vehicles.filter(v => !v.is_verified).length,
  };

  // Export function
  const handleExport = () => {
    const headers = activeTab === 'owned'
      ? ["Vehicle Number", "Type", "Capacity", "Status", "Verified", "Assigned Booking"]
      : ["Vehicle Number", "Type", "Capacity", "Status", "Broker", "Contact", "Verified", "Assigned Booking"];

    const rows = filteredVehicles.map(vehicle => {
      if (activeTab === 'owned') {
        return [
          vehicle.vehicle_number,
          vehicle.vehicle_type,
          vehicle.capacity,
          vehicle.status,
          vehicle.is_verified ? "Yes" : "No",
          vehicle.vehicle_assignments?.[0]?.booking?.booking_id || "-"
        ];
      } else {
        return [
          vehicle.vehicle_number,
          vehicle.vehicle_type,
          vehicle.capacity,
          vehicle.status,
          vehicle.broker?.name || "-",
          vehicle.broker?.contact_person || "-",
          vehicle.is_verified ? "Yes" : "No",
          vehicle.vehicle_assignments?.[0]?.booking?.booking_id || "-"
        ];
      }
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map(cell => {
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${activeTab}_vehicles_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);

    toast({
      title: "✅ Exported Successfully",
      description: `${filteredVehicles.length} vehicles exported to CSV`,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground animate-pulse">
          Loading vehicles...
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
              Vehicle Management
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage your owned and hired vehicle fleet
            </p>
          </div>
          <div className="flex gap-3">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleExport}
                    className="border-primary/20 hover:bg-primary/10 transition-all duration-200"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Export
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Export vehicles to CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <Button
              variant="outline"
              onClick={() => setIsAddHiredVehicleOpen(true)}
              className="border-primary/20 hover:bg-primary/10 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Hired Vehicle
            </Button>

            <Button
              onClick={() => setIsAddVehicleOpen(true)}
              className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Vehicle
            </Button>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-primary/10 rounded-lg mb-2">
                <Truck className="w-5 h-5 text-primary" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                {stats.total}
              </p>
              <p className="text-xs text-muted-foreground">Total</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-blue-500/10 rounded-lg mb-2">
                <Shield className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                {stats.owned}
              </p>
              <p className="text-xs text-muted-foreground">Owned</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-purple-500/10 rounded-lg mb-2">
                <Building2 className="w-5 h-5 text-purple-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                {stats.hired}
              </p>
              <p className="text-xs text-muted-foreground">Hired</p>
            </div>
          </CardContent>
        </Card>

        {/* <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-green-500/10 rounded-lg mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                {stats.available}
              </p>
              <p className="text-xs text-muted-foreground">Available</p>
            </div>
          </CardContent>
        </Card> */}

        {/* <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-orange-500/10 rounded-lg mb-2">
                <AlertCircle className="w-5 h-5 text-orange-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                {stats.occupied}
              </p>
              <p className="text-xs text-muted-foreground">Occupied</p>
            </div>
          </CardContent>
        </Card> */}

        {/* <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-red-500/10 rounded-lg mb-2">
                <Wrench className="w-5 h-5 text-red-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                {stats.maintenance}
              </p>
              <p className="text-xs text-muted-foreground">Maintenance</p>
            </div>
          </CardContent>
        </Card> */}

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-emerald-500/10 rounded-lg mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-500 bg-clip-text text-transparent">
                {stats.verified}
              </p>
              <p className="text-xs text-muted-foreground">Verified</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-4">
            <div className="flex flex-col items-center">
              <div className="p-2 bg-yellow-500/10 rounded-lg mb-2">
                <Clock className="w-5 h-5 text-yellow-600" />
              </div>
              <p className="text-2xl font-bold bg-gradient-to-r from-yellow-600 to-yellow-500 bg-clip-text text-transparent">
                {stats.unverified}
              </p>
              <p className="text-xs text-muted-foreground">Unverified</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/10">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search vehicles, broker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-11 h-11 border-muted-foreground/20 focus:border-primary transition-all duration-200 bg-background/50 backdrop-blur-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48 h-11 border-muted-foreground/20 bg-background/50 backdrop-blur-sm">
                <Filter className="w-4 h-4 mr-2 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="AVAILABLE">Available</SelectItem>
                <SelectItem value="OCCUPIED">Occupied</SelectItem>
                <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                <SelectItem value="INACTIVE">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Vehicle Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 bg-muted/50">
          <TabsTrigger
            value="owned"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Shield className="w-4 h-4" />
            Owned Fleet ({allOwnedVehicles.length})
          </TabsTrigger>
          <TabsTrigger
            value="hired"
            className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            <Building2 className="w-4 h-4" />
            Hired Fleet ({allHiredVehicles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owned">
          <Card className="border-border shadow-xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                Owned Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="vehicle-mgmt-table">
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/30 bg-muted/10">
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          Vehicle No.
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Capacity</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Verification</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          Assigned Booking
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownedVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted/30 rounded-full">
                              <Truck className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                            <div className="text-muted-foreground">
                              <p className="text-lg font-medium">No owned vehicles found</p>
                              <p className="text-sm mt-1">Add your first vehicle to get started</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      ownedVehicles.map((vehicle) => {
                        const status = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.AVAILABLE;
                        const StatusIcon = status.icon;

                        return (
                          <TableRow key={vehicle.id} className="border-border hover:bg-muted/20 transition-all duration-200 group">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                                  <Truck className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <span className="font-semibold">{vehicle.vehicle_number}</span>
                              </div>
                            </TableCell>
                            <TableCell>{vehicle.vehicle_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {vehicle.capacity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("gap-1", status.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {vehicle.is_verified ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Unverified
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {vehicle.vehicle_assignments && vehicle.vehicle_assignments.length > 0 ? (
                                <Badge variant="secondary" className="font-medium">
                                  {vehicle.vehicle_assignments[0].booking?.booking_id}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">No Assignment</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openVehicleDetail(vehicle)}
                                        className="h-8 w-8 hover:bg-primary/10"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {!vehicle.is_verified && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVerifyVehicle(vehicle.id, vehicle.is_owned)}
                                    className="hover:bg-primary/10 hover:border-primary transition-all"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hired">
          <Card className="border-border shadow-xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Building2 className="w-5 h-5 text-primary" />
                </div>
                Hired Vehicles
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="vehicle-mgmt-table">
                  <TableHeader>
                    <TableRow className="border-border hover:bg-muted/30 bg-muted/10">
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          Vehicle No.
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold">Capacity</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-muted-foreground" />
                          Broker
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold">Verification</TableHead>
                      <TableHead className="font-semibold">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-muted-foreground" />
                          Assigned Booking
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hiredVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted/30 rounded-full">
                              <Building2 className="w-12 h-12 text-muted-foreground/50" />
                            </div>
                            <div className="text-muted-foreground">
                              <p className="text-lg font-medium">No hired vehicles found</p>
                              <p className="text-sm mt-1">Add your first hired vehicle to get started</p>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      hiredVehicles.map((vehicle) => {
                        const status = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.AVAILABLE;
                        const StatusIcon = status.icon;

                        return (
                          <TableRow key={vehicle.id} className="border-border hover:bg-muted/20 transition-all duration-200 group">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                                  <Truck className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <span className="font-semibold">{vehicle.vehicle_number}</span>
                              </div>
                            </TableCell>
                            <TableCell>{vehicle.vehicle_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="font-medium">
                                {vehicle.capacity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("gap-1", status.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {vehicle.broker && (
                                <div className="space-y-1">
                                  <div className="font-medium text-sm flex items-center gap-1">
                                    <Building2 className="w-3 h-3 text-muted-foreground" />
                                    {vehicle.broker.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {vehicle.broker.contact_person}
                                  </div>
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {vehicle.is_verified ? (
                                  <Badge className="bg-green-100 text-green-700 border-green-200 gap-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    Verified
                                  </Badge>
                                ) : (
                                  <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Unverified
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {vehicle.vehicle_assignments && vehicle.vehicle_assignments.length > 0 ? (
                                <Badge variant="secondary" className="font-medium">
                                  {vehicle.vehicle_assignments[0].booking?.booking_id}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground">No Assignment</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center justify-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => openVehicleDetail(vehicle)}
                                        className="h-8 w-8 hover:bg-primary/10"
                                      >
                                        <Eye className="w-4 h-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>View Details</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                {!vehicle.is_verified && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVerifyVehicle(vehicle.id, false)}
                                    className="hover:bg-primary/10 hover:border-primary transition-all"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                                    Verify
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AddVehicleModal
        isOpen={isAddVehicleOpen}
        onClose={() => setIsAddVehicleOpen(false)}
        onSave={handleAddVehicle}
      />

      <AddHiredVehicleModal
        isOpen={isAddHiredVehicleOpen}
        onClose={() => setIsAddHiredVehicleOpen(false)}
        onSave={handleAddHiredVehicle}
        onAddBrokerClick={() => {
          setIsAddHiredVehicleOpen(false);
          setIsAddBrokerOpen(true);
        }}
      />

      <VehicleDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        vehicle={selectedVehicle}
      />

      <AddBrokerModal
        isOpen={isAddBrokerOpen}
        onClose={() => setIsAddBrokerOpen(false)}
        onSave={handleAddBroker}
      />
    </div>
  );
};