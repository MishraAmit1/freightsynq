// src/components/layout/Sidebar.tsx - UPDATED VERSION
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
  X,
  ChevronsLeft,
  ChevronsRight,
  UserCog,
  Shield,
  Plus,
  Building,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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
  const { userProfile, company, isSuperAdmin } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // Regular navigation items
  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Customers", href: "/customers", icon: UsersRound },
    { name: "Bookings", href: "/bookings", icon: FileText },
    { name: "Broker", href: "/brokers", icon: UserRoundPlus },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Drivers", href: "/drivers", icon: UserCog },
    { name: "Warehouses", href: "/warehouses", icon: Warehouse },
    {
      name: "Company Settings",
      href: "/company-settings",
      icon: Building2,
      adminOnly: true
    },
  ];

  // Super admin navigation items
  const superAdminNavigation = [
    { name: "Create Invites", href: "/super-admin/invites", icon: Plus },
    { name: "Manage Companies", href: "/super-admin/companies", icon: Building },
    { name: "System Stats", href: "/super-admin/stats", icon: TrendingUp },
  ];

  const filteredNavigation = navigation.filter(item => {
    if (item.adminOnly && userProfile?.role !== 'admin') {
      return false;
    }
    return true;
  });

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  // Render navigation link function
  const renderNavLink = (item: any, index: number) => {
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
  };

  return (
    <>
      {/* Custom CSS for hiding scrollbar */}
      <style jsx>{`
        .hide-scrollbar {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari and Opera */
        }
      `}</style>

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
                {company?.logo_url ? (
                  <img
                    src={company.logo_url}
                    alt={company.name || 'Company Logo'}
                    className={cn(
                      "object-contain rounded-full shadow-lg animate-in zoom-in-50 duration-300",
                      !isMobile && isCollapsed ? "w-10 h-10" : "w-10 h-10"
                    )}
                  />
                ) : (
                  <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center flex-shrink-0 shadow-lg animate-in zoom-in-50 duration-300">
                    <Building2 className="w-5 h-5 text-primary-foreground" />
                  </div>
                )}

                {(!isCollapsed || isMobile) && (
                  <div className="overflow-hidden animate-in slide-in-from-left-2 duration-300">
                    <h1 className="text-lg font-bold text-foreground truncate max-w-[180px]">
                      {company?.name || 'FreightSynQ'}
                    </h1>
                    <p className="text-xs text-muted-foreground capitalize">
                      {company?.company_type || 'Logistics'} Platform
                    </p>
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

          {/* ✅ UPDATED: Added hide-scrollbar class and removed scrollbar-thin classes */}
          <nav className={cn(
            "flex-1 py-6 space-y-2 overflow-y-auto hide-scrollbar",
            !isMobile && isCollapsed ? "px-3" : "px-4"
          )}>
            {/* Regular Navigation */}
            {filteredNavigation.map((item, index) => renderNavLink(item, index))}

            {/* Super Admin Section */}
            {isSuperAdmin && (
              <>
                <Separator className="my-4" />

                {/* Super Admin Label */}
                {(!isCollapsed || isMobile) && (
                  <div className="px-4 py-2 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-orange-500" />
                    <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">
                      Super Admin
                    </span>
                  </div>
                )}

                {/* Super Admin Menu Items */}
                {superAdminNavigation.map((item, index) =>
                  renderNavLink(item, filteredNavigation.length + index)
                )}
              </>
            )}
          </nav>


        </div>
      </TooltipProvider>
    </>
  );
};