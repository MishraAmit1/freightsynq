// src/components/layout/SuperAdminSidebar.tsx
import { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    BarChart3,
    Plus,
    Building,
    TrendingUp,
    Shield,
    X,
    ChevronsLeft,
    ChevronsRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SuperAdminSidebarProps {
    isOpen?: boolean;
    isCollapsed?: boolean;
    onClose?: () => void;
    onToggleCollapse?: () => void;
}

import companyLogoSmall from "../../../public/FS1.png";

export const SuperAdminSidebar = ({
    isOpen = true,
    isCollapsed = false,
    onClose,
    onToggleCollapse
}: SuperAdminSidebarProps) => {
    const location = useLocation();
    const [hoveredItem, setHoveredItem] = useState<string | null>(null);

    const navigation = [
        { name: "Dashboard", href: "/super-admin", icon: BarChart3, exact: true },
        { name: "Create Invites", href: "/super-admin/invites", icon: Plus },
        { name: "Manage Companies", href: "/super-admin/companies", icon: Building },
        { name: "System Stats", href: "/super-admin/stats", icon: TrendingUp },
    ];

    const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

    const renderNavLink = (item: any, index: number) => {
        const isActive = item.exact
            ? location.pathname === item.href
            : location.pathname.startsWith(item.href);

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
                    isActive && "bg-primary text-primary-foreground shadow-md",
                    !isActive && "text-muted-foreground hover:bg-accent hover:text-foreground",
                    hoveredItem === item.name && !isActive && "scale-[1.02]"
                )}
            >
                {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-primary-foreground rounded-r-full" />
                )}

                <item.icon className={cn(
                    "w-[18px] h-[18px] flex-shrink-0 transition-transform duration-200",
                    hoveredItem === item.name && "rotate-6 scale-110"
                )} />

                {(!isCollapsed || isMobile) && (
                    <span>{item.name}</span>
                )}
            </NavLink>
        );

        if (!isMobile && isCollapsed) {
            return (
                <Tooltip key={item.name}>
                    <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                    <TooltipContent side="right" className="ml-2">
                        <p>{item.name}</p>
                    </TooltipContent>
                </Tooltip>
            );
        }

        return linkContent;
    };

    return (
        <TooltipProvider delayDuration={0}>
            {/* Mobile Overlay */}
            <div
                className={cn(
                    "fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300",
                    isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                )}
                onClick={onClose}
            />

            {/* Sidebar Container */}
            <div
                className={cn(
                    "fixed lg:relative inset-y-0 left-0 z-50 flex flex-col",
                    "transition-all duration-500 ease-in-out",
                    "bg-card border-r border-border",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
                    !isMobile && isCollapsed ? "lg:w-[75px]" : "w-56"
                )}
            >
                {/* Mobile Close */}
                <div className="border-b border-border px-4 py-4 lg:hidden">
                    <div className="flex items-center justify-end">
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Collapse Button */}
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "hidden lg:flex absolute h-6 w-6 rounded-full",
                        "bg-card border-border hover:bg-primary hover:border-primary",
                        "-right-3 top-[56px] z-[100]"
                    )}
                    onClick={onToggleCollapse}
                >
                    {isCollapsed ? (
                        <ChevronsRight className="w-3 h-3" />
                    ) : (
                        <ChevronsLeft className="w-3 h-3" />
                    )}
                </Button>

                {/* Header */}
                <div className={cn(
                    "border-b border-border",
                    !isMobile && isCollapsed ? "px-2.5 py-4" : "px-3.5 py-4"
                )}>
                    <div className={cn(
                        "flex items-center gap-3",
                        !isMobile && isCollapsed && "flex-col justify-center"
                    )}>
                        <div className="p-2 bg-primary/10 rounded-lg">
                            <Shield className="w-6 h-6 text-primary" />
                        </div>
                        {(!isCollapsed || isMobile) && (
                            <div>
                                <h1 className="text-[15px] font-bold text-foreground">Super Admin</h1>
                                <p className="text-[11px] text-muted-foreground">FreightSynQ</p>
                            </div>
                        )}
                    </div>
                </div>

                <nav className={cn(
                    "flex-1 py-4 space-y-2 overflow-y-auto",
                    !isMobile && isCollapsed ? "px-2.5" : "px-3.5"
                )}>
                    {navigation.map((item, index) => renderNavLink(item, index))}
                </nav>
            </div>
        </TooltipProvider>
    );
};
