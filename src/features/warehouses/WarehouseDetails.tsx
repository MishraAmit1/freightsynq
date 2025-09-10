import { useState } from "react";
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
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  getWarehouseById,
  getConsignmentsByWarehouse,
  calculateAging,
  getStockUtilization,
  getStatusColor,
  getAgingColor,
  getCapacityColor,
  type Consignment
} from "@/lib/warehouseData";
import { AssignVehicleModal } from "./AssignVehicleModal";
import { ConfirmActionModal } from "./ConfirmActionModal";
import { useToast } from "@/hooks/use-toast";

export const WarehouseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [selectedConsignment, setSelectedConsignment] = useState<Consignment | null>(null);
  const [assignVehicleModalOpen, setAssignVehicleModalOpen] = useState(false);
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [actionType, setActionType] = useState<"transit" | "delivered" | null>(null);
  
  const warehouse = getWarehouseById(id!);
  
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

  const consignments = getConsignmentsByWarehouse(warehouse.id);
  const utilization = getStockUtilization(warehouse.currentStock, warehouse.capacity);

  const handleAssignVehicle = (consignment: Consignment) => {
    setSelectedConsignment(consignment);
    setAssignVehicleModalOpen(true);
  };

  const handleMarkTransit = (consignment: Consignment) => {
    setSelectedConsignment(consignment);
    setActionType("transit");
    setConfirmModalOpen(true);
  };

  const handleMarkDelivered = (consignment: Consignment) => {
    setSelectedConsignment(consignment);
    setActionType("delivered");
    setConfirmModalOpen(true);
  };

  const executeAction = () => {
    if (!selectedConsignment || !actionType) return;

    const action = actionType === "transit" ? "marked as in transit" : "marked as delivered";
    
    toast({
      title: "Action Completed",
      description: `Consignment ${selectedConsignment.id} has been ${action}.`,
    });

    setConfirmModalOpen(false);
    setSelectedConsignment(null);
    setActionType(null);
  };

  const overdueConsignments = consignments.filter(c => calculateAging(c.arrivalDate) > 3);

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
                <p className="text-2xl font-bold">{warehouse.currentStock}</p>
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
              <p className="font-medium">{warehouse.manager}</p>
              <p className="text-sm text-muted-foreground">Manager</p>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{warehouse.phone}</span>
            </div>
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">{warehouse.email}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Consignments Table */}
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
                    <TableHead>Shipper</TableHead>
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
                    const aging = calculateAging(consignment.arrivalDate);
                    const isOverdue = aging > 3;
                    
                    return (
                      <TableRow key={consignment.id}>
                        <TableCell className="font-medium">
                          {consignment.bookingId}
                        </TableCell>
                        <TableCell>{consignment.id}</TableCell>
                        <TableCell>{consignment.shipper}</TableCell>
                        <TableCell>{consignment.consignee}</TableCell>
                        <TableCell className="max-w-48 truncate">
                          {consignment.materialDescription}
                        </TableCell>
                        <TableCell>{consignment.cargoUnits}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(consignment.status)}>
                            {consignment.status}
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
                            {consignment.status === "In Warehouse" && (
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

      {/* Modals */}
      <AssignVehicleModal
        isOpen={assignVehicleModalOpen}
        onClose={() => {
          setAssignVehicleModalOpen(false);
          setSelectedConsignment(null);
        }}
        consignment={selectedConsignment}
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
      />
    </div>
  );
};