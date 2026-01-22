import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Eye,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import {
  fetchOwnedVehicles,
  fetchHiredVehicles,
  createOwnedVehicle,
  createHiredVehicle,
  verifyOwnedVehicle,
  verifyHiredVehicle,
  createBroker,
} from "@/api/vehicles";
import { AddVehicleModal } from "./AddVehicleModal";
import { AddHiredVehicleModal } from "./AddHiredVehicleModal";
import { AddBrokerModal } from "./AddBrokerModal";
import { useToast } from "@/hooks/use-toast";

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

// ✅ Status configuration (GREEN/RED/ORANGE allowed for status)
const statusConfig = {
  AVAILABLE: {
    label: "Available",
    color:
      "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800",
    icon: CheckCircle,
  },
  OCCUPIED: {
    label: "Occupied",
    color:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800",
    icon: AlertCircle,
  },
  MAINTENANCE: {
    label: "Maintenance",
    color:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800",
    icon: Wrench,
  },
  INACTIVE: {
    label: "Inactive",
    color:
      "bg-[#F3F4F6] text-muted-foreground border-border dark:bg-secondary dark:text-muted-foreground dark:border-border",
    icon: XCircle,
  },
  RELEASED: {
    label: "Released",
    color:
      "bg-accent text-primary dark:text-primary border-primary/30 dark:bg-primary/10 dark:text-primary dark:border-primary/30",
    icon: Clock,
  },
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
  const [addModalType, setAddModalType] = useState<"owned" | "hired">("owned");
  const [ownedVehicles, setOwnedVehicles] = useState<OwnedVehicle[]>([]);
  const [hiredVehicles, setHiredVehicles] = useState<HiredVehicle[]>([]);
  const [activeTab, setActiveTab] = useState<"owned" | "hired">("owned");

  // Add column hover styles
  useEffect(() => {
    const styleElement = document.createElement("style");
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
    const modalType = searchParams.get("openModal");

    if (modalType) {
      if (modalType === "broker") {
        setIsAddBrokerModalOpen(true);
      } else if (modalType === "hired") {
        setIsAddHiredModalOpen(true);
      } else if (modalType === "owned") {
        setAddModalType("owned");
        setIsAddModalOpen(true);
      }

      setTimeout(() => {
        const newUrl = window.location.pathname;
        window.history.replaceState({}, "", newUrl);
      }, 100);
    }
  }, [searchParams]);

  // Separate effect for location state
  useEffect(() => {
    if (location.state?.openModal) {
      if (location.state.openModal === "broker") {
        setIsAddBrokerModalOpen(true);
      } else if (location.state.openModal === "owned") {
        setAddModalType("owned");
        setIsAddModalOpen(true);
      } else if (location.state.openModal === "hired") {
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
        fetchHiredVehicles(),
      ]);
      setOwnedVehicles(owned);
      setHiredVehicles(hired);
    } catch (error) {
      console.error("Error loading vehicles:", error);
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

      if (documents && documents.files.length > 0) {
        const { uploadVehicleDocument } = await import("@/api/vehicleDocument");

        let uploadedCount = 0;
        let failedCount = 0;

        for (let i = 0; i < documents.files.length; i++) {
          const file = documents.files[i];
          const metadata = documents.metadata[i];

          try {
            await uploadVehicleDocument({
              vehicle_id: newVehicle.id,
              vehicle_type: "OWNED",
              document_type: metadata.document_type,
              file: file,
              expiry_date: metadata.expiry_date,
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
            variant: "destructive",
          });
        }
      }

      await loadVehicles();

      toast({
        title: "✅ Vehicle Added Successfully",
        description: `Owned vehicle ${vehicleData.vehicle_number} has been added to your fleet`,
      });
    } catch (error) {
      console.error("Error adding vehicle:", error);
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
        default_driver_id: vehicleData.default_driver_id,
        rate_per_trip: vehicleData.ratePerTrip
          ? parseFloat(vehicleData.ratePerTrip)
          : undefined,
      });

      await loadVehicles();
      toast({
        title: "✅ Hired Vehicle Added",
        description: `Vehicle ${vehicleData.vehicleNumber} has been added`,
      });
      setIsAddHiredModalOpen(false);
    } catch (error) {
      console.error("Error adding hired vehicle:", error);
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
        city: brokerData.city || undefined,
      });

      toast({
        title: "✅ Broker Added",
        description: `${brokerData.name} has been added as a broker`,
      });

      setIsAddBrokerModalOpen(false);
      setIsAddHiredModalOpen(true);
      await loadVehicles();
    } catch (error) {
      console.error("Error adding broker:", error);
      toast({
        title: "❌ Error",
        description: "Failed to add broker",
        variant: "destructive",
      });
    }
  };

  const handleVerifyVehicle = async (
    vehicleId: string,
    isOwned: boolean,
    currentStatus: boolean,
  ) => {
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
      console.error("Error verifying vehicle:", error);
      toast({
        title: "❌ Error",
        description: "Failed to update verification status",
        variant: "destructive",
      });
    }
  };

  const getFilteredVehicles = () => {
    const vehicles = activeTab === "owned" ? ownedVehicles : hiredVehicles;
    return vehicles.filter((vehicle) => {
      const assignments = vehicle.vehicle_assignments || [];
      const activeAssignment = assignments.find((a) => a.status === "ACTIVE");
      const driver = activeAssignment?.driver;
      const brokerName =
        activeTab === "hired"
          ? (vehicle as HiredVehicle).broker?.name || ""
          : "";

      return (
        vehicle.vehicle_number
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
        driver?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        vehicle.vehicle_type
          .toLowerCase()
          .includes(searchQuery.toLowerCase()) ||
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
    available: [...ownedVehicles, ...hiredVehicles].filter(
      (v) => v.status === "AVAILABLE",
    ).length,
    occupied: [...ownedVehicles, ...hiredVehicles].filter(
      (v) => v.status === "OCCUPIED",
    ).length,
    maintenance: [...ownedVehicles, ...hiredVehicles].filter(
      (v) => v.status === "MAINTENANCE",
    ).length,
  };

  const handleExport = () => {
    const headers =
      activeTab === "owned"
        ? [
            "Vehicle Number",
            "Type",
            "Capacity",
            "Status",
            "Driver",
            "Insurance Expiry",
            "Verified",
          ]
        : [
            "Vehicle Number",
            "Type",
            "Capacity",
            "Status",
            "Driver",
            "Broker",
            "Rate/Trip",
            "Verified",
          ];

    const rows = filteredVehicles.map((vehicle) => {
      const assignments = vehicle.vehicle_assignments || [];
      const activeAssignment = assignments.find((a) => a.status === "ACTIVE");
      const driver = activeAssignment?.driver;

      if (activeTab === "owned") {
        const owned = vehicle as OwnedVehicle;
        return [
          vehicle.vehicle_number,
          vehicle.vehicle_type,
          vehicle.capacity,
          vehicle.status,
          driver?.name || "No driver",
          owned.insurance_expiry
            ? format(new Date(owned.insurance_expiry), "dd MMM yyyy")
            : "Not set",
          vehicle.is_verified ? "Yes" : "No",
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
          vehicle.is_verified ? "Yes" : "No",
        ];
      }
    });

    const csvContent = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => {
            const cellStr = String(cell);
            if (
              cellStr.includes(",") ||
              cellStr.includes('"') ||
              cellStr.includes("\n")
            ) {
              return `"${cellStr.replace(/"/g, '""')}"`;
            }
            return cellStr;
          })
          .join(","),
      )
      .join("\n");

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
      {/* ✅ HEADER: Brand gradient with theme colors */}
      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-[#FFFBF0] via-[#FFFBF0]/50 to-transparent dark:from-primary/10 dark:via-primary/5 dark:to-transparent p-8 border border-primary/20 dark:border-border">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 dark:bg-primary/10 rounded-full blur-3xl" />
        <div className="relative flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold text-foreground dark:text-white">
              Fleet Management
            </h1>
            <p className="text-muted-foreground dark:text-muted-foreground mt-2 text-lg">
              Manage your fleet of {totalVehicles} vehicles (
              {ownedVehicles.length} owned, {hiredVehicles.length} hired)
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full lg:w-auto lg:min-w-[220px]">
            {activeTab === "hired" && (
              <>
                <Button
                  onClick={() => setIsAddHiredModalOpen(true)}
                  className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Hired Vehicle
                </Button>

                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export
                </Button>

                <Button
                  variant="outline"
                  onClick={() => setIsAddBrokerModalOpen(true)}
                  className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Add Broker
                </Button>
              </>
            )}

            {activeTab === "owned" && (
              <>
                <Button
                  onClick={() => {
                    setAddModalType("owned");
                    setIsAddModalOpen(true);
                  }}
                  className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Owned Vehicle
                </Button>

                <Button
                  variant="outline"
                  onClick={handleExport}
                  className="w-full bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white transition-all"
                >
                  <FileDown className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ✅ STATS CARDS: Using brand colors + status colors */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {/* Total Fleet - Primary Brand Color */}
        <Card className="bg-card border border-border dark:border-border hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Total Fleet
                </p>
                <p className="text-3xl font-bold text-foreground dark:text-white">
                  {stats.total}
                </p>
              </div>
              <div className="p-3 bg-accent dark:bg-primary/10 rounded-xl">
                <Truck className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Owned - Secondary Brand Color */}
        <Card className="bg-card border border-border dark:border-border hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Owned
                </p>
                <p className="text-3xl font-bold text-primary dark:text-primary">
                  {stats.owned}
                </p>
              </div>
              <div className="p-3 bg-[#F38810]/10 rounded-xl">
                <Shield className="w-6 h-6 text-primary dark:text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hired - Tertiary Brand Color */}
        <Card className="bg-card border border-border dark:border-border hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Hired
                </p>
                <p className="text-3xl font-bold text-primary dark:text-primary">
                  {stats.hired}
                </p>
              </div>
              <div className="p-3 bg-[#F67C09]/10 rounded-xl">
                <Building2 className="w-6 h-6 text-primary dark:text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Status colors (GREEN allowed for success) */}
        <Card className="bg-card border border-border dark:border-border hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Available
                </p>
                <p className="text-3xl font-bold text-green-600">
                  {stats.available}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Orange for occupied (status color) */}
        <Card className="bg-card border border-border dark:border-border hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Occupied
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {stats.occupied}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                <AlertCircle className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ✅ Red for maintenance (status color) */}
        <Card className="bg-card border border-border dark:border-border hover:shadow-lg transition-all">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Maintenance
                </p>
                <p className="text-3xl font-bold text-red-600">
                  {stats.maintenance}
                </p>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-xl">
                <Wrench className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ✅ SEARCH CARD */}
      <Card className="bg-card border border-border dark:border-border shadow-sm">
        <CardHeader className="border-b border-border dark:border-border">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <Search className="w-5 h-5 text-primary" />
            Search Vehicles
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
            <Input
              placeholder={
                activeTab === "owned"
                  ? "Search by vehicle number, driver name, or type..."
                  : "Search by vehicle number, driver name, type, or broker..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* ✅ TABLE CARD */}
      <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border dark:border-border bg-muted">
          <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as "owned" | "hired")}
          >
            <TabsList className="bg-transparent border-0 p-0 h-auto inline-flex">
              <TabsTrigger
                value="owned"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3.5 transition-all text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
              >
                <Shield className="w-4 h-4 mr-2" />
                Owned Vehicles ({ownedVehicles.length})
              </TabsTrigger>
              <TabsTrigger
                value="hired"
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none px-6 py-3.5 transition-all text-sm font-medium text-muted-foreground dark:text-muted-foreground hover:text-foreground dark:hover:text-white"
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
                <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Truck className="w-4 h-4" />
                      Vehicle
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Driver
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                    Status
                  </TableHead>
                  {activeTab === "owned" ? (
                    <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Insurance
                      </div>
                    </TableHead>
                  ) : (
                    <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4" />
                        Broker
                      </div>
                    </TableHead>
                  )}
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4" />
                      Location
                    </div>
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground">
                    Verified
                  </TableHead>
                  <TableHead className="font-semibold text-muted-foreground dark:text-muted-foreground text-center">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVehicles.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-16">
                      <div className="flex flex-col items-center gap-4">
                        <div className="p-4 bg-muted rounded-full">
                          <Truck className="w-12 h-12 text-muted-foreground dark:text-muted-foreground" />
                        </div>
                        <div className="text-muted-foreground dark:text-muted-foreground">
                          <p className="text-lg font-medium">
                            {searchQuery
                              ? "No vehicles found"
                              : `No ${activeTab} vehicles added yet`}
                          </p>
                          <p className="text-sm mt-1">
                            {searchQuery
                              ? "Try adjusting your search"
                              : "Add your first vehicle to get started"}
                          </p>
                        </div>
                        {!searchQuery && (
                          <div className="flex gap-4 justify-center">
                            {activeTab === "owned" ? (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setAddModalType("owned");
                                  setIsAddModalOpen(true);
                                }}
                                className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Owned Vehicle
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsAddBrokerModalOpen(true)}
                                  className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
                                >
                                  <Building2 className="w-4 h-4 mr-2" />
                                  Add Broker
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsAddHiredModalOpen(true)}
                                  className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
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
                    const activeAssignment = assignments.find(
                      (a) => a.status === "ACTIVE",
                    );
                    const driver = activeAssignment?.driver;
                    const booking = activeAssignment?.booking;
                    const status =
                      statusConfig[
                        vehicle.status as keyof typeof statusConfig
                      ] || statusConfig.AVAILABLE;
                    const StatusIcon = status.icon;

                    return (
                      <TableRow
                        key={vehicle.id}
                        className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border transition-colors"
                      >
                        <TableCell>
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-accent dark:bg-primary/10 rounded-lg flex items-center justify-center">
                              <Truck className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold text-foreground dark:text-white">
                                {vehicle.vehicle_number}
                              </p>
                              <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                                {vehicle.vehicle_type} • {vehicle.capacity}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {driver ? (
                            <div className="flex items-center space-x-3">
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                                <User className="w-4 h-4 text-green-600" />
                              </div>
                              <div>
                                <p className="font-medium text-foreground dark:text-white">
                                  {driver.name}
                                </p>
                                <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                  {driver.experience || "Experience N/A"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                              <User className="w-4 h-4" />
                              No driver assigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              "gap-1.5 font-medium text-xs",
                              status.color,
                            )}
                          >
                            <StatusIcon className="w-3.5 h-3.5" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {activeTab === "owned" ? (
                            <div>
                              {(vehicle as OwnedVehicle).insurance_expiry ? (
                                <div className="flex items-center gap-2">
                                  <Calendar className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                  <div>
                                    <p className="text-sm font-medium text-foreground dark:text-white">
                                      {format(
                                        new Date(
                                          (vehicle as OwnedVehicle)
                                            .insurance_expiry!,
                                        ),
                                        "dd MMM yyyy",
                                      )}
                                    </p>
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                      Expires in{" "}
                                      {formatDistanceToNow(
                                        new Date(
                                          (vehicle as OwnedVehicle)
                                            .insurance_expiry!,
                                        ),
                                      )}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted-foreground dark:text-muted-foreground">
                                  Not set
                                </span>
                              )}
                            </div>
                          ) : (
                            <div>
                              {(vehicle as HiredVehicle).broker ? (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <Building2 className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                    <span className="font-medium text-sm text-foreground dark:text-white">
                                      {(vehicle as HiredVehicle).broker.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground dark:text-muted-foreground">
                                    <Phone className="w-3 h-3" />
                                    {(vehicle as HiredVehicle).broker.phone}
                                  </div>
                                  {(vehicle as HiredVehicle).rate_per_trip && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs border-primary/30 text-primary dark:text-primary"
                                    >
                                      <DollarSign className="w-3 h-3 mr-1" />₹
                                      {(vehicle as HiredVehicle).rate_per_trip}
                                      /trip
                                    </Badge>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground dark:text-muted-foreground">
                                  No broker
                                </span>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {booking ? (
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className="gap-1 border-primary/30 text-primary dark:text-primary"
                              >
                                <Navigation className="w-3 h-3" />
                                En Route
                              </Badge>
                              <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                {booking.from_location} → {booking.to_location}
                              </p>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className="gap-1 border-border dark:border-border"
                            >
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
                                  onClick={() =>
                                    handleVerifyVehicle(
                                      vehicle.id,
                                      activeTab === "owned",
                                      vehicle.is_verified || false,
                                    )
                                  }
                                  className="flex items-center space-x-2 hover:bg-accent dark:hover:bg-secondary"
                                >
                                  {vehicle.is_verified ? (
                                    <>
                                      <ShieldCheck className="w-4 h-4 text-green-600" />
                                      <span className="text-sm text-green-600">
                                        Verified
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      <Shield className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                                        Verify
                                      </span>
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  {vehicle.is_verified
                                    ? "Click to unverify"
                                    : "Click to verify"}
                                </p>
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
                                      className="h-8 w-8 border-border dark:border-border hover:bg-accent dark:hover:bg-secondary hover:border-primary"
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
                                    className="h-8 w-8 hover:bg-accent dark:hover:bg-secondary"
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

      {/* Modals */}
      <AddVehicleModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setAddModalType("owned");
        }}
        onSave={handleAddOwnedVehicle}
        defaultType="owned"
      />

      <AddHiredVehicleModal
        isOpen={isAddHiredModalOpen}
        onClose={() => setIsAddHiredModalOpen(false)}
        onSave={handleAddHiredVehicle}
        onAddBrokerClick={() => {
          setIsAddHiredModalOpen(false);
          setIsAddBrokerModalOpen(true);
        }}
      />

      <AddBrokerModal
        isOpen={isAddBrokerModalOpen}
        onClose={() => setIsAddBrokerModalOpen(false)}
        onSave={handleAddBroker}
      />
    </div>
  );
};
