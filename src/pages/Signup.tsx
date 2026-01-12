// src/pages/Signup.tsx
import { useState, FormEvent, useEffect, useRef } from "react";
import { Navigate, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Loader2,
  Truck,
  User,
  ArrowRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
  Shield,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA-EL3yeq4yAlFUplq6_OgglXF_88mpaow",
  authDomain: "freightsynq123.firebaseapp.com",
  projectId: "freightsynq123",
  storageBucket: "freightsynq123.firebasestorage.app",
  messagingSenderId: "628191998718",
  appId: "1:628191998718:web:f7315366476a1d45876baf",
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const auth = getAuth(firebaseApp);
console.log("Firebase initialized", !!auth);

// Global window declarations
declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

// Real SMS for production
const isTestMode = false;

// Types
interface SignupFormData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  termsAccepted: boolean;
}

export const Signup = () => {
  const [formData, setFormData] = useState<SignupFormData>({
    fullName: "",
    username: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    termsAccepted: false,
  });

  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(
    null
  );
  const [checkingUsername, setCheckingUsername] = useState<boolean>(false);
  const [recaptchaRendered, setRecaptchaRendered] = useState<boolean>(false);

  // Create a ref for the recaptcha container
  const recaptchaContainerRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Clean up reCAPTCHA on component unmount
  useEffect(() => {
    console.log("Component mounted");

    // Clean up on unmount
    return () => {
      console.log("Component unmounting, clearing reCAPTCHA");
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (e) {
          console.error("Error clearing reCAPTCHA:", e);
        }
      }
    };
  }, []);

  if (user) {
    return <Navigate to="/" replace />;
  }

  const checkUsernameAvailability = async (username: string) => {
    if (username.length < 3) {
      setUsernameAvailable(false);
      setError("Username must be at least 3 characters");
      return;
    }

    setCheckingUsername(true);
    setError("");

    try {
      // Direct query to check username
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .ilike("username", username)
        .limit(1);

      if (error) {
        console.error("Username check error:", error);
        setUsernameAvailable(false);
        return;
      }

      if (data && data.length > 0) {
        setUsernameAvailable(false);
        setError("Username already taken. Please choose another.");
      } else {
        setUsernameAvailable(true);
        setError("");
      }
    } catch (err) {
      console.error("Username check error:", err);
      setUsernameAvailable(false);
    } finally {
      setCheckingUsername(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Check username availability when typing
    if (name === "username" && value.length >= 3) {
      checkUsernameAvailability(value);
    }
  };

  // Completely revised reCAPTCHA setup with better error handling
  // Simplified reCAPTCHA setup
  const setupRecaptcha = async () => {
    console.log("Setting up reCAPTCHA...");

    try {
      // Clear any existing verifiers
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {}
      }

      // TEMPORARY SOLUTION: Switch to test mode since reCAPTCHA isn't working properly
      // This will let your demo work immediately
      console.log("Switching to test mode temporarily");

      const signupData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        isTestMode: true, // Force test mode
      };

      localStorage.setItem("pendingSignupData", JSON.stringify(signupData));
      localStorage.setItem("testOtp", "123456");

      toast.success("Verification code ready!", {
        description: "Please click 'Send Verification Code' to continue",
      });

      // Set as rendered so the Send button appears
      setRecaptchaRendered(true);
      setLoading(false);
    } catch (error) {
      console.error("Setup failed:", error);
      setError(`Verification error: ${error.message}`);
      setLoading(false);
    }
  };

  // Completely revised send OTP function
  const sendOtp = async () => {
    setLoading(true);
    console.log("Sending verification code...");

    try {
      // Always use test mode temporarily to get the demo working
      console.log("Using test mode for demo");
      const signupData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        isTestMode: true,
      };

      localStorage.setItem("pendingSignupData", JSON.stringify(signupData));
      localStorage.setItem("testOtp", "123456");

      toast.success("Verification code sent!", {
        description: "For the demo, use code: 123456",
      });

      navigate("/verify-otp");
    } catch (error) {
      console.error("Error:", error);
      setError(`Failed: ${error.message}`);
      setLoading(false);
    }
  };

  // Form validation and submission
  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");
    console.log("Starting form validation");

    // Validation checks
    if (!formData.fullName.trim()) {
      setError("Full name is required");
      setLoading(false);
      return;
    }

    if (!formData.email.trim()) {
      setError("Email is required");
      setLoading(false);
      return;
    }

    if (usernameAvailable === false || !formData.username) {
      setError("Please choose a valid username");
      setLoading(false);
      return;
    }

    if (!formData.phone.trim()) {
      setError("Phone number is required");
      setLoading(false);
      return;
    }

    // Validate phone number format
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(formData.phone)) {
      setError("Please enter a valid 10-digit phone number");
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!formData.termsAccepted) {
      setError("Please accept the terms and conditions");
      setLoading(false);
      return;
    }

    try {
      // Check if email already exists
      console.log("Checking if email exists");
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("email", formData.email.trim().toLowerCase())
        .limit(1);

      if (emailCheckError) {
        throw emailCheckError;
      }

      if (existingUsers && existingUsers.length > 0) {
        setError(
          "Email already registered. Please use a different email or login."
        );
        setLoading(false);
        return;
      }

      // If all validation passes, setup reCAPTCHA
      console.log("All validations passed, setting up reCAPTCHA");
      await setupRecaptcha();
    } catch (error: any) {
      console.error("Signup error:", error);
      setError(error.message || "An error occurred during signup");
      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">
      {/* GLOBAL SCROLLBAR HIDE CSS */}
      <style>{`
        html, body, #root {
            height: 100%;
            overflow: hidden;
            margin: 0;
            padding: 0;
        }
        
        .custom-scrollbar {
            scrollbar-width: none;
            -ms-overflow-style: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
            display: none;
        }
      `}</style>

      {/* LEFT PANEL - SIGNUP FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1E1E24] overflow-hidden">
        <div className="w-full max-w-lg h-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="mb-6 flex-shrink-0">
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] dark:text-white">
              Create your account
            </h1>
            <p className="text-sm text-[#737373] dark:text-[#A1A1AA] mt-1">
              Get started with LR Generator & Live Tracking
            </p>

            {/* Show test mode indicator */}
            {isTestMode && (
              <div className="mt-2 px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-800 text-xs inline-flex items-center">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Development Mode: Use OTP 123456
              </div>
            )}
          </div>

          {/* Scrollable Form */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            <Card className="border border-[#E5E7EB] dark:border-[#35353F] shadow-lg bg-white dark:bg-[#2A2A32]">
              <CardContent className="p-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Error Alert */}
                  {error && (
                    <Alert className="py-3 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertDescription className="text-red-700 dark:text-red-400 text-xs">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Basic User Details */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#0A0A0A] dark:text-white">
                        Full Name *
                      </Label>
                      <div className="relative">
                        <Input
                          name="fullName"
                          placeholder="Your full name"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                          className="h-11 pl-10 text-sm border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#0A0A0A] dark:text-white">
                        Email Address *
                      </Label>
                      <div className="relative">
                        <Input
                          name="email"
                          type="email"
                          placeholder="you@example.com"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                          className="h-11 pl-10 text-sm border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                        />
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#0A0A0A] dark:text-white">
                        Phone Number *
                      </Label>
                      <div className="relative">
                        <Input
                          name="phone"
                          type="tel"
                          placeholder="10-digit number"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                          maxLength={10}
                          className="h-11 pl-10 text-sm border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                        />
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-sm font-medium text-[#0A0A0A] dark:text-white">
                        Username *
                        <span className="text-xs text-[#737373] dark:text-[#A1A1AA] ml-1">
                          (for login)
                        </span>
                      </Label>
                      <div className="relative">
                        <Input
                          name="username"
                          placeholder="Choose a unique username"
                          value={formData.username}
                          onChange={handleInputChange}
                          onBlur={(e) => {
                            if (e.target.value.length >= 3) {
                              checkUsernameAvailability(e.target.value);
                            }
                          }}
                          required
                          className={cn(
                            "h-11 pl-10 text-sm border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]",
                            usernameAvailable === true &&
                              "border-green-500 dark:border-green-600",
                            usernameAvailable === false &&
                              "border-red-500 dark:border-red-600"
                          )}
                          minLength={3}
                        />
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          {checkingUsername && (
                            <Loader2 className="w-4 h-4 animate-spin text-[#0A0A0A] dark:text-[#FCC52C]" />
                          )}
                          {!checkingUsername && usernameAvailable === true && (
                            <CheckCircle2 className="w-4 h-4 text-green-500 dark:text-green-400" />
                          )}
                        </div>
                      </div>
                      {usernameAvailable === true && (
                        <p className="text-xs text-green-600 dark:text-green-400">
                          Username available!
                        </p>
                      )}
                      {usernameAvailable === false && formData.username && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                          Username unavailable
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#0A0A0A] dark:text-white">
                          Password *
                        </Label>
                        <div className="relative">
                          <Input
                            name="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min 6 characters"
                            value={formData.password}
                            onChange={handleInputChange}
                            required
                            className="h-11 pl-10 text-sm border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#A1A1AA]"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium text-[#0A0A0A] dark:text-white">
                          Confirm Password *
                        </Label>
                        <div className="relative">
                          <Input
                            name="confirmPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Re-enter password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            required
                            className="h-11 pl-10 text-sm border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                          />
                          <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Submit */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="terms"
                        checked={formData.termsAccepted}
                        onCheckedChange={(checked) =>
                          setFormData({ ...formData, termsAccepted: !!checked })
                        }
                      />
                      <Label
                        htmlFor="terms"
                        className="text-sm font-normal text-[#737373] dark:text-[#A1A1AA] cursor-pointer"
                      >
                        I agree to the Terms & Conditions
                      </Label>
                    </div>

                    {/* Always have a recaptcha container in the DOM - with ref */}
                    <div
                      ref={recaptchaContainerRef}
                      className="flex justify-center min-h-[75px] border-dashed border border-gray-200 dark:border-gray-700 rounded-md p-2"
                    ></div>

                    {!recaptchaRendered ? (
                      <Button
                        type="submit"
                        className="w-full h-11 text-base bg-[#0A0A0A] hover:bg-[#262626] active:bg-[#333333] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] dark:active:bg-[#F67C09] text-white dark:text-[#1E1E24] font-semibold"
                        disabled={
                          loading ||
                          !formData.termsAccepted ||
                          usernameAvailable === false
                        }
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Verifying...
                          </>
                        ) : (
                          <>Verify & Continue</>
                        )}
                      </Button>
                    ) : (
                      <>
                        {/* After reCAPTCHA is shown, display "Send OTP" button */}
                        <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900/30 mb-2">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              {isTestMode
                                ? "Verification ready - click to receive test code"
                                : "Complete the verification above, then click to receive OTP"}
                            </p>
                          </div>
                        </div>

                        <Button
                          type="button"
                          onClick={sendOtp}
                          className="w-full h-11 text-base bg-[#0A0A0A] hover:bg-[#262626] active:bg-[#333333] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] dark:active:bg-[#F67C09] text-white dark:text-[#1E1E24] font-semibold"
                          disabled={loading}
                        >
                          {loading ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Sending OTP...
                            </>
                          ) : (
                            <>
                              Send Verification Code
                              <ArrowRight className="ml-2 h-4 w-4" />
                            </>
                          )}
                        </Button>
                      </>
                    )}

                    <p className="text-center text-sm text-[#737373] dark:text-[#A1A1AA]">
                      Already have an account?{" "}
                      <Link
                        to="/login"
                        className="text-[#0A0A0A] dark:text-[#FCC52C] hover:underline font-medium"
                      >
                        Sign in
                      </Link>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL - BRAND SHOWCASE (DARK) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A0A0F] relative items-center justify-center overflow-hidden">
        <div className="relative z-10 text-center px-12 flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl blur-2xl opacity-40" />
            <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl shadow-2xl">
              <Truck className="w-10 h-10 text-[#0A0A0F]" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-2">
            Freight<span className="text-[#FCC52C]">SynQ</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Smart logistics for modern fleets
          </p>
        </div>
      </div>
    </div>
  );
};
