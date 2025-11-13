// TopBar.tsx - With Large Page Titles
import { Bell, Search, Settings, User, LogOut, Menu, Sun, Moon, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "react-router";
import { useState, useEffect } from "react";

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
    '/profile': {
      title: 'User Profile',
      description: 'Manage your account settings and preferences'
    },
    '/company-profile': {
      title: 'Company Profile',
      description: 'Manage company information and settings'
    },
    '/settings': {
      title: 'Settings',
      description: 'Configure system preferences and options'
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

  return (
    <header className="bg-background border-b border-gray-200 dark:border-gray-800">
      <div className="flex items-center justify-between pr-4 lg:pr-8 py-4">
        {/* Left Side - Menu + Page Title */}
        <div className="flex items-center flex-1">
          {/* Hamburger Menu for Mobile */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden shrink-0 ml-2"
            onClick={onMenuClick}
          >
            <Menu className="w-5 h-5" />
          </Button>

          {/* Page Title - Aligned with main content */}
          <div className="flex-1 min-w-0 pl-2 sm:pl-4 lg:pl-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground font-inter truncate">
              {pageInfo.title}
            </h1>
            {pageInfo.description && (
              <p className="text-sm sm:text-base text-muted-foreground mt-0 hidden sm:block">
                {pageInfo.description}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">
          {/* Mobile Search Icon */}
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Search className="w-5 h-5" />
          </Button>

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="theme-toggle"
            aria-label="Toggle theme"
          >
            <div className="theme-toggle-slider">
              {theme === 'dark' ? (
                <Moon className="theme-toggle-icon" />
              ) : (
                <Sun className="theme-toggle-icon" />
              )}
            </div>
          </button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="topbar-notification-badge flex items-center justify-center">
              <span className="text-[10px] sm:text-xs text-destructive-foreground font-bold hidden sm:block">3</span>
            </span>
          </Button>

          {/* Profile Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2">
                <div className="topbar-avatar">
                  <span className="topbar-avatar-text">
                    {userProfile?.name?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="text-left hidden sm:block">
                  <span className="text-sm font-medium">{userProfile?.name || 'User'}</span>
                  <p className="text-xs text-muted-foreground">{company?.name}</p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center">
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </Link>
              </DropdownMenuItem>
              {(userProfile?.role === 'admin' || userProfile?.role === 'manager') && (
                <DropdownMenuItem asChild>
                  <Link to="/company-profile" className="flex items-center">
                    <Building2 className="w-4 h-4 mr-2" />
                    Company Profile
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={handleSignOut}>
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