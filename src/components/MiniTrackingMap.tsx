// components/MiniTrackingMap.tsx

import React, { useEffect, useState, useCallback } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  MapPin,
  AlertCircle,
  RefreshCw,
  Smartphone,
  Navigation,
  Lock,
  Clock,
  CheckCircle,
  Signal,
  User,
  PhoneCall,
  Hourglass,
  Target,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { trackVehicle, TollCrossing } from "@/api/tracking";
import { formatDistanceToNow } from "date-fns";

// Fix Leaflet icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface SimLocation {
  id?: string;
  latitude: number;
  longitude: number;
  location_name?: string;
  speed?: number;
  recorded_at: string;
  time_ago?: string;
  api_provider?: string;
}

interface SimRegistration {
  registered: boolean;
  registration_id?: string;
  phone_number?: string;
  driver_name?: string;
  registered_at?: string;
  expires_at?: string;
  days_remaining?: number;
  tracking_type?: string;
  daily_cost?: number;
  lorryinfo_contact_id?: string;
  consent_status?: string;
  consent_approved?: boolean;
  lorryinfo_tracking_status?: string;
}

interface MiniTrackingMapProps {
  bookingId: string;
  vehicleNumber?: string;
  bookingStatus?: string;
  assignmentDate?: string;
  className?: string;
}

