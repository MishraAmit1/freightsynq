// =============================================
// FLEET MAP - FASTAG + SIM SUPPORT
// =============================================

import React, { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { GroupedVehicle } from "@/api/fleet";
import { RandomSearch } from "@/api/randomSearch";
import { Badge } from "@/components/ui/badge";
import { getTimeAgo } from "@/api/fleet";
import {
  Truck,
  MapPin,
  Clock,
  Navigation,
  Smartphone,
  Phone,
  User,
  Signal,
} from "lucide-react";

// =============================================
// LEAFLET ICON FIX
// =============================================

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// =============================================
// INTERFACES
// =============================================

interface FleetMapProps {
  mode: "fleet" | "random";
  groupedVehicles?: GroupedVehicle[];
  selectedRandomSearch?: RandomSearch;
}

// =============================================
// AUTO FIT BOUNDS COMPONENT
// =============================================

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
      // Filter out invalid coordinates (0,0 means waiting for consent)
      const validCrossings = randomSearch.toll_crossings.filter(
        (c) => c.latitude !== 0 && c.longitude !== 0
      );

      if (validCrossings.length > 0) {
        const bounds = validCrossings.map(
          (c) => [c.latitude, c.longitude] as [number, number]
        );
        const maxZoom = randomSearch.search_type === "live" ? 13 : 10;
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: maxZoom });
      }
    }
  }, [mode, groupedVehicles, randomSearch, map]);

  return null;
};

// =============================================
// ICON CREATORS - FLEET
// =============================================

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

// =============================================
// ICON CREATORS - FASTAG RANDOM
// =============================================

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

// =============================================
// ICON CREATORS - SIM
// =============================================

const createSimLiveIcon = () => {
  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; width: 44px; height: 44px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 12px rgba(139, 92, 246, 0.6); font-size: 22px; animation: pulse-purple 2s infinite;">📱</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
    className: "sim-live-marker",
  });
};

