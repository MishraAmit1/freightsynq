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
import {
  getAuth,
  RecaptchaVerifier,
  signInWithPhoneNumber,
} from "firebase/auth";
import { initializeApp } from "firebase/app";

// Firebase config
const firebaseConfig = {
  apiKey:
    import.meta.env.VITE_FIREBASE_API_KEY ||
    "AIzaSyA-EL3yeq4yAlFUplq6_OgglXF_88mpaow",
  authDomain:
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ||
    "freightsynq123.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "freightsynq123",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ||
    "freightsynq123.firebasestorage.app",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "628191998718",
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID ||
    "1:628191998718:web:f7315366476a1d45876baf",
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
  const [countdown, setCountdown] = useState<number>(180); // 3 minutes instead of 30 seconds
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [verificationSuccess, setVerificationSuccess] =
    useState<boolean>(false);

  // For auto-clearing error messages
  const errorTimeoutRef = useRef<number | null>(null);

  // References for input fields to enable auto-focus
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const navigate = useNavigate();

  // Combined OTP value
  const otp = otpDigits.join("");

  // Add this useEffect to handle cleanup of the timeout
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Create a function to set errors that auto-clear after 5 seconds
  const setTimedError = (message: string) => {
    // Clear any existing timeout
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current);
    }

    // Set the error
    setError(message);

    // Set timeout to clear the error after 5 seconds
    errorTimeoutRef.current = window.setTimeout(() => {
      setError("");
    }, 5000); // 5 seconds
  };

  // Initial setup when component loads
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
    setCountdown(180); // 3 minutes

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

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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
    e: React.KeyboardEvent<HTMLInputElement>,
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

        // Reset input fields
        setOtpDigits(Array(6).fill(""));
        if (inputRefs.current[0]) {
          inputRefs.current[0].focus();
        }

        // Reset timer
        startResendTimer();
        setLoading(false);
        return;
      }

      // Production mode - resend OTP
      // Clear any existing verifier
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (err) {}
      }

      // Create container if not exists
      if (!document.getElementById("recaptcha-container")) {
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
        },
      );

      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = `+91${signupData.phone}`;

      // Send OTP
      try {
        const confirmationResult = await signInWithPhoneNumber(
          auth,
          formattedPhone,
          appVerifier,
        );
        window.confirmationResult = confirmationResult;
      } catch (smsError) {
        throw smsError;
      }

      toast.success("Verification code resent", {
        description: `A new code has been sent to +91 ${signupData.phone}`,
      });

      // Clear OTP inputs
      setOtpDigits(Array(6).fill(""));
      if (inputRefs.current[0]) {
        inputRefs.current[0].focus();
      }

      // Reset fail counter when requesting new OTP
      localStorage.removeItem("failCount");

      // Reset timer
      startResendTimer();
    } catch (error: any) {
      setTimedError(error.message || "Failed to resend verification code");
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
      // Get and increment fail count from localStorage
      const currentFailCount = parseInt(
        localStorage.getItem("failCount") || "0",
      );

      // Check if too many failed attempts
      if (currentFailCount >= 5) {
        throw new Error("Too many failed attempts. Please try again later.");
      }

      // TEST MODE - Just verify the OTP is 123456
      if (isTestMode) {
        if (otp !== "123456") {
          // Track failed attempt
          localStorage.setItem("failCount", (currentFailCount + 1).toString());
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
          // Track failed attempt
          localStorage.setItem("failCount", (currentFailCount + 1).toString());
          throw new Error("Invalid verification code. Please try again.");
        }
      }

      // Show verification success indicator
      setVerificationSuccess(true);

      // Clear fail count on success
      localStorage.removeItem("failCount");

      // ✅ UPDATED: Create auth user with proper metadata
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: null,
          data: {
            // ✅ PASS ALL USER DATA HERE
            name: signupData.fullName,
            username: signupData.username,
            phone: signupData.phone,
            phone_verified: true,
          },
        },
      });

      if (authError && !authError.message.includes("already registered")) {
        throw authError;
      }

      // Get user ID
      let userId;
      if (authData?.user) {
        userId = authData.user.id;
      } else {
        // Try signing in if already exists
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
          status: "ACTIVE",
        })
        .select()
        .single();

      if (companyError) throw companyError;

      // ✅ FIXED: Create user profile
      console.log("Creating user profile...");
      const { error: userCreateError } = await supabase.from("users").insert({
        id: userId,
        name: signupData.fullName,
        email: signupData.email,
        phone: signupData.phone,
        username: signupData.username,
        company_id: company.id,
        role: "admin",
        status: "ACTIVE",
      });

      if (userCreateError) {
        console.error("User creation error:", userCreateError);

        // Handle duplicate key error
        if (userCreateError.code === "23505") {
          console.log("User exists, updating...");
          const { error: updateError } = await supabase
            .from("users")
            .update({
              company_id: company.id,
              name: signupData.fullName,
              phone: signupData.phone,
              username: signupData.username,
              role: "admin",
              status: "ACTIVE",
            })
            .eq("id", userId);

          if (updateError) {
            console.error("Update error:", updateError);
            throw new Error("Failed to update user profile");
          }
        } else {
          throw new Error(`Failed to create user: ${userCreateError.message}`);
        }
      }

      console.log("✅ User profile created successfully");

      // Clear localStorage
      localStorage.removeItem("pendingSignupData");
      localStorage.removeItem("testOtp");
      localStorage.removeItem("failCount");

      toast.success("Account created successfully!", {
        description: "Welcome to Freight SynQ",
      });

      // Redirect to dashboard
      setTimeout(() => {
        window.location.href = "/"; // Use window.location for hard refresh
      }, 1500);
    } catch (error: any) {
      console.error("Verification error:", error);
      setTimedError(error.message || "Failed to verify code");
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
              {/* Verify Button */}
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
                    <>Resend in {formatTime(countdown)}</>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Resend code
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
              variant="ghost"
              size="sm"
              onClick={() => navigate("/signup")}
              disabled={loading || verificationSuccess}
              className="text-xs"
            >
              <ArrowLeft className="mr-1 h-3 w-3" />
              Back to Signup
            </Button>
          )}

          {/* Hidden recaptcha container */}
          <div id="recaptcha-container" style={{ display: "none" }}></div>
        </CardFooter>
      </Card>
    </div>
  );
};
