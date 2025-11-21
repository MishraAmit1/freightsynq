import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    RefreshCw,
    MapPin,
    Truck,
    Clock,
    AlertCircle,
    Navigation,
    ArrowRight,
    Info,
    Activity,
    Lock,
    Smartphone, // ✅ Add this
    Signal,
    CheckCircle,
    DollarSign,
    TrendingUp,
    MapPinned
} from 'lucide-react';
import { trackVehicle, getTrackingHistory, TollCrossing } from '@/api/tracking';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

// Fix Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface VehicleTrackingMapProps {
    bookingId: string;
    vehicleNumber?: string;
    fromLocation?: string;
    toLocation?: string;
    bookingStatus?: string;
    assignmentDate?: string;
}

export const VehicleTrackingMap: React.FC<VehicleTrackingMapProps> = ({
    bookingId,
    vehicleNumber,
    fromLocation,
    toLocation,
    bookingStatus,
    assignmentDate
}) => {
    const { toast } = useToast();
    const [tollCrossings, setTollCrossings] = useState<TollCrossing[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [waitTime, setWaitTime] = useState(0);
    const [dataSource, setDataSource] = useState<'real' | 'mock' | 'cached' | 'unknown'>('unknown');
    const [mapCenter, setMapCenter] = useState<[number, number]>([26.9124, 75.7873]); // Jaipur center
    const [mapZoom, setMapZoom] = useState(7);
    const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
    const [trackingEndReason, setTrackingEndReason] = useState<string>('');
    const [totalApiCost, setTotalApiCost] = useState(0);
    const [monthlyUsage, setMonthlyUsage] = useState({ used: 0, limit: 1000 });
    const [totalSaved, setTotalSaved] = useState(0);
    const [monthlyCost, setMonthlyCost] = useState(0);
    const [trackingMode, setTrackingMode] = useState<'FASTAG' | 'SIM'>('FASTAG');

    // Check if tracking should be enabled
    useEffect(() => {
        checkTrackingStatus();
        loadMonthlyUsage();
        loadMonthlyCost();
    }, [bookingStatus, bookingId]);

    // Load cached data on mount
    useEffect(() => {
        if (bookingId) {
            loadCachedData();
        }
    }, [bookingId]);

    // Auto-adjust map view when crossings change
    useEffect(() => {
        if (tollCrossings.length > 0) {
            const bounds = tollCrossings.reduce((acc, crossing) => {
                if (!acc.minLat || crossing.latitude < acc.minLat) acc.minLat = crossing.latitude;
                if (!acc.maxLat || crossing.latitude > acc.maxLat) acc.maxLat = crossing.latitude;
                if (!acc.minLng || crossing.longitude < acc.minLng) acc.minLng = crossing.longitude;
                if (!acc.maxLng || crossing.longitude > acc.maxLng) acc.maxLng = crossing.longitude;
                return acc;
            }, {} as any);

            const centerLat = (bounds.minLat + bounds.maxLat) / 2;
            const centerLng = (bounds.minLng + bounds.maxLng) / 2;

            setMapCenter([centerLat, centerLng]);

            // Calculate appropriate zoom
            const latDiff = bounds.maxLat - bounds.minLat;
            const lngDiff = bounds.maxLng - bounds.minLng;
            const maxDiff = Math.max(latDiff, lngDiff);

            let zoom = 10;
            if (maxDiff > 5) zoom = 6;
            else if (maxDiff > 2) zoom = 7;
            else if (maxDiff > 1) zoom = 8;
            else if (maxDiff > 0.5) zoom = 9;

            setMapZoom(zoom);
        }
    }, [tollCrossings]);

    const checkTrackingStatus = async () => {
        if (bookingStatus === 'DELIVERED' || bookingStatus === 'CANCELLED') {
            setIsTrackingEnabled(false);
            setTrackingEndReason(
                bookingStatus === 'DELIVERED'
                    ? 'Tracking ended - Booking delivered'
                    : 'Tracking ended - Booking cancelled'
            );
            return;
        }

        const { data: assignment } = await supabase
            .from('vehicle_assignments')
            .select('status, tracking_end_time')
            .eq('booking_id', bookingId)
            .eq('status', 'ACTIVE')
            .maybeSingle();

        if (!assignment) {
            setIsTrackingEnabled(false);
            setTrackingEndReason('No active vehicle assignment');
            return;
        }

        if (assignment.tracking_end_time) {
            setIsTrackingEnabled(false);
            setTrackingEndReason('Tracking period ended');
            return;
        }

        setIsTrackingEnabled(true);
        setTrackingEndReason('');
    };

    const loadMonthlyUsage = async () => {
        try {
            const { data: config, error } = await supabase
                .from('tracking_configurations')
                .select('current_month_usage, monthly_api_limit')
                .maybeSingle();

            if (error) {
                console.error('Error loading config:', error);
                setMonthlyUsage({ used: 0, limit: 1000 });
                return;
            }

            if (config) {
                setMonthlyUsage({
                    used: config.current_month_usage || 0,
                    limit: config.monthly_api_limit || 1000
                });
            }
        } catch (error) {
            console.error('Error in loadMonthlyUsage:', error);
        }
    };

    const loadMonthlyCost = async () => {
        try {
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data } = await supabase
                .from('fastag_api_logs')
                .select('api_cost')
                .gte('created_at', startOfMonth.toISOString())
                .eq('status', 'SUCCESS');

            const total = data?.reduce((sum, log) => sum + (log.api_cost || 0), 0) || 0;
            setMonthlyCost(total);
        } catch (error) {
            console.error('Error loading monthly cost:', error);
        }
    };

    const loadCachedData = async () => {
        try {
            console.log('Loading cached data for booking:', bookingId);

            const { data, error } = await supabase
                .from('fastag_crossings')
                .select('*')
                .eq('booking_id', bookingId) // ← सिर्फ इस booking का data
                .order('crossing_time', { ascending: true });

            if (error) {
                console.error('Error loading cached data:', error);
                return;
            }

            if (data && data.length > 0) {
                // Mock data को filter करो
                const mockTollNames = [
                    'Jaipur Entry Toll',
                    'Manesar Toll Plaza',
                    'Kherki Daula Toll Plaza'
                ];

                const realData = data.filter(crossing =>
                    !mockTollNames.includes(crossing.toll_plaza_name)
                );

                if (realData.length > 0) {
                    setTollCrossings(realData);
                    setLastUpdated(new Date());
                    setDataSource('cached');

                    toast({
                        title: "📊 Real Data Loaded",
                        description: `Showing ${realData.length} actual toll crossings`,
                        variant: "default"
                    });
                } else {
                    // सिर्फ mock data है, fresh API call करो
                    console.log('Only mock data found, fetching real data...');
                    setTollCrossings([]); // Clear mock data
                    // Don't auto-fetch here, let user click Track Now
                }
            } else {
                console.log('No cached data found');
            }
        } catch (error) {
            console.error('Error in loadCachedData:', error);
        }
    };

    const loadTrackingData = async () => {
        if (!isTrackingEnabled) {
            toast({
                title: "⚠️ Tracking Disabled",
                description: trackingEndReason,
                variant: "destructive"
            });
            return;
        }

        if (monthlyUsage.used >= monthlyUsage.limit) {
            toast({
                title: "📊 Monthly Limit Reached",
                description: `You've used ${monthlyUsage.used}/${monthlyUsage.limit} API calls this month`,
                variant: "destructive"
            });
            return;
        }

        try {
            setLoading(true);

            const result = await trackVehicle(bookingId, assignmentDate);

            if (result.cached) {
                setWaitTime(result.waitTime || 0);
                setDataSource('cached');

                toast({
                    title: "⏱️ Rate Limited",
                    description: `Please wait ${result.waitTime} seconds before refreshing again`,
                    variant: "default"
                });

                const interval = setInterval(() => {
                    setWaitTime(prev => {
                        if (prev <= 1) {
                            clearInterval(interval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                setWaitTime(0);

                if (result.isRealData) {
                    setDataSource('real');
                    setMonthlyUsage(prev => ({ ...prev, used: prev.used + 1 }));
                    setTotalApiCost(prev => prev + 4);
                    await loadMonthlyCost();
                } else if (result.isMockData) {
                    setDataSource('mock');
                } else {
                    setDataSource('unknown');
                }

                const newCrossingsCount = result.newRecords || 0;

                if (newCrossingsCount > 0) {
                    toast({
                        title: "🚚 New Toll Crossings!",
                        description: `Vehicle crossed ${newCrossingsCount} new toll plaza${newCrossingsCount > 1 ? 's' : ''}`,
                    });
                } else {
                    toast({
                        title: "✅ Location Updated",
                        description: `Found ${result.data.length} toll crossings`,
                    });
                }
            }

            setTollCrossings(result.data);
            setLastUpdated(new Date());

        } catch (error: any) {
            console.error('Error loading tracking data:', error);
            toast({
                title: "❌ Error",
                description: error.message || "Failed to load tracking data",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    const shouldRefreshData = (lastCrossing: TollCrossing) => {
        if (!lastCrossing) return true;

        const lastCrossingTime = new Date(lastCrossing.crossing_time).getTime();
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);

        return lastCrossingTime < twoHoursAgo;
    };

    const formatTime = (dateString: string) => {
        try {
            if (!dateString) return 'Unknown';

            let date: Date;

            if (dateString.includes(' ')) {
                const [datePart, timePart] = dateString.split(' ');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour, minute, second] = timePart.split(':').map(Number);

                date = new Date(year, month - 1, day, hour, minute, Math.floor(second));
            } else {
                date = new Date(dateString);
            }

            if (isNaN(date.getTime())) return dateString;

            const day = date.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            const year = date.getFullYear();

            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12 || 12;

            return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;

        } catch (error) {
            console.error('Date parsing error:', error);
            return dateString;
        }
    };

    const formatTimeAgo = (dateString: string) => {
        try {
            if (!dateString) return 'Unknown';

            let crossingTime: number;

            if (dateString.includes(' ')) {
                const [datePart, timePart] = dateString.split(' ');
                const [year, month, day] = datePart.split('-').map(Number);
                const [hour, minute, second] = timePart.split(':').map(Number);

                crossingTime = new Date(
                    year,
                    month - 1,
                    day,
                    hour,
                    minute,
                    Math.floor(second)
                ).getTime();
            } else {
                crossingTime = new Date(dateString).getTime();
            }

            if (isNaN(crossingTime)) return 'Invalid date';

            const diff = Date.now() - crossingTime;
            const hours = Math.floor(diff / (1000 * 60 * 60));
            const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (hours > 24) {
                return `${Math.floor(hours / 24)} days ago`;
            } else if (hours > 0) {
                return `${hours}h ${minutes}m ago`;
            } else if (minutes > 0) {
                return `${minutes} min ago`;
            } else {
                return 'Just now';
            }
        } catch (error) {
            console.error('Time ago error:', error);
            return 'Unknown';
        }
    };

    // Group crossings by location
    const groupCrossingsByLocation = () => {
        const locationGroups: { [key: string]: typeof tollCrossings } = {};

        tollCrossings.forEach(crossing => {
            const key = `${crossing.latitude.toFixed(4)}-${crossing.longitude.toFixed(4)}`;
            if (!locationGroups[key]) {
                locationGroups[key] = [];
            }
            locationGroups[key].push(crossing);
        });

        return locationGroups;
    };

    // Create clustered icon showing multiple visits
    const createClusterIcon = (count: number, numbers: number[], isLatest: boolean = false) => {
        const bgColor = isLatest ? '#ef4444' : 'linear-gradient(135deg, #3b82f6, #1e40af)';
        const size = isLatest ? 50 : 45;

        return L.divIcon({
            html: `
                <div style="
                    background: ${bgColor};
                    color: white;
                    width: ${size}px;
                    height: ${size}px;
                    border-radius: 50%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    border: 3px solid white;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.3);
                    font-size: 11px;
                    font-weight: bold;
                    ${isLatest ? 'animation: pulse 2s infinite;' : ''}
                ">
                    <div style="font-size: 18px;">${count}</div>
                    <div style="font-size: 9px;">visits</div>
                </div>
            `,
            iconSize: [size, size],
            iconAnchor: [size / 2, size / 2],
            className: 'cluster-marker'
        });
    };

    // Create single visit icon
    const createNumberIcon = (number: number, isLast: boolean = false) => {
        if (isLast) {
            return L.divIcon({
                html: `<div style="background: #ef4444; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px; font-weight: bold; animation: pulse 2s infinite;">${number}</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                className: 'current-location-marker'
            });
        }

        return L.divIcon({
            html: `<div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 14px; font-weight: bold;">${number}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'toll-marker'
        });
    };

    const lastCrossing = tollCrossings.length > 0 ? tollCrossings[tollCrossings.length - 1] : null;

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <Card className={`border-primary/20 ${!isTrackingEnabled ? 'opacity-75' : ''}`}>
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            {isTrackingEnabled ? (
                                <Navigation className="w-5 h-5 text-primary animate-pulse" />
                            ) : (
                                <Lock className="w-5 h-5 text-muted-foreground" />
                            )}
                            FASTag Vehicle Tracking
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {vehicleNumber && (
                                <Badge variant="secondary" className="gap-1">
                                    <Truck className="w-3 h-3" />
                                    {vehicleNumber}
                                </Badge>
                            )}
                            {totalSaved > 0 && (
                                <Badge variant="default" className="gap-1">
                                    💰 Saved ₹{totalSaved}
                                </Badge>
                            )}
                            <Button
                                onClick={loadTrackingData}
                                disabled={loading || waitTime > 0 || !isTrackingEnabled}
                                size="sm"
                                variant={!isTrackingEnabled ? "ghost" : waitTime > 0 ? "outline" : "default"}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                {!isTrackingEnabled
                                    ? 'Tracking Disabled'
                                    : waitTime > 0
                                        ? `Wait ${waitTime}s`
                                        : 'Track Now (₹4)'}
                            </Button>
                        </div>
                    </div>

                    {!isTrackingEnabled && trackingEndReason && (
                        <Alert className="mt-2 border-warning/50 bg-warning/10">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{trackingEndReason}</AlertDescription>
                        </Alert>
                    )}

                    {lastUpdated && (
                        <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                <Clock className="w-3 h-3" />
                                Last updated: {lastUpdated.toLocaleTimeString()}
                                {dataSource === 'real' && (
                                    <Badge variant="default" className="ml-2 text-xs">LIVE</Badge>
                                )}
                                {dataSource === 'cached' && (
                                    <Badge variant="secondary" className="ml-2 text-xs">CACHED</Badge>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <span className="text-xs text-muted-foreground">
                                    Monthly: ₹{monthlyCost}/₹4000
                                </span>
                            </div>
                        </div>
                    )}
                </CardHeader>
            </Card>

            {/* Refresh Suggestion */}
            {tollCrossings.length > 0 && shouldRefreshData(tollCrossings[tollCrossings.length - 1]) && (
                <Alert className="border-info/50 bg-info/5">
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                        Last crossing was {formatTimeAgo(tollCrossings[tollCrossings.length - 1].crossing_time)}.
                        Consider refreshing for latest data.
                    </AlertDescription>
                </Alert>
            )}

            {/* Live Map */}
            <Card className="border-border overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            Live Route Map ({tollCrossings.length} crossings)
                        </CardTitle>
                        {lastCrossing && (
                            <Badge variant="outline" className="gap-1">
                                <Activity className="w-3 h-3" />
                                Last: {formatTimeAgo(lastCrossing.crossing_time)}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* ✅ UPDATED: Map Container with Background Color */}
                    <div className="relative h-[500px] w-full bg-gray-100 dark:bg-gray-900/50">

                        {/* ✅ TOGGLE BUTTONS - Top Right */}
                        <div className="absolute top-4 right-4 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-1 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 flex gap-1">
                            <Button
                                size="sm"
                                variant={trackingMode === 'FASTAG' ? 'default' : 'ghost'}
                                className={`h-7 text-xs font-medium transition-all ${trackingMode === 'FASTAG' ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                onClick={() => setTrackingMode('FASTAG')}
                            >
                                <MapPin className="w-3 h-3 mr-1.5" />
                                FASTag
                            </Button>
                            <Button
                                size="sm"
                                variant={trackingMode === 'SIM' ? 'default' : 'ghost'}
                                className={`h-7 text-xs font-medium transition-all ${trackingMode === 'SIM' ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm" : "text-muted-foreground hover:text-foreground"
                                    }`}
                                onClick={() => setTrackingMode('SIM')}
                            >
                                <Smartphone className="w-3 h-3 mr-1.5" />
                                SIM Track
                            </Button>
                        </div>

                        {/* ✅ CONDITIONAL RENDERING: FASTag Map vs SIM Placeholder */}
                        {trackingMode === 'FASTAG' ? (
                            <>
                                <MapContainer
                                    center={mapCenter}
                                    zoom={mapZoom}
                                    className="h-full w-full"
                                    scrollWheelZoom={true}
                                    key={`map-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}`}
                                >
                                    <TileLayer
                                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                                    />

                                    {/* Plot clustered markers for same locations */}
                                    {(() => {
                                        const locationGroups = groupCrossingsByLocation();
                                        const plottedLocations = new Set();

                                        return tollCrossings.map((crossing, index) => {
                                            const locationKey = `${crossing.latitude.toFixed(4)}-${crossing.longitude.toFixed(4)}`;

                                            if (plottedLocations.has(locationKey)) {
                                                return null;
                                            }

                                            plottedLocations.add(locationKey);
                                            const crossingsAtLocation = locationGroups[locationKey];
                                            const numbers = crossingsAtLocation.map(c =>
                                                tollCrossings.findIndex(tc => tc.id === c.id) + 1
                                            );

                                            const hasLatestCrossing = numbers.includes(tollCrossings.length);

                                            return (
                                                <Marker
                                                    key={`cluster-${locationKey}`}
                                                    position={[crossing.latitude, crossing.longitude]}
                                                    icon={crossingsAtLocation.length > 1
                                                        ? createClusterIcon(crossingsAtLocation.length, numbers, hasLatestCrossing)
                                                        : createNumberIcon(numbers[0], numbers[0] === tollCrossings.length)
                                                    }
                                                >
                                                    <Popup>
                                                        <div className="p-2 min-w-[250px] max-w-[300px]">
                                                            <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                                                                <MapPinned className="w-4 h-4" />
                                                                {crossing.toll_plaza_name}
                                                            </h3>
                                                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                                                {crossingsAtLocation.map((c, i) => {
                                                                    const globalIndex = tollCrossings.findIndex(tc => tc.id === c.id);
                                                                    return (
                                                                        <div key={i} className={`border-l-2 pl-2 py-1 ${globalIndex === tollCrossings.length - 1
                                                                            ? 'border-red-500 bg-red-50 dark:bg-red-950/20'
                                                                            : 'border-primary'
                                                                            }`}>
                                                                            <div className="flex items-center justify-between">
                                                                                <p className="text-xs font-medium">
                                                                                    Visit #{globalIndex + 1}
                                                                                </p>
                                                                                {globalIndex === tollCrossings.length - 1 && (
                                                                                    <Badge variant="destructive" className="text-xs">
                                                                                        Current
                                                                                    </Badge>
                                                                                )}
                                                                            </div>
                                                                            <p className="text-xs text-muted-foreground">
                                                                                {formatTime(c.crossing_time)}
                                                                            </p>
                                                                        </div>
                                                                    );
                                                                })}
                                                            </div>
                                                            <div className="mt-2 pt-2 border-t flex items-center justify-between">
                                                                <p className="text-xs text-blue-600">
                                                                    Total: {crossingsAtLocation.length} crossing{crossingsAtLocation.length > 1 ? 's' : ''}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground">
                                                                    {crossing.vehicle_type || 'VC10'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </Popup>
                                                </Marker>
                                            );
                                        }).filter(Boolean);
                                    })()}

                                    {/* Draw route line */}
                                    {tollCrossings.length > 1 && (
                                        <>
                                            <Polyline
                                                positions={tollCrossings.map(c => [c.latitude, c.longitude])}
                                                color="#3b82f6"
                                                weight={4}
                                                opacity={0.8}
                                            />
                                            <Polyline
                                                positions={tollCrossings.map(c => [c.latitude, c.longitude])}
                                                color="#1e40af"
                                                weight={2}
                                                opacity={0.6}
                                                dashArray="10, 20"
                                            />
                                        </>
                                    )}
                                </MapContainer>

                                {loading && (
                                    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
                                        <div className="text-center">
                                            <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
                                            <p className="mt-2 text-sm font-medium">Fetching latest toll crossings...</p>
                                        </div>
                                    </div>
                                )}

                                {!loading && tollCrossings.length === 0 && (
                                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-[999]">
                                        <div className="text-center p-6">
                                            <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                                            <h3 className="mt-4 text-lg font-semibold">No Tracking Data</h3>
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                Click "Track Now" to get toll crossing information
                                            </p>
                                            <Button
                                                onClick={loadTrackingData}
                                                className="mt-4"
                                                size="sm"
                                                disabled={!isTrackingEnabled}
                                            >
                                                <RefreshCw className="w-4 h-4 mr-2" />
                                                Track Now
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            // ✅ SIM TRACKING PLACEHOLDER UI
                            <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                                <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                                    <Smartphone className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                                </div>

                                <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                                    SIM-Based Tracking
                                </h3>

                                <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                                    Track your vehicle's real-time location using the driver's mobile number.
                                    This feature works even without GPS devices or FASTag.
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mb-8">
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                                        <div className="p-2 bg-green-50 rounded-lg mb-2">
                                            <Signal className="w-5 h-5 text-green-600" />
                                        </div>
                                        <p className="text-xs font-semibold">Network Triangulation</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                                        <div className="p-2 bg-orange-50 rounded-lg mb-2">
                                            <Clock className="w-5 h-5 text-orange-600" />
                                        </div>
                                        <p className="text-xs font-semibold">15-min Updates</p>
                                    </div>
                                    <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                                        <div className="p-2 bg-blue-50 rounded-lg mb-2">
                                            <Navigation className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <p className="text-xs font-semibold">No App Required</p>
                                    </div>
                                </div>

                                <Button variant="outline" disabled className="bg-gray-50 border-dashed">
                                    <span className="flex items-center gap-2 text-muted-foreground">
                                        🚧 Integration in Progress
                                    </span>
                                </Button>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Total Crossings</p>
                                <p className="text-2xl font-bold">{tollCrossings.length}</p>
                            </div>
                            <MapPin className="w-8 h-8 text-primary/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">Journey Time</p>
                                <p className="text-2xl font-bold">
                                    {tollCrossings.length > 1
                                        ? Math.round((Date.now() - new Date(tollCrossings[0].crossing_time).getTime()) / (1000 * 60 * 60))
                                        : 0}h
                                </p>
                            </div>
                            <Clock className="w-8 h-8 text-primary/20" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-muted-foreground">API Cost Today</p>
                                <p className="text-2xl font-bold">₹{totalApiCost}</p>
                            </div>
                            <DollarSign className="w-8 h-8 text-primary/20" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg">Journey Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    {tollCrossings.length > 0 ? (
                        <div className="space-y-0 max-h-[400px] overflow-y-auto">
                            {tollCrossings.map((crossing, index) => (
                                <div key={`timeline-${index}`} className="flex gap-4 group">
                                    <div className="relative flex flex-col items-center">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${index === tollCrossings.length - 1
                                            ? 'bg-primary text-primary-foreground shadow-lg scale-110'
                                            : 'bg-muted text-muted-foreground group-hover:bg-primary/20'
                                            }`}>
                                            {index + 1}
                                        </div>
                                        {index < tollCrossings.length - 1 && (
                                            <div className="w-0.5 h-16 bg-border mt-2"></div>
                                        )}
                                    </div>

                                    <div className="flex-1 pb-6 pt-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                    {crossing.toll_plaza_name}
                                                    {index === tollCrossings.length - 1 && (
                                                        <Badge variant="destructive" className="text-xs">
                                                            Current
                                                        </Badge>
                                                    )}
                                                </h4>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatTime(crossing.crossing_time)}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    Vehicle Type: {crossing.vehicle_type || 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-8">
                            <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                            <h3 className="mt-4 text-lg font-semibold">No Journey Data</h3>
                            <p className="mt-2 text-sm text-muted-foreground">
                                Start tracking to see journey timeline
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* CSS for animations */}
            <style>{`
                @keyframes pulse {
                    0% {
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
                    }
                    70% {
                        box-shadow: 0 0 0 10px rgba(239, 68, 68, 0);
                    }
                    100% {
                        box-shadow: 0 0 0 0 rgba(239, 68, 68, 0);
                    }
                }
            `}</style>
        </div>
    );
};