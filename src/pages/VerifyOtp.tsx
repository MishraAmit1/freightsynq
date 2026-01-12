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
  const [otp, setOtp] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [resendDisabled, setResendDisabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(30);
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);

  const navigate = useNavigate();

  useEffect(() => {
    // Get signup data from localStorage
    const data = localStorage.getItem("pendingSignupData");
    if (!data) {
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
      console.log("Test mode:", !!parsedData.isTestMode);
    } catch (err) {
      console.error("Failed to parse signup data", err);
      navigate("/signup");
      return;
    }

    // Start countdown for resend button
    const timerCleanup = startResendTimer();

    return () => timerCleanup();
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

    setLoading(true);

    try {
      // Test mode handling
      if (isTestMode) {
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
      // Clear any existing verifier
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
      }

      // Initialize Firebase Auth
      const auth = getAuth();

      // Create a new RecaptchaVerifier
      (window as any).recaptchaVerifier = new RecaptchaVerifier(
        auth,
        "recaptcha-container",
        {
          size: "invisible",
        }
      );

      const appVerifier = (window as any).recaptchaVerifier;
      const formattedPhone = `+91${signupData.phone}`;

      // Send OTP
      const confirmationResult = await signInWithPhoneNumber(
        auth,
        formattedPhone,
        appVerifier
      );
      (window as any).confirmationResult = confirmationResult;

      toast.success("OTP sent again!", {
        description: `A new verification code has been sent to ${signupData.phone}`,
      });

      // Reset timer
      startResendTimer();
    } catch (error: any) {
      console.error("Resend OTP error:", error);
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

    setLoading(true);
    setError("");

    try {
      console.log("Verifying OTP:", otp);

      // TEST MODE - Just verify the OTP is 123456
      if (isTestMode) {
        if (otp !== "123456") {
          throw new Error("Invalid OTP code. For testing, use 123456.");
        }
        console.log("Test OTP verified successfully!");
      } else {
        // PRODUCTION MODE - Verify with Firebase
        const confirmationResult = (window as any).confirmationResult;
        if (!confirmationResult) {
          throw new Error("Verification session expired. Please try again.");
        }
        await confirmationResult.confirm(otp);
      }

      // Create auth user
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
        throw authError;
      }

      // Get user ID - either from new signup or try signing in
      let userId;

      if (authData?.user) {
        userId = authData.user.id;
      } else {
        // Try to sign in to get the user ID
        const { data: signInData, error: signInError } =
          await supabase.auth.signInWithPassword({
            email: signupData.email,
            password: signupData.password,
          });

        if (signInError) throw signInError;
        userId = signInData.user?.id;
      }

      if (!userId) {
        throw new Error("Failed to get user ID");
      }

      // Create company
      const { data: company, error: companyError } = await supabase
        .from("companies")
        .insert({
          name: `${signupData.fullName}'s Company`,
          email: signupData.email,
          phone: signupData.phone,
        })
        .select()
        .single();

      if (companyError) throw companyError;

      try {
        // Try to update first (in case user exists)
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

          if (insertError) throw insertError;
        }
      } catch (dbError: any) {
        console.error("Database error:", dbError);

        // If both update and insert fail, use RPC fallback
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

        if (rpcError) throw rpcError;
      }

      // Clear localStorage
      localStorage.removeItem("pendingSignupData");
      localStorage.removeItem("testOtp");

      toast.success("Account created successfully!", {
        description: "Welcome to Freight SynQ",
      });

      navigate("/");
    } catch (error: any) {
      console.error("OTP verification error:", error);
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
          <div id="recaptcha-container"></div>
        </CardContent>
      </Card>
    </div>
  );
};
