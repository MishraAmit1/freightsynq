import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Plus, Truck, User, Phone, MapPin, Shield, ShieldCheck } from "lucide-react";
import { mockVehicles } from "./mockVehicles";
import { formatDistanceToNow } from "date-fns";

export const VehiclesList = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredVehicles = mockVehicles.filter(vehicle =>
    vehicle.regNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.driver?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    vehicle.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    const colors = {
      AVAILABLE: "bg-success/10 text-success",
      ASSIGNED: "bg-warning/10 text-warning",
      MAINTENANCE: "bg-destructive/10 text-destructive"
    };
    return colors[status as keyof typeof colors] || colors.AVAILABLE;
  };

  const getVerifiedIcon = (verified: boolean) => {
    return verified ? (
      <ShieldCheck className="w-4 h-4 text-success" />
    ) : (
      <Shield className="w-4 h-4 text-muted-foreground" />
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Vehicles</h1>
          <p className="text-muted-foreground">
            Manage your fleet of {mockVehicles.length} vehicles
          </p>
        </div>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Vehicle
        </Button>
      </div>

      {/* Filters */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Search Vehicles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by vehicle number, driver name, or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Vehicles Table */}
      <Card className="border-border shadow-sm">
        <CardHeader>
          <CardTitle>Fleet Overview</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vehicle</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Location</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVehicles.map((vehicle) => (
                <TableRow key={vehicle.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Truck className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{vehicle.regNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {vehicle.type} • {vehicle.capacity}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {vehicle.driver ? (
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-success/10 rounded-full flex items-center justify-center">
                          <User className="w-4 h-4 text-success" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{vehicle.driver.name}</p>
                          <p className="text-sm text-muted-foreground">{vehicle.driver.experience}</p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">No driver assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(vehicle.status)}>
                      {vehicle.status.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {vehicle.lastLocation ? (
                      <div className="flex items-center space-x-2">
                        <MapPin className="w-4 h-4 text-info" />
                        <div>
                          <p className="text-sm font-medium">
                            {vehicle.lastLocation.lat.toFixed(4)}, {vehicle.lastLocation.lng.toFixed(4)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(vehicle.lastLocation.lastUpdated))} ago
                          </p>
                        </div>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Location unavailable</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {getVerifiedIcon(vehicle.verified)}
                      <span className="text-sm">
                        {vehicle.verified ? 'Verified' : 'Pending'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      {vehicle.driver && (
                        <Button variant="outline" size="sm" asChild>
                          <a href={`tel:${vehicle.driver.phone}`}>
                            <Phone className="w-4 h-4 mr-1" />
                            Call
                          </a>
                        </Button>
                      )}
                      <Button variant="outline" size="sm">
                        View Details
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};