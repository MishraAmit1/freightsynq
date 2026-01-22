// =============================================
// RANDOM SEARCH PANEL - FASTAG + SIM SUPPORT
// =============================================

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Eye,
  Trash2,
  Navigation,
  MapPin,
  Calendar,
  Search,
  ArrowUpDown,
  RefreshCw,
  AlertCircle,
  Truck,
  Smartphone,
  Phone,
  User,
  Clock,
} from "lucide-react";
import { RandomSearch } from "@/api/randomSearch";
import { getTimeAgo } from "@/api/fleet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

// =============================================
// INTERFACES
// =============================================

interface RandomSearchPanelProps {
  searches: RandomSearch[];
  onViewSearch: (search: RandomSearch) => void;
  onDeleteSearch: (searchId: string) => void;
  onRefreshSearch?: (search: RandomSearch) => void;
  onClearAll?: () => void;
}

// =============================================
// MAIN COMPONENT
// =============================================

export const RandomSearchPanel: React.FC<RandomSearchPanelProps> = ({
  searches,
  onViewSearch,
  onDeleteSearch,
  onRefreshSearch,
  onClearAll,
}) => {
  // Filters
  const [searchFilter, setSearchFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "fastag" | "sim">(
    "all",
  );
  const [sortOrder, setSortOrder] = useState<"latest" | "oldest">("latest");

  // Filter & Sort Logic
  const filteredSearches = useMemo(() => {
    let result = [...searches];

    // 1. Filter by tracking mode (FASTag/SIM/All)
    if (activeFilter !== "all") {
      result = result.filter(
        (s) => s.tracking_mode.toLowerCase() === activeFilter,
      );
    }

    // 2. Filter by vehicle number OR phone number search
    if (searchFilter.trim()) {
      const query = searchFilter.toLowerCase().replace(/[\s-]/g, "");
      result = result.filter((s) => {
        // Search in vehicle number
        const vehicleMatch = s.vehicle_number
          ?.toLowerCase()
          .replace(/[\s-]/g, "")
          .includes(query);
        // Search in phone number
        const phoneMatch = s.phone_number
          ?.replace(/[\s-]/g, "")
          .includes(query);
        // Search in driver name
        const driverMatch = s.driver_name?.toLowerCase().includes(query);

        return vehicleMatch || phoneMatch || driverMatch;
      });
    }

    // 3. Sort
    result.sort((a, b) => {
      const timeA = new Date(a.searched_at).getTime();
      const timeB = new Date(b.searched_at).getTime();
      return sortOrder === "latest" ? timeB - timeA : timeA - timeB;
    });

    return result;
  }, [searches, activeFilter, searchFilter, sortOrder]);

  // Stats
  const stats = {
    all: searches.length,
    fastag: searches.filter((s) => s.tracking_mode === "FASTAG").length,
    sim: searches.filter((s) => s.tracking_mode === "SIM").length,
  };

  return (
    <Card className="border-border dark:border-border bg-card dark:bg-card">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2 text-foreground dark:text-white">
            <Navigation className="w-5 h-5 text-primary" />
            Search History
          </CardTitle>

          {/* Actions */}
          <div className="flex gap-1">
            {/* Sort */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <ArrowUpDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setSortOrder("latest")}>
                  Latest First {sortOrder === "latest" && "✓"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder("oldest")}>
                  Oldest First {sortOrder === "oldest" && "✓"}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search vehicle, phone, driver..."
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            className="pl-9 h-9 bg-background dark:bg-secondary border-border dark:border-border"
          />
        </div>
      </CardHeader>

      <CardContent>
        <Tabs
          value={activeFilter}
          onValueChange={(v: any) => setActiveFilter(v)}
        >
          {/* Filter Tabs - Now FASTAG/SIM based */}
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all" className="text-xs">
              All ({stats.all})
            </TabsTrigger>
            <TabsTrigger value="fastag" className="text-xs">
              <Truck className="w-3 h-3 mr-1" />
              FASTag ({stats.fastag})
            </TabsTrigger>
            <TabsTrigger value="sim" className="text-xs">
              <Smartphone className="w-3 h-3 mr-1" />
              SIM ({stats.sim})
            </TabsTrigger>
          </TabsList>

          {/* Results */}
          <TabsContent value={activeFilter} className="mt-0">
            {filteredSearches.length > 0 ? (
              <ScrollArea className="h-[450px] pr-4">
                <div className="space-y-2">
                  {filteredSearches.map((search) => (
                    <SearchItem
                      key={search.id}
                      search={search}
                      onView={() => onViewSearch(search)}
                      onDelete={() => onDeleteSearch(search.id)}
                      onRefresh={
                        onRefreshSearch
                          ? () => onRefreshSearch(search)
                          : undefined
                      }
                    />
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchFilter ? (
                  <>
                    <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No results for "{searchFilter}"</p>
                  </>
                ) : (
                  <>
                    <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">
                      No{" "}
                      {activeFilter !== "all" ? activeFilter.toUpperCase() : ""}{" "}
                      searches yet
                    </p>
                  </>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Result Count */}
        {filteredSearches.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground text-center">
            Showing {filteredSearches.length} of {searches.length} searches
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =============================================
// SEARCH ITEM COMPONENT
// =============================================

// =============================================
// SEARCH ITEM COMPONENT - FIXED WITH ALL BUTTONS
// =============================================

// =============================================
// SEARCH ITEM COMPONENT - FIXED ALL ICONS
// =============================================

// =============================================
// SEARCH ITEM COMPONENT - DEBUG VERSION
// =============================================

// =============================================
// SEARCH ITEM COMPONENT - FIXED FOR SIM
// =============================================

// =============================================
// SEARCH ITEM COMPONENT - WORKING VERSION
// =============================================

// =============================================
// SEARCH ITEM COMPONENT - GRID LAYOUT (GUARANTEED FIX)
// =============================================

const SearchItem: React.FC<{
  search: RandomSearch;
  onView: () => void;
  onDelete: () => void;
  onRefresh?: () => void;
}> = ({ search, onView, onDelete, onRefresh }) => {
  const isSim = search.tracking_mode === "SIM";
  const isLive = search.search_type === "live";

  const ageHours = Math.floor(
    (Date.now() - new Date(search.searched_at).getTime()) / (1000 * 60 * 60),
  );
  const isStale = ageHours >= 1;
  const refreshCost = isSim ? "" : "";

  return (
    <div className="p-3 border border-border dark:border-border rounded-lg hover:bg-accent/50 dark:hover:bg-secondary/50 transition-colors">
      {/* GRID LAYOUT - 2 columns */}
      <div className="grid grid-cols-[1fr_auto] gap-3 items-start">
        {/* COLUMN 1: Content */}
        <div className="min-w-0">
          {/* Primary Identifier + Tracking Mode Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Tracking Mode Icon */}
            <div
              className={cn(
                "w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0",
                isSim
                  ? "bg-green-100 dark:bg-green-900/30"
                  : "bg-blue-100 dark:bg-blue-900/30",
              )}
            >
              {isSim ? (
                <Smartphone className="w-3 h-3 text-green-600 dark:text-green-400" />
              ) : (
                <Truck className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              )}
            </div>

            {/* Primary Identifier */}
            <p className="font-mono font-semibold text-sm text-foreground dark:text-white">
              {isSim ? (
                <span className="flex items-center gap-1">
                  <Phone className="w-3 h-3" />
                  {search.phone_number}
                </span>
              ) : (
                search.vehicle_number
              )}
            </p>

            {/* Type Badge */}
            {!isSim && (
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  isLive
                    ? "border-green-500 text-green-600 dark:text-green-400"
                    : "border-orange-500 text-orange-600 dark:text-orange-400",
                )}
              >
                {isLive ? "Live" : "Journey"}
              </Badge>
            )}
          </div>

          {/* Secondary Info */}
          {isSim ? (
            <div className="mt-1.5 space-y-1">
              {search.driver_name && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <User className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{search.driver_name}</span>
                </p>
              )}

              {search.vehicle_number && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Truck className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">{search.vehicle_number}</span>
                  <Badge variant="secondary" className="text-xs ml-1">
                    ref
                  </Badge>
                </p>
              )}

              {search.last_toll_name &&
                search.last_toll_name !== "Waiting for consent..." && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate">{search.last_toll_name}</span>
                  </p>
                )}

              {search.last_toll_name === "Waiting for consent..." && (
                <div className="flex items-center gap-1 mt-1">
                  <Clock className="w-3 h-3 text-yellow-500" />
                  <span className="text-xs text-yellow-600 dark:text-yellow-400">
                    Waiting for driver consent
                  </span>
                </div>
              )}
            </div>
          ) : (
            <>
              {isLive ? (
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 flex-shrink-0" />
                  <span className="truncate">
                    {search.last_toll_name || "Unknown location"}
                  </span>
                </p>
              ) : (
                <>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {search.from_location} → {search.to_location}
                  </p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <Badge variant="secondary" className="text-xs">
                      {search.crossing_count} tolls
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs flex items-center gap-1"
                    >
                      <Calendar className="w-3 h-3" />
                      {search.days_range}d
                    </Badge>
                  </div>
                </>
              )}
            </>
          )}

          {/* Time */}
          <p className="text-xs text-muted-foreground mt-1.5">
            {getTimeAgo(search.searched_at)}
          </p>

          {/* STALE WARNING */}
          {isStale &&
            onRefresh &&
            search.last_toll_name !== "Waiting for consent..." && (
              <div className="mt-2 flex items-start gap-1">
                <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-orange-600 dark:text-orange-400">
                  {ageHours}h old - Click refresh ({refreshCost})
                </p>
              </div>
            )}
        </div>

        {/* COLUMN 2: ACTION BUTTONS - Auto width, won't shrink */}
        <div className="flex items-center gap-1">
          {/* REFRESH Button */}
          {onRefresh && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onRefresh();
              }}
              className={cn(
                "inline-flex items-center justify-center w-8 h-8 rounded-md transition-colors",
                isStale
                  ? "text-orange-500 hover:bg-orange-100 dark:hover:bg-orange-900/30"
                  : "text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800",
              )}
              title={`Refresh (${refreshCost})`}
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          )}

          {/* VIEW Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onView();
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
            title="View on map"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* DELETE Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="inline-flex items-center justify-center w-8 h-8 rounded-md text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
