// src/components/layout/TopBar.tsx - UPDATED (For Regular Users)
import { Bell, Search, Menu, Sun, Moon, Building2, LogOut, User, Maximize2, Minimize2 } from "lucide-react";
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
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";

interface TopBarProps {
  onMenuClick?: () => void;
}

// Page titles mapping with descriptions
const getPageInfo = (pathname: string) => {
  const routes: Record<string, { title: string; description?: string }> = {
    '/': {
      title: 'Dashboard Overview',
      description: "Welcome back! Here's your freight management overview"
    },
    '/dashboard': {
      title: 'Dashboard Overview',
      description: "Welcome back! Here's your freight management overview"
    },
    '/bookings': {
      title: 'Bookings Management',
      description: 'Track and manage all your freight bookings in one place'
    },
    '/bookings/create': {
      title: 'Create New Booking',
      description: 'Add a new freight booking to the system'
    },
    '/brokers': {
      title: 'Brokers Management',
      description: 'Manage your transport brokers and partners'
    },
    '/vehicles': {
      title: 'Vehicle Management',
      description: 'Manage your owned and hired vehicle fleet'
    },
    '/vehicles/owned': {
      title: 'Owned Vehicles',
      description: 'Manage your company-owned fleet'
    },
    '/vehicles/hired': {
      title: 'Hired Vehicles',
      description: 'Manage hired and contracted vehicles'
    },
    '/customers': {
      title: 'Customer Management',
      description: 'Manage consignors, consignees and business partners'
    },
    '/drivers': {
      title: 'Driver Management',
      description: 'Manage your vehicle drivers'
    },
    '/warehouses': {
      title: 'Warehouse Management',
      description: 'Manage warehouse operations and inventory across locations'
    },
    '/branches': {
      title: 'Branch Management',
      description: 'Manage company branches and their operations'
    },
    '/profile': {
      title: 'User Profile',
      description: 'Manage your account settings and preferences'
    },
    '/company-profile': {
      title: 'Company Profile',
      description: 'Manage company information and settings'
    },
    '/company-settings': {
      title: 'Company Settings',
      description: 'Configure company preferences and options'
    },
    '/reports': {
      title: 'Reports & Analytics',
      description: 'View detailed reports and business insights'
    }
  };

  // Handle dynamic routes
  if (pathname.startsWith('/bookings/') && pathname !== '/bookings/create') {
    return { title: 'Booking Details', description: 'View and manage booking information' };
  }
  if (pathname.startsWith('/vehicles/')) {
    return { title: 'Vehicle Details', description: 'View and manage vehicle information' };
  }
  if (pathname.startsWith('/customers/')) {
    return { title: 'Customer Details', description: 'View and manage customer information' };
  }

  return routes[pathname] || { title: 'Dashboard', description: 'Freight management system' };
};

// Helper function to get initials (2 characters)
const getInitials = (name: string | undefined): string => {
  if (!name) return 'US';

  const words = name.trim().split(' ').filter(Boolean);

  if (words.length >= 2) {
    // First letter of first two words
    return (words[0][0] + words[1][0]).toUpperCase();
  } else if (words.length === 1) {
    // First two letters of single word
    return words[0].substring(0, 2).toUpperCase();
  }

  return 'US';
};

// Helper function to truncate long names
const truncateName = (name: string | undefined, maxLength: number = 20): string => {
  if (!name) return 'User';
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

// Helper function to truncate company name
const truncateCompany = (name: string | undefined, maxLength: number = 25): string => {
  if (!name) return '';
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength) + '...';
};

export const TopBar = ({ onMenuClick }: TopBarProps) => {
  const { userProfile, company, signOut } = useAuth();
  const { toast } = useToast();
  const location = useLocation();

  const pageInfo = getPageInfo(location.pathname);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) return savedTheme as 'light' | 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  const [isFullscreen, setIsFullscreen] = useState(false);

  // Check fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        // Enter fullscreen
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        // Exit fullscreen
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (error) {
      console.error('Fullscreen error:', error);
      toast({
        title: "Fullscreen Error",
        description: "Could not toggle fullscreen mode",
        variant: "destructive",
      });
    }
  }, [toast]);

  const handleSignOut = async () => {
    try {
      await signOut();
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to sign out",
        variant: "destructive",
      });
    }
  };

  // Get user initials
  const userInitials = getInitials(userProfile?.name);

  return (
    <header className="bg-background border-b border-border">
      <div className="flex items-center justify-between pr-4 lg:pr-8 py-4">
        {/* Left Side - Menu + Page Title */}
        <div className="flex items-center flex-1">
          {/* Hamburger Menu for Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 ml-2 hover:bg-accent dark:hover:bg-secondary"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Page Title - Aligned with content */}
          <div className="flex-1 min-w-0 pl-2 sm:pl-4 lg:pl-4">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-inter truncate leading-tight">
              {pageInfo.title}
            </h1>
            {pageInfo.description && (
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block leading-tight truncate">
                {pageInfo.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">

          {/* 1. Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className={cn(
              "relative w-14 h-7 rounded-full transition-all duration-300 cursor-pointer",
              theme === 'dark'
                ? "bg-primary/20"
                : "bg-muted"
            )}
            aria-label="Toggle theme"
          >
            <div className={cn(
              "absolute top-0.5 w-6 h-6 rounded-full transition-all duration-300 shadow-md",
              "flex items-center justify-center",
              theme === 'dark'
                ? "left-[1.75rem] bg-primary"
                : "left-0.5 bg-white"
            )}>
              {theme === 'dark' ? (
                <Moon className="w-4 h-4 text-primary-foreground" />
              ) : (
                <Sun className="w-4 h-4 text-foreground" />
              )}
            </div>
          </button>

          {/* 2. Fullscreen Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleFullscreen}
            className="hidden sm:flex hover:bg-accent dark:hover:bg-secondary"
            title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5" />
            ) : (
              <Maximize2 className="w-5 h-5" />
            )}
          </Button>

          {/* 3. Notifications */}
          <Button
            variant="ghost"
            size="icon"
            className="relative hover:bg-accent dark:hover:bg-secondary"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-2 h-2 sm:w-3 sm:h-3 bg-destructive rounded-full animate-pulse">
              <span className="text-[10px] sm:text-xs text-white font-bold hidden sm:flex items-center justify-center">3</span>
            </span>
          </Button>

          {/* 4. Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 hover:bg-accent dark:hover:bg-secondary"
              >
                {/* Avatar with 2 character initials */}
                <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-primary-foreground">
                    {userInitials}
                  </span>
                </div>
                <div className="text-left hidden sm:block max-w-[150px]">
                  <span
                    className="text-sm font-medium text-foreground block truncate"
                    title={userProfile?.name}
                  >
                    {truncateName(userProfile?.name)}
                  </span>
                  <p
                    className="text-xs text-muted-foreground truncate"
                    title={company?.name}
                  >
                    {truncateCompany(company?.name)}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-56 bg-card border-border"
            >
              <DropdownMenuItem asChild>
                <Link
                  to="/profile"
                  className="flex items-center cursor-pointer hover:bg-accent dark:hover:bg-secondary"
                >
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                <DropdownMenuItem asChild>
                  <Link
                    to="/company-profile"
                    className="flex items-center cursor-pointer hover:bg-accent dark:hover:bg-secondary"
                  >
                    <Building2 className="w-4 h-4 mr-2" />
                    Company Profile
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator className="bg-border" />
              <DropdownMenuItem
                className="text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
                onClick={handleSignOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};