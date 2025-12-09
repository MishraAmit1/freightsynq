// =============================================
// TRACKING PAGE - Fleet Tracking Dashboard
// =============================================

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    RefreshCw,
    Search,
    Truck,
    MapPin,
    TrendingUp,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { FleetMap } from '@/components/tracking/FleetMap';
import { VehicleSearchModal } from '@/components/tracking/VehicleSearchModal';
import {
    fetchFleetVehicles,
    groupVehiclesByLocation,
    FleetVehicle,
    GroupedVehicle,
    VehicleTollCrossing
} from '@/api/fleet';
import { useToast } from '@/hooks/use-toast';

export const Tracking = () => {
    const { toast } = useToast();

    // Fleet data
    const [fleetVehicles, setFleetVehicles] = useState<FleetVehicle[]>([]);
    const [groupedVehicles, setGroupedVehicles] = useState<GroupedVehicle[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Search modal
    const [searchModalOpen, setSearchModalOpen] = useState(false);
    const [vehicleHistory, setVehicleHistory] = useState<VehicleTollCrossing[] | undefined>();
    const [searchedVehicle, setSearchedVehicle] = useState<string | undefined>();
    const [searchPeriod, setSearchPeriod] = useState<string>('current');

    // Load fleet data on mount
    useEffect(() => {
        loadFleetData();
    }, []);

    const loadFleetData = async () => {
        try {
            setLoading(true);

            const vehicles = await fetchFleetVehicles();
            setFleetVehicles(vehicles);

            const grouped = groupVehiclesByLocation(vehicles);
            setGroupedVehicles(grouped);

            console.log(`✅ Loaded ${vehicles.length} vehicles at ${grouped.length} locations`);

        } catch (error: any) {
            console.error('Error loading fleet data:', error);
            toast({
                title: "❌ Error Loading Fleet",
                description: error.message || "Failed to load fleet tracking data",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        try {
            setRefreshing(true);

            toast({
                title: "🔄 Refreshing...",
                description: "Updating fleet locations",
            });

            // Clear search results on refresh
            setVehicleHistory(undefined);
            setSearchedVehicle(undefined);

            await loadFleetData();

            toast({
                title: "✅ Refreshed",
                description: `Updated ${fleetVehicles.length} vehicles`,
            });

        } catch (error: any) {
            console.error('Refresh error:', error);
        } finally {
            setRefreshing(false);
        }
    };

    const handleSearchComplete = (
        vehicleNumber: string,
        history: VehicleTollCrossing[],
        period: string
    ) => {
        setVehicleHistory(history);
        setSearchedVehicle(vehicleNumber);
        setSearchPeriod(period);

        console.log(`🔍 Showing history for ${vehicleNumber}: ${history.length} crossings`);
    };

    const handleClearSearch = () => {
        setVehicleHistory(undefined);
        setSearchedVehicle(undefined);

        toast({
            title: "🗺️ Showing Fleet View",
            description: "Cleared vehicle search results",
        });
    };

    // Calculate stats
    const stats = {
        total: fleetVehicles.length,
        locations: groupedVehicles.length,
        clustered: groupedVehicles.filter(g => g.count > 1).length,
    };

    return (
        <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="bg-card border-b border-border rounded-lg">
                <div className="px-6 py-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                        {/* Title */}
                        <div>
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                <MapPin className="w-8 h-8 text-primary" />
                                Fleet Tracking
                            </h1>
                            <p className="text-sm text-muted-foreground mt-1">
                                Real-time tracking of all IN_TRANSIT vehicles
                            </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                            {vehicleHistory && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleClearSearch}
                                >
                                    Clear Search
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSearchModalOpen(true)}
                                className="gap-2"
                            >
                                <Search className="w-4 h-4" />
                                Search Vehicle
                            </Button>

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRefresh}
                                disabled={refreshing || loading}
                                className="gap-2"
                            >
                                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            {!vehicleHistory && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="border-border">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Active Vehicles</p>
                                    <p className="text-3xl font-bold text-foreground">{stats.total}</p>
                                </div>
                                <Truck className="w-10 h-10 text-primary/20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Total Locations</p>
                                    <p className="text-3xl font-bold text-foreground">{stats.locations}</p>
                                </div>
                                <MapPin className="w-10 h-10 text-primary/20" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-border">
                        <CardContent className="pt-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-muted-foreground">Clustered Locations</p>
                                    <p className="text-3xl font-bold text-foreground">{stats.clustered}</p>
                                </div>
                                <TrendingUp className="w-10 h-10 text-primary/20" />
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Search Result Info */}
            {vehicleHistory && searchedVehicle && (
                <Card className="border-primary/50 bg-primary/5">
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Search className="w-5 h-5 text-primary" />
                                <div>
                                    <p className="font-semibold text-foreground">
                                        Showing history for: <span className="font-mono text-primary">{searchedVehicle}</span>
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        {vehicleHistory.length} toll crossing{vehicleHistory.length > 1 ? 's' : ''} •
                                        {searchPeriod === 'current' ? ' Last 24 hours' : ' Last 7 days'}
                                    </p>
                                </div>
                            </div>
                            <Button variant="outline" size="sm" onClick={handleClearSearch}>
                                Back to Fleet View
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Map Card */}
            <Card className="border-border overflow-hidden">
                <CardContent className="p-0">
                    {loading ? (
                        <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50">
                            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
                            <p className="text-lg font-medium text-muted-foreground">Loading fleet data...</p>
                        </div>
                    ) : fleetVehicles.length === 0 && !vehicleHistory ? (
                        <div className="h-[600px] flex flex-col items-center justify-center bg-muted/50">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
                                <AlertCircle className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold mb-2">No Active Vehicles</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                No vehicles are currently IN_TRANSIT with tracking data.<br />
                                Try searching for a specific vehicle or refresh the data.
                            </p>
                            <div className="flex gap-2 mt-4">
                                <Button onClick={() => setSearchModalOpen(true)}>
                                    <Search className="w-4 h-4 mr-2" />
                                    Search Vehicle
                                </Button>
                                <Button variant="outline" onClick={handleRefresh}>
                                    <RefreshCw className="w-4 h-4 mr-2" />
                                    Refresh
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <FleetMap
                            groupedVehicles={groupedVehicles}
                            vehicleHistory={vehicleHistory}
                            searchedVehicle={searchedVehicle}
                        />
                    )}
                </CardContent>
            </Card>

            {/* Vehicle Search Modal */}
            <VehicleSearchModal
                isOpen={searchModalOpen}
                onClose={() => setSearchModalOpen(false)}
                onSearchComplete={handleSearchComplete}
            />
        </div>
    );
};