// src/contexts/AuthContext.tsx
import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";

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
  access_level?: "FREE" | "FULL"; // ✅ NEW
}

interface AuthContextType {
  user: User | null;
  userProfile: UserProfile | null;
  company: Company | null;
  accessLevel: "FREE" | "FULL" | null; // ✅ NEW
  isSuperAdmin: boolean;
  loading: boolean;
  signUp: (
    email: string,
    password: string,
    userData: SignUpData
  ) => Promise<any>;
  signIn: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

interface SignUpData {
  companyName: string;
  userName: string;
  userPhone: string;
  username: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Get super admin emails from env
const getSuperAdminEmails = (): string[] => {
  const emails = import.meta.env.VITE_SUPER_ADMIN_EMAILS || "";
  return emails
    .split(",")
    .map((email: string) => email.trim())
    .filter(Boolean);
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [accessLevel, setAccessLevel] = useState<"FREE" | "FULL" | null>(null); // ✅ NEW
  const [loading, setLoading] = useState(true);

  // Calculate super admin status
  const isSuperAdmin = !!(
    user && getSuperAdminEmails().includes(user.email || "")
  );

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
      console.error("Cache error:", error);
    }
  };

  const fetchUserData = async (userId: string, useCache = true) => {
    console.log("Starting fetchUserData for:", userId);

    // Check cache first
    if (useCache) {
      const cachedData = getCachedUserData(userId);
      if (cachedData) {
        console.log("Using cached user data:", cachedData);
        setUserProfile(cachedData.profile);
        if (cachedData.company) {
          setCompany(cachedData.company);
          setAccessLevel(cachedData.company.access_level || "FREE"); // ✅ NEW
        }
        setLoading(false);
      }
    }

    try {
      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (profileError) {
        throw profileError;
      }

      if (profile) {
        console.log("Profile fetched:", profile);
        setUserProfile(profile);

        let companyData = null;
        if (profile.company_id) {
          const { data, error: companyError } = await supabase
            .from("companies")
            .select("*")
            .eq("id", profile.company_id)
            .single();

          if (!companyError && data) {
            setCompany(data);
            setAccessLevel(data.access_level || "FREE"); // ✅ NEW
            companyData = data;
            console.log("Company access level:", data.access_level); // ✅ Debug log
          }
        }

        setCachedUserData(userId, {
          profile,
          company: companyData,
        });
      } else {
        // Handle Super Admin Case
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser && getSuperAdminEmails().includes(authUser.email || "")) {
          console.log("Super Admin detected, creating placeholder");
          const superAdminProfile = {
            id: userId,
            email: authUser.email,
            name: "Super Admin",
            role: "admin",
            company_id: "",
            created_at: new Date().toISOString(),
          };
          setUserProfile(superAdminProfile);
          setAccessLevel("FULL"); // ✅ Super admin always has FULL
        }
      }
    } catch (error) {
      console.error("fetchUserData error:", error);
      const cachedData = getCachedUserData(userId);
      if (!cachedData) {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();
        if (authUser && getSuperAdminEmails().includes(authUser.email || "")) {
          setUserProfile({
            id: userId,
            email: authUser.email,
            name: "Super Admin",
            role: "admin",
            company_id: "",
          });
          setAccessLevel("FULL");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    console.log("Refreshing user profile...");
    if (user?.id) {
      // Clear cache to force fresh fetch
      localStorage.removeItem(`user_${user.id}`);
      await fetchUserData(user.id, false);
    }
  };

  useEffect(() => {
    let mounted = true;
    let isInitialized = false;

    const initializeAuth = async () => {
      console.log("Initializing auth...");

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          console.log("Session found:", session.user.id);
          setUser(session.user);
          await fetchUserData(session.user.id);
        } else {
          console.log("No session found");
          setUser(null);
          setUserProfile(null);
          setCompany(null);
          setAccessLevel(null); // ✅ NEW
          setLoading(false);
        }

        isInitialized = true;
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event, "Initialized:", isInitialized);

      if (!mounted) return;

      if (event === "SIGNED_IN" && session?.user && isInitialized) {
        if (user?.id !== session.user.id) {
          console.log("Different user signed in");
          setUser(session.user);
          setLoading(true);
          await fetchUserData(session.user.id);
        } else {
          console.log("Same user, skipping refetch");
        }
      } else if (event === "SIGNED_OUT") {
        console.log("User signed out");
        setUser(null);
        setUserProfile(null);
        setCompany(null);
        setAccessLevel(null); // ✅ NEW
        setLoading(false);
        if (user?.id) {
          localStorage.removeItem(`user_${user.id}`);
        }
      } else if (event === "TOKEN_REFRESHED") {
        console.log("Token refreshed, no action needed");
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [user?.id]);

  const signUp = async (
    email: string,
    password: string,
    userData: SignUpData
  ) => {
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) throw authError;

      if (authData.user) {
        const { error: setupError } = await supabase.rpc("setup_new_company", {
          p_company_name: userData.companyName,
          p_user_email: email,
          p_user_name: userData.userName,
          p_user_phone: userData.userPhone,
          p_username: userData.username,
        });

        if (setupError) throw setupError;
        return { data: authData, error: null };
      }
    } catch (error) {
      console.error("Signup error:", error);
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
      console.error("Sign in error:", error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      if (user?.id) {
        localStorage.removeItem(`user_${user.id}`);
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Signout error:", error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        company,
        accessLevel, // ✅ NEW
        isSuperAdmin,
        loading,
        signUp,
        signIn,
        signOut,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
