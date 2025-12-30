import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox"; // ✅ ADDED
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  MapPin,
  User,
  Phone,
  Building2,
  FileText,
  Loader2,
  X,
  Check,
  ArrowLeft,
  Save,
  Mail,
  DollarSign, // ✅ ADDED for billing icon
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// ✅ UPDATED TYPES
interface Party {
  id: string;
  name: string;
  contact_person?: string | null;
  phone: string;
  email?: string | null;
  address_line1: string;
  city: string;
  state: string;
  pincode: string;
  gst_number?: string | null;
  pan_number?: string | null;
  party_type: "CONSIGNOR" | "CONSIGNEE" | "BOTH";
  status: "ACTIVE" | "INACTIVE";
  is_billing_party?: boolean; // ✅ ADDED
  created_at?: string;
  updated_at?: string;
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
  party_type: "CONSIGNOR" | "CONSIGNEE" | "BOTH";
  is_billing_party: boolean; // ✅ ADDED
}

// ✅ CUSTOM HOOK - Debounce
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

// ✅ EMAIL VALIDATION
const validateEmail = (email: string): boolean => {
  if (!email) return true;

  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email)) return false;

  const validDomains = [
    "gmail.com",
    "yahoo.com",
    "outlook.com",
    "hotmail.com",
    "zoho.com",
    "protonmail.com",
    "icloud.com",
    "aol.com",
    "mail.com",
    "yandex.com",
    "live.com",
    "msn.com",
    "rediffmail.com",
    "inbox.com",
  ];

  const domain = email.split("@")[1]?.toLowerCase();

  return (
    validDomains.includes(domain) ||
    domain?.endsWith(".com") ||
    domain?.endsWith(".in") ||
    domain?.endsWith(".co") ||
    domain?.endsWith(".org") ||
    domain?.endsWith(".net") ||
    domain?.endsWith(".edu")
  );
};
// ✅ MAIN COMPONENT
export const AddEditParty = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  const mode = id ? "edit" : "create";

  // Location search states
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);

  const debouncedLocationSearch = useDebounce(locationSearch, 500);

  // ✅ UPDATED FORM STATE - Added is_billing_party
  const [formData, setFormData] = useState<PartyFormData>({
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
    party_type: "BOTH",
    is_billing_party: false, // ✅ ADDED DEFAULT FALSE
  });

  // Load party data if editing
  useEffect(() => {
    if (id) {
      loadPartyData();
    }
  }, [id]);

  const loadPartyData = async () => {
    setInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;

      if (data) {
        setFormData({
          name: data.name || "",
          contact_person: data.contact_person || "",
          phone: data.phone || "",
          email: data.email || "",
          address_line1: data.address_line1 || "",
          city: data.city || "",
          state: data.state || "",
          pincode: data.pincode || "",
          gst_number: data.gst_number || "",
          pan_number: data.pan_number || "",
          party_type: data.party_type || "BOTH",
          is_billing_party: data.is_billing_party || false, // ✅ ADDED
        });
        if (data.address_line1) {
          setLocationSearch(data.address_line1);
          setHasSelected(true);
        }
      }
    } catch (error) {
      console.error("Error loading party:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load party details",
        variant: "destructive",
      });
      navigate("/customers");
    } finally {
      setInitialLoading(false);
    }
  };

  // Location search effect
  useEffect(() => {
    if (hasSelected) {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
      return;
    }

    if (debouncedLocationSearch && debouncedLocationSearch.length > 2) {
      searchLocations(debouncedLocationSearch);
    } else {
      setLocationSuggestions([]);
      setShowLocationSuggestions(false);
    }
  }, [debouncedLocationSearch, hasSelected]);

  // Search locations function
  const searchLocations = async (query: string) => {
    if (hasSelected) return;

    setSearchingLocation(true);
    const sessionToken = Math.random().toString(36).substring(7);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
        console.warn("⚠️ Google Places API key not found, using fallback");
        throw new Error("API key not configured");
      }

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
        }
      );

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!hasSelected && data.suggestions) {
        const formattedResults = data.suggestions.map((suggestion: any) => {
          const prediction = suggestion.placePrediction;
          const mainText =
            prediction.structuredFormat?.mainText?.text ||
            prediction.text?.text ||
            "";
          const secondaryText =
            prediction.structuredFormat?.secondaryText?.text || "";
          const isArea = secondaryText && !mainText.includes(secondaryText);

          return {
            placeId: prediction.placeId,
            area: isArea ? mainText : "",
            city: isArea ? secondaryText.split(",")[0] : mainText,
            displayText: prediction.text?.text || mainText,
            mainText: mainText,
            secondaryText: secondaryText,
            isActualArea: isArea,
            fullText: prediction.text?.text || "",
            isGoogle: true,
          };
        });

        setLocationSuggestions(formattedResults);
        setShowLocationSuggestions(formattedResults.length > 0);
      }
    } catch (error) {
      console.error("❌ Google Places API error:", error);

      try {
        const fallbackResponse = await fetch(
          `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query)}&` +
            `format=json&` +
            `countrycodes=in&` +
            `limit=10&` +
            `addressdetails=1&` +
            `featuretype=settlement&` +
            `accept-language=en`
        );

        const fallbackData = await fallbackResponse.json();

        const formattedResults = fallbackData
          .map((item: any) => {
            const area =
              item.address?.suburb || item.address?.neighbourhood || "";
            const city = item.address?.city || item.address?.town || "";

            return {
              placeId: `nominatim_${item.place_id}`,
              area: area,
              city: city || area,
              state: item.address?.state || "",
              postcode: item.address?.postcode || "",
              displayText: area && city ? `${area}, ${city}` : city || area,
              mainText: area || city,
              secondaryText: city
                ? `${city}, ${item.address?.state}`
                : item.address?.state,
              isActualArea: area && city && area !== city,
              isNominatim: true,
            };
          })
          .filter((item: any) => item.city);

        setLocationSuggestions(formattedResults);
        setShowLocationSuggestions(formattedResults.length > 0);
      } catch (fallbackError) {
        console.error("❌ Fallback search also failed:", fallbackError);
      }
    } finally {
      setSearchingLocation(false);
    }
  };

  // Handle location select
  const handleLocationSelect = async (location: any) => {
    setSearchingLocation(true);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

      if (location.placeId && location.isGoogle && apiKey) {
        const detailsResponse = await fetch(
          `https://places.googleapis.com/v1/places/${location.placeId}?` +
            `key=${apiKey}&` +
            `fields=addressComponents,location,displayName`,
          {
            method: "GET",
            headers: {
              "X-Goog-FieldMask": "addressComponents,location,displayName",
            },
          }
        );

        if (!detailsResponse.ok) {
          throw new Error("Failed to fetch place details");
        }

        const placeDetails = await detailsResponse.json();
        const components = placeDetails.addressComponents || [];

        let locationData = {
          area: "",
          city: "",
          state: "",
          pincode: "",
        };

        components.forEach((comp: any) => {
          const types = comp.types || [];

          if (
            types.includes("sublocality_level_1") ||
            types.includes("sublocality") ||
            types.includes("neighborhood")
          ) {
            locationData.area = comp.longText || comp.shortText;
          }

          if (types.includes("locality")) {
            locationData.city = comp.longText || comp.shortText;
          }

          if (types.includes("administrative_area_level_1")) {
            locationData.state = comp.longText || comp.shortText;
          }

          if (types.includes("postal_code")) {
            locationData.pincode = comp.longText || comp.shortText;
          }
        });

        if (!locationData.area && location.mainText) {
          locationData.area = location.mainText;
        }

        setFormData((prev) => ({
          ...prev,
          address_line1: locationData.area || "", // ✅ Empty if not found
          city: locationData.city || "", // ✅ Empty if not found
          state: locationData.state || "", // ✅ Empty if not found
          pincode: locationData.pincode || "", // ✅ Empty if not found
        }));

        setLocationSearch(location.displayText);
        setHasSelected(true);
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      } else {
        setFormData((prev) => ({
          ...prev,
          address_line1: location.area || "", // ✅ Empty if not found
          city: location.city || "", // ✅ Empty if not found
          state: location.state || "", // ✅ Empty if not found
          pincode: location.postcode || "", // ✅ Empty if not found
        }));

        setLocationSearch(location.displayText);
        setHasSelected(true);
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      }
    } catch (error) {
      console.error("❌ Error getting place details:", error);
    } finally {
      setSearchingLocation(false);
    }
  };

  const handleLocationInputChange = (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value;
    setLocationSearch(value);

    if (hasSelected) {
      setHasSelected(false);
    }
  };

  const handleClearSearch = () => {
    setLocationSearch("");
    setHasSelected(false);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
  };

  // ✅ UPDATED SUBMIT HANDLER - Added is_billing_party
  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      toast({
        title: "❌ Validation Error",
        description: "Party name is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.phone.trim() || !/^[0-9]{10}$/.test(formData.phone)) {
      toast({
        title: "❌ Validation Error",
        description: "Valid 10-digit phone number is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.address_line1.trim()) {
      toast({
        title: "❌ Validation Error",
        description: "Address is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.city.trim()) {
      toast({
        title: "❌ Validation Error",
        description: "City is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.state.trim()) {
      toast({
        title: "❌ Validation Error",
        description: "State is required",
        variant: "destructive",
      });
      return;
    }

    if (!formData.pincode.trim() || !/^[0-9]{6}$/.test(formData.pincode)) {
      toast({
        title: "❌ Validation Error",
        description: "Valid 6-digit pincode is required",
        variant: "destructive",
      });
      return;
    }

    if (formData.email && !validateEmail(formData.email)) {
      toast({
        title: "❌ Validation Error",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.gst_number &&
      formData.gst_number.length > 0 &&
      !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(
        formData.gst_number
      )
    ) {
      toast({
        title: "❌ Validation Error",
        description: "Invalid GST number format",
        variant: "destructive",
      });
      return;
    }

    if (
      formData.pan_number &&
      formData.pan_number.length > 0 &&
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)
    ) {
      toast({
        title: "❌ Validation Error",
        description: "Invalid PAN number format",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        name: formData.name.trim(),
        contact_person: formData.contact_person.trim() || null,
        phone: formData.phone.trim(),
        email: formData.email.trim() || null,
        address_line1: formData.address_line1.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        gst_number: formData.gst_number.trim() || null,
        pan_number: formData.pan_number.trim() || null,
        party_type: formData.party_type,
        status: "ACTIVE" as const,
        is_billing_party: formData.is_billing_party, // ✅ ADDED
      };

      if (mode === "edit" && id) {
        const { error } = await supabase
          .from("parties")
          .update(dataToSave)
          .eq("id", id);

        if (error) throw error;

        toast({
          title: "✅ Success",
          description: "Party updated successfully",
        });
      } else {
        const { data: existingParties, error: checkError } = await supabase
          .from("parties")
          .select("id, name, phone, gst_number")
          .or(
            `name.ilike.${dataToSave.name},phone.eq.${dataToSave.phone}${
              dataToSave.gst_number
                ? `,gst_number.eq.${dataToSave.gst_number}`
                : ""
            }`
          );

        if (checkError) throw checkError;

        if (existingParties && existingParties.length > 0) {
          const duplicate = existingParties[0];
          let duplicateField = "";
          if (duplicate.name.toLowerCase() === dataToSave.name.toLowerCase()) {
            duplicateField = "name";
          } else if (duplicate.phone === dataToSave.phone) {
            duplicateField = "phone number";
          } else if (duplicate.gst_number === dataToSave.gst_number) {
            duplicateField = "GST number";
          }

          toast({
            title: "❌ Duplicate Found",
            description: `A party with this ${duplicateField} already exists`,
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.from("parties").insert([dataToSave]);

        if (error) throw error;

        toast({
          title: "✅ Success",
          description: "Party added successfully",
        });
      }

      navigate("/customers");
    } catch (error: any) {
      console.error("Error saving party:", error);
      toast({
        title: "❌ Error",
        description: error.message || "Failed to save party",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-lg font-medium text-muted-foreground">
          Loading party details...
        </p>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl mx-auto p-4 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/customers")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {mode === "edit" ? "Edit Party" : "Add New Party"}
          </h1>
        </div>
      </div>

      {/* Form Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Party Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Party Type Selection */}
          <div>
            <Label>Party Type *</Label>
            <Select
              value={formData.party_type}
              onValueChange={(value: "CONSIGNOR" | "CONSIGNEE" | "BOTH") =>
                setFormData({ ...formData, party_type: value })
              }
            >
              <SelectTrigger className="h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONSIGNOR">Consignor Only</SelectItem>
                <SelectItem value="CONSIGNEE">Consignee Only</SelectItem>
                <SelectItem value="BOTH">Both (Can be either)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              Basic Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Party Name *</Label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Enter unique party name"
                  className="h-11"
                />
              </div>
              <div>
                <Label>Contact Person</Label>
                <Input
                  value={formData.contact_person}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_person: e.target.value })
                  }
                  placeholder="Contact person name"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Contact Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Phone Number *</Label>
                <Input
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  placeholder="10-digit phone number"
                  maxLength={10}
                  className="h-11"
                />
              </div>
              <div>
                <Label>Email Address</Label>
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  placeholder="email@gmail.com"
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Address Details
            </h3>

            <div>
              <Label>
                Search Area/City
                {hasSelected && (
                  <span className="text-xs text-green-500 ml-2">
                    ✓ Location selected
                  </span>
                )}
              </Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                <Input
                  value={locationSearch}
                  onChange={handleLocationInputChange}
                  placeholder="Type area or city name..."
                  className="pl-10 pr-10 h-11"
                  autoComplete="off"
                />
                {searchingLocation && (
                  <Loader2 className="absolute right-3 top-3.5 h-4 w-4 animate-spin" />
                )}
                {locationSearch && !searchingLocation && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1.5 h-8 w-8 p-0"
                    onClick={handleClearSearch}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}

                {showLocationSuggestions &&
                  locationSuggestions.length > 0 &&
                  !hasSelected && (
                    <div className="absolute z-50 w-full bg-background border rounded-md mt-1 shadow-lg max-h-[300px] overflow-auto">
                      {locationSuggestions.map((location, index) => (
                        <div
                          key={index}
                          className={cn(
                            "px-3 py-3 hover:bg-accent cursor-pointer border-b last:border-b-0",
                            location.isActualArea && "bg-primary/5"
                          )}
                          onClick={() => handleLocationSelect(location)}
                        >
                          <div className="flex items-start gap-2">
                            <MapPin className="h-4 w-4 mt-0.5" />
                            <div className="flex-1">
                              <div className="font-medium text-sm">
                                {location.mainText}
                              </div>
                              {location.secondaryText && (
                                <div className="text-xs text-muted-foreground">
                                  {location.secondaryText}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            </div>

            <div>
              <Label>Street Address *</Label>
              <Input
                value={formData.address_line1}
                onChange={(e) =>
                  setFormData({ ...formData, address_line1: e.target.value })
                }
                placeholder="Building/Street address"
                className="h-11"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>
                  City *
                  {formData.city && (
                    <Check className="inline w-3 h-3 text-green-500 ml-1" />
                  )}
                </Label>
                <Input
                  value={formData.city}
                  onChange={(e) =>
                    setFormData({ ...formData, city: e.target.value })
                  }
                  placeholder="Enter city"
                  className="h-11"
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
                  onChange={(e) =>
                    setFormData({ ...formData, state: e.target.value })
                  }
                  placeholder="Enter state"
                  className="h-11"
                />
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
                  onChange={(e) =>
                    setFormData({ ...formData, pincode: e.target.value })
                  }
                  placeholder="6-digit pincode"
                  maxLength={6}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Tax Information */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Tax Information (Optional)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>GST Number</Label>
                <Input
                  value={formData.gst_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      gst_number: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="15-character GST number"
                  maxLength={15}
                  className="h-11"
                />
              </div>
              <div>
                <Label>PAN Number</Label>
                <Input
                  value={formData.pan_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pan_number: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="10-character PAN"
                  maxLength={10}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* ✅ NEW SECTION - Billing Configuration */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Billing Configuration
            </h3>
            <div className="flex items-start space-x-3 p-4 bg-muted/30 rounded-lg border">
              <Checkbox
                id="is_billing_party"
                checked={formData.is_billing_party}
                onCheckedChange={(checked) =>
                  setFormData({
                    ...formData,
                    is_billing_party: checked as boolean,
                  })
                }
                className="mt-1"
              />
              <div className="space-y-1">
                <Label
                  htmlFor="is_billing_party"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  Mark as Billing Party
                </Label>
                <p className="text-xs text-muted-foreground">
                  Enable this to include this party in billing reports and
                  finance operations. Billing parties appear in the dedicated
                  "Billing Parties" tab with additional financial metrics like
                  outstanding amounts and billing status.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button
              variant="outline"
              onClick={() => navigate("/customers")}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {mode === "edit" ? "Update Party" : "Add Party"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
