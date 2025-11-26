// components/MiniTrackingMap.tsx

import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '@/lib/supabase';
import { Loader2, MapPin, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TollCrossing {
    id: string;
    toll_plaza_name: string;
    latitude: number;
    longitude: number;
    crossing_time: string;
    vehicle_type?: string;
}

interface MiniTrackingMapProps {
    bookingId: string;
    vehicleNumber?: string;
    className?: string;
}

export const MiniTrackingMap: React.FC<MiniTrackingMapProps> = ({
    bookingId,
    vehicleNumber,
    className
}) => {
    const [tollCrossings, setTollCrossings] = useState<TollCrossing[]>([]);
    const [loading, setLoading] = useState(true);
    const [mapCenter, setMapCenter] = useState<[number, number]>([26.9124, 75.7873]);
    const [mapZoom, setMapZoom] = useState(7);

    useEffect(() => {
        if (bookingId) {
            loadTollCrossings();
        }
    }, [bookingId]);

    // Auto-adjust map bounds
    useEffect(() => {
        if (tollCrossings.length > 0) {
            const bounds = tollCrossings.reduce((acc, crossing) => {
                if (!acc.minLat || crossing.latitude < acc.minLat) acc.minLat = crossing.latitude;
                if (!acc.maxLat || crossing.latitude > acc.maxLat) acc.maxLat = crossing.latitude;
                if (!acc.minLng || crossing.longitude < acc.minLng) acc.minLng = crossing.longitude;
                if (!acc.maxLng || crossing.longitude > acc.maxLng) acc.maxLng = crossing.longitude;
                return acc;
            }, {} as { minLat?: number; maxLat?: number; minLng?: number; maxLng?: number });

            if (bounds.minLat && bounds.maxLat && bounds.minLng && bounds.maxLng) {
                const centerLat = (bounds.minLat + bounds.maxLat) / 2;
                const centerLng = (bounds.minLng + bounds.maxLng) / 2;
                setMapCenter([centerLat, centerLng]);

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
        }
    }, [tollCrossings]);

    const loadTollCrossings = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from('fastag_crossings')
                .select('*')
                .eq('booking_id', bookingId)
                .order('crossing_time', { ascending: true });

            if (error) {
                console.error('Error loading toll crossings:', error);
                return;
            }

            setTollCrossings(data || []);
        } catch (error) {
            console.error('Error in loadTollCrossings:', error);
        } finally {
            setLoading(false);
        }
    };

    // Create numbered marker icon
    const createNumberIcon = (number: number, isLast: boolean = false) => {
        if (isLast) {
            return L.divIcon({
                html: `
                    <div style="
                        background: linear-gradient(135deg, #ef4444, #dc2626); 
                        color: white; 
                        width: 32px; 
                        height: 32px; 
                        border-radius: 50%; 
                        display: flex; 
                        align-items: center; 
                        justify-content: center; 
                        border: 3px solid white; 
                        box-shadow: 0 2px 8px rgba(239,68,68,0.5); 
                        font-size: 12px; 
                        font-weight: bold;
                        animation: pulse 2s infinite;
                    ">${number}</div>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                className: 'current-location-marker'
            });
        }

        return L.divIcon({
            html: `
                <div style="
                    background: linear-gradient(135deg, #10b981, #059669); 
                    color: white; 
                    width: 24px; 
                    height: 24px; 
                    border-radius: 50%; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    border: 2px solid white; 
                    box-shadow: 0 2px 4px rgba(0,0,0,0.2); 
                    font-size: 11px; 
                    font-weight: bold;
                ">${number}</div>
            `,
            iconSize: [24, 24],
            iconAnchor: [12, 12],
            className: 'toll-marker'
        });
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

            const d = date.getDate();
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const month = months[date.getMonth()];
            let hours = date.getHours();
            const minutes = date.getMinutes().toString().padStart(2, '0');
            const ampm = hours >= 12 ? 'pm' : 'am';
            hours = hours % 12 || 12;

            return `${d} ${month}, ${hours}:${minutes} ${ampm}`;
        } catch {
            return dateString;
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className={cn(
                "h-[200px] bg-muted dark:bg-gray-900/50 rounded-lg flex items-center justify-center border border-border",
                className
            )}>
                <div className="text-center">
                    <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                    <p className="text-xs text-muted-foreground mt-2">Loading map...</p>
                </div>
            </div>
        );
    }

    // No data state
    if (tollCrossings.length === 0) {
        return (
            <div className={cn(
                "h-[200px] bg-muted dark:bg-gray-900/50 rounded-lg flex flex-col items-center justify-center text-center p-4 border border-dashed border-border",
                className
            )}>
                <div className="w-12 h-12 rounded-full bg-muted-foreground/10 flex items-center justify-center mb-3">
                    <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium text-foreground dark:text-white">No tracking data yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
                    Toll crossings will appear here once the vehicle passes through FASTag enabled tolls
                </p>
            </div>
        );
    }

    return (
        <div className={cn(
            "relative h-[220px] w-full rounded-lg overflow-hidden border border-border",
            className
        )}>
            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="h-full w-full"
                scrollWheelZoom={false}
                dragging={true}
                zoomControl={false}
                key={`minimap-${bookingId}-${mapCenter[0]}-${mapCenter[1]}`}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OSM'
                />

                {/* Plot markers */}
                {tollCrossings.map((crossing, index) => (
                    <Marker
                        key={crossing.id}
                        position={[crossing.latitude, crossing.longitude]}
                        icon={createNumberIcon(index + 1, index === tollCrossings.length - 1)}
                    >
                        <Popup>
                            <div className="p-1 min-w-[160px]">
                                <p className="font-bold text-xs text-gray-900">{crossing.toll_plaza_name}</p>
                                <p className="text-[10px] text-gray-600 mt-1">
                                    {formatTime(crossing.crossing_time)}
                                </p>
                                {index === tollCrossings.length - 1 && (
                                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                                        🔴 Current Location
                                    </span>
                                )}
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Draw route polyline */}
                {tollCrossings.length > 1 && (
                    <>
                        {/* Main line */}
                        <Polyline
                            positions={tollCrossings.map(c => [c.latitude, c.longitude])}
                            color="#3b82f6"
                            weight={3}
                            opacity={0.8}
                        />
                        {/* Dashed overlay */}
                        <Polyline
                            positions={tollCrossings.map(c => [c.latitude, c.longitude])}
                            color="#1e40af"
                            weight={2}
                            opacity={0.5}
                            dashArray="8, 12"
                        />
                    </>
                )}
            </MapContainer>

            {/* Top-left: Crossings count */}
            <div className="absolute top-2 left-2 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-sm border border-border text-xs font-medium flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary" />
                <span className="text-foreground dark:text-white">
                    {tollCrossings.length} toll{tollCrossings.length > 1 ? 's' : ''} crossed
                </span>
            </div>

            {/* Top-right: Vehicle number */}
            {vehicleNumber && (
                <div className="absolute top-2 right-2 z-[1000] bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm px-2.5 py-1.5 rounded-lg shadow-sm border border-border text-xs font-bold flex items-center gap-1.5">
                    <span>🚚</span>
                    <span className="text-foreground dark:text-white">{vehicleNumber}</span>
                </div>
            )}

            {/* Pulse animation CSS */}
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