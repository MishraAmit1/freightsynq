// src/components/layout/SuperAdminTopBar.tsx
import {
  Bell,
  Menu,
  Sun,
  Moon,
  LogOut,
  Shield,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useNavigate } from "react-router-dom"; // ✅ Added useNavigate
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { getRequestCounts } from "@/api/access-requests"; // ✅ Import API

interface SuperAdminTopBarProps {
  onMenuClick?: () => void;
}

// Super Admin page titles
const getPageInfo = (pathname: string) => {
  const routes: Record<string, { title: string; description?: string }> = {
    "/super-admin": {
      title: "Welcome to FreightSynQ",
      description: "System overview and management",
    },
    "/super-admin/access-requests": {
      // ✅ Added Title for new page
      title: "Access Requests",
      description: "Manage user access approvals",
    },
    "/super-admin/invites": {
      title: "Create Invites",
      description: "Generate company invitation codes",
    },
    "/super-admin/companies": {
      title: "Manage Companies",
      description: "View and manage all registered companies",
    },
    "/super-admin/stats": {
      title: "System Statistics",
      description: "Detailed analytics and system metrics",
    },
  };

  return (
    routes[pathname] || {
      title: "Super Admin",
      description: "System management",
    }
  );
};

export const SuperAdminTopBar = ({ onMenuClick }: SuperAdminTopBarProps) => {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate(); // ✅ Hook for navigation

  const pageInfo = getPageInfo(location.pathname);
  const [pendingCount, setPendingCount] = useState(0); // ✅ State for count

  // Theme & Fullscreen logic...
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme as "light" | "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // ✅ FETCH PENDING REQUESTS COUNT
  useEffect(() => {
    const fetchCount = async () => {
      try {
        const counts = await getRequestCounts();
        setPendingCount(counts.pending);
      } catch (error) {
        console.error("Failed to fetch notification count", error);
      }
    };

    fetchCount();

    // Optional: Poll every 30 seconds to keep updated
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Fullscreen effect...
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () =>
    setTheme((prev) => (prev === "light" ? "dark" : "light"));

  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error("Fullscreen error");
    }
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({ title: "Signed out successfully" });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  const getInitials = () =>
    user?.email ? user.email.substring(0, 2).toUpperCase() : "SA";

  return (
    <header className="bg-background border-b border-border">
      <div className="flex items-center justify-between pr-4 lg:pr-8 py-4">
        {/* Left Side */}
        <div className="flex items-center flex-1">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 ml-2"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <div className="flex-1 min-w-0 pl-2 sm:pl-4 lg:pl-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-bold text-foreground font-inter truncate leading-tight">
                {pageInfo.title}
              </h1>
              <Badge className="bg-primary text-primary-foreground border-0 hidden sm:inline-flex">
                <Shield className="w-3 h-3 mr-1" />
                SUPER ADMIN
              </Badge>
            </div>
            {pageInfo.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block">
                {pageInfo.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={cn(
              "relative w-14 h-7 rounded-full transition-all duration-300 cursor-pointer",
              theme === "dark" ? "bg-primary/20" : "bg-muted"
            )}
          >
            <div
              className={cn(
                "absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 shadow-md flex items-center justify-center",
                theme === "dark"
                  ? "left-[1.75rem] bg-primary"
                  : "left-0.5 bg-white"
              )}
            >
              {theme === "dark" ? (
                <Moon className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Sun className="w-4 h-4 text-foreground" />
              )}
            </div>
          </button>

          {/* Fullscreen */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden sm:flex"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </Button>

          {/* ✅ NOTIFICATIONS BELL (Updated) */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-accent dark:hover:bg-secondary"
            onClick={() => navigate("/super-admin/access-requests")} // ✅ Navigate on click
          >
            <Bell className="w-5 h-5" />

            {/* ✅ Show Badge if Pending Count > 0 */}
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm animate-in zoom-in">
                {pendingCount > 9 ? "9+" : pendingCount}
              </span>
            )}
          </Button>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-sm font-bold text-primary-foreground">
                    {getInitials()}
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-sm font-medium text-foreground block">
                    FreightSynQ
                  </span>
                  <p className="text-xs text-muted-foreground truncate max-w-[150px]">
                    {user?.email}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-2 py-1.5">
                <div className="flex items-center gap-2 mb-1">
                  <Shield className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase">
                    Super Admin Access
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
