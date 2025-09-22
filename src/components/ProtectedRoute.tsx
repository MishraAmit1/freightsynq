import { ReactNode, useEffect, useState } from 'react';
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

// AdminRoute with better loading handling
export const AdminRoute = ({ children }: { children: ReactNode }) => {
    const { user, userProfile, loading } = useAuth();
    const [timeoutReached, setTimeoutReached] = useState(false);

    // Timeout after 15 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            setTimeoutReached(true);
        }, 15000);

        return () => clearTimeout(timer);
    }, []);

    // If timeout reached and still loading, show error
    if (timeoutReached && loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-500">Loading timeout. Please refresh the page.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="mt-4 px-4 py-2 bg-primary text-white rounded"
                    >
                        Refresh Page
                    </button>
                </div>
            </div>
        );
    }

    if (loading || (user && !userProfile)) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading user profile...</p>
                </div>
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (userProfile?.role !== 'admin') {
        return <Navigate to="/" replace />;
    }

    return <>{children}</>;
};