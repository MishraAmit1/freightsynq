// Replace the entire WarehouseList.tsx with this:
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Plus,
  MapPin,
  Package,
  AlertTriangle,
  Users,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fetchWarehouses } from "@/api/warehouses";
import { AddWarehouseModal } from "./AddWarehouseModal";
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
  manager_email: string;
  status: string;
}

export const WarehouseList = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterState, setFilterState] = useState("all");
  const [sortBy, setSortBy] = useState("name");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    loadWarehouses();
  }, []);

  const loadWarehouses = async () => {
    try {
      setLoading(true);
      const data = await fetchWarehouses();
      setWarehouses(data);
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

  const getStockUtilization = (currentStock: number, capacity: number) => {
    return (currentStock / capacity) * 100;
  };

  const getCapacityColor = (utilization: number) => {
    if (utilization <= 60) return "text-success";
    if (utilization <= 85) return "text-warning";
    return "text-destructive";
  };

  // Filter and sort warehouses
  const filteredWarehouses = warehouses
    .filter(warehouse => {
      const matchesSearch = warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        warehouse.state.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesState = filterState === "all" || warehouse.state === filterState;
      return matchesSearch && matchesState;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "capacity":
          return b.capacity - a.capacity;
        case "stock":
          return b.current_stock - a.current_stock;
        case "utilization":
          return getStockUtilization(b.current_stock, b.capacity) - getStockUtilization(a.current_stock, a.capacity);
        default:
          return 0;
      }
    });

  const uniqueStates = [...new Set(warehouses.map(w => w.state))];

  const handleWarehouseClick = (warehouseId: string) => {
    navigate(`/warehouses/${warehouseId}`);
  };

  const handleAddWarehouse = async (warehouseData: any) => {
    try {
      const { createWarehouse } = await import('@/api/warehouses');
      await createWarehouse(warehouseData);

      // Reload warehouses
      await loadWarehouses();

      toast({
        title: "Warehouse Added Successfully",
        description: `${warehouseData.name} has been added to the system`,
      });
    } catch (error) {
      console.error('Error adding warehouse:', error);
      toast({
        title: "Error",
        description: "Failed to add warehouse. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin" />
        <span className="ml-2">Loading warehouses...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Warehouses</h1>
          <p className="text-muted-foreground">Manage warehouse operations and inventory</p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Warehouse
        </Button>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search warehouses by name, city, or state..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filterState} onValueChange={setFilterState}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All States</SelectItem>
                {uniqueStates.map(state => (
                  <SelectItem key={state} value={state}>{state}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="capacity">Capacity</SelectItem>
                <SelectItem value="stock">Current Stock</SelectItem>
                <SelectItem value="utilization">Utilization</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Warehouse Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredWarehouses.map((warehouse) => {
          const utilization = getStockUtilization(warehouse.current_stock, warehouse.capacity);
          const isNearCapacity = utilization > 85;

          return (
            <Card
              key={warehouse.id}
              className="hover:shadow-md transition-all duration-200 cursor-pointer"
              onClick={() => handleWarehouseClick(warehouse.id)}
            >
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold">{warehouse.name}</CardTitle>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3" />
                      {warehouse.city}, {warehouse.state}
                    </div>
                  </div>
                  {isNearCapacity && (
                    <Badge variant="destructive" className="gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Near Capacity
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="space-y-4">
                  {/* Capacity Bar */}
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Stock Utilization</span>
                      <span className={getCapacityColor(utilization)}>
                        {warehouse.current_stock}/{warehouse.capacity} ({utilization.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all duration-300 ${utilization <= 60 ? 'bg-success' :
                            utilization <= 85 ? 'bg-warning' : 'bg-destructive'
                          }`}
                        style={{ width: `${Math.min(utilization, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{warehouse.current_stock}</p>
                        <p className="text-xs text-muted-foreground">Units in Stock</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-primary" />
                      <div>
                        <p className="text-sm font-medium">{warehouse.manager_name}</p>
                        <p className="text-xs text-muted-foreground">Manager</p>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleWarehouseClick(warehouse.id);
                    }}
                  >
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredWarehouses.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No warehouses found</h3>
            <p className="text-muted-foreground">
              {searchTerm || filterState !== "all"
                ? "Try adjusting your search or filter criteria."
                : "Get started by adding your first warehouse."}
            </p>
            {(!searchTerm && filterState === "all") && (
              <Button
                onClick={() => setIsAddModalOpen(true)}
                className="mt-4 gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Warehouse
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <AddWarehouseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleAddWarehouse}
      />
    </div>
  );
};