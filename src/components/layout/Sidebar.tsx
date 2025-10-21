import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  Truck,
  FileText,
  BarChart3,
  Warehouse,
  UsersRound,
  UserRoundPlus,
  Building2,
  Menu,
  X,
  ChevronsLeft,
  ChevronsRight,
  PanelLeftClose,
  PanelLeft,
  UserCog // ✅ NEW ICON
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

export const Sidebar = ({
  isOpen = true,
  isCollapsed = false,
  onClose,
  onToggleCollapse
}: SidebarProps) => {
  const location = useLocation();
  const { userProfile, company } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // ✅ ADDED "Drivers" TO NAVIGATION
  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Customers", href: "/customers", icon: UsersRound },
    { name: "Bookings", href: "/bookings", icon: FileText },
    { name: "Broker", href: "/brokers", icon: UserRoundPlus },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Drivers", href: "/drivers", icon: UserCog }, // ✅ NEW ITEM
    { name: "Warehouses", href: "/warehouses", icon: Warehouse },
    {
      name: "Company Settings",
      href: "/company-settings",
      icon: Building2,
      adminOnly: true
    },
  ];

  // ... (rest of the component remains the same)
  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && userProfile?.role !== 'admin') {
      return false;
    }
    return true;
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  return (
    <TooltipProvider delayDuration={0}>
      <div
        className={cn(
          "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      <div className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50 bg-card border-r border-border flex flex-col shadow-xl lg:shadow-md transition-all duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        !isMobile && isCollapsed ? "lg:w-20" : "w-64"
      )}>

        <Button
          variant="outline"
          size="icon"
          className={cn(
            "hidden lg:flex absolute -right-4 top-11 z-50 h-8 w-8 rounded-full border-2 bg-card shadow-md transition-all duration-200",
            "hover:shadow-lg hover:scale-110 hover:rotate-180 active:scale-95"
          )}
          onClick={onToggleCollapse}
        >
          <div className="transition-transform duration-300">
            {isCollapsed ? (
              <ChevronsRight className="w-4 h-4" />
            ) : (
              <ChevronsLeft className="w-4 h-4" />
            )}
          </div>
        </Button>

        <div className={cn(
          "border-b border-border transition-all duration-300",
          !isMobile && isCollapsed ? "p-4" : "p-6"
        )}>
          <div className="flex items-center justify-between">
            <div className={cn(
              "flex items-center transition-all duration-300",
              !isMobile && isCollapsed ? "justify-center" : "space-x-3"
            )}>
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg animate-in zoom-in-50 duration-300">
                <Truck className="w-5 h-5 text-primary-foreground" />
              </div>
              {(!isCollapsed || isMobile) && (
                <div className="overflow-hidden animate-in slide-in-from-left-2 duration-300">
                  <h1 className="text-xl font-bold text-foreground">FreightSynq</h1>
                  <p className="text-xs text-muted-foreground">Booking Service</p>
                </div>
              )}
            </div>

            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden hover:rotate-90 transition-transform duration-200"
              onClick={onClose}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        <nav className={cn(
          "flex-1 py-6 space-y-2 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent",
          !isMobile && isCollapsed ? "px-3" : "px-4"
        )}>
          {filteredNavigation.map((item, index) => {
            const isActive = location.pathname === item.href ||
              (item.href !== "/" && location.pathname.startsWith(item.href));

            const linkContent = (
              <NavLink
                key={item.name}
                to={item.href}
                onMouseEnter={() => setHoveredItem(item.name)}
                onMouseLeave={() => setHoveredItem(null)}
                onClick={() => {
                  if (window.innerWidth < 1024) {
                    onClose?.();
                  }
                }}
                className={cn(
                  "flex items-center rounded-lg text-sm font-medium transition-all duration-200 relative group",
                  !isMobile && isCollapsed ? "justify-center p-3" : "space-x-3 px-4 py-3",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-md scale-[1.02]"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted hover:scale-[1.02]",
                  hoveredItem === item.name && !isActive && "bg-muted/50"
                )}
                style={{
                  animationDelay: `${index * 50}ms`
                }}
              >
                {isActive && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full animate-in slide-in-from-left duration-300" />
                )}

                <item.icon className={cn(
                  "w-5 h-5 flex-shrink-0 transition-transform duration-200",
                  hoveredItem === item.name && "rotate-6 scale-110"
                )} />
                {(!isCollapsed || isMobile) && (
                  <span className="animate-in slide-in-from-left-2 duration-300">
                    {item.name}
                  </span>
                )}

                {!isActive && hoveredItem === item.name && (
                  <div className="absolute right-2 w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                )}
              </NavLink>
            );

            if (!isMobile && isCollapsed) {
              return (
                <Tooltip key={item.name}>
                  <TooltipTrigger asChild>
                    <div className="animate-in fade-in duration-300" style={{ animationDelay: `${index * 50}ms` }}>
                      {linkContent}
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="ml-2 animate-in zoom-in-90 duration-200">
                    <p>{item.name}</p>
                  </TooltipContent>
                </Tooltip>
              );
            }

            return (
              <div
                key={item.name}
                className="animate-in fade-in slide-in-from-left-2 duration-300"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {linkContent}
              </div>
            );
          })}
        </nav>

        <div className={cn(
          "border-t border-border transition-all duration-300",
          !isMobile && isCollapsed ? "p-3" : "p-4"
        )}>
          {!isMobile && isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="w-10 h-10 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center mx-auto cursor-pointer transition-all duration-200 hover:scale-110 hover:shadow-lg">
                  <span className="text-sm font-medium text-muted-foreground">
                    {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right" className="ml-2 animate-in zoom-in-90 duration-200">
                <div>
                  <p className="font-medium">{userProfile?.name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">
                    {userProfile?.role === 'admin' ? 'Administrator' :
                      userProfile?.role === 'manager' ? 'Manager' : 'Operator'}
                  </p>
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center space-x-3 group cursor-pointer animate-in fade-in duration-500">
              <div className="w-8 h-8 bg-gradient-to-br from-muted to-muted/50 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-200 group-hover:scale-110 group-hover:shadow-lg">
                <span className="text-xs font-medium text-muted-foreground">
                  {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                </span>
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors duration-200">
                  {userProfile?.name || 'User'}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userProfile?.role === 'admin' ? 'Administrator' :
                    userProfile?.role === 'manager' ? 'Manager' : 'Operator'}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
};