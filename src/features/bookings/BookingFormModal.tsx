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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from '@/lib/supabase';

// Custom hook for debouncing
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

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

// Validate pickup date function
const validatePickupDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null;

  const selectedDate = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);

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

// Location Search Component
const LocationSearchInput = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  onLocationSelect
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  onLocationSelect?: (location: any) => void;
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    setSearchTerm(value);
  }, [value]);

  useEffect(() => {
    if (hasSelected) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    if (debouncedSearch && debouncedSearch.length > 2) {
      searchLocations(debouncedSearch);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [debouncedSearch, hasSelected]);

  const searchLocations = async (query: string) => {
    if (hasSelected) return;

    setSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query)}&` +
        `format=json&` +
        `countrycodes=in&` +
        `limit=20&` +  // ✅ Increased limit
        `addressdetails=1&` +
        `featuretype=settlement&` +
        `accept-language=en`
      );

      const data = await response.json();

      if (!hasSelected) {
        const formattedResults = data
          .map((item: any) => {
            const area = item.address?.suburb ||
              item.address?.neighbourhood ||
              item.address?.locality ||
              item.address?.hamlet ||
              item.name?.split(',')[0] ||
              '';

            const city = item.address?.city ||
              item.address?.town ||
              item.address?.village ||
              item.address?.municipality ||
              '';

            const state = item.address?.state || '';
            const postcode = item.address?.postcode || '';

            let displayText = '';
            if (area && city && area !== city) {
              displayText = `${area}, ${city}`;
            } else if (city) {
              displayText = city;
            } else if (area) {
              displayText = area;
            } else {
              displayText = item.display_name;
            }

            // ✅ Categorize result type
            const isArea = [
              'suburb',
              'neighbourhood',
              'locality',
              'hamlet',
              'quarter',
              'residential'
            ].includes(item.type);

            const isCity = [
              'city',
              'town',
              'village',
              'municipality'
            ].includes(item.type);

            return {
              area: area || city || '',
              city: city || area || '',
              state: state,
              postcode: postcode,
              display_name: item.display_name,
              displayText: displayText,
              fullAddress: `${area ? area + ', ' : ''}${city}, ${state} - ${postcode}`,
              type: item.type,
              importance: item.importance || 0,
              isArea: isArea,
              isCity: isCity,
              isActualArea: area && city && area !== city
            };
          })
          // ✅ UPDATED: Allow both areas AND cities
          .filter((item: any) => {
            const hasNonEnglish = /[^\x00-\x7F]/.test(item.displayText);
            const hasDevanagari = /[\u0900-\u097F]/.test(item.displayText);

            return (
              !hasNonEnglish &&
              !hasDevanagari &&
              item.city &&
              item.state &&
              // ✅ Accept both areas and cities
              (item.isArea || item.isCity || item.isActualArea)
            );
          })
          // Remove duplicates
          .filter((item: any, index: number, self: any[]) => {
            return index === self.findIndex((t) =>
              t.displayText === item.displayText &&
              t.city === item.city
            );
          })
          // ✅ SMART SORTING: Areas first, then cities
          .sort((a: any, b: any) => {
            // Priority 1: Actual areas (has separate area name)
            if (a.isActualArea && !b.isActualArea) return -1;
            if (!a.isActualArea && b.isActualArea) return 1;

            // Priority 2: Area types
            if (a.isArea && !b.isArea) return -1;
            if (!a.isArea && b.isArea) return 1;

            // Priority 3: Importance score
            return b.importance - a.importance;
          });

        setSuggestions(formattedResults);
        setShowSuggestions(formattedResults.length > 0);
      }
    } catch (error) {
      console.error("Error searching locations:", error);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = (location: any) => {
    const fullAddress = location.fullAddress || `${location.city}, ${location.state} - ${location.postcode}`;
    setSearchTerm(fullAddress);
    onChange(fullAddress);
    setHasSelected(true);
    setSuggestions([]);
    setShowSuggestions(false);

    if (onLocationSelect) {
      onLocationSelect(location);
    }

    toast({
      title: "✅ Location Selected",
      description: location.displayText,
    });
  };

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    onChange(newValue);
    if (hasSelected) {
      setHasSelected(false);
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    onChange("");
    setHasSelected(false);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-10 h-11 border-muted-foreground/20 focus:border-primary transition-all"
          disabled={disabled}
          autoComplete="off"
        />
        {searching && (
          <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin" />
        )}
        {searchTerm && !searching && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1.5 h-8 w-8 p-0"
            onClick={handleClear}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && !hasSelected && (
        <div className="absolute z-50 w-full bg-background border rounded-md mt-1 shadow-lg max-h-[300px] overflow-auto">
          {suggestions.map((location, index) => (
            <div
              key={index}
              className={cn(
                "px-3 py-3 hover:bg-accent cursor-pointer border-b last:border-b-0 transition-colors",
                // ✅ Light highlight for areas
                location.isActualArea && "bg-primary/5"
              )}
              onClick={() => handleSelect(location)}
            >
              <div className="flex items-start gap-2">
                <MapPin className={cn(
                  "h-4 w-4 mt-0.5 shrink-0",
                  // ✅ Different colors for area vs city
                  location.isActualArea ? "text-primary" : "text-muted-foreground"
                )} />
                <div className="flex-1">
                  {/* ✅ Area vs City Display */}
                  <div className="font-medium text-sm">
                    {location.area && location.city && location.area !== location.city ? (
                      // AREA format
                      <>
                        <span className="text-primary font-semibold">{location.area}</span>
                        <span className="text-muted-foreground font-normal"> • {location.city}</span>
                      </>
                    ) : (
                      // CITY format
                      <span className="text-foreground">{location.city}</span>
                    )}
                  </div>

                  {/* State + Pincode + Type Badge */}
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">
                      {location.state}
                      {location.postcode && ` • PIN: ${location.postcode}`}
                    </span>

                    {/* ✅ Type Badge with different colors */}
                    <span className={cn(
                      "text-xs px-1.5 py-0.5 rounded font-medium",
                      location.isActualArea
                        ? "bg-primary/20 text-primary"
                        : "bg-muted text-muted-foreground"
                    )}>
                      {location.isActualArea ? 'Area' : 'City'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {hasSelected && (
        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
          <Check className="w-3 h-3" />
          Location selected
        </p>
      )}
    </div>
  );
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
      if (!searchTerm) {
        setLoading(true);
        try {
          let query = supabase
            .from('parties')
            .select('*')
            .eq('status', 'ACTIVE')
            .order('created_at', { ascending: false })
            .limit(10);

          if (type && type !== 'BOTH') {
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
        return;
      }

      setLoading(true);
      try {
        let query = supabase
          .from('parties')
          .select('*')
          .eq('status', 'ACTIVE');

        const searchPattern = `%${searchTerm}%`;
        query = query.or(`name.ilike.${searchPattern},contact_person.ilike.${searchPattern},phone.ilike.${searchPattern}`);

        if (type && type !== 'BOTH') {
          query = query.or(`party_type.eq.${type},party_type.eq.BOTH`);
        }

        const { data, error } = await query;
        if (error) throw error;
        setParties(data || []);
      } catch (error) {
        console.error('Error searching parties:', error);
        setParties([]);
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
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Search ${type?.toLowerCase() || 'party'}...`}
            value={searchTerm}
            onValueChange={setSearchTerm}
          />
          <CommandEmpty>
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">
                {searchTerm ? `No ${type?.toLowerCase() || 'party'} found for "${searchTerm}"` : `No ${type?.toLowerCase() || 'party'} found.`}
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
            {!loading && parties.map((party) => (
              <CommandItem
                key={party.id}
                value={party.name}
                onSelect={() => {
                  onValueChange(party.id, party);
                  setOpen(false);
                  setSearchTerm("");
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
  const [locationSearch, setLocationSearch] = useState("");

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

  useEffect(() => {
    if (!isOpen) {
      setLocationSearch("");
      setFormData({
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
    }
  }, [isOpen]);

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
        title: "✅ Success",
        description: `${type} added successfully`,
      });

      onSave(data);
      onClose();
    } catch (error) {
      console.error('Error adding party:', error);
      toast({
        title: "❌ Error",
        description: "Failed to add party",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
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
                maxLength={10}
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
            <Label>
              Search Area/City
              {locationSearch && (
                <span className="text-xs text-green-500 ml-2">
                  ✓ Location selected
                </span>
              )}
            </Label>
            <LocationSearchInput
              value={locationSearch}
              onChange={(value) => setLocationSearch(value)}
              placeholder="Search area/city to auto-fill..."
              disabled={loading}
              onLocationSelect={(location) => {
                // ✅ Smart detection: Area or City
                const addressLine = location.area && location.area !== location.city
                  ? location.area
                  : '';

                setFormData(prev => ({
                  ...prev,
                  address_line1: addressLine || prev.address_line1,
                  city: location.city || prev.city,
                  state: location.state || prev.state,
                  pincode: location.postcode || prev.pincode
                }));

                setLocationSearch(location.displayText);
              }}
            />
            <p className="text-xs text-muted-foreground mt-1">
              🔍 Search area (Gunjan) or city (Vapi) - both work!
            </p>
          </div>

          <div>
            <Label>Address Line 1 *</Label>
            <Input
              value={formData.address_line1}
              onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
              placeholder="Building/Street address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>
                City *
                {formData.city && (
                  <Check className="inline w-3 h-3 text-green-500 ml-1" />
                )}
              </Label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="City"
                className={cn(
                  formData.city && "border-green-500/50"
                )}
              />
            </div>
            <div>
              <Label>
                State *
                {formData.state && (
                  <Check className="inline w-3 h-3 text-green-500 ml-1" />
                )}
              </Label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="State"
                className={cn(
                  formData.state && "border-green-500/50"
                )}
              />
            </div>
          </div>

          <div>
            <Label>
              Pincode *
              {formData.pincode && formData.pincode.length === 6 && (
                <Check className="inline w-3 h-3 text-green-500 ml-1" />
              )}
            </Label>
            <Input
              value={formData.pincode}
              onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              placeholder="6-digit pincode"
              maxLength={6}
              className={cn(
                formData.pincode.length === 6 && "border-green-500/50"
              )}
            />
          </div>

          <div>
            <Label>GST Number</Label>
            <Input
              value={formData.gst_number}
              onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
              placeholder="GST Number (optional)"
              maxLength={15}
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
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const isoString = `${year}-${month}-${day}`;

      const error = validatePickupDate(isoString);
      setDateError(error);
      setFormData({ ...formData, pickupDate: isoString });
    } else {
      setFormData({ ...formData, pickupDate: undefined });
      setDateError(null);
    }
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
      };

      console.log('📤 Creating booking:', bookingData);

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

  const getMinDate = () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    return twoDaysAgo;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Booking</DialogTitle>
          </DialogHeader>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Entry</CardTitle>
              <CardDescription>
                Fill in the details to create a new booking
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
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
                      ✓ {formData.consignorName}
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
                      ✓ {formData.consigneeName}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="from">Pickup Location *</Label>
                  <LocationSearchInput
                    value={formData.fromLocation}
                    onChange={(value) => setFormData({ ...formData, fromLocation: value })}
                    placeholder="Search pickup area/city..."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    🔍 Auto-filled from consignor or search to change
                  </p>
                </div>

                <div>
                  <Label htmlFor="to">Drop Location *</Label>
                  <LocationSearchInput
                    value={formData.toLocation}
                    onChange={(value) => setFormData({ ...formData, toLocation: value })}
                    placeholder="Search drop area/city..."
                    disabled={loading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    🔍 Auto-filled from consignee or search to change
                  </p>
                </div>
              </div>

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
                  <DatePicker
                    selected={formData.pickupDate ? new Date(formData.pickupDate) : null}
                    onChange={handleDateChange}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY (Optional)"
                    minDate={getMinDate()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                    className={`flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm ${dateError ? 'border-destructive' : 'border-input'}`}
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
            </CardContent>
          </Card>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !formData.consignor_id || !formData.consignee_id}
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Create Booking
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <QuickAddPartyModal
        isOpen={addPartyModal.isOpen}
        onClose={() => setAddPartyModal({ ...addPartyModal, isOpen: false })}
        onSave={handleNewPartyAdded}
        type={addPartyModal.type}
      />
    </>
  );
};