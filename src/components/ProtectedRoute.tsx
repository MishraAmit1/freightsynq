import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
    children: ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return <>{children}</>;
};
// In ProtectedRoute.tsx - Add role check
export const AdminRoute = ({ children }: { children: ReactNode }) => {
    const { user, userProfile, loading } = useAuth();

    if (loading) {
        return <h1>Loadiing ho raha hai </h1>
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (userProfile?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};

// Then in App.tsx
