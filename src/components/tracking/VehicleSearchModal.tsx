import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Search, Loader2, X } from 'lucide-react';
import { fetchVehicleTollHistory, VehicleTollCrossing } from '@/api/fleet';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface VehicleSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSearchComplete: (vehicleNumber: string, history: VehicleTollCrossing[], period: string) => void;
}

export const VehicleSearchModal: React.FC<VehicleSearchModalProps> = ({
    isOpen,
    onClose,
    onSearchComplete
}) => {
    const { toast } = useToast();
    const [vehicleNumber, setVehicleNumber] = useState('');
    const [period, setPeriod] = useState<'current' | 'all_history'>('current');
    const [loading, setLoading] = useState(false);

    const handleSearch = async () => {
        if (!vehicleNumber.trim()) return;

        try {
            setLoading(true);
            toast({ title: "🔍 Searching...", description: `Looking for ${vehicleNumber}` });

            // 1. Check Database first (for both modes)
            const periodToFetch = period === 'all_history' ? '1week' : 'current';
            let history = await fetchVehicleTollHistory(vehicleNumber.trim(), periodToFetch);

            if (history.length > 0) {
                toast({ title: "✅ Found in Database", description: `Showing ${history.length} records` });
                onSearchComplete(vehicleNumber, history, period);
                onClose();
                return;
            }

            // 2. Not in DB? Call Live API (silently)
            console.log('Not in DB, trying live API...');

            const { data, error } = await supabase.functions.invoke('track-fastag', {
                body: { vehicleNumber: vehicleNumber.trim() } // No bookingId
            });

            if (error || !data.success) {
                throw new Error(data?.error || error?.message || 'API call failed');
            }

            if (data.data && data.data.length > 0) {
                // Convert API response to our format
                const apiCrossings: VehicleTollCrossing[] = data.data.map((c: any) => {
                    const [lat, lng] = c.tollPlazaGeocode.split(',').map(Number);

                    let crossingTime = c.readerReadTime;
                    if (crossingTime.includes(' ')) {
                        const [d, t] = crossingTime.split(' ');
                        crossingTime = `${d}T${t.split('.')[0]}`;
                    }

                    return {
                        crossing_id: `live-${Math.random()}`,
                        toll_plaza_name: c.tollPlazaName,
                        latitude: lat,
                        longitude: lng,
                        crossing_time: crossingTime,
                        vehicle_type: c.vehicleType || 'VC10',
                        booking_id: null,
                        booking_display_id: 'Random Search'
                    };
                }).sort((a: any, b: any) => new Date(a.crossing_time).getTime() - new Date(b.crossing_time).getTime()); // Sort oldest to newest

                toast({ title: "✅ Live Tracking Successful", description: `Found ${apiCrossings.length} records` });

                // Show ALL available data from API for both modes
                if (period === 'current') {
                    onSearchComplete(vehicleNumber, [apiCrossings[apiCrossings.length - 1]], period); // Show only latest
                } else {
                    onSearchComplete(vehicleNumber, apiCrossings, period); // Show all
                }

                onClose();
                return;
            }

            // 3. Not found anywhere
            toast({ title: "📭 No Data Found", description: "No recent activity found for this vehicle.", variant: "destructive" });

        } catch (error: any) {
            console.error('Search failed:', error);
            toast({ title: "❌ Search Failed", description: error.message, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setVehicleNumber('');
        setPeriod('current');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[450px] bg-card border-border z-[1000]">
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
                        <RadioGroup value={period} onValueChange={(v) => setPeriod(v as any)}>
                            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer" onClick={() => setPeriod('current')}>
                                <RadioGroupItem value="current" id="curr" />
                                <Label htmlFor="curr" className="cursor-pointer flex-1">
                                    <span className="block font-medium">Latest Location</span>
                                    {/* <span className="text-xs text-muted-foreground">DB first, then API (₹4)</span> */}
                                </Label>
                            </div>

                            <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-accent cursor-pointer" onClick={() => setPeriod('all_history')}>
                                <RadioGroupItem value="all_history" id="all" />
                                <Label htmlFor="all" className="cursor-pointer flex-1">
                                    <span className="block font-medium">Available History</span>
                                    <span className="text-xs text-muted-foreground">Shows all available route data</span>
                                </Label>
                            </div>
                        </RadioGroup>
                    </div>
                </div>

                <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={handleClose} disabled={loading} className="flex-1">Cancel</Button>
                    <Button onClick={handleSearch} disabled={loading || !vehicleNumber.trim()} className="flex-1">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                        Search
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};