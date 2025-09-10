import { NavLink, useLocation } from "react-router-dom";
import { 
  Truck, 
  FileText, 
  MapPin, 
  DollarSign, 
  BarChart3,
  Package,
  Warehouse
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Bookings", href: "/bookings", icon: FileText },
  { name: "Vehicles", href: "/vehicles", icon: Truck },
  { name: "Warehouses", href: "/warehouses", icon: Warehouse },
  { name: "Tracking", href: "/tracking", icon: MapPin },
  { name: "Finance", href: "/finance", icon: DollarSign },
  { name: "Cargo", href: "/cargo", icon: Package },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col shadow-md">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center">
            <Truck className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">FreightSynq</h1>
            <p className="text-xs text-muted-foreground">Booking Service</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href || 
                          (item.href !== "/" && location.pathname.startsWith(item.href));
          
          return (
            <NavLink
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-muted rounded-full flex items-center justify-center">
            <span className="text-xs font-medium text-muted-foreground">JD</span>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">John Doe</p>
            <p className="text-xs text-muted-foreground">Operations Manager</p>
          </div>
        </div>
      </div>
    </div>
  );
};