import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { supabase } from '@/lib/supabase'

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Truck,
  User,
  Loader2,
  Building2,
  Package,
  Check,
  ChevronsUpDown,
  Plus,
  UserPlus
} from "lucide-react";
import {
  fetchAvailableOwnedVehicles,
  fetchAvailableHiredVehicles,
  fetchDrivers,
  assignVehicleToBooking,
  fetchBrokers,
  createOwnedVehicle,
  createHiredVehicle,
  createBroker
} from "@/api/vehicles";
import { createDriver } from "@/api/drivers"; // You'll need to implement this
import { AddVehicleModal } from "../vehicles/AddVehicleModal";
import { AddHiredVehicleModal } from "../vehicles/AddHiredVehicleModal";
import { AddBrokerModal } from "../vehicles/AddBrokerModal";
import { AddDriverModal } from "./AddDriverModal"; // You'll need to create this component
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface EnhancedVehicleAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAssign: (vehicleAssignment: any) => void;
  bookingId: string;
}

export const EnhancedVehicleAssignmentModal = ({
  isOpen,
  onClose,
  onAssign,
  bookingId
}: EnhancedVehicleAssignmentModalProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("owned");
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>("");
  const [selectedDriverId, setSelectedDriverId] = useState<string>("");
  const [selectedBrokerId, setSelectedBrokerId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Search states
  const [vehicleSearch, setVehicleSearch] = useState("");
  const [brokerSearch, setBrokerSearch] = useState("");
  const [driverSearch, setDriverSearch] = useState("");

  // Popover open states
  const [vehicleOpen, setVehicleOpen] = useState(false);
  const [brokerOpen, setBrokerOpen] = useState(false);
  const [driverOpen, setDriverOpen] = useState(false);

  // 🔥 NEW: Sub-modal states
  const [isAddOwnedVehicleModalOpen, setIsAddOwnedVehicleModalOpen] = useState(false);
  const [isAddHiredVehicleModalOpen, setIsAddHiredVehicleModalOpen] = useState(false);
  const [isAddBrokerModalOpen, setIsAddBrokerModalOpen] = useState(false);
  const [isAddDriverModalOpen, setIsAddDriverModalOpen] = useState(false);

  const [ownedVehicles, setOwnedVehicles] = useState<any[]>([]);
  const [hiredVehicles, setHiredVehicles] = useState<any[]>([]);
  const [brokers, setBrokers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset vehicle selection when broker changes
    setSelectedVehicleId("");
  }, [selectedBrokerId]);

  useEffect(() => {
    // Reset selections when tab changes
    setSelectedVehicleId("");
    setSelectedBrokerId("");
  }, [activeTab]);

  const loadData = async () => {
    try {
      setDataLoading(true);
      const [ownedData, hiredData, driversData, brokersData] = await Promise.all([
        fetchAvailableOwnedVehicles(),
        fetchAvailableHiredVehicles(),
        fetchDrivers(),
        fetchBrokers()
      ]);

      setOwnedVehicles(ownedData);
      setHiredVehicles(hiredData);
      setDrivers(driversData);
      setBrokers(brokersData);
    } catch (error) {
      console.error('Error loading data in assignment modal:', error);
      toast({
        title: "Error",
        description: "Failed to load assignment data",
        variant: "destructive"
      });
    } finally {
      setDataLoading(false);
    }
  };

  const handleAssign = async () => {
    if (!selectedVehicleId || !selectedDriverId) {
      toast({
        title: "Selection Required",
        description: "Please select both vehicle and driver",
        variant: "destructive"
      });
      return;
    }

    if (activeTab === "hired" && !selectedBrokerId) {
      toast({
        title: "Broker Required",
        description: "Please select a broker for hired vehicle",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);

      await assignVehicleToBooking({
        booking_id: bookingId,
        vehicle_type: activeTab === 'owned' ? 'OWNED' : 'HIRED',
        vehicle_id: selectedVehicleId,
        driver_id: selectedDriverId,
        broker_id: activeTab === "hired" ? selectedBrokerId : undefined,
        status: 'ACTIVE',
      });

      if (activeTab === 'owned') {
        await supabase.from('owned_vehicles').update({ status: 'OCCUPIED' }).eq('id', selectedVehicleId);
      } else {
        await supabase.from('hired_vehicles').update({ status: 'OCCUPIED' }).eq('id', selectedVehicleId);
      }

      const allVehicles = [...ownedVehicles, ...hiredVehicles];
      const selectedVehicle = allVehicles.find(v => v.id === selectedVehicleId);
      const selectedDriver = drivers.find(d => d.id === selectedDriverId);
      const selectedBroker = activeTab === "hired" ? brokers.find(b => b.id === selectedBrokerId) : null;

      if (selectedVehicle && selectedDriver) {
        const assignment = {
          id: selectedVehicle.id,
          vehicleNumber: selectedVehicle.vehicle_number,
          vehicleType: selectedVehicle.vehicle_type,
          capacity: selectedVehicle.capacity,
          isOwned: activeTab === 'owned',
          broker: selectedBroker,
          driver: {
            id: selectedDriver.id,
            name: selectedDriver.name,
            phone: selectedDriver.phone,
          }
        };

        onAssign(assignment);

        toast({
          title: "Vehicle Assigned Successfully",
          description: `Vehicle ${selectedVehicle.vehicle_number} has been assigned`,
        });

        // Reset form
        setSelectedVehicleId("");
        setSelectedDriverId("");
        setSelectedBrokerId("");
        setActiveTab("owned");
        onClose();
      }
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to assign vehicle. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 🔥 NEW: Handle adding owned vehicle
  const handleAddOwnedVehicle = async (vehicleData: any) => {
    try {
      const newVehicle = await createOwnedVehicle({
        vehicle_number: vehicleData.vehicle_number,
        vehicle_type: vehicleData.vehicle_type,
        capacity: vehicleData.capacity,
        registration_date: vehicleData.registration_date,
        insurance_expiry: vehicleData.insurance_expiry,
        fitness_expiry: vehicleData.fitness_expiry,
        permit_expiry: vehicleData.permit_expiry,
      });

      // Refresh data
      await loadData();

      // Auto-select the newly created vehicle
      setSelectedVehicleId(newVehicle.id);
      setIsAddOwnedVehicleModalOpen(false);

      toast({
        title: "Vehicle Added Successfully",
        description: `${vehicleData.vehicle_number} has been added and selected`,
      });
    } catch (error) {
      console.error('Error adding owned vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to add vehicle. Please try again.",
        variant: "destructive"
      });
    }
  };

  // 🔥 NEW: Handle adding hired vehicle
  const handleAddHiredVehicle = async (vehicleData: any) => {
    try {
      const newVehicle = await createHiredVehicle({
        vehicle_number: vehicleData.vehicleNumber,
        vehicle_type: vehicleData.vehicleType,
        capacity: vehicleData.capacity,
        broker_id: vehicleData.brokerId,
        rate_per_trip: vehicleData.ratePerTrip ? parseFloat(vehicleData.ratePerTrip) : undefined,
      });

      // Refresh data
      await loadData();

      // Auto-select broker and vehicle
      setSelectedBrokerId(vehicleData.brokerId);
      setSelectedVehicleId(newVehicle.id);
      setIsAddHiredVehicleModalOpen(false);

      toast({
        title: "Hired Vehicle Added Successfully",
        description: `${vehicleData.vehicleNumber} has been added and selected`,
      });
    } catch (error) {
      console.error('Error adding hired vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to add hired vehicle. Please try again.",
        variant: "destructive"
      });
    }
  };

  // 🔥 NEW: Handle adding broker
  const handleAddBroker = async (brokerData: any) => {
    try {
      const newBroker = await createBroker({
        name: brokerData.name,
        contact_person: brokerData.contactPerson,
        phone: brokerData.phone,
        email: brokerData.email || undefined
      });

      // Refresh data
      await loadData();

      // Auto-select the newly created broker
      setSelectedBrokerId(newBroker.id);
      setIsAddBrokerModalOpen(false);

      toast({
        title: "Broker Added Successfully",
        description: `${brokerData.name} has been added and selected`,
      });
    } catch (error) {
      console.error('Error adding broker:', error);
      toast({
        title: "Error",
        description: "Failed to add broker. Please try again.",
        variant: "destructive"
      });
    }
  };

  // 🔥 NEW: Handle adding driver
  // 🔥 NEW: Handle adding driver (UPDATED - removed address)
  const handleAddDriver = async (driverData: any) => {
    try {
      const newDriver = await createDriver({
        name: driverData.name,
        phone: driverData.phone,
        license_number: driverData.license_number,
        experience: driverData.experience,
        // ❌ REMOVED: address parameter
      });

      // Refresh data
      await loadData();

      // Auto-select the newly created driver
      setSelectedDriverId(newDriver.id);
      setIsAddDriverModalOpen(false);

      toast({
        title: "Driver Added Successfully",
        description: `${driverData.name} has been added and selected`,
      });
    } catch (error) {
      console.error('Error adding driver:', error);
      toast({
        title: "Error",
        description: "Failed to add driver. Please try again.",
        variant: "destructive"
      });
    }
  };

  if (dataLoading) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="ml-2">Loading...</span>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Get selected items for display
  const selectedVehicle = [...ownedVehicles, ...hiredVehicles].find(v => v.id === selectedVehicleId);
  const selectedBroker = brokers.find(b => b.id === selectedBrokerId);
  const selectedDriver = drivers.find(d => d.id === selectedDriverId);

  // Filter vehicles based on search
  const filteredOwnedVehicles = ownedVehicles.filter(v =>
    vehicleSearch === "" ||
    v.vehicle_number.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.vehicle_type.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const filteredHiredVehicles = hiredVehicles.filter(v =>
    vehicleSearch === "" ||
    v.vehicle_number.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
    v.vehicle_type.toLowerCase().includes(vehicleSearch.toLowerCase())
  );

  const filteredBrokers = brokers.filter(b =>
    brokerSearch === "" ||
    b.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
    b.contact_person.toLowerCase().includes(brokerSearch.toLowerCase())
  );

  const filteredDrivers = drivers.filter(d =>
    driverSearch === "" ||
    d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
    d.phone.toLowerCase().includes(driverSearch.toLowerCase())
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              Assign Vehicle - {bookingId}
            </DialogTitle>
          </DialogHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="owned" className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                Owned Vehicles ({ownedVehicles.length})
              </TabsTrigger>
              <TabsTrigger value="hired" className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Hired Vehicles ({hiredVehicles.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="owned" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Select Vehicle</Label>
                <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={vehicleOpen}
                      className="w-full justify-between"
                    >
                      {selectedVehicle && activeTab === "owned" ? (
                        <div className="flex items-center gap-2">
                          <Truck className="w-4 h-4" />
                          <span>{selectedVehicle.vehicle_number}</span>
                          <span className="text-muted-foreground">• {selectedVehicle.vehicle_type}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Choose an owned vehicle...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search vehicles..."
                        className="h-9"
                        value={vehicleSearch}
                        onValueChange={setVehicleSearch}
                      />
                      <CommandEmpty>
                        <div className="py-6 text-center text-sm">
                          <p className="text-muted-foreground mb-2">No vehicle found.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddOwnedVehicleModalOpen(true)}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Owned Vehicle
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {filteredOwnedVehicles.map((vehicle) => (
                          <CommandItem
                            key={vehicle.id}
                            value={`${vehicle.vehicle_number} ${vehicle.vehicle_type}`}
                            onSelect={() => {
                              setSelectedVehicleId(vehicle.id);
                              setVehicleOpen(false);
                              setVehicleSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedVehicleId === vehicle.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">{vehicle.vehicle_number}</span>
                                {vehicle.is_verified && (
                                  <Badge variant="success" className="text-xs">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {vehicle.vehicle_type} • {vehicle.capacity}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </TabsContent>

            <TabsContent value="hired" className="space-y-4 mt-4">
              {/* Broker Selection */}
              <div className="space-y-2">
                <Label>Select Broker</Label>
                <Popover open={brokerOpen} onOpenChange={setBrokerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={brokerOpen}
                      className="w-full justify-between"
                    >
                      {selectedBroker ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4" />
                          <span>{selectedBroker.name}</span>
                          <span className="text-muted-foreground">• {selectedBroker.contact_person}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Choose a broker...</span>
                      )}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-full p-0">
                    <Command>
                      <CommandInput
                        placeholder="Search brokers..."
                        className="h-9"
                        value={brokerSearch}
                        onValueChange={setBrokerSearch}
                      />
                      <CommandEmpty>
                        <div className="py-6 text-center text-sm">
                          <p className="text-muted-foreground mb-2">No broker found.</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsAddBrokerModalOpen(true)}
                            className="gap-2"
                          >
                            <Plus className="w-4 h-4" />
                            Add Broker
                          </Button>
                        </div>
                      </CommandEmpty>
                      <CommandGroup className="max-h-64 overflow-auto">
                        {filteredBrokers.map((broker) => (
                          <CommandItem
                            key={broker.id}
                            value={`${broker.name} ${broker.contact_person} ${broker.phone}`}
                            onSelect={() => {
                              setSelectedBrokerId(broker.id);
                              setBrokerOpen(false);
                              setBrokerSearch("");
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                selectedBrokerId === broker.id ? "opacity-100" : "opacity-0"
                              )}
                            />
                            <div className="flex-1">
                              <div className="font-medium">{broker.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {broker.contact_person} • {broker.phone}
                              </div>
                            </div>
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Vehicle Selection */}
              {selectedBrokerId && (
                <div className="space-y-2">
                  <Label>Select Vehicle</Label>
                  <Popover open={vehicleOpen} onOpenChange={setVehicleOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={vehicleOpen}
                        className="w-full justify-between"
                      >
                        {selectedVehicle && activeTab === "hired" ? (
                          <div className="flex items-center gap-2">
                            <Truck className="w-4 h-4" />
                            <span>{selectedVehicle.vehicle_number}</span>
                            <span className="text-muted-foreground">• {selectedVehicle.vehicle_type}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Choose a vehicle...</span>
                        )}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput
                          placeholder="Search vehicles..."
                          className="h-9"
                          value={vehicleSearch}
                          onValueChange={setVehicleSearch}
                        />
                        <CommandEmpty>
                          <div className="py-6 text-center text-sm">
                            <p className="text-muted-foreground mb-2">No vehicle found.</p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setIsAddHiredVehicleModalOpen(true)}
                              className="gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Add Hired Vehicle
                            </Button>
                          </div>
                        </CommandEmpty>
                        <CommandGroup className="max-h-64 overflow-auto">
                          {filteredHiredVehicles.map((vehicle) => (
                            <CommandItem
                              key={vehicle.id}
                              value={`${vehicle.vehicle_number} ${vehicle.vehicle_type}`}
                              onSelect={() => {
                                setSelectedVehicleId(vehicle.id);
                                setVehicleOpen(false);
                                setVehicleSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selectedVehicleId === vehicle.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{vehicle.vehicle_number}</span>
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  {vehicle.vehicle_type} • {vehicle.capacity}
                                </div>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Driver Selection (Common for both tabs) */}
          {selectedVehicleId && (
            <div className="space-y-2 mt-4">
              <Label>Select Driver</Label>
              <Popover open={driverOpen} onOpenChange={setDriverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={driverOpen}
                    className="w-full justify-between"
                  >
                    {selectedDriver ? (
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        <span>{selectedDriver.name}</span>
                        <span className="text-muted-foreground">• {selectedDriver.phone}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Choose a driver...</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search drivers..."
                      className="h-9"
                      value={driverSearch}
                      onValueChange={setDriverSearch}
                    />
                    <CommandEmpty>
                      <div className="py-6 text-center text-sm">
                        <p className="text-muted-foreground mb-2">No driver found.</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setIsAddDriverModalOpen(true)}
                          className="gap-2"
                        >
                          <UserPlus className="w-4 h-4" />
                          Add Driver
                        </Button>
                      </div>
                    </CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      {filteredDrivers.map((driver) => (
                        <CommandItem
                          key={driver.id}
                          value={`${driver.name} ${driver.phone} ${driver.license_number || ''}`}
                          onSelect={() => {
                            setSelectedDriverId(driver.id);
                            setDriverOpen(false);
                            setDriverSearch("");
                          }}
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              selectedDriverId === driver.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4 text-muted-foreground" />
                              <span className="font-medium">{driver.name}</span>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {driver.phone} • {driver.experience || 'Experience not specified'}
                            </div>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          )}

          <DialogFooter className="flex gap-2 mt-6">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button
              onClick={handleAssign}
              disabled={!selectedVehicleId || !selectedDriverId || isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Assigning...
                </>
              ) : (
                "Assign Vehicle"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 🔥 NEW: Sub-Modals for adding items */}
      <AddVehicleModal
        isOpen={isAddOwnedVehicleModalOpen}
        onClose={() => setIsAddOwnedVehicleModalOpen(false)}
        onSave={handleAddOwnedVehicle}
        defaultType="owned"
      />

      // Update the AddHiredVehicleModal call to pass selectedBrokerId and broker name
      <AddHiredVehicleModal
        isOpen={isAddHiredVehicleModalOpen}
        onClose={() => setIsAddHiredVehicleModalOpen(false)}
        onSave={handleAddHiredVehicle}
        selectedBrokerId={selectedBrokerId} // 🔥 NEW: Pass selected broker ID
        selectedBrokerName={selectedBroker?.name} // 🔥 NEW: Pass broker name for display
      />

      <AddBrokerModal
        isOpen={isAddBrokerModalOpen}
        onClose={() => setIsAddBrokerModalOpen(false)}
        onSave={handleAddBroker}
      />

      <AddDriverModal
        isOpen={isAddDriverModalOpen}
        onClose={() => setIsAddDriverModalOpen(false)}
        onSave={handleAddDriver}
      />
    </>
  );
};