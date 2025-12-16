// src/components/FreeAccessRoute.tsx
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { toast } from "sonner";

interface FreeAccessRouteProps {
  children: React.ReactNode;
}

/**
 * Route protection for FULL access only features
 * FREE users will be redirected to dashboard with a message
 */
export const FreeAccessRoute = ({ children }: FreeAccessRouteProps) => {
  const { user, accessLevel, isSuperAdmin, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Show toast when FREE user tries to access locked feature
    if (!loading && user && accessLevel === "FREE" && !isSuperAdmin) {
      toast.error("Full Access Required", {
        description:
          "This feature is only available with Full Access. Contact sales@freightsynq.com",
        duration: 5000,
      });
    }
  }, [loading, user, accessLevel, isSuperAdmin, location.pathname]);

  // Show loading spinner
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Not logged in - redirect to login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super admin - always allow
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // FULL access - allow
  if (accessLevel === "FULL") {
    return <>{children}</>;
  }

  // FREE access - redirect to dashboard
  return <Navigate to="/" replace />;
};
