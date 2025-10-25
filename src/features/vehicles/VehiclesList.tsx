import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  Search,
  Plus,
  Truck,
  User,
  Phone,
  MapPin,
  Shield,
  ShieldCheck,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Calendar,
  Building2,
  Activity,
  Wrench,
  Clock,
  Navigation,
  DollarSign,
  FileDown,
  MoreVertical,
  Edit,
  Eye
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
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
import { AddBrokerModal } from "./AddBrokerModal";
import { useToast } from "@/hooks/use-toast";

// Add custom styles for column hover
const tableStyles = `
  <style>
    .vehicles-table td {
      position: relative;
    }
    .vehicles-table td::before {
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
    .vehicles-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
    .vehicles-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
    .vehicles-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
    .vehicles-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
    .vehicles-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
    .vehicles-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
    .vehicles-table tr:hover td:nth-child(7)::before { background: hsl(var(--primary) / 0.03); }
    .vehicles-table td > * {
      position: relative;
      z-index: 1;
    }
  </style>
`;

interface OwnedVehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: string;
  status: string;
  is_verified: boolean;
  registration_date?: string;
  insurance_expiry?: string;
  fitness_expiry?: string;
  permit_expiry?: string;
  created_at: string;
  vehicle_assignments?: Array<{
    status: string;
    driver?: {
      id: string;
      name: string;
      phone: string;
      experience?: string;
    };
    booking?: {
      booking_id: string;
      from_location: string;
      to_location: string;
    };
  }>;
}

interface HiredVehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  capacity: string;
  status: string;
  broker_id: string;
  hire_date?: string;
  rate_per_trip?: number;
  created_at: string;
  is_verified?: boolean;
  broker?: {
    name: string;
    contact_person: string;
    phone: string;
  };
  vehicle_assignments?: Array<{
    status: string;
    driver?: {
      id: string;
      name: string;
      phone: string;
      experience?: string;
    };
    booking?: {
      booking_id: string;
      from_location: string;
      to_location: string;
    };
  }>;
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
  },
  RELEASED: {
    label: "Released",
    color: "bg-blue-100 text-blue-700 border-blue-200",
    icon: Clock,
    gradient: "from-blue-500 to-blue-600"
  }
};

