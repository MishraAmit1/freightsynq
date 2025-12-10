import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Eye,
    Trash2,
    Navigation,
    MapPin,
    Calendar,
    Search,
    ArrowUpDown,
    RefreshCw,
    AlertCircle
} from 'lucide-react';
import { RandomSearch } from '@/api/randomSearch';
import { getTimeAgo } from '@/api/fleet';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface RandomSearchPanelProps {
    searches: RandomSearch[];
    onViewSearch: (search: RandomSearch) => void;
    onDeleteSearch: (searchId: string) => void;
    onRefreshSearch?: (search: RandomSearch) => void;
    onClearAll?: () => void;
}

export const RandomSearchPanel: React.FC<RandomSearchPanelProps> = ({
    searches,
    onViewSearch,
    onDeleteSearch,
    onRefreshSearch,
    onClearAll
}) => {
    // Filters
    const [searchFilter, setSearchFilter] = useState('');
    const [activeFilter, setActiveFilter] = useState<'all' | 'live' | 'journey'>('all');
    const [sortOrder, setSortOrder] = useState<'latest' | 'oldest'>('latest');

    // Filter & Sort Logic
    const filteredSearches = useMemo(() => {
        let result = [...searches];

        // 1. Filter by type (Live/Journey/All)
        if (activeFilter !== 'all') {
            result = result.filter(s => s.search_type === activeFilter);
        }

        // 2. Filter by vehicle number search
        if (searchFilter.trim()) {
            const query = searchFilter.toLowerCase().replace(/[\s-]/g, '');
            result = result.filter(s =>
                s.vehicle_number.toLowerCase().replace(/[\s-]/g, '').includes(query)
            );
        }

        // 3. Sort
        result.sort((a, b) => {
            const timeA = new Date(a.searched_at).getTime();
            const timeB = new Date(b.searched_at).getTime();
            return sortOrder === 'latest' ? timeB - timeA : timeA - timeB;
        });

        return result;
    }, [searches, activeFilter, searchFilter, sortOrder]);

    // Stats
    const stats = {
        all: searches.length,
        live: searches.filter(s => s.search_type === 'live').length,
        journey: searches.filter(s => s.search_type === 'journey').length,
    };

    return (
        <Card className="border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
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
                                <DropdownMenuItem onClick={() => setSortOrder('latest')}>
                                    Latest First {sortOrder === 'latest' && '✓'}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setSortOrder('oldest')}>
                                    Oldest First {sortOrder === 'oldest' && '✓'}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Search Input */}
                <div className="relative mt-3">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search vehicle number..."
                        value={searchFilter}
                        onChange={(e) => setSearchFilter(e.target.value)}
                        className="pl-9 h-9"
                    />
                </div>
            </CardHeader>

            <CardContent>
                <Tabs value={activeFilter} onValueChange={(v: any) => setActiveFilter(v)}>
                    {/* Filter Tabs */}
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="all" className="text-xs">
                            All ({stats.all})
                        </TabsTrigger>
                        <TabsTrigger value="live" className="text-xs">
                            <div className="w-2 h-2 rounded-full bg-green-500 mr-1"></div>
                            Live ({stats.live})
                        </TabsTrigger>
                        <TabsTrigger value="journey" className="text-xs">
                            <div className="w-2 h-2 rounded-full bg-orange-500 mr-1"></div>
                            Journey ({stats.journey})
                        </TabsTrigger>
                    </TabsList>

                    {/* Results */}
                    <TabsContent value={activeFilter} className="mt-0">
                        {filteredSearches.length > 0 ? (
                            <ScrollArea className="h-[450px] pr-4">
                                <div className="space-y-2">
                                    {filteredSearches.map(search => (
                                        <SearchItem
                                            key={search.id}
                                            search={search}
                                            onView={() => onViewSearch(search)}
                                            onDelete={() => onDeleteSearch(search.id)}
                                            onRefresh={onRefreshSearch ? () => onRefreshSearch(search) : undefined}
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
                                        <p className="text-sm">No {activeFilter !== 'all' ? activeFilter : ''} searches yet</p>
                                    </>
                                )}
                            </div>
                        )}
                    </TabsContent>
                </Tabs>

                {/* Result Count */}
                {filteredSearches.length > 0 && (
                    <div className="mt-3 pt-3 border-t text-xs text-muted-foreground text-center">
                        Showing {filteredSearches.length} of {searches.length} searches
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ========== Individual Search Item Component ==========
// ========== Individual Search Item Component ==========
const SearchItem: React.FC<{
    search: RandomSearch;
    onView: () => void;
    onDelete: () => void;
    onRefresh?: () => void;
}> = ({ search, onView, onDelete, onRefresh }) => {
    const isLive = search.search_type === 'live';

    // Calculate age in hours
    const ageHours = Math.floor(
        (Date.now() - new Date(search.searched_at).getTime()) / (1000 * 60 * 60)
    );

    // Determine if stale (>1 hour)
    const isStale = ageHours >= 1;

    return (
        <div className="p-3 border rounded-lg hover:bg-accent/50 transition-colors">
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    {/* Vehicle Number */}
                    <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isLive ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                        <p className="font-mono font-semibold text-sm">
                            {search.vehicle_number}
                        </p>
                    </div>

                    {/* Location/Route */}
                    {isLive ? (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <MapPin className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{search.last_toll_name || 'Unknown location'}</span>
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
                                <Badge variant="outline" className="text-xs flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {search.days_range}d
                                </Badge>
                            </div>
                        </>
                    )}

                    {/* Time */}
                    <p className="text-xs text-muted-foreground mt-1">
                        {getTimeAgo(search.searched_at)}
                    </p>

                    {/* STALE WARNING */}
                    {isStale && (
                        <div className="mt-2 flex items-start gap-1">
                            <AlertCircle className="w-3 h-3 text-orange-500 flex-shrink-0 mt-0.5" />
                            <p className="text-xs text-orange-600 dark:text-orange-400">
                                {ageHours}h old - Click 🔄 to update (₹4)
                            </p>
                        </div>
                    )}
                </div>

                {/* ✅ Actions - ALWAYS VISIBLE */}
                <div className="flex gap-1 flex-shrink-0">
                    {/* Refresh Button */}
                    {onRefresh && (
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={onRefresh}
                            className={`h-8 w-8 p-0 ${isStale ? 'text-orange-500 hover:text-orange-600' : ''}`}
                            title={`Update with fresh data (₹4 cost)`}
                        >
                            <RefreshCw className="w-4 h-4" />
                        </Button>
                    )}

                    {/* View Button */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onView}
                        className="h-8 w-8 p-0"
                        title="View on map"
                    >
                        <Eye className="w-4 h-4" />
                    </Button>

                    {/* Delete Button */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={onDelete}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        title="Delete"
                    >
                        <Trash2 className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};