export const MiniTrackingMap: React.FC<MiniTrackingMapProps> = ({
  bookingId,
  vehicleNumber,
  bookingStatus,
  assignmentDate,
  className,
}) => {
  const { toast } = useToast();

  // Common states
  const [trackingMode, setTrackingMode] = useState<"FASTAG" | "SIM">("FASTAG");
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    26.9124, 75.7873,
  ]);
  const [mapZoom, setMapZoom] = useState(7);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [trackingEndReason, setTrackingEndReason] = useState<string>("");
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // FASTag states
  const [tollCrossings, setTollCrossings] = useState<TollCrossing[]>([]);
  const [waitTime, setWaitTime] = useState(0);
  const [dataSource, setDataSource] = useState<
    "real" | "mock" | "cached" | "unknown"
  >("unknown");

  // SIM states
  const [simRegistration, setSimRegistration] =
    useState<SimRegistration | null>(null);
  const [isSimRegistered, setIsSimRegistered] = useState(false);
  const [simLocations, setSimLocations] = useState<SimLocation[]>([]);
  const [currentSimLocation, setCurrentSimLocation] =
    useState<SimLocation | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [driverDetails, setDriverDetails] = useState<{
    name: string;
    phone: string;
  } | null>(null);
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registeringSimTracking, setRegisteringSimTracking] = useState(false);
  const [simDataSource, setSimDataSource] = useState<"LIVE" | "MOCK">("MOCK");

  // ═══════════════════════════════════════════════════════════
  // INITIAL LOAD
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!bookingId || initialLoadDone) return;

    const loadInitialData = async () => {
      await checkTrackingStatus();
      await loadCachedData();
      setInitialLoadDone(true);
    };

    loadInitialData();
  }, [bookingId]);

  useEffect(() => {
    if (!bookingId || !initialLoadDone) return;

    if (trackingMode === "SIM") {
      checkSimRegistrationStatus();
    }
  }, [trackingMode, initialLoadDone]);

  // ═══════════════════════════════════════════════════════════
  // MAP BOUNDS
  // ═══════════════════════════════════════════════════════════

  const adjustMapBounds = useCallback(
    (points: { latitude: number; longitude: number }[]) => {
      if (points.length === 0) return;

      const bounds = points.reduce((acc, point) => {
        if (!acc.minLat || point.latitude < acc.minLat)
          acc.minLat = point.latitude;
        if (!acc.maxLat || point.latitude > acc.maxLat)
          acc.maxLat = point.latitude;
        if (!acc.minLng || point.longitude < acc.minLng)
          acc.minLng = point.longitude;
        if (!acc.maxLng || point.longitude > acc.maxLng)
          acc.maxLng = point.longitude;
        return acc;
      }, {} as any);

      if (bounds.minLat && bounds.maxLat) {
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
    },
    [],
  );

  useEffect(() => {
    if (trackingMode === "SIM" && simLocations.length > 0) {
      adjustMapBounds(
        simLocations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
        })),
      );
    }
  }, [simLocations, trackingMode]);

  useEffect(() => {
    if (trackingMode === "FASTAG" && tollCrossings.length > 0) {
      adjustMapBounds(
        tollCrossings.map((c) => ({
          latitude: c.latitude,
          longitude: c.longitude,
        })),
      );
    }
  }, [tollCrossings, trackingMode]);

  // ═══════════════════════════════════════════════════════════
  // TRACKING STATUS CHECK
  // ═══════════════════════════════════════════════════════════

  const checkTrackingStatus = async () => {
    if (bookingStatus === "DELIVERED" || bookingStatus === "CANCELLED") {
      setIsTrackingEnabled(false);
      setTrackingEndReason(
        bookingStatus === "DELIVERED"
          ? "Booking delivered"
          : "Booking cancelled",
      );
      return;
    }

    const { data: assignment } = await supabase
      .from("vehicle_assignments")
      .select("status, tracking_end_time")
      .eq("booking_id", bookingId)
      .eq("status", "ACTIVE")
      .maybeSingle();

    if (!assignment) {
      setIsTrackingEnabled(false);
      setTrackingEndReason("No active assignment");
      return;
    }

    if (assignment.tracking_end_time) {
      setIsTrackingEnabled(false);
      setTrackingEndReason("Tracking period ended");
      return;
    }

    setIsTrackingEnabled(true);
    setTrackingEndReason("");
  };

  // ═══════════════════════════════════════════════════════════
  // FASTAG FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const loadCachedData = async () => {
    try {
      const { data, error } = await supabase
        .from("fastag_crossings")
        .select("*")
        .eq("booking_id", bookingId)
        .order("crossing_time", { ascending: true });

      if (error) return;

      if (data && data.length > 0) {
        setTollCrossings(data);
        setLastUpdated(new Date());
        setDataSource("cached");
      }
    } catch (error) {
      console.error("Error loading cached data:", error);
    }
  };

  const loadTrackingData = async () => {
    if (!isTrackingEnabled) {
      toast({
        title: "⚠️ Tracking Disabled",
        description: trackingEndReason,
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const result = await trackVehicle(bookingId, assignmentDate);

      if (result.cached) {
        setWaitTime(result.waitTime || 0);
        setDataSource("cached");

        toast({
          title: "⏱️ Rate Limited",
          description: `Wait ${result.waitTime}s before refreshing`,
        });

        const interval = setInterval(() => {
          setWaitTime((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setWaitTime(0);
        setDataSource(result.isRealData ? "real" : "mock");

        const newCount = result.newRecords || 0;
        toast({
          title: newCount > 0 ? "🚚 New Toll Crossings!" : "✅ Updated",
          description:
            newCount > 0
              ? `Vehicle crossed ${newCount} new toll${newCount > 1 ? "s" : ""}`
              : `Found ${result.data.length} crossings`,
        });
      }

      setTollCrossings(result.data);
      setLastUpdated(new Date());
    } catch (error: any) {
      toast({
        title: "❌ Error",
        description: error.message || "Failed to load tracking data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SIM TRACKING FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const checkSimRegistrationStatus = async () => {
    try {
      const [regResult, driverResult, locationResult] = await Promise.all([
        supabase.rpc("check_sim_tracking_status", { p_booking_id: bookingId }),
        supabase
          .from("vehicle_assignments")
          .select(`id, drivers!inner(id, name, phone)`)
          .eq("booking_id", bookingId)
          .eq("status", "ACTIVE")
          .single(),
        supabase
          .from("sim_tracking_locations")
          .select("*")
          .eq("booking_id", bookingId)
          .order("recorded_at", { ascending: false })
          .limit(50),
      ]);

      if (regResult.data) {
        setSimRegistration(regResult.data);
        setIsSimRegistered(regResult.data?.registered || false);
      }

      if (driverResult.data?.drivers && driverResult.data.drivers.length > 0) {
        setDriverDetails(driverResult.data.drivers[0]);
      }

      if (locationResult.data && locationResult.data.length > 0) {
        setSimLocations(locationResult.data);
        setCurrentSimLocation(locationResult.data[0]);
        setLastUpdated(new Date(locationResult.data[0].recorded_at));
        setSimDataSource(
          locationResult.data[0].api_provider === "LORRYINFO" ? "LIVE" : "MOCK",
        );
      }
    } catch (error) {
      console.error("Error checking SIM status:", error);
    }
  };

  const handleSimRegistration = async () => {
    if (!driverDetails?.phone) {
      toast({
        title: "❌ Error",
        description: "Driver phone not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setRegisteringSimTracking(true);

      const { data, error } = await supabase.functions.invoke(
        "register-sim-tracking",
        {
          body: {
            bookingId,
            phoneNumber: driverDetails.phone,
            driverName: driverDetails.name,
          },
        },
      );

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "✅ Request Sent",
          description: data.data?.reusedExisting
            ? `Status refreshed for ${driverDetails.name}`
            : `SMS sent to ${driverDetails.name}`,
        });

        setShowRegisterDialog(false);
        await checkSimRegistrationStatus();
      } else {
        throw new Error(data?.error || "Registration failed");
      }
    } catch (error: any) {
      toast({
        title: "❌ Failed",
        description: error.message || "Failed to send request",
        variant: "destructive",
      });
    } finally {
      setRegisteringSimTracking(false);
    }
  };

  const fetchSimLocation = async () => {
    if (!isSimRegistered || !simRegistration?.phone_number) {
      toast({
        title: "⚠️ Not Registered",
        description: "Enable SIM tracking first",
        variant: "destructive",
      });
      return;
    }

    try {
      setSimLoading(true);

      const { data, error } = await supabase.functions.invoke(
        "fetch-sim-location",
        {
          body: { bookingId, phoneNumber: simRegistration.phone_number },
        },
      );

      if (error) throw error;

      if (data?.success) {
        if (data.registration) {
          setSimRegistration((prev) => ({ ...prev!, ...data.registration }));
        }

        if (data.consent_pending) {
          toast({
            title: "⏳ Consent Pending",
            description: "Waiting for driver reply",
          });
        } else if (data.current) {
          setCurrentSimLocation(data.current);
          if (data.history) setSimLocations(data.history);
          setLastUpdated(new Date());
          setSimDataSource(data.source);
          toast({
            title: "📍 Location Updated",
            description: data.current?.location_name || "Success",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "❌ Failed",
        description: error.message || "Failed to get location",
        variant: "destructive",
      });
    } finally {
      setSimLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // UTILITIES
  // ═══════════════════════════════════════════════════════════
  // Replace both functions with these versions:

  const formatTime = (dateString: string) => {
    try {
      if (!dateString) return "Unknown";

      let date: Date;

      if (dateString.includes(" ")) {
        const [datePart, timePart] = dateString.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute, second] = timePart.split(":").map(Number);

        // ✅ FIX: API time is already in IST, don't convert
        date = new Date(year, month - 1, day, hour, minute, Math.floor(second));

        // NO TIMEZONE CONVERSION - API time is already local
      } else if (dateString.endsWith("Z")) {
        // Only if explicitly UTC (with Z)
        date = new Date(dateString);
      } else {
        // Assume local time
        date = new Date(dateString.replace(" ", "T"));
      }

      if (isNaN(date.getTime())) return dateString;

      const d = date.getDate();
      const months = [
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
      const month = months[date.getMonth()];
      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12 || 12;

      return `${d} ${month}, ${hours}:${minutes} ${ampm}`;
    } catch {
      return dateString;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      if (!dateString) return "Unknown";

      const currentYear = new Date().getFullYear();
      let date: Date;

      if (dateString.includes(" ")) {
        const [datePart, timePart] = dateString.split(" ");
        let [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute, second] = timePart.split(":").map(Number);

        // Fix year if in future
        if (year > currentYear) {
          year = currentYear;
        }

        date = new Date(year, month - 1, day, hour, minute, Math.floor(second));
      } else {
        date = new Date(dateString);
      }

      // Ensure date is not in future
      const now = new Date();
      if (date > now) {
        return "Just now"; // Future dates = just happened
      }

      return formatDistanceToNow(date, { addSuffix: true });
    } catch (error) {
      console.error("formatTimeAgo error:", error);
      return "Unknown";
    }
  };

  // ═══════════════════════════════════════════════════════════
  // MARKER ICONS
  // ═══════════════════════════════════════════════════════════

  const createNumberIcon = (number: number, isLast: boolean = false) => {
    if (isLast) {
      return L.divIcon({
        html: `<div style="background: linear-gradient(135deg, #ef4444, #dc2626); color: white; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 2px 8px rgba(239,68,68,0.5); font-size: 12px; font-weight: bold; animation: pulse 2s infinite;">${number}</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: "current-location-marker",
      });
    }

    return L.divIcon({
      html: `<div style="background: linear-gradient(135deg, #10b981, #059669); color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 11px; font-weight: bold;">${number}</div>`,
      iconSize: [24, 24],
      iconAnchor: [12, 12],
      className: "toll-marker",
    });
  };

  const lastCrossing =
    tollCrossings.length > 0 ? tollCrossings[tollCrossings.length - 1] : null;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className={cn("space-y-3", className)}>
      {/* HEADER - SOLID WHITE BACKGROUND */}
      <div className="bg-card border border-border rounded-lg p-3">
        <div className="flex items-center justify-between gap-2">
          {/* Left - Title */}
          <div className="flex items-center gap-2">
            {isTrackingEnabled ? (
              trackingMode === "FASTAG" ? (
                <Navigation className="w-4 h-4 text-primary animate-pulse" />
              ) : (
                <Smartphone className="w-4 h-4 text-primary animate-pulse" />
              )
            ) : (
              <Lock className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-semibold text-foreground dark:text-white">
              {trackingMode === "FASTAG" ? "FASTag" : "SIM"} Tracking
            </span>
          </div>

          {/* Right - Actions */}
          <div className="flex items-center gap-2">
            {trackingMode === "FASTAG" ? (
              <Button
                onClick={loadTrackingData}
                disabled={loading || waitTime > 0 || !isTrackingEnabled}
                size="sm"
                variant={
                  !isTrackingEnabled
                    ? "ghost"
                    : waitTime > 0
                      ? "outline"
                      : "default"
                }
                className={cn(
                  "h-7 text-xs px-2",
                  waitTime === 0 &&
                    isTrackingEnabled &&
                    "bg-primary hover:bg-primary/90 text-primary-foreground",
                )}
              >
                <RefreshCw
                  className={cn("w-3 h-3 mr-1", loading && "animate-spin")}
                />
                {!isTrackingEnabled
                  ? "Disabled"
                  : waitTime > 0
                    ? `${waitTime}s`
                    : "Track Now"}
              </Button>
            ) : (
              <>
                {isSimRegistered ? (
                  <>
                    <Badge
                      className={cn(
                        "text-[10px] h-5",
                        simRegistration?.consent_approved
                          ? "bg-green-100 text-green-700 border-green-300"
                          : "bg-yellow-100 text-yellow-700 border-yellow-300",
                      )}
                    >
                      <CheckCircle className="w-2.5 h-2.5 mr-0.5" />
                      {simRegistration?.consent_approved ? "Active" : "Pending"}
                    </Badge>
                    <Button
                      onClick={fetchSimLocation}
                      disabled={simLoading || !isTrackingEnabled}
                      size="sm"
                      className="h-7 text-xs px-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <RefreshCw
                        className={cn(
                          "w-3 h-3 mr-1",
                          simLoading && "animate-spin",
                        )}
                      />
                      Refresh
                    </Button>
                    {simRegistration?.lorryinfo_tracking_status ===
                      "COMPLETED" && (
                      <Button
                        onClick={() => setShowRegisterDialog(true)}
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs px-2 border-primary text-primary"
                      >
                        <Target className="w-3 h-3 mr-1" />
                        New
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    onClick={() => setShowRegisterDialog(true)}
                    disabled={!isTrackingEnabled || !driverDetails}
                    size="sm"
                    className="h-7 text-xs px-2 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    <Smartphone className="w-3 h-3 mr-1" />
                    Enable
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tracking disabled alert */}
        {!isTrackingEnabled && trackingEndReason && (
          <div className="mt-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded border border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
            <AlertCircle className="w-3 h-3 text-yellow-600" />
            <span className="text-xs text-yellow-700 dark:text-yellow-400">
              {trackingEndReason}
            </span>
          </div>
        )}

        {/* SIM Driver Info */}
        {trackingMode === "SIM" && isSimRegistered && simRegistration && (
          <div className="mt-2 p-2 bg-muted rounded-lg border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium">
                  {simRegistration.driver_name}
                </span>
                <span className="text-xs text-muted-foreground">
                  • {simRegistration.phone_number}
                </span>
              </div>
              {simRegistration.consent_status === "PENDING" && (
                <Badge className="text-[10px] h-4 bg-yellow-100 text-yellow-700 border-yellow-300">
                  <Hourglass className="w-2 h-2 mr-0.5" />
                  Waiting
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="w-2.5 h-2.5" />
            Updated: {lastUpdated.toLocaleTimeString()}
            {trackingMode === "FASTAG" && dataSource === "real" && (
              <Badge className="ml-1 text-[9px] h-4 bg-green-100 text-green-700 border-green-300">
                LIVE
              </Badge>
            )}
            {trackingMode === "FASTAG" && dataSource === "cached" && (
              <Badge variant="secondary" className="ml-1 text-[9px] h-4">
                CACHED
              </Badge>
            )}
            {trackingMode === "SIM" && simDataSource === "LIVE" && (
              <Badge className="ml-1 text-[9px] h-4 bg-green-100 text-green-700 border-green-300">
                LIVE
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* MAP */}
      <div className="relative h-[220px] w-full rounded-lg overflow-hidden border border-border">
        {/* Mode Toggle */}
        <div className="absolute top-2 right-2 z-[1000] bg-card p-0.5 rounded-lg shadow-sm border border-border flex gap-0.5">
          <Button
            size="sm"
            variant={trackingMode === "FASTAG" ? "default" : "ghost"}
            className={cn(
              "h-6 text-[10px] px-2 font-medium",
              trackingMode === "FASTAG"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTrackingMode("FASTAG")}
          >
            <MapPin className="w-2.5 h-2.5 mr-1" />
            FASTag
          </Button>
          <Button
            size="sm"
            variant={trackingMode === "SIM" ? "default" : "ghost"}
            className={cn(
              "h-6 text-[10px] px-2 font-medium",
              trackingMode === "SIM"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
            onClick={() => setTrackingMode("SIM")}
          >
            <Smartphone className="w-2.5 h-2.5 mr-1" />
            SIM
          </Button>
        </div>

        {/* Crossings Badge */}
        <div className="absolute top-2 left-2 z-[1000] bg-card px-2 py-1 rounded-lg shadow-sm border border-border text-[10px] font-medium flex items-center gap-1">
          {trackingMode === "FASTAG" ? (
            <>
              <MapPin className="w-3 h-3 text-primary" />
              <span>
                {tollCrossings.length} toll
                {tollCrossings.length !== 1 ? "s" : ""}
              </span>
            </>
          ) : (
            <>
              <Signal className="w-3 h-3 text-primary" />
              <span>
                {simLocations.length} update
                {simLocations.length !== 1 ? "s" : ""}
              </span>
            </>
          )}
        </div>

        {/* FASTAG MAP */}
        {trackingMode === "FASTAG" && (
          <>
            {tollCrossings.length > 0 ? (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="h-full w-full"
                scrollWheelZoom={true}
                dragging={true}
                zoomControl={true}
                key={`minimap-fastag-${mapCenter[0]}-${mapCenter[1]}`}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OSM"
                />

                {tollCrossings.map((crossing, index) => (
                  <Marker
                    key={crossing.id}
                    position={[crossing.latitude, crossing.longitude]}
                    icon={createNumberIcon(
                      index + 1,
                      index === tollCrossings.length - 1,
                    )}
                  >
                    <Popup>
                      <div className="p-1 min-w-[160px]">
                        <p className="font-bold text-xs">
                          {crossing.toll_plaza_name}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {formatTime(crossing.crossing_time)}
                        </p>
                        {index === tollCrossings.length - 1 && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-bold rounded-full">
                            🔴 Current
                          </span>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                ))}

                {tollCrossings.length > 1 && (
                  <>
                    <Polyline
                      positions={tollCrossings.map((c) => [
                        c.latitude,
                        c.longitude,
                      ])}
                      color="#3b82f6"
                      weight={3}
                      opacity={0.8}
                    />
                    <Polyline
                      positions={tollCrossings.map((c) => [
                        c.latitude,
                        c.longitude,
                      ])}
                      color="#1e40af"
                      weight={2}
                      opacity={0.5}
                      dashArray="8, 12"
                    />
                  </>
                )}
              </MapContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-center p-4">
                <div className="w-12 h-12 rounded-full bg-muted-foreground/10 flex items-center justify-center mb-3">
                  <AlertCircle className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No tracking data</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Click "Track Now" to fetch location
                </p>
              </div>
            )}

            {loading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
                <div className="text-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-xs mt-2">Fetching...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* SIM MAP */}
        {trackingMode === "SIM" && (
          <>
            {!isSimRegistered ? (
              <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-center p-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                  <Smartphone className="w-6 h-6 text-primary" />
                </div>
                <p className="text-sm font-medium">SIM Tracking</p>
                {driverDetails ? (
                  <>
                    <p className="text-xs text-muted-foreground mt-1">
                      Driver: {driverDetails.name}
                    </p>
                    <Button
                      onClick={() => setShowRegisterDialog(true)}
                      size="sm"
                      className="mt-3 h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                    >
                      <Smartphone className="w-3 h-3 mr-1" />
                      Enable
                    </Button>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground mt-1">
                    No driver assigned
                  </p>
                )}
              </div>
            ) : simLocations.length > 0 ? (
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="h-full w-full"
                scrollWheelZoom={true}
                dragging={true}
                zoomControl={true}
                key={`minimap-sim-${mapCenter[0]}-${mapCenter[1]}`}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OSM"
                />

                {simLocations.map((location, index) => (
                  <CircleMarker
                    key={location.id || `sim-${index}`}
                    center={[location.latitude, location.longitude]}
                    radius={index === 0 ? 8 : 5}
                    fillColor={index === 0 ? "#3b82f6" : "#60a5fa"}
                    color="white"
                    weight={2}
                    opacity={1}
                    fillOpacity={0.8}
                  >
                    <Popup>
                      <div className="p-1 min-w-[160px]">
                        <p className="font-bold text-xs">
                          {index === 0
                            ? "Current Location"
                            : `Location ${index + 1}`}
                        </p>
                        {location.location_name && (
                          <p className="text-[10px] text-muted-foreground">
                            {location.location_name}
                          </p>
                        )}
                        {location.speed && (
                          <p className="text-[10px]">
                            Speed: {location.speed} km/h
                          </p>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}

                {simLocations.length > 1 && (
                  <Polyline
                    positions={simLocations.map((loc) => [
                      loc.latitude,
                      loc.longitude,
                    ])}
                    color="#3b82f6"
                    weight={3}
                    opacity={0.6}
                    dashArray="5, 10"
                  />
                )}
              </MapContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-muted text-center p-4">
                <div className="w-12 h-12 rounded-full bg-muted-foreground/10 flex items-center justify-center mb-3">
                  <Signal className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">No location data</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {simRegistration?.consent_status === "PENDING"
                    ? "Waiting for driver consent"
                    : 'Click "Refresh" to get location'}
                </p>
              </div>
            )}

            {simLoading && (
              <div className="absolute inset-0 bg-background/80 flex items-center justify-center z-[1000]">
                <div className="text-center">
                  <Smartphone className="w-6 h-6 animate-pulse text-primary mx-auto" />
                  <p className="text-xs mt-2">Fetching...</p>
                </div>
              </div>
            )}
          </>
        )}

        {/* Pulse animation */}
        <style>{`
                    @keyframes pulse {
                        0% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
                        70% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); }
                        100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
                    }
                `}</style>
      </div>

      {/* SIM Registration Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="bg-card border-border max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-foreground">SIM Tracking</DialogTitle>
            <DialogDescription className="text-muted-foreground text-xs">
              Get location using driver's network
            </DialogDescription>
          </DialogHeader>
          <div className="py-3 space-y-3">
            <div className="bg-muted p-3 rounded-lg border border-border text-sm">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Driver:</span>
                <span className="font-medium">{driverDetails?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-medium">{driverDetails?.phone}</span>
              </div>
            </div>
            <p className="text-[10px] text-muted-foreground">
              * SMS will be sent to driver for consent
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRegisterDialog(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleSimRegistration}
              disabled={registeringSimTracking}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {registeringSimTracking ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <CheckCircle className="w-3 h-3 mr-1" />
              )}
              Get Location
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
