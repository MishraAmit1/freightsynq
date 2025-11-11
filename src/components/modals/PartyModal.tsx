import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
    Check
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

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

// Types
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
    party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
    status: 'ACTIVE' | 'INACTIVE';
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
    party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH';
}

interface PartyModalProps {
    isOpen: boolean;
    onClose: () => void;
    party: Party | null;
    onSave: () => void;
    mode: 'create' | 'edit';
}

// Email validation with proper domains
const validateEmail = (email: string): boolean => {
    if (!email) return true; // Email is optional

    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) return false;

    // Common valid email domains
    const validDomains = [
        'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
        'zoho.com', 'protonmail.com', 'icloud.com', 'aol.com',
        'mail.com', 'yandex.com', 'live.com', 'msn.com',
        'rediffmail.com', 'inbox.com'
    ];

    const domain = email.split('@')[1]?.toLowerCase();

    // Check if it's a common domain or has valid TLD
    return validDomains.includes(domain) ||
        domain?.endsWith('.com') ||
        domain?.endsWith('.in') ||
        domain?.endsWith('.co') ||
        domain?.endsWith('.org') ||
        domain?.endsWith('.net') ||
        domain?.endsWith('.edu');
};

export const PartyModal: React.FC<PartyModalProps> = ({
    isOpen,
    onClose,
    party = null,
    onSave,
    mode = "create"
}) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
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
        party_type: "BOTH"
    });

    // Reset when modal opens
    useEffect(() => {
        if (isOpen) {
            if (party && mode === "edit") {
                setFormData({
                    name: party.name || "",
                    contact_person: party.contact_person || "",
                    phone: party.phone || "",
                    email: party.email || "",
                    address_line1: party.address_line1 || "",
                    city: party.city || "",
                    state: party.state || "",
                    pincode: party.pincode || "",
                    gst_number: party.gst_number || "",
                    pan_number: party.pan_number || "",
                    party_type: party.party_type || "BOTH"
                });
                if (party.address_line1) {
                    setLocationSearch(party.address_line1);
                    setHasSelected(true);
                }
            } else {
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
                    party_type: "BOTH"
                });
                setLocationSearch("");
                setHasSelected(false);
            }
            setLocationSuggestions([]);
            setShowLocationSuggestions(false);
        }
    }, [isOpen, party, mode]);

    // Search locations
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

        try {
            const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

            if (!apiKey) {
                console.warn("⚠️ Google Places API key not found, using fallback");
                throw new Error("API key not configured");
            }

            const sessionToken = Math.random().toString(36).substring(7);

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

            if (!response.ok) {
                throw new Error(`API Error: ${response.status}`);
            }

            const data = await response.json();

            if (!hasSelected && data.suggestions) {
                const formattedResults = data.suggestions.map((suggestion: any) => {
                    const prediction = suggestion.placePrediction;
                    const mainText = prediction.structuredFormat?.mainText?.text ||
                        prediction.text?.text || '';
                    const secondaryText = prediction.structuredFormat?.secondaryText?.text || '';

                    const isArea = secondaryText && !mainText.includes(secondaryText);

                    return {
                        placeId: prediction.placeId,
                        area: isArea ? mainText : '',
                        city: isArea ? secondaryText.split(',')[0] : mainText,
                        displayText: prediction.text?.text || mainText,
                        mainText: mainText,
                        secondaryText: secondaryText,
                        isActualArea: isArea,
                        fullText: prediction.text?.text || '',
                        isGoogle: true
                    };
                });

                setLocationSuggestions(formattedResults);
                setShowLocationSuggestions(formattedResults.length > 0);
            }
        } catch (error) {
            console.error("❌ Google Places API error:", error);

            // Fallback to Nominatim
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
                        const area = item.address?.suburb || item.address?.neighbourhood || '';
                        const city = item.address?.city || item.address?.town || '';

                        return {
                            placeId: `nominatim_${item.place_id}`,
                            area: area,
                            city: city || area,
                            state: item.address?.state || '',
                            postcode: item.address?.postcode || '',
                            displayText: area && city ? `${area}, ${city}` : city || area,
                            mainText: area || city,
                            secondaryText: city ? `${city}, ${item.address?.state}` : item.address?.state,
                            isActualArea: area && city && area !== city,
                            isNominatim: true
                        };
                    })
                    .filter((item: any) => item.city);

                setLocationSuggestions(formattedResults);
                setShowLocationSuggestions(formattedResults.length > 0);

                toast({
                    title: "ℹ️ Using Backup Search",
                    description: "Google Places temporarily unavailable",
                });
            } catch (fallbackError) {
                console.error("❌ Fallback search also failed:", fallbackError);
                toast({
                    title: "❌ Search Failed",
                    description: "Unable to search locations",
                    variant: "destructive"
                });
            }
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
                        method: 'GET',
                        headers: {
                            'X-Goog-FieldMask': 'addressComponents,location,displayName'
                        }
                    }
                );

                if (!detailsResponse.ok) {
                    throw new Error('Failed to fetch place details');
                }

                const placeDetails = await detailsResponse.json();
                const components = placeDetails.addressComponents || [];

                let locationData = {
                    area: '',
                    city: '',
                    state: '',
                    pincode: ''
                };

                components.forEach((comp: any) => {
                    const types = comp.types || [];

                    if (types.includes('sublocality_level_1') ||
                        types.includes('sublocality') ||
                        types.includes('neighborhood')) {
                        locationData.area = comp.longText || comp.shortText;
                    }

                    if (types.includes('locality')) {
                        locationData.city = comp.longText || comp.shortText;
                    }

                    if (types.includes('administrative_area_level_1')) {
                        locationData.state = comp.longText || comp.shortText;
                    }

                    if (types.includes('postal_code')) {
                        locationData.pincode = comp.longText || comp.shortText;
                    }
                });

                if (!locationData.area && location.mainText) {
                    locationData.area = location.mainText;
                }

                setFormData(prev => ({
                    ...prev,
                    address_line1: locationData.area || prev.address_line1,
                    city: locationData.city || '',
                    state: locationData.state || '',
                    pincode: locationData.pincode || prev.pincode
                }));

                setLocationSearch(location.displayText);
                setHasSelected(true);
                setLocationSuggestions([]);
                setShowLocationSuggestions(false);

                toast({
                    title: "✅ Location Selected (Google)",
                    description: `${location.displayText}`,
                });

            } else {
                setFormData(prev => ({
                    ...prev,
                    address_line1: location.area || prev.address_line1,
                    city: location.city || '',
                    state: location.state || '',
                    pincode: location.postcode || prev.pincode
                }));

                setLocationSearch(location.displayText);
                setHasSelected(true);
                setLocationSuggestions([]);
                setShowLocationSuggestions(false);

                toast({
                    title: "✅ Location Selected",
                    description: `${location.displayText}`,
                });
            }
        } catch (error) {
            console.error("❌ Error getting place details:", error);
            toast({
                title: "❌ Error",
                description: "Failed to get complete location details",
                variant: "destructive"
            });
        } finally {
            setSearchingLocation(false);
        }
    };

    const handleLocationInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        // Validation
        if (!formData.name.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "Party name is required",
                variant: "destructive"
            });
            return;
        }

        if (!formData.phone.trim() || !/^[0-9]{10}$/.test(formData.phone)) {
            toast({
                title: "❌ Validation Error",
                description: "Valid 10-digit phone number is required",
                variant: "destructive"
            });
            return;
        }

        if (!formData.address_line1.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "Address is required",
                variant: "destructive"
            });
            return;
        }

        if (!formData.city.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "City is required",
                variant: "destructive"
            });
            return;
        }

        if (!formData.state.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "State is required",
                variant: "destructive"
            });
            return;
        }

        if (!formData.pincode.trim() || !/^[0-9]{6}$/.test(formData.pincode)) {
            toast({
                title: "❌ Validation Error",
                description: "Valid 6-digit pincode is required",
                variant: "destructive"
            });
            return;
        }

        if (formData.email && !validateEmail(formData.email)) {
            toast({
                title: "❌ Validation Error",
                description: "Please enter a valid email address",
                variant: "destructive"
            });
            return;
        }

        if (formData.gst_number && formData.gst_number.length > 0 &&
            !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gst_number)) {
            toast({
                title: "❌ Validation Error",
                description: "Invalid GST number format",
                variant: "destructive"
            });
            return;
        }

        if (formData.pan_number && formData.pan_number.length > 0 &&
            !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan_number)) {
            toast({
                title: "❌ Validation Error",
                description: "Invalid PAN number format",
                variant: "destructive"
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
                status: 'ACTIVE'
            };

            if (mode === "edit" && party) {
                const { error } = await supabase
                    .from("parties")
                    .update(dataToSave)
                    .eq("id", party.id);

                if (error) throw error;

                toast({
                    title: "✅ Success",
                    description: "Party updated successfully",
                });
            } else {
                // Check for duplicates
                const { data: existingParties, error: checkError } = await supabase
                    .from("parties")
                    .select("id, name, phone, gst_number")
                    .or(`name.ilike.${dataToSave.name},phone.eq.${dataToSave.phone}${dataToSave.gst_number ? `,gst_number.eq.${dataToSave.gst_number}` : ''}`);

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
                        variant: "destructive"
                    });
                    return;
                }

                const { error } = await supabase
                    .from("parties")
                    .insert([dataToSave]);

                if (error) throw error;

                toast({
                    title: "✅ Success",
                    description: "Party added successfully",
                });
            }

            onSave();
            onClose();
        } catch (error: any) {
            console.error("Error saving party:", error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to save party",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-background via-background to-muted/5">
                <DialogHeader className="border-b pb-4">
                    <DialogTitle className="text-xl flex items-center gap-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <User className="w-5 h-5 text-primary" />
                        </div>
                        {mode === "edit" ? "Edit Party" : "Add New Party"}
                    </DialogTitle>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* Party Type Selection */}
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label>Party Type *</Label>
                            <Select
                                value={formData.party_type}
                                onValueChange={(value: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH') =>
                                    setFormData({ ...formData, party_type: value })
                                }
                            >
                                <SelectTrigger className="h-11 border-muted-foreground/20">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CONSIGNOR">Consignor Only</SelectItem>
                                    <SelectItem value="CONSIGNEE">Consignee Only</SelectItem>
                                    <SelectItem value="BOTH">Both (Can be either)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Basic Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                            <Building2 className="w-4 h-4" />
                            Basic Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Party Name *</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="Enter unique party name"
                                    className="h-11 border-muted-foreground/20 focus:border-primary transition-all"
                                />
                            </div>
                            <div>
                                <Label>Contact Person</Label>
                                <Input
                                    value={formData.contact_person}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                    placeholder="Contact person name"
                                    className="h-11 border-muted-foreground/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Contact Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="w-4 h-4" />
                            Contact Information
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Phone Number *</Label>
                                <Input
                                    value={formData.phone}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    placeholder="10-digit phone number"
                                    maxLength={10}
                                    className="h-11 border-muted-foreground/20 focus:border-primary transition-all"
                                />
                            </div>
                            <div>
                                <Label>Email Address</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    placeholder="email@gmail.com"
                                    className="h-11 border-muted-foreground/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Address Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            Address Details
                        </h3>
                        <div className="space-y-4">
                            {/* Location Search */}
                            <div>
                                <Label>
                                    Search Area/City (e.g., Chanod, Vapi, Surat)
                                    {hasSelected && (
                                        <span className="text-xs text-green-500 ml-2">
                                            ✓ Location selected
                                        </span>
                                    )}
                                </Label>
                                <div className="relative">
                                    <div className="relative">
                                        <MapPin className="absolute left-3 top-3.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            value={locationSearch}
                                            onChange={handleLocationInputChange}
                                            placeholder="Type area or city name..."
                                            className="pl-10 pr-10 h-11 border-muted-foreground/20 focus:border-primary transition-all"
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
                                    </div>

                                    {/* Location Suggestions Dropdown */}
                                    {showLocationSuggestions && locationSuggestions.length > 0 && !hasSelected && (
                                        <div className="absolute z-50 w-full bg-background border rounded-md mt-1 shadow-lg max-h-[300px] overflow-auto">
                                            {locationSuggestions.map((location, index) => (
                                                <div
                                                    key={index}
                                                    className={cn(
                                                        "px-3 py-3 hover:bg-accent cursor-pointer border-b last:border-b-0 transition-colors",
                                                        location.isActualArea && "bg-primary/5"
                                                    )}
                                                    onClick={() => handleLocationSelect(location)}
                                                >
                                                    <div className="flex items-start gap-2">
                                                        <MapPin className={cn(
                                                            "h-4 w-4 mt-0.5 shrink-0",
                                                            location.isActualArea ? "text-primary" : "text-muted-foreground"
                                                        )} />
                                                        <div className="flex-1">
                                                            <div className="font-medium text-sm">
                                                                {location.isActualArea ? (
                                                                    <>
                                                                        <span className="text-primary font-semibold">
                                                                            {location.mainText}
                                                                        </span>
                                                                        <span className="text-muted-foreground font-normal">
                                                                            {' • '}{location.secondaryText}
                                                                        </span>
                                                                    </>
                                                                ) : (
                                                                    <span className="text-foreground">
                                                                        {location.mainText}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {location.secondaryText && (
                                                                <div className="text-xs text-muted-foreground mt-0.5">
                                                                    {location.secondaryText}
                                                                </div>
                                                            )}

                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className={cn(
                                                                    "text-xs px-1.5 py-0.5 rounded font-medium",
                                                                    location.isActualArea
                                                                        ? "bg-primary/20 text-primary"
                                                                        : "bg-muted text-muted-foreground"
                                                                )}>
                                                                    {location.isActualArea ? 'Area' : 'City'}
                                                                </span>

                                                                {location.isGoogle && (
                                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-green-100 text-green-700 font-medium">
                                                                        ✓ Google
                                                                    </span>
                                                                )}

                                                                {location.isNominatim && (
                                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-700">
                                                                        Backup
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    🔍 Search area (Chanod) or city (Vapi) - both work!
                                </p>
                            </div>

                            <div>
                                <Label>Street Address *</Label>
                                <Input
                                    value={formData.address_line1}
                                    onChange={(e) => setFormData({ ...formData, address_line1: e.target.value })}
                                    placeholder="Building/Street address"
                                    className="h-11 border-muted-foreground/20 focus:border-primary transition-all"
                                />
                            </div>

                            {/* City, State, Pincode */}
                            <div className="grid grid-cols-3 gap-4">
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
                                        placeholder="Enter city"
                                        className={cn(
                                            "h-11 border-muted-foreground/20 focus:border-primary transition-all",
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
                                        placeholder="Enter state"
                                        className={cn(
                                            "h-11 border-muted-foreground/20 focus:border-primary transition-all",
                                            formData.state && "border-green-500/50"
                                        )}
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
                                        onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                                        placeholder="6-digit pincode"
                                        maxLength={6}
                                        className={cn(
                                            "h-11 border-muted-foreground/20 focus:border-primary transition-all",
                                            formData.pincode.length === 6 && "border-green-500/50"
                                        )}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tax Information */}
                    <div className="space-y-2">
                        <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Tax Information (Optional)
                        </h3>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>GST Number</Label>
                                <Input
                                    value={formData.gst_number}
                                    onChange={(e) => setFormData({ ...formData, gst_number: e.target.value.toUpperCase() })}
                                    placeholder="15-character GST number"
                                    maxLength={15}
                                    className="h-11 border-muted-foreground/20 focus:border-primary transition-all"
                                />
                            </div>
                            <div>
                                <Label>PAN Number</Label>
                                <Input
                                    value={formData.pan_number}
                                    onChange={(e) => setFormData({ ...formData, pan_number: e.target.value.toUpperCase() })}
                                    placeholder="10-character PAN"
                                    maxLength={10}
                                    className="h-11 border-muted-foreground/20 focus:border-primary transition-all"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={loading}
                        className="hover:bg-muted"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        {mode === "edit" ? "Update Party" : "Add Party"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};