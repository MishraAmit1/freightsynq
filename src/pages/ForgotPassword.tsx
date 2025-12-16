import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Truck,
  AlertTriangle,
  Mail,
  ArrowLeft,
  CheckCircle,
  Shield,
  Zap,
  Globe,
  Users,
  Clock,
  Headphones,
  Info,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const ForgotPassword = () => {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [emailSentTo, setEmailSentTo] = useState("");

  const isEmail = (str: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
  };

  const maskEmail = (email: string): string => {
    const [username, domain] = email.split("@");
    if (username.length <= 3) {
      return `${username[0]}***@${domain}`;
    }
    return `${username.slice(0, 2)}****${username.slice(-1)}@${domain}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess(false);

    try {
      // Case insensitive
      let emailToUse = identifier.trim().toLowerCase();

      // If username provided, lookup email
      if (!isEmail(identifier)) {
        console.log("🔍 Looking up username:", identifier);

        const { data: emailResult, error: lookupError } = await supabase.rpc(
          "get_email_by_username",
          {
            p_username: identifier.trim().toLowerCase(),
          }
        );

        if (!lookupError && emailResult) {
          emailToUse = emailResult.toLowerCase();
          console.log("✅ Username found, email retrieved");
        } else {
          // Username not found
          console.log("❌ Username not found");
          // Still show success for security
          setSuccess(true);
          setEmailSentTo("your registered email address");
          return;
        }
      }

      // ✅ SKIP EMAIL EXISTS CHECK - Just send reset email
      // Supabase will handle if email doesn't exist
      console.log("📧 Sending reset email to:", emailToUse);

      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        emailToUse,
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (resetError) {
        console.error("Reset email error:", resetError);
        if (resetError.message.includes("Email rate limit exceeded")) {
          setError(
            "Too many requests. Please wait a few minutes and try again."
          );
          setLoading(false);
          return;
        }
      }

      // Always show success (security)
      setSuccess(true);

      if (isEmail(identifier)) {
        setEmailSentTo(maskEmail(identifier));
      } else {
        setEmailSentTo("your registered email address");
      }

      setIdentifier("");
    } catch (error: any) {
      console.error("Forgot password error:", error);
      setError("Something went wrong. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* LEFT PANEL - FORGOT PASSWORD FORM */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1E1E24]">
        <div className="w-full max-w-md">
          {/* Back Button */}
          <Link
            to="/login"
            className="inline-flex items-center gap-2 text-sm text-[#737373] dark:text-[#A1A1AA] hover:text-[#0A0A0A] dark:hover:text-[#FCC52C] transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to login
          </Link>

          {/* Header */}
          <div className="mb-8">
            <p className="text-sm font-medium text-primary dark:text-[#FCC52C] mb-2">
              Reset Password
            </p>
            <h1 className="text-3xl sm:text-4xl font-bold text-[#0A0A0A] dark:text-white mb-2">
              Forgot your password?
            </h1>
            <p className="text-sm text-[#737373] dark:text-[#A1A1AA]">
              No worries! Enter your username or email and we'll send you reset
              instructions.
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
                        Check your email!
                      </h3>
                      <p className="text-sm text-[#737373] dark:text-[#A1A1AA]">
                        If an account exists, we've sent password reset
                        instructions to:
                      </p>
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800/30 rounded-lg">
                      <p className="text-sm font-medium text-green-800 dark:text-green-400">
                        {emailSentTo}
                      </p>
                    </div>

                    {/* Security Note */}
                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg border border-blue-200 dark:border-blue-800/30">
                      <div className="flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div className="text-left">
                          <p className="text-xs font-medium text-blue-800 dark:text-blue-400 mb-1">
                            Security Notice:
                          </p>
                          <p className="text-xs text-blue-700 dark:text-blue-300">
                            For security reasons, we don't confirm whether an
                            account exists. You'll only receive an email if you
                            have a registered account.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#F5F5F5] dark:bg-[#35353F] p-4 rounded-lg space-y-2 text-left">
                      <p className="text-xs font-medium text-[#0A0A0A] dark:text-white">
                        What's next?
                      </p>
                      <ul className="text-xs text-[#737373] dark:text-[#A1A1AA] space-y-1">
                        <li className="flex items-start gap-2">
                          <span className="text-[#FCC52C] mt-0.5">•</span>
                          <span>Check your email inbox</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#FCC52C] mt-0.5">•</span>
                          <span>Click the reset link (expires in 1 hour)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#FCC52C] mt-0.5">•</span>
                          <span>Create a new password</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-[#FCC52C] mt-0.5">•</span>
                          <span>Check spam folder if not received</span>
                        </li>
                      </ul>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button
                      onClick={() => {
                        setSuccess(false);
                        setEmailSentTo("");
                      }}
                      variant="outline"
                      className="w-full h-11 text-base border-[#E5E7EB] dark:border-[#35353F] hover:bg-[#F5F5F5] dark:hover:bg-[#35353F]"
                    >
                      <Mail className="mr-2 h-4 w-4" />
                      Send to different email
                    </Button>

                    <Button
                      asChild
                      className="w-full h-11 text-base bg-[#0A0A0A] hover:bg-[#262626] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] text-white dark:text-[#1E1E24] font-semibold"
                    >
                      <Link to="/login">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Login
                      </Link>
                    </Button>
                  </div>
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

                  {/* Username/Email Field */}
                  <div className="space-y-2">
                    <Label
                      htmlFor="identifier"
                      className="text-sm font-medium text-[#0A0A0A] dark:text-white"
                    >
                      Username or Email
                    </Label>
                    <div className="relative">
                      <Input
                        id="identifier"
                        type="text"
                        placeholder="Enter your username or email"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        required
                        disabled={loading}
                        className="h-11 pl-10 border-[#E5E7EB] dark:border-[#35353F] bg-white dark:bg-[#252530] text-[#0A0A0A] dark:text-white placeholder:text-[#737373] dark:placeholder:text-[#A1A1AA] focus:ring-2 focus:ring-[#0A0A0A] dark:focus:ring-[#FCC52C] focus:border-[#0A0A0A] dark:focus:border-[#FCC52C]"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#737373] dark:text-[#A1A1AA]" />
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-11 text-base bg-[#0A0A0A] hover:bg-[#262626] active:bg-[#333333] dark:bg-[#FCC52C] dark:hover:bg-[#F38810] dark:active:bg-[#F67C09] text-white dark:text-[#1E1E24] font-semibold shadow-md hover:shadow-lg dark:shadow-[0_4px_20px_rgba(252,197,44,0.3)] transition-all"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending reset link...
                      </>
                    ) : (
                      <>
                        Send Reset Link
                        <Mail className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>

                  {/* Back to Login Link */}
                  <p className="text-center text-sm text-[#737373] dark:text-[#A1A1AA]">
                    Remember your password?{" "}
                    <Link
                      to="/login"
                      className="text-[#0A0A0A] dark:text-[#FCC52C] hover:underline font-medium"
                    >
                      Sign in
                    </Link>
                  </p>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* RIGHT PANEL - Same as before */}
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
