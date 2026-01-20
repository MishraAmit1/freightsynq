// src/pages/Signup.tsx
import { useState, FormEvent, useEffect } from "react";
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
  AlertTriangle,
  Eye,
  EyeOff,
  Phone,
  Mail,
  Lock,
  CheckCircle2,
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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Initialize Firebase
console.log("[INIT] Starting Firebase initialization");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
console.log("[INIT] Firebase initialized successfully:", !!auth);

// Set to false to enable real SMS
const isTestMode = import.meta.env.VITE_SMS_MODE === "test";
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
    null,
  );
  const [checkingUsername, setCheckingUsername] = useState<boolean>(false);

  useEffect(() => {
    console.log("ENV VARS CHECK:");
    console.log("SMS Mode:", import.meta.env.VITE_SMS_MODE);
    console.log(
      "Is Test Mode (computed):",
      import.meta.env.VITE_SMS_MODE === "test",
    );
  }, []);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Clean up reCAPTCHA on component unmount
  useEffect(() => {
    return () => {
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
    let { name, value } = e.target;

    if (name === "username") {
      value = value.toLowerCase().trim();
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (name === "username" && value.length >= 3) {
      checkUsernameAvailability(value);
    }
  };

  const handleSubmit = async (e?: FormEvent) => {
    if (e) e.preventDefault();

    if (loading) return;

    setLoading(true);
    setError("");

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
      const { data: existingUsers, error: emailCheckError } = await supabase
        .from("users")
        .select("id")
        .eq("email", formData.email.trim().toLowerCase())
        .limit(1);

      if (emailCheckError) throw emailCheckError;

      if (existingUsers && existingUsers.length > 0) {
        setError(
          "Email already registered. Please use a different email or login.",
        );
        setLoading(false);
        return;
      }

      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {}
      }

      if (!document.getElementById("recaptcha-container")) {
        const containerDiv = document.createElement("div");
        containerDiv.id = "recaptcha-container";
        containerDiv.style.display = "none";
        document.body.appendChild(containerDiv);
      }

      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
          callback: () => {
            console.log("reCAPTCHA verified");
          },
        },
      );

      if (isTestMode) {
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

        toast.success("Verification code sent", {
          description: "Please check your phone for the verification code",
        });

        navigate("/verify-otp");
        return;
      }

      const formattedPhone = `+91${formData.phone}`;
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        window.recaptchaVerifier,
      );

      window.confirmationResult = confirmationResult;

      const signupData = {
        fullName: formData.fullName,
        username: formData.username,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        isTestMode: false,
      };
      localStorage.setItem("pendingSignupData", JSON.stringify(signupData));

      toast.success("Verification code sent", {
        description: "Please check your phone for the verification code",
      });

      navigate("/verify-otp");
    } catch (error: any) {
      console.error("Error:", error);

      if (error.code === "auth/invalid-phone-number") {
        setError("Please enter a valid phone number");
      } else if (error.code === "auth/too-many-requests") {
        setError(
          "Too many attempts. Please try again later or use a different phone number.",
        );
      } else if (error.code === "auth/quota-exceeded") {
        setError("SMS quota exceeded. Please try again tomorrow.");
      } else if (error.code === "auth/invalid-app-credential") {
        setError("Verification failed. Please refresh the page and try again.");
      } else {
        setError(error.message || "An error occurred during signup");
      }

      setLoading(false);
    }
  };

  return (
    <div className="h-screen w-full flex overflow-hidden">
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
      <div className="w-full lg:w-1/2 min-[2000px]:w-[40%] flex items-center justify-center p-6 sm:p-8 min-[2000px]:p-12 bg-white dark:bg-[#1E1E24] overflow-hidden">
        <div className="w-full max-w-lg min-[2000px]:max-w-xl h-full max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="mb-6 min-[2000px]:mb-8 flex-shrink-0">
            <h1 className="text-3xl sm:text-4xl min-[2000px]:text-5xl font-bold text-[#0A0A0A] dark:text-white">
              Create your account
            </h1>
            <p className="text-sm min-[2000px]:text-base text-[#737373] dark:text-[#A1A1AA] mt-1 min-[2000px]:mt-2">
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
              <CardContent className="p-6 min-[2000px]:p-8">
                <form
                  onSubmit={handleSubmit}
                  className="space-y-4 min-[2000px]:space-y-5"
                >
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
                  <div className="space-y-4 min-[2000px]:space-y-5">
                    {/* Full Name */}
                    <div className="space-y-2">
                      <Label className="text-sm min-[2000px]:text-base font-medium text-[#0A0A0A] dark:text-white">
                        Full Name *
                      </Label>
                      <div className="relative">
                        <Input
                          name="fullName"
                          placeholder="Your full name"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                          className="h-11 min-[2000px]:h-12 pl-10 min-[2000px]:pl-11 text-sm min-[2000px]:text-base border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                        />
                        <User className="absolute left-3 min-[2000px]:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-[#737373] dark:text-[#A1A1AA]" />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <Label className="text-sm min-[2000px]:text-base font-medium text-[#0A0A0A] dark:text-white">
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
                          className="h-11 min-[2000px]:h-12 pl-10 min-[2000px]:pl-11 text-sm min-[2000px]:text-base border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                        />
                        <Mail className="absolute left-3 min-[2000px]:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-[#737373] dark:text-[#A1A1AA]" />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <Label className="text-sm min-[2000px]:text-base font-medium text-[#0A0A0A] dark:text-white">
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
                          className="h-11 min-[2000px]:h-12 pl-10 min-[2000px]:pl-11 text-sm min-[2000px]:text-base border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                        />
                        <Phone className="absolute left-3 min-[2000px]:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-[#737373] dark:text-[#A1A1AA]" />
                      </div>
                      <p className="text-xs min-[2000px]:text-sm text-muted-foreground mt-1">
                        We'll send a verification code to this number
                      </p>
                    </div>

                    {/* Username */}
                    <div className="space-y-2">
                      <Label className="text-sm min-[2000px]:text-base font-medium text-[#0A0A0A] dark:text-white">
                        Username *
                        <span className="text-xs min-[2000px]:text-sm text-[#737373] dark:text-[#A1A1AA] ml-1">
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
                            "h-11 min-[2000px]:h-12 pl-10 min-[2000px]:pl-11 text-sm min-[2000px]:text-base border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]",
                            usernameAvailable === true &&
                              "border-green-500 dark:border-green-600",
                            usernameAvailable === false &&
                              "border-red-500 dark:border-red-600",
                          )}
                          minLength={3}
                        />
                        <User className="absolute left-3 min-[2000px]:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-[#737373] dark:text-[#A1A1AA]" />
                        <div className="absolute right-3 min-[2000px]:right-3.5 top-1/2 -translate-y-1/2">
                          {checkingUsername && (
                            <Loader2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 animate-spin text-[#0A0A0A] dark:text-[#FCC52C]" />
                          )}
                          {!checkingUsername && usernameAvailable === true && (
                            <CheckCircle2 className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-green-500 dark:text-green-400" />
                          )}
                        </div>
                      </div>
                      {usernameAvailable === true && (
                        <p className="text-xs min-[2000px]:text-sm text-green-600 dark:text-green-400">
                          Username available!
                        </p>
                      )}
                      {usernameAvailable === false && formData.username && (
                        <p className="text-xs min-[2000px]:text-sm text-red-600 dark:text-red-400">
                          Username unavailable
                        </p>
                      )}
                    </div>

                    {/* Password Fields */}
                    <div className="grid grid-cols-2 gap-3 min-[2000px]:gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm min-[2000px]:text-base font-medium text-[#0A0A0A] dark:text-white">
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
                            className="h-11 min-[2000px]:h-12 pl-10 min-[2000px]:pl-11 text-sm min-[2000px]:text-base border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                          />
                          <Lock className="absolute left-3 min-[2000px]:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-[#737373] dark:text-[#A1A1AA]" />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 min-[2000px]:right-3.5 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#A1A1AA]"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                            ) : (
                              <Eye className="w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm min-[2000px]:text-base font-medium text-[#0A0A0A] dark:text-white">
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
                            className="h-11 min-[2000px]:h-12 pl-10 min-[2000px]:pl-11 text-sm min-[2000px]:text-base border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA]"
                          />
                          <Lock className="absolute left-3 min-[2000px]:left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 min-[2000px]:w-5 min-[2000px]:h-5 text-[#737373] dark:text-[#A1A1AA]" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Terms & Submit */}
                  <div className="space-y-4 min-[2000px]:space-y-5 pt-2">
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
                        className="text-sm min-[2000px]:text-base font-normal text-[#737373] dark:text-[#A1A1AA] cursor-pointer"
                      >
                        I agree to the Terms & Conditions
                      </Label>
                    </div>

                    {/* Hidden recaptcha container */}
                    <div
                      id="recaptcha-container"
                      style={{ display: "none" }}
                    ></div>

                    <Button
                      type="submit"
                      className="w-full h-11 min-[2000px]:h-12 text-base bg-[#0A0A0A] hover:bg-[#262626] active:bg-[#333333] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] dark:active:bg-[#F67C09] text-white dark:text-[#1E1E24] font-semibold"
                      disabled={
                        loading ||
                        !formData.termsAccepted ||
                        usernameAvailable === false
                      }
                    >
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 min-[2000px]:h-5 min-[2000px]:w-5 animate-spin" />
                          Sending Verification Code...
                        </>
                      ) : (
                        <>Continue with Phone Verification</>
                      )}
                    </Button>

                    <p className="text-center text-sm min-[2000px]:text-base text-[#737373] dark:text-[#A1A1AA]">
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
      <div className="hidden lg:flex lg:w-1/2 min-[2000px]:w-[60%] bg-[#0A0A0F] relative items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 min-[2000px]:w-96 h-72 min-[2000px]:h-96 bg-[#FCC52C]/8 rounded-full blur-[120px] min-[2000px]:blur-[150px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 min-[2000px]:w-96 h-72 min-[2000px]:h-96 bg-[#F38810]/8 rounded-full blur-[120px] min-[2000px]:blur-[150px]" />
        </div>

        <div className="relative z-10 text-center px-12 min-[2000px]:px-16 flex flex-col items-center">
          <div className="relative mb-8 min-[2000px]:mb-10">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl blur-2xl opacity-40" />
            <div className="relative flex items-center justify-center w-20 h-20 min-[2000px]:w-24 min-[2000px]:h-24 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl shadow-2xl">
              <Truck className="w-10 h-10 min-[2000px]:w-12 min-[2000px]:h-12 text-[#0A0A0F]" />
            </div>
          </div>

          <h2 className="text-4xl min-[2000px]:text-5xl font-bold text-white mb-2">
            Freight<span className="text-[#FCC52C]">SynQ</span>
          </h2>
          <p className="text-gray-400 text-lg min-[2000px]:text-xl mb-10 min-[2000px]:mb-12">
            Smart logistics for modern fleets
          </p>
        </div>
      </div>
    </div>
  );
};
