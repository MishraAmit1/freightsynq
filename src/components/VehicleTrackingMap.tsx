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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
} from "lucide-react";
import { trackVehicle, TollCrossing } from "@/api/tracking";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { format } from "date-fns";

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
  const [simTrackingDays, setSimTrackingDays] = useState(1);

  // 🆕 Page visibility state
  const [isPageVisible, setIsPageVisible] = useState(!document.hidden);

  // 🆕 Initial load flag to prevent duplicate calls
  const [initialLoadDone, setInitialLoadDone] = useState(false);

  // ═══════════════════════════════════════════════════════════
  // 🆕 PAGE VISIBILITY HANDLER
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsPageVisible(!document.hidden);

      if (!document.hidden) {
        console.log("📱 Page became visible");
        // Optionally refresh data when page becomes visible
        // But we won't auto-fetch to save API calls
      } else {
        console.log("📱 Page hidden");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // ═══════════════════════════════════════════════════════════
  // 🆕 COMBINED INITIAL DATA LOAD (Single Effect)
  // ═══════════════════════════════════════════════════════════

  useEffect(() => {
    if (!bookingId || initialLoadDone) return;

    const loadInitialData = async () => {
      console.log("📊 Loading initial data for booking:", bookingId);

      try {
        // 1. Check tracking status
        await checkTrackingStatus();

        // 2. Load monthly usage & cost in parallel
        await Promise.all([loadMonthlyUsage(), loadMonthlyCost()]);

        // 3. Load mode-specific data
        if (trackingMode === "FASTAG") {
          await loadCachedData();
        }

        setInitialLoadDone(true);
        console.log("✅ Initial data loaded");
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
      // Load cached FASTag data if switching back
      if (tollCrossings.length === 0) {
        loadCachedData();
      }
    }
  }, [trackingMode, initialLoadDone]);

  // ═══════════════════════════════════════════════════════════
  // MAP AUTO-ADJUST EFFECTS
  // ═══════════════════════════════════════════════════════════

  // Auto-adjust for SIM locations
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

  // Auto-adjust for FASTag
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

  // ═══════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
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
    []
  );
  // ═══════════════════════════════════════════════════════════
  // SIM TRACKING FUNCTIONS - FIXED
  // ═══════════════════════════════════════════════════════════

  const checkSimRegistrationStatus = async () => {
    try {
      console.log("📱 Checking SIM registration status...");

      // Fetch registration status, driver details, AND location history in parallel
      const [regResult, driverResult, locationResult] = await Promise.all([
        supabase.rpc("check_sim_tracking_status", { p_booking_id: bookingId }),
        supabase
          .from("vehicle_assignments")
          .select(
            `
                    id,
                    drivers!inner(id, name, phone)
                `
          )
          .eq("booking_id", bookingId)
          .eq("status", "ACTIVE")
          .single(),
        // 🆕 Also fetch location history directly here
        supabase
          .from("sim_tracking_locations")
          .select("*")
          .eq("booking_id", bookingId)
          .order("recorded_at", { ascending: false })
          .limit(50),
      ]);

      // Handle registration
      if (regResult.data) {
        setSimRegistration(regResult.data);
        setIsSimRegistered(regResult.data?.registered || false);
        console.log(
          "✅ SIM registration:",
          regResult.data?.registered ? "Active" : "Not registered"
        );
      }

      // Handle driver details
      if (driverResult.data?.drivers) {
        setDriverDetails(driverResult.data.drivers);
        console.log("📞 Driver:", driverResult.data.drivers.name);
      }

      // 🆕 Handle location history - load even if registration check
      if (locationResult.data && locationResult.data.length > 0) {
        console.log(
          `📍 Found ${locationResult.data.length} cached SIM locations`
        );
        setSimLocations(locationResult.data);
        setCurrentSimLocation(locationResult.data[0]); // Latest is first
        setLastUpdated(new Date(locationResult.data[0].recorded_at));
      } else {
        console.log("⚠️ No SIM locations in database for this booking");
      }
    } catch (error) {
      console.error("Error in checkSimRegistrationStatus:", error);
    }
  };

  // This function is now backup - main loading happens in checkSimRegistrationStatus
  const loadSimLocationHistory = async () => {
    try {
      console.log("📍 Loading SIM location history from DB...");

      const { data, error } = await supabase
        .from("sim_tracking_locations")
        .select("*")
        .eq("booking_id", bookingId)
        .order("recorded_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error loading SIM history:", error);
        return;
      }

      console.log("📊 SIM locations found:", data?.length || 0);

      if (data && data.length > 0) {
        setSimLocations(data);
        setCurrentSimLocation(data[0]);
        setLastUpdated(new Date(data[0].recorded_at));
        console.log(`✅ Loaded ${data.length} cached SIM locations`);
      }
    } catch (error) {
      console.error("Error in loadSimLocationHistory:", error);
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

      console.log("📱 Registering SIM tracking...");

      const { data, error } = await supabase.functions.invoke(
        "register-sim-tracking",
        {
          body: {
            bookingId,
            phoneNumber: driverDetails.phone,
            driverName: driverDetails.name,
            trackingDays: simTrackingDays,
          },
        }
      );

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "✅ SIM Tracking Enabled",
          description: data.data?.reusedExisting
            ? `Using existing registration for ${driverDetails.name}`
            : `Tracking enabled for ${driverDetails.name} for ${simTrackingDays} day(s)`,
        });

        setShowRegisterDialog(false);
        await checkSimRegistrationStatus();
      } else {
        throw new Error(data?.error || "Registration failed");
      }
    } catch (error: any) {
      console.error("Registration error:", error);
      toast({
        title: "❌ Registration Failed",
        description: error.message || "Failed to enable SIM tracking",
        variant: "destructive",
      });
    } finally {
      setRegisteringSimTracking(false);
    }
  };

  // 🆕 Manual fetch only (no auto-refresh)
  const fetchSimLocation = async () => {
    if (!isSimRegistered || !simRegistration?.phone_number) {
      toast({
        title: "⚠️ Not Registered",
        description: "Please enable SIM tracking first",
        variant: "destructive",
      });
      return;
    }

    // Check page visibility
    if (document.hidden) {
      console.log("⏸️ Page hidden, skipping fetch");
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
        if (data.current) {
          setCurrentSimLocation(data.current);
        }

        if (data.history && data.history.length > 0) {
          setSimLocations(data.history);
        }

        setLastUpdated(new Date());

        toast({
          title:
            data.source === "MOCK" ? "🔧 Mock Location" : "📍 Location Updated",
          description:
            data.current?.location_name || "Location fetched successfully",
        });
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
          variant: "default",
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

      const day = date.getDate();
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

      return `${day} ${month} ${year}, ${hours}:${minutes} ${ampm}`;
    } catch (error) {
      return dateString;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    try {
      if (!dateString) return "Unknown";

      let crossingTime: number;

      if (dateString.includes(" ")) {
        const [datePart, timePart] = dateString.split(" ");
        const [year, month, day] = datePart.split("-").map(Number);
        const [hour, minute, second] = timePart.split(":").map(Number);
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

      if (isNaN(crossingTime)) return "Invalid date";

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
        return "Just now";
      }
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
        className={`border-primary/20 ${
          !isTrackingEnabled ? "opacity-75" : ""
        }`}
      >
        <CardHeader className="pb-3 bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              {isTrackingEnabled ? (
                trackingMode === "FASTAG" ? (
                  <Navigation className="w-5 h-5 text-primary animate-pulse" />
                ) : (
                  <Smartphone className="w-5 h-5 text-blue-600 animate-pulse" />
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
                <Badge variant="secondary" className="gap-1">
                  <Truck className="w-3 h-3" />
                  {vehicleNumber}
                </Badge>
              )}

              {/* 🆕 Page visibility indicator */}
              {!isPageVisible && (
                <Badge
                  variant="outline"
                  className="gap-1 text-orange-600 border-orange-600"
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
                        variant="outline"
                        className="gap-1 border-green-600 text-green-600"
                      >
                        <CheckCircle className="w-3 h-3" />
                        Active
                      </Badge>
                      <Button
                        onClick={fetchSimLocation}
                        disabled={simLoading || !isTrackingEnabled}
                        size="sm"
                        variant="default"
                      >
                        <RefreshCw
                          className={`w-4 h-4 mr-2 ${
                            simLoading ? "animate-spin" : ""
                          }`}
                        />
                        Refresh Location
                      </Button>
                    </>
                  ) : (
                    <Button
                      onClick={() => setShowRegisterDialog(true)}
                      disabled={!isTrackingEnabled || !driverDetails}
                      size="sm"
                      variant="default"
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Smartphone className="w-4 h-4 mr-2" />
                      Enable SIM Tracking (₹10/day)
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {!isTrackingEnabled && trackingEndReason && (
            <Alert className="mt-2 border-warning/50 bg-warning/10">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{trackingEndReason}</AlertDescription>
            </Alert>
          )}

          {/* SIM Registration Info */}
          {trackingMode === "SIM" && isSimRegistered && simRegistration && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-sm">
                      {simRegistration.driver_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneCall className="w-4 h-4 text-blue-600" />
                    <span className="text-sm">
                      {simRegistration.phone_number}
                    </span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <Badge variant="secondary" className="text-xs">
                    {simRegistration.days_remaining} days left
                  </Badge>
                  <div className="text-xs text-muted-foreground">
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
                      <Badge variant="default" className="ml-2 text-xs">
                        LIVE
                      </Badge>
                    )}
                    {dataSource === "cached" && (
                      <Badge variant="secondary" className="ml-2 text-xs">
                        CACHED
                      </Badge>
                    )}
                  </>
                )}
                {trackingMode === "SIM" && (
                  <Badge
                    variant="outline"
                    className="ml-2 text-xs border-blue-600 text-blue-600"
                  >
                    <Wifi className="w-3 h-3 mr-1" />
                    Manual
                  </Badge>
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
          <Alert className="border-info/50 bg-info/5">
            <Info className="h-4 w-4" />
            <AlertDescription>
              Last crossing was{" "}
              {formatTimeAgo(
                tollCrossings[tollCrossings.length - 1].crossing_time
              )}
              . Consider refreshing for latest data.
            </AlertDescription>
          </Alert>
        )}

      {/* Live Map */}
      <Card className="border-border overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Live Route Map (
              {trackingMode === "FASTAG"
                ? `${tollCrossings.length} crossings`
                : `${simLocations.length} locations`}
              )
            </CardTitle>
            {trackingMode === "FASTAG" && lastCrossing && (
              <Badge variant="outline" className="gap-1">
                <Activity className="w-3 h-3" />
                Last: {formatTimeAgo(lastCrossing.crossing_time)}
              </Badge>
            )}
            {trackingMode === "SIM" && currentSimLocation && (
              <Badge
                variant="outline"
                className="gap-1 border-blue-600 text-blue-600"
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
          <div className="relative h-[500px] w-full bg-gray-100 dark:bg-gray-900/50">
            {/* Toggle Buttons */}
            <div className="absolute top-4 right-4 z-[1000] bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm p-1 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 flex gap-1">
              <Button
                size="sm"
                variant={trackingMode === "FASTAG" ? "default" : "ghost"}
                className={`h-7 text-xs font-medium transition-all ${
                  trackingMode === "FASTAG"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => setTrackingMode("FASTAG")}
              >
                <MapPin className="w-3 h-3 mr-1.5" />
                FASTag
              </Button>
              <Button
                size="sm"
                variant={trackingMode === "SIM" ? "default" : "ghost"}
                className={`h-7 text-xs font-medium transition-all ${
                  trackingMode === "SIM"
                    ? "bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
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

                  {/* Plot FASTag markers */}
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
                                            ? "border-red-500 bg-red-50 dark:bg-red-950/20"
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

                  {/* Draw route line */}
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
                      <p className="mt-2 text-sm font-medium">
                        Fetching latest toll crossings...
                      </p>
                    </div>
                  </div>
                )}

                {!loading && tollCrossings.length === 0 && (
                  <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-[999]">
                    <div className="text-center p-6">
                      <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto" />
                      <h3 className="mt-4 text-lg font-semibold">
                        No Tracking Data
                      </h3>
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
            )}

            {/* SIM TRACKING MAP */}
            {trackingMode === "SIM" && (
              <>
                {!isSimRegistered ? (
                  // Not Registered UI
                  <div className="h-full w-full flex flex-col items-center justify-center text-center p-8 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-950">
                    <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mb-6">
                      <Smartphone className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                    </div>

                    <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                      SIM-Based Tracking
                    </h3>

                    {driverDetails ? (
                      <div className="space-y-4 max-w-md">
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          Enable real-time location tracking using driver's
                          mobile number
                        </p>

                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Driver:</span>
                            <span className="text-sm">
                              {driverDetails.name}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Phone:</span>
                            <span className="text-sm">
                              {driverDetails.phone}
                            </span>
                          </div>
                        </div>

                        <Button
                          onClick={() => setShowRegisterDialog(true)}
                          className="bg-blue-600 hover:bg-blue-700"
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
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                        <div className="p-2 bg-green-50 rounded-lg mb-2">
                          <Signal className="w-5 h-5 text-green-600" />
                        </div>
                        <p className="text-xs font-semibold">Network Based</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                        <div className="p-2 bg-orange-50 rounded-lg mb-2">
                          <Clock className="w-5 h-5 text-orange-600" />
                        </div>
                        <p className="text-xs font-semibold">Manual Refresh</p>
                      </div>
                      <div className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center">
                        <div className="p-2 bg-blue-50 rounded-lg mb-2">
                          <DollarSign className="w-5 h-5 text-blue-600" />
                        </div>
                        <p className="text-xs font-semibold">₹10/day</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  // Registered - Show Map
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

                      {/* Plot SIM locations */}
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
                                  <Smartphone className="w-4 h-4 text-blue-600" />
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

                      {/* Draw path line */}
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
                          <Smartphone className="w-8 h-8 animate-pulse text-blue-600 mx-auto" />
                          <p className="mt-2 text-sm font-medium">
                            Fetching location...
                          </p>
                        </div>
                      </div>
                    )}

                    {!simLoading && simLocations.length === 0 && (
                      <div className="absolute inset-0 bg-background/90 backdrop-blur-sm flex items-center justify-center z-[999]">
                        <div className="text-center p-6">
                          <Signal className="w-12 h-12 text-muted-foreground mx-auto" />
                          <h3 className="mt-4 text-lg font-semibold">
                            No Location Data Yet
                          </h3>
                          <p className="mt-2 text-sm text-muted-foreground">
                            Click "Refresh Location" to get current position
                          </p>
                          <Button
                            onClick={fetchSimLocation}
                            className="mt-4"
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
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Crossings
                    </p>
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
                    <p className="text-sm text-muted-foreground">
                      Journey Time
                    </p>
                    <p className="text-2xl font-bold">
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
                  <Clock className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      API Cost Today
                    </p>
                    <p className="text-2xl font-bold">₹{totalApiCost}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-primary/20" />
                </div>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Total Updates
                    </p>
                    <p className="text-2xl font-bold">{simLocations.length}</p>
                  </div>
                  <Signal className="w-8 h-8 text-blue-600/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Current Speed
                    </p>
                    <p className="text-2xl font-bold">
                      {currentSimLocation?.speed || 0} km/h
                    </p>
                  </div>
                  <Navigation className="w-8 h-8 text-blue-600/20" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Daily Cost</p>
                    <p className="text-2xl font-bold">
                      ₹{simRegistration?.daily_cost || 10}
                    </p>
                  </div>
                  <DollarSign className="w-8 h-8 text-blue-600/20" />
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Timeline */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">
            {trackingMode === "FASTAG"
              ? "Journey Timeline"
              : "Location History"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trackingMode === "FASTAG" ? (
            tollCrossings.length > 0 ? (
              <div className="space-y-0 max-h-[400px] overflow-y-auto">
                {tollCrossings.map((crossing, index) => (
                  <div key={`timeline-${index}`} className="flex gap-4 group">
                    <div className="relative flex flex-col items-center">
                      <div
                        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all ${
                          index === tollCrossings.length - 1
                            ? "bg-primary text-primary-foreground shadow-lg scale-110"
                            : "bg-muted text-muted-foreground group-hover:bg-primary/20"
                        }`}
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
                <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto" />
                <h3 className="mt-4 text-lg font-semibold">No Journey Data</h3>
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
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                        index === 0
                          ? "bg-blue-600 shadow-lg scale-110"
                          : "bg-blue-100 dark:bg-blue-900/30 group-hover:bg-blue-200"
                      }`}
                    >
                      <Wifi
                        className={`w-4 h-4 ${
                          index === 0 ? "text-white" : "text-blue-600"
                        }`}
                      />
                    </div>
                    {index < simLocations.length - 1 && (
                      <div className="w-0.5 h-16 bg-blue-200 dark:bg-blue-800 mt-2"></div>
                    )}
                  </div>

                  <div className="flex-1 pb-6 pt-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm flex items-center gap-2">
                          {location.location_name || "Location Update"}
                          {index === 0 && (
                            <Badge
                              variant="default"
                              className="text-xs bg-blue-600"
                            >
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
                        <p className="text-xs text-blue-600 mt-1">
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
              <Signal className="w-8 h-8 text-muted-foreground mx-auto" />
              <h3 className="mt-4 text-lg font-semibold">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-blue-600" />
              Enable SIM-Based Tracking
            </DialogTitle>
            <DialogDescription>
              Track vehicle location using driver's mobile network
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Driver Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Name:</span>
                  <span className="font-medium">{driverDetails?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phone:</span>
                  <span className="font-medium">{driverDetails?.phone}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Tracking Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[1, 3, 7].map((days) => (
                  <Button
                    key={days}
                    variant={simTrackingDays === days ? "default" : "outline"}
                    onClick={() => setSimTrackingDays(days)}
                    className="w-full"
                  >
                    {days} Day{days > 1 ? "s" : ""}
                  </Button>
                ))}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900/20 p-4 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm">Total Cost:</span>
                <span className="text-lg font-bold">
                  ₹{simTrackingDays * 10}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ₹10 per day • Manual refresh
              </p>
            </div>

            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>How it works</AlertTitle>
              <AlertDescription className="text-xs">
                We'll track the vehicle using mobile network triangulation.
                Click "Refresh Location" to get the latest position.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowRegisterDialog(false)}
              disabled={registeringSimTracking}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSimRegistration}
              disabled={registeringSimTracking}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {registeringSimTracking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enabling...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Enable Tracking (₹{simTrackingDays * 10})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
