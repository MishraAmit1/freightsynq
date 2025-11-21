import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { X, Loader2, Check, ChevronsUpDown, Plus, User, MapPin, Save, Package, Badge, AlertCircle, Calendar, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { supabase } from '@/lib/supabase';
import { CompanyBranch, fetchCompanyBranches } from "@/api/bookings";

// Custom hook for debouncing
const useDebounce = (value: string, delay: number) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => { clearTimeout(handler); };
  }, [value, delay]);
  return debouncedValue;
};

// Interfaces
interface Party {
  id: string; name: string; contact_person?: string; phone: string; email?: string;
  address_line1: string; city: string; state: string; pincode: string;
  gst_number?: string; pan_number?: string; party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH'; status: 'ACTIVE' | 'INACTIVE';
}
interface BookingFormData {
  consignor_id: string; consignee_id: string; consignorName?: string; consigneeName?: string;
  fromLocation: string; toLocation: string; serviceType: "FTL" | "PTL"; pickupDate?: string;
  branch_id?: string;
}
interface BookingFormModalProps {
  isOpen: boolean; onClose: () => void; onSave: (data: any) => void;
}

const validatePickupDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null;
  const selectedDate = new Date(dateString + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);
  if (isNaN(selectedDate.getTime())) return "Invalid date format";
  if (selectedDate < twoDaysAgo) return "Pickup date cannot be more than 2 days in the past";
  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (selectedDate > maxDate) return "Pickup date cannot be more than 1 year in the future";
  return null;
};

