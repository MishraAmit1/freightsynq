// src/components/LRCityQuickSetup.tsx
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertCircle,
    MapPin,
    Plus,
    Settings,
    Loader2,
    CheckCircle2,
    ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { fetchLRCities, setActiveLRCity, addLRCity } from '@/api/lr-sequences';
import { cn } from '@/lib/utils';

interface LRCityQuickSetupProps {
    onCityConfigured: () => void;
}

export const LRCityQuickSetup = ({ onCityConfigured }: LRCityQuickSetupProps) => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [cities, setCities] = useState<any[]>([]);
    const [selectedCity, setSelectedCity] = useState<string>('');
    const [activating, setActivating] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [newCityForm, setNewCityForm] = useState({
        city_name: '',
        prefix: 'LR',
        current_lr_number: 1001
    });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        loadCities();
    }, []);

    const loadCities = async () => {
        try {
            setLoading(true);
            const data = await fetchLRCities();
            setCities(data);
        } catch (error) {
            console.error('Error loading cities:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleActivateCity = async () => {
        if (!selectedCity) {
            toast({
                title: "❌ No City Selected",
                description: "Please select a city to activate",
                variant: "destructive",
            });
            return;
        }

        try {
            setActivating(true);
            await setActiveLRCity(selectedCity);

            toast({
                title: "✅ City Activated",
                description: "LR city has been activated successfully",
            });

            // Reload parent component
            onCityConfigured();
        } catch (error: any) {
            console.error('Error activating city:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to activate city",
                variant: "destructive",
            });
        } finally {
            setActivating(false);
        }
    };

    const handleCreateCity = async () => {
        if (!newCityForm.city_name.trim()) {
            toast({
                title: "❌ Missing Field",
                description: "City name is required",
                variant: "destructive",
            });
            return;
        }

        try {
            setCreating(true);
            await addLRCity({
                city_name: newCityForm.city_name,
                prefix: newCityForm.prefix.toUpperCase(),
                current_lr_number: newCityForm.current_lr_number
            });

            toast({
                title: "✅ City Created & Activated",
                description: `${newCityForm.city_name} has been added successfully`,
            });

            // Reload cities and close modal
            await loadCities();
            setShowAddModal(false);
            setNewCityForm({ city_name: '', prefix: 'LR', current_lr_number: 1001 });

            // Reload parent to show new active city
            onCityConfigured();
        } catch (error: any) {
            console.error('Error creating city:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to create city",
                variant: "destructive",
            });
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-4 bg-muted/50 rounded-lg border">
                <Loader2 className="w-4 h-4 animate-spin mr-2 text-primary" />
                <span className="text-sm text-muted-foreground">Checking LR configuration...</span>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-4 p-4 border-2 border-orange-200 rounded-lg bg-orange-50/50">
                <Alert className="border-orange-300 bg-orange-100">
                    <AlertCircle className="w-4 h-4 text-orange-700" />
                    <AlertDescription className="text-orange-800">
                        <strong>LR City Not Configured</strong>
                        <p className="text-sm mt-1">
                            {cities.length > 0
                                ? 'Select a city below to activate, or create a new one.'
                                : 'No LR cities found. Create your first city to generate LR numbers.'}
                        </p>
                    </AlertDescription>
                </Alert>

                {cities.length > 0 ? (
                    // Existing cities - show dropdown
                    <div className="space-y-3">
                        <div>
                            <Label className="text-sm font-medium flex items-center gap-2 mb-2">
                                <MapPin className="w-4 h-4 text-primary" />
                                Select Existing City
                            </Label>
                            <Select value={selectedCity} onValueChange={setSelectedCity}>
                                <SelectTrigger className="h-10">
                                    <SelectValue placeholder="Choose a city..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {cities.map((city) => (
                                        <SelectItem key={city.id} value={city.id}>
                                            <div className="flex items-center gap-2">
                                                <MapPin className="w-4 h-4 text-muted-foreground" />
                                                <span className="font-medium">{city.city_name}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    ({city.prefix}{city.current_lr_number})
                                                </span>
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                onClick={handleActivateCity}
                                disabled={!selectedCity || activating}
                                className="w-full bg-gradient-to-r from-primary to-primary/80"
                            >
                                {activating ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Activating...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2" />
                                        Activate
                                    </>
                                )}
                            </Button>

                            <Button
                                variant="outline"
                                onClick={() => setShowAddModal(true)}
                                className="w-full hover:bg-primary/10 hover:border-primary"
                            >
                                <Plus className="w-4 h-4 mr-2" />
                                Add New
                            </Button>
                        </div>
                    </div>
                ) : (
                    // No cities - show add button
                    <Button
                        onClick={() => setShowAddModal(true)}
                        className="w-full bg-gradient-to-r from-primary to-primary/80"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Create First City
                    </Button>
                )}

                {/* Link to full settings */}
                <div className="pt-2 border-t border-orange-200">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate('/company-settings')}
                        className="w-full text-xs hover:bg-orange-100/50"
                    >
                        <Settings className="w-3 h-3 mr-2" />
                        Manage All Cities in Settings
                        <ArrowRight className="w-3 h-3 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Add City Modal (Same style as Company Settings) */}
            <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            Add New LR City
                        </DialogTitle>
                        <DialogDescription>
                            Configure LR numbering for a new city
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div>
                            <Label>City Name *</Label>
                            <Input
                                value={newCityForm.city_name}
                                onChange={(e) => setNewCityForm({
                                    ...newCityForm,
                                    city_name: e.target.value
                                })}
                                placeholder="e.g., Vapi, Surat, Mumbai"
                                className="mt-1.5"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Prefix</Label>
                                <Input
                                    value={newCityForm.prefix}
                                    onChange={(e) => setNewCityForm({
                                        ...newCityForm,
                                        prefix: e.target.value.toUpperCase()
                                    })}
                                    placeholder="LR"
                                    maxLength={5}
                                    className="mt-1.5"
                                />
                            </div>

                            <div>
                                <Label>Starting Number *</Label>
                                <Input
                                    type="number"
                                    value={newCityForm.current_lr_number}
                                    onChange={(e) => setNewCityForm({
                                        ...newCityForm,
                                        current_lr_number: parseInt(e.target.value) || 1001
                                    })}
                                    placeholder="1001"
                                    className="mt-1.5"
                                />
                            </div>
                        </div>

                        <Alert>
                            <AlertDescription className="text-sm">
                                LR numbers will be generated as:
                                <Badge variant="outline" className="ml-2 font-mono">
                                    {newCityForm.prefix}{newCityForm.current_lr_number}
                                </Badge>
                            </AlertDescription>
                        </Alert>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowAddModal(false);
                                setNewCityForm({ city_name: '', prefix: 'LR', current_lr_number: 1001 });
                            }}
                            disabled={creating}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleCreateCity}
                            disabled={!newCityForm.city_name || creating}
                        >
                            {creating ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                <>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add City
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};