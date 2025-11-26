import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Building2, Loader2, MapPin, X, Check, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

// Debounce Hook
const useDebounce = (value: string, delay: number) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};

interface AddBrokerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (brokerData: {
        name: string;
        contactPerson: string;
        phone: string;
        email: string;
        city: string;
    }) => void;
    broker?: any; // ✅ For edit mode
}

export const AddBrokerModal = ({ isOpen, onClose, onSave, broker }: AddBrokerModalProps) => {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        name: "",
        contactPerson: "",
        phone: "",
        email: "",
        city: ""
    });

    const mode = broker ? "edit" : "create";

    const [citySearch, setCitySearch] = useState("");
    const [citySuggestions, setCitySuggestions] = useState<any[]>([]);
    const [searchingCity, setSearchingCity] = useState(false);
    const [showCitySuggestions, setShowCitySuggestions] = useState(false);
    const [hasSelectedCity, setHasSelectedCity] = useState(false);
    const debouncedCitySearch = useDebounce(citySearch, 500);

    useEffect(() => {
        if (isOpen) {
            if (broker) {
                setFormData({
                    name: broker.name || "",
                    contactPerson: broker.contact_person || "",
                    phone: broker.phone || "",
                    email: broker.email || "",
                    city: broker.city || ""
                });
                setCitySearch(broker.city || "");
                setHasSelectedCity(!!broker.city);
            } else {
                setFormData({
                    name: "",
                    contactPerson: "",
                    phone: "",
                    email: "",
                    city: ""
                });
                setCitySearch("");
                setHasSelectedCity(false);
            }
        }
    }, [isOpen, broker]);

    useEffect(() => {
        if (hasSelectedCity) {
            setShowCitySuggestions(false);
            return;
        }
        if (debouncedCitySearch.length > 2) {
            searchLocations(debouncedCitySearch);
        } else {
            setShowCitySuggestions(false);
            setCitySuggestions([]);
        }
    }, [debouncedCitySearch, hasSelectedCity]);

    const searchLocations = async (query: string) => {
        if (hasSelectedCity) return;
        setSearchingCity(true);
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
                    if (!hasSelectedCity && data.suggestions) {
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
                                state: secondaryText ? secondaryText.split(',').slice(-1)[0].trim() : '',
                                displayText: prediction.text?.text || mainText,
                                mainText: mainText,
                                secondaryText: secondaryText,
                                isActualArea: isArea,
                                fullText: prediction.text?.text || '',
                                isGoogle: true
                            };
                        });

                        setCitySuggestions(formattedResults);
                        setShowCitySuggestions(formattedResults.length > 0);
                        return;
                    }
                }
            }

            throw new Error("Falling back to Nominatim");

        } catch (error) {
            // Fallback to Nominatim
            try {
                const fallbackResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=10&addressdetails=1&featuretype=settlement&accept-language=en`
                );
                const data = await fallbackResponse.json();

                if (!hasSelectedCity) {
                    const formattedResults = data
                        .map((item: any) => {
                            const area = item.address?.suburb || item.address?.neighbourhood ||
                                item.address?.locality || item.address?.hamlet || '';
                            const city = item.address?.city || item.address?.town ||
                                item.address?.village || item.address?.municipality || '';
                            const state = item.address?.state || '';

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

                            const isArea = ['suburb', 'neighbourhood', 'locality', 'hamlet', 'quarter', 'residential'].includes(item.type);
                            const isCity = ['city', 'town', 'village', 'municipality'].includes(item.type);

                            return {
                                area: area || city || '',
                                city: city || area || '',
                                state: state,
                                displayText: displayText,
                                display_name: item.display_name,
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
                            return !hasNonEnglish && !hasDevanagari && item.city && item.state &&
                                (item.isArea || item.isCity || item.isActualArea);
                        })
                        .filter((item: any, index: number, self: any[]) =>
                            index === self.findIndex((t) => t.displayText === item.displayText && t.city === item.city)
                        )
                        .sort((a: any, b: any) => {
                            if (a.isActualArea && !b.isActualArea) return -1;
                            if (!a.isActualArea && b.isActualArea) return 1;
                            if (a.isArea && !b.isArea) return -1;
                            if (!a.isArea && b.isArea) return 1;
                            return b.importance - a.importance;
                        });

                    setCitySuggestions(formattedResults);
                    setShowCitySuggestions(formattedResults.length > 0);
                }
            } catch (fallbackError) {
                console.error("Both search methods failed:", fallbackError);
            }
        } finally {
            setSearchingCity(false);
        }
    };

    const handleCitySelect = async (location: any) => {
        setSearchingCity(true);

        try {
            let finalLocation = { ...location };

            // If it's a Google Places result, get detailed information
            if (location.placeId && location.isGoogle) {
                const apiKey = import.meta.env.VITE_GOOGLE_PLACES_API_KEY;

                if (apiKey) {
                    const detailsResponse = await fetch(
                        `https://places.googleapis.com/v1/places/${location.placeId}?key=${apiKey}&fields=addressComponents,location,displayName`,
                        {
                            method: 'GET',
                            headers: {
                                'X-Goog-FieldMask': 'addressComponents,location,displayName'
                            }
                        }
                    );

                    if (detailsResponse.ok) {
                        const placeDetails = await detailsResponse.json();
                        const components = placeDetails.addressComponents || [];

                        let locationData = {
                            area: '',
                            city: '',
                            state: ''
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
                        });

                        if (!locationData.area && location.mainText) {
                            locationData.area = location.mainText;
                        }

                        finalLocation = {
                            ...location,
                            area: locationData.area,
                            city: locationData.city,
                            state: locationData.state
                        };
                    }
                }
            }

            // Set the city value (area + city or just city)
            const cityValue = finalLocation.area && finalLocation.city && finalLocation.area !== finalLocation.city
                ? `${finalLocation.area}, ${finalLocation.city}`
                : (finalLocation.city || finalLocation.displayText);

            setFormData(prev => ({ ...prev, city: cityValue }));
            setCitySearch(cityValue);
            setHasSelectedCity(true);
            setShowCitySuggestions(false);

            toast({
                title: finalLocation.isGoogle ? "✅ Location Selected (Google)" : "✅ Location Selected",
                description: cityValue
            });

        } catch (error) {
            console.error("Error selecting city:", error);
            toast({
                title: "❌ Error",
                description: "Failed to get location details",
                variant: "destructive"
            });
        } finally {
            setSearchingCity(false);
        }
    };

    const handleCityInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setCitySearch(value);
        setFormData(prev => ({ ...prev, city: value }));
        if (hasSelectedCity) setHasSelectedCity(false);
    };

    const handleClearCitySearch = () => {
        setCitySearch("");
        setFormData(prev => ({ ...prev, city: "" }));
        setHasSelectedCity(false);
        setCitySuggestions([]);
        setShowCitySuggestions(false);
    };

    const handleSubmit = async () => {
        if (!formData.name.trim() || !formData.contactPerson.trim() || !formData.city.trim()) {
            toast({
                title: "❌ Validation Error",
                description: "Please fill in all required fields",
                variant: "destructive"
            });
            return;
        }

        if (formData.phone && formData.phone.length < 10) {
            toast({
                title: "❌ Invalid Phone",
                description: "Phone number must be at least 10 digits",
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);
            await onSave(formData);
            onClose();
        } catch (error) {
            console.error('Error saving broker:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={onClose}>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-card border-l border-border dark:border-border">
                <SheetHeader className="border-b border-border dark:border-border pb-4">
                    <SheetTitle className="flex items-center gap-2 text-foreground dark:text-white">
                        <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                            <Building2 className="w-5 h-5 text-primary" />
                        </div>
                        {mode === "edit" ? "Edit Broker" : "Add New Broker"}
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-5 py-6">
                    <div>
                        <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                            Company Name <span className="text-red-600">*</span>
                        </Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="ABC Transport Company"
                            disabled={loading}
                            className="h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                        />
                    </div>

                    <div>
                        <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                            Contact Person <span className="text-red-600">*</span>
                        </Label>
                        <Input
                            value={formData.contactPerson}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                            className="h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                        />
                    </div>

                    <Separator className="my-4 bg-[#E5E7EB] dark:bg-secondary" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                                Phone Number
                            </Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="9876543210 (Optional)"
                                maxLength={15}
                                disabled={loading}
                                className="h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                            />
                        </div>

                        <div>
                            <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                                Email
                            </Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="broker@company.com"
                                disabled={loading}
                                className="h-9 text-sm mt-1 border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                            />
                        </div>
                    </div>

                    <Separator className="my-4 bg-[#E5E7EB] dark:bg-secondary" />

                    <div>
                        <Label className="text-xs font-medium text-muted-foreground dark:text-muted-foreground">
                            City / Area <span className="text-red-600">*</span>
                            {hasSelectedCity && <Check className="inline w-3 h-3 text-[#059669] ml-1" />}
                        </Label>
                        <div className="relative mt-1">
                            <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground dark:text-muted-foreground" />
                            <Input
                                value={citySearch}
                                onChange={handleCityInputChange}
                                placeholder="Search area or city..."
                                className="pl-9 pr-9 h-9 text-sm border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground"
                                autoComplete="off"
                            />
                            {searchingCity && (
                                <Loader2 className="absolute right-9 top-2.5 h-3.5 w-3.5 animate-spin text-primary" />
                            )}
                            {citySearch && !searchingCity && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1 h-7 w-7 p-0 hover:bg-accent dark:hover:bg-secondary"
                                    onClick={handleClearCitySearch}
                                >
                                    <X className="h-3 w-3 text-muted-foreground dark:text-muted-foreground" />
                                </Button>
                            )}

                            {showCitySuggestions && citySuggestions.length > 0 && !hasSelectedCity && (
                                <div className="absolute z-50 w-full bg-card border border-border dark:border-border rounded-lg mt-1 shadow-lg max-h-[200px] overflow-auto">
                                    {citySuggestions.map((location, index) => (
                                        <div
                                            key={index}
                                            className={cn(
                                                "px-3 py-2 cursor-pointer border-b border-border dark:border-border last:border-b-0 transition-colors",
                                                "hover:bg-accent dark:hover:bg-secondary",
                                                location.isActualArea && "bg-accent/30 dark:bg-primary/5"
                                            )}
                                            onClick={() => handleCitySelect(location)}
                                        >
                                            <div className="flex items-start gap-2">
                                                <MapPin className={cn(
                                                    "h-4 w-4 mt-0.5 shrink-0",
                                                    location.isActualArea ? "text-primary" : "text-muted-foreground dark:text-muted-foreground"
                                                )} />
                                                <div className="flex-1">
                                                    <div className="font-medium text-sm">
                                                        {location.area && location.city && location.area !== location.city ? (
                                                            <>
                                                                <span className="text-primary font-semibold">{location.area}</span>
                                                                <span className="text-muted-foreground dark:text-muted-foreground font-normal"> • {location.city}</span>
                                                            </>
                                                        ) : (
                                                            <span className="text-foreground dark:text-white">{location.city || location.mainText}</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                        <span className="text-xs text-muted-foreground dark:text-muted-foreground">
                                                            {location.state}
                                                        </span>
                                                        <span className={cn(
                                                            "text-xs px-1.5 py-0.5 rounded font-medium",
                                                            location.isActualArea
                                                                ? "bg-primary/20 text-primary dark:text-primary border border-primary/30"
                                                                : "bg-muted dark:bg-secondary text-muted-foreground dark:text-muted-foreground"
                                                        )}>
                                                            {location.isActualArea ? 'Area' : 'City'}
                                                        </span>
                                                        {location.isGoogle && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-medium">
                                                                ✓ Google
                                                            </span>
                                                        )}
                                                        {location.isNominatim && (
                                                            <span className="text-xs px-1.5 py-0.5 rounded bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D]">
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
                    </div>
                    <div className="flex justify-end gap-2 pt-4 border-t border-border dark:border-border">
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
                            {loading && <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />}
                            <Save className="w-3.5 h-3.5 mr-2" />
                            {mode === "edit" ? "Update" : "Add Broker"}
                        </Button>
                    </div>
                </div>
            </SheetContent>
        </Sheet>
    );
};