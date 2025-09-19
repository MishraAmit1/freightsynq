import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

interface AuthContextType {
    user: User | null;
    userProfile: any;
    company: any;
    loading: boolean;
    signUp: (email: string, password: string, userData: SignUpData) => Promise<any>;
    signIn: (email: string, password: string) => Promise<any>;
    signOut: () => Promise<void>;
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
    const [userProfile, setUserProfile] = useState<any>(null);
    const [company, setCompany] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const loadUserData = async (authUser: User) => {
        try {
            console.log('🔍 Loading user data for:', authUser.email, authUser.id);

            // Get user profile with timeout
            const profilePromise = supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            // Add timeout to prevent infinite loading
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Timeout loading user data')), 1000)
            );

            try {
                const { data: profile, error: profileError } = await Promise.race([
                    profilePromise,
                    timeoutPromise
                ]) as any;

                if (profileError) {
                    console.error('❌ Profile error:', profileError);
                    // Don't return - continue with null profile
                    setUserProfile(null);
                    setCompany(null);
                } else {
                    console.log('✅ User profile loaded:', profile);
                    setUserProfile(profile);

                    // Get company details if profile exists
                    if (profile?.company_id) {
                        const { data: companyData, error: companyError } = await supabase
                            .from('companies')
                            .select('*')
                            .eq('id', profile.company_id)
                            .single();

                        if (companyError) {
                            console.error('❌ Company error:', companyError);
                            setCompany(null);
                        } else {
                            console.log('✅ Company loaded:', companyData);
                            setCompany(companyData);
                        }
                    }
                }
            } catch (timeoutError) {
                console.error('⏱️ Timeout loading user data');
                setUserProfile(null);
                setCompany(null);
            }
        } catch (error) {
            console.error('❌ Load user data error:', error);
            setUserProfile(null);
            setCompany(null);
        }
    };

    useEffect(() => {
        let mounted = true;
        let initTimeout: NodeJS.Timeout;

        const initializeAuth = async () => {
            try {
                console.log('🔍 Initializing auth...');

                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error('❌ Session error:', error);
                    if (mounted) {
                        setLoading(false);
                    }
                    return;
                }

                if (!mounted) return;

                setUser(session?.user ?? null);
                console.log('🔍 Session found:', !!session);

                if (session?.user) {
                    await loadUserData(session.user);
                }

                if (mounted) {
                    console.log('✅ Auth initialization complete');
                    setLoading(false);
                }
            } catch (error) {
                console.error('❌ Init error:', error);
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        // Initialize with timeout fallback
        initTimeout = setTimeout(() => {
            if (mounted && loading) {
                console.log('⏱️ Force setting loading to false after timeout');
                setLoading(false);
            }
        }, 10000); // 10 second max timeout

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                console.log('🔄 Auth event:', event, session?.user?.email);

                if (!mounted) return;

                // Clear timeout on auth change
                if (initTimeout) {
                    clearTimeout(initTimeout);
                }

                setUser(session?.user ?? null);

                if (event === 'SIGNED_IN' && session?.user) {
                    setLoading(true); // Set loading while fetching user data
                    await loadUserData(session.user);
                    setLoading(false);
                } else if (event === 'SIGNED_OUT') {
                    setUserProfile(null);
                    setCompany(null);
                    setLoading(false);
                } else if (event === 'INITIAL_SESSION' && session?.user) {
                    // Don't set loading here as it's already handled in initializeAuth
                    await loadUserData(session.user);
                }

                // Ensure loading is false after auth change
                if (mounted) {
                    setLoading(false);
                }
            }
        );

        return () => {
            mounted = false;
            if (initTimeout) {
                clearTimeout(initTimeout);
            }
            subscription.unsubscribe();
        };
    }, []);

    const signUp = async (email: string, password: string, userData: SignUpData) => {
        try {
            console.log('🔧 Starting signup process...');

            // Step 1: Create auth user
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (authError) {
                console.error('❌ Auth signup error:', authError);
                throw authError;
            }

            console.log('✅ Auth user created:', authData.user?.id);

            if (authData.user) {
                // Step 2: Create company + user profile using RPC function
                console.log('🔧 Creating company and user profile...');

                const { data: setupData, error: setupError } = await supabase.rpc('setup_new_company', {
                    p_company_name: userData.companyName,
                    p_user_email: email,
                    p_user_name: userData.userName,
                    p_user_phone: userData.userPhone
                });

                if (setupError) {
                    console.error('❌ Setup company error:', setupError);
                    throw setupError;
                }

                console.log('✅ Company and user profile created:', setupData);

                return { data: authData, error: null };
            }
        } catch (error) {
            console.error('❌ Complete signup error:', error);
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
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    };

    // Debug log current state
    console.log('🔧 AuthContext State:', {
        user: !!user,
        userProfile: !!userProfile,
        company: !!company,
        loading
    });

    return (
        <AuthContext.Provider value={{
            user,
            userProfile,
            company,
            loading,
            signUp,
            signIn,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    );
};