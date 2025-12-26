import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, RefreshCw, Navigation, Phone } from "lucide-react";
import { Location } from "@/features/vehicles/vehicles.api";

interface TrackingMapProps {
  vehicleId: string;
  vehicleInfo: {
    regNumber: string;
    driverName: string;
    driverPhone: string;
  };
  initialLocation?: Location;
}

export const TrackingMap = ({
  vehicleId,
  vehicleInfo,
  initialLocation,
}: TrackingMapProps) => {
  const [location, setLocation] = useState<Location | null>(
    initialLocation || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Mock function to simulate API call for vehicle location
  const fetchLocation = async (vehicleId: string): Promise<Location> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Mock location data with slight variation for movement simulation
    const baseLocation = initialLocation || {
      lat: 19.076,
      lng: 72.8777,
      lastUpdated: new Date().toISOString(),
      source: "FASTAG" as const,
    };

    // Add small random variation to simulate vehicle movement
    const variation = 0.001;
    return {
      lat: baseLocation.lat + (Math.random() - 0.5) * variation,
      lng: baseLocation.lng + (Math.random() - 0.5) * variation,
      lastUpdated: new Date().toISOString(),
      source: ["FASTAG", "GPS", "SIM"][
        Math.floor(Math.random() * 3)
      ] as Location["source"],
    };
  };

  const updateLocation = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const newLocation = await fetchLocation(vehicleId);
      setLocation(newLocation);
    } catch (err) {
      setError("Failed to fetch location data");
      console.error("Location fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Start polling for location updates
  useEffect(() => {
    if (vehicleId) {
      // Initial load if no location provided
      if (!location) {
        updateLocation();
      }

      // Set up polling every 10 seconds
      intervalRef.current = setInterval(() => {
        updateLocation();
      }, 10000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [vehicleId]);

  const getSourceColor = (source: string) => {
    const colors = {
      FASTAG: "bg-success/10 text-success",
      GPS: "bg-info/10 text-info",
      SIM: "bg-warning/10 text-warning",
    };
    return colors[source as keyof typeof colors] || colors.GPS;
  };

  if (error && !location) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-destructive" />
            <span>Live Tracking</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-12 h-12 bg-destructive/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-destructive font-medium mb-2">
              Location Data Unavailable
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              Unable to fetch real-time location for this vehicle.
            </p>
            <Button
              variant="outline"
              onClick={updateLocation}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 mr-2 ${isLoading ? "animate-spin" : ""}`}
              />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!location) {
    return (
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <div className="w-5 h-5 bg-primary/20 rounded animate-pulse" />
            <span>Loading Tracking Data...</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64 bg-muted/50 rounded-lg animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span>Live Tracking</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Badge className={getSourceColor(location.source)}>
              {location.source}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={updateLocation}
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Vehicle Info */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <Navigation className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium">{vehicleInfo.regNumber}</p>
              <p className="text-sm text-muted-foreground">
                {vehicleInfo.driverName}
              </p>
            </div>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={`tel:${vehicleInfo.driverPhone}`}>
              <Phone className="w-4 h-4 mr-1" />
              Call Driver
            </a>
          </Button>
        </div>

        {/* Map */}
        <div className="h-64 rounded-lg overflow-hidden border border-border bg-muted/50 flex items-center justify-center">
          <div className="text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-6 h-6 text-primary" />
            </div>
            <p className="font-medium text-foreground mb-2">Live Map View</p>
            <p className="text-sm text-muted-foreground">
              Vehicle location: {location.lat.toFixed(4)},{" "}
              {location.lng.toFixed(4)}
            </p>
            <Badge
              className={getSourceColor(location.source)}
              variant="outline"
            >
              {location.source} Data
            </Badge>
          </div>
        </div>

        {/* Location Details */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Coordinates</p>
            <p className="font-medium">
              {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Last Updated</p>
            <p className="font-medium">
              {new Date(location.lastUpdated).toLocaleTimeString()}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
