import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
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
  XCircle,
  ArrowRight,
  X
} from "lucide-react";
import {
  fetchOwnedVehicles,
  fetchHiredVehicles,
  createOwnedVehicle,
  createHiredVehicle,
  verifyOwnedVehicle,
  verifyHiredVehicle,
  createBroker,
  fetchBrokers
} from "@/api/vehicles";
import { AddVehicleModal } from "./AddVehicleModal";
import { AddHiredVehicleModal } from "./AddHiredVehicleModal";
import { VehicleDetailDrawer } from "./VehicleDetailDrawer";
import { useToast } from "@/hooks/use-toast";
import { AddBrokerModal } from "./AddBrokerModal";
import { uploadVehicleDocument } from "@/api/vehicleDocument";

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

// ✅ Status configuration (GREEN/RED/ORANGE allowed for status)
const statusConfig = {
  AVAILABLE: {
    label: "Available",
    color: "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    icon: CheckCircle,
  },
  OCCUPIED: {
    label: "Occupied",
    color: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    icon: AlertCircle,
  },
  MAINTENANCE: {
    label: "Maintenance",
    color: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    icon: Wrench,
  },
  INACTIVE: {
    label: "Inactive",
    color: "bg-[#F3F4F6] text-muted-foreground border-border dark:bg-secondary dark:text-muted-foreground dark:border-border",
    icon: XCircle,
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
  const [brokers, setBrokers] = useState<any[]>([]);
  const [loadingBrokers, setLoadingBrokers] = useState(false);

  useEffect(() => {
    loadVehicles();
    loadBrokers();
  }, []);

  const loadBrokers = async () => {
    try {
      setLoadingBrokers(true);
      const data = await fetchBrokers();
      setBrokers(data || []);
    } catch (error) {
      console.error('Error loading brokers:', error);
      setBrokers([]);
    } finally {
      setLoadingBrokers(false);
    }
  };

  const handleAddBroker = async (brokerData: any) => {
    try {
      const newBroker = await createBroker({
        name: brokerData.name,
        contact_person: brokerData.contactPerson,
        phone: brokerData.phone,
        email: brokerData.email,
        city: brokerData.city
      });

      toast({
        title: "✅ Broker Added",
        description: `${brokerData.name} has been added as a broker`,
      });

      await loadBrokers();
      setIsAddBrokerOpen(false);
      setIsAddHiredVehicleOpen(true);

      return newBroker;
    } catch (error: any) {
      console.error('Error adding broker:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to add broker",
        variant: "destructive",
      });
    }
  };

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

  const loadVehicles = async () => {
    try {
      setLoading(true);
      const [ownedData, hiredData] = await Promise.all([
        fetchOwnedVehicles(),
        fetchHiredVehicles()
      ]);

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

  const handleAddHiredVehicleClick = async () => {
    if (brokers.length === 0 && !loadingBrokers) {
      await loadBrokers();
    }
    setIsAddHiredVehicleOpen(true);
  };

  const handleAddHiredVehicle = async (vehicleData: any, documents?: any) => {
    try {
      const brokerIdToSave = vehicleData.brokerId === "none" ? null : vehicleData.brokerId;
      const driverIdToSave = vehicleData.default_driver_id === "none" ? null : vehicleData.default_driver_id;

      const newVehicle = await createHiredVehicle({
        vehicle_number: vehicleData.vehicleNumber,
        vehicle_type: vehicleData.vehicleType,
        capacity: vehicleData.capacity,
        broker_id: brokerIdToSave,
        default_driver_id: driverIdToSave,
        rate_per_trip: vehicleData.ratePerTrip ? parseFloat(vehicleData.ratePerTrip) : undefined,
      });

      if (documents && documents.files.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < documents.files.length; i++) {
          const file = documents.files[i];
          const metadata = documents.metadata[i];

          try {
            await uploadVehicleDocument({
              vehicle_id: newVehicle.id,
              vehicle_type: 'HIRED',
              document_type: metadata.document_type,
              file: file,
              expiry_date: metadata.expiry_date
            });
            uploadedCount++;
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
      setIsAddHiredVehicleOpen(false);

      toast({
        title: "✅ Success",
        description: `Vehicle ${vehicleData.vehicleNumber} added successfully`,
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

  const allOwnedVehicles = vehicles.filter(v => v.is_owned);
  const allHiredVehicles = vehicles.filter(v => !v.is_owned);

  const handleAddVehicle = async (vehicleData: any, documents?: any) => {
    try {
      if (!vehicleData.vehicle_number || !vehicleData.vehicle_type || !vehicleData.capacity) {
        toast({
          title: "❌ Missing Information",
          description: "Please fill in all required fields",
          variant: "destructive",
        });
        return;
      }

      const newVehicle = await createOwnedVehicle({
        vehicle_number: vehicleData.vehicle_number,
        vehicle_type: vehicleData.vehicle_type,
        capacity: vehicleData.capacity,
        default_driver_id: vehicleData.default_driver_id || null,
        registration_date: vehicleData.registration_date || null,
        insurance_expiry: vehicleData.insurance_expiry || null,
        fitness_expiry: vehicleData.fitness_expiry || null,
        permit_expiry: vehicleData.permit_expiry || null,
      });

      if (documents && documents.files && documents.files.length > 0) {
        let uploadedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < documents.files.length; i++) {
          const file = documents.files[i];
          const metadata = documents.metadata[i] || { document_type: 'OTHER' };

          try {
            await uploadVehicleDocument({
              vehicle_id: newVehicle.id,
              vehicle_type: 'OWNED',
              document_type: metadata.document_type,
              file: file,
              expiry_date: metadata.expiry_date || null
            });

            uploadedCount++;
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
      setIsAddVehicleOpen(false);

      toast({
        title: "✅ Vehicle Added",
        description: `Vehicle ${vehicleData.vehicle_number} has been added to your fleet`,
      });
    } catch (error: any) {
      console.error('❌ Error adding owned vehicle:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to add vehicle",
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
    } catch (error: any) {
      console.error('Error verifying vehicle:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to verify vehicle",
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
        <p className="text-lg font-medium text-muted-foreground dark:text-muted-foreground animate-pulse">
          Loading vehicles...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ CARD 1: Stats & Buttons */}
      <div className="flex flex-col md:flex-row md:items-stretch md:justify-between gap-4">
        {/* Stats - Single Card with Dividers */}
        <div className="bg-card border border-border dark:border-border rounded-xl flex-1 p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-6 sm:gap-0 h-full">
            {/* Total */}
            <div className="sm:px-6 py-4 first:pl-0 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Truck className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Total
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.total}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Owned */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Shield className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Owned
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.owned}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Hired */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Building2 className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Hired
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.hired}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Verified */}
            <div className="sm:px-6 py-4 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <ShieldCheck className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Verified
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.verified}
                </p>
              </div>
              <div className="hidden sm:block absolute right-0 top-0 bottom-0 w-[1px] bg-[#E5E7EB] dark:bg-secondary"></div>
            </div>

            {/* Unverified */}
            <div className="sm:px-6 py-4 last:pr-0 relative">
              <div className="absolute top-1 right-2 opacity-10">
                <Clock className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
              </div>
              <div className="relative z-10">
                <p className="text-xs sm:text-sm text-muted-foreground dark:text-muted-foreground font-medium">
                  Unverified
                </p>
                <p className="text-2xl sm:text-3xl font-bold text-foreground dark:text-white">
                  {stats.unverified}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons - Right Side */}
        {/* Buttons - Right Side */}
        <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[220px]">
          <Button
            size="sm"
            onClick={() => setIsAddVehicleOpen(true)}
            className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleAddHiredVehicleClick}
            disabled={loadingBrokers}
            className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hired Vehicle
          </Button>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleExport}
                  className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
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
        </div>
      </div>

      {/* ✅ CARD 2: Tabs + Search + Table */}
      <div className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">

        {/* Tabs Section */}
        <div className="border-b border-border dark:border-border">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="px-4 sm:px-6 overflow-x-auto scrollbar-none">
              <TabsList className="bg-transparent border-0 p-0 h-auto inline-flex min-w-max">
                <TabsTrigger
                  value="owned"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3.5 transition-all text-xs sm:text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                >
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Owned ({allOwnedVehicles.length})
                </TabsTrigger>
                <TabsTrigger
                  value="hired"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-3 sm:px-6 py-3.5 transition-all text-xs sm:text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
                >
                  <Building2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  Hired ({allHiredVehicles.length})
                </TabsTrigger>
              </TabsList>
            </div>
          </Tabs>
        </div>

        {/* Search and Filters Section */}
        <div className="p-4 sm:p-6 border-b border-border dark:border-border">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            {/* Search Bar */}
            <div className="relative w-full sm:w-96">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
              <Input
                placeholder="Search vehicles, broker..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-10 h-10 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-sm"
              />
              {searchTerm && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 p-0 hover:bg-accent dark:hover:bg-secondary"
                  onClick={() => setSearchTerm("")}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>

            {/* Status Filter */}
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px] h-10 border-border dark:border-border bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border dark:border-border">
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="OCCUPIED">Occupied</SelectItem>
                  <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                  <SelectItem value="INACTIVE">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="p-4 sm:p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            {/* Owned Vehicles Tab */}
            <TabsContent value="owned" className="mt-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="vehicle-mgmt-table">
                  <TableHeader>
                    <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Vehicle No.
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Type</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Capacity</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Verification</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Booking
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownedVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted rounded-full">
                              <Truck className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                            </div>
                            <div className="text-muted-foreground dark:text-muted-foreground">
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
                          <TableRow key={vehicle.id} className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors">
                            <TableCell>
                              <div className="font-semibold flex items-center gap-2 text-foreground dark:text-white">
                                <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                {vehicle.vehicle_number}
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">{vehicle.vehicle_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-border dark:border-border">
                                {vehicle.capacity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("gap-1 text-xs font-medium", status.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {vehicle.is_verified ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  Unverified
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {vehicle.vehicle_assignments?.length > 0 ? (
                                <Badge variant="secondary" className="bg-muted">
                                  {vehicle.vehicle_assignments[0].booking?.booking_id}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">-</span>
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
                                        className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
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
                                    className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
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

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {ownedVehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-muted rounded-full">
                        <Truck className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                      </div>
                      <div className="text-muted-foreground dark:text-muted-foreground">
                        <p className="text-lg font-medium">No owned vehicles found</p>
                        <p className="text-sm mt-1">Add your first vehicle to get started</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  ownedVehicles.map((vehicle) => {
                    const status = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.AVAILABLE;
                    const StatusIcon = status.icon;

                    return (
                      <div key={vehicle.id} className="bg-card border border-border dark:border-border rounded-lg p-4 space-y-3 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                              <span className="font-semibold text-sm text-foreground dark:text-white">{vehicle.vehicle_number}</span>
                            </div>
                            <div className="text-xs text-muted-foreground dark:text-muted-foreground ml-6">
                              {vehicle.vehicle_type}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openVehicleDetail(vehicle)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!vehicle.is_verified && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleVerifyVehicle(vehicle.id, vehicle.is_owned)}
                                className="h-8 w-8 border-border dark:border-border"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("gap-1 text-xs", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {vehicle.is_verified ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                              <ShieldCheck className="w-3 h-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Unverified
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm pt-2 border-t border-border dark:border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground dark:text-muted-foreground text-xs">Capacity:</span>
                            <Badge variant="outline" className="text-xs border-border dark:border-border">
                              {vehicle.capacity}
                            </Badge>
                          </div>
                          {vehicle.vehicle_assignments?.length > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground dark:text-muted-foreground text-xs">Booking:</span>
                              <Badge variant="secondary" className="text-xs bg-muted">
                                {vehicle.vehicle_assignments[0].booking?.booking_id}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* Hired Vehicles Tab */}
            <TabsContent value="hired" className="mt-0">
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <Table className="vehicle-mgmt-table">
                  <TableHeader>
                    <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          Vehicle No.
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Type</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Capacity</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Status</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          Broker
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">Verification</TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4" />
                          Booking
                        </div>
                      </TableHead>
                      <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground text-center">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hiredVehicles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-16">
                          <div className="flex flex-col items-center gap-4">
                            <div className="p-4 bg-muted rounded-full">
                              <Building2 className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                            </div>
                            <div className="text-muted-foreground dark:text-muted-foreground">
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
                          <TableRow key={vehicle.id} className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors">
                            <TableCell>
                              <div className="font-semibold flex items-center gap-2 text-foreground dark:text-white">
                                <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                {vehicle.vehicle_number}
                              </div>
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">{vehicle.vehicle_type}</TableCell>
                            <TableCell>
                              <Badge variant="outline" className="border-border dark:border-border">
                                {vehicle.capacity}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge className={cn("gap-1 text-xs font-medium", status.color)}>
                                <StatusIcon className="w-3 h-3" />
                                {status.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {vehicle.broker ? (
                                <div className="space-y-1">
                                  <div className="font-medium text-sm flex items-center gap-1 text-foreground dark:text-white">
                                    <Building2 className="w-3 h-3 text-muted-foreground dark:text-muted-foreground" />
                                    {vehicle.broker.name}
                                  </div>
                                  <div className="text-xs text-muted-foreground dark:text-muted-foreground flex items-center gap-1">
                                    <User className="w-3 h-3" />
                                    {vehicle.broker.contact_person}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {vehicle.is_verified ? (
                                <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                                  <ShieldCheck className="w-3 h-3" />
                                  Verified
                                </Badge>
                              ) : (
                                <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                                  <AlertCircle className="w-3 h-3" />
                                  Unverified
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {vehicle.vehicle_assignments?.length > 0 ? (
                                <Badge variant="secondary" className="bg-muted">
                                  {vehicle.vehicle_assignments[0].booking?.booking_id}
                                </Badge>
                              ) : (
                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">-</span>
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
                                        className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
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
                                    className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
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

              {/* Mobile Card View */}
              <div className="md:hidden space-y-3">
                {hiredVehicles.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-4 bg-muted rounded-full">
                        <Building2 className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                      </div>
                      <div className="text-muted-foreground dark:text-muted-foreground">
                        <p className="text-lg font-medium">No hired vehicles found</p>
                        <p className="text-sm mt-1">Add your first hired vehicle to get started</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  hiredVehicles.map((vehicle) => {
                    const status = statusConfig[vehicle.status as keyof typeof statusConfig] || statusConfig.AVAILABLE;
                    const StatusIcon = status.icon;

                    return (
                      <div key={vehicle.id} className="bg-card border border-border dark:border-border rounded-lg p-4 space-y-3 shadow-sm">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                              <span className="font-semibold text-sm text-foreground dark:text-white">{vehicle.vehicle_number}</span>
                            </div>
                            <div className="text-xs text-muted-foreground dark:text-muted-foreground ml-6">
                              {vehicle.vehicle_type}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openVehicleDetail(vehicle)}
                              className="h-8 w-8"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {!vehicle.is_verified && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleVerifyVehicle(vehicle.id, false)}
                                className="h-8 w-8 border-border dark:border-border"
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>

                        {vehicle.broker && (
                          <div className="flex items-start gap-2 text-xs bg-muted rounded p-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground dark:text-muted-foreground mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-foreground dark:text-white">{vehicle.broker.name}</div>
                              <div className="text-muted-foreground dark:text-muted-foreground flex items-center gap-1 mt-0.5">
                                <User className="w-3 h-3" />
                                {vehicle.broker.contact_person}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("gap-1 text-xs", status.color)}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </Badge>
                          {vehicle.is_verified ? (
                            <Badge className="bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 gap-1 text-xs">
                              <ShieldCheck className="w-3 h-3" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400 dark:border-yellow-800 gap-1 text-xs">
                              <AlertCircle className="w-3 h-3" />
                              Unverified
                            </Badge>
                          )}
                        </div>

                        <div className="space-y-2 text-sm pt-2 border-t border-border dark:border-border">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground dark:text-muted-foreground text-xs">Capacity:</span>
                            <Badge variant="outline" className="text-xs border-border dark:border-border">
                              {vehicle.capacity}
                            </Badge>
                          </div>
                          {vehicle.vehicle_assignments?.length > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-muted-foreground dark:text-muted-foreground text-xs">Booking:</span>
                              <Badge variant="secondary" className="text-xs bg-muted">
                                {vehicle.vehicle_assignments[0].booking?.booking_id}
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>

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
        brokers={brokers || []}
        onAddBroker={() => {
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