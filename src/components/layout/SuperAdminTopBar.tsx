// src/components/layout/SuperAdminTopBar.tsx - UPDATED
import { Bell, Menu, Sun, Moon, LogOut, Shield, Maximize2, Minimize2 } from "lucide-react";
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
import { useLocation } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface SuperAdminTopBarProps {
    onMenuClick?: () => void;
}

// Super Admin page titles
const getPageInfo = (pathname: string) => {
    const routes: Record<string, { title: string; description?: string }> = {
        '/super-admin': {
            title: 'Welcome to FreightSynQ', // ✅ CHANGED
            description: 'System overview and management'
        },
        '/super-admin/invites': {
            title: 'Create Invites',
            description: 'Generate company invitation codes'
        },
        '/super-admin/companies': {
            title: 'Manage Companies',
            description: 'View and manage all registered companies'
        },
        '/super-admin/stats': {
            title: 'System Statistics',
            description: 'Detailed analytics and system metrics'
        }
    };

    return routes[pathname] || { title: 'Super Admin', description: 'System management' };
};

export const SuperAdminTopBar = ({ onMenuClick }: SuperAdminTopBarProps) => {
    const { user, signOut } = useAuth();
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
                await document.documentElement.requestFullscreen();
                setIsFullscreen(true);
            } else {
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
                description: "You have been logged out of super admin",
            });
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to sign out",
                variant: "destructive",
            });
        }
    };

    // Get first 2 letters of email for avatar
    const getInitials = () => {
        if (!user?.email) return 'SA';
        return user.email.substring(0, 2).toUpperCase();
    };

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

                    {/* Page Title with Super Admin Badge */}
                    <div className="flex-1 min-w-0 pl-2 sm:pl-4 lg:pl-4">
                        <div className="flex items-center gap-3">
                            <h1 className="text-xl sm:text-2xl font-bold text-foreground font-inter truncate leading-tight">
                                {pageInfo.title}
                            </h1>
                            <Badge
                                className="bg-primary text-primary-foreground border-0 hidden sm:inline-flex"
                                variant="default"
                            >
                                <Shield className="w-3 h-3 mr-1" />
                                SUPER ADMIN
                            </Badge>
                        </div>
                        {pageInfo.description && (
                            <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 hidden sm:block leading-tight truncate">
                                {pageInfo.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 sm:space-x-3 shrink-0">

                    {/* 1. Theme Toggle */}
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

                    {/* 2. Fullscreen Toggle */}
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

                    {/* 3. System Alerts (instead of regular notifications) */}
                    <Button
                        variant="ghost"
                        size="icon"
                        className="relative hover:bg-accent dark:hover:bg-secondary"
                    >
                        <Bell className="w-5 h-5" />
                        {/* Show if there are critical system alerts */}
                        <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                    </Button>

                    {/* 4. Super Admin Profile Menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                className="flex items-center space-x-2 hover:bg-accent dark:hover:bg-secondary"
                            >
                                {/* Avatar with SA badge */}
                                <div className="w-8 h-8 bg-gradient-to-br from-primary to-purple-600 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-bold text-primary-foreground">
                                        {getInitials()}
                                    </span>
                                </div>
                                <div className="text-left hidden sm:block">
                                    <span className="text-sm font-medium text-foreground block">
                                        FreightSynQ
                                    </span>
                                    <p className="text-xs text-muted-foreground truncate max-w-[150px]" title={user?.email}>
                                        {user?.email}
                                    </p>
                                </div>
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            align="end"
                            className="w-56 bg-card border-border"
                        >
                            <div className="px-2 py-1.5">
                                <div className="flex items-center gap-2 mb-1">
                                    <Shield className="w-4 h-4 text-primary" />
                                    <span className="text-xs font-semibold text-primary uppercase">
                                        Super Admin Access
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {user?.email}
                                </p>
                            </div>
                            <DropdownMenuSeparator className="bg-border" />
                            <DropdownMenuItem
                                className="text-destructive hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer"
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