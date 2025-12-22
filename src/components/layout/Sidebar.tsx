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
  Sparkles,
  FilePlus2,
  FolderOpen,
  Crown,
  Users,
  ClipboardList,
  Receipt,
  PackageSearch,
  Route,
  Calculator,
  PieChart,
  Bell,
  Calendar,
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
import { AccessRequestModal } from "@/components/AccessRequestModal";

interface SidebarProps {
  isOpen?: boolean;
  isCollapsed?: boolean;
  onClose?: () => void;
  onToggleCollapse?: () => void;
}

// ✅ Feature details for each locked feature
interface LockedFeatureDetails {
  name: string;
  icon: any;
  title: string;
  description: string;
  features: string[];
  featureIcons: any[];
}

const lockedFeaturesDetails: Record<string, LockedFeatureDetails> = {
  Customers: {
    name: "Customers",
    icon: UsersRound,
    title: "Customer Management",
    description:
      "Manage all your consignors, consignees and business partners in one place.",
    features: [
      "Add & manage consignors/consignees",
      "Store GST & contact details",
      "Track customer history",
      "Quick search & filters",
    ],
    featureIcons: [Users, FileText, ClipboardList, PackageSearch],
  },
  Bookings: {
    name: "Bookings",
    icon: FileText,
    title: "Booking & Bilty System",
    description: "Complete booking management with LR generation and tracking.",
    features: [
      "Create & manage bookings",
      "Generate professional bilty/LR",
      "Track shipment status",
      "Payment & billing management",
    ],
    featureIcons: [ClipboardList, Receipt, Route, Calculator],
  },
  Vehicles: {
    name: "Vehicles",
    icon: Truck,
    title: "Fleet & Vehicle Management",
    description: "Manage your entire fleet of owned and hired vehicles.",
    features: [
      "Add owned & hired vehicles",
      "Track vehicle documents",
      "Maintenance reminders",
      "Driver assignment",
    ],
    featureIcons: [Truck, FileText, Bell, UserCog],
  },
  Warehouses: {
    name: "Warehouses",
    icon: Warehouse,
    title: "Warehouse Management",
    description: "Manage warehouse operations and inventory across locations.",
    features: [
      "Multiple warehouse support",
      "Inventory tracking",
      "Stock in/out management",
      "Location-wise reports",
    ],
    featureIcons: [Warehouse, PackageSearch, ClipboardList, PieChart],
  },
};

import companyLogoSmall from "../../../public/logo.png";