export const VehiclesList = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddHiredModalOpen, setIsAddHiredModalOpen] = useState(false);
  const [isAddBrokerModalOpen, setIsAddBrokerModalOpen] = useState(false);
  const [addModalType, setAddModalType] = useState<'owned' | 'hired'>('owned');
  const [ownedVehicles, setOwnedVehicles] = useState<OwnedVehicle[]>([]);
  const [hiredVehicles, setHiredVehicles] = useState<HiredVehicle[]>([]);
  const [activeTab, setActiveTab] = useState<'owned' | 'hired'>('owned');

  // Add column hover styles
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = `
      .vehicles-table td {
        position: relative;
      }
      .vehicles-table td::before {
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
      .vehicles-table tr:hover td:nth-child(1)::before { background: hsl(var(--primary) / 0.03); }
      .vehicles-table tr:hover td:nth-child(2)::before { background: hsl(var(--primary) / 0.03); }
      .vehicles-table tr:hover td:nth-child(3)::before { background: hsl(var(--primary) / 0.03); }
      .vehicles-table tr:hover td:nth-child(4)::before { background: hsl(var(--primary) / 0.03); }
      .vehicles-table tr:hover td:nth-child(5)::before { background: hsl(var(--primary) / 0.03); }
      .vehicles-table tr:hover td:nth-child(6)::before { background: hsl(var(--primary) / 0.03); }
      .vehicles-table tr:hover td:nth-child(7)::before { background: hsl(var(--primary) / 0.03); }
      .vehicles-table td > * {
        position: relative;
        z-index: 1;
      }
    `;
    document.head.appendChild(styleElement);

    return () => {
      document.head.removeChild(styleElement);
    };
  }, []);

  // Handle modal opening from navigation
  useEffect(() => {
    const modalType = searchParams.get('openModal');

    if (modalType) {
      console.log('Opening modal from URL param:', modalType);

      if (modalType === 'broker') {
        setIsAddBrokerModalOpen(true);
      } else if (modalType === 'hired') {
        setIsAddHiredModalOpen(true);
      } else if (modalType === 'owned') {
        setAddModalType('owned');
        setIsAddModalOpen(true);
      }

      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, '', newUrl);
      }, 100);
    }
  }, [searchParams]);

  // Separate effect for location state
  useEffect(() => {
    if (location.state?.openModal) {
      console.log('Opening modal from location state:', location.state.openModal);

      if (location.state.openModal === 'broker') {
        setIsAddBrokerModalOpen(true);
      } else if (location.state.openModal === 'owned') {
        setAddModalType('owned');
        setIsAddModalOpen(true);
      } else if (location.state.openModal === 'hired') {
        setIsAddHiredModalOpen(true);
      }

      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const [owned, hired] = await Promise.all([
        fetchOwnedVehicles(),
        fetchHiredVehicles()
      ]);
      setOwnedVehicles(owned);
      setHiredVehicles(hired);
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

  // Handler for owned vehicles
  const handleAddOwnedVehicle = async (vehicleData: any, documents?: any) => {
    try {
      console.log("📥 Received vehicle data:", vehicleData);
      console.log("📄 Received documents:", documents);

      // 1. Create vehicle first
      const newVehicle = await createOwnedVehicle({
        vehicle_number: vehicleData.vehicle_number,
        vehicle_type: vehicleData.vehicle_type,
        capacity: vehicleData.capacity,
        default_driver_id: vehicleData.default_driver_id,
        registration_date: vehicleData.registration_date,
        insurance_expiry: vehicleData.insurance_expiry,
        fitness_expiry: vehicleData.fitness_expiry,
        permit_expiry: vehicleData.permit_expiry,
      });

      console.log("✅ Vehicle created:", newVehicle);

      // 2. Upload documents if any
      if (documents && documents.files.length > 0) {
        console.log(`📤 Uploading ${documents.files.length} documents...`);

        const { uploadVehicleDocument } = await import('@/api/vehicleDocument');

        let uploadedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < documents.files.length; i++) {
          const file = documents.files[i];
          const metadata = documents.metadata[i];

          try {
            await uploadVehicleDocument({
              vehicle_id: newVehicle.id,
              vehicle_type: 'OWNED',  // ✅ OWNED
              document_type: metadata.document_type,
              file: file,
              expiry_date: metadata.expiry_date
            });
            uploadedCount++;
            console.log(`✅ Uploaded: ${file.name}`);
          } catch (error) {
            failedCount++;
            console.error(`❌ Failed to upload: ${file.name}`, error);
          }
        }

        if (uploadedCount > 0) {
          toast({
            title: "✅ Documents Uploaded",
            description: `${uploadedCount} document(s) uploaded successfully`,
          });
        }

        if (failedCount > 0) {
          toast({
            title: "⚠️ Some Uploads Failed",
            description: `${failedCount} document(s) failed to upload`,
            variant: "destructive"
          });
        }
      }

      await loadVehicles();

      toast({
        title: "✅ Vehicle Added Successfully",
        description: `Owned vehicle ${vehicleData.vehicle_number} has been added to your fleet`,
      });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        title: "❌ Error",
        description: "Failed to add vehicle. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handler for hired vehicles
  const handleAddHiredVehicle = async (vehicleData: any) => {
    try {
      await createHiredVehicle({
        vehicle_number: vehicleData.vehicleNumber,
        vehicle_type: vehicleData.vehicleType,
        capacity: vehicleData.capacity,
        broker_id: vehicleData.brokerId,
        // ✅ ADD THIS LINE:
        default_driver_id: vehicleData.default_driver_id,
        rate_per_trip: vehicleData.ratePerTrip ? parseFloat(vehicleData.ratePerTrip) : undefined,
      });

      await loadVehicles();
      toast({
        title: "✅ Hired Vehicle Added",
        description: `Vehicle ${vehicleData.vehicleNumber} has been added`,
      });
      setIsAddHiredModalOpen(false);
    } catch (error) {
      console.error('Error adding hired vehicle:', error);
      toast({
        title: "❌ Error",
        description: "Failed to add hired vehicle",
        variant: "destructive",
      });
    }
  };

  // Handler for adding broker
  const handleAddBroker = async (brokerData: any) => {
    try {
      await createBroker({
        name: brokerData.name,
        contact_person: brokerData.contactPerson,
        phone: brokerData.phone,
        email: brokerData.email || undefined,
        city: brokerData.city || undefined // ✅ NEW
      });

      toast({
        title: "✅ Broker Added",
        description: `${brokerData.name} has been added as a broker`,
      });

      setIsAddBrokerModalOpen(false);
      setIsAddHiredModalOpen(true);
      await loadVehicles();
    } catch (error) {
      console.error('Error adding broker:', error);
      toast({
        title: "❌ Error",
        description: "Failed to add broker",
        variant: "destructive",
      });
    }
  };

  const handleVerifyVehicle = async (vehicleId: string, isOwned: boolean, currentStatus: boolean) => {
    try {
      if (isOwned) {
        await verifyOwnedVehicle(vehicleId, !currentStatus);
      } else {
        await verifyHiredVehicle(vehicleId, !currentStatus);
      }
      await loadVehicles();
      toast({
        title: currentStatus ? "🔓 Vehicle Unverified" : "✅ Vehicle Verified",
        description: currentStatus
          ? "Vehicle verification has been removed"
          : "Vehicle has been verified successfully",
      });
    } catch (error) {
      console.error('Error verifying vehicle:', error);
      toast({
        title: "❌ Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const getFilteredVehicles = () => {
    const vehicles = activeTab === 'owned' ? ownedVehicles : hiredVehicles;
    return vehicles.filter(vehicle => {
      const assignments = vehicle.vehicle_assignments || [];
      const activeAssignment = assignments.find(a => a.status === 'ACTIVE');
      const driver = activeAssignment?.driver;
      const brokerName = activeTab === 'hired' ? (vehicle as HiredVehicle).broker?.name || '' : '';

      return (
        vehicle.vehicle_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        driver?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.vehicle_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        brokerName.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  };

  const filteredVehicles = getFilteredVehicles();
  const totalVehicles = ownedVehicles.length + hiredVehicles.length;

  // Statistics
  const stats = {
    total: totalVehicles,
    owned: ownedVehicles.length,
    hired: hiredVehicles.length,
    available: [...ownedVehicles, ...hiredVehicles].filter(v => v.status === 'AVAILABLE').length,
    occupied: [...ownedVehicles, ...hiredVehicles].filter(v => v.status === 'OCCUPIED').length,
    maintenance: [...ownedVehicles, ...hiredVehicles].filter(v => v.status === 'MAINTENANCE').length,
  };

  const handleExport = () => {
    const headers = activeTab === 'owned'
      ? ["Vehicle Number", "Type", "Capacity", "Status", "Driver", "Insurance Expiry", "Verified"]
      : ["Vehicle Number", "Type", "Capacity", "Status", "Driver", "Broker", "Rate/Trip", "Verified"];

    const rows = filteredVehicles.map(vehicle => {
      const assignments = vehicle.vehicle_assignments || [];
      const activeAssignment = assignments.find(a => a.status === 'ACTIVE');
      const driver = activeAssignment?.driver;

      if (activeTab === 'owned') {
        const owned = vehicle as OwnedVehicle;
        return [
          vehicle.vehicle_number,
          vehicle.vehicle_type,
          vehicle.capacity,
          vehicle.status,
          driver?.name || "No driver",
          owned.insurance_expiry ? format(new Date(owned.insurance_expiry), 'dd MMM yyyy') : "Not set",
          vehicle.is_verified ? "Yes" : "No"
        ];
      } else {
        const hired = vehicle as HiredVehicle;
        return [
          vehicle.vehicle_number,
          vehicle.vehicle_type,
          vehicle.capacity,
          vehicle.status,
          driver?.name || "No driver",
          hired.broker?.name || "No broker",
          hired.rate_per_trip ? `₹${hired.rate_per_trip}` : "Not set",
          vehicle.is_verified ? "Yes" : "No"
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
              Fleet Management
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Manage your fleet of {totalVehicles} vehicles ({ownedVehicles.length} owned, {hiredVehicles.length} hired)
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

            {activeTab === 'hired' && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsAddBrokerModalOpen(true)}
                  className="border-primary/20 hover:bg-primary/10 transition-all duration-200"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Add Broker
                </Button>
                <Button
                  onClick={() => setIsAddHiredModalOpen(true)}
                  className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Hired Vehicle
                </Button>
              </>
            )}
            {activeTab === 'owned' && (
              <Button
                onClick={() => {
                  setAddModalType('owned');
                  setIsAddModalOpen(true);
                }}
                className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Owned Vehicle
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Fleet</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-primary/10 rounded-xl">
                <Truck className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Owned</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
                  {stats.owned}
                </p>
              </div>
              <div className="p-3 bg-blue-500/10 rounded-xl">
                <Shield className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Hired</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                  {stats.hired}
                </p>
              </div>
              <div className="p-3 bg-purple-500/10 rounded-xl">
                <Building2 className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Available</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                  {stats.available}
                </p>
              </div>
              <div className="p-3 bg-green-500/10 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Occupied</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-orange-600 to-orange-500 bg-clip-text text-transparent">
                  {stats.occupied}
                </p>
              </div>
              <div className="p-3 bg-orange-500/10 rounded-xl">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/20 hover:shadow-lg transition-all duration-300 hover:scale-105 cursor-pointer bg-gradient-to-br from-background to-muted/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Maintenance</p>
                <p className="text-3xl font-bold bg-gradient-to-r from-red-600 to-red-500 bg-clip-text text-transparent">
                  {stats.maintenance}
                </p>
              </div>
              <div className="p-3 bg-red-500/10 rounded-xl">
                <Wrench className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search Section */}
      <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/10">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Vehicles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 group">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder={activeTab === 'owned'
                  ? "Search by vehicle number, driver name, or type..."
                  : "Search by vehicle number, driver name, type, or broker..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-11 border-muted-foreground/20 focus:border-primary transition-all duration-200 bg-background/50 backdrop-blur-sm"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table with Tabs */}
      <Card className="border-border shadow-xl overflow-hidden bg-gradient-to-br from-background via-background to-muted/5">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b">
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'owned' | 'hired')}>
            <TabsList className="grid w-full grid-cols-2 bg-muted/50">
              <TabsTrigger
                value="owned"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Shield className="w-4 h-4 mr-2" />
                Owned Vehicles ({ownedVehicles.length})
              </TabsTrigger>
              <TabsTrigger
                value="hired"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
              >
                <Building2 className="w-4 h-4 mr-2" />
                Hired Vehicles ({hiredVehicles.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="vehicles-table">
              <TableHeader>
                <TableRow className="border-border hover:bg-muted/30 bg-muted/10">
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4 text-muted-foreground" />
                      Vehicle
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Driver
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  {activeTab === 'owned' ? (
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        Insurance
                      </div>
                    </TableHead>
                  ) : (
                    <TableHead className="font-semibold">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-muted-foreground" />
                        Broker
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="font-semibold">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      Location
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold">Verified</TableHead>
                  <TableHead className="font-semibold text-center">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-muted/30 rounded-full">
                          <Truck className="w-12 h-12 text-muted-foreground/50" />
                        </div>
                        <div className="text-muted-foreground">
                          <p className="text-lg font-medium">
                            {searchQuery ? "No vehicles found" : `No ${activeTab} vehicles added yet`}
                          </p>
                          <p className="text-sm mt-1">
                            {searchQuery ? "Try adjusting your search" : "Add your first vehicle to get started"}
                          </p>
                        </div>
                        {!searchQuery && (
                          <div className="flex gap-4 justify-center">
                            {activeTab === 'owned' ? (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setAddModalType('owned');
                                  setIsAddModalOpen(true);
                                }}
                                className="hover:bg-primary/10 hover:border-primary transition-all"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Owned Vehicle
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsAddBrokerModalOpen(true)}
                                  className="hover:bg-primary/10 hover:border-primary transition-all"
                                >
                                  <Building2 className="w-4 h-4 mr-2" />
                                  Add Broker
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsAddHiredModalOpen(true)}
                                  className="hover:bg-primary/10 hover:border-primary transition-all"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Hired Vehicle
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    const assignments = vehicle.vehicle_assignments || [];
                    const activeAssignment = assignments.find(a => a.status === 'ACTIVE');
                    const driver = activeAssignment?.driver;
                    const booking = activeAssignment?.booking;
                    const status = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.AVAILABLE;
                    const StatusIcon = status.icon;

                    return (
                      <TableRow
                        key={vehicle.id}
                        className="border-border hover:bg-muted/20 transition-all duration-200 group"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary/20 to-primary/10 rounded-lg flex items-center justify-center group-hover:from-primary/30 group-hover:to-primary/20 transition-all">
                              <Truck className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground">{vehicle.vehicle_number}</p>
                              <p className="text-sm text-muted-foreground">
                                {vehicle.vehicle_type} • {vehicle.capacity}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground">{driver.name}</p>
                                <p className="text-xs text-muted-foreground">{driver.experience || 'Experience N/A'}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground flex items-center gap-2">
                              <User className="w-4 h-4" />
                              No driver assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={cn("gap-1.5 font-medium", status.color)}>
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {activeTab === 'owned' ? (
                            <div>
                              {(vehicle as OwnedVehicle).insurance_expiry ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium">
                                      {format(new Date((vehicle as OwnedVehicle).insurance_expiry!), 'dd MMM yyyy')}
                                    </p>
                                    <p className="text-xs text-muted-foreground">Expires in {formatDistanceToNow(new Date((vehicle as OwnedVehicle).insurance_expiry!))}</p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground">Not set</span>
                              )}
                            </div>
                          ) : (
                            <div>
                              {(vehicle as HiredVehicle).broker ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground" />
                                    <span className="font-medium text-sm">{(vehicle as HiredVehicle).broker.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Phone className="w-3 h-3" />
                                    {(vehicle as HiredVehicle).broker.phone}
                                  </div>
                                  {(vehicle as HiredVehicle).rate_per_trip && (
                                    <Badge variant="secondary" className="text-xs">
                                      <DollarSign className="w-3 h-3 mr-1" />
                                      ₹{(vehicle as HiredVehicle).rate_per_trip}/trip
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">No broker</span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking ? (
                            <div className="space-y-1">
                              <Badge variant="outline" className="gap-1">
                                <Navigation className="w-3 h-3" />
                                En Route
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                {booking.from_location} → {booking.to_location}
                              </p>
                            </div>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <MapPin className="w-3 h-3" />
                              At Depot
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVerifyVehicle(vehicle.id, activeTab === 'owned', vehicle.is_verified || false)}
                                  className="flex items-center space-x-2 hover:bg-primary/10"
                                >
                                  {vehicle.is_verified ? (
                                    <>
                                      <ShieldCheck className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-600">Verified</span>
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="w-4 h-4 text-muted-foreground" />
                                      <span className="text-sm">Verify</span>
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{vehicle.is_verified ? "Click to unverify" : "Click to verify"}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center space-x-2">
                            {driver && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-8 w-8 hover:bg-primary/10 hover:border-primary"
                                      asChild
                                    >
                                      <a href={`tel:${driver.phone}`}>
                                        <Phone className="w-3.5 h-3.5" />
                                      </a>
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Call Driver</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 hover:bg-primary/10"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>View Details</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
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

      {/* Add Owned Vehicle Modal */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddModalType('owned');
        }}
        onSave={handleAddOwnedVehicle}
        defaultType="owned"
      />

      {/* Add Hired Vehicle Modal */}
      <AddHiredVehicleModal
        isOpen={isAddHiredModalOpen}
        onClose={() => setIsAddHiredModalOpen(false)}
        onSave={handleAddHiredVehicle}
        onAddBrokerClick={() => {
          setIsAddHiredModalOpen(false);
          setIsAddBrokerModalOpen(true);
        }}
      />

      {/* Add Broker Modal */}
      <AddBrokerModal
        isOpen={isAddBrokerModalOpen}
        onClose={() => setIsAddBrokerModalOpen(false)}
        onSave={handleAddBroker}
      />
    </div>
  );
};