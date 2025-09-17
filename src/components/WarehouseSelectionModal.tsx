import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Search,
    MapPin,
    Package,
    Users,
    Loader2,
    CheckCircle,
    X
} from "lucide-react";
import { fetchWarehouses } from "@/api/warehouses";
import { useToast } from "@/hooks/use-toast";

interface Warehouse {
    id: string;
    name: string;
    code: string;
    city: string;
    state: string;
    address: string;
    capacity: number;
    current_stock: number;
    manager_name: string;
    manager_phone: string;
}

interface WarehouseSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (warehouseId: string, warehouseName: string) => void;
    currentWarehouseId?: string;
    bookingId: string;
    bookingDisplayId?: string;
}

export const WarehouseSelectionModal = ({
    isOpen,
    onClose,
    onSelect,
    currentWarehouseId,
    bookingId,
    bookingDisplayId
}: WarehouseSelectionModalProps) => {
    const { toast } = useToast();
    const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedWarehouse, setSelectedWarehouse] = useState<Warehouse | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadWarehouses();
        }
    }, [isOpen]);

    const loadWarehouses = async () => {
        try {
            setLoading(true);
            const data = await fetchWarehouses();
            setWarehouses(data);

            // Set current warehouse as selected if exists
            if (currentWarehouseId) {
                const current = data.find(w => w.id === currentWarehouseId);
                if (current) setSelectedWarehouse(current);
            }
        } catch (error) {
            console.error('Error loading warehouses:', error);
            toast({
                title: "Error",
                description: "Failed to load warehouses",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredWarehouses = warehouses.filter(warehouse =>
        warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.state.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getUtilization = (currentStock: number, capacity: number) => {
        return (currentStock / capacity) * 100;
    };

    const getUtilizationColor = (utilization: number) => {
        if (utilization <= 60) return "text-success";
        if (utilization <= 85) return "text-warning";
        return "text-destructive";
    };

    const handleSelect = () => {
        if (selectedWarehouse) {
            onSelect(selectedWarehouse.id, selectedWarehouse.name);
            onClose();
        }
    };

    if (loading) {
        return (
            <Dialog open={isOpen} onOpenChange={onClose}>
                <DialogContent className="max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Select Warehouse</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin" />
                        <span className="ml-2">Loading warehouses...</span>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span className="flex items-center gap-2">
                            <Package className="w-5 h-5 text-primary" />
                            Select Warehouse for Booking {bookingDisplayId || bookingId}
                        </span>
                        {currentWarehouseId && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    onSelect('remove', 'Remove');
                                    onClose();
                                }}
                                className="text-destructive hover:text-destructive"
                            >
                                <X className="w-4 h-4 mr-2" />
                                Remove from Warehouse
                            </Button>
                        )}
                    </DialogTitle>
                </DialogHeader>
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        placeholder="Search warehouses by name, city, or state..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Warehouses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                    {filteredWarehouses.length === 0 ? (
                        <div className="col-span-2 text-center py-8">
                            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                            <p className="text-muted-foreground">No warehouses found</p>
                        </div>
                    ) : (
                        filteredWarehouses.map((warehouse) => {
                            const utilization = getUtilization(warehouse.current_stock, warehouse.capacity);
                            const isSelected = selectedWarehouse?.id === warehouse.id;
                            const isCurrent = currentWarehouseId === warehouse.id;

                            return (
                                <Card
                                    key={warehouse.id}
                                    className={`cursor-pointer transition-all duration-200 ${isSelected
                                        ? 'ring-2 ring-primary border-primary bg-primary/5'
                                        : 'hover:border-primary/50 hover:shadow-md'
                                        }`}
                                    onClick={() => setSelectedWarehouse(warehouse)}
                                >
                                    <CardContent className="p-4">
                                        <div className="space-y-3">
                                            {/* Header */}
                                            <div className="flex items-start justify-between">
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{warehouse.name}</h3>
                                                        {isCurrent && (
                                                            <Badge variant="default" className="text-xs">
                                                                <CheckCircle className="w-3 h-3 mr-1" />
                                                                Current
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                        <MapPin className="w-3 h-3" />
                                                        {warehouse.city}, {warehouse.state}
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-xs">
                                                    {warehouse.code}
                                                </Badge>
                                            </div>

                                            {/* Capacity Bar */}
                                            <div>
                                                <div className="flex justify-between text-xs mb-1">
                                                    <span className="text-muted-foreground">Capacity</span>
                                                    <span className={getUtilizationColor(utilization)}>
                                                        {warehouse.current_stock}/{warehouse.capacity} ({utilization.toFixed(1)}%)
                                                    </span>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-1.5">
                                                    <div
                                                        className={`h-1.5 rounded-full transition-all duration-300 ${utilization <= 60 ? 'bg-success' :
                                                            utilization <= 85 ? 'bg-warning' : 'bg-destructive'
                                                            }`}
                                                        style={{ width: `${Math.min(utilization, 100)}%` }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Manager Info */}
                                            <div className="flex items-center gap-2">
                                                <Users className="w-4 h-4 text-primary" />
                                                <div>
                                                    <p className="text-sm font-medium">{warehouse.manager_name}</p>
                                                    <p className="text-xs text-muted-foreground">{warehouse.manager_phone}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>

                {/* Selected Warehouse Info */}
                {selectedWarehouse && (
                    <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <h4 className="font-medium text-primary mb-2">Selected Warehouse</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <span className="text-muted-foreground">Name:</span>
                                <span className="ml-2 font-medium">{selectedWarehouse.name}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Location:</span>
                                <span className="ml-2">{selectedWarehouse.city}, {selectedWarehouse.state}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Manager:</span>
                                <span className="ml-2">{selectedWarehouse.manager_name}</span>
                            </div>
                            <div>
                                <span className="text-muted-foreground">Capacity:</span>
                                <span className="ml-2">{selectedWarehouse.current_stock}/{selectedWarehouse.capacity}</span>
                            </div>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSelect}
                        disabled={!selectedWarehouse}
                    >
                        Select Warehouse
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};