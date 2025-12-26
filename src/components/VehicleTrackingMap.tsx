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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  RefreshCw,
  MapPin,
  Truck,
  Clock,
  AlertCircle,
  Navigation,
  Info,
  Activity,
  Lock,
  Smartphone,
  Signal,
  CheckCircle,
  DollarSign,
  MapPinned,
  Wifi,
  PhoneCall,
  User,
  Loader2,
  Hourglass,
  Target,
} from "lucide-react";
import { trackVehicle, TollCrossing } from "@/api/tracking";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

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

// ═══════════════════════════════════════════════════════════
// INTERFACES
// ═══════════════════════════════════════════════════════════

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

interface VehicleTrackingMapProps {
  bookingId: string;
  vehicleNumber?: string;
  fromLocation?: string;
  toLocation?: string;
  bookingStatus?: string;
  assignmentDate?: string;
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export const VehicleTrackingMap: React.FC<VehicleTrackingMapProps> = ({
  bookingId,
  vehicleNumber,
  fromLocation,
  toLocation,
  bookingStatus,
  assignmentDate,
}) => {
  const { toast } = useToast();

  // ═══════════════════════════════════════════════════════════
  // STATES
  // ═══════════════════════════════════════════════════════════

  // FASTag States
  const [tollCrossings, setTollCrossings] = useState<TollCrossing[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [waitTime, setWaitTime] = useState(0);
  const [dataSource, setDataSource] = useState<
    "real" | "mock" | "cached" | "unknown"
  >("unknown");
  const [mapCenter, setMapCenter] = useState<[number, number]>([
    26.9124, 75.7873,
  ]);
  const [mapZoom, setMapZoom] = useState(7);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(true);
  const [trackingEndReason, setTrackingEndReason] = useState<string>("");
  const [totalApiCost, setTotalApiCost] = useState(0);
  const [monthlyUsage, setMonthlyUsage] = useState({ used: 0, limit: 1000 });
  const [monthlyCost, setMonthlyCost] = useState(0);
  const [trackingMode, setTrackingMode] = useState<"FASTAG" | "SIM">("FASTAG");

  // SIM Tracking States
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

  // Page visibility state
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  // Initial load flag
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // PAGE VISIBILITY HANDLER
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // COMBINED INITIAL DATA LOAD
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!bookingId || initialLoadDone) return;

    const loadInitialData = async () => {
      console.log("📊 Loading initial data for booking:", bookingId);

      try {
        await checkTrackingStatus();
        await Promise.all([loadMonthlyUsage(), loadMonthlyCost()]);

        if (trackingMode === "FASTAG") {
          await loadCachedData();
        }

        setInitialLoadDone(true);
      } catch (error) {
        console.error("Error loading initial data:", error);
      }
    };

    loadInitialData();
  }, [bookingId]);

  // ═══════════════════════════════════════════════════════════
  // TRACKING MODE CHANGE HANDLER
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!bookingId || !initialLoadDone) return;

    if (trackingMode === "SIM") {
      checkSimRegistrationStatus();
    } else if (trackingMode === "FASTAG") {
      if (tollCrossings.length === 0) {
        loadCachedData();
      }
    }
  }, [trackingMode, initialLoadDone]);

  // ═══════════════════════════════════════════════════════════
  // MAP AUTO-ADJUST EFFECTS
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (trackingMode === "SIM" && simLocations.length > 0) {
      adjustMapBounds(
        simLocations.map((loc) => ({
          latitude: loc.latitude,
          longitude: loc.longitude,
        }))
      );
    }
  }, [simLocations, trackingMode]);

  useEffect(() => {
    if (trackingMode === "FASTAG" && tollCrossings.length > 0) {
      adjustMapBounds(
        tollCrossings.map((crossing) => ({
          latitude: crossing.latitude,
          longitude: crossing.longitude,
        }))
      );
    }
  }, [tollCrossings, trackingMode]);

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
    []
  );

  // ═══════════════════════════════════════════════════════════
  // SIM TRACKING FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const checkSimRegistrationStatus = async () => {
    try {
      console.log("📱 Checking SIM registration status...");

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

      if (driverResult.data?.drivers) {
        setDriverDetails(driverResult.data.drivers);
      }

      if (locationResult.data && locationResult.data.length > 0) {
        setSimLocations(locationResult.data);
        setCurrentSimLocation(locationResult.data[0]);
        setLastUpdated(new Date(locationResult.data[0].recorded_at));

        const lastProvider = locationResult.data[0].api_provider;
        setSimDataSource(lastProvider === "LORRYINFO" ? "LIVE" : "MOCK");
      }
    } catch (error) {
      console.error("Error in checkSimRegistrationStatus:", error);
    }
  };

  const handleSimRegistration = async () => {
    if (!driverDetails?.phone) {
      toast({
        title: "❌ Error",
        description: "Driver phone number not found",
        variant: "destructive",
      });
      return;
    }

    try {
      setRegisteringSimTracking(true);
      console.log("📱 Requesting Single Hit Tracking...");

      const { data, error } = await supabase.functions.invoke(
        "register-sim-tracking",
        {
          body: {
            bookingId,
            phoneNumber: driverDetails.phone,
            driverName: driverDetails.name,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        const msg = data.data?.reusedExisting
          ? `Status refreshed for ${driverDetails.name}`
          : `SMS sent to ${driverDetails.name}. Waiting for consent.`;

        toast({
          title: "✅ Request Sent",
          description: msg,
        });

        setShowRegisterDialog(false);
        await checkSimRegistrationStatus();
      } else {
        throw new Error(data?.error || "Registration failed");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "❌ Request Failed",
        description: error.message || "Failed to send tracking request",
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
        description: "Please enable SIM tracking first",
        variant: "destructive",
      });
      return;
    }

    try {
      setSimLoading(true);
      console.log("📍 Fetching SIM location...");

      const { data, error } = await supabase.functions.invoke(
        "fetch-sim-location",
        {
          body: {
            bookingId,
            phoneNumber: simRegistration.phone_number,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        if (data.registration) {
          setSimRegistration((prev) => ({
            ...prev!,
            ...data.registration,
            consent_status: data.consent_status,
            consent_approved: data.consent_approved,
            lorryinfo_tracking_status: data.tracking_status,
          }));
        }

        if (data.consent_pending) {
          toast({
            title: "⏳ Consent Pending",
            description: "SMS sent to driver. Waiting for reply 'YES'.",
          });
        } else if (data.tracking_expired) {
          if (data.current) {
            setCurrentSimLocation(data.current);
            if (data.history) setSimLocations(data.history);
            setLastUpdated(new Date());
            setSimDataSource(data.source);
            toast({
              title: "📍 Track Complete",
              description: "Location fetched successfully.",
            });
          } else {
            toast({
              title: "⚠️ Request Completed",
              description: "Click 'New Request' for fresh location (₹1).",
            });
          }
        } else {
          if (data.current) {
            setCurrentSimLocation(data.current);
          }
          if (data.history) {
            setSimLocations(data.history);
          }
          setLastUpdated(new Date());
          setSimDataSource(data.source);

          toast({
            title: "📍 Location Updated",
            description:
              data.current?.location_name || "Location fetched successfully",
          });
        }
      }
    } catch (error: any) {
      console.error("Error fetching SIM location:", error);
      toast({
        title: "❌ Location Fetch Failed",
        description: error.message || "Failed to get location",
        variant: "destructive",
      });
    } finally {
      setSimLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // FASTAG FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const checkTrackingStatus = async () => {
    if (bookingStatus === "DELIVERED" || bookingStatus === "CANCELLED") {
      setIsTrackingEnabled(false);
      setTrackingEndReason(
        bookingStatus === "DELIVERED"
          ? "Tracking ended - Booking delivered"
          : "Tracking ended - Booking cancelled"
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
      setTrackingEndReason("No active vehicle assignment");
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

  const loadMonthlyUsage = async () => {
    try {
      const { data: config } = await supabase
        .from("tracking_configurations")
        .select("current_month_usage, monthly_api_limit")
        .maybeSingle();

      if (config) {
        setMonthlyUsage({
          used: config.current_month_usage || 0,
          limit: config.monthly_api_limit || 1000,
        });
      }
    } catch (error) {
      console.error("Error in loadMonthlyUsage:", error);
    }
  };

  const loadMonthlyCost = async () => {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await supabase
        .from("fastag_api_logs")
        .select("api_cost")
        .gte("created_at", startOfMonth.toISOString())
        .eq("status", "SUCCESS");

      const total =
        data?.reduce((sum, log) => sum + (log.api_cost || 0), 0) || 0;
      setMonthlyCost(total);
    } catch (error) {
      console.error("Error loading monthly cost:", error);
    }
  };

  const loadCachedData = async () => {
    try {
      console.log("Loading cached FASTag data...");

      const { data, error } = await supabase
        .from("fastag_crossings")
        .select("*")
        .eq("booking_id", bookingId)
        .order("crossing_time", { ascending: true });

      if (error) {
        console.error("Error loading cached data:", error);
        return;
      }

      if (data && data.length > 0) {
        const mockTollNames = [
          "Jaipur Entry Toll",
          "Manesar Toll Plaza",
          "Kherki Daula Toll Plaza",
        ];
        const realData = data.filter(
          (crossing) => !mockTollNames.includes(crossing.toll_plaza_name)
        );

        if (realData.length > 0) {
          setTollCrossings(realData);
          setLastUpdated(new Date());
          setDataSource("cached");
          console.log(`✅ Loaded ${realData.length} cached toll crossings`);
        }
      }
    } catch (error) {
      console.error("Error in loadCachedData:", error);
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

    if (monthlyUsage.used >= monthlyUsage.limit) {
      toast({
        title: "📊 Monthly Limit Reached",
        description: `You've used ${monthlyUsage.used}/${monthlyUsage.limit} API calls this month`,
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
          description: `Please wait ${result.waitTime} seconds before refreshing again`,
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

        if (result.isRealData) {
          setDataSource("real");
          setMonthlyUsage((prev) => ({ ...prev, used: prev.used + 1 }));
          setTotalApiCost((prev) => prev + 4);
          await loadMonthlyCost();
        } else if (result.isMockData) {
          setDataSource("mock");
        }

        const newCrossingsCount = result.newRecords || 0;

        if (newCrossingsCount > 0) {
          toast({
            title: "🚚 New Toll Crossings!",
            description: `Vehicle crossed ${newCrossingsCount} new toll plaza${
              newCrossingsCount > 1 ? "s" : ""
            }`,
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
      console.error("Error loading tracking data:", error);
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
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const formatTime = (dateString: string) => {
    try {
      if (!dateString) return "Unknown";

      let date: Date;

      if (dateString.includes(" ")) {
        const [datePart, timePart] = dateString.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute, second] = timePart.split(":").map(Number);
        date = new Date(year, month - 1, day, hour, minute, Math.floor(second));
      } else {
        date = new Date(dateString);
      }

      if (isNaN(date.getTime())) return dateString;

      const dayNum = date.getDate();
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
      const year = date.getFullYear();

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const ampm = hours >= 12 ? "pm" : "am";
      hours = hours % 12 || 12;

      return `${dayNum} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      if (!dateString) return "Unknown";
      if (dateString.includes(" ")) {
        const [datePart, timePart] = dateString.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute, second] = timePart.split(":").map(Number);
        const date = new Date(
          year,
          month - 1,
          day,
          hour,
          minute,
          Math.floor(second)
        );
        return formatDistanceToNow(date, { addSuffix: true });
      }
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Unknown";
    }
  };

  const shouldRefreshData = (lastCrossing: TollCrossing) => {
    if (!lastCrossing) return true;
    const lastCrossingTime = new Date(lastCrossing.crossing_time).getTime();
    const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
    return lastCrossingTime < twoHoursAgo;
  };

  const groupCrossingsByLocation = () => {
    const locationGroups: { [key: string]: typeof tollCrossings } = {};
    tollCrossings.forEach((crossing) => {
      const key = `${crossing.latitude.toFixed(4)}-${crossing.longitude.toFixed(
        4
      )}`;
      if (!locationGroups[key]) {
        locationGroups[key] = [];
      }
      locationGroups[key].push(crossing);
    });
    return locationGroups;
  };

  // ═══════════════════════════════════════════════════════════
  // MARKER ICONS
  // ═══════════════════════════════════════════════════════════

  const createClusterIcon = (
    count: number,
    numbers: number[],
    isLatest: boolean = false
  ) => {
    const bgColor = isLatest
      ? "#ef4444"
      : "linear-gradient(135deg, #3b82f6, #1e40af)";
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
            ${isLatest ? "animation: pulse 2s infinite;" : ""}
        ">
            <div style="font-size: 18px;">${count}</div>
            <div style="font-size: 9px;">visits</div>
        </div>
      `,
      iconSize: [size, size],
      iconAnchor: [size / 2, size / 2],
      className: "cluster-marker",
    });
  };

  const createNumberIcon = (number: number, isLast: boolean = false) => {
    if (isLast) {
      return L.divIcon({
        html: `<div style="background: #ef4444; color: white; width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); font-size: 16px; font-weight: bold; animation: pulse 2s infinite;">${number}</div>`,
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        className: "current-location-marker",
      });
    }

    return L.divIcon({
      html: `<div style="background: #10b981; color: white; width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.2); font-size: 14px; font-weight: bold;">${number}</div>`,
      iconSize: [30, 30],
      iconAnchor: [15, 15],
      className: "toll-marker",
    });
  };

  const lastCrossing =
    tollCrossings.length > 0 ? tollCrossings[tollCrossings.length - 1] : null;

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <Card
        className={cn(
          "bg-card border border-border dark:border-border rounded-xl shadow-sm",
          !isTrackingEnabled && "opacity-75"
        )}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
              {isTrackingEnabled ? (
                trackingMode === "FASTAG" ? (
                  <Navigation className="w-5 h-5 text-primary animate-pulse" />
                ) : (
                  <Smartphone className="w-5 h-5 text-primary animate-pulse" />
                )
              ) : (
                <Lock className="w-5 h-5 text-muted-foreground" />
              )}
              {trackingMode === "FASTAG"
                ? "FASTag Vehicle Tracking"
                : "SIM-Based Tracking"}
            </CardTitle>
            <div className="flex items-center gap-2">
              {vehicleNumber && (
                <Badge
                  variant="secondary"
                  className="gap-1 bg-muted text-foreground dark:text-white border border-border"
                >
                  <Truck className="w-3 h-3" />
                  {vehicleNumber}
                </Badge>
              )}

              {!isPageVisible && (
                <Badge
                  variant="outline"
                  className="gap-1 text-orange-600 border-orange-300 dark:border-orange-800"
                >
                  ⏸️ Paused
                </Badge>
              )}

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
                    waitTime === 0 &&
                      isTrackingEnabled &&
                      "bg-primary hover:bg-primary-hover text-primary-foreground"
                  )}
                >
                  <RefreshCw
                    className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`}
                  />
                  {!isTrackingEnabled
                    ? "Tracking Disabled"
                    : waitTime > 0
                    ? `Wait ${waitTime}s`
                    : "Track Now (₹4)"}
                </Button>
              ) : (
                <>
                  {isSimRegistered ? (
                    <>
                      <Badge
                        className={cn(
                          "gap-1 text-xs",
                          simRegistration?.consent_approved
                            ? "bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-[#059669]/15 dark:text-[#34D399] dark:border-[#059669]/30"
                            : "bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D] dark:bg-[#D97706]/15 dark:text-[#FBBF24] dark:border-[#D97706]/30"
                        )}
                      >
                        <CheckCircle className="w-3 h-3" />
                        {simRegistration?.consent_approved
                          ? "Active"
                          : "Pending Consent"}
                      </Badge>
                      <Button
                        onClick={fetchSimLocation}
                        disabled={simLoading || !isTrackingEnabled}
                        size="sm"
                        className="bg-primary hover:bg-primary-hover text-primary-foreground"
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${
                            simLoading ? "animate-spin" : ""
                          }`}
                        />
                        Refresh Location
                      </Button>

                      {simRegistration?.lorryinfo_tracking_status ===
                        "COMPLETED" && (
                        <Button
                          onClick={() => setShowRegisterDialog(true)}
                          size="sm"
                          variant="outline"
                          className="border-primary text-primary hover:bg-primary/10"
                        >
                          <Target className="w-4 h-4 mr-2" /> New Request (₹1)
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      onClick={() => setShowRegisterDialog(true)}
                      disabled={!isTrackingEnabled || !driverDetails}
                      size="sm"
                      className="bg-primary hover:bg-primary-hover text-primary-foreground"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      One-Time Track (₹1)
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {!isTrackingEnabled && trackingEndReason && (
            <Alert className="mt-2 border-[#FCD34D] bg-[#FEF3C7] dark:bg-[#D97706]/10 dark:border-[#D97706]/30">
              <AlertCircle className="h-4 w-4 text-[#D97706]" />
              <AlertDescription className="text-[#92400E] dark:text-[#FBBF24]">
                {trackingEndReason}
              </AlertDescription>
            </Alert>
          )}

          {/* SIM Registration Info */}
          {trackingMode === "SIM" && isSimRegistered && simRegistration && (
            <div className="mt-3 p-3 bg-muted dark:bg-secondary rounded-lg border border-border dark:border-border">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-medium text-sm text-foreground dark:text-white">
                      {simRegistration.driver_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-primary" />
                    <span className="text-sm text-muted-foreground">
                      {simRegistration.phone_number}
                    </span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  {simRegistration.consent_status === "PENDING" && (
                    <Badge className="text-xs bg-[#FEF3C7] text-[#D97706] border border-[#FCD34D] dark:bg-[#D97706]/15 dark:text-[#FBBF24] dark:border-[#D97706]/30">
                      <Hourglass className="w-3 h-3 mr-1" />
                      Waiting for Consent
                    </Badge>
                  )}
                  {simRegistration.lorryinfo_tracking_status ===
                    "COMPLETED" && (
                    <Badge className="text-xs bg-muted text-muted-foreground border border-border">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Tracking Complete
                    </Badge>
                  )}

                  <div className="text-xs text-muted-foreground mt-1">
                    Expires:{" "}
                    {simRegistration.expires_at &&
                      format(
                        new Date(simRegistration.expires_at),
                        "dd MMM yyyy"
                      )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {lastUpdated && (
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-1 text-sm text-muted-foreground">
                <Clock className="w-3 h-3" />
                Last updated: {lastUpdated.toLocaleTimeString()}
                {trackingMode === "FASTAG" && (
                  <>
                    {dataSource === "real" && (
                      <Badge className="ml-2 text-xs bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-[#059669]/15 dark:text-[#34D399] dark:border-[#059669]/30">
                        LIVE
                      </Badge>
                    )}
                    {dataSource === "cached" && (
                      <Badge
                        variant="secondary"
                        className="ml-2 text-xs bg-muted text-muted-foreground border border-border"
                      >
                        CACHED
                      </Badge>
                    )}
                  </>
                )}
                {trackingMode === "SIM" && (
                  <>
                    {simDataSource === "LIVE" ? (
                      <Badge className="ml-2 text-xs bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] dark:bg-[#059669]/15 dark:text-[#34D399] dark:border-[#059669]/30">
                        LIVE
                      </Badge>
                    ) : (
                      <Badge
                        variant="secondary"
                        className="ml-2 text-xs bg-muted text-muted-foreground border border-border"
                      >
                        MOCK
                      </Badge>
                    )}
                  </>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {trackingMode === "FASTAG"
                    ? `Monthly: ₹${monthlyCost}/₹4000`
                    : `Cost: ₹${simRegistration?.daily_cost || 10}/day`}
                </span>
              </div>
            </div>
          )}
        </CardHeader>
      </Card>

      {/* Refresh Suggestion (FASTag only) */}
      {trackingMode === "FASTAG" &&
        tollCrossings.length > 0 &&
        shouldRefreshData(tollCrossings[tollCrossings.length - 1]) && (
          <Alert className="border-primary/30 bg-primary/5 dark:bg-primary/10">
            <Info className="h-4 w-4 text-primary" />
            <AlertDescription className="text-foreground dark:text-white">
              Last crossing was{" "}
              {formatTimeAgo(
                tollCrossings[tollCrossings.length - 1].crossing_time
              )}
              . Consider refreshing for latest data.
            </AlertDescription>
          </Alert>
        )}

      {/* Live Map */}
      <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm overflow-hidden">
        <CardHeader className="border-b border-border dark:border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
              <MapPin className="w-5 h-5 text-primary" />
              Live Route Map (
              {trackingMode === "FASTAG"
                ? `${tollCrossings.length} crossings`
                : `${simLocations.length} locations`}
              )
            </CardTitle>
            {trackingMode === "FASTAG" && lastCrossing && (
              <Badge
                variant="outline"
                className="gap-1 border-border text-muted-foreground"
              >
                <Activity className="w-3 h-3" />
                Last: {formatTimeAgo(lastCrossing.crossing_time)}
              </Badge>
            )}
            {trackingMode === "SIM" && currentSimLocation && (
              <Badge
                variant="outline"
                className="gap-1 border-primary text-primary"
              >
                <Signal className="w-3 h-3" />
                {currentSimLocation.speed
                  ? `${currentSimLocation.speed} km/h`
                  : "Location"}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="relative h-[500px] w-full bg-muted dark:bg-secondary">
            {/* Toggle Buttons */}
            <div className="absolute top-4 right-4 z-[1000] bg-card/95 dark:bg-card/95 backdrop-blur-sm p-1 rounded-lg shadow-lg border border-border dark:border-border flex gap-1">
              <Button
                size="sm"
                variant={trackingMode === "FASTAG" ? "default" : "ghost"}
                className={cn(
                  "h-8 text-xs font-medium transition-all",
                  trackingMode === "FASTAG"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                onClick={() => setTrackingMode("FASTAG")}
              >
                <MapPin className="w-3 h-3 mr-1.5" />
                FASTag
              </Button>
              <Button
                size="sm"
                variant={trackingMode === "SIM" ? "default" : "ghost"}
                className={cn(
                  "h-8 text-xs font-medium transition-all",
                  trackingMode === "SIM"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                )}
                onClick={() => setTrackingMode("SIM")}
              >
                <Smartphone className="w-3 h-3 mr-1.5" />
                SIM Track
              </Button>
            </div>

            {/* FASTAG MAP */}
            {trackingMode === "FASTAG" && (
              <>
                <MapContainer
                  center={mapCenter}
                  zoom={mapZoom}
                  className="h-full w-full"
                  scrollWheelZoom={true}
                  key={`map-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}-fastag`}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  />

                  {(() => {
                    const locationGroups = groupCrossingsByLocation();
                    const plottedLocations = new Set();

                    return tollCrossings
                      .map((crossing, index) => {
                        const locationKey = `${crossing.latitude.toFixed(
                          4
                        )}-${crossing.longitude.toFixed(4)}`;

                        if (plottedLocations.has(locationKey)) {
                          return null;
                        }

                        plottedLocations.add(locationKey);
                        const crossingsAtLocation = locationGroups[locationKey];
                        const numbers = crossingsAtLocation.map(
                          (c) =>
                            tollCrossings.findIndex((tc) => tc.id === c.id) + 1
                        );

                        const hasLatestCrossing = numbers.includes(
                          tollCrossings.length
                        );

                        return (
                          <Marker
                            key={`cluster-${locationKey}`}
                            position={[crossing.latitude, crossing.longitude]}
                            icon={
                              crossingsAtLocation.length > 1
                                ? createClusterIcon(
                                    crossingsAtLocation.length,
                                    numbers,
                                    hasLatestCrossing
                                  )
                                : createNumberIcon(
                                    numbers[0],
                                    numbers[0] === tollCrossings.length
                                  )
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
                                    const globalIndex = tollCrossings.findIndex(
                                      (tc) => tc.id === c.id
                                    );
                                    return (
                                      <div
                                        key={i}
                                        className={`border-l-2 pl-2 py-1 ${
                                          globalIndex ===
                                          tollCrossings.length - 1
                                            ? "border-red-500 bg-red-50"
                                            : "border-primary"
                                        }`}
                                      >
                                        <div className="flex items-center justify-between">
                                          <p className="text-xs font-medium">
                                            Visit #{globalIndex + 1}
                                          </p>
                                          {globalIndex ===
                                            tollCrossings.length - 1 && (
                                            <Badge
                                              variant="destructive"
                                              className="text-xs"
                                            >
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
                              </div>
                            </Popup>
                          </Marker>
                        );
                      })
                      .filter(Boolean);
                  })()}

                  {tollCrossings.length > 1 && (
                    <>
                      <Polyline
                        positions={tollCrossings.map((c) => [
                          c.latitude,
                          c.longitude,
                        ])}
                        color="#3b82f6"
                        weight={4}
                        opacity={0.8}
                      />
                      <Polyline
                        positions={tollCrossings.map((c) => [
                          c.latitude,
                          c.longitude,
                        ])}
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
                      <p className="mt-2 text-sm font-medium text-foreground dark:text-white">
                        Fetching latest toll crossings...
                      </p>
                    </div>
                  </div>
                )}

                {!loading && tollCrossings.length === 0 && (
                  <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-[999]">
                    <div className="text-center p-6">
                      <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                        <AlertCircle className="w-8 h-8 text-muted-foreground" />
                      </div>
                      <h3 className="mt-4 text-lg font-semibold text-foreground dark:text-white">
                        No Tracking Data
                      </h3>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Click "Track Now" to get toll crossing information
                      </p>
                      <Button
                        onClick={loadTrackingData}
                        className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground"
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
            )}

            {/* SIM TRACKING MAP */}
            {trackingMode === "SIM" && (
              <>
                {!isSimRegistered ? (
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-muted to-background dark:from-secondary dark:to-background">
                    <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                      <Smartphone className="w-10 h-10 text-primary" />
                    </div>

                    <h3 className="text-2xl font-bold text-foreground dark:text-white mb-3">
                      SIM-Based Tracking
                    </h3>

                    {driverDetails ? (
                      <div className="space-y-4 max-w-md">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Enable real-time location tracking using driver's
                          mobile number
                        </p>

                        <div className="bg-card rounded-lg p-4 border border-border dark:border-border">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-muted-foreground">
                              Driver:
                            </span>
                            <span className="text-sm text-foreground dark:text-white">
                              {driverDetails.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-muted-foreground">
                              Phone:
                            </span>
                            <span className="text-sm text-foreground dark:text-white">
                              {driverDetails.phone}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => setShowRegisterDialog(true)}
                          className="bg-primary hover:bg-primary-hover text-primary-foreground"
                        >
                          <Smartphone className="w-4 h-4 mr-2" />
                          Enable SIM Tracking
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          No driver assigned to this booking
                        </p>
                        <Button variant="outline" disabled>
                          Assign Driver First
                        </Button>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-8">
                      <div className="p-4 bg-card rounded-xl border border-border dark:border-border shadow-sm flex flex-col items-center">
                        <div className="p-2 bg-[#ECFDF5] dark:bg-[#059669]/15 rounded-lg mb-2">
                          <Signal className="w-5 h-5 text-[#059669] dark:text-[#34D399]" />
                        </div>
                        <p className="text-xs font-semibold text-foreground dark:text-white">
                          Network Based
                        </p>
                      </div>
                      <div className="p-4 bg-card rounded-xl border border-border dark:border-border shadow-sm flex flex-col items-center">
                        <div className="p-2 bg-[#FEF3C7] dark:bg-[#D97706]/15 rounded-lg mb-2">
                          <Clock className="w-5 h-5 text-[#D97706] dark:text-[#FBBF24]" />
                        </div>
                        <p className="text-xs font-semibold text-foreground dark:text-white">
                          Manual Refresh
                        </p>
                      </div>
                      <div className="p-4 bg-card rounded-xl border border-border dark:border-border shadow-sm flex flex-col items-center">
                        <div className="p-2 bg-primary/10 rounded-lg mb-2">
                          <DollarSign className="w-5 h-5 text-primary" />
                        </div>
                        <p className="text-xs font-semibold text-foreground dark:text-white">
                          ₹10/day
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <MapContainer
                      center={mapCenter}
                      zoom={mapZoom}
                      className="h-full w-full"
                      scrollWheelZoom={true}
                      key={`map-${mapCenter[0]}-${mapCenter[1]}-${mapZoom}-sim`}
                    >
                      <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      />

                      {simLocations.map((location, index) => {
                        const isLatest = index === 0;

                        return (
                          <CircleMarker
                            key={location.id || `sim-${index}`}
                            center={[location.latitude, location.longitude]}
                            radius={isLatest ? 10 : 6}
                            fillColor={isLatest ? "#3b82f6" : "#60a5fa"}
                            color="white"
                            weight={2}
                            opacity={1}
                            fillOpacity={0.8}
                          >
                            <Popup>
                              <div className="p-2 min-w-[200px]">
                                <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
                                  <Smartphone className="w-4 h-4 text-primary" />
                                  {isLatest
                                    ? "Current Location"
                                    : `Location ${index + 1}`}
                                </h3>
                                {location.location_name && (
                                  <p className="text-xs mb-1">
                                    <strong>Area:</strong>{" "}
                                    {location.location_name}
                                  </p>
                                )}
                                {location.speed && (
                                  <p className="text-xs mb-1">
                                    <strong>Speed:</strong> {location.speed}{" "}
                                    km/h
                                  </p>
                                )}
                                <p className="text-xs text-muted-foreground">
                                  {location.time_ago ||
                                    formatTimeAgo(location.recorded_at)}
                                </p>
                              </div>
                            </Popup>
                          </CircleMarker>
                        );
                      })}

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

                    {simLoading && (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-[1000]">
                        <div className="text-center">
                          <Smartphone className="w-8 h-8 animate-pulse text-primary mx-auto" />
                          <p className="mt-2 text-sm font-medium text-foreground dark:text-white">
                            Fetching location...
                          </p>
                        </div>
                      </div>
                    )}

                    {!simLoading && simLocations.length === 0 && (
                      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-[999]">
                        <div className="text-center p-6">
                          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                            <Signal className="w-8 h-8 text-muted-foreground" />
                          </div>
                          <h3 className="mt-4 text-lg font-semibold text-foreground dark:text-white">
                            No Location Data Yet
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            {simRegistration?.consent_status === "PENDING"
                              ? "Waiting for driver consent. Driver must reply YES to SMS."
                              : 'Click "Refresh Location" to get current position'}
                          </p>
                          <Button
                            onClick={fetchSimLocation}
                            className="mt-4 bg-primary hover:bg-primary-hover text-primary-foreground"
                            size="sm"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Refresh Location
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {trackingMode === "FASTAG" ? (
          <>
            <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Crossings
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {tollCrossings.length}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <MapPin className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Journey Time
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {tollCrossings.length > 1
                        ? Math.round(
                            (Date.now() -
                              new Date(
                                tollCrossings[0].crossing_time
                              ).getTime()) /
                              (1000 * 60 * 60)
                          )
                        : 0}
                      h
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Clock className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      API Cost Today
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      ₹{totalApiCost}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Updates
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {simLocations.length}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Signal className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Speed
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {currentSimLocation?.speed || 0} km/h
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <Navigation className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Cost</p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      ₹{simRegistration?.daily_cost || 10}
                    </p>
                  </div>
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <DollarSign className="w-6 h-6 text-primary" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Timeline */}
      <Card className="bg-card border border-border dark:border-border rounded-xl shadow-sm">
        <CardHeader className="border-b border-border dark:border-border">
          <CardTitle className="text-lg text-foreground dark:text-white">
            {trackingMode === "FASTAG"
              ? "Journey Timeline"
              : "Location History"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {trackingMode === "FASTAG" ? (
            tollCrossings.length > 0 ? (
              <div className="space-y-0 max-h-[400px] overflow-y-auto">
                {tollCrossings.map((crossing, index) => (
                  <div key={`timeline-${index}`} className="flex gap-4 group">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                          index === tollCrossings.length - 1
                            ? "bg-primary text-primary-foreground shadow-lg scale-110"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/20"
                        )}
                      >
                        {index + 1}
                      </div>
                      {index < tollCrossings.length - 1 && (
                        <div className="w-0.5 h-16 bg-border mt-2"></div>
                      )}
                    </div>

                    <div className="flex-1 pb-6 pt-1">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground dark:text-white">
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
                            Vehicle Type: {crossing.vehicle_type || "N/A"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                  <AlertCircle className="w-8 h-8 text-muted-foreground" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground dark:text-white">
                  No Journey Data
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Start tracking to see journey timeline
                </p>
              </div>
            )
          ) : simLocations.length > 0 ? (
            <div className="space-y-0 max-h-[400px] overflow-y-auto">
              {simLocations.map((location, index) => (
                <div key={`sim-timeline-${index}`} className="flex gap-4 group">
                  <div className="relative flex flex-col items-center">
                    <div
                      className={cn(
                        "w-8 h-8 rounded-full flex items-center justify-center transition-all",
                        index === 0
                          ? "bg-primary shadow-lg scale-110"
                          : "bg-primary/10 group-hover:bg-primary/20"
                      )}
                    >
                      <Wifi
                        className={cn(
                          "w-4 h-4",
                          index === 0
                            ? "text-primary-foreground"
                            : "text-primary"
                        )}
                      />
                    </div>
                    {index < simLocations.length - 1 && (
                      <div className="w-0.5 h-16 bg-primary/20 mt-2"></div>
                    )}
                  </div>

                  <div className="flex-1 pb-6 pt-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2 text-foreground dark:text-white">
                          {location.location_name || "Location Update"}
                          {index === 0 && (
                            <Badge className="text-xs bg-primary text-primary-foreground">
                              Latest
                            </Badge>
                          )}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {formatTime(location.recorded_at)}
                        </p>
                        {location.speed && (
                          <p className="text-xs text-muted-foreground">
                            Speed: {location.speed} km/h
                          </p>
                        )}
                        <p className="text-xs text-primary mt-1">
                          {location.time_ago ||
                            formatTimeAgo(location.recorded_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto">
                <Signal className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground dark:text-white">
                No Location History
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isSimRegistered
                  ? 'Click "Refresh Location" to get updates'
                  : "Enable SIM tracking to see location history"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* SIM Registration Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="bg-card border-border dark:border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground dark:text-white">
              One-Time SIM Tracking
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Get current location instantly using driver's network.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Driver:
                </span>
                <span className="text-sm font-medium text-foreground dark:text-white">
                  {driverDetails?.name}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Phone:
                </span>
                <span className="text-sm font-medium text-foreground dark:text-white">
                  {driverDetails?.phone}
                </span>
              </div>
            </div>
            <div className="bg-[#ECFDF5] dark:bg-[#059669]/10 p-4 rounded-lg border border-[#A7F3D0] dark:border-[#059669]/30 flex justify-between items-center">
              <span className="text-[#065F46] dark:text-[#34D399] font-medium">
                Cost per Request
              </span>
              <span className="font-bold text-lg text-[#059669] dark:text-[#34D399]">
                ₹1.00
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              * SMS will be sent to driver for consent. Once approved, location
              is fetched.
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegisterDialog(false)}
              className="border-border hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSimRegistration}
              disabled={registeringSimTracking}
              className="bg-primary hover:bg-primary-hover text-primary-foreground"
            >
              {registeringSimTracking ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <CheckCircle className="w-4 h-4 mr-2" />
              )}
              Get Location (₹1)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
