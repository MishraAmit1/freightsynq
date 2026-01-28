import { useEffect, useState, useRef, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  X,
  Loader2,
  Check,
  ChevronsUpDown,
  Plus,
  User,
  MapPin,
  Save,
  Package,
  AlertCircle,
  Calendar,
  Truck,
  Search,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { CompanyBranch, fetchCompanyBranches } from "@/api/bookings";

// ============================================
// CUSTOM HOOKS
// ============================================

const useDebounce = (value: string, delay: number): string => {
  const [debouncedValue, setDebouncedValue] = useState<string>(value || "");

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value || "");
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

// ============================================
// INTERFACES
// ============================================

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
  party_type: "CONSIGNOR" | "CONSIGNEE" | "BOTH";
  status: "ACTIVE" | "INACTIVE";
}

interface BookingFormData {
  consignor_id: string;
  consignee_id: string;
  consignorName: string;
  consigneeName: string;
  from_location: string;
  to_location: string;
  serviceType: "FTL" | "PTL";
  pickupDate: string;
  branch_id: string;
}

interface BookingFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: BookingPayload) => Promise<void>;
}

interface BookingPayload {
  consignor_id: string;
  consignee_id: string;
  from_location: string;
  to_location: string;
  service_type: "FTL" | "PTL";
  pickup_date: string;
  branch_id: string;
  material_description: string;
  cargo_units: string;
  bilti_number: null;
  invoice_number: null;
  eway_bill_details: never[];
}

interface LocationSuggestion {
  placeId?: string;
  area: string;
  city: string;
  state: string;
  postcode?: string;
  displayText: string;
  mainText?: string;
  secondaryText?: string;
  isActualArea: boolean;
  fullText?: string;
  isGoogle?: boolean;
  isNominatim?: boolean;
  display_name?: string;
  fullAddress?: string;
  type?: string;
  importance?: number;
  isArea?: boolean;
  isCity?: boolean;
}

interface GooglePlacePrediction {
  placeId: string;
  text?: { text: string };
  structuredFormat?: {
    mainText?: { text: string };
    secondaryText?: { text: string };
  };
}

interface GooglePlaceSuggestion {
  placePrediction: GooglePlacePrediction;
}

interface GooglePlaceComponent {
  types: string[];
  longText?: string;
  shortText?: string;
}