const LocationSearchInput = ({
  value, onChange, placeholder, disabled = false, onLocationSelect
}: {
  value: string; onChange: (value: string) => void; placeholder: string;
  disabled?: boolean; onLocationSelect?: (location: any) => void;
}) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState(value);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searching, setSearching] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => { setSearchTerm(value); }, [value]);

  useEffect(() => {
    if (hasSelected) { setSuggestions([]); setShowSuggestions(false); return; }
    if (debouncedSearch && debouncedSearch.length > 2) { searchLocations(debouncedSearch); }
    else { setSuggestions([]); setShowSuggestions(false); }
  }, [debouncedSearch, hasSelected]);

  const searchLocations = async (query: string) => {
    if (hasSelected) return;
    setSearching(true);
    const sessionToken = Math.random().toString(36).substring(7);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
      if (apiKey) {
        const response = await fetch(
          'https://places.googleapis.com/v1/places:autocomplete',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Goog-Api-Key': apiKey,
              'X-Goog-FieldMask': 'suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat'
            },
            body: JSON.stringify({
              input: query,
              includedRegionCodes: ['in'],
              sessionToken: sessionToken,
              languageCode: 'en',
              locationBias: {
                rectangle: {
                  low: { latitude: 8.0, longitude: 68.0 },
                  high: { latitude: 37.0, longitude: 97.0 }
                }
              }
            })
          }
        );

        if (response.ok) {
          const data = await response.json();
          if (!hasSelected && data.suggestions) {
            const formattedResults = data.suggestions.map((suggestion: any) => {
              const prediction = suggestion.placePrediction;
              const mainText = prediction.structuredFormat?.mainText?.text || prediction.text?.text || '';
              const secondaryText = prediction.structuredFormat?.secondaryText?.text || '';
              const isArea = secondaryText && !mainText.includes(secondaryText);
              return {
                placeId: prediction.placeId,
                area: isArea ? mainText : '',
                city: isArea ? secondaryText.split(',')[0] : mainText,
                state: secondaryText ? secondaryText.split(',').slice(-1)[0].trim() : '',
                displayText: prediction.text?.text || mainText,
                mainText: mainText,
                secondaryText: secondaryText,
                isActualArea: isArea,
                fullText: prediction.text?.text || '',
                isGoogle: true
              };
            });
            setSuggestions(formattedResults);
            setShowSuggestions(formattedResults.length > 0);
            return;
          }
        }
      }
      throw new Error("Falling back to Nominatim");

    } catch (error) {
      try {
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=20&addressdetails=1&featuretype=settlement&accept-language=en`
        );
        const data = await fallbackResponse.json();
        if (!hasSelected) {
          const formattedResults = data
            .map((item: any) => {
              const area = item.address?.suburb || item.address?.neighbourhood || item.address?.locality || item.address?.hamlet || item.name?.split(',')[0] || '';
              const city = item.address?.city || item.address?.town || item.address?.village || item.address?.municipality || '';
              const state = item.address?.state || '';
              const postcode = item.address?.postcode || '';
              let displayText = '';
              if (area && city && area !== city) { displayText = `${area}, ${city}`; }
              else if (city) { displayText = city; }
              else if (area) { displayText = area; }
              else { displayText = item.display_name; }
              const isArea = ['suburb', 'neighbourhood', 'locality', 'hamlet', 'quarter', 'residential'].includes(item.type);
              const isCity = ['city', 'town', 'village', 'municipality'].includes(item.type);
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
                isActualArea: area && city && area !== city,
                isNominatim: true
              };
            })
            .filter((item: any) => {
              const hasNonEnglish = /[^\x00-\x7F]/.test(item.displayText);
              const hasDevanagari = /[\u0900-\u097F]/.test(item.displayText);
              return !hasNonEnglish && !hasDevanagari && item.city && item.state && (item.isArea || item.isCity || item.isActualArea);
            })
            .filter((item: any, index: number, self: any[]) => index === self.findIndex((t) => t.displayText === item.displayText && t.city === item.city))
            .sort((a: any, b: any) => {
              if (a.isActualArea && !b.isActualArea) return -1;
              if (!a.isActualArea && b.isActualArea) return 1;
              if (a.isArea && !b.isArea) return -1;
              if (!a.isArea && b.isArea) return 1;
              return b.importance - a.importance;
            });
          setSuggestions(formattedResults);
          setShowSuggestions(formattedResults.length > 0);
        }
      } catch (fallbackError) {
        console.error("Both search methods failed:", fallbackError);
      }
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (location: any) => {
    setSearching(true);
    try {
      let finalLocation = { ...location };
      if (location.placeId && location.isGoogle) {
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;
        if (apiKey) {
          const detailsResponse = await fetch(
            `https://places.googleapis.com/v1/places/${location.placeId}?key=${apiKey}&fields=addressComponents,location,displayName`,
            { method: 'GET', headers: { 'X-Goog-FieldMask': 'addressComponents,location,displayName' } }
          );
          if (detailsResponse.ok) {
            const placeDetails = await detailsResponse.json();
            const components = placeDetails.addressComponents || [];
            let locationData = { area: '', city: '', state: '', postcode: '' };
            components.forEach((comp: any) => {
              const types = comp.types || [];
              if (types.includes('sublocality_level_1') || types.includes('sublocality') || types.includes('neighborhood')) { locationData.area = comp.longText || comp.shortText; }
              if (types.includes('locality')) { locationData.city = comp.longText || comp.shortText; }
              if (types.includes('administrative_area_level_1')) { locationData.state = comp.longText || comp.shortText; }
              if (types.includes('postal_code')) { locationData.postcode = comp.longText || comp.shortText; }
            });
            if (!locationData.area && location.mainText) { locationData.area = location.mainText; }
            finalLocation = { ...location, area: locationData.area, city: locationData.city, state: locationData.state, postcode: locationData.postcode };
          }
        }
      }
      const fullAddress = finalLocation.fullAddress || `${finalLocation.area ? finalLocation.area + ', ' : ''}${finalLocation.city}, ${finalLocation.state}${finalLocation.postcode ? ' - ' + finalLocation.postcode : ''}`;
      setSearchTerm(fullAddress);
      onChange(fullAddress);
      setHasSelected(true);
      setSuggestions([]);
      setShowSuggestions(false);
      if (onLocationSelect) { onLocationSelect(finalLocation); }
      toast({ title: finalLocation.isGoogle ? "✅ Location Selected (Google)" : "✅ Location Selected", description: finalLocation.displayText });
    } catch (error) {
      console.error("Error selecting location:", error);
      toast({ title: "❌ Error", description: "Failed to get location details", variant: "destructive" });
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (newValue: string) => {
    setSearchTerm(newValue);
    onChange(newValue);
    if (hasSelected) { setHasSelected(false); }
  };

  const handleClear = () => {
    setSearchTerm(""); onChange(""); setHasSelected(false); setSuggestions([]); setShowSuggestions(false);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={searchTerm} onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder} className="pl-9 pr-9 h-9 text-sm mt-1" disabled={disabled} autoComplete="off"
        />
        {searching && <Loader2 className="absolute right-9 top-2.5 h-3.5 w-3.5 animate-spin" />}
        {searchTerm && !searching && (
          <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-7 w-7 p-0" onClick={handleClear}>
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      {showSuggestions && suggestions.length > 0 && !hasSelected && (
        <div className="absolute z-50 w-full bg-background border rounded-md mt-1 shadow-lg max-h-[200px] overflow-auto">
          {suggestions.map((location, index) => (
            <div key={index} className={cn("px-3 py-2 hover:bg-accent cursor-pointer border-b", location.isActualArea && "bg-primary/5")} onClick={() => handleSelect(location)}>
              <div className="flex items-start gap-2">
                <MapPin className={cn("h-4 w-4 mt-0.5 shrink-0", location.isActualArea ? "text-primary" : "text-muted-foreground")} />
                <div className="flex-1">
                  <div className="font-medium text-sm">
                    {location.area && location.city && location.area !== location.city ? (
                      <><span className="text-primary font-semibold">{location.area}</span><span className="text-muted-foreground font-normal"> • {location.city}</span></>
                    ) : (
                      <span className="text-foreground">{location.city || location.mainText}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{location.state}{location.postcode && ` • PIN: ${location.postcode}`}</span>
                    <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium", location.isActualArea ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground")}>
                      {location.isActualArea ? 'Area' : 'City'}
                    </span>
                    {location.isGoogle && <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">✓ Google</span>}
                    {location.isNominatim && <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">Backup</span>}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {hasSelected && (
        <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
          <Check className="w-3 h-3" /> Location selected
        </p>
      )}
    </div>
  );
};

const PartySelect = ({
  value, onValueChange, type, placeholder = "Select party...", disabled = false, onAddNew
}: {
  value?: string; onValueChange: (value: string, party: Party) => void; type: 'CONSIGNOR' | 'CONSIGNEE';
  placeholder?: string; disabled?: boolean; onAddNew?: () => void;
}) => {
  const [open, setOpen] = useState(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadParties = async () => {
      setLoading(true);
      try {
        let query = supabase.from('parties').select('*').eq('status', 'ACTIVE');
        if (searchTerm) {
          query = query.or(`name.ilike.%${searchTerm}%,contact_person.ilike.%${searchTerm}%,phone.ilike.%${searchTerm}%`);
        }
        if (type && type !== 'BOTH') {
          query = query.or(`party_type.eq.${type},party_type.eq.BOTH`);
        }
        query = query.order('created_at', { ascending: false }).limit(10);
        const { data, error } = await query;
        if (error) throw error;
        setParties(data || []);
      } catch (error) { console.error('Error searching parties:', error); setParties([]); }
      finally { setLoading(false); }
    };
    const debounceTimer = setTimeout(loadParties, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm, type]);

  const selectedParty = parties.find(p => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className="w-full justify-between h-9 text-sm" disabled={disabled}>
          <span className="truncate">{selectedParty ? selectedParty.name : placeholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder={`Search ${type?.toLowerCase() || 'party'}...`} value={searchTerm} onValueChange={setSearchTerm} />
          <CommandEmpty>
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-2">No party found.</p>
              {onAddNew && (
                <Button variant="outline" size="sm" onClick={() => { setOpen(false); onAddNew(); }}>
                  <Plus className="mr-2 h-4 w-4" /> Add New {type === 'CONSIGNOR' ? 'Consignor' : 'Consignee'}
                </Button>
              )}
            </div>
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-auto">
            {loading && <div className="p-2 text-center text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Loading...</div>}
            {!loading && parties.map((party) => (
              <CommandItem key={party.id} value={party.name} onSelect={() => { onValueChange(party.id, party); setOpen(false); setSearchTerm(""); }} className="cursor-pointer">
                <Check className={cn("mr-2 h-4 w-4", value === party.id ? "opacity-100" : "opacity-0")} />
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2"><User className="w-3 h-3" />{party.name}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" />{party.city}, {party.state} • 📞 {party.phone}</div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

const QuickAddPartyDrawer = ({
  isOpen, onClose, onSave, type
}: {
  isOpen: boolean; onClose: () => void; onSave: (party: Party) => void; type: 'CONSIGNOR' | 'CONSIGNEE';
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [formData, setFormData] = useState({ name: '', contact_person: '', phone: '', email: '', address_line1: '', city: '', state: '', pincode: '', gst_number: '', pan_number: '' });

  useEffect(() => {
    if (!isOpen) {
      setLocationSearch("");
      setFormData({ name: '', contact_person: '', phone: '', email: '', address_line1: '', city: '', state: '', pincode: '', gst_number: '', pan_number: '' });
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.phone || !formData.address_line1 || !formData.city || !formData.state || !formData.pincode) {
      toast({ title: "❌ Validation Error", description: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.from('parties').insert([{ ...formData, party_type: type, status: 'ACTIVE' }]).select().single();
      if (error) throw error;
      toast({ title: "✅ Success", description: `${type} added successfully` });
      onSave(data);
      onClose();
    } catch (error) {
      console.error('Error adding party:', error);
      toast({ title: "❌ Error", description: "Failed to add party", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Add New {type === 'CONSIGNOR' ? 'Consignor' : 'Consignee'}
          </SheetTitle>
        </SheetHeader>
        <div className="space-y-4 py-6">
          <div>
            <Label className="text-xs">Name <span className="text-red-500">*</span></Label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Party name" className="h-9 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Phone <span className="text-red-500">*</span></Label>
              <Input value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} placeholder="Phone number" maxLength={10} className="h-9 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">Contact Person</Label>
              <Input value={formData.contact_person} onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })} placeholder="Contact person" className="h-9 text-sm mt-1" />
            </div>
          </div>
          <Separator className="my-4" />
          <div>
            <Label className="text-xs">Search Area/City {locationSearch && <Check className="inline w-3 h-3 text-green-500 ml-1" />}</Label>
            <LocationSearchInput
              value={locationSearch} onChange={(value) => setLocationSearch(value)} placeholder="Search area/city to auto-fill..."
              disabled={loading}
              onLocationSelect={(location) => {
                const addressLine = location.area && location.area !== location.city ? location.area : '';
                setFormData(prev => ({ ...prev, address_line1: addressLine || prev.address_line1, city: location.city || prev.city, state: location.state || prev.state, pincode: location.postcode || prev.pincode }));
                setLocationSearch(location.displayText);
              }}
            />
            <p className="text-[10px] text-muted-foreground mt-1">🔍 Powered by Google Places</p>
          </div>
          <div>
            <Label className="text-xs">Address Line 1 <span className="text-red-500">*</span></Label>
            <Input value={formData.address_line1} onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })} placeholder="Building/Street address" className="h-9 text-sm mt-1" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">City <span className="text-red-500">*</span> {formData.city && <Check className="inline w-3 h-3 text-green-500 ml-1" />}</Label>
              <Input value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" className={cn("h-9 text-sm mt-1", formData.city && "border-green-500/50")} />
            </div>
            <div>
              <Label className="text-xs">State <span className="text-red-500">*</span> {formData.state && <Check className="inline w-3 h-3 text-green-500 ml-1" />}</Label>
              <Input value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State" className={cn("h-9 text-sm mt-1", formData.state && "border-green-500/50")} />
            </div>
          </div>
          <div>
            <Label className="text-xs">Pincode <span className="text-red-500">*</span> {formData.pincode && formData.pincode.length === 6 && <Check className="inline w-3 h-3 text-green-500 ml-1" />}</Label>
            <Input value={formData.pincode} onChange={(e) => setFormData({ ...formData, pincode: e.target.value })} placeholder="6-digit pincode" maxLength={6} className={cn("h-9 text-sm mt-1", formData.pincode.length === 6 && "border-green-500/50")} />
          </div>
          <div>
            <Label className="text-xs">GST Number</Label>
            <Input value={formData.gst_number} onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })} placeholder="GST Number (optional)" maxLength={15} className="h-9 text-sm mt-1" />
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading} size="sm"><X className="w-3.5 h-3.5 mr-2" />Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading} size="sm">
              {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
              <Save className="w-3.5 h-3.5 mr-2" />Add {type === 'CONSIGNOR' ? 'Consignor' : 'Consignee'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const BookingFormModal = ({ isOpen, onClose, onSave }: BookingFormModalProps) => {
  const { toast } = useToast();
  const [dateError, setDateError] = useState<string | null>(null);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loading, setLoading] = useState(false);
  const [addPartyModal, setAddPartyModal] = useState<{ isOpen: boolean; type: 'CONSIGNOR' | 'CONSIGNEE' }>({ isOpen: false, type: 'CONSIGNOR' });
  const [formData, setFormData] = useState<BookingFormData>({
    consignor_id: "", consignee_id: "", consignorName: "", consigneeName: "",
    fromLocation: "", toLocation: "", serviceType: "FTL", pickupDate: undefined,
    branch_id: ""
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        consignor_id: "", consignee_id: "", consignorName: "", consigneeName: "",
        fromLocation: "", toLocation: "", serviceType: "FTL", pickupDate: undefined,
      });
      setDateError(null);
      const loadBranches = async () => {
        setLoadingBranches(true);
        try {
          const branchData = await fetchCompanyBranches();
          setBranches(branchData);

          const defaultBranch = branchData.find(b => b.is_default) || branchData[0];
          if (defaultBranch) {
            setFormData(prev => ({ ...prev, branch_id: defaultBranch.id }));
          }
        } catch (error) {
          console.error('Error loading branches:', error);
        } finally {
          setLoadingBranches(false);
        }
      };

      loadBranches();
    }
  }, [isOpen]);



  const handleConsignorSelect = (partyId: string, party: Party) => {
    const fullAddress = `${party.address_line1}, ${party.city}, ${party.state} - ${party.pincode}`;
    setFormData({ ...formData, consignor_id: partyId, consignorName: party.name, fromLocation: fullAddress });
  };
  const handleConsigneeSelect = (partyId: string, party: Party) => {
    const fullAddress = `${party.address_line1}, ${party.city}, ${party.state} - ${party.pincode}`;
    setFormData({ ...formData, consignee_id: partyId, consigneeName: party.name, toLocation: fullAddress });
  };
  const handleDateChange = (date: Date | null) => {
    if (date) {
      // Use local date methods to avoid timezone issues
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
      toast({ title: "Validation Error", description: "Please select both Consignor and Consignee", variant: "destructive" });
      return;
    }
    if (dateError) {
      toast({ title: "Invalid Date", description: dateError, variant: "destructive" });
      return;
    }
    if (!formData.branch_id) {
      toast({ title: "Validation Error", description: "Please select a branch", variant: "destructive" });
      return;
    }
    try {
      setLoading(true);
      const bookingData = {
        consignor_id: formData.consignor_id, consignee_id: formData.consignee_id,
        from_location: formData.fromLocation, to_location: formData.toLocation,
        service_type: formData.serviceType, pickup_date: formData.pickupDate,
        branch_id: formData.branch_id
      };
      await onSave(bookingData);
      onClose();
    } catch (error) {
      console.error('Error creating booking:', error);
      toast({ title: "Error", description: "Failed to create booking", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleNewPartyAdded = (party: Party) => {
    if (addPartyModal.type === 'CONSIGNOR') { handleConsignorSelect(party.id, party); }
    else { handleConsigneeSelect(party.id, party); }
  };
  const getMinDate = () => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    return twoDaysAgo;
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Package className="w-5 h-5 text-primary" />
              Create New Booking
            </SheetTitle>
          </SheetHeader>
          <div className="space-y-5 py-6">
            {/* Branch Selection */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">
                Branch <span className="text-red-500">*</span>
              </Label>
              {loadingBranches ? (
                <div className="flex items-center gap-2 h-9 px-3 border border-input rounded-md bg-muted/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Loading branches...</span>
                </div>
              ) : (
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) => setFormData({ ...formData, branch_id: value })}
                  disabled={loading}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select branch">
                      {formData.branch_id && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 font-mono text-xs"
                          >
                            {branches.find(b => b.id === formData.branch_id)?.branch_code}
                          </Badge>
                          <span className="text-sm">
                            {branches.find(b => b.id === formData.branch_id)?.branch_name}
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map(branch => (
                      <SelectItem key={branch.id} value={branch.id}>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="h-5 px-1.5 font-mono text-xs"
                          >
                            {branch.branch_code}
                          </Badge>
                          <span>{branch.branch_name}</span>
                          {branch.city && (
                            <span className="text-xs text-muted-foreground ml-auto">
                              {branch.city}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Party Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Consignor <span className="text-red-500">*</span>
                </Label>
                <PartySelect
                  value={formData.consignor_id}
                  onValueChange={handleConsignorSelect}
                  type="CONSIGNOR"
                  placeholder="Select or search..."
                  disabled={loading}
                  onAddNew={() => setAddPartyModal({ isOpen: true, type: 'CONSIGNOR' })}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Consignee <span className="text-red-500">*</span>
                </Label>
                <PartySelect
                  value={formData.consignee_id}
                  onValueChange={handleConsigneeSelect}
                  type="CONSIGNEE"
                  placeholder="Select or search..."
                  disabled={loading}
                  onAddNew={() => setAddPartyModal({ isOpen: true, type: 'CONSIGNEE' })}
                />
              </div>
            </div>

            <Separator />

            {/* Location Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Pickup Location <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={formData.fromLocation}
                    onChange={(e) => setFormData({ ...formData, fromLocation: e.target.value })}
                    placeholder="Auto-filled from consignor"
                    className="pl-9 h-9 text-sm bg-muted/50"
                    disabled={loading}
                    readOnly
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Drop Location <span className="text-red-500">*</span>
                </Label>
                <div className="relative">
                  <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <Input
                    value={formData.toLocation}
                    onChange={(e) => setFormData({ ...formData, toLocation: e.target.value })}
                    placeholder="Auto-filled from consignee"
                    className="pl-9 h-9 text-sm bg-muted/50"
                    disabled={loading}
                    readOnly
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Service Type & Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Service Type <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value: "FTL" | "PTL") => setFormData({ ...formData, serviceType: value })}
                  disabled={loading}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FTL">
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5" />
                        Full Truck Load (FTL)
                      </div>
                    </SelectItem>
                    <SelectItem value="PTL">
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5" />
                        Part Truck Load (PTL)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-medium">
                  Pickup Date
                  <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                  <DatePicker
                    selected={formData.pickupDate ? new Date(formData.pickupDate + 'T00:00:00') : null}
                    onChange={handleDateChange}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY"
                    minDate={getMinDate()}
                    maxDate={new Date(new Date().setFullYear(new Date().getFullYear() + 1))}
                    className={cn(
                      "flex h-9 w-full rounded-md border bg-background pl-9 pr-3 py-2 text-sm",
                      "placeholder:text-muted-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      dateError ? "border-destructive focus:ring-destructive" : "border-input"
                    )}
                    disabled={loading}
                  />
                </div>
                {dateError && (
                  <p className="text-xs text-destructive flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3" />
                    {dateError}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                size="sm"
                className="gap-2"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !formData.consignor_id || !formData.consignee_id || !formData.branch_id}
                size="sm"
                className="gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Create Booking
                  </>
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
      <QuickAddPartyDrawer
        isOpen={addPartyModal.isOpen}
        onClose={() => setAddPartyModal({ ...addPartyModal, isOpen: false })}
        onSave={handleNewPartyAdded}
        type={addPartyModal.type}
      />
    </>
  );
};