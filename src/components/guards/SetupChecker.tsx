// src/components/guards/SetupChecker.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

interface SetupCheckerProps {
    children: React.ReactNode;
}

export const SetupChecker = ({ children }: SetupCheckerProps) => {
    const { user } = useAuth();
    const [checking, setChecking] = useState(true);
    const [hasCompany, setHasCompany] = useState<boolean | null>(null);

    useEffect(() => {
        if (user) {
            checkSetup();
        } else {
            setChecking(false);
        }
    }, [user]);

    const checkSetup = async () => {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user!.id)
                .single();

            if (error || !data) {
                setHasCompany(false);
            } else {
                setHasCompany(!!data.company_id);
            }
        } catch (err) {
            console.error('Setup check error:', err);
            setHasCompany(false);
        } finally {
            setChecking(false);
        }
    };

    if (checking) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (user && hasCompany === false) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-background">
                <Card className="max-w-md w-full mx-4">
                    <CardContent className="p-6 text-center space-y-4">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
                            <AlertTriangle className="w-8 h-8 text-orange-600" />
                        </div>

                        <h2 className="text-xl font-bold text-destructive">
                            Setup Incomplete
                        </h2>

                        <p className="text-muted-foreground">
                            Your account exists but company setup is missing.
                            Please complete your registration.
                        </p>

                        <div className="bg-muted p-3 rounded-lg">
                            <p className="text-sm text-muted-foreground">
                                Email: <span className="font-medium">{user?.email}</span>
                            </p>
                        </div>

                        <div className="space-y-2 pt-4">
                            <Button
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = '/signup';
                                }}
                                className="w-full"
                            >
                                Complete Registration
                            </Button>

                            <Button
                                onClick={async () => {
                                    await supabase.auth.signOut();
                                    window.location.href = '/login';
                                }}
                                variant="outline"
                                className="w-full"
                            >
                                Back to Login
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return <>{children}</>;
};