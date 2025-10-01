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
    Activity
} from 'lucide-react';
import { trackVehicle, getTrackingHistory, TollCrossing } from '@/api/tracking';
import { useToast } from '@/hooks/use-toast';

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
}

export const VehicleTrackingMap: React.FC<VehicleTrackingMapProps> = ({
    bookingId,
    vehicleNumber,
    fromLocation,
    toLocation
}) => {
    const { toast } = useToast();
    const [tollCrossings, setTollCrossings] = useState<TollCrossing[]>([]);
    const [loading, setLoading] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
    const [waitTime, setWaitTime] = useState(0);
    const [dataSource, setDataSource] = useState<'real' | 'mock' | 'cached' | 'unknown'>('unknown');
    const [mapCenter, setMapCenter] = useState<[number, number]>([23.0225, 72.5714]); // Gujarat center
    const [mapZoom, setMapZoom] = useState(7);

    useEffect(() => {
        // Initial load - get cached data
        loadCachedData();
    }, [bookingId]);

    const loadCachedData = async () => {
        try {
            const history = await getTrackingHistory(bookingId);
            if (history.length > 0) {
                setTollCrossings(history);
                setLastUpdated(new Date());
                setDataSource('cached');
                updateMapCenter(history);
            }
        } catch (error) {
            console.error('Error loading cached data:', error);
        }
    };

    const updateMapCenter = (crossings: TollCrossing[]) => {
        if (crossings.length > 0) {
            const lastCrossing = crossings[crossings.length - 1];
            setMapCenter([lastCrossing.latitude, lastCrossing.longitude]);

            // Adjust zoom based on number of crossings
            if (crossings.length > 10) {
                setMapZoom(6);
            } else if (crossings.length > 5) {
                setMapZoom(7);
            } else {
                setMapZoom(8);
            }
        }
    };

    const loadTrackingData = async () => {
        try {
            setLoading(true);

            const result = await trackVehicle(bookingId);

            if (result.cached) {
                setWaitTime(result.waitTime || 0);
                setDataSource('cached');

                toast({
                    title: "⏱️ Rate Limited",
                    description: `Please wait ${result.waitTime} seconds before refreshing again`,
                    variant: "default"
                });

                // Start countdown
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

                // Set data source based on response
                if (result.isRealData) {
                    setDataSource('real');
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
            updateMapCenter(result.data);

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

    const formatTime = (dateString: string) => {
        try {
            const date = new Date(dateString);

            if (isNaN(date.getTime())) {
                return dateString;
            }

            // Subtract 5 hours 30 minutes because database has UTC but values are actually IST
            const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
            const correctedDate = new Date(date.getTime() - istOffset);

            const day = correctedDate.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[correctedDate.getMonth()];
            const year = correctedDate.getFullYear();

            let hours = correctedDate.getHours();
            const minutes = correctedDate.getMinutes().toString().padStart(2, '0');
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
            const [datePart, timePart] = dateString.split(' ');
            const [year, month, day] = datePart.split('-');
            const [hour, minute, second] = timePart.split(':');

            const crossingTime = new Date(
                parseInt(year),
                parseInt(month) - 1,
                parseInt(day),
                parseInt(hour),
                parseInt(minute),
                parseInt(second.split('.')[0])
            ).getTime();

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


    const lastCrossing = tollCrossings.length > 0 ? tollCrossings[tollCrossings.length - 1] : null;

    const createNumberIcon = (number: number, isLast: boolean = false) => {
        if (isLast) {
            return L.divIcon({
                html: `<div style="background: #ef4444; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 20px; animation: pulse 2s infinite;">🚚</div>`,
                iconSize: [40, 40],
                iconAnchor: [20, 20],
                className: 'current-location-marker'
            });
        }

        return L.divIcon({
            html: `<div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 12px; font-weight: bold;">${number}</div>`,
            iconSize: [30, 30],
            iconAnchor: [15, 15],
            className: 'toll-marker'
        });
    };

    return (
        <div className="space-y-4">
            {/* Header Card */}
            <Card className="border-primary/20">
                <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-primary animate-pulse" />
                            FASTag Vehicle Tracking
                        </CardTitle>
                        <div className="flex items-center gap-2">
                            {vehicleNumber && (
                                <Badge variant="secondary" className="gap-1">
                                    <Truck className="w-3 h-3" />
                                    {vehicleNumber}
                                </Badge>
                            )}
                            <Button
                                onClick={loadTrackingData}
                                disabled={loading || waitTime > 0}
                                size="sm"
                                variant={waitTime > 0 ? "outline" : "default"}
                            >
                                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                                {waitTime > 0 ? `Wait ${waitTime}s` : 'Track Now (₹4)'}
                            </Button>
                        </div>
                    </div>

                    {lastUpdated && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-2">
                            <Clock className="w-3 h-3" />
                            Last updated: {lastUpdated.toLocaleTimeString()}
                            {dataSource === 'real' && (
                                <Badge variant="success" className="ml-2 text-xs">REAL DATA</Badge>
                            )}
                            {dataSource === 'mock' && (
                                <Badge variant="warning" className="ml-2 text-xs">MOCK DATA</Badge>
                            )}
                            {dataSource === 'cached' && (
                                <Badge variant="secondary" className="ml-2 text-xs">CACHED</Badge>
                            )}
                        </div>
                    )}
                </CardHeader>
            </Card>

            {/* Live Map - Always Visible */}
            <Card className="border-border overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-primary" />
                            Live Route Map
                        </CardTitle>
                        {lastCrossing && (
                            <Badge variant="outline" className="gap-1">
                                <Activity className="w-3 h-3" />
                                {formatTimeAgo(lastCrossing.crossing_time)}
                            </Badge>
                        )}
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="relative h-[500px] w-full">
                        <MapContainer
                            center={mapCenter}
                            zoom={mapZoom}
                            className="h-full w-full"
                            scrollWheelZoom={true}
                        >
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                            />

                            {/* Plot all toll crossings */}
                            {tollCrossings.map((crossing, index) => {
                                const isLastCrossing = index === tollCrossings.length - 1;

                                return (
                                    <Marker
                                        key={crossing.id}
                                        position={[crossing.latitude, crossing.longitude]}
                                        icon={createNumberIcon(index + 1, isLastCrossing)}
                                    >
                                        <Popup>
                                            <div className="p-2 min-w-[200px]">
                                                <h3 className="font-bold text-sm">{crossing.toll_plaza_name}</h3>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {formatTime(crossing.crossing_time)}
                                                </p>
                                                <p className="text-xs mt-1">
                                                    Vehicle Type: {crossing.vehicle_type}
                                                </p>
                                                {isLastCrossing && (
                                                    <Badge className="mt-2 text-xs" variant="destructive">
                                                        Current Location
                                                    </Badge>
                                                )}
                                            </div>
                                        </Popup>
                                    </Marker>
                                );
                            })}

                            {/* Draw route line connecting all points */}
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
                                        className="route-animation"
                                    />
                                </>
                            )}
                        </MapContainer>

                        {/* Loading Overlay */}
                        {loading && (
                            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
                                <div className="text-center">
                                    <RefreshCw className="w-8 h-8 animate-spin text-primary mx-auto" />
                                    <p className="mt-2 text-sm font-medium">Updating vehicle location...</p>
                                </div>
                            </div>
                        )}

                        {/* No Data Message */}
                        {!loading && tollCrossings.length === 0 && (
                            <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-[999]">
                                <div className="text-center p-6">
                                    <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                                    <h3 className="mt-4 text-lg font-semibold">No Tracking Data</h3>
                                    <p className="mt-2 text-sm text-muted-foreground">
                                        Click "Track Now" to get the latest toll crossing information.
                                    </p>
                                    <Button
                                        onClick={loadTrackingData}
                                        className="mt-4"
                                        size="sm"
                                    >
                                        <RefreshCw className="w-4 h-4 mr-2" />
                                        Track Now
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Route Info & Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Route Info */}
                <Card className="border-border">
                    <CardContent className="pt-6">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                    <span className="font-medium text-sm">{fromLocation || 'Origin'}</span>
                                </div>
                                <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                    <span className="font-medium text-sm">{toLocation || 'Destination'}</span>
                                </div>
                            </div>

                            {lastCrossing && (
                                <Alert className="border-primary/20 bg-primary/5">
                                    <MapPin className="h-4 w-4" />
                                    <AlertDescription>
                                        <div>
                                            <p className="font-semibold text-sm">Current Location</p>
                                            <p className="text-xs mt-1">{lastCrossing.toll_plaza_name}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {formatTimeAgo(lastCrossing.crossing_time)}
                                            </p>
                                        </div>
                                    </AlertDescription>
                                </Alert>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Stats */}
                <Card className="border-border">
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">{tollCrossings.length}</p>
                                <p className="text-xs text-muted-foreground">Toll Crossings</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">
                                    {tollCrossings.length > 1
                                        ? Math.round((Date.now() - new Date(tollCrossings[0].crossing_time).getTime()) / (1000 * 60 * 60))
                                        : 0}h
                                </p>
                                <p className="text-xs text-muted-foreground">Journey Time</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-primary">₹{tollCrossings.length * 100}</p>
                                <p className="text-xs text-muted-foreground">Est. Toll Cost</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Timeline Card */}
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg">Journey Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                    {tollCrossings.length > 0 ? (
                        <div className="space-y-0 max-h-[400px] overflow-y-auto">
                            {tollCrossings.map((crossing, index) => (
                                <div key={crossing.id || index} className="flex gap-4 group">
                                    {/* Timeline Line */}
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

                                    {/* Content */}
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
                                Click "Track Now" to start tracking this vehicle.
                            </p>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cost & Data Source Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Cost Summary */}
                {tollCrossings.length > 0 && (
                    <Alert className="border-info/50 bg-info/5">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                            <strong>API Usage:</strong> Cost ₹{dataSource === 'real' ? '4' : '0'} per refresh.
                        </AlertDescription>
                    </Alert>
                )}

                {/* Data Source */}
                {dataSource !== 'unknown' && (
                    <Alert className={`${dataSource === 'real' ? 'border-green-500/50 bg-green-50' :
                        dataSource === 'mock' ? 'border-yellow-500/50 bg-yellow-50' :
                            'border-gray-500/50 bg-gray-50'
                        }`}>
                        <Activity className="h-4 w-4" />
                        <AlertDescription>
                            <div className="flex items-center justify-between">
                                <span className="text-sm">
                                    {dataSource === 'real' && 'Live FASTag API data'}
                                    {dataSource === 'mock' && 'Test data for demo'}
                                    {dataSource === 'cached' && 'Cached from previous request'}
                                </span>
                                <Badge variant={dataSource === 'real' ? 'default' : 'secondary'} className="text-xs">
                                    {dataSource.toUpperCase()}
                                </Badge>
                            </div>
                        </AlertDescription>
                    </Alert>
                )}
            </div>
        </div>
    );
};