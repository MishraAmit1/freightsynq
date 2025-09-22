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
  Loader2
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
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { fetchWarehouseDetails, syncBookingConsignmentStatus } from "@/api/warehouses";
import { AssignVehicleModal } from "./AssignVehicleModal";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { useToast } from "@/hooks/use-toast";
import { updateConsignmentStatus } from "@/api/warehouses";
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
        title: "Error",
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
        title: "Error",
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
    if (utilization <= 60) return "text-success";
    if (utilization <= 85) return "text-warning";
    return "text-destructive";
  };

  const calculateAging = (arrivalDate: string) => {
    const arrival = new Date(arrivalDate);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - arrival.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const getAgingColor = (days: number) => {
    if (days <= 1) return "text-success";
    if (days <= 3) return "text-warning";
    return "text-destructive";
  };

  const getStatusColor = (status: string) => {
    const colors = {
      "IN_WAREHOUSE": "bg-info/10 text-info",
      "PENDING_DELIVERY": "bg-warning/10 text-warning",
      "ASSIGNED_VEHICLE": "bg-primary/10 text-primary",
      "IN_TRANSIT": "bg-success/10 text-success",
      "DELIVERED": "bg-muted text-muted-foreground"
    };
    return colors[status as keyof typeof colors] || "bg-muted text-muted-foreground";
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

      // Use sync function
      await syncBookingConsignmentStatus(selectedConsignment.id, newStatus);

      const action = actionType === "transit" ? "marked as in transit" : "marked as delivered";

      toast({
        title: "Action Completed",
        description: `Consignment ${selectedConsignment.consignment_id} has been ${action}. Booking status synced.`,
      });

      setConfirmModalOpen(false);
      setSelectedConsignment(null);
      setActionType(null);

      await loadWarehouseDetails();
    } catch (error) {
      console.error('Error executing action:', error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading warehouse details...</span>
      </div>
    );
  }

  if (!warehouse) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Warehouse not found</h2>
          <p className="text-muted-foreground mb-4">The requested warehouse could not be found.</p>
          <Button onClick={() => navigate("/warehouses")}>
            Back to Warehouses
          </Button>
        </div>
      </div>
    );
  }
  const handleVehicleAssignSuccess = async () => {
    await loadWarehouseDetails();
  };
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
            size="sm"
            onClick={() => navigate("/warehouses")}
            className="gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">{warehouse.name}</h1>
            <div className="flex items-center gap-2 text-muted-foreground mt-1">
              <MapPin className="w-4 h-4" />
              {warehouse.address}
            </div>
          </div>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warehouse.current_stock}</p>
                <p className="text-sm text-muted-foreground">Current Stock</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-info/10 rounded-lg">
                <Calendar className="w-6 h-6 text-info" />
              </div>
              <div>
                <p className="text-2xl font-bold">{warehouse.capacity}</p>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-warning/10 rounded-lg">
                <AlertTriangle className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className={`text-2xl font-bold ${getCapacityColor(utilization)}`}>
                  {utilization.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">Utilization</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-destructive/10 rounded-lg">
                <Clock className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <p className="text-2xl font-bold text-destructive">{overdueConsignments.length}</p>
                <p className="text-sm text-muted-foreground">Overdue Items</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Manager Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Warehouse Manager
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="font-medium">{warehouse.manager_name}</p>
              <p className="text-sm text-muted-foreground">Manager</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{warehouse.manager_phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{warehouse.manager_email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Inventory and Logs */}
      <Tabs defaultValue="inventory" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="inventory">Current Inventory ({consignments.length})</TabsTrigger>
          <TabsTrigger value="logs">Activity Logs ({warehouseLogs.length})</TabsTrigger>
        </TabsList>

        {/* Inventory Tab */}
        <TabsContent value="inventory" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Package className="w-5 h-5" />
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
            <CardContent>
              {consignments.length > 0 ? (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Booking ID</TableHead>
                        <TableHead>Consignment ID</TableHead>
                        <TableHead>Consignor</TableHead>
                        <TableHead>Consignee</TableHead>
                        <TableHead>Material</TableHead>
                        <TableHead>Units</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Aging</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {consignments.map((consignment) => {
                        const aging = calculateAging(consignment.arrival_date);
                        const isOverdue = aging > 3;

                        return (
                          <TableRow key={consignment.id}>
                            <TableCell className="font-medium">
                              {consignment.booking.booking_id}
                            </TableCell>
                            <TableCell>{consignment.consignment_id}</TableCell>
                            <TableCell>{consignment.booking.consignor_name}</TableCell>
                            <TableCell>{consignment.booking.consignee_name}</TableCell>
                            <TableCell className="max-w-48 truncate">
                              {consignment.booking.material_description}
                            </TableCell>
                            <TableCell>{consignment.booking.cargo_units}</TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(consignment.status)}>
                                {consignment.status.replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                <span className={getAgingColor(aging)}>
                                  {aging} day{aging !== 1 ? 's' : ''}
                                </span>
                                {isOverdue && <AlertTriangle className="w-3 h-3 text-destructive" />}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {consignment.status === "IN_WAREHOUSE" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleAssignVehicle(consignment)}
                                      className="gap-1"
                                    >
                                      <Truck className="w-3 h-3" />
                                      Assign
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleMarkTransit(consignment)}
                                      className="gap-1"
                                    >
                                      Transit
                                    </Button>
                                  </>
                                )}
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleMarkDelivered(consignment)}
                                  className="gap-1"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Delivered
                                </Button>
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
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No consignments in warehouse</h3>
                  <p className="text-muted-foreground">
                    This warehouse currently has no items in stock.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Warehouse Activity Logs</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading logs...</span>
                </div>
              ) : warehouseLogs.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No activity logs found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {warehouseLogs.map((log, index) => (
                    <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-muted/30">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.type === 'INCOMING' ? 'bg-success/10 text-success' : 'bg-info/10 text-info'
                        }`}>
                        {log.type === 'INCOMING' ? (
                          <ArrowDownToLine className="w-5 h-5" />
                        ) : (
                          <ArrowUpFromLine className="w-5 h-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">
                            {log.type === 'INCOMING' ? 'Goods Received' : 'Goods Dispatched'}
                          </h4>
                          <span className="text-sm text-muted-foreground">
                            {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm mt-1">
                          Consignment: {log.consignment?.consignment_id}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Booking: {log.consignment?.booking?.booking_id} -
                          {log.consignment?.booking?.consignor_name} to {log.consignment?.booking?.consignee_name}
                        </p>
                        {log.notes && (
                          <p className="text-sm mt-2 italic">{log.notes}</p>
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
        title="Assign Vehicle to Consignment" // Add this
        description="Select a vehicle and driver to assign to this consignment" // Add this
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
        title={actionType === 'transit' ? 'Mark as In Transit' : 'Mark as Delivered'} // Add this
        description="This action will update the consignment status" // Add this
      />

    </div>
  );
};