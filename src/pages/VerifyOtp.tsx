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
  Clock,
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
  const [countdown, setCountdown] = useState<number>(30);
  const [signupData, setSignupData] = useState<SignupData | null>(null);
  const [isTestMode, setIsTestMode] = useState<boolean>(false);
  const [verificationSuccess, setVerificationSuccess] =
    useState<boolean>(false);

  // NEW: OTP Expiration Timer states
  const [otpExpiry, setOtpExpiry] = useState(180); // 3 minutes in seconds
  const [otpExpired, setOtpExpired] = useState(false);

  // References for input fields to enable auto-focus
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const navigate = useNavigate();

  // Combined OTP value
  const otp = otpDigits.join("");

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
      console.log("[VERIFY_OTP] Phone:", parsedData.phone);
      console.log("[VERIFY_OTP] Test mode:", !!parsedData.isTestMode);
    } catch (err) {
      console.error("[VERIFY_OTP] Failed to parse signup data:", err);
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

  // NEW: OTP expiration timer
  useEffect(() => {
    if (otpExpiry <= 0) {
      setOtpExpired(true);
      return;
    }

    const expiryTimer = setInterval(() => {
      setOtpExpiry((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(expiryTimer);
  }, [otpExpiry]);

  // Auto-submit when all digits are filled
  useEffect(() => {
    if (otp.length === 6 && !loading && !verificationSuccess && !otpExpired) {
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
    if (otpExpired) return; // Don't allow changes if OTP is expired

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
    if (otpExpired) return; // Don't allow paste if OTP is expired

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

    console.log("[VERIFY_OTP] Resending OTP");
    setLoading(true);

    try {
      // Test mode handling
      if (isTestMode) {
        console.log("[VERIFY_OTP] Resending in test mode");
        // For development, use fixed code
        localStorage.setItem("testOtp", "123456");

        toast.success("Verification code resent", {
          description: "Use code 123456 for testing",
        });

        // NEW: Reset OTP expiry timer
        setOtpExpiry(180);
        setOtpExpired(false);

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

      toast.success("Verification code resent", {
        description: `A new code has been sent to +91 ${signupData.phone}`,
      });

      // NEW: Reset OTP expiry timer and clear expired state
      setOtpExpiry(180);
      setOtpExpired(false);

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
      console.error("[VERIFY_OTP] Resend error:", error);
      console.error("[VERIFY_OTP] Error code:", error.code);
      console.error("[VERIFY_OTP] Error message:", error.message);
      setError(error.message || "Failed to resend verification code");
    } finally {
      setLoading(false);
    }
  };

  // Verify OTP and create account
  const handleVerifyOtp = async () => {
    if (loading || otp.length !== 6 || !signupData || verificationSuccess)
      return;

    // NEW: Check if OTP has expired
    if (otpExpired) {
      setError(
        "This verification code has expired. Please request a new code."
      );
      return;
    }

    console.log("[VERIFY_OTP] Verifying OTP:", otp);
    setLoading(true);
    setError("");

    try {
      // NEW: Get and increment fail count from localStorage
      const currentFailCount = parseInt(
        localStorage.getItem("failCount") || "0"
      );

      // Check if too many failed attempts
      if (currentFailCount >= 5) {
        throw new Error("Too many failed attempts. Please try again later.");
      }

      // TEST MODE - Just verify the OTP is 123456
      if (isTestMode) {
        console.log("[VERIFY_OTP] Verifying in test mode");
        if (otp !== "123456") {
          // NEW: Track failed attempt
          localStorage.setItem("failCount", (currentFailCount + 1).toString());

          console.log("[VERIFY_OTP] Invalid test OTP");
          throw new Error("Invalid verification code. Please try again.");
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
          // NEW: Track failed attempt
          localStorage.setItem("failCount", (currentFailCount + 1).toString());

          console.error("[VERIFY_OTP] OTP confirmation error:", confirmError);
          throw new Error("Invalid verification code. Please try again.");
        }
      }

      // Show verification success indicator
      setVerificationSuccess(true);

      // NEW: Clear fail count on success
      localStorage.removeItem("failCount");

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
      localStorage.removeItem("failCount");

      console.log("[VERIFY_OTP] Account creation successful!");
      toast.success("Account created successfully!", {
        description: "Welcome to Freight SynQ",
      });

      // Redirect after a short delay to show the success animation
      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error: any) {
      console.error("[VERIFY_OTP] Verification error:", error);

      // NEW: Add progressive delay based on fail count
      const failCount = parseInt(localStorage.getItem("failCount") || "0");
      if (failCount > 0) {
        const delayTime = Math.min(failCount * 1000, 5000); // Max 5 seconds delay
        await new Promise((resolve) => setTimeout(resolve, delayTime));
      }

      setError(error.message || "Failed to verify code");
      setLoading(false);
      setVerificationSuccess(false);
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

          {/* NEW: OTP Expiration Timer */}
          {!verificationSuccess && !otpExpired && (
            <div
              className={`flex items-center justify-center gap-1 mt-1 text-sm font-medium ${
                otpExpiry < 30
                  ? "text-red-500 dark:text-red-400"
                  : otpExpiry < 60
                  ? "text-amber-500 dark:text-amber-400"
                  : "text-muted-foreground"
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>Code expires in {formatTime(otpExpiry)}</span>
            </div>
          )}

          {/* Show expired message */}
          {otpExpired && !verificationSuccess && (
            <div className="text-red-500 dark:text-red-400 text-sm font-medium flex items-center justify-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              <span>Code expired. Please request a new one.</span>
            </div>
          )}
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
                    disabled={loading || verificationSuccess || otpExpired}
                    className={`w-full aspect-square text-center text-2xl rounded-md border ${
                      verificationSuccess
                        ? "border-green-500 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400 dark:border-green-700"
                        : otpExpired
                        ? "border-red-300 bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400 dark:border-red-700"
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
                disabled={loading || otp.length !== 6 || otpExpired}
                className="w-full h-11"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : otpExpired ? (
                  "Code Expired"
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              {/* Resend OTP Section */}
              <div className="text-center space-y-1 pt-2">
                <p className="text-sm text-muted-foreground">
                  {otpExpired
                    ? "Code expired. Request a new one:"
                    : "Didn't receive the code?"}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResendOtp}
                  disabled={resendDisabled || loading}
                  className={`h-9 ${
                    otpExpired
                      ? "border-amber-500 text-amber-600 dark:border-amber-700 dark:text-amber-400"
                      : ""
                  }`}
                >
                  {resendDisabled ? (
                    <>Resend in {countdown}s</>
                  ) : (
                    <>
                      <RefreshCw className="mr-1 h-3 w-3" />
                      {otpExpired
                        ? "Request new code"
                        : "Resend verification code"}
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
