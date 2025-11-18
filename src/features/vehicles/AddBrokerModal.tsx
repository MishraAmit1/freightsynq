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
        }
    }, [debouncedCitySearch, hasSelectedCity]);

    const searchLocations = async (query: string) => {
        if (hasSelectedCity) return;
        setSearchingCity(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=in&limit=10&addressdetails=1&accept-language=en`
            );
            const data = await response.json();
            if (!hasSelectedCity) {
                const formattedResults = data
                    .map((item: any) => {
                        const city = item.address?.city || item.address?.town || item.address?.village || item.address?.state_district || "";
                        let displayText = city;
                        const area = item.address?.suburb || item.address?.neighbourhood || item.address?.locality || "";
                        if (area && city && area.toLowerCase() !== city.toLowerCase()) {
                            displayText = `${area}, ${city}`;
                        } else if (area && !city) {
                            displayText = area;
                        }
                        return { city: city || area, displayText, display_name: item.display_name };
                    })
                    .filter((item: any, index: number, self: any[]) =>
                        item.city && index === self.findIndex((t) => t.displayText === item.displayText)
                    );
                setCitySuggestions(formattedResults);
                setShowCitySuggestions(formattedResults.length > 0);
            }
        } catch (error) {
            console.error("Error searching locations:", error);
        } finally {
            setSearchingCity(false);
        }
    };

    const handleCitySelect = (location: any) => {
        setFormData(prev => ({ ...prev, city: location.displayText }));
        setCitySearch(location.displayText);
        setHasSelectedCity(true);
        setShowCitySuggestions(false);
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
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                    <SheetTitle className="flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        {mode === "edit" ? "Edit Broker" : "Add New Broker"}
                    </SheetTitle>
                </SheetHeader>

                <div className="space-y-5 py-6">
                    <div>
                        <Label className="text-xs">
                            Company Name <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="ABC Transport Company"
                            disabled={loading}
                            className="h-9 text-sm mt-1"
                        />
                    </div>

                    <div>
                        <Label className="text-xs">
                            Contact Person <span className="text-red-500">*</span>
                        </Label>
                        <Input
                            value={formData.contactPerson}
                            onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                            placeholder="John Doe"
                            disabled={loading}
                            className="h-9 text-sm mt-1"
                        />
                    </div>

                    <Separator className="my-4" />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Phone Number</Label>
                            <Input
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="9876543210 (Optional)"
                                maxLength={15}
                                disabled={loading}
                                className="h-9 text-sm mt-1"
                            />
                        </div>

                        <div>
                            <Label className="text-xs">Email</Label>
                            <Input
                                type="email"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="broker@company.com"
                                disabled={loading}
                                className="h-9 text-sm mt-1"
                            />
                        </div>
                    </div>

                    <Separator className="my-4" />

                    <div>
                        <Label className="text-xs">
                            City / Area <span className="text-red-500">*</span>
                            {hasSelectedCity && <Check className="inline w-3 h-3 text-green-500 ml-1" />}
                        </Label>
                        <div className="relative mt-1">
                            <MapPin className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                            <Input
                                value={citySearch}
                                onChange={handleCityInputChange}
                                onFocus={() => setShowCitySuggestions(true)}
                                placeholder="Search area or city..."
                                className="pl-9 pr-9 h-9 text-sm"
                                autoComplete="off"
                            />
                            {searchingCity && (
                                <Loader2 className="absolute right-9 top-2.5 h-3.5 w-3.5 animate-spin" />
                            )}
                            {citySearch && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="absolute right-1 top-1 h-7 w-7 p-0"
                                    onClick={handleClearCitySearch}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            )}

                            {showCitySuggestions && citySuggestions.length > 0 && !hasSelectedCity && (
                                <div className="absolute z-50 w-full bg-background border rounded-md mt-1 shadow-lg max-h-[200px] overflow-auto">
                                    {citySuggestions.map((location, index) => (
                                        <div
                                            key={index}
                                            className="px-3 py-2 hover:bg-accent cursor-pointer border-b last:border-b-0"
                                            onClick={() => handleCitySelect(location)}
                                        >
                                            <div className="flex items-start gap-2">
                                                <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                                <div className="flex-1">
                                                    <div className="font-medium text-xs">{location.displayText}</div>
                                                    <div className="text-[10px] text-muted-foreground line-clamp-1">
                                                        {location.display_name}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <Button variant="outline" onClick={onClose} disabled={loading} size="sm">
                            Cancel
                        </Button>
                        <Button onClick={handleSubmit} disabled={loading} size="sm">
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