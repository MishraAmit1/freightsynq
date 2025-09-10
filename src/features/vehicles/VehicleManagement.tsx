import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Search, 
  Filter, 
  Truck, 
  Eye, 
  CheckCircle, 
  AlertCircle,
  FileText,
  User
} from "lucide-react";
import { mockVehicles, mockBrokers, Vehicle, BrokerInfo } from "@/lib/mockData";
import { AddVehicleModal } from "./AddVehicleModal";
import { AddHiredVehicleModal } from "./AddHiredVehicleModal";
import { VehicleDetailDrawer } from "./VehicleDetailDrawer";
import { useToast } from "@/hooks/use-toast";

export const VehicleManagement = () => {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<Vehicle[]>(mockVehicles);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState("owned");
  const [isAddVehicleOpen, setIsAddVehicleOpen] = useState(false);
  const [isAddHiredVehicleOpen, setIsAddHiredVehicleOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [isDetailDrawerOpen, setIsDetailDrawerOpen] = useState(false);

  const filteredVehicles = vehicles.filter(vehicle => {
    const matchesSearch = vehicle.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vehicle.vehicleType.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vehicle.broker?.name || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || vehicle.status === statusFilter;
    const matchesTab = activeTab === "owned" ? vehicle.isOwned : !vehicle.isOwned;
    return matchesSearch && matchesStatus && matchesTab;
  });

  const handleAddVehicle = (vehicleData: any) => {
    const newVehicle: Vehicle = {
      id: `V${Date.now()}`,
      ...vehicleData,
      status: "AVAILABLE" as const,
      isVerified: false,
      isOwned: true,
      documents: [],
      addedDate: new Date().toISOString()
    };

    setVehicles(prev => [...prev, newVehicle]);
    toast({
      title: "Vehicle Added Successfully",
      description: `Vehicle ${vehicleData.vehicleNumber} has been added to your fleet`,
    });
  };

  const handleAddHiredVehicle = (vehicleData: any, brokerData: any) => {
    const newVehicle: Vehicle = {
      id: `V${Date.now()}`,
      ...vehicleData,
      status: "AVAILABLE" as const,
      isVerified: false,
      isOwned: false,
      broker: brokerData,
      documents: [],
      addedDate: new Date().toISOString()
    };

    setVehicles(prev => [...prev, newVehicle]);
    toast({
      title: "Hired Vehicle Added Successfully",
      description: `Vehicle ${vehicleData.vehicleNumber} from ${brokerData.name} has been added`,
    });
  };

  const handleVerifyVehicle = (vehicleId: string) => {
    setVehicles(prev => 
      prev.map(vehicle => 
        vehicle.id === vehicleId 
          ? { ...vehicle, isVerified: true }
          : vehicle
      )
    );
    toast({
      title: "Vehicle Verified",
      description: "Vehicle has been marked as verified",
    });
  };

  const getStatusColor = (status: Vehicle["status"]) => {
    const colors = {
      AVAILABLE: "bg-success text-success-foreground",
      OCCUPIED: "bg-info text-info-foreground", 
      MAINTENANCE: "bg-warning text-warning-foreground",
      INACTIVE: "bg-muted text-muted-foreground"
    };
    return colors[status];
  };

  const openVehicleDetail = (vehicle: Vehicle) => {
    setSelectedVehicle(vehicle);
    setIsDetailDrawerOpen(true);
  };

  const ownedVehicles = filteredVehicles.filter(v => v.isOwned);
  const hiredVehicles = filteredVehicles.filter(v => !v.isOwned);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground">Manage your owned and hired vehicle fleet</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setIsAddHiredVehicleOpen(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Hired Vehicle
          </Button>
          <Button onClick={() => setIsAddVehicleOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-sm">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search vehicles, broker..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <Filter className="w-4 h-4 mr-2" />
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
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="owned" className="flex items-center gap-2">
            <Truck className="w-4 h-4" />
            Owned Fleet ({ownedVehicles.length})
          </TabsTrigger>
          <TabsTrigger value="hired" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Hired Fleet ({hiredVehicles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="owned">
          <Card>
            <CardHeader>
              <CardTitle>Owned Vehicles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Assigned Booking</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ownedVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                        <TableCell>{vehicle.vehicleType}</TableCell>
                        <TableCell>{vehicle.capacity}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vehicle.status)}>
                            {vehicle.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {vehicle.isVerified ? (
                              <Badge variant="default" className="bg-success text-success-foreground">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-warning text-warning-foreground">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicle.assignedBookingId ? (
                            <span className="text-sm text-primary">BKG-{vehicle.assignedBookingId}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openVehicleDetail(vehicle)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!vehicle.isVerified && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleVerifyVehicle(vehicle.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Verify
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hired">
          <Card>
            <CardHeader>
              <CardTitle>Hired Vehicles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vehicle No.</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Capacity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Broker</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Assigned Booking</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {hiredVehicles.map((vehicle) => (
                      <TableRow key={vehicle.id} className="hover:bg-muted/50">
                        <TableCell className="font-medium">{vehicle.vehicleNumber}</TableCell>
                        <TableCell>{vehicle.vehicleType}</TableCell>
                        <TableCell>{vehicle.capacity}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(vehicle.status)}>
                            {vehicle.status.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {vehicle.broker && (
                            <div>
                              <div className="font-medium text-sm">{vehicle.broker.name}</div>
                              <div className="text-xs text-muted-foreground">{vehicle.broker.contactPerson}</div>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {vehicle.isVerified ? (
                              <Badge variant="default" className="bg-success text-success-foreground">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="bg-warning text-warning-foreground">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Unverified
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {vehicle.assignedBookingId ? (
                            <span className="text-sm text-primary">BKG-{vehicle.assignedBookingId}</span>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => openVehicleDetail(vehicle)}
                            >
                              <Eye className="w-4 h-4" />
                            </Button>
                            {!vehicle.isVerified && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleVerifyVehicle(vehicle.id)}
                              >
                                <CheckCircle className="w-4 h-4 mr-1" />
                                Verify
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
      />

      <VehicleDetailDrawer
        isOpen={isDetailDrawerOpen}
        onClose={() => setIsDetailDrawerOpen(false)}
        vehicle={selectedVehicle}
      />
    </div>
  );
};