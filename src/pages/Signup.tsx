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

// Global declarations for TypeScript
declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA-EL3yeq4yAlFUplq6_OgglXF_88mpaow",
  authDomain: "freightsynq123.firebaseapp.com",
  projectId: "freightsynq123",
  storageBucket: "freightsynq123.firebasestorage.app",
  messagingSenderId: "628191998718",
  appId: "1:628191998718:web:f7315366476a1d45876baf",
};

// Initialize Firebase (exactly like the tutorial)
console.log("[INIT] Starting Firebase initialization");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
console.log("[INIT] Firebase initialized successfully:", !!auth);

// Set to false to enable real SMS
const isTestMode = false;
console.log("[CONFIG] Test Mode:", isTestMode);

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
  console.log("[RENDER] Signup component rendering");

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

  const navigate = useNavigate();
  const { user } = useAuth();

  // Clean up reCAPTCHA on component unmount
  useEffect(() => {
    console.log("[LIFECYCLE] Component mounted");

    return () => {
      console.log("[LIFECYCLE] Component unmounting, clearing reCAPTCHA");
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
          console.log("[RECAPTCHA] Successfully cleared verifier on unmount");
        } catch (e) {
          console.error("[RECAPTCHA] Error clearing verifier:", e);
        }
      }
    };
  }, []);

  if (user) {
    console.log("[AUTH] User already logged in, redirecting to home");
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
      console.log("[USERNAME] Checking availability for:", username);
      // Direct query to check username
      const { data, error } = await supabase
        .from("users")
        .select("id")
        .ilike("username", username)
        .limit(1);

      if (error) {
        console.error("[USERNAME] Check error:", error);
        setUsernameAvailable(false);
        return;
      }

      if (data && data.length > 0) {
        console.log("[USERNAME] Already taken");
        setUsernameAvailable(false);
        setError("Username already taken. Please choose another.");
      } else {
        console.log("[USERNAME] Available");
        setUsernameAvailable(true);
        setError("");
      }
    } catch (err) {
      console.error("[USERNAME] Error during check:", err);
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

  // reCAPTCHA setup matching the tutorial exactly
  const setupRecaptcha = async () => {
    console.log("[RECAPTCHA] Setting up...");

    try {
      // Clear any existing verifier
      if (window.recaptchaVerifier) {
        console.log("[RECAPTCHA] Clearing existing verifier");
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {
          console.warn("[RECAPTCHA] Failed to clear existing verifier:", err);
        }
      }

      console.log("[RECAPTCHA] Checking if container exists");
      const recaptchaContainer = document.getElementById("recaptcha-container");
      console.log("[RECAPTCHA] Container exists:", !!recaptchaContainer);

      if (!recaptchaContainer) {
        console.error("[RECAPTCHA] Container not found in DOM");
        throw new Error("reCAPTCHA container not found in DOM");
      }

      console.log("[RECAPTCHA] Creating new verifier with auth:", !!auth);

      // Create verifier exactly like the tutorial
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth, // First parameter: auth
        "recaptcha-container", // Second parameter: container ID
        {
          size: "invisible", // Use invisible like the tutorial
          callback: (response: string) => {
            console.log(
              "[RECAPTCHA] Verified successfully, response token exists:",
              !!response
            );
            console.log("[RECAPTCHA] Response token length:", response?.length);
            setRecaptchaRendered(true);
          },
          "expired-callback": () => {
            console.log("[RECAPTCHA] Token expired");
            setError(
              "Verification expired. Please refresh the page and try again."
            );
          },
        }
      );

      console.log("[RECAPTCHA] Verifier created, rendering...");
      await window.recaptchaVerifier.render();
      console.log("[RECAPTCHA] Rendered successfully");

      setRecaptchaRendered(true);
      setLoading(false);
    } catch (error: any) {
      console.error("[RECAPTCHA] Setup error:", error);
      console.error("[RECAPTCHA] Error details:", error.message, error.stack);
      setError(`Verification system error: ${error.message}`);
      setLoading(false);
    }
  };

  // Send OTP function matching tutorial approach
  const sendOtp = async () => {
    console.log("[OTP] Sending OTP initiated");

    if (!recaptchaRendered) {
      console.log("[OTP] reCAPTCHA not rendered yet");
      setError("Please complete the verification first");
      return;
    }

    setLoading(true);

    try {
      if (isTestMode) {
        console.log("[OTP] Using TEST MODE");
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

        toast.success("Test OTP sent!", {
          description: "For testing, use code: 123456",
        });

        navigate("/verify-otp");
        return;
      }

      // Real SMS verification
      console.log("[OTP] Using REAL SMS mode");
      const formattedPhone = `+91${formData.phone}`;
      console.log("[OTP] Sending to:", formattedPhone);

      // Make sure reCAPTCHA verifier exists
      if (!window.recaptchaVerifier) {
        console.error("[OTP] reCAPTCHA verifier not initialized");
        throw new Error("reCAPTCHA not initialized");
      }

      console.log("[OTP] Calling signInWithPhoneNumber with auth:", !!auth);

      // Send the verification code
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.recaptchaVerifier
      );

      console.log("[OTP] SMS sent successfully!");

      // Store for verification page
      window.confirmationResult = confirmationResult;
      console.log("[OTP] Confirmation result stored:", !!confirmationResult);

      // Save signup data
      const signupData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        isTestMode: false,
      };
      localStorage.setItem("pendingSignupData", JSON.stringify(signupData));
      console.log("[OTP] Signup data saved to localStorage");

      toast.success("Verification code sent!", {
        description: `An OTP has been sent to +91 ${formData.phone}`,
      });

      navigate("/verify-otp");
    } catch (error: any) {
      console.error("[OTP] Send error:", error);
      console.error("[OTP] Error code:", error.code);
      console.error("[OTP] Error message:", error.message);
      console.error("[OTP] Error stack:", error.stack);

      // Handle specific Firebase errors like in the tutorial
      if (error.code === "auth/invalid-phone-number") {
        setError("Please enter a valid phone number");
      } else if (error.code === "auth/too-many-requests") {
        setError("Too many attempts. Please try again later.");
      } else if (error.code === "auth/captcha-check-failed") {
        setError("Verification challenge failed. Please try again.");
      } else if (error.code === "auth/quota-exceeded") {
        setError("SMS quota exceeded. Please try again tomorrow.");
      } else if (error.code === "auth/invalid-app-credential") {
        setError("Verification failed. Please refresh the page and try again.");
      } else {
        setError(`Failed to send code: ${error.message}`);
      }

      setLoading(false);
    }
  };

  // Form validation and submission
  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();
    console.log("[FORM] Submit initiated");

    if (loading) return;

    setLoading(true);
    setError("");

    // Validation checks
    console.log("[FORM] Validating form data");
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
      console.log("[FORM] Checking if email exists:", formData.email);
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("email", formData.email.trim().toLowerCase())
        .limit(1);

      if (emailCheckError) {
        console.error("[FORM] Email check error:", emailCheckError);
        throw emailCheckError;
      }

      if (existingUsers && existingUsers.length > 0) {
        console.log("[FORM] Email already registered");
        setError(
          "Email already registered. Please use a different email or login."
        );
        setLoading(false);
        return;
      }

      // If all validation passes, setup reCAPTCHA
      console.log("[FORM] All validations passed, setting up reCAPTCHA");
      await setupRecaptcha();
    } catch (error: any) {
      console.error("[FORM] Signup error:", error);
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

                    {/* IMPORTANT: Always have the recaptcha container in the DOM */}
                    <div
                      id="recaptcha-container"
                      className="flex justify-center"
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
                                : "Verification ready - click to receive OTP on your phone"}
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
