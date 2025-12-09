import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FleetVehicle, GroupedVehicle, VehicleTollCrossing } from '@/api/fleet';
import { Badge } from '@/components/ui/badge';
import { getTimeAgo } from '@/api/fleet';
import { Truck, MapPin, Clock } from 'lucide-react';

// Fix Leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface FleetMapProps {
    groupedVehicles: GroupedVehicle[];
    vehicleHistory?: VehicleTollCrossing[];
    searchedVehicle?: string;
}

// Auto-fit map bounds component
const AutoFitBounds: React.FC<{ groupedVehicles: GroupedVehicle[], vehicleHistory?: VehicleTollCrossing[] }> = ({
    groupedVehicles,
    vehicleHistory
}) => {
    const map = useMap();

    useEffect(() => {
        if (vehicleHistory && vehicleHistory.length > 0) {
            // Fit to vehicle history route
            const bounds = vehicleHistory.map(c => [c.latitude, c.longitude] as [number, number]);
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        } else if (groupedVehicles.length > 0) {
            // Fit to all fleet vehicles
            const bounds = groupedVehicles.map(g => [g.lat, g.lng] as [number, number]);
            if (bounds.length > 0) {
                map.fitBounds(bounds, { padding: [50, 50] });
            }
        }
    }, [groupedVehicles, vehicleHistory, map]);

    return null;
};

// Create marker icon for single vehicle
const createSingleVehicleIcon = () => {
    return L.divIcon({
        html: `
      <div style="
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 4px 8px rgba(16, 185, 129, 0.5);
        font-size: 20px;
      ">🚚</div>
    `,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: 'single-vehicle-marker'
    });
};

// Create marker icon for clustered vehicles
const createClusteredIcon = (count: number) => {
    return L.divIcon({
        html: `
      <div style="
        background: linear-gradient(135deg, #3b82f6, #1e40af);
        color: white;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border: 3px solid white;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6);
        font-weight: bold;
      ">
        <div style="font-size: 20px;">${count}</div>
        <div style="font-size: 10px;">vehicles</div>
      </div>
    `,
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        className: 'cluster-marker'
    });
};

// Create numbered marker for vehicle history
const createNumberedIcon = (number: number, isLast: boolean = false) => {
    if (isLast) {
        return L.divIcon({
            html: `
        <div style="
          background: linear-gradient(135deg, #ef4444, #dc2626);
          color: white;
          width: 35px;
          height: 35px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid white;
          box-shadow: 0 4px 8px rgba(239, 68, 68, 0.6);
          font-size: 14px;
          font-weight: bold;
          animation: pulse 2s infinite;
        ">${number}</div>
      `,
            iconSize: [35, 35],
            iconAnchor: [17.5, 17.5],
            className: 'current-location-marker'
        });
    }

    return L.divIcon({
        html: `
      <div style="
        background: linear-gradient(135deg, #10b981, #059669);
        color: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid white;
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        font-size: 12px;
        font-weight: bold;
      ">${number}</div>
    `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        className: 'numbered-marker'
    });
};

