// src/components/layout/Sidebar.tsx - SMOOTH COLLAPSE
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
      <TooltipProvider delayDuration={0}>
        {/* Mobile Overlay */}
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
            isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />

        {/* Sidebar Container - Smooth Transition */}
        <div
          className={cn(
            "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col",
            "transition-all duration-500 ease-in-out",
            isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            !isMobile && isCollapsed ? "lg:w-[125px]" : "w-72"
          )}
          style={{
            transitionProperty: 'width, transform',
            transitionDuration: '500ms',
            transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >

          {/* Collapse Button */}
          <Button
            variant="outline"
            size="icon"
            className={cn(
              "hidden lg:flex absolute right-6 top-32 z-50 h-6 w-6 rounded-full border-2 bg-white dark:bg-gray-900 shadow-md",
              "transition-all duration-300 ease-in-out",
              "hover:shadow-lg hover:scale-110 hover:rotate-180 active:scale-95"
            )}
            onClick={onToggleCollapse}
          >
            <div className="transition-transform duration-300">
              {isCollapsed ? (
                <ChevronsRight className="w-3 h-3" />
              ) : (
                <ChevronsLeft className="w-3 h-3" />
              )}
            </div>
          </Button>
          {/* 🔥 Company Header - Aligned with TopBar */}
          <div className="bg-background border-b border-gray-200 dark:border-gray-800 px-4 py-4 transition-all duration-500 ease-in-out">
            <div className={cn(
              "flex items-center transition-all duration-500 ease-in-out",
              !isMobile && isCollapsed ? "justify-center" : "space-x-3"
            )}>
              <img
                src={companyLogoSmall}
                alt="Company Logo"
                className={cn(
                  "object-contain transition-all duration-500 ease-in-out group-hover:scale-105",
                  isCollapsed
                    ? "w-10 h-10"
                    : "h-12 w-auto max-w-[200px]"
                )}
              />
              <div className={cn(
                "overflow-hidden transition-all duration-500 ease-in-out",
                isCollapsed && !isMobile ? "w-0 opacity-0" : "w-auto opacity-100"
              )}>
                <h1 className="text-lg font-bold text-foreground truncate max-w-[180px] whitespace-nowrap">
                  FreightSynQ
                </h1>
                <p className="text-xs capitalize font-medium font-sans whitespace-nowrap">
                  Smarter Way to Move Freight
                </p>
              </div>

              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden ml-auto hover:rotate-90 transition-transform duration-200"
                onClick={onClose}
              >
                <X className="w-5 h-5" />
              </Button>
            </div>
          </div>

          {/* 🔥 Navigation Card - Exact same level as Main Content */}
          <div className="flex-1 bg-background overflow-hidden transition-all duration-500 ease-in-out">
            {/* Exact same padding as main content */}
            <div className="p-4 sm:p-6 pt-4 sm:pt-6 h-full transition-all duration-500 ease-in-out">
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-sm h-full flex flex-col overflow-hidden">
                <nav
                  className={cn(
                    "flex-1 py-4 space-y-2 overflow-y-auto transition-all duration-500 ease-in-out ",
                    !isMobile && isCollapsed ? "px-3" : "px-4"
                  )}
                  style={{
                    scrollbarWidth: 'none',
                    msOverflowStyle: 'none'
                  }}
                >
                  <style jsx>{`
                    nav::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>

                  {/* Regular Navigation */}
                  {filteredNavigation.map((item, index) => renderNavLink(item, index))}

                  {/* Super Admin Section */}
                  {isSuperAdmin && (
                    <>
                      <Separator className="my-4" />

                      {(!isCollapsed || isMobile) && (
                        <div className="px-4 py-2 flex items-center gap-2 transition-all duration-500 ease-in-out">
                          <Shield className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-semibold text-orange-500 uppercase tracking-wider">
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
            </div>
          </div>
        </div>
      </TooltipProvider>
    </>
  );
};