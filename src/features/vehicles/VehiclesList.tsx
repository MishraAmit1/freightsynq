import { useState, useEffect } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Building2
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
        title: "Error",
        description: "Failed to load vehicles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Handler for owned vehicles
  const handleAddOwnedVehicle = async (vehicleData: any) => {
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
        title: "Vehicle Added Successfully",
        description: `Owned vehicle ${vehicleData.vehicle_number} has been added to your fleet`,
      });
    } catch (error) {
      console.error('Error adding vehicle:', error);
      toast({
        title: "Error",
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
        rate_per_trip: vehicleData.ratePerTrip ? parseFloat(vehicleData.ratePerTrip) : undefined,
      });

      await loadVehicles();
      toast({
        title: "Hired Vehicle Added Successfully",
        description: `Vehicle ${vehicleData.vehicleNumber} has been added`,
      });
      setIsAddHiredModalOpen(false);
    } catch (error) {
      console.error('Error adding hired vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to add hired vehicle. Please try again.",
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
        email: brokerData.email || undefined
      });

      toast({
        title: "Broker Added Successfully",
        description: `${brokerData.name} has been added as a broker`,
      });

      // After adding broker, open hired vehicle modal
      setIsAddBrokerModalOpen(false);
      setIsAddHiredModalOpen(true);

      // Reload to get updated broker list
      await loadVehicles();
    } catch (error) {
      console.error('Error adding broker:', error);
      toast({
        title: "Error",
        description: "Failed to add broker. Please try again.",
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
        title: currentStatus ? "Vehicle Unverified" : "Vehicle Verified",
        description: currentStatus
          ? "Vehicle verification has been removed"
          : "Vehicle has been verified successfully",
      });
    } catch (error) {
      console.error('Error verifying vehicle:', error);
      toast({
        title: "Error",
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

      // For hired vehicles, also search by broker name
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

  const getStatusColor = (status: string) => {
    const colors = {
      AVAILABLE: "bg-success/10 text-success",
      OCCUPIED: "bg-warning/10 text-warning",
      MAINTENANCE: "bg-destructive/10 text-destructive",
      INACTIVE: "bg-muted text-muted-foreground",
      RELEASED: "bg-muted text-muted-foreground"
    };
    return colors[status as keyof typeof colors] || colors.AVAILABLE;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="w-4 h-4" />;
      case 'OCCUPIED':
        return <AlertCircle className="w-4 h-4" />;
      case 'MAINTENANCE':
        return <XCircle className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading vehicles...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your fleet of {totalVehicles} vehicles ({ownedVehicles.length} owned, {hiredVehicles.length} hired)
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'hired' && (
            <>
              <Button
                variant="outline"
                onClick={() => setIsAddBrokerModalOpen(true)}
              >
                <Building2 className="w-4 h-4 mr-2" />
                Add Broker
              </Button>
              <Button
                onClick={() => setIsAddHiredModalOpen(true)}
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
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Owned Vehicle
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Search Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={activeTab === 'owned'
                  ? "Search by vehicle number, driver name, or type..."
                  : "Search by vehicle number, driver name, type, or broker..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table with Tabs */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'owned' | 'hired')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="owned">
                Owned Vehicles ({ownedVehicles.length})
              </TabsTrigger>
              <TabsTrigger value="hired">
                Hired Vehicles ({hiredVehicles.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                {activeTab === 'owned' ? (
                  <TableHead>Insurance Expiry</TableHead>
                ) : (
                  <TableHead>Broker</TableHead>
                )}
                <TableHead>Current Location</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchQuery ? (
                        "No vehicles found matching your search"
                      ) : (
                        <div className="space-y-4">
                          <p>No {activeTab} vehicles added yet.</p>
                          <div className="flex gap-4 justify-center">
                            {activeTab === 'owned' ? (
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setAddModalType('owned');
                                  setIsAddModalOpen(true);
                                }}
                              >
                                <Plus className="w-4 h-4 mr-2" />
                                Add Owned Vehicle
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsAddBrokerModalOpen(true)}
                                >
                                  <Building2 className="w-4 h-4 mr-2" />
                                  Add Broker
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => setIsAddHiredModalOpen(true)}
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add Hired Vehicle
                                </Button>
                              </>
                            )}
                          </div>
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

                  return (
                    <TableRow key={vehicle.id}>
                      <TableCell>
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                            <Truck className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{vehicle.vehicle_number}</p>
                            <p className="text-sm text-muted-foreground">
                              {vehicle.vehicle_type} • {vehicle.capacity}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {driver ? (
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                              <User className="w-4 h-4 text-success" />
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{driver.name}</p>
                              <p className="text-sm text-muted-foreground">{driver.experience || 'N/A'}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">No driver assigned</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(vehicle.status)} gap-1`}>
                          {getStatusIcon(vehicle.status)}
                          {vehicle.status.replace('_', ' ')}
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
                                  <p className="text-xs text-muted-foreground">Insurance Expiry</p>
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Not set</span>
                            )}
                          </div>
                        ) : (
                          <div>
                            {(vehicle as HiredVehicle).broker ? (
                              <div className="flex items-center gap-2">
                                <Building2 className="w-4 h-4 text-muted-foreground" />
                                <div>
                                  <p className="text-sm font-medium">{(vehicle as HiredVehicle).broker.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {(vehicle as HiredVehicle).broker.contact_person} • {(vehicle as HiredVehicle).broker.phone}
                                  </p>
                                  {(vehicle as HiredVehicle).rate_per_trip && (
                                    <p className="text-xs text-success">
                                      ₹{(vehicle as HiredVehicle).rate_per_trip}/trip
                                    </p>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-muted-foreground">No broker assigned</span>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {booking ? (
                          <div className="text-sm">
                            <p className="font-medium">En Route</p>
                            <p className="text-xs text-muted-foreground">
                              {booking.from_location} → {booking.to_location}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">At depot</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleVerifyVehicle(vehicle.id, activeTab === 'owned', vehicle.is_verified || false)}
                          className="flex items-center space-x-2"
                        >
                          {vehicle.is_verified ? (
                            <>
                              <ShieldCheck className="w-4 h-4 text-success" />
                              <span className="text-sm">Verified</span>
                            </>
                          ) : (
                            <>
                              <Shield className="w-4 h-4 text-muted-foreground" />
                              <span className="text-sm">Verify</span>
                            </>
                          )}
                        </Button>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          {driver && (
                            <Button variant="outline" size="sm" asChild>
                              <a href={`tel:${driver.phone}`}>
                                <Phone className="w-4 h-4 mr-1" />
                                Call
                              </a>
                            </Button>
                          )}
                          <Button variant="outline" size="sm">
                            View Details
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
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