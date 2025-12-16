import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GroupedVehicle } from "@/api/fleet";
import { RandomSearch } from "@/api/randomSearch";
import { Badge } from "@/components/ui/badge";
import { getTimeAgo } from "@/api/fleet";
import { Truck, MapPin, Clock, Navigation } from "lucide-react";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface FleetMapProps {
  mode: "fleet" | "random";
  groupedVehicles?: GroupedVehicle[];
  selectedRandomSearch?: RandomSearch;
}

const AutoFitBounds: React.FC<{
  mode: "fleet" | "random";
  groupedVehicles?: GroupedVehicle[];
  randomSearch?: RandomSearch;
}> = ({ mode, groupedVehicles, randomSearch }) => {
  const map = useMap();

  useEffect(() => {
    if (mode === "fleet" && groupedVehicles && groupedVehicles.length > 0) {
      const bounds = groupedVehicles.map(
        (g) => [g.lat, g.lng] as [number, number]
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else if (
      mode === "random" &&
      randomSearch &&
      randomSearch.toll_crossings.length > 0
    ) {
      const bounds = randomSearch.toll_crossings.map(
        (c) => [c.latitude, c.longitude] as [number, number]
      );
      const maxZoom = randomSearch.search_type === "live" ? 13 : 10;
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: maxZoom });
    }
  }, [mode, groupedVehicles, randomSearch, map]);

  return null;
};

const createFleetSingleIcon = () => {
  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(59, 130, 246, 0.5); font-size: 20px;">🚚</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: "fleet-single-marker",
  });
};

const createFleetClusteredIcon = (count: number) => {
  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #3b82f6, #1e40af); color: white; width: 50px; height: 50px; border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.6); font-weight: bold;"><div style="font-size: 20px;">${count}</div><div style="font-size: 10px;">vehicles</div></div>`,
    iconSize: [50, 50],
    iconAnchor: [25, 25],
    className: "fleet-cluster-marker",
  });
};

const createRandomLiveIcon = () => {
  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #10b981, #059669); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(16, 185, 129, 0.5); font-size: 20px; animation: pulse-green 2s infinite;">📍</div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    className: "random-live-marker",
  });
};

const createJourneyNumberedIcon = (number: number, isLast: boolean = false) => {
  if (isLast) {
    return L.divIcon({
      html: `<div style="background: linear-gradient(135deg, #f97316, #ea580c); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(249, 115, 22, 0.6); font-size: 16px; font-weight: bold; animation: pulse-orange 2s infinite;">${number}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      className: "journey-current-marker",
    });
  }

  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #fb923c, #f97316); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); font-size: 14px; font-weight: bold;">${number}</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: "journey-numbered-marker",
  });
};

export const FleetMap: React.FC<FleetMapProps> = ({
  mode,
  groupedVehicles,
  selectedRandomSearch,
}) => {
  const [mapCenter] = React.useState<[number, number]>([20.5937, 78.9629]);
  const [mapZoom] = React.useState(5);

  return (
    <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-border z-0">
      <MapContainer
        center={mapCenter}
        zoom={mapZoom}
        className="h-full w-full"
        scrollWheelZoom={true}
        key={`map-${mode}-${selectedRandomSearch?.id || "none"}`}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap"
        />

        <AutoFitBounds
          mode={mode}
          groupedVehicles={groupedVehicles}
          randomSearch={selectedRandomSearch}
        />

        {mode === "fleet" &&
          groupedVehicles &&
          groupedVehicles.map((group, index) => (
            <Marker
              key={index}
              position={[group.lat, group.lng]}
              icon={
                group.count > 1
                  ? createFleetClusteredIcon(group.count)
                  : createFleetSingleIcon()
              }
            >
              <Popup>
                <div className="p-3 min-w-[250px]">
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-4 h-4 text-blue-600" />
                    <p className="font-bold text-sm">{group.location}</p>
                  </div>

                  {group.count === 1 ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Truck className="w-4 h-4 text-blue-600" />
                        <span className="font-semibold">
                          {group.vehicles[0].vehicle_number}
                        </span>
                      </div>
                      <div className="text-xs">
                        <p className="font-medium text-primary">
                          {group.vehicles[0].booking_display_id}
                        </p>
                        <p className="text-muted-foreground mt-1">
                          {group.vehicles[0].from_location} →{" "}
                          {group.vehicles[0].to_location}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {getTimeAgo(group.vehicles[0].last_crossing_time)}
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {group.count} vehicles at this location
                      </p>
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
                                <td className="p-1 font-medium">
                                  {vehicle.vehicle_number}
                                </td>
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
                        Last update:{" "}
                        {getTimeAgo(group.vehicles[0].last_crossing_time)}
                      </div>
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}

        {mode === "random" && selectedRandomSearch && (
          <>
            {selectedRandomSearch.search_type === "live" ? (
              selectedRandomSearch.last_latitude &&
              selectedRandomSearch.last_longitude && (
                <Marker
                  position={[
                    selectedRandomSearch.last_latitude,
                    selectedRandomSearch.last_longitude,
                  ]}
                  icon={createRandomLiveIcon()}
                >
                  <Popup>
                    <div className="p-3 min-w-[200px]">
                      <div className="flex items-center gap-2 mb-2">
                        <Navigation className="w-4 h-4 text-green-600" />
                        <p className="font-bold text-sm">Live Location</p>
                      </div>
                      <p className="font-mono font-semibold mb-2">
                        {selectedRandomSearch.vehicle_number}
                      </p>
                      <p className="text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {selectedRandomSearch.last_toll_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {selectedRandomSearch.last_crossing_time
                          ? new Date(
                              selectedRandomSearch.last_crossing_time
                            ).toLocaleString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "Unknown time"}
                      </p>
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Random Search
                      </Badge>
                    </div>
                  </Popup>
                </Marker>
              )
            ) : (
              <>
                {selectedRandomSearch.toll_crossings.map((crossing, index) => (
                  <Marker
                    key={index}
                    position={[crossing.latitude, crossing.longitude]}
                    icon={createJourneyNumberedIcon(
                      index + 1,
                      index === selectedRandomSearch.toll_crossings.length - 1
                    )}
                  >
                    <Popup>
                      <div className="p-2 min-w-[200px]">
                        <p className="font-bold text-sm mb-1">
                          #{index + 1} {crossing.toll_plaza_name}
                        </p>
                        <p className="text-xs text-muted-foreground mb-1">
                          {new Date(crossing.crossing_time).toLocaleString(
                            "en-IN"
                          )}
                        </p>
                        {index ===
                          selectedRandomSearch.toll_crossings.length - 1 && (
                          <Badge variant="destructive" className="mt-1 text-xs">
                            Latest Location
                          </Badge>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {selectedRandomSearch.toll_crossings.length > 1 && (
                  <>
                    <Polyline
                      positions={selectedRandomSearch.toll_crossings.map(
                        (c) => [c.latitude, c.longitude]
                      )}
                      color="#f97316"
                      weight={4}
                      opacity={0.7}
                    />
                    <Polyline
                      positions={selectedRandomSearch.toll_crossings.map(
                        (c) => [c.latitude, c.longitude]
                      )}
                      color="#ea580c"
                      weight={2}
                      opacity={0.5}
                      dashArray="10, 15"
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </MapContainer>

      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        }
        @keyframes pulse-orange {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
        }
      `}</style>
    </div>
  );
};