interface NominatimResult {
  address?: {
    suburb?: string;
    neighbourhood?: string;
    locality?: string;
    hamlet?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    state?: string;
    postcode?: string;
    quarter?: string;
    residential?: string;
  };
  name?: string;
  display_name: string;
  type: string;
  importance?: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

const validatePickupDate = (dateString: string | undefined): string | null => {
  if (!dateString) return null;

  const selectedDate = new Date(dateString + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const twoDaysAgo = new Date(today);
  twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
  twoDaysAgo.setHours(0, 0, 0, 0);

  if (isNaN(selectedDate.getTime())) return "Invalid date format";
  if (selectedDate < twoDaysAgo)
    return "Pickup date cannot be more than 2 days in the past";

  const maxDate = new Date();
  maxDate.setFullYear(maxDate.getFullYear() + 1);
  if (selectedDate > maxDate)
    return "Pickup date cannot be more than 1 year in the future";

  return null;
};

const getInitialFormData = (): BookingFormData => ({
  consignor_id: "",
  consignee_id: "",
  consignorName: "",
  consigneeName: "",
  from_location: "",
  to_location: "",
  serviceType: "FTL",
  pickupDate: "",
  branch_id: "",
});

// ============================================
// LOCATION SEARCH INPUT COMPONENT
// ============================================

interface LocationSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  onLocationSelect?: (location: LocationSuggestion) => void;
  onClear?: () => void;
  enableSearch?: boolean;
}

const LocationSearchInput = ({
  value,
  onChange,
  placeholder,
  disabled = false,
  onLocationSelect,
  onClear,
  enableSearch = true,
}: LocationSearchInputProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState<string>(value || "");
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState<boolean>(false);
  const [searching, setSearching] = useState<boolean>(false);
  const [hasSelected, setHasSelected] = useState<boolean>(false);
  const [isUserTyping, setIsUserTyping] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const debouncedSearch = useDebounce(searchTerm, 500);

  useEffect(() => {
    setSearchTerm(value || "");
    if (value && !isUserTyping) {
      setHasSelected(true);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [value, isUserTyping]);

  useEffect(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (
      !enableSearch ||
      hasSelected ||
      !isUserTyping ||
      !debouncedSearch ||
      debouncedSearch.length <= 2
    ) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;

    searchLocations(debouncedSearch, controller.signal);

    return () => {
      controller.abort();
    };
  }, [debouncedSearch, hasSelected, enableSearch, isUserTyping]);

  const searchLocations = async (
    query: string,
    signal: AbortSignal,
  ): Promise<void> => {
    setSearching(true);
    const sessionToken = Math.random().toString(36).substring(7);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

      if (apiKey) {
        const response = await fetch(
          "https://places.googleapis.com/v1/places:autocomplete",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Goog-Api-Key": apiKey,
              "X-Goog-FieldMask":
                "suggestions.placePrediction.placeId,suggestions.placePrediction.text,suggestions.placePrediction.structuredFormat",
            },
            body: JSON.stringify({
              input: query,
              includedRegionCodes: ["in"],
              sessionToken: sessionToken,
              languageCode: "en",
              locationBias: {
                rectangle: {
                  low: { latitude: 8.0, longitude: 68.0 },
                  high: { latitude: 37.0, longitude: 97.0 },
                },
              },
            }),
            signal,
          },
        );

        if (signal.aborted) return;

        if (response.ok) {
          const data = await response.json();

          if (data.suggestions && !signal.aborted) {
            const formattedResults: LocationSuggestion[] = data.suggestions.map(
              (suggestion: GooglePlaceSuggestion) => {
                const prediction = suggestion.placePrediction;
                const mainText =
                  prediction.structuredFormat?.mainText?.text ||
                  prediction.text?.text ||
                  "";
                const secondaryText =
                  prediction.structuredFormat?.secondaryText?.text || "";
                const isArea = Boolean(
                  secondaryText && !mainText.includes(secondaryText),
                );

                return {
                  placeId: prediction.placeId,
                  area: isArea ? mainText : "",
                  city: isArea ? secondaryText.split(",")[0] : mainText,
                  state: secondaryText
                    ? secondaryText.split(",").slice(-1)[0].trim()
                    : "",
                  displayText: prediction.text?.text || mainText,
                  mainText: mainText,
                  secondaryText: secondaryText,
                  isActualArea: isArea,
                  fullText: prediction.text?.text || "",
                  isGoogle: true,
                };
              },
            );

            setSuggestions(formattedResults);
            setShowSuggestions(formattedResults.length > 0);
            setSearching(false);
            return;
          }
        }
      }

      throw new Error("Falling back to Nominatim");
    } catch (error) {
      if (signal.aborted) return;

      try {
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=20&addressdetails=1&featuretype=settlement&accept-language=en`,
          { signal },
        );

        if (signal.aborted) return;

        const data: NominatimResult[] = await fallbackResponse.json();

        const formattedResults: LocationSuggestion[] = data
          .map((item) => {
            const area =
              item.address?.suburb ||
              item.address?.neighbourhood ||
              item.address?.locality ||
              item.address?.hamlet ||
              item.name?.split(",")[0] ||
              "";
            const city =
              item.address?.city ||
              item.address?.town ||
              item.address?.village ||
              item.address?.municipality ||
              "";
            const state = item.address?.state || "";
            const postcode = item.address?.postcode || "";

            let displayText = "";
            if (area && city && area !== city) {
              displayText = `${area}, ${city}`;
            } else if (city) {
              displayText = city;
            } else if (area) {
              displayText = area;
            } else {
              displayText = item.display_name;
            }

            const isArea = [
              "suburb",
              "neighbourhood",
              "locality",
              "hamlet",
              "quarter",
              "residential",
            ].includes(item.type);
            const isCity = ["city", "town", "village", "municipality"].includes(
              item.type,
            );

            return {
              area: area || city || "",
              city: city || area || "",
              state: state,
              postcode: postcode,
              display_name: item.display_name,
              displayText: displayText,
              fullAddress: `${area ? area + ", " : ""}${city}, ${state} - ${postcode}`,
              type: item.type,
              importance: item.importance || 0,
              isArea: isArea,
              isCity: isCity,
              isActualArea: Boolean(area && city && area !== city),
              isNominatim: true,
            };
          })
          .filter((item) => {
            const hasNonEnglish = /[^\x00-\x7F]/.test(item.displayText);
            const hasDevanagari = /[\u0900-\u097F]/.test(item.displayText);
            return (
              !hasNonEnglish &&
              !hasDevanagari &&
              item.city &&
              item.state &&
              (item.isArea || item.isCity || item.isActualArea)
            );
          })
          .filter(
            (item, index, self) =>
              index ===
              self.findIndex(
                (t) =>
                  t.displayText === item.displayText && t.city === item.city,
              ),
          )
          .sort((a, b) => {
            if (a.isActualArea && !b.isActualArea) return -1;
            if (!a.isActualArea && b.isActualArea) return 1;
            if (a.isArea && !b.isArea) return -1;
            if (!a.isArea && b.isArea) return 1;
            return (b.importance || 0) - (a.importance || 0);
          });

        if (!signal.aborted) {
          setSuggestions(formattedResults);
          setShowSuggestions(formattedResults.length > 0);
        }
      } catch (fallbackError) {
        if (!signal.aborted) {
          console.error("Both search methods failed:", fallbackError);
          toast({
            title: "Search Failed",
            description: "Unable to search locations. Please try again.",
            variant: "destructive",
          });
        }
      }
    } finally {
      if (!signal.aborted) {
        setSearching(false);
      }
    }
  };

  const handleSelect = async (location: LocationSuggestion): Promise<void> => {
    setSearching(true);
    setIsUserTyping(false);

    try {
      let finalLocation = { ...location };

      if (location.placeId && location.isGoogle) {
        const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

        if (apiKey) {
          const detailsResponse = await fetch(
            `https://places.googleapis.com/v1/places/${location.placeId}?key=${apiKey}&fields=addressComponents,location,displayName`,
            {
              method: "GET",
              headers: {
                "X-Goog-FieldMask": "addressComponents,location,displayName",
              },
            },
          );

          if (detailsResponse.ok) {
            const placeDetails = await detailsResponse.json();
            const components: GooglePlaceComponent[] =
              placeDetails.addressComponents || [];

            const locationData = {
              area: "",
              city: "",
              state: "",
              postcode: "",
            };

            components.forEach((comp) => {
              const types = comp.types || [];
              if (
                types.includes("sublocality_level_1") ||
                types.includes("sublocality") ||
                types.includes("neighborhood")
              ) {
                locationData.area = comp.longText || comp.shortText || "";
              }
              if (types.includes("locality")) {
                locationData.city = comp.longText || comp.shortText || "";
              }
              if (types.includes("administrative_area_level_1")) {
                locationData.state = comp.longText || comp.shortText || "";
              }
              if (types.includes("postal_code")) {
                locationData.postcode = comp.longText || comp.shortText || "";
              }
            });

            if (!locationData.area && location.mainText) {
              locationData.area = location.mainText;
            }

            finalLocation = {
              ...location,
              area: locationData.area,
              city: locationData.city,
              state: locationData.state,
              postcode: locationData.postcode,
            };
          }
        }
      }

      const fullAddress = `${finalLocation.city}, ${finalLocation.state}`;
      setSearchTerm(fullAddress);
      onChange(fullAddress);
      setHasSelected(true);
      setSuggestions([]);
      setShowSuggestions(false);

      if (onLocationSelect) {
        onLocationSelect(finalLocation);
      }
    } catch (error) {
      console.error("Error selecting location:", error);
      toast({
        title: "Error",
        description: "Failed to get location details",
        variant: "destructive",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleInputChange = (newValue: string): void => {
    setSearchTerm(newValue);
    onChange(newValue);
    setIsUserTyping(true);

    if (hasSelected) {
      setHasSelected(false);
    }
  };

  const handleClear = (): void => {
    setSearchTerm("");
    onChange("");
    setHasSelected(false);
    setIsUserTyping(false);
    setSuggestions([]);
    setShowSuggestions(false);

    if (onClear) {
      onClear();
    }
  };

  const handleFocus = (): void => {
    // When user focuses on field, enable typing mode for future searches
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-2.5 min-[2000px]:left-3 top-2.5 min-[2000px]:top-3 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4 text-muted-foreground dark:text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="pl-9 min-[2000px]:pl-10 pr-9 min-[2000px]:pr-10 h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
          disabled={disabled}
          autoComplete="off"
        />
        {searching && (
          <Loader2 className="absolute right-9 min-[2000px]:right-10 top-2.5 min-[2000px]:top-3.5 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4 animate-spin text-primary" />
        )}
        {searchTerm && !searching && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1 min-[2000px]:top-1.5 h-7 w-7 min-[2000px]:h-8 min-[2000px]:w-8 p-0 hover:bg-accent dark:hover:bg-secondary"
            onClick={handleClear}
          >
            <X className="h-3 w-3 min-[2000px]:h-4 min-[2000px]:w-4 text-muted-foreground dark:text-muted-foreground" />
          </Button>
        )}
      </div>

      {showSuggestions &&
        suggestions.length > 0 &&
        !hasSelected &&
        enableSearch &&
        isUserTyping && (
          <div className="absolute z-50 w-full bg-card border border-border dark:border-border rounded-lg mt-1 shadow-lg max-h-[200px] min-[2000px]:max-h-[240px] overflow-auto">
            {suggestions.map((location, index) => (
              <div
                key={`${location.placeId || location.displayText}-${index}`}
                className={cn(
                  "px-3 min-[2000px]:px-4 py-2 min-[2000px]:py-3 cursor-pointer border-b border-border dark:border-border last:border-0 transition-colors",
                  "hover:bg-accent dark:hover:bg-secondary",
                  location.isActualArea && "bg-accent/30 dark:bg-primary/5",
                )}
                onClick={() => handleSelect(location)}
              >
                <div className="flex items-start gap-2 min-[2000px]:gap-3">
                  <MapPin
                    className={cn(
                      "h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5 mt-0.5 shrink-0",
                      location.isActualArea
                        ? "text-primary"
                        : "text-muted-foreground dark:text-muted-foreground",
                    )}
                  />
                  <div className="flex-1">
                    <div className="font-medium text-sm min-[2000px]:text-base">
                      {location.area &&
                      location.city &&
                      location.area !== location.city ? (
                        <>
                          <span className="text-primary font-semibold">
                            {location.area}
                          </span>
                          <span className="text-muted-foreground dark:text-muted-foreground font-normal">
                            {" "}
                            • {location.city}
                          </span>
                        </>
                      ) : (
                        <span className="text-foreground dark:text-white">
                          {location.city || location.mainText}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground">
                        {location.state}
                        {location.postcode && ` • PIN: ${location.postcode}`}
                      </span>
                      <span
                        className={cn(
                          "text-xs min-[2000px]:text-sm px-1.5 py-0.5 rounded font-medium",
                          location.isActualArea
                            ? "bg-primary/20 text-primary dark:text-primary border border-primary/30"
                            : "bg-muted dark:bg-secondary text-muted-foreground dark:text-muted-foreground",
                        )}
                      >
                        {location.isActualArea ? "Area" : "City"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
    </div>
  );
};

// ============================================
// PARTY SELECT COMPONENT
// ============================================

interface PartySelectProps {
  value?: string;
  onValueChange: (value: string, party: Party) => void;
  type: "CONSIGNOR" | "CONSIGNEE";
  placeholder?: string;
  disabled?: boolean;
  onAddNew?: () => void;
}

const PartySelect = ({
  value,
  onValueChange,
  type,
  placeholder = "Select party...",
  disabled = false,
  onAddNew,
}: PartySelectProps) => {
  const [open, setOpen] = useState<boolean>(false);
  const [parties, setParties] = useState<Party[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadParties = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        let query = supabase.from("parties").select("*").eq("status", "ACTIVE");

        if (search) {
          query = query.or(
            `name.ilike.%${search}%,contact_person.ilike.%${search}%,phone.ilike.%${search}%`,
          );
        }
        if (type && type !== "BOTH") {
          query = query.or(`party_type.eq.${type},party_type.eq.BOTH`);
        }

        query = query.order("created_at", { ascending: false }).limit(20);

        const { data, error } = await query;

        if (error) throw error;
        setParties(data || []);
      } catch (error) {
        console.error("Error searching parties:", error);
        setParties([]);
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  useEffect(() => {
    if (open) {
      loadParties(searchTerm);
      // Focus input when popover opens
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      if (open) {
        loadParties(searchTerm);
      }
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, loadParties, open]);

  const selectedParty = parties.find((p) => p.id === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white"
          disabled={disabled}
        >
          <span className="truncate">
            {selectedParty ? selectedParty.name : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[400px] min-[2000px]:w-[480px] p-0 bg-card border-border shadow-lg"
        align="start"
        sideOffset={4}
      >
        {/* Search Input */}
        <div className="flex items-center border-b border-border px-3 py-2">
          <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            className="flex h-8 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground text-foreground"
            placeholder={`Search ${type?.toLowerCase() || "party"}...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {searchTerm && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:bg-accent"
              onClick={() => setSearchTerm("")}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Scrollable List */}
        <div
          className="overflow-y-auto overflow-x-hidden"
          style={{ maxHeight: "250px" }}
        >
          {loading ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin inline mr-2 text-primary" />
              Loading...
            </div>
          ) : parties.length === 0 ? (
            <div className="p-4 text-center">
              <p className="text-sm text-muted-foreground mb-3">
                No party found.
              </p>
              {onAddNew && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOpen(false);
                    setSearchTerm("");
                    onAddNew();
                  }}
                  className="h-8 text-xs border-border hover:bg-accent"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add New {type === "CONSIGNOR" ? "Consignor" : "Consignee"}
                </Button>
              )}
            </div>
          ) : (
            <div className="p-1">
              {parties.map((party) => (
                <div
                  key={party.id}
                  onClick={() => {
                    onValueChange(party.id, party);
                    setOpen(false);
                    setSearchTerm("");
                  }}
                  className={cn(
                    "relative flex cursor-pointer select-none items-center rounded-md px-2 py-2.5 text-sm outline-none",
                    "hover:bg-accent transition-colors",
                    value === party.id && "bg-accent",
                  )}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 text-primary shrink-0",
                      value === party.id ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium flex items-center gap-2">
                      <User className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <span className="text-sm truncate">{party.name}</span>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5 ml-5">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">
                        {party.city}, {party.state}
                        {party.phone && ` • ${party.phone}`}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Button at bottom */}
        {onAddNew && parties.length > 0 && (
          <div className="border-t border-border p-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setOpen(false);
                setSearchTerm("");
                onAddNew();
              }}
              className="w-full h-8 text-xs justify-start text-muted-foreground hover:text-foreground hover:bg-accent"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add New {type === "CONSIGNOR" ? "Consignor" : "Consignee"}
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};

// ============================================
// QUICK ADD PARTY DRAWER
// ============================================

interface QuickAddPartyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (party: Party) => void;
  type: "CONSIGNOR" | "CONSIGNEE";
}

interface PartyFormData {
  name: string;
  contact_person: string;
  phone: string;
  email: string;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  gst_number: string;
  pan_number: string;
}

const getInitialPartyFormData = (): PartyFormData => ({
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address_line1: "",
  city: "",
  state: "",
  pincode: "",
  gst_number: "",
  pan_number: "",
});

const QuickAddPartyDrawer = ({
  isOpen,
  onClose,
  onSave,
  type,
}: QuickAddPartyDrawerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<boolean>(false);
  const [locationSearch, setLocationSearch] = useState<string>("");
  const [formData, setFormData] = useState<PartyFormData>(
    getInitialPartyFormData(),
  );

  useEffect(() => {
    if (!isOpen) {
      setLocationSearch("");
      setFormData(getInitialPartyFormData());
    }
  }, [isOpen]);

  const handleSubmit = async (): Promise<void> => {
    if (
      !formData.name ||
      !formData.address_line1 ||
      !formData.city ||
      !formData.state ||
      !formData.pincode
    ) {
      toast({
        title: "❌ Validation Error",
        description: "Please fill all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("parties")
        .insert([
          {
            ...formData,
            party_type: type,
            status: "ACTIVE",
          },
        ])
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
      console.error("Error adding party:", error);
      toast({
        title: "❌ Error",
        description: "Failed to add party",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLocationClear = (): void => {
    setFormData((prev) => ({
      ...prev,
      address_line1: "",
      city: "",
      state: "",
      pincode: "",
    }));
  };

  const handleLocationSelect = (location: LocationSuggestion): void => {
    const addressLine =
      location.area && location.area !== location.city ? location.area : "";
    setFormData((prev) => ({
      ...prev,
      address_line1: addressLine,
      city: location.city || "",
      state: location.state || "",
      pincode: location.postcode || "",
    }));
    setLocationSearch(location.displayText);
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl min-[2000px]:max-w-4xl overflow-y-auto bg-card border-l border-border dark:border-border">
        <SheetHeader className="border-b border-border dark:border-border pb-4 min-[2000px]:pb-5">
          <SheetTitle className="flex items-center gap-2 min-[2000px]:gap-3 text-foreground dark:text-white">
            <div className="p-2 min-[2000px]:p-3 bg-accent dark:bg-primary/10 rounded-lg">
              <User className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-primary" />
            </div>
            <span className="text-lg min-[2000px]:text-xl">
              Add New {type === "CONSIGNOR" ? "Consignor" : "Consignee"}
            </span>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 min-[2000px]:space-y-5 py-6 min-[2000px]:py-8">
          <div>
            <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Name <span className="text-red-600">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="Party name"
              className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 min-[2000px]:gap-4">
            <div>
              <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                Phone
              </Label>
              <Input
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Phone number (optional)"
                maxLength={10}
                className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white"
              />
            </div>
            <div>
              <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                Contact Person
              </Label>
              <Input
                value={formData.contact_person}
                onChange={(e) =>
                  setFormData({ ...formData, contact_person: e.target.value })
                }
                placeholder="Contact person"
                className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white"
              />
            </div>
          </div>

          <Separator className="bg-[#E5E7EB] dark:bg-secondary my-4 min-[2000px]:my-5" />

          <div>
            <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Search Area/City
            </Label>
            <LocationSearchInput
              value={locationSearch}
              onChange={(value) => setLocationSearch(value)}
              placeholder="Search area/city to auto-fill..."
              disabled={loading}
              onLocationSelect={handleLocationSelect}
              onClear={handleLocationClear}
              enableSearch={true}
            />
          </div>

          <div>
            <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Address Line 1 <span className="text-red-600">*</span>
            </Label>
            <Input
              value={formData.address_line1}
              onChange={(e) =>
                setFormData({ ...formData, address_line1: e.target.value })
              }
              placeholder="Building/Street address"
              className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 min-[2000px]:gap-4">
            <div>
              <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                City <span className="text-red-600">*</span>
              </Label>
              <Input
                value={formData.city}
                onChange={(e) =>
                  setFormData({ ...formData, city: e.target.value })
                }
                placeholder="City"
                className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white border-border dark:border-border"
              />
            </div>
            <div>
              <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                State <span className="text-red-600">*</span>
              </Label>
              <Input
                value={formData.state}
                onChange={(e) =>
                  setFormData({ ...formData, state: e.target.value })
                }
                placeholder="State"
                className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white border-border dark:border-border"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              Pincode <span className="text-red-600">*</span>
            </Label>
            <Input
              value={formData.pincode}
              onChange={(e) =>
                setFormData({ ...formData, pincode: e.target.value })
              }
              placeholder="6-digit pincode"
              maxLength={6}
              className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white border-border dark:border-border"
            />
          </div>

          <div>
            <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
              GST Number
            </Label>
            <Input
              value={formData.gst_number}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  gst_number: e.target.value.toUpperCase(),
                })
              }
              placeholder="GST Number (optional)"
              maxLength={15}
              className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white"
            />
          </div>

          <div className="flex justify-end gap-2 min-[2000px]:gap-3 pt-4 min-[2000px]:pt-5 border-t border-border dark:border-border">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={loading}
              size="sm"
              className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-muted dark:hover:bg-secondary"
            >
              <X className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              size="sm"
              className="h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium"
            >
              {loading && (
                <Loader2 className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 mr-2 animate-spin" />
              )}
              <Save className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 mr-2" />
              Add {type === "CONSIGNOR" ? "Consignor" : "Consignee"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// ============================================
// MAIN BOOKING FORM MODAL COMPONENT
// ============================================

export const BookingFormModal = ({
  isOpen,
  onClose,
  onSave,
}: BookingFormModalProps) => {
  const { toast } = useToast();
  const [dateError, setDateError] = useState<string | null>(null);
  const [branches, setBranches] = useState<CompanyBranch[]>([]);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(false);
  const [addPartyModal, setAddPartyModal] = useState<{
    isOpen: boolean;
    type: "CONSIGNOR" | "CONSIGNEE";
  }>({
    isOpen: false,
    type: "CONSIGNOR",
  });

  const [formData, setFormData] =
    useState<BookingFormData>(getInitialFormData());

  useEffect(() => {
    if (isOpen) {
      setFormData(getInitialFormData());
      setDateError(null);

      const loadBranches = async () => {
        setLoadingBranches(true);
        try {
          const branchData = await fetchCompanyBranches();
          setBranches(branchData);

          const defaultBranch =
            branchData.find((b) => b.is_default) || branchData[0];
          if (defaultBranch) {
            setFormData((prev) => ({ ...prev, branch_id: defaultBranch.id }));
          }
        } catch (error) {
          console.error("Error loading branches:", error);
          toast({
            title: "Error",
            description: "Failed to load branches",
            variant: "destructive",
          });
        } finally {
          setLoadingBranches(false);
        }
      };

      loadBranches();
    }
  }, [isOpen, toast]);

  const handleConsignorSelect = useCallback(
    (partyId: string, party: Party): void => {
      const fromLocation =
        party.city && party.state ? `${party.city}, ${party.state}` : "";

      setFormData((prev) => ({
        ...prev,
        consignor_id: partyId,
        consignorName: party.name,
        from_location: fromLocation,
      }));
    },
    [],
  );

  const handleConsigneeSelect = useCallback(
    (partyId: string, party: Party): void => {
      const toLocation =
        party.city && party.state ? `${party.city}, ${party.state}` : "";

      setFormData((prev) => ({
        ...prev,
        consignee_id: partyId,
        consigneeName: party.name,
        to_location: toLocation,
      }));
    },
    [],
  );

  const handleDateChange = useCallback((date: Date | null): void => {
    if (date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const isoString = `${year}-${month}-${day}`;

      const error = validatePickupDate(isoString);
      setDateError(error);
      setFormData((prev) => ({ ...prev, pickupDate: isoString }));
    } else {
      setFormData((prev) => ({ ...prev, pickupDate: "" }));
      setDateError(null);
    }
  }, []);

  const handleSubmit = async (): Promise<void> => {
    if (!formData.consignor_id || !formData.consignee_id) {
      toast({
        title: "Validation Error",
        description: "Please select both Consignor and Consignee",
        variant: "destructive",
      });
      return;
    }

    if (!formData.from_location || !formData.to_location) {
      toast({
        title: "Validation Error",
        description: "Please select both pickup and drop locations",
        variant: "destructive",
      });
      return;
    }

    if (dateError) {
      toast({
        title: "Invalid Date",
        description: dateError,
        variant: "destructive",
      });
      return;
    }

    if (!formData.branch_id) {
      toast({
        title: "Validation Error",
        description: "Please select a branch",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const bookingData: BookingPayload = {
        consignor_id: formData.consignor_id,
        consignee_id: formData.consignee_id,
        from_location: formData.from_location,
        to_location: formData.to_location,
        service_type: formData.serviceType,
        pickup_date: formData.pickupDate,
        branch_id: formData.branch_id,
        material_description: "",
        cargo_units: "1",
        bilti_number: null,
        invoice_number: null,
        eway_bill_details: [],
      };

      await onSave(bookingData);
      onClose();
    } catch (error) {
      console.error("Error creating booking:", error);
      toast({
        title: "Error",
        description: "Failed to create booking",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewPartyAdded = useCallback(
    (party: Party): void => {
      if (addPartyModal.type === "CONSIGNOR") {
        handleConsignorSelect(party.id, party);
      } else {
        handleConsigneeSelect(party.id, party);
      }
    },
    [addPartyModal.type, handleConsignorSelect, handleConsigneeSelect],
  );

  const getMinDate = (): Date => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    twoDaysAgo.setHours(0, 0, 0, 0);
    return twoDaysAgo;
  };

  const getMaxDate = (): Date => {
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    return maxDate;
  };

  const isFormValid = Boolean(
    formData.consignor_id &&
    formData.consignee_id &&
    formData.branch_id &&
    formData.from_location &&
    formData.to_location &&
    !dateError,
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-3xl min-[2000px]:max-w-4xl overflow-y-auto bg-card border-l border-border dark:border-border">
          <SheetHeader className="border-b border-border dark:border-border pb-4 min-[2000px]:pb-5">
            <SheetTitle className="flex items-center gap-3 min-[2000px]:gap-4 text-foreground dark:text-white">
              <div className="p-2 min-[2000px]:p-3 bg-accent dark:bg-primary/10 rounded-lg">
                <Package className="w-5 h-5 min-[2000px]:w-6 min-[2000px]:h-6 text-primary" />
              </div>
              <span className="text-xl min-[2000px]:text-2xl font-semibold">
                Create New Booking
              </span>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-5 min-[2000px]:space-y-6 py-6 min-[2000px]:py-8">
            {/* Branch Selection */}
            <div className="space-y-2 min-[2000px]:space-y-3">
              <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                Branch <span className="text-red-600">*</span>
              </Label>
              {loadingBranches ? (
                <div className="flex items-center gap-2 h-9 min-[2000px]:h-11 px-3 min-[2000px]:px-4 border border-border dark:border-border rounded-lg bg-muted">
                  <Loader2 className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 animate-spin text-primary" />
                  <span className="text-sm min-[2000px]:text-base text-muted-foreground dark:text-muted-foreground">
                    Loading branches...
                  </span>
                </div>
              ) : (
                <Select
                  value={formData.branch_id}
                  onValueChange={(value) =>
                    setFormData((prev) => ({ ...prev, branch_id: value }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white">
                    <SelectValue placeholder="Select branch">
                      {formData.branch_id && (
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="h-5 min-[2000px]:h-6 px-1.5 min-[2000px]:px-2 font-mono text-xs min-[2000px]:text-sm bg-muted dark:bg-secondary text-foreground dark:text-white border-border dark:border-border"
                          >
                            {
                              branches.find((b) => b.id === formData.branch_id)
                                ?.branch_code
                            }
                          </Badge>
                          <span className="text-sm min-[2000px]:text-base">
                            {
                              branches.find((b) => b.id === formData.branch_id)
                                ?.branch_name
                            }
                          </span>
                        </div>
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border dark:border-border">
                    {branches.map((branch) => (
                      <SelectItem
                        key={branch.id}
                        value={branch.id}
                        className="hover:bg-accent dark:hover:bg-secondary text-foreground dark:text-white p-2 min-[2000px]:p-3"
                      >
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="h-5 min-[2000px]:h-6 px-1.5 min-[2000px]:px-2 font-mono text-xs min-[2000px]:text-sm bg-muted dark:bg-secondary border-0"
                          >
                            {branch.branch_code}
                          </Badge>
                          <span className="text-sm min-[2000px]:text-base">
                            {branch.branch_name}
                          </span>
                          {branch.city && (
                            <span className="text-xs min-[2000px]:text-sm text-muted-foreground dark:text-muted-foreground ml-auto">
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

            {/* Party Selection - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-[2000px]:gap-4">
              <div className="space-y-2 min-[2000px]:space-y-3">
                <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Consignor <span className="text-red-600">*</span>
                </Label>
                <PartySelect
                  value={formData.consignor_id}
                  onValueChange={handleConsignorSelect}
                  type="CONSIGNOR"
                  placeholder="Select or search..."
                  disabled={loading}
                  onAddNew={() =>
                    setAddPartyModal({ isOpen: true, type: "CONSIGNOR" })
                  }
                />
              </div>

              <div className="space-y-2 min-[2000px]:space-y-3">
                <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Consignee <span className="text-red-600">*</span>
                </Label>
                <PartySelect
                  value={formData.consignee_id}
                  onValueChange={handleConsigneeSelect}
                  type="CONSIGNEE"
                  placeholder="Select or search..."
                  disabled={loading}
                  onAddNew={() =>
                    setAddPartyModal({ isOpen: true, type: "CONSIGNEE" })
                  }
                />
              </div>
            </div>

            <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

            {/* From & To Location - SIDE BY SIDE in one row */}
            <div className="space-y-3 min-[2000px]:space-y-4">
              <Label className="text-sm min-[2000px]:text-base font-semibold text-foreground dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-primary" />
                Pickup & Drop Locations
              </Label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-[2000px]:gap-4">
                {/* From Location */}
                <div className="space-y-2 min-[2000px]:space-y-3">
                  <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                    From Location <span className="text-red-600">*</span>
                  </Label>
                  <LocationSearchInput
                    value={formData.from_location}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, from_location: value }))
                    }
                    placeholder="Search pickup location..."
                    disabled={loading}
                    enableSearch={true}
                    onLocationSelect={(location) => {
                      const formatted =
                        location.city && location.state
                          ? `${location.city}, ${location.state}`
                          : location.displayText || "";
                      setFormData((prev) => ({
                        ...prev,
                        from_location: formatted,
                      }));
                    }}
                    onClear={() =>
                      setFormData((prev) => ({ ...prev, from_location: "" }))
                    }
                  />
                </div>

                {/* To Location */}
                <div className="space-y-2 min-[2000px]:space-y-3">
                  <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                    To Location <span className="text-red-600">*</span>
                  </Label>
                  <LocationSearchInput
                    value={formData.to_location}
                    onChange={(value) =>
                      setFormData((prev) => ({ ...prev, to_location: value }))
                    }
                    placeholder="Search drop location..."
                    disabled={loading}
                    enableSearch={true}
                    onLocationSelect={(location) => {
                      const formatted =
                        location.city && location.state
                          ? `${location.city}, ${location.state}`
                          : location.displayText || "";
                      setFormData((prev) => ({
                        ...prev,
                        to_location: formatted,
                      }));
                    }}
                    onClear={() =>
                      setFormData((prev) => ({ ...prev, to_location: "" }))
                    }
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

            {/* Service Type & Date - Side by Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 min-[2000px]:gap-4">
              <div className="space-y-2 min-[2000px]:space-y-3">
                <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Service Type <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={formData.serviceType}
                  onValueChange={(value: "FTL" | "PTL") =>
                    setFormData((prev) => ({ ...prev, serviceType: value }))
                  }
                  disabled={loading}
                >
                  <SelectTrigger className="h-9 min-[2000px]:h-11 text-sm min-[2000px]:text-base border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border dark:border-border">
                    <SelectItem
                      value="FTL"
                      className="hover:bg-accent dark:hover:bg-secondary p-2 min-[2000px]:p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Truck className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-muted-foreground dark:text-muted-foreground" />
                        <span className="text-sm min-[2000px]:text-base">
                          Full Truck Load (FTL)
                        </span>
                      </div>
                    </SelectItem>
                    <SelectItem
                      value="PTL"
                      className="hover:bg-accent dark:hover:bg-secondary p-2 min-[2000px]:p-3"
                    >
                      <div className="flex items-center gap-2">
                        <Package className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 text-muted-foreground dark:text-muted-foreground" />
                        <span className="text-sm min-[2000px]:text-base">
                          Part Truck Load (PTL)
                        </span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 min-[2000px]:space-y-3">
                <Label className="text-xs min-[2000px]:text-sm font-medium text-muted-foreground dark:text-muted-foreground">
                  Pickup Date
                  <span className="text-muted-foreground dark:text-muted-foreground font-normal ml-1">
                    (Optional)
                  </span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 min-[2000px]:left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 min-[2000px]:h-4 min-[2000px]:w-4 text-muted-foreground dark:text-muted-foreground pointer-events-none z-10" />
                  <DatePicker
                    selected={
                      formData.pickupDate
                        ? new Date(formData.pickupDate + "T00:00:00")
                        : null
                    }
                    onChange={handleDateChange}
                    dateFormat="dd/MM/yyyy"
                    placeholderText="DD/MM/YYYY"
                    minDate={getMinDate()}
                    maxDate={getMaxDate()}
                    className={cn(
                      "flex h-9 min-[2000px]:h-11 w-full rounded-lg border bg-card pl-9 min-[2000px]:pl-10 pr-3 min-[2000px]:pr-4 py-2 min-[2000px]:py-3 text-sm min-[2000px]:text-base text-foreground dark:text-white",
                      "placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      "focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                      dateError
                        ? "border-red-600 focus:ring-red-600"
                        : "border-border dark:border-border",
                    )}
                    disabled={loading}
                  />
                </div>
                {dateError && (
                  <p className="text-xs min-[2000px]:text-sm text-red-600 flex items-center gap-1 mt-1">
                    <AlertCircle className="w-3 h-3 min-[2000px]:w-4 min-[2000px]:h-4" />
                    {dateError}
                  </p>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 min-[2000px]:gap-3 pt-4 min-[2000px]:pt-5 border-t border-border dark:border-border">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={loading}
                size="sm"
                className="gap-2 h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm border-border dark:border-border hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-white"
              >
                <X className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4" />
                Cancel
              </Button>
              <Button
                type="submit"
                onClick={handleSubmit}
                disabled={loading || !isFormValid}
                size="sm"
                className="gap-2 h-8 min-[2000px]:h-9 text-xs min-[2000px]:text-sm bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5 min-[2000px]:w-4 min-[2000px]:h-4" />
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
        onClose={() => setAddPartyModal((prev) => ({ ...prev, isOpen: false }))}
        onSave={handleNewPartyAdded}
        type={addPartyModal.type}
      />
    </>
  );
};