const createSimHistoryIcon = (index: number, isLatest: boolean) => {
  if (isLatest) {
    return L.divIcon({
      html: `<div style="background: linear-gradient(135deg, #8b5cf6, #7c3aed); color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 8px rgba(139, 92, 246, 0.6); font-size: 16px; font-weight: bold; animation: pulse-purple 2s infinite;">${index}</div>`,
      iconSize: [40, 40],
      iconAnchor: [20, 20],
      className: "sim-latest-marker",
    });
  }

  return L.divIcon({
    html: `<div style="background: linear-gradient(135deg, #a78bfa, #8b5cf6); color: white; width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 12px; font-weight: bold;">${index}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    className: "sim-history-marker",
  });
};

// =============================================
// HELPER FUNCTIONS
// =============================================

const formatCrossingTime = (
  dateStr: string | Date | null | undefined
): string => {
  if (!dateStr) return "Unknown time";

  try {
    const str = String(dateStr);

    // Clean the string - handle "2025-12-20 11:51:29.000" or "2025-12-20T11:51:29.000Z"
    const cleanStr = str
      .replace("T", " ")
      .replace("Z", "")
      .split(".")[0]
      .split("+")[0];
    const [datePart, timePart] = cleanStr.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = (timePart || "00:00").split(":").map(Number);

    // Format manually - NO timezone conversion!
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? "pm" : "am";

    return `${day.toString().padStart(2, "0")} ${
      monthNames[month - 1]
    } ${year}, ${hour12}:${minutes.toString().padStart(2, "0")} ${ampm}`;
  } catch (e) {
    console.error("Date format error:", e, dateStr);
    return String(dateStr) || "Unknown time";
  }
};

// =============================================
// MAIN COMPONENT
// =============================================

export const FleetMap: React.FC<FleetMapProps> = ({
  mode,
  groupedVehicles,
  selectedRandomSearch,
}) => {
  const [mapCenter] = React.useState<[number, number]>([20.5937, 78.9629]);
  const [mapZoom] = React.useState(5);

  // Check if SIM tracking
  const isSim = selectedRandomSearch?.tracking_mode === "SIM";

  // Check if waiting for consent (coordinates are 0,0)
  const isWaitingForConsent =
    isSim &&
    selectedRandomSearch?.toll_crossings?.length === 1 &&
    selectedRandomSearch?.toll_crossings[0]?.latitude === 0 &&
    selectedRandomSearch?.toll_crossings[0]?.longitude === 0;

  // Filter valid crossings (non-zero coordinates)
  const validCrossings =
    selectedRandomSearch?.toll_crossings?.filter(
      (c) => c.latitude !== 0 && c.longitude !== 0
    ) || [];

  return (
    <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-border z-0">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* WAITING FOR CONSENT OVERLAY (SIM) */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {isWaitingForConsent && (
        <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex flex-col items-center justify-center z-[1000]">
          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mb-4">
            <Smartphone className="w-10 h-10 text-yellow-600 dark:text-yellow-400 animate-pulse" />
          </div>
          <h3 className="text-xl font-semibold text-foreground dark:text-white mb-2">
            Waiting for Driver Consent
          </h3>
          <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
            SMS sent to <strong>{selectedRandomSearch?.phone_number}</strong>
            {selectedRandomSearch?.driver_name && (
              <> ({selectedRandomSearch.driver_name})</>
            )}
          </p>
          <p className="text-xs text-muted-foreground">
            Driver must reply <strong>YES</strong> to the SMS to enable tracking
          </p>
          <div className="mt-6 p-4 bg-muted dark:bg-secondary rounded-lg text-center">
            <p className="text-xs text-muted-foreground">
              Click <strong>Refresh</strong> button after driver approves
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MAP */}
      {/* ═══════════════════════════════════════════════════════════ */}

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

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FLEET MODE */}
        {/* ═══════════════════════════════════════════════════════════ */}

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

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RANDOM MODE - FASTAG */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {mode === "random" && selectedRandomSearch && !isSim && (
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
                        <Badge variant="secondary" className="text-xs ml-auto">
                          <Truck className="w-3 h-3 mr-1" />
                          FASTag
                        </Badge>
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
                        {formatCrossingTime(
                          selectedRandomSearch.last_crossing_time
                        )}
                      </p>
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
                          {formatCrossingTime(crossing.crossing_time)}
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

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* RANDOM MODE - SIM */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {mode === "random" &&
          selectedRandomSearch &&
          isSim &&
          !isWaitingForConsent && (
            <>
              {/* Single location (Live) */}
              {validCrossings.length === 1 && (
                <Marker
                  position={[
                    validCrossings[0].latitude,
                    validCrossings[0].longitude,
                  ]}
                  icon={createSimLiveIcon()}
                >
                  <Popup>
                    <div className="p-3 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-3">
                        <Signal className="w-4 h-4 text-purple-600" />
                        <p className="font-bold text-sm">SIM Location</p>
                        <Badge className="text-xs ml-auto bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                          <Smartphone className="w-3 h-3 mr-1" />
                          Live
                        </Badge>
                      </div>

                      {/* Phone Number */}
                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-purple-600" />
                        <span className="font-mono font-semibold">
                          {selectedRandomSearch.phone_number}
                        </span>
                      </div>

                      {/* Driver Name */}
                      {selectedRandomSearch.driver_name && (
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {selectedRandomSearch.driver_name}
                          </span>
                        </div>
                      )}

                      {/* Vehicle Reference */}
                      {selectedRandomSearch.vehicle_number && (
                        <div className="flex items-center gap-2 mb-2">
                          <Truck className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm font-mono">
                            {selectedRandomSearch.vehicle_number}
                          </span>
                          <Badge variant="secondary" className="text-xs">
                            ref
                          </Badge>
                        </div>
                      )}

                      {/* Location */}
                      <p className="text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {validCrossings[0].toll_plaza_name || "SIM Location"}
                      </p>

                      {/* Time */}
                      <p className="text-xs text-muted-foreground">
                        <Clock className="w-3 h-3 inline mr-1" />
                        {formatCrossingTime(validCrossings[0].crossing_time)}
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Multiple locations (History) */}
              {validCrossings.length > 1 && (
                <>
                  {validCrossings.map((crossing, index) => {
                    const isLatest = index === validCrossings.length - 1;

                    return (
                      <Marker
                        key={index}
                        position={[crossing.latitude, crossing.longitude]}
                        icon={createSimHistoryIcon(index + 1, isLatest)}
                      >
                        <Popup>
                          <div className="p-2 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-2">
                              <Smartphone className="w-4 h-4 text-purple-600" />
                              <p className="font-bold text-sm">
                                {isLatest
                                  ? "Current Location"
                                  : `Location #${index + 1}`}
                              </p>
                            </div>

                            <p className="text-xs mb-1">
                              <MapPin className="w-3 h-3 inline mr-1" />
                              {crossing.toll_plaza_name || "SIM Location"}
                            </p>

                            <p className="text-xs text-muted-foreground">
                              <Clock className="w-3 h-3 inline mr-1" />
                              {formatCrossingTime(crossing.crossing_time)}
                            </p>

                            {isLatest && (
                              <Badge className="mt-2 text-xs bg-purple-600 text-white">
                                Latest
                              </Badge>
                            )}
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}

                  {/* Polyline for SIM history */}
                  <Polyline
                    positions={validCrossings.map((c) => [
                      c.latitude,
                      c.longitude,
                    ])}
                    color="#8b5cf6"
                    weight={3}
                    opacity={0.7}
                  />
                  <Polyline
                    positions={validCrossings.map((c) => [
                      c.latitude,
                      c.longitude,
                    ])}
                    color="#7c3aed"
                    weight={2}
                    opacity={0.5}
                    dashArray="8, 12"
                  />
                </>
              )}
            </>
          )}
      </MapContainer>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* ANIMATIONS CSS */}
      {/* ═══════════════════════════════════════════════════════════ */}

      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
        }
        @keyframes pulse-orange {
          0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(249, 115, 22, 0); }
        }
        @keyframes pulse-purple {
          0%, 100% { box-shadow: 0 0 0 0 rgba(139, 92, 246, 0.7); }
          50% { box-shadow: 0 0 0 10px rgba(139, 92, 246, 0); }
        }
      `}</style>
    </div>
  );
};
