// src/pages/Tracking.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  RefreshCw,
  Search,
  Truck,
  MapPin,
  TrendingUp,
  Loader2,
  AlertCircle,
  Navigation,
  Lock,
  Sparkles,
  Smartphone,
} from "lucide-react";
import { FleetMap } from "@/components/tracking/FleetMap";
import { VehicleSearchModal } from "@/components/tracking/VehicleSearchModal";
import { RandomSearchPanel } from "@/components/tracking/RandomSearchPanel";
import {
  fetchFleetVehicles,
  groupVehiclesByLocation,
  FleetVehicle,
  GroupedVehicle,
} from "@/api/fleet";
import {
  fetchRandomSearches,
  deleteRandomSearch,
  fetchSimLocation,
  updateSimSearchLocation,
  checkExistingSimRegistration,
  RandomSearch,
} from "@/api/randomSearch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";

export const Tracking = () => {
  const { toast } = useToast();
  const { accessLevel } = useAuth();

  const isFreeUser = accessLevel === "FREE";

  const [activeTab, setActiveTab] = useState<"fleet" | "random">(
    isFreeUser ? "random" : "fleet",
  );

  const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
  const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicle[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);

  const [randomSearches, setRandomSearches] = useState<RandomSearch[]>([]);
  const [selectedSearch, setSelectedSearch] = useState<RandomSearch | null>(
    null,
  );
  const [randomLoading, setRandomLoading] = useState(false);

  const [searchModalOpen, setSearchModalOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isFreeUser) {
      loadFleetData();
    }
    loadRandomSearches();
  }, [isFreeUser]);

  const loadFleetData = async () => {
    try {
      setFleetLoading(true);
      const vehicles = await fetchFleetVehicles();
      setFleetVehicles(vehicles);
      const grouped = groupVehiclesByLocation(vehicles);
      setGroupedVehicles(grouped);
    } catch (error: any) {
      console.error("Error loading fleet data:", error);
      toast({
        title: "❌ Error Loading Fleet",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setFleetLoading(false);
    }
  };

  const loadRandomSearches = async () => {
    try {
      setRandomLoading(true);
      const searches = await fetchRandomSearches();
      setRandomSearches(searches);
    } catch (error: any) {
      console.error("Error loading random searches:", error);
    } finally {
      setRandomLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);
      toast({ title: "🔄 Refreshing...", description: "Updating data" });

      if (activeTab === "fleet" && !isFreeUser) {
        await loadFleetData();
      } else {
        await loadRandomSearches();
        setSelectedSearch(null);
      }

      toast({
        title: "✅ Refreshed",
        description: "Data updated successfully",
      });
    } catch (error: any) {
      console.error("Refresh error:", error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleSearchComplete = async (searchId: string) => {
    await loadRandomSearches();
    setActiveTab("random");

    const updatedSearches = await fetchRandomSearches();
    const newSearch = updatedSearches.find((s) => s.id === searchId);
    if (newSearch) {
      setRandomSearches(updatedSearches);
      setSelectedSearch(newSearch);
    }
  };

  const handleViewSearch = (search: RandomSearch) => {
    setSelectedSearch(search);

    if (search.tracking_mode === "SIM") {
      toast({
        title: "📱 Viewing",
        description: search.phone_number || "SIM Tracking",
      });
    } else {
      toast({
        title: "🗺️ Viewing",
        description: search.vehicle_number || "Vehicle",
      });
    }
  };

  const handleDeleteSearch = async (searchId: string) => {
    try {
      const success = await deleteRandomSearch(searchId);
      if (success) {
        setRandomSearches((prev) => prev.filter((s) => s.id !== searchId));
        if (selectedSearch?.id === searchId) setSelectedSearch(null);
        toast({ title: "🗑️ Deleted", description: "Search removed" });
      }
    } catch (error: any) {
      toast({
        title: "❌ Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  // ═══════════════════════════════════════════════════════════
  // REFRESH SEARCH - HANDLES BOTH FASTAG AND SIM
  // ═══════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════
  // REFRESH SEARCH - HANDLES BOTH FASTAG AND SIM
  // ═══════════════════════════════════════════════════════════

  const handleRefreshSearch = async (search: RandomSearch) => {
    // ═══════════════════════════════════════════════════════════
    // SIM TRACKING REFRESH
    // ═══════════════════════════════════════════════════════════

    if (search.tracking_mode === "SIM") {
      if (!search.phone_number) {
        toast({
          title: "❌ Error",
          description: "Phone number not found",
          variant: "destructive",
        });
        return;
      }

      // Check if we have contact ID stored
      if (!search.lorryinfo_contact_id) {
        toast({
          title: "❌ Contact ID Missing",
          description: "Delete this search and try again.",
          variant: "destructive",
        });
        return;
      }

      try {
        toast({ title: "🔄 Fetching...", description: "Getting location" });

        console.log("🔍 SIM Refresh:", {
          phone: search.phone_number,
          contactId: search.lorryinfo_contact_id,
        });

        // Fetch location using stored contact ID
        const result = await fetchSimLocation({
          phoneNumber: search.phone_number,
          isRandomSearch: true,
          lorryinfoContactId: search.lorryinfo_contact_id,
        });

        console.log("📍 Result:", result);

        // Handle consent pending
        if (result.consentPending) {
          toast({
            title: "⏳ Consent Pending",
            description: "Driver hasn't replied YES yet.",
          });
          return;
        }

        // Check if location fetch succeeded
        if (!result.success || !result.location) {
          toast({
            title: "❌ No Location",
            description: result.error || "Failed to get location",
            variant: "destructive",
          });
          return;
        }

        // Check for zero coordinates
        if (result.location.latitude === 0 && result.location.longitude === 0) {
          toast({
            title: "⏳ Waiting",
            description: "Location not available yet",
          });
          return;
        }

        // Update search with new location
        await updateSimSearchLocation(search.id, result.location);

        // Refresh UI
        const updatedSearches = await fetchRandomSearches();
        setRandomSearches(updatedSearches);

        const updatedSearch = updatedSearches.find((s) => s.id === search.id);
        if (updatedSearch) setSelectedSearch(updatedSearch);

        toast({
          title: "📍 Updated!",
          description: result.location.location_name || "Location found",
        });
      } catch (error: any) {
        console.error("❌ Error:", error);
        toast({
          title: "❌ Error",
          description: error.message,
          variant: "destructive",
        });
      }

      return;
    }

    // ═══════════════════════════════════════════════════════════
    // FASTAG REFRESH - SAME AS BEFORE
    // ═══════════════════════════════════════════════════════════

    if (!search.vehicle_number) {
      toast({
        title: "❌ Error",
        description: "Vehicle number not found",
        variant: "destructive",
      });
      return;
    }

    if (
      !window.confirm(
        `Fetch fresh data for ${search.vehicle_number}?\n\nThis will cost.`,
      )
    )
      return;

    try {
      toast({ title: "🔄 Updating...", description: "Fetching latest data" });

      const { data, error } = await supabase.functions.invoke("track-fastag", {
        body: { vehicleNumber: search.vehicle_number },
      });

      if (error || !data.success || !data.data || data.data.length === 0) {
        throw new Error("No fresh data available");
      }

      let newCrossings: any[] = [];

      if (search.search_type === "live") {
        const latest = data.data[0];
        const [lat, lng] = latest.tollPlazaGeocode.split(",").map(Number);
        newCrossings = [
          {
            toll_plaza_name: latest.tollPlazaName,
            latitude: lat,
            longitude: lng,
            crossing_time: latest.readerReadTime,
            vehicle_type: latest.vehicleType || "VC10",
          },
        ];
      } else {
        const apiCrossings = data.data.map((c: any) => {
          const [lat, lng] = c.tollPlazaGeocode.split(",").map(Number);
          return {
            toll_plaza_name: c.tollPlazaName,
            latitude: lat,
            longitude: lng,
            crossing_time: c.readerReadTime,
            vehicle_type: c.vehicleType || "VC10",
          };
        });

        const now = new Date();
        const cutoffDate = new Date(
          now.getTime() - (search.days_range || 1) * 24 * 60 * 60 * 1000,
        );

        newCrossings = apiCrossings
          .filter((c: any) => new Date(c.crossing_time) >= cutoffDate)
          .sort(
            (a: any, b: any) =>
              new Date(a.crossing_time).getTime() -
              new Date(b.crossing_time).getTime(),
          );
      }

      if (newCrossings.length === 0) throw new Error("No crossings found");

      const lastCrossing = newCrossings[newCrossings.length - 1];

      await supabase
        .from("vehicle_search_history")
        .update({
          toll_crossings: newCrossings,
          crossing_count: newCrossings.length,
          last_latitude: lastCrossing?.latitude,
          last_longitude: lastCrossing?.longitude,
          last_toll_name: lastCrossing?.toll_plaza_name,
          last_crossing_time: lastCrossing?.crossing_time,
          searched_at: new Date().toISOString(),
        })
        .eq("id", search.id);

      await loadRandomSearches();
      const updatedSearches = await fetchRandomSearches();
      const updatedSearch = updatedSearches.find((s) => s.id === search.id);
      if (updatedSearch) setSelectedSearch(updatedSearch);

      toast({
        title: "✅ Updated",
        description: `Found ${newCrossings.length} crossings`,
      });
    } catch (error: any) {
      toast({
        title: "❌ Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleClearAllSearches = async () => {
    if (!window.confirm(`Delete all ${randomSearches.length} searches?`))
      return;

    try {
      await Promise.all(randomSearches.map((s) => deleteRandomSearch(s.id)));
      setRandomSearches([]);
      setSelectedSearch(null);
      toast({ title: "🗑️ All Cleared", description: "Deleted all searches" });
    } catch (error: any) {
      toast({
        title: "❌ Clear Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const fleetStats = {
    total: fleetVehicles.length,
    locations: groupedVehicles.length,
    clustered: groupedVehicles.filter((g) => g.count > 1).length,
  };

  const randomStats = {
    total: randomSearches.length,
    fastag: randomSearches.filter((s) => s.tracking_mode === "FASTAG").length,
    sim: randomSearches.filter((s) => s.tracking_mode === "SIM").length,
  };

  return (
    <div className="space-y-6 pb-8">
      {/* ACTION BAR */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {!isFreeUser ? (
          <div className="inline-flex items-center bg-muted dark:bg-secondary p-1 rounded-lg">
            <button
              onClick={() => setActiveTab("fleet")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === "fleet"
                  ? "bg-background dark:bg-card text-foreground dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground dark:hover:text-white"
              }`}
            >
              <Truck className="w-4 h-4" />
              Fleet ({fleetStats.total})
            </button>
            <button
              onClick={() => setActiveTab("random")}
              className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${
                activeTab === "random"
                  ? "bg-background dark:bg-card text-foreground dark:text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground dark:hover:text-white"
              }`}
            >
              <Navigation className="w-4 h-4" />
              Random ({randomStats.total})
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-4 flex-1">
            <Card className="flex-1 border-border dark:border-border bg-card dark:bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-primary/10 rounded-lg">
                    <Navigation className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
                      Total Searches
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {randomStats.total}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 border-border dark:border-border bg-card dark:bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
                      FASTag
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {randomStats.fastag}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 border-border dark:border-border bg-card dark:bg-card shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground dark:text-muted-foreground uppercase tracking-wide">
                      SIM Track
                    </p>
                    <p className="text-2xl font-bold text-foreground dark:text-white">
                      {randomStats.sim}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setSearchModalOpen(true)}
            className="gap-2 bg-primary hover:bg-primary-hover text-primary-foreground"
          >
            <Search className="w-4 h-4" />
            Search Vehicle
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-border dark:border-border hover:bg-accent dark:hover:bg-secondary"
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
            />
          </Button>
        </div>
      </div>

      {/* FLEET VIEW */}
      {activeTab === "fleet" && !isFreeUser && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border dark:border-border bg-card dark:bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      Active Vehicles
                    </p>
                    <p className="text-3xl font-bold text-foreground dark:text-white">
                      {fleetStats.total}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <Truck className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border dark:border-border bg-card dark:bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      Total Locations
                    </p>
                    <p className="text-3xl font-bold text-foreground dark:text-white">
                      {fleetStats.locations}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <MapPin className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border dark:border-border bg-card dark:bg-card">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                      Clustered Locations
                    </p>
                    <p className="text-3xl font-bold text-foreground dark:text-white">
                      {fleetStats.clustered}
                    </p>
                  </div>
                  <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                    <TrendingUp className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-border dark:border-border overflow-hidden">
            <CardContent className="p-0">
              {fleetLoading ? (
                <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50 dark:bg-secondary/50">
                  <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                  <p className="text-lg font-medium text-muted-foreground dark:text-muted-foreground">
                    Loading fleet data...
                  </p>
                </div>
              ) : fleetVehicles.length === 0 ? (
                <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50 dark:bg-secondary/50">
                  <AlertCircle className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-4" />
                  <h3 className="text-xl font-semibold mb-2 text-foreground dark:text-white">
                    No Active Vehicles
                  </h3>
                  <p className="text-muted-foreground dark:text-muted-foreground text-center max-w-md">
                    No vehicles are currently IN_TRANSIT with tracking data.
                  </p>
                </div>
              ) : (
                <FleetMap mode="fleet" groupedVehicles={groupedVehicles} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* RANDOM VIEW */}
      {(activeTab === "random" || isFreeUser) && (
        <div className="space-y-6">
          {!isFreeUser && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border dark:border-border bg-card dark:bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        Total Searches
                      </p>
                      <p className="text-3xl font-bold text-foreground dark:text-white">
                        {randomStats.total}
                      </p>
                    </div>
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Navigation className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border dark:border-border bg-card dark:bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        FASTag Searches
                      </p>
                      <p className="text-3xl font-bold text-foreground dark:text-white">
                        {randomStats.fastag}
                      </p>
                    </div>
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl">
                      <Truck className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border dark:border-border bg-card dark:bg-card">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        SIM Searches
                      </p>
                      <p className="text-3xl font-bold text-foreground dark:text-white">
                        {randomStats.sim}
                      </p>
                    </div>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/30 rounded-xl">
                      <Smartphone className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <RandomSearchPanel
                searches={randomSearches}
                onViewSearch={handleViewSearch}
                onDeleteSearch={handleDeleteSearch}
                onRefreshSearch={handleRefreshSearch}
                onClearAll={handleClearAllSearches}
              />
            </div>

            <div className="lg:col-span-2">
              <Card className="border-border dark:border-border overflow-hidden">
                <CardContent className="p-0">
                  {randomLoading ? (
                    <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50 dark:bg-secondary/50">
                      <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                      <p className="text-lg font-medium text-muted-foreground dark:text-muted-foreground">
                        Loading...
                      </p>
                    </div>
                  ) : randomSearches.length === 0 ? (
                    <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50 dark:bg-secondary/50">
                      <Search className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-4" />
                      <h3 className="text-xl font-semibold mb-2 text-foreground dark:text-white">
                        No Searches Yet
                      </h3>
                      <p className="text-muted-foreground dark:text-muted-foreground text-center max-w-md mb-4">
                        Search for any vehicle using FASTag or SIM tracking.
                      </p>
                      <Button
                        onClick={() => setSearchModalOpen(true)}
                        className="bg-primary hover:bg-primary-hover text-primary-foreground"
                      >
                        <Search className="w-4 h-4 mr-2" />
                        Search Vehicle
                      </Button>
                    </div>
                  ) : selectedSearch ? (
                    <FleetMap
                      mode="random"
                      selectedRandomSearch={selectedSearch}
                    />
                  ) : (
                    <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50 dark:bg-secondary/50">
                      <MapPin className="w-12 h-12 text-muted-foreground dark:text-muted-foreground mb-4" />
                      <p className="text-muted-foreground dark:text-muted-foreground">
                        Select a search from the list
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {isFreeUser && (
            <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 dark:from-primary/10 dark:to-primary/20">
              <CardContent className="py-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-primary/10 rounded-xl">
                      <Truck className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold text-foreground dark:text-white">
                          Fleet Tracking
                        </h3>
                        <span className="flex items-center gap-1 text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" />
                          Full Access
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                        Track all your company vehicles in real-time. See fleet
                        overview, vehicle clusters, and live positions on map.
                      </p>
                    </div>
                  </div>
                  <Button
                    className="bg-primary hover:bg-primary-hover text-primary-foreground gap-2 whitespace-nowrap"
                    onClick={() =>
                      window.open(
                        "mailto:sales@freightsynq.com?subject=Full Access Request",
                        "_blank",
                      )
                    }
                  >
                    <Sparkles className="w-4 h-4" />
                    Unlock Fleet Tracking
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <VehicleSearchModal
        isOpen={searchModalOpen}
        onClose={() => setSearchModalOpen(false)}
        onSearchComplete={handleSearchComplete}
      />
    </div>
  );
};
