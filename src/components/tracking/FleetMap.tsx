// =============================================
// FLEET MAP - FASTAG + SIM + FROM/TO MARKERS
// =============================================

import React, { useEffect, useState } from "react";
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
import {
  Truck,
  MapPin,
  Clock,
  Navigation,
  Smartphone,
  Phone,
  User,
  Signal,
  Loader2,
} from "lucide-react";
import { getCityCoordinates, getCityCoordinatesAsync } from "@/utils/geocode";

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

interface LocationCoords {
  from: { lat: number; lng: number } | null;
  to: { lat: number; lng: number } | null;
  loading: boolean;
}

// =============================================
// AUTO FIT BOUNDS COMPONENT
// =============================================

const AutoFitBounds: React.FC<{
  mode: "fleet" | "random";
  groupedVehicles?: GroupedVehicle[];
  randomSearch?: RandomSearch;
  fromToCoords?: LocationCoords;
}> = ({ mode, groupedVehicles, randomSearch, fromToCoords }) => {
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
      const validCrossings = randomSearch.toll_crossings.filter(
        (c) => c.latitude !== 0 && c.longitude !== 0
      );

      const allPoints: [number, number][] = [];

      validCrossings.forEach((c) => {
        allPoints.push([c.latitude, c.longitude]);
      });

      // Include FROM/TO in bounds
      if (fromToCoords?.from) {
        allPoints.push([fromToCoords.from.lat, fromToCoords.from.lng]);
      }
      if (fromToCoords?.to) {
        allPoints.push([fromToCoords.to.lat, fromToCoords.to.lng]);
      }

      if (allPoints.length > 0) {
        const maxZoom = randomSearch.search_type === "live" ? 13 : 8;
        map.fitBounds(allPoints, { padding: [50, 50], maxZoom: maxZoom });
      }
    }
  }, [mode, groupedVehicles, randomSearch, fromToCoords, map]);

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
    // CURRENT LOCATION - Truck Icon
    return L.divIcon({
      html: `
        <div style="position: relative; width: 44px; height: 44px;">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
            <!-- Shadow -->
            <ellipse cx="22" cy="40" rx="12" ry="3" fill="rgba(0,0,0,0.2)"/>
            <!-- Circle Background -->
            <circle cx="22" cy="20" r="18" fill="#f97316"/>
            <circle cx="22" cy="20" r="15" fill="white"/>
            <!-- Truck Icon -->
            <g transform="translate(10, 10)">
              <path d="M20 8H17V4H3C1.9 4 1 4.9 1 6V15H3C3 16.66 4.34 18 6 18C7.66 18 9 16.66 9 15H15C15 16.66 16.34 18 18 18C19.66 18 21 16.66 21 15H23V11L20 8ZM6 16.5C5.17 16.5 4.5 15.83 4.5 15C4.5 14.17 5.17 13.5 6 13.5C6.83 13.5 7.5 14.17 7.5 15C7.5 15.83 6.83 16.5 6 16.5ZM19.5 9.5L21.46 12H17V9.5H19.5ZM18 16.5C17.17 16.5 16.5 15.83 16.5 15C16.5 14.17 17.17 13.5 18 13.5C18.83 13.5 19.5 14.17 19.5 15C19.5 15.83 18.83 16.5 18 16.5Z" fill="#f97316"/>
            </g>
          </svg>
          <!-- Pulse Animation -->
          <div style="position: absolute; top: 2px; left: 4px; width: 36px; height: 36px; border-radius: 50%; border: 3px solid #f97316; animation: pulse-ring 1.5s ease-out infinite;"></div>
        </div>
      `,
      iconSize: [44, 44],
      iconAnchor: [22, 22],
      popupAnchor: [0, -22],
      className: "journey-current-marker",
    });
  }

  // PAST LOCATIONS - Small hollow circle
  return L.divIcon({
    html: `
      <div style="position: relative; width: 16px; height: 16px;">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Outer Circle -->
          <circle cx="8" cy="8" r="7" fill="white" stroke="#f97316" stroke-width="2"/>
          <!-- Inner Dot -->
          <circle cx="8" cy="8" r="3" fill="#f97316"/>
        </svg>
      </div>
    `,
    iconSize: [16, 16],
    iconAnchor: [8, 8],
    popupAnchor: [0, -8],
    className: "journey-past-marker",
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
// ICON CREATORS - FROM/TO LOCATIONS
// =============================================

const createFromLocationIcon = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 30px; height: 42px;">
        <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Shadow -->
          <ellipse cx="15" cy="40" rx="8" ry="2" fill="rgba(0,0,0,0.2)"/>
          <!-- Pin Body -->
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#22c55e"/>
          <!-- Inner Circle -->
          <circle cx="15" cy="15" r="6" fill="white"/>
          <!-- Center Dot -->
          <circle cx="15" cy="15" r="3" fill="#22c55e"/>
        </svg>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
    className: "from-location-marker",
  });
};

