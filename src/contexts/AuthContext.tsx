// AuthContext.tsx - Complete updated code
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    email: string;
    name: string;
    phone?: string;
    role: string;
    company_id: string;
    created_at?: string;
    updated_at?: string;
}

interface Company {
    id: string;
    name: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    state?: string;
    pincode?: string;
    gstin?: string;
    pan?: string;
}

interface AuthContextType {
    user: User | null;
    userProfile: UserProfile | null;
    company: Company | null;
    loading: boolean;
    signUp: (email: string, password: string, userData: SignUpData) => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
    refreshUserProfile: () => Promise<void>; // Added this
}

interface SignUpData {
    companyName: string;
    userName: string;
    userPhone: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [company, setCompany] = useState<Company | null>(null);
    const [loading, setLoading] = useState(true);

    // Cache user data in localStorage
    const getCachedUserData = (userId: string) => {
        try {
            const cached = localStorage.getItem(`user_${userId}`);
            return cached ? JSON.parse(cached) : null;
        } catch {
            return null;
        }
    };

    const setCachedUserData = (userId: string, userData: any) => {
        try {
            localStorage.setItem(`user_${userId}`, JSON.stringify(userData));
        } catch (error) {
            console.error('Cache error:', error);
        }
    };

    const fetchUserData = async (userId: string, useCache = true) => {
        console.log('Starting fetchUserData for:', userId);

        // Use cached data first if available
        if (useCache) {
            const cachedData = getCachedUserData(userId);
            if (cachedData) {
                console.log('Using cached user data:', cachedData);
                setUserProfile(cachedData.profile);
                if (cachedData.company) setCompany(cachedData.company);
                setLoading(false);

                // Fetch fresh data in background
                setTimeout(() => fetchUserData(userId, false), 100);
                return;
            }
        }

        try {
            // Fetch complete user profile
            const { data: profile, error: profileError } = await supabase
                .from('users')
                .select('*')
                .eq('id', userId)
                .single();

            if (profileError) {
                console.error('Profile fetch error:', profileError);
                throw profileError;
            }

            console.log('Profile fetched:', profile);
            setUserProfile(profile);

            let companyData = null;
            // Fetch company data if exists
            if (profile?.company_id) {
                const { data, error: companyError } = await supabase
                    .from('companies')
                    .select('*')
                    .eq('id', profile.company_id)
                    .single();

                if (!companyError && data) {
                    setCompany(data);
                    companyData = data;
                    console.log('Company data fetched:', data);
                }
            }

            // Cache the data
            setCachedUserData(userId, {
                profile,
                company: companyData
            });

        } catch (error) {
            console.error('fetchUserData error:', error);

            // Use cached data as fallback
            const cachedData = getCachedUserData(userId);
            if (cachedData) {
                console.log('Using cached data as fallback');
                setUserProfile(cachedData.profile);
                if (cachedData.company) setCompany(cachedData.company);
            } else {
                // Last resort fallback
                setUserProfile({
                    id: userId,
                    name: 'User',
                    email: user?.email || '',
                    role: 'operator',
                    company_id: ''
                });
            }
        } finally {
            setLoading(false);
        }
    };

    // Add refreshUserProfile function
    const refreshUserProfile = async () => {
        console.log('Refreshing user profile...');
        if (user?.id) {
            // Force refresh without cache
            await fetchUserData(user.id, false);
        }
    };

    useEffect(() => {
        let mounted = true;
        let isInitialized = false;

        const initializeAuth = async () => {
            console.log('Initializing auth...');

            try {
                const { data: { session } } = await supabase.auth.getSession();

                if (!mounted) return;

                if (session?.user) {
                    console.log('Session found:', session.user.id);
                    setUser(session.user);
                    await fetchUserData(session.user.id);
                } else {
                    console.log('No session found');
                    setUser(null);
                    setUserProfile(null);
                    setCompany(null);
                    setLoading(false);
                }

                isInitialized = true;
            } catch (error) {
                console.error('Auth initialization error:', error);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        initializeAuth();

        // Auth state change listener
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('Auth state changed:', event, 'Initialized:', isInitialized);

                if (!mounted) return;

                // Only handle these events after initialization
                if (event === 'SIGNED_IN' && session?.user && isInitialized) {
                    // Check if it's the same user
                    if (user?.id !== session.user.id) {
                        console.log('Different user signed in');
                        setUser(session.user);
                        setLoading(true);
                        await fetchUserData(session.user.id);
                    } else {
                        console.log('Same user, skipping refetch');
                    }
                } else if (event === 'SIGNED_OUT') {
                    console.log('User signed out');
                    setUser(null);
                    setUserProfile(null);
                    setCompany(null);
                    setLoading(false);
                    // Clear cache
                    if (user?.id) {
                        localStorage.removeItem(`user_${user.id}`);
                    }
                } else if (event === 'TOKEN_REFRESHED') {
                    console.log('Token refreshed, no action needed');
                }
            }
        );

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, [user?.id]);

    const signUp = async (email: string, password: string, userData: SignUpData) => {
        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: setupError } = await supabase.rpc('setup_new_company', {
                    p_company_name: userData.companyName,
                    p_user_email: email,
                    p_user_name: userData.userName,
                    p_user_phone: userData.userPhone
                });

                if (setupError) throw setupError;
                return { data: authData, error: null };
            }
        } catch (error) {
            console.error('Signup error:', error);
            return { data: null, error };
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            return { data, error: null };
        } catch (error) {
            console.error('Sign in error:', error);
            return { data: null, error };
        }
    };

    const signOut = async () => {
        try {
            // Clear cache before signing out
            if (user?.id) {
                localStorage.removeItem(`user_${user.id}`);
            }

            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Signout error:', error);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            company,
            loading,
            signUp,
            signIn,
            signOut,
            refreshUserProfile, // Added this
        }}>
            {children}
        </AuthContext.Provider>
    );
};