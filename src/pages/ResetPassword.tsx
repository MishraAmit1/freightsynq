import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Truck,
  AlertTriangle,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  ArrowRight,
  Shield,
  Zap,
  Globe,
  Users,
  Clock,
  Headphones,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const ResetPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  const navigate = useNavigate();

  // Check if user has valid reset token on mount
  useEffect(() => {
    const checkToken = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        setValidToken(false);
        setError("Invalid or expired reset link. Please request a new one.");
      } else {
        setValidToken(true);
      }
    };

    checkToken();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Validation
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        throw updateError;
      }

      // Success
      setSuccess(true);
      toast.success("Password updated successfully!");

      // Auto redirect to login after 3 seconds
      setTimeout(() => {
        navigate("/login");
      }, 3000);
    } catch (error: any) {
      console.error("Reset password error:", error);
      setError(error.message || "Failed to reset password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking token
  if (validToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#1E1E24]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-[#0A0A0A] dark:text-[#FCC52C]" />
          <p className="text-[#737373] dark:text-[#A1A1AA]">
            Verifying reset link...
          </p>
        </div>
      </div>
    );
  }

  // Show error if invalid token
  if (validToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#1E1E24] p-4">
        <Card className="w-full max-w-md border-red-200 dark:border-red-800/30 shadow-2xl bg-white dark:bg-[#2A2A32]">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>

              <h2 className="text-2xl font-bold text-red-600 dark:text-red-400">
                Invalid Reset Link
              </h2>

              <p className="text-[#737373] dark:text-[#A1A1AA]">
                This password reset link is invalid or has expired.
              </p>

              <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg border border-red-200 dark:border-red-800/30">
                <p className="text-sm text-red-800 dark:text-red-400">
                  Reset links expire after 1 hour for security reasons.
                </p>
              </div>

              <Button
                onClick={() => navigate("/forgot-password")}
                className="w-full h-11 text-base bg-[#0A0A0A] hover:bg-[#262626] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] text-white dark:text-[#1E1E24] font-semibold"
              >
                Request New Reset Link
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex">
      {/* ========================================
                LEFT PANEL - RESET PASSWORD FORM
                ======================================== */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1E1E24]">
        <div className="w-full max-w-md">
          {/* Header */}
          <div className="mb-8">
            <p className="text-sm font-medium text-primary dark:text-[#FCC52C] mb-2">
              Almost done
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] dark:text-white mb-2">
              Set new password
            </h1>
            <p className="text-sm text-[#737373] dark:text-[#A1A1AA]">
              Your new password must be different from previously used
              passwords.
            </p>
          </div>

          {/* Form Card */}
          <Card className="border border-[#E5E7EB] dark:border-[#35353F] shadow-lg bg-white dark:bg-[#2A2A32]">
            <CardContent className="p-6">
              {success ? (
                // ✅ SUCCESS STATE
                <div className="space-y-6">
                  <div className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
                    </div>

                    <div>
                      <h3 className="text-xl font-bold text-[#0A0A0A] dark:text-white mb-2">
                        Password Updated!
                      </h3>
                      <p className="text-sm text-[#737373] dark:text-[#A1A1AA]">
                        Your password has been successfully reset.
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg border border-green-200 dark:border-green-800/30">
                      <p className="text-sm text-green-800 dark:text-green-400">
                        You can now login with your new password.
                      </p>
                    </div>

                    <div className="flex items-center justify-center gap-2 text-sm text-[#737373] dark:text-[#A1A1AA]">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Redirecting to login in 3 seconds...</span>
                    </div>
                  </div>

                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full h-11 text-base bg-[#0A0A0A] hover:bg-[#262626] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] text-white dark:text-[#1E1E24] font-semibold"
                  >
                    Go to Login Now
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              ) : (
                // 📝 FORM STATE
                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Error Alert */}
                  {error && (
                    <Alert className="py-3 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <AlertDescription className="text-red-700 dark:text-red-400 text-sm">
                        {error}
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* New Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="text-sm font-medium text-[#0A0A0A] dark:text-white"
                    >
                      New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        placeholder="Enter new password (min 6 characters)"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-11 pl-10 pr-10 border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA] focus:ring-2 focus:ring-[#0A0A0A] dark:focus:ring-[#FCC52C] focus:border-[#0A0A0A] dark:focus:border-[#FCC52C]"
                        minLength={6}
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />

                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FCC52C] transition-colors"
                        tabIndex={-1}
                      >
                        {showNewPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="text-sm font-medium text-[#0A0A0A] dark:text-white"
                    >
                      Confirm New Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Re-enter new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                        className="h-11 pl-10 pr-10 border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA] focus:ring-2 focus:ring-[#0A0A0A] dark:focus:ring-[#FCC52C] focus:border-[#0A0A0A] dark:focus:border-[#FCC52C]"
                        minLength={6}
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />

                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#737373] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FCC52C] transition-colors"
                        tabIndex={-1}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Password Strength Indicator */}
                  {newPassword && (
                    <div className="space-y-2">
                      <div className="flex gap-1">
                        <div
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            newPassword.length >= 6
                              ? "bg-green-500"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                        <div
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            newPassword.length >= 8
                              ? "bg-green-500"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                        <div
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            newPassword.length >= 10 &&
                            /[A-Z]/.test(newPassword) &&
                            /[0-9]/.test(newPassword)
                              ? "bg-green-500"
                              : "bg-gray-200 dark:bg-gray-700"
                          }`}
                        />
                      </div>
                      <p className="text-xs text-[#737373] dark:text-[#A1A1AA]">
                        {newPassword.length < 6 &&
                          "Weak - At least 6 characters required"}
                        {newPassword.length >= 6 &&
                          newPassword.length < 8 &&
                          "Fair - 8+ characters recommended"}
                        {newPassword.length >= 8 && "Good - Strong password"}
                      </p>
                    </div>
                  )}

                  {/* Password Match Indicator */}
                  {confirmPassword && (
                    <div
                      className={`text-xs ${
                        newPassword === confirmPassword
                          ? "text-green-600 dark:text-green-400"
                          : "text-red-600 dark:text-red-400"
                      }`}
                    >
                      {newPassword === confirmPassword
                        ? "✓ Passwords match"
                        : "✗ Passwords do not match"}
                    </div>
                  )}

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-11 text-base bg-[#0A0A0A] hover:bg-[#262626] active:bg-[#333333] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] dark:active:bg-[#F67C09] text-white dark:text-[#1E1E24] font-semibold shadow-md hover:shadow-lg dark:shadow-[0_4px_20px_rgba(252,197,44,0.3)] transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Updating password...
                      </>
                    ) : (
                      <>
                        Reset Password
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ========================================
                RIGHT PANEL - BRAND SHOWCASE (SAME AS LOGIN)
                ======================================== */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0A0A0F] relative items-center justify-center overflow-hidden">
        <style>{`
                    @keyframes borderFlow {
                        0%, 100% { background-position: 0% 50%; }
                        50% { background-position: 100% 50%; }
                    }
                    
                    @keyframes glow {
                        0%, 100% { opacity: 0.5; transform: scale(1); }
                        50% { opacity: 1; transform: scale(1.2); }
                    }
                    
                    .animated-corner-tl::before {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 150px;
                        height: 3px;
                        background: linear-gradient(90deg, #FCC52C, #F38810, #FCC52C, #F38810);
                        background-size: 300% 100%;
                        animation: borderFlow 2s ease-in-out infinite;
                        border-radius: 0 4px 4px 0;
                    }
                    
                    .animated-corner-tl::after {
                        content: '';
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 3px;
                        height: 150px;
                        background: linear-gradient(180deg, #FCC52C, #F38810, #FCC52C, #F38810);
                        background-size: 100% 300%;
                        animation: borderFlow 2s ease-in-out infinite;
                        border-radius: 0 0 4px 4px;
                    }
                    
                    .animated-corner-br::before {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        right: 0;
                        width: 150px;
                        height: 3px;
                        background: linear-gradient(90deg, #F38810, #FCC52C, #F38810, #FCC52C);
                        background-size: 300% 100%;
                        animation: borderFlow 2s ease-in-out infinite;
                        border-radius: 4px 0 0 4px;
                    }
                    
                    .animated-corner-br::after {
                        content: '';
                        position: absolute;
                        bottom: 0;
                        right: 0;
                        width: 3px;
                        height: 150px;
                        background: linear-gradient(180deg, #F38810, #FCC52C, #F38810, #FCC52C);
                        background-size: 100% 300%;
                        animation: borderFlow 2s ease-in-out infinite;
                        border-radius: 4px 4px 0 0;
                    }
                    
                    .glow-dot {
                        animation: glow 2s ease-in-out infinite;
                    }
                `}</style>

        <div className="animated-corner-tl absolute inset-0 pointer-events-none z-20" />
        <div className="animated-corner-br absolute inset-0 pointer-events-none z-20" />
        <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-[#FCC52C] rounded-full glow-dot shadow-lg shadow-[#FCC52C]/60 z-20" />
        <div
          className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#F38810] rounded-full glow-dot shadow-lg shadow-[#F38810]/60 z-20"
          style={{ animationDelay: "1s" }}
        />

        <div className="absolute inset-0">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-[#FCC52C]/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#F38810]/8 rounded-full blur-[120px]" />
          <div
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
              backgroundSize: "32px 32px",
            }}
          />
        </div>

        <div className="relative z-10 text-center px-12 flex flex-col items-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl blur-2xl opacity-40" />
            <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl shadow-2xl">
              <Truck className="w-10 h-10 text-[#0A0A0F]" />
            </div>
          </div>

          <h2 className="text-4xl font-bold text-white mb-2">
            Freight<span className="text-[#FCC52C]"> SynQ</span>
          </h2>
          <p className="text-gray-400 text-lg mb-10">
            Smart logistics for modern fleets
          </p>

          <div className="flex flex-wrap justify-center gap-3 mb-14">
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <Shield className="w-4 h-4 text-[#FCC52C]" />
              <span className="text-sm text-gray-300">Secure</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <Zap className="w-4 h-4 text-[#FCC52C]" />
              <span className="text-sm text-gray-300">Real-time</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
              <Globe className="w-4 h-4 text-[#FCC52C]" />
              <span className="text-sm text-gray-300">Global</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6 w-full max-w-md">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-[#FCC52C]/30 transition-all duration-300">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[#FCC52C]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  500<span className="text-[#FCC52C]">+</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Active Clients</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-[#FCC52C]/30 transition-all duration-300">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/10 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#FCC52C]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  99.9<span className="text-[#FCC52C]">%</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Uptime SLA</p>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <div className="relative p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-[#FCC52C]/30 transition-all duration-300">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/10 flex items-center justify-center">
                  <Headphones className="w-5 h-5 text-[#FCC52C]" />
                </div>
                <p className="text-2xl font-bold text-white">
                  24<span className="text-[#FCC52C]">/7</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">Support</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
