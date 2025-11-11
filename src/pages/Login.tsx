// pages/Login.tsx - FINAL VERSION
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
    Navigation,
    FileCheck,
    Mail
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

export const Login = () => {
    const [identifier, setIdentifier] = useState(''); // Can be email OR username
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

    // ✅ UPDATED handleSubmit function
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setShowIncompleteActions(false);

        try {
            let emailToUse = identifier.trim();

            // ✅ If username provided, fetch email using SECURE RPC function
            if (!isEmail(identifier)) {
                console.log('🔍 Looking up email for username:', identifier);

                // 🔥 UPDATED: Use RPC function instead of direct query
                const { data: emailResult, error: lookupError } = await supabase
                    .rpc('get_email_by_username', {
                        p_username: identifier.trim()
                    });

                if (lookupError || !emailResult) {
                    setError('Username not found. Please check and try again.');
                    setLoading(false);
                    return;
                }

                emailToUse = emailResult; // This is a string now
                console.log('✅ Found email for username:', emailToUse);
            }

            // Now sign in with email
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

            // Check if email is verified
            if (data?.user && !data.user.email_confirmed_at) {
                setError('Please verify your email before logging in. Check your inbox for the verification link.');
                localStorage.setItem('pendingVerificationEmail', emailToUse);
                await supabase.auth.signOut();
                setTimeout(() => {
                    window.location.href = '/verification-pending';
                }, 2000);
                setLoading(false);
                return;
            }

            // Check user profile and company
            if (data?.user) {
                const { data: userData, error: userError } = await supabase
                    .from('users')
                    .select('company_id, name, username')
                    .eq('id', data.user.id)
                    .single();

                if (userError || !userData) {
                    await supabase.auth.signOut();
                    setError('⚠️ User profile not found. Please contact support.');
                    setShowIncompleteActions(true);
                    setIncompleteEmail(emailToUse);
                    setLoading(false);
                    return;
                }

                if (!userData.company_id) {
                    await supabase.auth.signOut();
                    setError('⚠️ Account setup incomplete! Your email is verified but company setup was not completed.');
                    setShowIncompleteActions(true);
                    setIncompleteEmail(emailToUse);
                    setLoading(false);
                    return;
                }

                toast.success(`Welcome back, ${userData.name || userData.username}!`);
            }

        } catch (error: any) {
            console.error('Login error:', error);
            setError(error.message || 'An error occurred during login');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen w-full flex overflow-hidden">
            {/* Left Panel - Login Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-background">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl shadow-lg mb-4">
                            <Truck className="w-6 h-6 text-primary-foreground" />
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                            Welcome Back
                        </h1>
                        <p className="text-muted-foreground mt-2">
                            Sign in to continue to FreightSynQ
                        </p>
                    </div>

                    {/* Login Form */}
                    <Card className="border-border/50 shadow-xl bg-gradient-to-br from-background/50 to-background backdrop-blur-sm">
                        <CardContent className="p-6">
                            <form onSubmit={handleSubmit} className="space-y-5">
                                {error && (
                                    <Alert variant="destructive" className="py-3">
                                        <AlertTriangle className="h-4 w-4" />
                                        <AlertDescription>{error}</AlertDescription>
                                    </Alert>
                                )}

                                {showIncompleteActions && (
                                    <Card className="border-orange-200 bg-orange-50/50">
                                        <CardContent className="p-4 space-y-3">
                                            <p className="text-sm font-medium text-orange-900">
                                                What would you like to do?
                                            </p>
                                            <div className="space-y-2">
                                                <Button
                                                    type="button"
                                                    variant="outline"
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
                                                    className="w-full"
                                                    onClick={() => {
                                                        window.location.href = `mailto:support@freightsynq.com?subject=Incomplete Setup&body=Email: ${incompleteEmail}`;
                                                    }}
                                                >
                                                    <Mail className="mr-2 h-4 w-4" />
                                                    Contact Support
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}

                                {/* ✅ Username/Email Field */}
                                <div className="space-y-2">
                                    <Label htmlFor="identifier" className="text-sm font-medium">
                                        Username or Email
                                    </Label>
                                    <div className="relative">
                                        <Input
                                            id="identifier"
                                            type="text"
                                            placeholder="rajesh_logistics or admin@company.com"
                                            value={identifier}
                                            onChange={(e) => setIdentifier(e.target.value)}
                                            required
                                            disabled={loading}
                                            className="h-11 pl-10 border-muted-foreground/20 focus:border-primary transition-all"
                                        />
                                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Enter your username or email address
                                    </p>
                                </div>

                                {/* Password Field */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="password" className="text-sm font-medium">
                                            Password
                                        </Label>
                                        <Link
                                            to="/forgot-password"
                                            className="text-xs text-primary hover:text-primary/80 transition-colors"
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
                                            className="h-11 pl-10 border-muted-foreground/20 focus:border-primary transition-all"
                                        />
                                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    </div>
                                </div>

                                {/* Remember Me */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <Checkbox
                                            id="remember"
                                            checked={rememberMe}
                                            onCheckedChange={(checked) => setRememberMe(!!checked)}
                                            disabled={loading}
                                        />
                                        <Label
                                            htmlFor="remember"
                                            className="text-sm font-normal text-muted-foreground cursor-pointer"
                                        >
                                            Remember me
                                        </Label>
                                    </div>
                                </div>

                                {/* Submit Button */}
                                <Button
                                    type="submit"
                                    className="w-full h-11 text-base bg-gradient-to-r from-primary to-primary/80 hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
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

                    {/* Footer Links */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-muted-foreground">
                            By signing in, you agree to our{' '}
                            <Link to="/terms" className="text-primary hover:underline">
                                Terms
                            </Link>{' '}
                            and{' '}
                            <Link to="/privacy" className="text-primary hover:underline">
                                Privacy Policy
                            </Link>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Panel - Design */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative overflow-hidden">
                {/* Background Pattern */}
                <div className="absolute inset-0 bg-grid-white/5" />

                {/* Floating Elements */}
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '700ms' }} />

                {/* Centered Content */}
                <div className="flex items-center justify-center w-full h-full relative z-10">
                    <div className="max-w-md px-8 text-center">
                        {/* Logo */}
                        <div className="mb-8">
                            <div className="inline-flex w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl items-center justify-center shadow-2xl">
                                <Truck className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        {/* Welcome Text */}
                        <h2 className="text-4xl font-bold text-white mb-4">
                            Smart Logistics Platform
                        </h2>
                        <p className="text-white/90 text-lg mb-12">
                            Track, manage and optimize your fleet operations
                        </p>

                        {/* Feature Cards */}
                        <div className="space-y-4 mb-12">
                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 text-left">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Navigation className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Live Tracking</p>
                                    <p className="text-white/70 text-sm">Real-time GPS & FASTag</p>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 flex items-center gap-4 text-left">
                                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <FileCheck className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-semibold">Digital Documents</p>
                                    <p className="text-white/70 text-sm">Automated LR & E-way bills</p>
                                </div>
                            </div>
                        </div>

                        {/* Stats Bar */}
                        <div className="flex justify-center gap-8 text-white/80">
                            <div>
                                <div className="text-2xl font-bold">500+</div>
                                <div className="text-sm">Clients</div>
                            </div>
                            <div className="text-white/20">|</div>
                            <div>
                                <div className="text-2xl font-bold">99%</div>
                                <div className="text-sm">Uptime</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};