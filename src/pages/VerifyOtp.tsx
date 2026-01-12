// src/pages/VerifyOtp.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyA-EL3yeq4yAlFUplq6_OgglXF_88mpaow",
  authDomain: "freightsynq123.firebaseapp.com",
  projectId: "freightsynq123",
  storageBucket: "freightsynq123.firebasestorage.app",
  messagingSenderId: "628191998718",
  appId: "1:628191998718:web:f7315366476a1d45876baf",
};

// Initialize Firebase for this page
console.log("[VERIFY_OTP] Initializing Firebase");
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
console.log("[VERIFY_OTP] Firebase initialized:", !!auth);

// Types
interface SignupData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
  isTestMode?: boolean;
}

export const VerifyOtp = () => {
  console.log("[VERIFY_OTP] Component rendering");

  const [otp, setOtp] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [resendDisabled, setResendDisabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(30);
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    console.log("[VERIFY_OTP] Component mounted");

    // Get signup data from localStorage
    const data = localStorage.getItem("pendingSignupData");
    if (!data) {
      console.log("[VERIFY_OTP] No pending signup data found");
      toast.error("Session expired", {
        description: "Please return to the signup page",
      });
      navigate("/signup");
      return;
    }

    try {
      const parsedData = JSON.parse(data) as SignupData;
      setSignupData(parsedData);

      // Check if we're in test mode
      setIsTestMode(!!parsedData.isTestMode);
      console.log("[VERIFY_OTP] Test mode:", !!parsedData.isTestMode);
      console.log("[VERIFY_OTP] Phone:", parsedData.phone);
    } catch (err) {
      console.error("[VERIFY_OTP] Failed to parse signup data:", err);
      navigate("/signup");
      return;
    }

    // Start countdown for resend button
    console.log("[VERIFY_OTP] Starting resend timer");
    const timerCleanup = startResendTimer();

    // Clear on unmount
    return () => {
      console.log("[VERIFY_OTP] Component unmounting");
      timerCleanup();
    };
  }, [navigate]);

  const startResendTimer = () => {
    setResendDisabled(true);
    setCountdown(30);

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setResendDisabled(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  };

  // Handle resend button click
  const handleResendOtp = async () => {
    if (resendDisabled || !signupData) return;

    console.log("[VERIFY_OTP] Resending OTP");
    setLoading(true);

    try {
      // Test mode handling
      if (isTestMode) {
        console.log("[VERIFY_OTP] Resending in test mode");
        // For development, use fixed code
        localStorage.setItem("testOtp", "123456");

        toast.success("Test OTP resent!", {
          description: "Use code 123456 for testing",
        });

        // Reset timer
        startResendTimer();
        setLoading(false);
        return;
      }

      // Production mode - resend OTP
      console.log("[VERIFY_OTP] Resending real SMS OTP");

      // Clear any existing verifier
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {
          console.warn("[VERIFY_OTP] Failed to clear existing verifier:", err);
        }
      }

      // Create container if not exists
      if (!document.getElementById("recaptcha-container")) {
        console.log("[VERIFY_OTP] Creating recaptcha container");
        const containerDiv = document.createElement("div");
        containerDiv.id = "recaptcha-container";
        document.body.appendChild(containerDiv);
      }

      // Create a new RecaptchaVerifier
      window.recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );

      console.log("[VERIFY_OTP] Verifier created");
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = `+91${signupData.phone}`;
      console.log("[VERIFY_OTP] Sending to:", formattedPhone);

      // Send OTP
      try {
        const confirmationResult = await signInWithPhoneNumber(
          auth,
          formattedPhone,
          appVerifier
        );
        window.confirmationResult = confirmationResult;
        console.log("[VERIFY_OTP] OTP sent successfully");
      } catch (smsError) {
        console.error("[VERIFY_OTP] SMS sending error:", smsError);
        throw smsError;
      }

      toast.success("OTP sent again!", {
        description: `A new verification code has been sent to ${signupData.phone}`,
      });

      // Reset timer
      startResendTimer();
    } catch (error: any) {
      console.error("[VERIFY_OTP] Resend error:", error);
      console.error("[VERIFY_OTP] Error code:", error.code);
      console.error("[VERIFY_OTP] Error message:", error.message);
      setError(error.message || "Failed to resend OTP");
    } finally {
      setLoading(false);
    }
  };

  // Handle OTP input
  const handleOtpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow digits and limit to 6 characters
    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
    setOtp(value);
  };

  // Handle verification button click
  const handleSubmitOtp = () => {
    console.log("[VERIFY_OTP] Submit button clicked");
    if (otp.length === 6) {
      handleVerifyOtp();
    } else {
      setError("Please enter a valid 6-digit OTP");
    }
  };

  // Verify OTP and create account
  const handleVerifyOtp = async () => {
    if (loading || !otp || !signupData) return;

    if (otp.length !== 6) {
      setError("Please enter a valid 6-digit OTP");
      return;
    }

    console.log("[VERIFY_OTP] Verifying OTP:", otp);
    setLoading(true);
    setError("");

    try {
      // TEST MODE - Just verify the OTP is 123456
      if (isTestMode) {
        console.log("[VERIFY_OTP] Verifying in test mode");
        if (otp !== "123456") {
          console.log("[VERIFY_OTP] Invalid test OTP");
          throw new Error("Invalid OTP code. For testing, use 123456.");
        }
        console.log("[VERIFY_OTP] Test OTP verified successfully!");
      } else {
        // PRODUCTION MODE - Verify with Firebase
        console.log("[VERIFY_OTP] Verifying real SMS OTP");
        const confirmationResult = window.confirmationResult;
        if (!confirmationResult) {
          console.error("[VERIFY_OTP] No confirmation result found");
          throw new Error("Verification session expired. Please try again.");
        }

        try {
          console.log("[VERIFY_OTP] Confirming OTP with Firebase");
          await confirmationResult.confirm(otp);
          console.log("[VERIFY_OTP] OTP confirmed successfully");
        } catch (confirmError) {
          console.error("[VERIFY_OTP] OTP confirmation error:", confirmError);
          throw new Error("Invalid verification code. Please try again.");
        }
      }

      // Create auth user
      console.log("[VERIFY_OTP] Creating Supabase auth user");
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: null,
          data: {
            phone_verified: true,
          },
        },
      });

      if (authError && !authError.message.includes("already registered")) {
        console.error("[VERIFY_OTP] Auth error:", authError);
        throw authError;
      }

      // Get user ID - either from new signup or try signing in
      let userId;

      if (authData?.user) {
        userId = authData.user.id;
        console.log("[VERIFY_OTP] New user created with ID:", userId);
      } else {
        // Try to sign in to get the user ID
        console.log("[VERIFY_OTP] User may already exist, signing in");
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: signupData.email,
            password: signupData.password,
          });

        if (signInError) {
          console.error("[VERIFY_OTP] Sign in error:", signInError);
          throw signInError;
        }
        userId = signInData.user?.id;
        console.log("[VERIFY_OTP] Signed in with user ID:", userId);
      }

      if (!userId) {
        console.error("[VERIFY_OTP] Failed to get user ID");
        throw new Error("Failed to get user ID");
      }

      // Create company
      console.log("[VERIFY_OTP] Creating company");
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: `${signupData.fullName}'s Company`,
          email: signupData.email,
          phone: signupData.phone,
        })
        .select()
        .single();

      if (companyError) {
        console.error("[VERIFY_OTP] Company creation error:", companyError);
        throw companyError;
      }
      console.log("[VERIFY_OTP] Company created with ID:", company.id);

      try {
        // Try to update first (in case user exists)
        console.log("[VERIFY_OTP] Updating user record");
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: signupData.fullName,
            email: signupData.email,
            phone: signupData.phone,
            username: signupData.username,
            company_id: company.id,
            role: "admin",
          })
          .eq("id", userId);

        if (updateError) {
          console.log("[VERIFY_OTP] Update failed, trying insert");
          // If update fails, try insert
          const { error: insertError } = await supabase.from("users").insert({
            id: userId,
            name: signupData.fullName,
            email: signupData.email,
            phone: signupData.phone,
            username: signupData.username,
            company_id: company.id,
            role: "admin",
          });

          if (insertError) {
            console.error("[VERIFY_OTP] Insert error:", insertError);
            throw insertError;
          }
          console.log("[VERIFY_OTP] User inserted successfully");
        } else {
          console.log("[VERIFY_OTP] User updated successfully");
        }
      } catch (dbError: any) {
        console.error("[VERIFY_OTP] Database error:", dbError);

        // If both update and insert fail, use RPC fallback
        console.log("[VERIFY_OTP] Trying RPC fallback");
        const { error: rpcError } = await supabase.rpc(
          "create_or_update_user",
          {
            p_id: userId,
            p_name: signupData.fullName,
            p_email: signupData.email,
            p_phone: signupData.phone,
            p_username: signupData.username,
            p_company_id: company.id,
            p_role: "admin",
          }
        );

        if (rpcError) {
          console.error("[VERIFY_OTP] RPC error:", rpcError);
          throw rpcError;
        }
        console.log("[VERIFY_OTP] User created/updated via RPC");
      }

      // Clear localStorage
      console.log("[VERIFY_OTP] Cleaning up localStorage");
      localStorage.removeItem("pendingSignupData");
      localStorage.removeItem("testOtp");

      console.log("[VERIFY_OTP] Account creation successful!");
      toast.success("Account created successfully!", {
        description: "Welcome to Freight SynQ",
      });

      navigate("/");
    } catch (error: any) {
      console.error("[VERIFY_OTP] Verification error:", error);
      setError(error.message || "Failed to verify OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Phone Verification</CardTitle>
          <CardDescription>
            {isTestMode ? (
              <span className="font-medium text-amber-600 dark:text-amber-400">
                TEST MODE: Use code 123456
              </span>
            ) : (
              <>
                Enter the 6-digit code sent to{" "}
                <span className="font-medium">
                  {signupData?.phone ? `+91 ${signupData.phone}` : "your phone"}
                </span>
              </>
            )}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* OTP Input */}
          <div className="space-y-2">
            <Input
              type="text"
              inputMode="numeric"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={handleOtpChange}
              maxLength={6}
              className="text-center text-2xl h-16 tracking-widest font-semibold"
              disabled={loading}
            />
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleSubmitOtp}
            disabled={loading}
            className="w-full h-11"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Verifying...
              </>
            ) : (
              "Verify & Continue"
            )}
          </Button>

          {/* Resend OTP Section */}
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the code?
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleResendOtp}
              disabled={resendDisabled || loading}
              className="h-9"
            >
              {resendDisabled ? (
                <>Resend in {countdown}s</>
              ) : (
                <>
                  <RefreshCw className="mr-1 h-3 w-3" />
                  Resend OTP
                </>
              )}
            </Button>
          </div>

          {/* Back to Signup */}
          <div className="text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/signup")}
              disabled={loading}
              className="text-xs"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to Signup
            </Button>
          </div>

          {/* Hidden recaptcha container */}
          <div id="recaptcha-container" style={{ display: "none" }}></div>
        </CardContent>
      </Card>
    </div>
  );
};
