import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
    Loader2,
    Truck,
    AlertTriangle,
    User,
    Lock,
    ArrowRight,
    Sparkles,
    Mail,
    Shield,
    Zap,
    Globe,
    Users,
    Clock,
    Headphones
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export const Login = () => {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showIncompleteActions, setShowIncompleteActions] = useState(false);
    const [incompleteEmail, setIncompleteEmail] = useState('');
    const { signIn, user } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    const isEmail = (str: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(str);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowIncompleteActions(false);

        try {
            let emailToUse = identifier.trim();

            if (!isEmail(identifier)) {
                const { data: emailResult, error: lookupError } = await supabase
                    .rpc('get_email_by_username', {
                        p_username: identifier.trim()
                    });

                if (lookupError || !emailResult) {
                    setError('Username not found. Please check and try again.');
                    setLoading(false);
                    return;
                }

                emailToUse = emailResult;
            }

            const { data, error: signInError } = await signIn(emailToUse, password);

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Invalid username/email or password');
                } else {
                    setError(signInError.message);
                }
                setLoading(false);
                return;
            }

            if (data?.user && !data.user.email_confirmed_at) {
                setError('Please verify your email before logging in.');
                localStorage.setItem('pendingVerificationEmail', emailToUse);
                await supabase.auth.signOut();
                setTimeout(() => {
                    window.location.href = '/verification-pending';
                }, 2000);
                setLoading(false);
                return;
            }

            if (data?.user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('company_id, name, username')
                    .eq('id', data.user.id)
                    .single();

                if (userError || !userData) {
                    await supabase.auth.signOut();
                    setError('User profile not found. Please contact support.');
                    setShowIncompleteActions(true);
                    setIncompleteEmail(emailToUse);
                    setLoading(false);
                    return;
                }

                if (!userData.company_id) {
                    await supabase.auth.signOut();
                    setError('Account setup incomplete!');
                    setShowIncompleteActions(true);
                    setIncompleteEmail(emailToUse);
                    setLoading(false);
                    return;
                }

                toast.success(`Welcome back, ${userData.name || userData.username}!`);
            }

        } catch (error: any) {
            setError(error.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex">
            {/* Left Panel - LOGIN FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1E1E24]">
                <div className="w-full max-w-md">
                    {/* ✅ Header - CLEAN & MINIMAL */}
                    <div className="mb-8">
                        <p className="text-sm font-medium text-primary dark:text-primary mb-2">Welcome back</p>
                        <h1 className="text-3xl sm:text-4xl font-bold text-foreground dark:text-white">
                            Sign in to your account
                        </h1>
                    </div>

                    {/* Login Form */}
                    <Card className="border border-border dark:border-border shadow-lg bg-card">
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <Alert className="py-3 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50">
                                        <AlertTriangle className="h-4 w-4 text-red-600" />
                                        <AlertDescription className="text-red-700 dark:text-red-400 text-sm">{error}</AlertDescription>
                                    </Alert>
                                )}

                                {showIncompleteActions && (
                                    <div className="p-4 rounded-lg border border-[#F38810]/30 bg-accent dark:bg-primary/10 space-y-3">
                                        <p className="text-sm font-medium text-primary dark:text-primary">
                                            What would you like to do?
                                        </p>
                                        <div className="flex flex-col gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    localStorage.setItem('retry_email', incompleteEmail);
                                                    window.location.href = '/signup';
                                                }}
                                            >
                                                <Sparkles className="mr-2 h-4 w-4" />
                                                Complete Registration
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                className="w-full"
                                                onClick={() => {
                                                    window.location.href = `mailto:support@freightsynq.com?subject=Incomplete Setup&body=Email: ${incompleteEmail}`;
                                                }}
                                            >
                                                <Mail className="mr-2 h-4 w-4" />
                                                Contact Support
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* Username/Email Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="identifier" className="text-sm font-medium text-foreground dark:text-white">
                                        Username or Email
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="identifier"
                                            type="text"
                                            placeholder="Enter username or email"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="h-11 pl-10 border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-sm font-medium text-foreground dark:text-white">
                                            Password
                                        </Label>
                                        <Link
                                            to="/forgot-password"
                                            className="text-xs text-primary dark:text-primary hover:text-primary dark:text-primary transition-colors"
                                        >
                                            Forgot password?
                                        </Link>
                                    </div>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type="password"
                                            placeholder="Enter your password"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="h-11 pl-10 border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Remember Me */}
                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="remember"
                                        checked={rememberMe}
                                        onCheckedChange={(checked) => setRememberMe(!!checked)}
                                        disabled={loading}
                                    />
                                    <Label
                                        htmlFor="remember"
                                        className="text-sm font-normal text-muted-foreground dark:text-muted-foreground cursor-pointer"
                                    >
                                        Remember me
                                    </Label>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all"
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Signing in...
                                        </>
                                    ) : (
                                        <>
                                            Sign In
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </>
                                    )}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* ✅ NO FOOTER - CLEAN! */}
                </div>
            </div>

            {/* RIGHT PANEL - BRAND SHOWCASE */}
            <div className="hidden lg:flex lg:w-1/2 bg-[#0A0A0F] relative items-center justify-center overflow-hidden">

                {/* Animated Border CSS */}
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

                {/* Animated Corners */}
                <div className="animated-corner-tl absolute inset-0 pointer-events-none z-20" />
                <div className="animated-corner-br absolute inset-0 pointer-events-none z-20" />

                {/* Corner Glow Dots */}
                <div className="absolute top-0 left-0 w-2.5 h-2.5 bg-primary rounded-full glow-dot shadow-lg shadow-[#FCC52C]/60 z-20" />
                <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-[#F38810] rounded-full glow-dot shadow-lg shadow-[#F38810]/60 z-20" style={{ animationDelay: '1s' }} />

                {/* Background Elements */}
                <div className="absolute inset-0">
                    <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary/8 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-[#F38810]/8 rounded-full blur-[120px]" />

                    <div
                        className="absolute inset-0 opacity-[0.02]"
                        style={{
                            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                            backgroundSize: '32px 32px'
                        }}
                    />
                </div>

                {/* Main Content */}
                <div className="relative z-10 text-center px-12 flex flex-col items-center">
                    {/* Logo */}
                    <div className="relative mb-8">
                        <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl blur-2xl opacity-40" />
                        <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#FCC52C] to-[#F38810] rounded-2xl shadow-2xl">
                            <Truck className="w-10 h-10 text-foreground" />
                        </div>
                    </div>

                    {/* Brand Name */}
                    <h2 className="text-4xl font-bold text-white mb-2">
                        Freight<span className="text-primary">SynQ</span>
                    </h2>
                    <p className="text-gray-400 text-lg mb-10">
                        Smart logistics for modern fleets
                    </p>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap justify-center gap-3 mb-14">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-sm text-gray-300">Secure</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm text-gray-300">Real-time</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                            <Globe className="w-4 h-4 text-primary" />
                            <span className="text-sm text-gray-300">Global</span>
                        </div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-6 w-full max-w-md">
                        {/* Stat 1 */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-primary/30 transition-all duration-300">
                                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/10 flex items-center justify-center">
                                    <Users className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-white">500<span className="text-primary">+</span></p>
                                <p className="text-xs text-gray-500 mt-1">Active Clients</p>
                            </div>
                        </div>

                        {/* Stat 2 */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-primary/30 transition-all duration-300">
                                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/10 flex items-center justify-center">
                                    <Clock className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-white">99.9<span className="text-primary">%</span></p>
                                <p className="text-xs text-gray-500 mt-1">Uptime SLA</p>
                            </div>
                        </div>

                        {/* Stat 3 */}
                        <div className="group relative">
                            <div className="absolute inset-0 bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                            <div className="relative p-5 bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10 rounded-2xl hover:border-primary/30 transition-all duration-300">
                                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-gradient-to-br from-[#FCC52C]/20 to-[#F38810]/10 flex items-center justify-center">
                                    <Headphones className="w-5 h-5 text-primary" />
                                </div>
                                <p className="text-2xl font-bold text-white">24<span className="text-primary">/7</span></p>
                                <p className="text-xs text-gray-500 mt-1">Support</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};