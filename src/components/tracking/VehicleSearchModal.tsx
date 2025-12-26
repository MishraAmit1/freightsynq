// =============================================
// VEHICLE SEARCH MODAL - FASTAG + SIM SUPPORT
// =============================================

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Search,
  Loader2,
  Truck,
  Smartphone,
  Phone,
  User,
  MapPin,
  TrendingUp,
  Clock,
  Info,
  CheckCircle,
  IndianRupee,
} from "lucide-react";
import { fetchVehicleTollHistory } from "@/api/fleet";
import {
  saveRandomSearch,
  saveSimSearch,
  registerSimTracking,
  fetchSimLocation,
  TollCrossing,
  checkExistingSimRegistration,
} from "@/api/randomSearch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";

// =============================================
// INTERFACES
// =============================================

interface VehicleSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSearchComplete: (searchId: string) => void;
}

type TrackingMode = "FASTAG" | "SIM";
type SearchType = "live" | "journey";

// =============================================
// COMPONENT
// =============================================

export const VehicleSearchModal: React.FC<VehicleSearchModalProps> = ({
  isOpen,
  onClose,
  onSearchComplete,
}) => {
  const { toast } = useToast();

  // ═══════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════

  // Mode Selection
  const [trackingMode, setTrackingMode] = useState<TrackingMode>("FASTAG");

  // FASTag fields (existing)
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [searchType, setSearchType] = useState<SearchType>("live");
  const [fromLocation, setFromLocation] = useState("");
  const [toLocation, setToLocation] = useState("");
  const [daysRange, setDaysRange] = useState(1);

  // SIM fields (new)
  const [phoneNumber, setPhoneNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [simVehicleNumber, setSimVehicleNumber] = useState(""); // Optional reference

  // Loading & Step states
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"input" | "processing" | "consent">("input");

  // ═══════════════════════════════════════════════════════════
  // HELPER FUNCTIONS
  // ═══════════════════════════════════════════════════════════

  const filterJourneyData = (
    data: any[],
    from: string,
    to: string,
    days: number
  ): TollCrossing[] => {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    return data
      .filter((c) => {
        const crossingDate = new Date(c.crossing_time);
        const inTimeRange = crossingDate >= cutoffDate;
        return inTimeRange;
      })
      .sort(
        (a, b) =>
          new Date(a.crossing_time).getTime() -
          new Date(b.crossing_time).getTime()
      )
      .map((c) => ({
        toll_plaza_name: c.toll_plaza_name,
        latitude: c.latitude,
        longitude: c.longitude,
        crossing_time: c.crossing_time,
        vehicle_type: c.vehicle_type,
      }));
  };

  const handleClose = () => {
    setVehicleNumber("");
    setSearchType("live");
    setFromLocation("");
    setToLocation("");
    setDaysRange(1);
    setPhoneNumber("");
    setDriverName("");
    setSimVehicleNumber("");
    setStep("input");
    setLoading(false);
    onClose();
  };

  // ═══════════════════════════════════════════════════════════
  // FASTAG SEARCH (existing logic)
  // ═══════════════════════════════════════════════════════════

  const handleFastagSearch = async () => {
    if (!vehicleNumber.trim()) return;

    if (searchType === "journey") {
      if (!fromLocation.trim() || !toLocation.trim()) {
        toast({
          title: "⚠️ Missing Information",
          description: "Please enter FROM and TO locations",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);
      setStep("processing");
      toast({
        title: "🔍 Searching...",
        description: `Looking for ${vehicleNumber}`,
      });

      let tollCrossings: TollCrossing[] = [];

      if (searchType === "live") {
        const dbHistory = await fetchVehicleTollHistory(
          vehicleNumber.trim(),
          "current"
        );

        if (dbHistory.length > 0) {
          tollCrossings = dbHistory.map((c) => ({
            toll_plaza_name: c.toll_plaza_name,
            latitude: c.latitude,
            longitude: c.longitude,
            crossing_time: c.crossing_time,
            vehicle_type: c.vehicle_type,
          }));
        } else {
          const { data, error } = await supabase.functions.invoke(
            "track-fastag",
            {
              body: { vehicleNumber: vehicleNumber.trim() },
            }
          );

          if (error || !data.success || !data.data || data.data.length === 0) {
            throw new Error("No data found for this vehicle");
          }

          const latest = data.data[0];
          const [lat, lng] = latest.tollPlazaGeocode.split(",").map(Number);

          tollCrossings = [
            {
              toll_plaza_name: latest.tollPlazaName,
              latitude: lat,
              longitude: lng,
              crossing_time: latest.readerReadTime,
              vehicle_type: latest.vehicleType,
            },
          ];
        }

        const searchId = await saveRandomSearch({
          vehicleNumber: vehicleNumber.trim(),
          searchType: "live",
          tollCrossings,
        });

        toast({
          title: "✅ Live Location Found",
          description: `${tollCrossings[0].toll_plaza_name}`,
        });

        onSearchComplete(searchId);
        handleClose();
      } else {
        let dbHistory = await fetchVehicleTollHistory(
          vehicleNumber.trim(),
          "1week"
        );

        if (dbHistory.length > 0) {
          tollCrossings = filterJourneyData(
            dbHistory,
            fromLocation,
            toLocation,
            daysRange
          );
        }

        if (tollCrossings.length === 0) {
          const { data, error } = await supabase.functions.invoke(
            "track-fastag",
            {
              body: { vehicleNumber: vehicleNumber.trim() },
            }
          );

          if (error || !data.success || !data.data || data.data.length === 0) {
            throw new Error("No journey data found");
          }

          const apiCrossings = data.data.map((c: any) => {
            const [lat, lng] = c.tollPlazaGeocode.split(",").map(Number);
            return {
              toll_plaza_name: c.tollPlazaName,
              latitude: lat,
              longitude: lng,
              crossing_time: c.readerReadTime,
              vehicle_type: c.vehicleType,
            };
          });

          tollCrossings = filterJourneyData(
            apiCrossings,
            fromLocation,
            toLocation,
            daysRange
          );
        }

        if (tollCrossings.length === 0) {
          throw new Error(
            "No matching journey found for selected route and period"
          );
        }

        const searchId = await saveRandomSearch({
          vehicleNumber: vehicleNumber.trim(),
          searchType: "journey",
          fromLocation: fromLocation.trim(),
          toLocation: toLocation.trim(),
          daysRange,
          tollCrossings,
        });

        toast({
          title: "✅ Journey Found",
          description: `${tollCrossings.length} toll crossings`,
        });

        onSearchComplete(searchId);
        handleClose();
      }
    } catch (error: any) {
      console.error("FASTag search failed:", error);
      toast({
        title: "❌ Search Failed",
        description: error.message,
        variant: "destructive",
      });
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // SIM SEARCH (new)
  // ═══════════════════════════════════════════════════════════

  // In handleSimSearch function, REPLACE the Step 2 location fetch part:

  const handleSimSearch = async () => {
    const cleanPhone = phoneNumber.replace(/[\s\-\+]/g, "");

    if (!/^\d{10}$/.test(cleanPhone)) {
      toast({
        title: "❌ Invalid Phone Number",
        description: "Please enter a valid 10-digit phone number",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      setStep("processing");

      // ═══════════════════════════════════════════════════════════
      // 🆕 STEP 0: CHECK IF ALREADY REGISTERED (Before API call)
      // ═══════════════════════════════════════════════════════════

      toast({
        title: "🔍 Checking...",
        description: "Looking for existing registration",
      });

      // Check if this phone already has a pending/active registration
      const existingCheck = await checkExistingSimRegistration(cleanPhone);

      if (existingCheck.exists) {
        console.log("📱 Found existing registration:", existingCheck);

        if (existingCheck.consentPending) {
          // Already pending - DON'T call API again!
          setStep("consent");
          toast({
            title: "⏳ Already Pending",
            description:
              "Consent request already sent. Waiting for driver reply.",
          });

          // Save to search history (if not already there)
          const searchId = await saveSimSearch({
            phoneNumber: cleanPhone,
            driverName: driverName || undefined,
            vehicleNumber: simVehicleNumber || undefined,
            location: {
              latitude: 0,
              longitude: 0,
              location_name: "Waiting for consent...",
              recorded_at: new Date().toISOString(),
            },
          });

          setTimeout(() => {
            handleClose();
            onSearchComplete(searchId);
          }, 1500);
          return;
        }

        if (existingCheck.consentApproved && existingCheck.contactId) {
          // Consent approved - Fetch location directly!
          toast({
            title: "✅ Consent Approved!",
            description: "Fetching location...",
          });

          const locResult = await fetchSimLocation({
            phoneNumber: cleanPhone,
            isRandomSearch: true,
            lorryinfoContactId: existingCheck.contactId,
          });

          if (locResult.success && locResult.location) {
            const searchId = await saveSimSearch({
              phoneNumber: cleanPhone,
              driverName: driverName || existingCheck.driverName,
              vehicleNumber: simVehicleNumber || undefined,
              location: locResult.location,
            });

            toast({
              title: "📍 Location Found!",
              description:
                locResult.location.location_name || "Location fetched",
            });

            handleClose();
            onSearchComplete(searchId);
            return;
          }
        }
      }

      // ═══════════════════════════════════════════════════════════
      // STEP 1: NO EXISTING REGISTRATION - Call API
      // ═══════════════════════════════════════════════════════════

      toast({
        title: "📱 Registering...",
        description: "Sending tracking request to driver",
      });

      const regResult = await registerSimTracking({
        phoneNumber: cleanPhone,
        driverName: driverName || undefined,
      });

      if (!regResult.success) {
        throw new Error(regResult.error || "Registration failed");
      }

      console.log("✅ Registration result:", regResult);

      // Check if consent is pending
      if (!regResult.contactId) {
        setStep("consent");
        toast({
          title: "⏳ Consent Pending",
          description: "Driver must reply YES to the SMS",
        });

        const searchId = await saveSimSearch({
          phoneNumber: cleanPhone,
          driverName: driverName || undefined,
          vehicleNumber: simVehicleNumber || undefined,
          location: {
            latitude: 0,
            longitude: 0,
            location_name: "Waiting for consent...",
            recorded_at: new Date().toISOString(),
          },
        });

        setTimeout(() => {
          handleClose();
          onSearchComplete(searchId);
        }, 2000);

        return;
      }

      // Step 2: If we have contact ID, try to fetch location
      toast({
        title: "✅ Request Sent!",
        description: "Fetching location...",
      });

      const locResult = await fetchSimLocation({
        phoneNumber: cleanPhone,
        isRandomSearch: true,
        lorryinfoContactId: regResult.contactId,
      });

      if (locResult.consentPending) {
        setStep("consent");
        toast({
          title: "⏳ Consent Pending",
          description: "Driver must reply YES to the SMS",
        });

        const searchId = await saveSimSearch({
          phoneNumber: cleanPhone,
          driverName: driverName || undefined,
          vehicleNumber: simVehicleNumber || undefined,
          location: {
            latitude: 0,
            longitude: 0,
            location_name: "Waiting for consent...",
            recorded_at: new Date().toISOString(),
          },
        });

        setTimeout(() => {
          handleClose();
          onSearchComplete(searchId);
        }, 2000);

        return;
      }

      if (!locResult.success || !locResult.location) {
        throw new Error(locResult.error || "Failed to get location");
      }

      const searchId = await saveSimSearch({
        phoneNumber: cleanPhone,
        driverName: driverName || undefined,
        vehicleNumber: simVehicleNumber || undefined,
        location: locResult.location,
      });

      toast({
        title: "📍 Location Found!",
        description:
          locResult.location.location_name || "Location fetched successfully",
      });

      handleClose();
      onSearchComplete(searchId);
    } catch (error: any) {
      console.error("SIM search error:", error);
      toast({
        title: "❌ Search Failed",
        description: error.message || "Failed to track via SIM",
        variant: "destructive",
      });
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLE SUBMIT
  // ═══════════════════════════════════════════════════════════

  const handleSearch = () => {
    if (trackingMode === "FASTAG") {
      handleFastagSearch();
    } else {
      handleSimSearch();
    }
  };

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] bg-card border-border z-[1000]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="w-5 h-5 text-primary" />
            Search Vehicle
          </DialogTitle>
        </DialogHeader>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* TRACKING MODE TOGGLE */}
        {/* ═══════════════════════════════════════════════════════════ */}

        <div className="grid grid-cols-2 gap-2 p-1 bg-muted dark:bg-secondary rounded-lg">
          <button
            type="button"
            onClick={() => setTrackingMode("FASTAG")}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all",
              trackingMode === "FASTAG"
                ? "bg-background dark:bg-card text-foreground dark:text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground dark:hover:text-white"
            )}
          >
            <Truck className="w-4 h-4" />
            FASTag
            <Badge
              variant="secondary"
              className="ml-1 text-xs bg-primary/10 text-primary"
            >
              ₹4
            </Badge>
          </button>

          <button
            type="button"
            onClick={() => setTrackingMode("SIM")}
            disabled={loading}
            className={cn(
              "flex items-center justify-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all",
              trackingMode === "SIM"
                ? "bg-background dark:bg-card text-foreground dark:text-white shadow-sm"
                : "text-muted-foreground hover:text-foreground dark:hover:text-white"
            )}
          >
            <Smartphone className="w-4 h-4" />
            SIM Track
            <Badge
              variant="secondary"
              className="ml-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
            >
              ₹1
            </Badge>
          </button>
        </div>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONSENT WAITING STATE */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {step === "consent" && (
          <div className="py-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center">
              <Clock className="w-8 h-8 text-yellow-600 dark:text-yellow-400 animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground dark:text-white">
                Waiting for Driver Consent
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                SMS sent to {phoneNumber}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Driver must reply <strong>YES</strong> to enable tracking
              </p>
            </div>
            <Alert className="text-left bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <Info className="h-4 w-4 text-blue-600 dark:text-blue-400" />
              <AlertDescription className="text-blue-800 dark:text-blue-300 text-xs">
                Once approved, click "Refresh Location" in the search panel to
                get live updates.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PROCESSING STATE */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {step === "processing" && (
          <div className="py-12 text-center space-y-4">
            <Loader2 className="w-12 h-12 mx-auto text-primary animate-spin" />
            <div>
              <h3 className="text-lg font-semibold text-foreground dark:text-white">
                {trackingMode === "FASTAG"
                  ? "Searching Toll Records..."
                  : "Registering SIM Tracking..."}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {trackingMode === "FASTAG"
                  ? `Looking for ${vehicleNumber}`
                  : `Sending request to ${phoneNumber}`}
              </p>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* INPUT FORM */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {step === "input" && (
          <div className="space-y-6 py-4">
            {/* ═══════════════════════════════════════════════════════════ */}
            {/* FASTAG FORM */}
            {/* ═══════════════════════════════════════════════════════════ */}

            {trackingMode === "FASTAG" && (
              <>
                {/* Vehicle Number */}
                <div className="space-y-2">
                  <Label>
                    Vehicle Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g., MH13EP2787"
                      value={vehicleNumber}
                      onChange={(e) =>
                        setVehicleNumber(e.target.value.toUpperCase())
                      }
                      className="pl-10 font-mono text-lg"
                      disabled={loading}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                </div>

                {/* Search Mode */}
                <div className="space-y-2">
                  <Label>Search Mode</Label>
                  <RadioGroup
                    value={searchType}
                    onValueChange={(v: any) => setSearchType(v)}
                  >
                    <div
                      className={cn(
                        "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all",
                        searchType === "live"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent"
                      )}
                      onClick={() => setSearchType("live")}
                    >
                      <RadioGroupItem value="live" id="live" />
                      <MapPin className="w-4 h-4 text-primary" />
                      <Label htmlFor="live" className="cursor-pointer flex-1">
                        <span className="block font-medium">
                          Latest Location
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Current position only
                        </span>
                      </Label>
                    </div>

                    <div
                      className={cn(
                        "flex items-center space-x-3 p-3 border rounded-lg cursor-pointer transition-all",
                        searchType === "journey"
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent"
                      )}
                      onClick={() => setSearchType("journey")}
                    >
                      <RadioGroupItem value="journey" id="journey" />
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <Label
                        htmlFor="journey"
                        className="cursor-pointer flex-1"
                      >
                        <span className="block font-medium">
                          Journey Tracking
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Full route with history
                        </span>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Journey Fields */}
                {searchType === "journey" && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>
                          FROM Location <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="e.g., Vapi"
                          value={fromLocation}
                          onChange={(e) => setFromLocation(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>
                          TO Location <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          placeholder="e.g., Chennai"
                          value={toLocation}
                          onChange={(e) => setToLocation(e.target.value)}
                          disabled={loading}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Number of Days</Label>
                      <div className="grid grid-cols-7 gap-2">
                        {[1, 2, 3, 4, 5, 6, 7].map((day) => (
                          <Button
                            key={day}
                            type="button"
                            variant={daysRange === day ? "default" : "outline"}
                            size="sm"
                            onClick={() => setDaysRange(day)}
                            disabled={loading}
                            className="w-full"
                          >
                            {day}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </>
                )}

                {/* Cost Info */}
                <Alert className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                  <IndianRupee className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <AlertDescription className="text-blue-800 dark:text-blue-300 text-sm">
                    This search will cost <strong>₹4</strong> for API call
                  </AlertDescription>
                </Alert>
              </>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* SIM FORM */}
            {/* ═══════════════════════════════════════════════════════════ */}

            {trackingMode === "SIM" && (
              <>
                {/* Phone Number */}
                <div className="space-y-2">
                  <Label>
                    Driver Phone Number <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="9876543210"
                      value={phoneNumber}
                      onChange={(e) =>
                        setPhoneNumber(e.target.value.replace(/\D/g, ""))
                      }
                      maxLength={10}
                      className="pl-10 font-mono text-lg"
                      disabled={loading}
                      onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    SMS will be sent for consent. Driver must reply YES.
                  </p>
                </div>

                {/* Driver Name (Optional) */}
                <div className="space-y-2">
                  <Label>
                    Driver Name{" "}
                    <span className="text-muted-foreground text-xs">
                      (Optional)
                    </span>
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Enter driver name"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Vehicle Number (Optional - Reference) */}
                <div className="space-y-2">
                  <Label>
                    Vehicle Number{" "}
                    <span className="text-muted-foreground text-xs">
                      (Optional - for reference)
                    </span>
                  </Label>
                  <div className="relative">
                    <Truck className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="MH12AB1234 (optional)"
                      value={simVehicleNumber}
                      onChange={(e) =>
                        setSimVehicleNumber(e.target.value.toUpperCase())
                      }
                      className="pl-10"
                      disabled={loading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Just for your reference - not used for tracking
                  </p>
                </div>

                {/* Cost Info */}
                <Alert className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                  <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <AlertDescription className="text-green-800 dark:text-green-300 text-sm">
                    SIM tracking costs only <strong>₹1</strong> per request
                  </AlertDescription>
                </Alert>

                {/* How it works */}
                <div className="bg-muted dark:bg-secondary rounded-lg p-3 space-y-2">
                  <p className="text-xs font-medium text-foreground dark:text-white">
                    How SIM Tracking Works:
                  </p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>SMS is sent to driver's phone</li>
                    <li>Driver replies "YES" to give consent</li>
                    <li>Location is fetched via mobile network</li>
                    <li>You can refresh anytime for updates</li>
                  </ol>
                </div>
              </>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* FOOTER */}
        {/* ═══════════════════════════════════════════════════════════ */}

        {step === "input" && (
          <div className="flex gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSearch}
              disabled={
                loading ||
                (trackingMode === "FASTAG" && !vehicleNumber.trim()) ||
                (trackingMode === "SIM" && phoneNumber.length !== 10)
              }
              className="flex-1 gap-2"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Search className="w-4 h-4" />
              )}
              {trackingMode === "FASTAG"
                ? "Track Vehicle (₹4)"
                : "Track via SIM (₹1)"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
