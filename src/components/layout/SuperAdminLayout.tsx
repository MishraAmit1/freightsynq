// src/components/layout/SuperAdminLayout.tsx - UPDATED
import { ReactNode, useState, useEffect } from "react";
import { SuperAdminSidebar } from "./SuperAdminSidebar";
import { SuperAdminTopBar } from "./SuperAdminTopBar"; // ← Change this

interface SuperAdminLayoutProps {
    children: ReactNode;
}

export const SuperAdminLayout = ({ children }: SuperAdminLayoutProps) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
        const saved = localStorage.getItem('superAdminSidebarCollapsed');
        return saved ? JSON.parse(saved) : false;
    });

    useEffect(() => {
        localStorage.setItem('superAdminSidebarCollapsed', JSON.stringify(sidebarCollapsed));
    }, [sidebarCollapsed]);

    return (
        <div className="flex h-screen w-full bg-background overflow-hidden">
            {/* Super Admin Sidebar */}
            <SuperAdminSidebar
                isOpen={sidebarOpen}
                isCollapsed={sidebarCollapsed}
                onClose={() => setSidebarOpen(false)}
                onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
            />

            {/* Main Content */}
            <div className="flex flex-col flex-1 overflow-auto">
                <SuperAdminTopBar onMenuClick={() => setSidebarOpen(true)} /> {/* ← Use SuperAdminTopBar */}
                <main className="flex-1 bg-background -mt-[6px]">
                    <div className="h-full pl-2 sm:pl-4 pr-4 sm:pr-4 pt-4 sm:pt-6 pb-4 sm:pb-6">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    );
};