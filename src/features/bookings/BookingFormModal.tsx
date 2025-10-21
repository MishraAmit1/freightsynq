import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Loader2, Check, ChevronsUpDown, Plus, User, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase';

// Party interface
interface Party {
  id: string;
  name: string;
  contact_person?: string;
  phone: string;
  email?: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  gst_number?: string;
  pan_number?: string;
  party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
  status: 'ACTIVE' | 'INACTIVE';
}

// Form data interface
interface BookingFormData {
  consignor_id: string;
  consignee_id: string;
  consignorName?: string;
  consigneeName?: string;
  fromLocation: string;
  toLocation: string;
  serviceType: "FTL" | "PTL";
  pickupDate?: string;
}

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
}

// ✅ UPDATED - Date validation function (2 days pehle se allow kare)
const validatePickupDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null; // Optional field

  const selectedDate = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // ✅ Allow 2 days in the past
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

  if (isNaN(selectedDate.getTime())) {
    return "Invalid date format";
  }

  if (selectedDate < twoDaysAgo) {
    return "Pickup date cannot be more than 2 days in the past";
  }

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (selectedDate > maxDate) {
    return "Pickup date cannot be more than 1 year in the future";
  }

  return null;
};

// Party Select Component
const PartySelect = ({
  value,
  onValueChange,
  type,
  placeholder = "Select party...",
  disabled = false,
  onAddNew
}: {
  value?: string;
  onValueChange: (value: string, party: Party) => void;
  type: 'CONSIGNOR' | 'CONSIGNEE';
  placeholder?: string;
  disabled?: boolean;
  onAddNew?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadParties = async () => {
      if (searchTerm.length < 1) {
        if (!searchTerm) {
          setLoading(true);
          try {
            let query = supabase
              .from('parties')
              .select('*')
              .eq('status', 'ACTIVE')
              .order('created_at', { ascending: false })
              .limit(10);

            if (type !== 'BOTH') {
              query = query.or(`party_type.eq.${type},party_type.eq.BOTH`);
            }

            const { data, error } = await query;
            if (error) throw error;
            setParties(data || []);
          } catch (error) {
            console.error('Error loading parties:', error);
          } finally {
            setLoading(false);
          }
        }
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from('parties')
          .select('*')
          .eq('status', 'ACTIVE')
          .ilike('name', `%${searchTerm}%`)
          .limit(10);

        if (type !== 'BOTH') {
          query = query.or(`party_type.eq.${type},party_type.eq.BOTH`);
        }
        const { data, error } = await query;
        if (error) throw error;
        setParties(data || []);
      } catch (error) {
        console.error('Error searching parties:', error);
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(loadParties, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, type]);

  const selectedParty = parties.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedParty ? selectedParty.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command>
          <CommandInput
            placeholder={`Search ${type.toLowerCase()}...`}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                No {type.toLowerCase()} found.
              </p>
              {onAddNew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    onAddNew();
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New {type === 'CONSIGNOR' ? 'Consignor' : 'Consignee'}
                </Button>
              )}
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {loading && (
              <div className="p-2 text-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin inline mr-2" />
                Loading...
              </div>
            )}
            {parties.map((party) => (
              <CommandItem
                key={party.id}
                value={party.id}
                onSelect={() => {
                  onValueChange(party.id, party);
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === party.id ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    <User className="w-3 h-3" />
                    {party.name}
                  </div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />
                    {party.city}, {party.state} • 📞 {party.phone}
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

// Quick Add Party Modal Component
const QuickAddPartyModal = ({
  isOpen,
  onClose,
  onSave,
  type
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (party: Party) => void;
  type: 'CONSIGNOR' | 'CONSIGNEE';
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    contact_person: '',
    phone: '',
    email: '',
    address_line1: '',
    city: '',
    state: '',
    pincode: '',
    gst_number: '',
    pan_number: '',
  });

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.address_line1 ||
      !formData.city || !formData.state || !formData.pincode) {
      toast({
        title: "Validation Error",
        description: "Please fill all required fields",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('parties')
        .insert([{
          ...formData,
          party_type: type,
          status: 'ACTIVE'
        }])
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Success",
        description: `${type} added successfully`,
      });

      onSave(data);
      onClose();
    } catch (error) {
      console.error('Error adding party:', error);
      toast({
        title: "Error",
        description: "Failed to add party",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New {type === 'CONSIGNOR' ? 'Consignor' : 'Consignee'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div>
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Party name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Phone *</Label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input
                value={formData.contact_person}
                onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                placeholder="Contact person"
              />
            </div>
          </div>

          <div>
            <Label>Address Line 1 *</Label>
            <Input
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>City *</Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
              />
            </div>
            <div>
              <Label>State *</Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
              />
            </div>
          </div>

          <div>
            <Label>Pincode *</Label>
            <Input
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="Pincode"
              maxLength={6}
            />
          </div>

          <div>
            <Label>GST Number</Label>
            <Input
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value })}
              placeholder="GST Number (optional)"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Add {type === 'CONSIGNOR' ? 'Consignor' : 'Consignee'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// MAIN COMPONENT
export const BookingFormModal = ({ isOpen, onClose, onSave }: BookingFormModalProps) => {
  const { toast } = useToast();
  const [dateError, setDateError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [addPartyModal, setAddPartyModal] = useState<{
    isOpen: boolean;
    type: 'CONSIGNOR' | 'CONSIGNEE';
  }>({ isOpen: false, type: 'CONSIGNOR' });

  const [formData, setFormData] = useState<BookingFormData>({
    consignor_id: "",
    consignee_id: "",
    consignorName: "",
    consigneeName: "",
    fromLocation: "",
    toLocation: "",
    serviceType: "FTL",
    pickupDate: undefined,
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        consignor_id: "",
        consignee_id: "",
        consignorName: "",
        consigneeName: "",
        fromLocation: "",
        toLocation: "",
        serviceType: "FTL",
        pickupDate: undefined,
      });
      setDateError(null);
    }
  }, [isOpen]);

  const handleConsignorSelect = (partyId: string, party: Party) => {
    const fullAddress = `${party.address_line1}, ${party.city}, ${party.state} - ${party.pincode}`;

    setFormData({
      ...formData,
      consignor_id: partyId,
      consignorName: party.name,
      fromLocation: fullAddress
    });
  };

  const handleConsigneeSelect = (partyId: string, party: Party) => {
    const fullAddress = `${party.address_line1}, ${party.city}, ${party.state} - ${party.pincode}`;

    setFormData({
      ...formData,
      consignee_id: partyId,
      consigneeName: party.name,
      toLocation: fullAddress
    });
  };

  const handleDateChange = (date: Date | null) => {
    const isoString = date ? date.toISOString().split('T')[0] : undefined;
    const error = validatePickupDate(isoString);
    setDateError(error);
    setFormData({ ...formData, pickupDate: isoString });
  };

  const handleSubmit = async () => {
    if (!formData.consignor_id || !formData.consignee_id) {
      toast({
        title: "Validation Error",
        description: "Please select both Consignor and Consignee",
        variant: "destructive"
      });
      return;
    }

    if (!formData.fromLocation.trim() || !formData.toLocation.trim()) {
      toast({
        title: "Validation Error",
        description: "Please verify pickup and drop locations",
        variant: "destructive"
      });
      return;
    }

    if (formData.pickupDate) {
      const dateError = validatePickupDate(formData.pickupDate);
      if (dateError) {
        toast({
          title: "Invalid Date",
          description: dateError,
          variant: "destructive"
        });
        return;
      }
    }

    try {
      setLoading(true);

      const bookingData = {
        consignor_id: formData.consignor_id,
        consignee_id: formData.consignee_id,
        from_location: formData.fromLocation,
        to_location: formData.toLocation,
        service_type: formData.serviceType,
        pickup_date: formData.pickupDate,
        material_description: "",
        cargo_units: ""
      };

      await onSave(bookingData);
      onClose();
    } catch (error) {
      console.error('Error in form submission:', error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewPartyAdded = (party: Party) => {
    if (addPartyModal.type === 'CONSIGNOR') {
      handleConsignorSelect(party.id, party);
    } else {
      handleConsigneeSelect(party.id, party);
    }
  };

  // ✅ Calculate minDate (2 days ago)
  const getMinDate = () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    return twoDaysAgo;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Consignor and Consignee Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="consignor">Consignor *</Label>
                <PartySelect
                  value={formData.consignor_id}
                  onValueChange={handleConsignorSelect}
                  type="CONSIGNOR"
                  placeholder="Select or search consignor..."
                  disabled={loading}
                  onAddNew={() => setAddPartyModal({ isOpen: true, type: 'CONSIGNOR' })}
                />
                {formData.consignorName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {formData.consignorName}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="consignee">Consignee *</Label>
                <PartySelect
                  value={formData.consignee_id}
                  onValueChange={handleConsigneeSelect}
                  type="CONSIGNEE"
                  placeholder="Select or search consignee..."
                  disabled={loading}
                  onAddNew={() => setAddPartyModal({ isOpen: true, type: 'CONSIGNEE' })}
                />
                {formData.consigneeName && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Selected: {formData.consigneeName}
                  </p>
                )}
              </div>
            </div>

            {/* From and To Locations */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="from">Pickup Location *</Label>
                <Input
                  id="from"
                  value={formData.fromLocation}
                  onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                  placeholder="Auto-filled from consignor"
                  disabled={loading}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can edit this if pickup is from different location
                </p>
              </div>

              <div>
                <Label htmlFor="to">Drop Location *</Label>
                <Input
                  id="to"
                  value={formData.toLocation}
                  onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                  placeholder="Auto-filled from consignee"
                  disabled={loading}
                  className="text-sm"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  You can edit this if delivery is to different location
                </p>
              </div>
            </div>

            {/* Service Type and Pickup Date */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="service">Service Type *</Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value: "FTL" | "PTL") => setFormData({ ...formData, serviceType: value })}
                  disabled={loading}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FTL">Full Truck Load (FTL)</SelectItem>
                    <SelectItem value="PTL">Part Truck Load (PTL)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="pickup">Pickup Date</Label>
                {/* ✅ UPDATED - minDate 2 days peeche */}
                <DatePicker
                  selected={formData.pickupDate ? new Date(formData.pickupDate) : null}
                  onChange={handleDateChange}
                  dateFormat="dd/MM/yyyy"
                  placeholderText="DD/MM/YYYY (Optional)"
                  minDate={getMinDate()}
                  maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                  className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${dateError ? 'border-destructive' : 'border-input'
                    }`}
                  disabled={loading}
                />
                {dateError && (
                  <p className="text-sm text-destructive mt-1">{dateError}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  ℹ️ Can select up to 2 days in the past
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button type="submit" onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quick Add Party Modal */}
      <QuickAddPartyModal
        isOpen={addPartyModal.isOpen}
        onClose={() => setAddPartyModal({ ...addPartyModal, isOpen: false })}
        onSave={handleNewPartyAdded}
        type={addPartyModal.type}
      />
    </>
  );
};