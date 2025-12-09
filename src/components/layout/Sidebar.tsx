// src/components/layout/Sidebar.tsx - NO CARD VERSION (EXPERIMENT)
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
  Locate,
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

import companyLogoFull from "../../../public/FS1.jpg"
import companyLogoSmall from "../../../public/FS1.png"

export const Sidebar = ({
  isOpen = true,
  isCollapsed = false,
  onClose,
  onToggleCollapse
}: SidebarProps) => {
  const location = useLocation();
  const { userProfile, company, isSuperAdmin } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  const navigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Customers", href: "/customers", icon: UsersRound },
    { name: "Bookings", href: "/bookings", icon: FileText },
    { name: "Tracking", href: "/tracking", icon: Locate },
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
          "flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 relative group",
          !isMobile && isCollapsed ? "justify-center p-2.5" : "space-x-2.5 px-3.5 py-2.5",
          // Active state - Theme consistent
          isActive && "bg-primary text-primary-foreground shadow-md dark:bg-primary/15 dark:text-primary dark:border-l-4 dark:border-primary",
          // Default state
          !isActive && "text-muted-foreground dark:text-muted-foreground",
          // Hover state
          !isActive && "hover:bg-accent hover:text-foreground dark:hover:bg-[#2A2A32] dark:hover:text-white",
          hoveredItem === item.name && !isActive && "scale-[1.02]"
        )}
        style={{
          animationDelay: `${index * 50}ms`
        }}
      >
        {/* Active Indicator */}
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground dark:bg-transparent rounded-r-full animate-in slide-in-from-left duration-300" />
        )}

        <item.icon className={cn(
          "w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200",
          hoveredItem === item.name && "rotate-6 scale-110"
        )} />

        {(!isCollapsed || isMobile) && (
          <span className="animate-in slide-in-from-left-2 duration-300">
            {item.name}
          </span>
        )}

        {/* Hover Pulse Indicator */}
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
      <TooltipProvider delayDuration={0}>
        {/* Mobile Overlay */}
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />

        {/* Sidebar Container - NO CARD VERSION */}
        <div
          className={cn(
            "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col",
            "transition-all duration-500 ease-in-out",
            "bg-card dark:bg-card border-r border-border dark:border-border",
            isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            !isMobile && isCollapsed ? "lg:w-[75px]" : "w-56"
          )}
          style={{
            transitionProperty: 'width, transform',
            transitionDuration: '500ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >

          {/* Mobile Close Button Header */}
          <div className="border-b border-border dark:border-border px-4 py-4 transition-all duration-500 ease-in-out lg:hidden">
            <div className="flex items-center justify-end">
              <Button
                variant="ghost"
                size="icon"
                className="hover:bg-accent dark:hover:bg-[#2A2A32] hover:rotate-90 transition-all duration-200"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* Collapse Button - Positioned on border between header and nav */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "hidden lg:flex absolute h-6 w-6 rounded-full border-2",
              "bg-card dark:bg-card border-border dark:border-border",
              "transition-all duration-300 ease-in-out",
              "hover:bg-primary hover:border-primary hover:shadow-xl hover:scale-110 active:scale-95",
              "group",
              "z-[100]",
              // Position: Right corner, on the border line after header
              "-right-3 top-[56px]"
            )}
            onClick={onToggleCollapse}
          >
            <div className="transition-transform duration-300">
              {isCollapsed ? (
                <ChevronsRight className="w-3 h-3 text-foreground group-hover:text-primary-foreground transition-colors duration-300" />
              ) : (
                <ChevronsLeft className="w-3 h-3 text-foreground group-hover:text-primary-foreground transition-colors duration-300" />
              )}
            </div>
          </Button>

          {/* Branding Section - Direct, No Card Wrapper */}
          <div className={cn(
            "border-b border-border dark:border-border transition-all duration-500 ease-in-out",
            "flex items-center",
            !isMobile && isCollapsed ? "px-2.5 h-[65px]" : "px-3.5 h-[65px]"
          )}>
            <div className={cn(
              "flex items-center gap-3 transition-all duration-500 ease-in-out w-full",
              !isMobile && isCollapsed && "flex-col justify-center"
            )}>
              <img
                src={companyLogoSmall}
                alt="FreightSynQ Logo"
                className={cn(
                  "object-contain transition-all duration-500 ease-in-out",
                  isCollapsed && !isMobile
                    ? "w-9 h-9"
                    : "h-11 w-auto"
                )}
              />
              <div className={cn(
                "overflow-hidden transition-all duration-500 ease-in-out",
                isCollapsed && !isMobile ? "w-0 h-0 opacity-0" : "w-auto opacity-100"
              )}>
                <h1 className="text-[17px] font-bold text-foreground dark:text-white truncate whitespace-nowrap leading-tight">
                  FreightSynQ
                </h1>
              </div>
            </div>
          </div>

          {/* Navigation Links - Direct, No Card Wrapper */}
          <nav
            className={cn(
              "flex-1 py-4 space-y-2 overflow-y-auto transition-all duration-500 ease-in-out scrollbar-none",
              !isMobile && isCollapsed ? "px-2.5" : "px-3.5"
            )}
          >
            {/* Regular Navigation */}
            {filteredNavigation.map((item, index) => renderNavLink(item, index))}

            {/* Super Admin Section */}
            {isSuperAdmin && (
              <>
                <Separator className="my-4 bg-border dark:bg-border" />

                {(!isCollapsed || isMobile) && (
                  <div className="px-4 py-2 flex items-center gap-2 transition-all duration-500 ease-in-out">
                    <Shield className="w-4 h-4 text-primary dark:text-primary" />
                    <span className="text-xs font-semibold text-primary dark:text-primary uppercase tracking-wider">
                      Super Admin
                    </span>
                  </div>
                )}

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