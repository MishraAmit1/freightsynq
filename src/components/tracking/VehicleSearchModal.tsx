import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Loader2 } from 'lucide-react';
import { fetchVehicleTollHistory } from '@/api/fleet';
import { saveRandomSearch, TollCrossing } from '@/api/randomSearch';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface VehicleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearchComplete: (searchId: string) => void;
}

export const VehicleSearchModal: React.FC<VehicleSearchModalProps> = ({
    isOpen,
    onClose,
    onSearchComplete
}) => {
    const { toast } = useToast();
    
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [searchType, setSearchType] = useState<'live' | 'journey'>('live');
    
    const [fromLocation, setFromLocation] = useState('');
    const [toLocation, setToLocation] = useState('');
    const [daysRange, setDaysRange] = useState(1);
    
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!vehicleNumber.trim()) return;

        if (searchType === 'journey') {
            if (!fromLocation.trim() || !toLocation.trim()) {
                toast({
                    title: "⚠️ Missing Information",
                    description: "Please enter FROM and TO locations",
                    variant: "destructive"
                });
                return;
            }
        }

        try {
            setLoading(true);
            toast({ title: "🔍 Searching...", description: `Looking for ${vehicleNumber}` });

            let tollCrossings: TollCrossing[] = [];

            if (searchType === 'live') {
                const dbHistory = await fetchVehicleTollHistory(vehicleNumber.trim(), 'current');

                if (dbHistory.length > 0) {
                    tollCrossings = dbHistory.map(c => ({
                        toll_plaza_name: c.toll_plaza_name,
                        latitude: c.latitude,
                        longitude: c.longitude,
                        crossing_time: c.crossing_time,
                        vehicle_type: c.vehicle_type
                    }));
                } else {
                    const { data, error } = await supabase.functions.invoke('track-fastag', {
                        body: { vehicleNumber: vehicleNumber.trim() }
                    });

                    if (error || !data.success || !data.data || data.data.length === 0) {
                        throw new Error('No data found for this vehicle');
                    }

                    const latest = data.data[0];
                    const [lat, lng] = latest.tollPlazaGeocode.split(',').map(Number);

                    tollCrossings = [{
                        toll_plaza_name: latest.tollPlazaName,
                        latitude: lat,
                        longitude: lng,
                        crossing_time: latest.readerReadTime,
                        vehicle_type: latest.vehicleType
                    }];
                }

                const searchId = await saveRandomSearch({
                    vehicleNumber: vehicleNumber.trim(),
                    searchType: 'live',
                    tollCrossings
                });

                toast({ 
                    title: "✅ Live Location Found", 
                    description: `${tollCrossings[0].toll_plaza_name}` 
                });

                onSearchComplete(searchId);
                handleClose();
            } else {
                let dbHistory = await fetchVehicleTollHistory(vehicleNumber.trim(), '1week');

                if (dbHistory.length > 0) {
                    tollCrossings = filterJourneyData(dbHistory, fromLocation, toLocation, daysRange);
                }

                if (tollCrossings.length === 0) {
                    const { data, error } = await supabase.functions.invoke('track-fastag', {
                        body: { vehicleNumber: vehicleNumber.trim() }
                    });

                    if (error || !data.success || !data.data || data.data.length === 0) {
                        throw new Error('No journey data found');
                    }

                    const apiCrossings = data.data.map((c: any) => {
                        const [lat, lng] = c.tollPlazaGeocode.split(',').map(Number);
                        return {
                            toll_plaza_name: c.tollPlazaName,
                            latitude: lat,
                            longitude: lng,
                            crossing_time: c.readerReadTime,
                            vehicle_type: c.vehicleType
                        };
                    });

                    tollCrossings = filterJourneyData(apiCrossings, fromLocation, toLocation, daysRange);
                }

                if (tollCrossings.length === 0) {
                    throw new Error('No matching journey found for selected route and period');
                }

                const searchId = await saveRandomSearch({
                    vehicleNumber: vehicleNumber.trim(),
                    searchType: 'journey',
                    fromLocation: fromLocation.trim(),
                    toLocation: toLocation.trim(),
                    daysRange,
                    tollCrossings
                });

                toast({ 
                    title: "✅ Journey Found", 
                    description: `${tollCrossings.length} toll crossings` 
                });

                onSearchComplete(searchId);
                handleClose();
            }

        } catch (error: any) {
            console.error('Search failed:', error);
            toast({ 
                title: "❌ Search Failed", 
                description: error.message, 
                variant: "destructive" 
            });
        } finally {
            setLoading(false);
        }
    };

    const filterJourneyData = (
        data: any[], 
        from: string, 
        to: string, 
        days: number
    ): TollCrossing[] => {
        const now = new Date();
        const cutoffDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));

        return data
            .filter(c => {
                const crossingDate = new Date(c.crossing_time);
                const inTimeRange = crossingDate >= cutoffDate;
                return inTimeRange;
            })
            .sort((a, b) => new Date(a.crossing_time).getTime() - new Date(b.crossing_time).getTime())
            .map(c => ({
                toll_plaza_name: c.toll_plaza_name,
                latitude: c.latitude,
                longitude: c.longitude,
                crossing_time: c.crossing_time,
                vehicle_type: c.vehicle_type
            }));
    };

    const handleClose = () => {
        setVehicleNumber('');
        setSearchType('live');
        setFromLocation('');
        setToLocation('');
        setDaysRange(1);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[500px] bg-card border-border z-[1000]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        Search Vehicle
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Vehicle Number <span className="text-red-500">*</span></Label>
                        <Input
                            placeholder="e.g., MH13EP2787"
                            value={vehicleNumber}
                            onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                            className="font-mono text-lg"
                            disabled={loading}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Search Mode</Label>
                        <RadioGroup value={searchType} onValueChange={(v: any) => setSearchType(v)}>
                            <div 
                                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer" 
                                onClick={() => setSearchType('live')}
                            >
                                <RadioGroupItem value="live" id="live" />
                                <Label htmlFor="live" className="cursor-pointer flex-1">
                                    <span className="block font-medium">Latest Location</span>
                                    <span className="text-xs text-muted-foreground">Current position only</span>
                                </Label>
                            </div>

                            <div 
                                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer" 
                                onClick={() => setSearchType('journey')}
                            >
                                <RadioGroupItem value="journey" id="journey" />
                                <Label htmlFor="journey" className="cursor-pointer flex-1">
                                    <span className="block font-medium">Journey Tracking</span>
                                    <span className="text-xs text-muted-foreground">Full route with history</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {searchType === 'journey' && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>FROM Location <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g., Vapi"
                                        value={fromLocation}
                                        onChange={(e) => setFromLocation(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>TO Location <span className="text-red-500">*</span></Label>
                                    <Input
                                        placeholder="e.g., Chennai"
                                        value={toLocation}
                                        onChange={(e) => setToLocation(e.target.value)}
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Number of Days</Label>
                                <div className="grid grid-cols-7 gap-2">
                                    {[1, 2, 3, 4, 5, 6, 7].map(day => (
                                        <Button
                                            key={day}
                                            type="button"
                                            variant={daysRange === day ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setDaysRange(day)}
                                            disabled={loading}
                                            className="w-full"
                                        >
                                            {day}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">
                        Cancel
                    </Button>
                    <Button onClick={handleSearch} disabled={loading || !vehicleNumber.trim()} className="flex-1">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        Search
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};