export const FleetMap: React.FC<FleetMapProps> = ({
    groupedVehicles,
    vehicleHistory,
    searchedVehicle
}) => {
    const [mapCenter] = useState<[number, number]>([20.5937, 78.9629]);
    const [mapZoom] = useState(5);

    return (
        <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-border z-0">
            <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="h-full w-full"
                scrollWheelZoom={true}
                key={`fleet-map-${vehicleHistory?.length || 0}`}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                />

                <AutoFitBounds groupedVehicles={groupedVehicles} vehicleHistory={vehicleHistory} />

                {/* Show vehicle search history */}
                {vehicleHistory && vehicleHistory.length > 0 ? (
                    <>
                        {/* Plot numbered markers */}
                        {vehicleHistory.map((crossing, index) => (
                            <Marker
                                key={crossing.crossing_id}
                                position={[crossing.latitude, crossing.longitude]}
                                icon={createNumberedIcon(index + 1, index === vehicleHistory.length - 1)}
                            >
                                <Popup>
                                    <div className="p-2 min-w-[200px]">
                                        <p className="font-bold text-sm mb-1">
                                            #{index + 1} {crossing.toll_plaza_name}
                                        </p>
                                        <p className="text-xs text-muted-foreground mb-1">
                                            {new Date(crossing.crossing_time).toLocaleString('en-IN')}
                                        </p>
                                        {crossing.booking_display_id && (
                                            <Badge variant="outline" className="text-xs">
                                                {crossing.booking_display_id}
                                            </Badge>
                                        )}
                                        {index === vehicleHistory.length - 1 && (
                                            <Badge variant="destructive" className="mt-1 text-xs">
                                                Current Location
                                            </Badge>
                                        )}
                                    </div>
                                </Popup>
                            </Marker>
                        ))}

                        {/* Draw route line */}
                        {vehicleHistory.length > 1 && (
                            <>
                                <Polyline
                                    positions={vehicleHistory.map(c => [c.latitude, c.longitude])}
                                    color="#3b82f6"
                                    weight={4}
                                    opacity={0.7}
                                />
                                <Polyline
                                    positions={vehicleHistory.map(c => [c.latitude, c.longitude])}
                                    color="#1e40af"
                                    weight={2}
                                    opacity={0.5}
                                    dashArray="10, 15"
                                />
                            </>
                        )}
                    </>
                ) : (
                    /* Show fleet vehicles */
                    groupedVehicles.map((group, index) => (
                        <Marker
                            key={index}
                            position={[group.lat, group.lng]}
                            icon={group.count > 1 ? createClusteredIcon(group.count) : createSingleVehicleIcon()}
                        >
                            <Popup>
                                <div className="p-3 min-w-[250px]">
                                    <div className="flex items-center gap-2 mb-2">
                                        <MapPin className="w-4 h-4 text-primary" />
                                        <p className="font-bold text-sm">{group.location}</p>
                                    </div>

                                    {group.count === 1 ? (
                                        /* Single vehicle */
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-2">
                                                <Truck className="w-4 h-4 text-blue-600" />
                                                <span className="font-semibold">{group.vehicles[0].vehicle_number}</span>
                                            </div>
                                            <div className="text-xs">
                                                <p className="font-medium text-primary">{group.vehicles[0].booking_display_id}</p>
                                                <p className="text-muted-foreground mt-1">
                                                    {group.vehicles[0].from_location} → {group.vehicles[0].to_location}
                                                </p>
                                            </div>
                                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                                <Clock className="w-3 h-3" />
                                                {getTimeAgo(group.vehicles[0].last_crossing_time)}
                                            </div>
                                        </div>
                                    ) : (
                                        /* Multiple vehicles - Table */
                                        <div>
                                            <p className="text-xs text-muted-foreground mb-2">{group.count} vehicles at this location</p>
                                            <div className="max-h-[200px] overflow-y-auto">
                                                <table className="w-full text-xs">
                                                    <thead className="bg-muted sticky top-0">
                                                        <tr>
                                                            <th className="p-1 text-left">No.</th>
                                                            <th className="p-1 text-left">Vehicle</th>
                                                            <th className="p-1 text-left">Booking</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {group.vehicles.map((vehicle, idx) => (
                                                            <tr key={idx} className="border-b border-border">
                                                                <td className="p-1">{idx + 1}</td>
                                                                <td className="p-1 font-medium">{vehicle.vehicle_number}</td>
                                                                <td className="p-1">
                                                                    <Badge variant="outline" className="text-xs">
                                                                        {vehicle.booking_display_id}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div className="mt-2 pt-2 border-t border-border text-xs text-muted-foreground flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                Last update: {getTimeAgo(group.vehicles[0].last_crossing_time)}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    ))
                )}
            </MapContainer>

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