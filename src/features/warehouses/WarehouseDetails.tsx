import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  MapPin,
  Package,
  Clock,
  Truck,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Phone,
  Mail,
  Users,
  Loader2,
  ArrowDownToLine,
  ArrowUpFromLine
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchWarehouseDetails, syncBookingConsignmentStatus } from "@/api/warehouses";
import { AssignVehicleModal } from "./AssignVehicleModal";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
interface Warehouse {
  id: string;
  name: string;
  code: string;
  city: string;
  state: string;
  address: string;
  capacity: number;
  current_stock: number;
  manager_name: string;
  manager_phone: string;
  manager_email: string;
  consignments?: Array<{
    id: string;
    consignment_id: string;
    booking_id: string;
    status: string;
    arrival_date: string;
    booking: {
      booking_id: string;
      consignor_name: string;
      consignee_name: string;
      material_description: string;
      cargo_units: string;
    };
  }>;
}

export const WarehouseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [warehouse, setWarehouse] = useState<Warehouse | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedConsignment, setSelectedConsignment] = useState<any>(null);
  const [assignVehicleModalOpen, setAssignVehicleModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"transit" | "delivered" | null>(null);
  const [warehouseLogs, setWarehouseLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      loadWarehouseDetails(id);
      loadWarehouseLogs(id);
    }
  }, [id]);

  const loadWarehouseLogs = async (warehouseId: string) => {
    try {
      setLogsLoading(true);
      const { fetchWarehouseLogs } = await import('@/api/warehouses');
      const data = await fetchWarehouseLogs(warehouseId);
      setWarehouseLogs(data);
    } catch (error) {
      console.error('Error loading warehouse logs:', error);
      toast({
        title: "❌ Error",
        description: "Failed to load warehouse logs",
        variant: "destructive",
      });
    } finally {
      setLogsLoading(false);
    }
  };

  const loadWarehouseDetails = async () => {
    try {
      setLoading(true);
      const data = await fetchWarehouseDetails(id!);

      if (!data) {
        throw new Error('Warehouse not found');
      }

      setWarehouse(data);
    } catch (error: any) {
      console.error('Error loading warehouse details:', error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load warehouse details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStockUtilization = (currentStock: number, capacity: number) => {
    return (currentStock / capacity) * 100;
  };

  const getCapacityColor = (utilization: number) => {
    if (utilization <= 60) return "text-green-600";
    if (utilization <= 85) return "text-primary dark:text-primary";
    return "text-red-600";
  };

  const calculateAging = (arrivalDate: string) => {
    const arrival = new Date(arrivalDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - arrival.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAgingColor = (days: number) => {
    if (days <= 1) return "text-green-600";
    if (days <= 3) return "text-primary dark:text-primary";
    return "text-red-600";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "IN_WAREHOUSE": "bg-accent dark:bg-primary/10 text-primary dark:text-primary border-primary/30",
      "PENDING_DELIVERY": "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50",
      "ASSIGNED_VEHICLE": "bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-900/50",
      "IN_TRANSIT": "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50",
      "DELIVERED": "bg-muted text-muted-foreground dark:text-muted-foreground border-border dark:border-border"
    };
    return colors[status as keyof typeof colors] || "bg-muted text-muted-foreground dark:text-muted-foreground";
  };

  const handleAssignVehicle = (consignment: any) => {
    setSelectedConsignment(consignment);
    setAssignVehicleModalOpen(true);
  };

  const handleMarkTransit = (consignment: any) => {
    setSelectedConsignment(consignment);
    setActionType("transit");
    setConfirmModalOpen(true);
  };

  const handleMarkDelivered = (consignment: any) => {
    setSelectedConsignment(consignment);
    setActionType("delivered");
    setConfirmModalOpen(true);
  };

  const executeAction = async () => {
    if (!selectedConsignment || !actionType) return;

    try {
      const newStatus = actionType === "transit" ? "IN_TRANSIT" : "DELIVERED";

      await syncBookingConsignmentStatus(selectedConsignment.id, newStatus);

      const action = actionType === "transit" ? "marked as in transit" : "marked as delivered";

      toast({
        title: "✅ Action Completed",
        description: `Consignment ${selectedConsignment.consignment_id} has been ${action}. Booking status synced.`,
      });

      setConfirmModalOpen(false);
      setSelectedConsignment(null);
      setActionType(null);

      await loadWarehouseDetails();
    } catch (error) {
      console.error('Error executing action:', error);
      toast({
        title: "❌ Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleVehicleAssignSuccess = async () => {
    await loadWarehouseDetails();
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="relative">
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
        </div>
        <p className="text-lg font-medium text-muted-foreground dark:text-muted-foreground animate-pulse">
          Loading warehouse details...
        </p>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-muted-foreground dark:text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold mb-2 text-foreground dark:text-white">Warehouse not found</h2>
          <p className="text-muted-foreground dark:text-muted-foreground mb-4">The requested warehouse could not be found.</p>
          <Button
            onClick={() => navigate("/warehouses")}
            className="bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
          >
            Back to Warehouses
          </Button>
        </div>
      </div>
    );
  }

  const consignments = warehouse.consignments || [];
  const utilization = getStockUtilization(warehouse.current_stock, warehouse.capacity);
  const overdueConsignments = consignments.filter(c => calculateAging(c.arrival_date) > 3);

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="default"
            onClick={() => navigate("/warehouses")}
            className="gap-2 bg-card border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-white">{warehouse.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground dark:text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              {warehouse.address}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-card border border-border dark:border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary dark:text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground dark:text-white">{warehouse.current_stock}</p>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Current Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border dark:border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground dark:text-white">{warehouse.capacity}</p>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Total Capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border dark:border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className={cn("text-2xl font-bold", getCapacityColor(utilization))}>
                  {utilization.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border border-border dark:border-border">
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                <Clock className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-red-600">{overdueConsignments.length}</p>
                <p className="text-sm text-muted-foreground dark:text-muted-foreground">Overdue Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager Info */}
      <Card className="bg-card border border-border dark:border-border">
        <CardHeader className="border-b border-border dark:border-border">
          <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <div className="p-1.5 bg-green-100 dark:bg-green-900/20 rounded-lg">
              <Users className="w-5 h-5 text-green-600" />
            </div>
            Warehouse Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-medium text-foreground dark:text-white">{warehouse.manager_name}</p>
              <p className="text-sm text-muted-foreground dark:text-muted-foreground">Manager</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
              <span className="text-sm text-foreground dark:text-white">{warehouse.manager_phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
              <span className="text-sm text-foreground dark:text-white">{warehouse.manager_email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Inventory and Logs */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-muted border border-border dark:border-border">
          <TabsTrigger
            value="inventory"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-foreground dark:text-white hover:text-foreground dark:hover:text-white"
          >
            Current Inventory ({consignments.length})
          </TabsTrigger>
          <TabsTrigger
            value="logs"
            className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm text-foreground dark:text-white hover:text-foreground dark:hover:text-white"
          >
            Activity Logs ({warehouseLogs.length})
          </TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-6">
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="border-b border-border dark:border-border">
              <CardTitle className="flex items-center justify-between text-foreground dark:text-white">
                <span className="flex items-center gap-2">
                  <div className="p-1.5 bg-accent dark:bg-primary/10 rounded-lg">
                    <Package className="w-5 h-5 text-primary dark:text-primary" />
                  </div>
                  Current Inventory ({consignments.length} items)
                </span>
                {overdueConsignments.length > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    {overdueConsignments.length} Overdue
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {consignments.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b border-border dark:border-border hover:bg-muted dark:hover:bg-[#252530]">
                        <TableHead className="text-muted-foreground dark:text-muted-foreground font-semibold">Booking ID</TableHead>
                        <TableHead className="text-muted-foreground dark:text-muted-foreground font-semibold">Consignor</TableHead>
                        <TableHead className="text-muted-foreground dark:text-muted-foreground font-semibold">Consignee</TableHead>
                        <TableHead className="text-muted-foreground dark:text-muted-foreground font-semibold">Material</TableHead>
                        <TableHead className="text-muted-foreground dark:text-muted-foreground font-semibold">Units</TableHead>
                        <TableHead className="text-muted-foreground dark:text-muted-foreground font-semibold">Aging</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consignments.map((consignment) => {
                        const aging = calculateAging(consignment.arrival_date);
                        const isOverdue = aging > 3;

                        return (
                          <TableRow
                            key={consignment.id}
                            className="hover:bg-accent dark:hover:bg-muted border-b border-border dark:border-border"
                          >
                            <TableCell className="font-medium text-foreground dark:text-white">
                              {consignment.booking.booking_id}
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">
                              {consignment.booking.consignor_name}
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">
                              {consignment.booking.consignee_name}
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="block truncate max-w-[200px] cursor-help">
                                      {consignment.booking.material_description || 'N/A'}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-xs">
                                    <p className="text-sm">
                                      {consignment.booking.material_description || 'No material description'}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </TableCell>
                            <TableCell className="text-foreground dark:text-white">
                              {consignment.booking.cargo_units || '1'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span className={cn(
                                  "font-medium",
                                  getAgingColor(aging)
                                )}>
                                  {aging} day{aging !== 1 ? 's' : ''}
                                </span>
                                {isOverdue && (
                                  <Badge variant="destructive" className="ml-1 h-5 px-1 text-[10px]">
                                    Overdue
                                  </Badge>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <Package className="w-6 h-6 text-muted-foreground dark:text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-medium mb-2 text-foreground dark:text-white">No consignments in warehouse</h3>
                  <p className="text-muted-foreground dark:text-muted-foreground">
                    This warehouse currently has no items in stock.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <Card className="bg-card border border-border dark:border-border">
            <CardHeader className="border-b border-border dark:border-border">
              <CardTitle className="text-foreground dark:text-white">Warehouse Activity Logs</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <span className="ml-2 text-muted-foreground dark:text-muted-foreground">Loading logs...</span>
                </div>
              ) : warehouseLogs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground dark:text-muted-foreground">No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {warehouseLogs.map((log, index) => (
                    <div
                      key={index}
                      className="flex items-start space-x-4 p-4 rounded-lg bg-muted border border-border dark:border-border"
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0",
                        log.type === 'INCOMING'
                          ? 'bg-green-100 dark:bg-green-900/20 text-green-600'
                          : 'bg-accent dark:bg-primary/10 text-primary dark:text-primary'
                      )}>
                        {log.type === 'INCOMING' ? (
                          <ArrowDownToLine className="w-5 h-5" />
                        ) : (
                          <ArrowUpFromLine className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium text-foreground dark:text-white">
                            {log.type === 'INCOMING' ? 'Goods Received' : 'Goods Dispatched'}
                          </h4>
                          <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-foreground dark:text-white mt-1">
                          Consignment: {log.consignment?.consignment_id}
                        </p>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                          Booking: {log.consignment?.booking?.booking_id} - {log.consignment?.booking?.consignor_name} to {log.consignment?.booking?.consignee_name}
                        </p>
                        {log.notes && (
                          <p className="text-sm mt-2 italic text-muted-foreground dark:text-muted-foreground">{log.notes}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <AssignVehicleModal
        isOpen={assignVehicleModalOpen}
        onClose={() => {
          setAssignVehicleModalOpen(false);
          setSelectedConsignment(null);
        }}
        consignment={selectedConsignment}
        onAssignSuccess={handleVehicleAssignSuccess}
        title="Assign Vehicle to Consignment"
        description="Select a vehicle and driver to assign to this consignment"
      />

      <ConfirmActionModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setSelectedConsignment(null);
          setActionType(null);
        }}
        onConfirm={executeAction}
        consignment={selectedConsignment}
        actionType={actionType}
        title={actionType === 'transit' ? 'Mark as In Transit' : 'Mark as Delivered'}
        description="This action will update the consignment status"
      />
    </div>
  );
};