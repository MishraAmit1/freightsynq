import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { supabase } from '@/lib/supabase'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Truck,
  User,
  Loader2,
  Building2,
  Package,
  Check,
  ChevronDown,
  Plus,
  UserPlus,
  X
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
import { createDriver } from "@/api/drivers";
import { AddVehicleModal } from "../vehicles/AddVehicleModal";
import { AddHiredVehicleModal } from "../vehicles/AddHiredVehicleModal";
import { AddBrokerModal } from "../vehicles/AddBrokerModal";
import { AddDriverModal } from "./AddDriverModal";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Simple Custom Dropdown - No focus issues
const SimpleSearchSelect = ({
  items = [],
  value,
  onSelect,
  placeholder = "Select...",
  renderItem,
  onAddNew,
  addNewText = "Add New",
  searchKeys = ['name'],
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter items
  const filteredItems = items.filter(item => {
    if (!search.trim()) return true;
    const searchLower = search.toLowerCase();
    return searchKeys.some(key => {
      const value = item[key];
      return value && value.toString().toLowerCase().includes(searchLower);
    });
  });

  // Get selected item
  const selectedItem = items.find(item => item.id === value);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item) => {
    onSelect(item.id);
    setSearch("");
    setIsOpen(false);
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (selectedItem) {
      setSearch("");
    }
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onSelect(null);
    setSearch("");
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {/* Input Field */}
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={isOpen ? search : (selectedItem ?
            (selectedItem.vehicle_number || selectedItem.name || '') : ''
          )}
          onChange={(e) => setSearch(e.target.value)}
          onClick={handleInputClick}
          placeholder={placeholder}
          className="pr-8"
        />

        {/* Icons */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {selectedItem && !isOpen && (
            <button
              type="button"
              onClick={handleClear}
              className="hover:bg-accent rounded p-0.5"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
          <ChevronDown className={cn(
            "h-4 w-4 text-muted-foreground transition-transform",
            isOpen && "rotate-180"
          )} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg overflow-hidden">
          <div className="max-h-[280px] overflow-y-auto">
            {filteredItems.length === 0 ? (
              <div className="p-3 text-center">
                <p className="text-sm text-muted-foreground">No results found</p>
                {onAddNew && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="mt-2 w-full"
                    onClick={() => {
                      setIsOpen(false);
                      onAddNew();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {addNewText}
                  </Button>
                )}
              </div>
            ) : (
              <>
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => handleItemClick(item)}
                    className={cn(
                      "px-3 py-2 cursor-pointer hover:bg-accent transition-colors",
                      value === item.id && "bg-accent"
                    )}
                  >
                    {renderItem ? renderItem(item, value === item.id) : (
                      <div className="flex items-center justify-between">
                        <span>{item.name || item.vehicle_number}</span>
                        {value === item.id && (
                          <Check className="h-4 w-4 text-primary" />
                        )}
                      </div>
                    )}
                  </div>
                ))}

                {onAddNew && (
                  <div className="border-t">
                    <button
                      type="button"
                      className="w-full px-3 py-2 text-left hover:bg-accent transition-colors flex items-center text-sm"
                      onClick={() => {
                        setIsOpen(false);
                        onAddNew();
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {addNewText}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

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

  // Sub-modal states
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
      // Reset states when modal opens
      setSelectedVehicleId("");
      setSelectedDriverId("");
      setSelectedBrokerId("");
      setActiveTab("owned");
    }
  }, [isOpen]);

  useEffect(() => {
    // Reset vehicle when broker changes
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

      setOwnedVehicles(ownedData || []);
      setHiredVehicles(hiredData || []);
      setDrivers(driversData || []);
      setBrokers(brokersData || []);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
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
          title: "Success",
          description: `Vehicle ${selectedVehicle.vehicle_number} assigned successfully`,
        });

        onClose();
      }
    } catch (error) {
      console.error('Error assigning vehicle:', error);
      toast({
        title: "Error",
        description: "Failed to assign vehicle",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Add handlers
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

      await loadData();
      setSelectedVehicleId(newVehicle.id);
      setIsAddOwnedVehicleModalOpen(false);

      toast({
        title: "Success",
        description: "Vehicle added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add vehicle",
        variant: "destructive"
      });
    }
  };

  const handleAddHiredVehicle = async (vehicleData: any) => {
    try {
      const newVehicle = await createHiredVehicle({
        vehicle_number: vehicleData.vehicleNumber,
        vehicle_type: vehicleData.vehicleType,
        capacity: vehicleData.capacity,
        broker_id: vehicleData.brokerId,
        rate_per_trip: vehicleData.ratePerTrip ? parseFloat(vehicleData.ratePerTrip) : undefined,
      });

      await loadData();
      setSelectedBrokerId(vehicleData.brokerId);
      setSelectedVehicleId(newVehicle.id);
      setIsAddHiredVehicleModalOpen(false);

      toast({
        title: "Success",
        description: "Hired vehicle added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add hired vehicle",
        variant: "destructive"
      });
    }
  };

  const handleAddBroker = async (brokerData: any) => {
    try {
      const newBroker = await createBroker({
        name: brokerData.name,
        contact_person: brokerData.contactPerson,
        phone: brokerData.phone,
        email: brokerData.email || undefined
      });

      await loadData();
      setSelectedBrokerId(newBroker.id);
      setIsAddBrokerModalOpen(false);

      toast({
        title: "Success",
        description: "Broker added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add broker",
        variant: "destructive"
      });
    }
  };

  const handleAddDriver = async (driverData: any) => {
    try {
      const newDriver = await createDriver({
        name: driverData.name,
        phone: driverData.phone,
        license_number: driverData.license_number,
        experience: driverData.experience,
      });

      await loadData();
      setSelectedDriverId(newDriver.id);
      setIsAddDriverModalOpen(false);

      toast({
        title: "Success",
        description: "Driver added successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add driver",
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

  const selectedBroker = brokers.find(b => b.id === selectedBrokerId);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assign Vehicle</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Booking ID: {bookingId}
            </p>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="owned">
                  Owned Vehicles ({ownedVehicles.length})
                </TabsTrigger>
                <TabsTrigger value="hired">
                  Hired Vehicles ({hiredVehicles.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="owned" className="space-y-4">
                <div>
                  <Label className="mb-2 block">Select Vehicle</Label>
                  <SimpleSearchSelect
                    items={ownedVehicles}
                    value={selectedVehicleId}
                    onSelect={setSelectedVehicleId}
                    placeholder="Search vehicle number..."
                    searchKeys={['vehicle_number', 'vehicle_type']}
                    onAddNew={() => setIsAddOwnedVehicleModalOpen(true)}
                    addNewText="Add New Vehicle"
                    renderItem={(vehicle, isSelected) => (
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">
                              {vehicle.vehicle_number}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {vehicle.vehicle_type} • {vehicle.capacity}
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </div>
                    )}
                  />
                </div>
              </TabsContent>

              <TabsContent value="hired" className="space-y-4">
                <div>
                  <Label className="mb-2 block">Select Broker</Label>
                  <SimpleSearchSelect
                    items={brokers}
                    value={selectedBrokerId}
                    onSelect={setSelectedBrokerId}
                    placeholder="Search broker name..."
                    searchKeys={['name', 'contact_person']}
                    onAddNew={() => setIsAddBrokerModalOpen(true)}
                    addNewText="Add New Broker"
                    renderItem={(broker, isSelected) => (
                      <div>
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{broker.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {broker.contact_person} • {broker.phone}
                            </div>
                          </div>
                          {isSelected && <Check className="h-4 w-4 text-primary" />}
                        </div>
                      </div>
                    )}
                  />
                </div>

                {selectedBrokerId && (
                  <div>
                    <Label className="mb-2 block">Select Vehicle</Label>
                    <SimpleSearchSelect
                      items={hiredVehicles}
                      value={selectedVehicleId}
                      onSelect={setSelectedVehicleId}
                      placeholder="Search vehicle number..."
                      searchKeys={['vehicle_number', 'vehicle_type']}
                      onAddNew={() => setIsAddHiredVehicleModalOpen(true)}
                      addNewText="Add New Vehicle"
                      renderItem={(vehicle, isSelected) => (
                        <div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">
                                {vehicle.vehicle_number}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {vehicle.vehicle_type} • {vehicle.capacity}
                              </div>
                            </div>
                            {isSelected && <Check className="h-4 w-4 text-primary" />}
                          </div>
                        </div>
                      )}
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Driver Selection */}
            {selectedVehicleId && (
              <div>
                <Label className="mb-2 block">Select Driver</Label>
                <SimpleSearchSelect
                  items={drivers}
                  value={selectedDriverId}
                  onSelect={setSelectedDriverId}
                  placeholder="Search driver name or phone..."
                  searchKeys={['name', 'phone']}
                  onAddNew={() => setIsAddDriverModalOpen(true)}
                  addNewText="Add New Driver"
                  renderItem={(driver, isSelected) => (
                    <div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">{driver.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {driver.phone} • {driver.experience || 'No experience'}
                          </div>
                        </div>
                        {isSelected && <Check className="h-4 w-4 text-primary" />}
                      </div>
                    </div>
                  )}
                />
              </div>
            )}
          </div>

          <DialogFooter>
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

      {/* Sub-Modals */}
      <AddVehicleModal
        isOpen={isAddOwnedVehicleModalOpen}
        onClose={() => setIsAddOwnedVehicleModalOpen(false)}
        onSave={handleAddOwnedVehicle}
      />

      <AddHiredVehicleModal
        isOpen={isAddHiredVehicleModalOpen}
        onClose={() => setIsAddHiredVehicleModalOpen(false)}
        onSave={handleAddHiredVehicle}
        selectedBrokerId={selectedBrokerId}
        selectedBrokerName={selectedBroker?.name}
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