import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
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
  Save,
  DollarSign,
  Sparkles,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { lookupGST, GSTData, getCachedGST } from "@/api/gst-lookup"; // ✅ Import GST API

// Types
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
  is_billing_party: boolean;
}

interface AddEditPartyDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  partyId?: string | null;
  onSuccess?: () => void;
}

// Debounce Hook
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

// Email Validation
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

export const AddEditPartyDrawer = ({
  isOpen,
  onClose,
  partyId,
  onSuccess,
}: AddEditPartyDrawerProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);

  // ✅ GST Verification States
  const [gstLookupLoading, setGstLookupLoading] = useState(false);
  const [gstValid, setGstValid] = useState<boolean | null>(null);
  const [gstData, setGstData] = useState<GSTData | null>(null);

  const mode = partyId ? "edit" : "create";

  // Location search states
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<any[]>([]);
  const [searchingLocation, setSearchingLocation] = useState(false);
  const [showLocationSuggestions, setShowLocationSuggestions] = useState(false);
  const [hasSelected, setHasSelected] = useState(false);

  const debouncedLocationSearch = useDebounce(locationSearch, 500);
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
    is_billing_party: false,
  });
  const debouncedGSTNumber = useDebounce(formData.gst_number, 2000);

  // ✅ GST Lookup with DEBOUNCE (2 second delay)
  useEffect(() => {
    // Only proceed if debounced value is ready
    if (debouncedGSTNumber && debouncedGSTNumber.length === 15) {
      const normalizedGST = debouncedGSTNumber.toUpperCase().trim();

      console.log("⏱️ 2 seconds passed, now checking GST:", normalizedGST);

      // CHECK CACHE FIRST
      const cached = getCachedGST(normalizedGST);

      if (cached) {
        console.log("✅ Using cached GST data - NO API CALL!");
        setGstData(cached);
        setGstValid(cached.success);
        setGstLookupLoading(false); // Stop loading

        if (cached.success) {
          const panFromGst = normalizedGST.substring(2, 12);

          setFormData((prev) => ({
            ...prev,
            name: cached.tradeName || prev.name,
            address_line1: cached.address || prev.address_line1,
            city: cached.city || prev.city,
            state: cached.state || prev.state,
            pincode: cached.pincode || prev.pincode,
            pan_number: panFromGst || prev.pan_number,
          }));

          if (cached.address) {
            setLocationSearch(cached.address);
            setHasSelected(true);
          }

          toast({
            title: "✅ GST Verified (Cached)",
            description: `Company: ${cached.tradeName}`,
          });
        }
      } else {
        console.log("🔍 No cache found, calling API...");
        handleGSTLookup(normalizedGST);
      }
    } else if (debouncedGSTNumber && debouncedGSTNumber.length < 15) {
      setGstData(null);
      setGstValid(null);
      setGstLookupLoading(false);
    }
  }, [debouncedGSTNumber]); // ← IMPORTANT: Watch debouncedGSTNumber

  // ✅ ADD THIS - Show loading while user is typing (visual feedback)
  useEffect(() => {
    // If user typed 15 chars but debounce hasn't fired yet
    if (
      formData.gst_number.length === 15 &&
      formData.gst_number !== debouncedGSTNumber
    ) {
      setGstLookupLoading(true); // Show spinner immediately
      console.log("⏱️ Waiting 2 seconds before GST verification...");
    }

    // If user is still typing (less than 15 chars)
    if (formData.gst_number.length < 15) {
      setGstLookupLoading(false);
      setGstValid(null);
      setGstData(null);
    }
  }, [formData.gst_number, debouncedGSTNumber]);
  // ✅ GST Lookup Function (same as signup)
  const handleGSTLookup = async (gstNumber: string) => {
    const gstRegex =
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;

    if (!gstRegex.test(gstNumber)) {
      setGstValid(false);
      setGstData(null);
      setGstLookupLoading(false); // ✅ ADD THIS
      return;
    }

    setGstLookupLoading(true);
    setGstValid(null);

    try {
      const result = await lookupGST(gstNumber);

      if (result.success && result.tradeName) {
        console.log("✅ GST Verified:", result);
        setGstData(result);
        setGstValid(true);

        // ✅ Auto-fill fields from GST data
        const panFromGst = gstNumber.substring(2, 12);

        setFormData((prev) => ({
          ...prev,
          name: result.tradeName || prev.name,
          address_line1: result.address || prev.address_line1,
          city: result.city || prev.city,
          state: result.state || prev.state,
          pincode: result.pincode || prev.pincode,
          pan_number: panFromGst || prev.pan_number,
        }));

        // Update location search if address filled
        if (result.address) {
          setLocationSearch(result.address);
          setHasSelected(true);
        }

        toast({
          title: "✅ GST Verified Successfully",
          description: `Company: ${result.tradeName}`,
        });
      } else if (result.serviceDown) {
        setGstValid(false);
        setGstData(null);
        toast({
          title: "⚠️ GST Service Unavailable",
          description: "You can continue without GST verification",
        });
      } else {
        setGstValid(false);
        setGstData(null);
        toast({
          title: "❌ GST Verification Failed",
          description: result.error || "Invalid GST number",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      console.error("GST lookup error:", err);
      setGstValid(false);
      setGstData(null);
      toast({
        title: "❌ Error",
        description: "GST verification service unavailable",
        variant: "destructive",
      });
    } finally {
      setGstLookupLoading(false);
    }
  };

  // Reset form when drawer opens/closes
  useEffect(() => {
    if (isOpen) {
      if (partyId) {
        loadPartyData();
      } else {
        resetForm();
      }
    }
  }, [isOpen, partyId]);

  const resetForm = () => {
    setFormData({
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
      is_billing_party: false,
    });
    setLocationSearch("");
    setHasSelected(false);
    setLocationSuggestions([]);
    setShowLocationSuggestions(false);
    setGstData(null);
    setGstValid(null);
  };

  const loadPartyData = async () => {
    setInitialLoading(true);
    try {
      const { data, error } = await supabase
        .from("parties")
        .select("*")
        .eq("id", partyId)
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
          is_billing_party: data.is_billing_party || false,
        });
        if (data.address_line1) {
          setLocationSearch(data.address_line1);
          setHasSelected(true);
        }
        // If GST exists and is 15 chars, mark as valid
        if (data.gst_number && data.gst_number.length === 15) {
          setGstValid(true);
        }
      }
    } catch (error) {
      console.error("Error loading party:", error);
      toast({
        title: "❌ Error",
        description: "Failed to load party details",
        variant: "destructive",
      });
      onClose();
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

  const searchLocations = async (query: string) => {
    if (hasSelected) return;

    setSearchingLocation(true);
    const sessionToken = Math.random().toString(36).substring(7);

    try {
      const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

      if (!apiKey) {
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
    } finally {
      setSearchingLocation(false);
    }
  };

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
          address_line1: locationData.area || prev.address_line1,
          city: locationData.city || "",
          state: locationData.state || "",
          pincode: locationData.pincode || prev.pincode,
        }));

        setLocationSearch(location.displayText);
        setHasSelected(true);
        setLocationSuggestions([]);
        setShowLocationSuggestions(false);
      } else {
        setFormData((prev) => ({
          ...prev,
          address_line1: location.area || prev.address_line1,
          city: location.city || "",
          state: location.state || "",
          pincode: location.postcode || prev.pincode,
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

  const handleSubmit = async () => {
    // ✅ Validation - Phone is now OPTIONAL
    if (!formData.name.trim()) {
      toast({
        title: "❌ Validation Error",
        description: "Party name is required",
        variant: "destructive",
      });
      return;
    }

    // ✅ Phone validation - OPTIONAL (only validate if provided)
    if (
      formData.phone &&
      formData.phone.trim() &&
      !/^[0-9]{10}$/.test(formData.phone)
    ) {
      toast({
        title: "❌ Validation Error",
        description: "Phone number must be 10 digits",
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

    // ✅ GST validation - OPTIONAL (only if provided, must be valid)
    if (formData.gst_number && formData.gst_number.trim().length > 0) {
      if (formData.gst_number.length !== 15) {
        toast({
          title: "❌ Validation Error",
          description: "GST number must be 15 characters",
          variant: "destructive",
        });
        return;
      }
      if (gstValid === false) {
        toast({
          title: "❌ Validation Error",
          description: "Please enter a valid GST number or leave it empty",
          variant: "destructive",
        });
        return;
      }
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
        phone: formData.phone.trim() || null, // ✅ Can be null now
        email: formData.email.trim() || null,
        address_line1: formData.address_line1.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        pincode: formData.pincode.trim(),
        gst_number: formData.gst_number.trim() || null,
        pan_number: formData.pan_number.trim() || null,
        party_type: formData.party_type,
        status: "ACTIVE" as const,
        is_billing_party: formData.is_billing_party,
      };

      if (mode === "edit" && partyId) {
        const { error } = await supabase
          .from("parties")
          .update(dataToSave)
          .eq("id", partyId);

        if (error) throw error;

        toast({
          title: "✅ Success",
          description: "Party updated successfully",
        });
      } else {
        // ✅ Check duplicates (name or GST only)
        const { data: existingParties, error: checkError } = await supabase
          .from("parties")
          .select("id, name, gst_number")
          .or(
            `name.ilike.${dataToSave.name}${
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

      onSuccess?.();
      onClose();
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-3xl overflow-y-auto bg-card border-l border-border dark:border-border">
        <SheetHeader className="border-b border-border dark:border-border pb-4">
          <SheetTitle className="flex items-center gap-2 text-foreground dark:text-white">
            <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
              <User className="w-5 h-5 text-primary" />
            </div>
            {mode === "edit" ? "Edit Party" : "Add New Party"}
          </SheetTitle>
        </SheetHeader>

        {initialLoading ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
            <div className="relative">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
            </div>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground animate-pulse">
              Loading party details...
            </p>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Party Type + Billing Party */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  Party Type <span className="text-red-600">*</span>
                </Label>
                <Select
                  value={formData.party_type}
                  onValueChange={(value: "CONSIGNOR" | "CONSIGNEE" | "BOTH") =>
                    setFormData({ ...formData, party_type: value })
                  }
                >
                  <SelectTrigger className="h-10 border-border dark:border-border bg-card hover:bg-accent dark:hover:bg-secondary focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card border-border dark:border-border">
                    <SelectItem
                      value="CONSIGNOR"
                      className="hover:bg-accent dark:hover:bg-secondary"
                    >
                      Consignor Only
                    </SelectItem>
                    <SelectItem
                      value="CONSIGNEE"
                      className="hover:bg-accent dark:hover:bg-secondary"
                    >
                      Consignee Only
                    </SelectItem>
                    <SelectItem
                      value="BOTH"
                      className="hover:bg-accent dark:hover:bg-secondary"
                    >
                      Both
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  Billing Settings
                </Label>
                <div className="flex items-center space-x-2 h-10 px-3 border border-border dark:border-border rounded-lg bg-muted">
                  <Checkbox
                    id="is_billing_party"
                    checked={formData.is_billing_party}
                    onCheckedChange={(checked) =>
                      setFormData({
                        ...formData,
                        is_billing_party: checked as boolean,
                      })
                    }
                    className="data-[state=checked]:bg-primary data-[state=checked]:border-primary data-[state=checked]:text-foreground"
                  />
                  <Label
                    htmlFor="is_billing_party"
                    className="text-sm font-medium cursor-pointer flex items-center gap-1.5 text-foreground dark:text-white"
                  >
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    Billing Party
                  </Label>
                </div>
              </div>
            </div>

            <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

            {/* ✅ GST Verification Section (FIRST - Like Signup) */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                GST Verification (Optional - Auto-fills details)
              </h3>
              <div>
                <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  GST Number
                  <span className="text-xs text-muted-foreground ml-2">
                    (15 characters)
                  </span>
                </Label>
                <div className="relative mt-1">
                  <Input
                    value={formData.gst_number}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        gst_number: e.target.value.toUpperCase(),
                      })
                    }
                    placeholder="Enter 15-digit GST number"
                    maxLength={15}
                    className={cn(
                      "h-10 text-sm pr-10 uppercase border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      gstValid === true &&
                        "border-green-500 dark:border-green-600 bg-green-50 dark:bg-green-900/20",
                      gstValid === false &&
                        formData.gst_number.length === 15 &&
                        "border-red-500 dark:border-red-600"
                    )}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {gstLookupLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    )}
                    {!gstLookupLoading && gstValid === true && (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    )}
                    {!gstLookupLoading &&
                      gstValid === false &&
                      formData.gst_number.length === 15 && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                  </div>
                </div>
                {gstValid === true && (
                  <p className="text-xs text-green-600 dark:text-green-400 flex items-center gap-1 mt-1">
                    <Sparkles className="w-3 h-3" />
                    Verified! Details auto-filled below
                  </p>
                )}
                {gstValid === false && formData.gst_number.length === 15 && (
                  <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                    Invalid GST number. You can leave it empty.
                  </p>
                )}
              </div>
            </div>

            <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

            {/* Basic Information */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Basic Information
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Party Name <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="Enter party name"
                    className={cn(
                      "h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      gstData?.tradeName &&
                        "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/30"
                    )}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Contact Person
                  </Label>
                  <Input
                    value={formData.contact_person}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_person: e.target.value,
                      })
                    }
                    placeholder="Contact person"
                    className="h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

            {/* Contact Information */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Contact
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Phone
                    <span className="text-xs text-muted-foreground ml-2"></span>
                  </Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) =>
                      setFormData({ ...formData, phone: e.target.value })
                    }
                    placeholder="10-digit number"
                    maxLength={10}
                    className="h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Email
                    <span className="text-xs text-muted-foreground ml-2"></span>
                  </Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    placeholder="email@example.com"
                    className="h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

            {/* Address */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                Address
              </h3>

              <div>
                <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  Search Location
                  {hasSelected && (
                    <Check className="inline w-3 h-3 text-[#059669] ml-1" />
                  )}
                </Label>
                <div className="relative mt-1">
                  <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />
                  <Input
                    value={locationSearch}
                    onChange={handleLocationInputChange}
                    placeholder="Type area or city..."
                    className="pl-9 pr-9 h-9 text-sm border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                    autoComplete="off"
                  />
                  {searchingLocation && (
                    <Loader2 className="absolute right-2.5 top-2.5 h-3.5 w-3.5 animate-spin text-primary" />
                  )}
                  {locationSearch && !searchingLocation && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-accent dark:hover:bg-secondary"
                      onClick={handleClearSearch}
                    >
                      <X className="h-3 w-3 text-muted-foreground dark:text-muted-foreground" />
                    </Button>
                  )}

                  {showLocationSuggestions &&
                    locationSuggestions.length > 0 &&
                    !hasSelected && (
                      <div className="absolute z-50 w-full bg-card border border-border dark:border-border rounded-lg mt-1 shadow-lg max-h-[200px] overflow-auto">
                        {locationSuggestions.map((location, index) => (
                          <div
                            key={index}
                            className={cn(
                              "px-3 py-2 cursor-pointer border-b border-border dark:border-border last:border-b-0 transition-colors",
                              "hover:bg-accent dark:hover:bg-secondary",
                              location.isActualArea &&
                                "bg-accent/30 dark:bg-primary/5"
                            )}
                            onClick={() => handleLocationSelect(location)}
                          >
                            <div className="flex items-start gap-2">
                              <MapPin
                                className={cn(
                                  "h-3.5 w-3.5 mt-0.5",
                                  location.isActualArea
                                    ? "text-primary"
                                    : "text-muted-foreground dark:text-muted-foreground"
                                )}
                              />
                              <div className="flex-1">
                                <div className="font-medium text-xs text-foreground dark:text-white">
                                  {location.mainText}
                                </div>
                                {location.secondaryText && (
                                  <div className="text-[10px] text-muted-foreground dark:text-muted-foreground">
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
                <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  Street Address <span className="text-red-600">*</span>
                </Label>
                <Input
                  value={formData.address_line1}
                  onChange={(e) =>
                    setFormData({ ...formData, address_line1: e.target.value })
                  }
                  placeholder="Building/Street"
                  className={cn(
                    "h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                    gstData?.address &&
                      "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/30"
                  )}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    City <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    placeholder="City"
                    className={cn(
                      "h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      gstData?.city &&
                        "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/30"
                    )}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    State <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                    placeholder="State"
                    className={cn(
                      "h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      gstData?.state &&
                        "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/30"
                    )}
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                    Pincode <span className="text-red-600">*</span>
                  </Label>
                  <Input
                    value={formData.pincode}
                    onChange={(e) =>
                      setFormData({ ...formData, pincode: e.target.value })
                    }
                    placeholder="6-digit"
                    maxLength={6}
                    className={cn(
                      "h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground",
                      gstData?.pincode &&
                        "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/30"
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-[#E5E7EB] dark:bg-secondary" />

            {/* PAN Number */}
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-muted-foreground dark:text-muted-foreground flex items-center gap-2">
                <FileText className="w-4 h-4" />
                PAN (Optional)
              </h3>
              <div>
                <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                  PAN Number
                </Label>
                <Input
                  value={formData.pan_number}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      pan_number: e.target.value.toUpperCase(),
                    })
                  }
                  placeholder="10 characters"
                  maxLength={10}
                  className={cn(
                    "h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground uppercase",
                    formData.pan_number?.length === 10 &&
                      "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-800/30"
                  )}
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-border dark:border-border">
              <Button
                variant="outline"
                onClick={onClose}
                disabled={loading}
                size="sm"
                className="border-border dark:border-border hover:bg-muted dark:hover:bg-secondary text-foreground dark:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                size="sm"
                className="bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium shadow-sm hover:shadow-md transition-all"
              >
                {loading && (
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                )}
                <Save className="w-3.5 h-3.5 mr-2" />
                {mode === "edit" ? "Update" : "Add Party"}
              </Button>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};
