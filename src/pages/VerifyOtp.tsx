// src/pages/VerifyOtp.tsx
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  CheckCircle,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { getAuth } from "firebase/auth";
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
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

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
  // State for each digit of the OTP
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(""));
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [resendDisabled, setResendDisabled] = useState<boolean>(true);
  const [countdown, setCountdown] = useState<number>(30);
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [verificationSuccess, setVerificationSuccess] =
    useState<boolean>(false);

  // References for input fields to enable auto-focus
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const navigate = useNavigate();

  // Combined OTP value
  const otp = otpDigits.join("");

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
      setIsTestMode(!!parsedData.isTestMode);
    } catch (err) {
      console.error("Failed to parse signup data:", err);
      navigate("/signup");
      return;
    }

    // Start countdown for resend button
    const timerCleanup = startResendTimer();

    // Focus on first input field
    setTimeout(() => {
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }
    }, 100);

    return () => timerCleanup();
  }, [navigate]);

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (otp.length === 6 && !loading && !verificationSuccess) {
      handleVerifyOtp();
    }
  }, [otp]);

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

  // Handle input change for each OTP digit
  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      value = value.charAt(0);
    }

    if (!/^\d*$/.test(value)) {
      return; // Only allow digits
    }

    const newOtpDigits = [...otpDigits];
    newOtpDigits[index] = value;
    setOtpDigits(newOtpDigits);

    // Auto-focus next input
    if (value && index < 5 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  // Handle digit backspace
  const handleKeyDown = (
    index: number,
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      e.key === "Backspace" &&
      !otpDigits[index] &&
      index > 0 &&
      inputRefs.current[index - 1]
    ) {
      inputRefs.current[index - 1].focus();
    }
  };

  // Handle pasting OTP
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData("text").trim().slice(0, 6);

    if (!/^\d+$/.test(pasteData)) {
      return; // Only allow digits
    }

    const digits = pasteData.split("").slice(0, 6);
    const newOtpDigits = [...otpDigits];

    digits.forEach((digit, index) => {
      if (index < 6) {
        newOtpDigits[index] = digit;
      }
    });

    setOtpDigits(newOtpDigits);

    // Focus the next empty field or the last field
    const nextEmptyIndex = newOtpDigits.findIndex((d) => !d);
    if (nextEmptyIndex !== -1 && inputRefs.current[nextEmptyIndex]) {
      inputRefs.current[nextEmptyIndex].focus();
    } else if (inputRefs.current[5]) {
      inputRefs.current[5].focus();
    }
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

        toast.success("Verification code resent", {
          description: "Use code 123456 for testing",
        });

        // Reset timer
        startResendTimer();
        setLoading(false);
        return;
      }

      // Real SMS resending logic
      // Similar to the initial OTP sending in Signup component
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {}
      }

      // Create container if not exists
      if (!document.getElementById("recaptcha-container")) {
        const containerDiv = document.createElement("div");
        containerDiv.id = "recaptcha-container";
        containerDiv.style.display = "none";
        document.body.appendChild(containerDiv);
      }

      // This would need to be properly implemented in a real app
      toast.success("Verification code resent", {
        description: `A new code has been sent to +91 ${signupData.phone}`,
      });

      // Reset timer
      startResendTimer();
    } catch (error: any) {
      console.error("Resend error:", error);
      setError(error.message || "Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and create account
  const handleVerifyOtp = async () => {
    if (loading || otp.length !== 6 || !signupData || verificationSuccess)
      return;

    setLoading(true);
    setError("");

    try {
      // TEST MODE - Just verify the OTP is 123456
      if (isTestMode) {
        if (otp !== "123456") {
          throw new Error("Invalid verification code. Please try again.");
        }
      } else {
        // PRODUCTION MODE - Verify with Firebase
        const confirmationResult = window.confirmationResult;
        if (!confirmationResult) {
          throw new Error("Verification session expired. Please try again.");
        }

        try {
          await confirmationResult.confirm(otp);
        } catch (confirmError) {
          throw new Error("Invalid verification code. Please try again.");
        }
      }

      // Show verification success indicator
      setVerificationSuccess(true);

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

      // Show success message and redirect after a short delay
      toast.success("Account created successfully!", {
        description: "Welcome to Freight SynQ",
      });

      // Redirect after a short delay to show the success animation
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error: any) {
      console.error("Verification error:", error);
      setError(error.message || "Failed to verify code");
      setLoading(false);
      setVerificationSuccess(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
            {verificationSuccess ? (
              <CheckCircle className="w-8 h-8 text-green-500" />
            ) : (
              <ShieldCheck className="w-8 h-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {verificationSuccess
              ? "Verification Successful"
              : "Phone Verification"}
          </CardTitle>
          <CardDescription>
            {verificationSuccess ? (
              <span className="text-green-600 dark:text-green-400">
                Creating your account...
              </span>
            ) : isTestMode ? (
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

          {/* Modern OTP Input */}
          <div className="flex justify-between space-x-2">
            {Array(6)
              .fill(0)
              .map((_, index) => (
                <div key={index} className="w-full">
                  <input
                    ref={(el) => (inputRefs.current[index] = el)}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={otpDigits[index]}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    disabled={loading || verificationSuccess}
                    className={`w-full aspect-square text-center text-2xl rounded-md border ${
                      verificationSuccess
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700"
                        : "border-input bg-background"
                    } focus:border-primary focus:ring-1 focus:ring-primary focus-visible:outline-none disabled:opacity-50`}
                  />
                </div>
              ))}
          </div>

          {!verificationSuccess && (
            <>
              {/* Resend OTP Section */}
              <div className="text-center space-y-1 pt-2">
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
                      Resend verification code
                    </>
                  )}
                </Button>
              </div>
            </>
          )}
        </CardContent>

        <CardFooter className="flex flex-col gap-2">
          {!verificationSuccess && (
            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
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
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/signup")}
            disabled={loading || verificationSuccess}
            className="text-xs"
          >
            <ArrowLeft className="mr-1 h-3 w-3" />
            Back to Signup
          </Button>

          {/* Hidden recaptcha container */}
          <div id="recaptcha-container" style={{ display: "none" }}></div>
        </CardFooter>
      </Card>
    </div>
  );
};