export const Sidebar = ({
  isOpen = true,
  isCollapsed = false,
  onClose,
  onToggleCollapse,
}: SidebarProps) => {
  const location = useLocation();
  const { userProfile, company, isSuperAdmin, accessLevel } = useAuth();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);

  // ✅ UPDATED STATE - showRequestModal instead of showPremiumAlert
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedFeature, setSelectedFeature] =
    useState<LockedFeatureDetails | null>(null);

  // ✅ FREE tier navigation - Limited features
  const freeNavigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Tracking", href: "/tracking", icon: Locate },
    { name: "LR Generator", href: "/lr-generator", icon: FilePlus2 },
    { name: "Saved LRs", href: "/saved-lrs", icon: FileText },
  ];

  // ✅ FULL tier navigation - All features
  const fullNavigation = [
    { name: "Dashboard", href: "/", icon: BarChart3 },
    { name: "Customers", href: "/customers", icon: UsersRound },
    { name: "Bookings", href: "/bookings", icon: FileText },
    { name: "Tracking", href: "/tracking", icon: Locate },
    { name: "Broker", href: "/brokers", icon: UserRoundPlus },
    { name: "Vehicles", href: "/vehicles", icon: Truck },
    { name: "Drivers", href: "/drivers", icon: UserCog },
    { name: "Warehouses", href: "/warehouses", icon: Warehouse },
    { name: "Saved LRs", href: "/saved-lrs", icon: FolderOpen },
    {
      name: "Company Settings",
      href: "/company-settings",
      icon: Building2,
      adminOnly: true,
    },
  ];

  // ✅ Locked features
  const lockedFeatures = [
    { name: "Customers", icon: UsersRound },
    { name: "Bookings", icon: FileText },
    { name: "Vehicles", icon: Truck },
    { name: "Warehouses", icon: Warehouse },
  ];

  const superAdminNavigation = [
    { name: "Create Invites", href: "/super-admin/invites", icon: Plus },
    {
      name: "Manage Companies",
      href: "/super-admin/companies",
      icon: Building,
    },
    { name: "System Stats", href: "/super-admin/stats", icon: TrendingUp },
  ];

  // ✅ Get navigation based on access level
  const getNavigation = () => {
    if (isSuperAdmin) {
      return fullNavigation;
    }
    if (accessLevel === "FULL") {
      return fullNavigation.filter((item) => {
        if (item.adminOnly && userProfile?.role !== "admin") {
          return false;
        }
        return true;
      });
    }
    return freeNavigation;
  };

  const navigation = getNavigation();
  const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;

  // ✅ UPDATED - Handle locked feature click
  const handleLockedFeatureClick = (featureName: string) => {
    const featureDetails = lockedFeaturesDetails[featureName];
    if (featureDetails) {
      setSelectedFeature(featureDetails);
      setShowRequestModal(true); // ✅ CHANGED from setShowPremiumAlert
    }
  };

  const renderNavLink = (item: any, index: number) => {
    const isActive =
      location.pathname === item.href ||
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
          !isMobile && isCollapsed
            ? "justify-center p-2.5"
            : "space-x-2.5 px-3.5 py-2.5",
          isActive &&
            "bg-primary text-primary-foreground shadow-md dark:bg-primary/15 dark:text-primary dark:border-l-4 dark:border-primary",
          !isActive && "text-muted-foreground dark:text-muted-foreground",
          !isActive &&
            "hover:bg-accent hover:text-foreground dark:hover:bg-[#2A2A32] dark:hover:text-white",
          hoveredItem === item.name && !isActive && "scale-[1.02]"
        )}
        style={{
          animationDelay: `${index * 50}ms`,
        }}
      >
        {isActive && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground dark:bg-transparent rounded-r-full animate-in slide-in-from-left duration-300" />
        )}

        <item.icon
          className={cn(
            "w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200",
            hoveredItem === item.name && "rotate-6 scale-110"
          )}
        />

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
            <div
              className="animate-in fade-in duration-300"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {linkContent}
            </div>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="ml-2 animate-in zoom-in-90 duration-200"
          >
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

  // ✅ Render locked feature item
  const renderLockedItem = (item: any, index: number) => {
    if (isCollapsed && !isMobile) {
      return (
        <Tooltip key={item.name}>
          <TooltipTrigger asChild>
            <div
              onClick={() => handleLockedFeatureClick(item.name)}
              className={cn(
                "flex items-center justify-center p-2.5 rounded-lg",
                "text-muted-foreground cursor-pointer",
                "hover:bg-primary/10 transition-colors"
              )}
            >
              <div className="relative">
                <item.icon className="w-[18px] h-[18px] opacity-60" />
                <Crown className="w-3 h-3 absolute -bottom-1 -right-1 text-primary" />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="ml-2">
            <div className="flex items-center gap-1">
              <Crown className="w-3 h-3 text-primary" />
              <p>{item.name} - Premium</p>
            </div>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <div
        key={item.name}
        onClick={() => handleLockedFeatureClick(item.name)}
        className={cn(
          "flex items-center space-x-2.5 px-3.5 py-2.5 rounded-lg",
          "text-muted-foreground cursor-pointer",
          "bg-primary/5 dark:bg-primary/10",
          "border border-primary/20 dark:border-primary/30",
          "hover:bg-primary/10 dark:hover:bg-primary/15",
          "hover:border-primary/40 dark:hover:border-primary/50",
          "transition-all duration-200",
          "active:scale-[0.98]"
        )}
      >
        <div className="relative">
          <item.icon className="w-[18px] h-[18px] opacity-70" />
        </div>
        <span className="text-[13px] font-medium flex-1">{item.name}</span>
        <Crown className="w-4 h-4 text-primary" />
      </div>
    );
  };

  return (
    <>
      <TooltipProvider delayDuration={0}>
        {/* ✅ REPLACED: AccessRequestModal instead of AlertDialog */}
        {selectedFeature && (
          <AccessRequestModal
            open={showRequestModal}
            onOpenChange={setShowRequestModal}
            featureName={selectedFeature.name}
            featureIcon={selectedFeature.icon}
            features={selectedFeature.features}
          />
        )}

        {/* Mobile Overlay */}
        <div
          className={cn(
            "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
            isOpen
              ? "opacity-100 pointer-events-auto"
              : "opacity-0 pointer-events-none"
          )}
          onClick={onClose}
        />

        {/* Sidebar Container */}
        <div
          className={cn(
            "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col",
            "transition-all duration-500 ease-in-out",
            "bg-card dark:bg-card border-r border-border dark:border-border",
            isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
            !isMobile && isCollapsed ? "lg:w-[75px]" : "w-56"
          )}
          style={{
            transitionProperty: "width, transform",
            transitionDuration: "500ms",
            transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
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

          {/* Collapse Button */}
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

          {/* Branding Section */}
          <div
            className={cn(
              "border-b border-border dark:border-border transition-all duration-500 ease-in-out",
              "flex items-center",
              !isMobile && isCollapsed ? "px-2.5 h-[65px]" : "px-3.5 h-[65px]"
            )}
          >
            <div
              className={cn(
                "flex items-center gap-3 transition-all duration-500 ease-in-out w-full",
                !isMobile && isCollapsed && "flex-col justify-center"
              )}
            >
              <img
                src={companyLogoSmall}
                alt="FreightSynQ Logo"
                className={cn(
                  "object-contain transition-all duration-500 ease-in-out",
                  isCollapsed && !isMobile ? "w-9 h-9" : "h-11 w-auto"
                )}
              />
              <div
                className={cn(
                  "overflow-hidden transition-all duration-500 ease-in-out",
                  isCollapsed && !isMobile
                    ? "w-0 h-0 opacity-0"
                    : "w-auto opacity-100"
                )}
              >
                <h1 className="text-[17px] font-bold text-foreground dark:text-white truncate whitespace-nowrap leading-tight">
                  FreightSynQ
                </h1>
                {/* ✅ Access Level Badge */}
                {accessLevel === "FREE" && !isSuperAdmin && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded-full">
                    FREE
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav
            className={cn(
              "flex-1 py-4 space-y-1 overflow-y-auto transition-all duration-500 ease-in-out scrollbar-none",
              !isMobile && isCollapsed ? "px-2.5" : "px-3.5"
            )}
          >
            {/* Active Navigation */}
            {navigation.map((item, index) => renderNavLink(item, index))}

            {/* ✅ Premium Features Section (for FREE users) */}
            {accessLevel === "FREE" && !isSuperAdmin && (
              <>
                <Separator className="my-3 bg-border dark:bg-border" />

                {(!isCollapsed || isMobile) && (
                  <div className="px-1 py-2">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                      <Crown className="w-3 h-3 text-primary" />
                      Premium Features
                    </p>
                  </div>
                )}

                {lockedFeatures.map((item, index) =>
                  renderLockedItem(item, index)
                )}

                {/* Upgrade Button */}
                {(!isCollapsed || isMobile) && (
                  <div className="pt-3">
                    <div className="p-3 bg-primary/5 dark:bg-primary/10 rounded-lg border border-primary/20">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-xs font-semibold text-foreground dark:text-white">
                          Unlock Premium
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground mb-2">
                        Get full access to all features
                      </p>
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs"
                        onClick={() => {
                          // Show generic premium popup
                          setSelectedFeature({
                            name: "All Features",
                            icon: Sparkles,
                            title: "Premium Access",
                            description:
                              "Get complete access to all FreightSynQ features and supercharge your logistics business.",
                            features: [
                              "Customer & Party Management",
                              "Complete Booking System",
                              "Fleet & Vehicle Management",
                              "Warehouse Operations",
                            ],
                            featureIcons: [
                              UsersRound,
                              FileText,
                              Truck,
                              Warehouse,
                            ],
                          });
                          setShowRequestModal(true);
                        }}
                      >
                        Upgrade Now
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}

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
                  renderNavLink(item, navigation.length + index)
                )}
              </>
            )}
          </nav>
        </div>
      </TooltipProvider>
    </>
  );
};