const createToLocationIcon = () => {
  return L.divIcon({
    html: `
      <div style="position: relative; width: 30px; height: 42px;">
        <svg width="30" height="42" viewBox="0 0 30 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <!-- Shadow -->
          <ellipse cx="15" cy="40" rx="8" ry="2" fill="rgba(0,0,0,0.2)"/>
          <!-- Pin Body -->
          <path d="M15 0C6.716 0 0 6.716 0 15c0 10.5 15 27 15 27s15-16.5 15-27C30 6.716 23.284 0 15 0z" fill="#ef4444"/>
          <!-- Inner Circle -->
          <circle cx="15" cy="15" r="6" fill="white"/>
          <!-- Center Dot -->
          <circle cx="15" cy="15" r="3" fill="#ef4444"/>
        </svg>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -42],
    className: "to-location-marker",
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
    const cleanStr = str
      .replace("T", " ")
      .replace("Z", "")
      .split(".")[0]
      .split("+")[0];
    const [datePart, timePart] = cleanStr.split(" ");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = (timePart || "00:00").split(":").map(Number);

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

  // FROM/TO Coordinates State
  const [fromToCoords, setFromToCoords] = useState<LocationCoords>({
    from: null,
    to: null,
    loading: false,
  });

  // Check if SIM tracking
  const isSim = selectedRandomSearch?.tracking_mode === "SIM";

  // Check if waiting for consent
  const isWaitingForConsent =
    isSim &&
    selectedRandomSearch?.toll_crossings?.length === 1 &&
    selectedRandomSearch?.toll_crossings[0]?.latitude === 0 &&
    selectedRandomSearch?.toll_crossings[0]?.longitude === 0;

  // Filter valid crossings
  const validCrossings =
    selectedRandomSearch?.toll_crossings?.filter(
      (c) => c.latitude !== 0 && c.longitude !== 0
    ) || [];

  // ═══════════════════════════════════════════════════════════
  // FETCH FROM/TO COORDINATES (with API fallback)
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const fetchFromToCoordinates = async () => {
      if (
        mode !== "random" ||
        !selectedRandomSearch ||
        selectedRandomSearch.search_type !== "journey" ||
        isSim
      ) {
        setFromToCoords({ from: null, to: null, loading: false });
        return;
      }

      setFromToCoords((prev) => ({ ...prev, loading: true }));

      try {
        // Try sync first (local DB)
        let fromCoords = getCityCoordinates(
          selectedRandomSearch.from_location || ""
        );
        let toCoords = getCityCoordinates(
          selectedRandomSearch.to_location || ""
        );

        // If not found in local DB, try async (API)
        if (!fromCoords && selectedRandomSearch.from_location) {
          console.log(
            `🔍 FROM not in DB, trying API: ${selectedRandomSearch.from_location}`
          );
          fromCoords = await getCityCoordinatesAsync(
            selectedRandomSearch.from_location
          );
        }

        if (!toCoords && selectedRandomSearch.to_location) {
          console.log(
            `🔍 TO not in DB, trying API: ${selectedRandomSearch.to_location}`
          );
          toCoords = await getCityCoordinatesAsync(
            selectedRandomSearch.to_location
          );
        }

        setFromToCoords({
          from: fromCoords,
          to: toCoords,
          loading: false,
        });

        // Log results
        if (fromCoords) {
          console.log(
            `✅ FROM: ${selectedRandomSearch.from_location} →`,
            fromCoords
          );
        } else {
          console.warn(
            `⚠️ FROM not found: ${selectedRandomSearch.from_location}`
          );
        }

        if (toCoords) {
          console.log(`✅ TO: ${selectedRandomSearch.to_location} →`, toCoords);
        } else {
          console.warn(`⚠️ TO not found: ${selectedRandomSearch.to_location}`);
        }
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        setFromToCoords({ from: null, to: null, loading: false });
      }
    };

    fetchFromToCoordinates();
  }, [
    mode,
    selectedRandomSearch?.id,
    selectedRandomSearch?.from_location,
    selectedRandomSearch?.to_location,
    isSim,
  ]);

  return (
    <div className="relative h-[600px] w-full rounded-lg overflow-hidden border border-border z-0">
      {/* ═══════════════════════════════════════════════════════════ */}
      {/* LOADING OVERLAY FOR FROM/TO */}
      {/* ═══════════════════════════════════════════════════════════ */}

      {fromToCoords.loading && (
        <div className="absolute top-4 right-4 z-[1000] bg-background/90 backdrop-blur-sm px-3 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-primary" />
          <span className="text-xs text-muted-foreground">
            Loading locations...
          </span>
        </div>
      )}

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
          fromToCoords={fromToCoords}
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
                {/* Journey Toll Markers */}
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

                {/* Journey Polyline */}
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
        {/* FROM/TO LOCATION MARKERS (Journey Mode - FASTAG) */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {mode === "random" &&
          selectedRandomSearch &&
          !isSim &&
          selectedRandomSearch.search_type === "journey" &&
          !fromToCoords.loading && (
            <>
              {/* FROM Location Marker */}
              {fromToCoords.from && (
                <Marker
                  position={[fromToCoords.from.lat, fromToCoords.from.lng]}
                  icon={createFromLocationIcon()}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="p-3 min-w-[180px] text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                          A
                        </div>
                        <span className="font-bold text-green-600">START</span>
                      </div>
                      <p className="font-semibold text-lg">
                        {selectedRandomSearch.from_location}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Journey Starting Point
                      </p>
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* TO Location Marker */}
              {fromToCoords.to && (
                <Marker
                  position={[fromToCoords.to.lat, fromToCoords.to.lng]}
                  icon={createToLocationIcon()}
                  zIndexOffset={1000}
                >
                  <Popup>
                    <div className="p-3 min-w-[180px] text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <div className="w-8 h-8 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                          B
                        </div>
                        <span className="font-bold text-red-600">END</span>
                      </div>
                      <p className="font-semibold text-lg">
                        {selectedRandomSearch.to_location}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Journey Destination
                      </p>
                    </div>
                  </Popup>
                </Marker>
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

                      <div className="flex items-center gap-2 mb-2">
                        <Phone className="w-4 h-4 text-purple-600" />
                        <span className="font-mono font-semibold">
                          {selectedRandomSearch.phone_number}
                        </span>
                      </div>

                      {selectedRandomSearch.driver_name && (
                        <div className="flex items-center gap-2 mb-2">
                          <User className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {selectedRandomSearch.driver_name}
                          </span>
                        </div>
                      )}

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

                      <p className="text-xs text-muted-foreground mb-1">
                        <MapPin className="w-3 h-3 inline mr-1" />
                        {validCrossings[0].toll_plaza_name || "SIM Location"}
                      </p>

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
        
        .from-location-marker,
        .to-location-marker {
          z-index: 1000 !important;
        }
      `}</style>
    </div>
  );
};
