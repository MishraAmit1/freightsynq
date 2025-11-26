import { useState, useEffect } from 'react';
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Loader2,
    Truck,
    CheckCircle,
    Building2,
    User,
    ArrowRight,
    Sparkles,
    Package,
    Shield,
    Zap,
    XCircle,
    AlertTriangle,
    Users,
    Clock,
    Headphones
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { lookupGST, GSTData } from '@/api/gst-lookup';

export const Signup = () => {
    const [searchParams] = useSearchParams();
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        confirmPassword: '',
        companyName: '',
        userName: '',
        userPhone: '',
        gstNumber: '',
        panNumber: '',
        companyType: 'transporter',
        termsAccepted: false
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [gstData, setGstData] = useState<GSTData | null>(null);
    const [gstLookupLoading, setGstLookupLoading] = useState(false);
    const [gstValid, setGstValid] = useState<boolean | null>(null);
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    // Invite code states
    const [inviteCode, setInviteCode] = useState('');
    const [inviteValid, setInviteValid] = useState<boolean | null>(null);
    const [inviteData, setInviteData] = useState<any>(null);
    const [validatingInvite, setValidatingInvite] = useState(false);
    const [inviteError, setInviteError] = useState('');

    const navigate = useNavigate();
    const { user } = useAuth();

    if (user) {
        return <Navigate to="/" replace />;
    }

    // Check for invite code in URL
    useEffect(() => {
        const code = searchParams.get('invite');
        if (code) {
            setInviteCode(code);
            validateInvite(code);
        }
    }, [searchParams]);

    // Validate invite code
    const validateInvite = async (code: string) => {
        setValidatingInvite(true);
        setError('');
        setInviteError('');

        try {
            const { data, error } = await supabase.rpc('validate_invite_code', {
                p_invite_code: code
            });

            if (error) throw error;

            if (data.valid) {
                setInviteValid(true);
                setInviteData(data);
                setInviteError('');
                toast.success('Valid invite code!', {
                    description: `Company: ${data.company_name}`
                });
            } else {
                setInviteValid(false);
                setInviteError(data.error || 'Invalid invite code');
            }
        } catch (err: any) {
            console.error('Invite validation error:', err);
            setInviteValid(false);
            setInviteError('Failed to validate invite code');
        } finally {
            setValidatingInvite(false);
        }
    };

    const checkUsernameAvailability = async (username: string) => {
        if (username.length < 3) {
            setUsernameAvailable(false);
            setError('Username must be at least 3 characters');
            return;
        }

        setCheckingUsername(true);
        setError('');

        try {
            const { data, error } = await supabase
                .rpc('check_username_exists', { p_username: username });

            if (error) {
                console.error('Username check error:', error);
                setUsernameAvailable(false);
                return;
            }

            if (data === true) {
                setUsernameAvailable(false);
                setError('Username already taken. Please choose another.');
            } else {
                setUsernameAvailable(true);
                setError('');
            }
        } catch (err) {
            console.error('Username check error:', err);
            setUsernameAvailable(false);
        } finally {
            setCheckingUsername(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (name === 'gstNumber' && value.length === 15) {
            handleGSTLookup(value);
        } else if (name === 'gstNumber' && value.length < 15) {
            setGstData(null);
            setGstValid(null);
            setError('');
        }
    };

    const handleGSTLookup = async (gstNumber: string) => {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstNumber)) {
            setGstValid(false);
            setGstData(null);
            setError('Invalid GST number format');
            return;
        }

        setGstLookupLoading(true);
        setError('');

        try {
            const result = await lookupGST(gstNumber);

            if (result.success && result.tradeName) {
                console.log('✅ GST Data:', result);
                setGstData(result);
                setGstValid(true);
                const panFromGst = gstNumber.substring(2, 12);

                setFormData(prev => ({
                    ...prev,
                    companyName: result.tradeName || '',
                    userName: result.legalName || prev.userName,
                    panNumber: panFromGst || prev.panNumber
                }));

                toast.success('GST Verified Successfully', {
                    description: `Company: ${result.tradeName}`,
                });

            } else if (result.serviceDown) {
                setGstValid(false);
                setGstData(null);

                setError('⚠️ GST verification service is currently down. Please try again after some time.');

                toast.error('GST Service Unavailable', {
                    description: 'Please try again later.',
                    duration: 10000,
                });

            } else {
                setGstValid(false);
                setGstData(null);
                setError(result.error || 'Invalid GST number');

                toast.error('GST Verification Failed', {
                    description: result.error || 'Invalid GST number',
                });
            }

        } catch (err: any) {
            console.error('GST lookup error:', err);
            setGstValid(false);
            setGstData(null);
            setError('Failed to verify GST number. Please try again.');

            toast.error('Verification Error', {
                description: 'Unable to verify GST. Please try again.',
            });
        } finally {
            setGstLookupLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) return;

        setLoading(true);
        setError('');

        if (!formData.gstNumber) {
            setError('GST number is required for company registration');
            setLoading(false);
            return;
        }

        if (gstValid !== true) {
            setError('Please enter a valid and verified GST number');
            setLoading(false);
            return;
        }

        if (usernameAvailable === false || !formData.username) {
            setError('Please choose a valid username');
            setLoading(false);
            return;
        }

        if (inviteCode && !inviteValid) {
            setError('Invalid or expired invite code');
            setLoading(false);
            return;
        }

        if (!formData.termsAccepted) {
            setError('Please accept the terms and conditions');
            setLoading(false);
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            setError('Passwords do not match');
            setLoading(false);
            return;
        }

        if (formData.password.length < 6) {
            setError('Password must be at least 6 characters');
            setLoading(false);
            return;
        }

        try {
            const signupDataForUrl = {
                companyName: formData.companyName,
                userName: formData.userName,
                username: formData.username,
                userPhone: formData.userPhone,
                gstNumber: formData.gstNumber,
                panNumber: formData.panNumber,
                companyType: formData.companyType,
                city: gstData?.city || '',
                state: gstData?.state || '',
                address: gstData?.address || '',
                pincode: gstData?.pincode || '',
                inviteCode: inviteCode || null,
                portalAccessDays: inviteData?.portal_access_days || null
            };

            const encodedData = btoa(JSON.stringify(signupDataForUrl));
            const redirectUrl = `${window.location.origin}/verify-email?data=${encodedData}`;

            console.log('📦 Signup data prepared:', signupDataForUrl);

            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    emailRedirectTo: redirectUrl,
                }
            });

            if (authError) {
                if (authError.message.includes('already registered')) {
                    setError('This email is already registered. Please login.');
                } else {
                    setError(authError.message);
                }
                return;
            }

            if (authData.user) {
                console.log('✅ User created, verification email sent');
                localStorage.setItem('pendingVerificationEmail', formData.email);
                navigate('/verification-pending');
            }

        } catch (error: any) {
            console.error('Signup error:', error);
            setError(error.message || 'An error occurred during signup');
        } finally {
            setLoading(false);
        }
    };

    // Show validation loading
    if (validatingInvite) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
                    <p>Validating invite code...</p>
                </div>
            </div>
        );
    }

    // Block invalid invites
    if (inviteCode && inviteValid === false) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
                <Card className="w-full max-w-md border-red-200 shadow-2xl">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>

                            <h2 className="text-2xl font-bold text-red-600">Invalid Invite Code</h2>

                            <p className="text-muted-foreground">
                                {inviteError || 'This invite code cannot be used'}
                            </p>

                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <p className="text-sm text-red-800">
                                    <strong>Code:</strong> <code className="font-mono">{inviteCode}</code>
                                </p>
                            </div>

                            <div className="space-y-2 pt-2">
                                <p className="text-sm font-medium text-muted-foreground">
                                    Possible reasons:
                                </p>
                                <ul className="text-xs text-muted-foreground space-y-1 text-left list-disc list-inside">
                                    <li>Already used by another company</li>
                                    <li>Invite has expired</li>
                                    <li>Invite was cancelled</li>
                                    <li>Invalid code format</li>
                                </ul>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Button asChild className="w-full">
                                    <Link to="/login">
                                        Go to Login
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>

                                <p className="text-xs text-muted-foreground">
                                    Need help?{' '}
                                    <a
                                        href="mailto:support@freightsynq.com"
                                        className="text-primary hover:underline"
                                    >
                                        Contact Support
                                    </a>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Block public signup
    if (!inviteCode) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
                <Card className="w-full max-w-md border-border/50 shadow-2xl">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
                                <AlertTriangle className="w-8 h-8 text-orange-600" />
                            </div>

                            <h2 className="text-2xl font-bold">Invitation Required</h2>

                            <p className="text-muted-foreground">
                                FreightSynQ is an invite-only platform. You need a valid invitation code to create a company account.
                            </p>

                            <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                                <p className="text-sm font-medium">How to get access:</p>
                                <ul className="text-xs text-muted-foreground space-y-1 text-left list-disc list-inside">
                                    <li>Contact our sales team</li>
                                    <li>Request an invitation from your admin</li>
                                    <li>Email: sales@freightsynq.com</li>
                                </ul>
                            </div>

                            <div className="space-y-2 pt-4">
                                <Button asChild className="w-full">
                                    <Link to="/login">
                                        Go to Login
                                        <ArrowRight className="ml-2 h-4 w-4" />
                                    </Link>
                                </Button>

                                <p className="text-xs text-muted-foreground">
                                    Already have an account?{' '}
                                    <Link to="/employee-signup" className="text-primary hover:underline">
                                        Join as Employee
                                    </Link>
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }
    return (
        <div className="h-screen w-full flex overflow-hidden">
            {/* ✅ GLOBAL SCROLLBAR HIDE CSS */}
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


            {/* ✅ LEFT PANEL - SIGNUP FORM */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8 bg-white dark:bg-[#1E1E24] overflow-hidden">
                <div className="w-full max-w-lg h-full max-h-[90vh] flex flex-col">
                    {/* ✅ Header - CLEAN TEXT-BASED */}
                    <div className="mb-6 flex-shrink-0">
                        <p className="text-sm font-medium text-primary dark:text-primary mb-2">Get started</p>
                        <h1 className="text-3xl sm:text-4xl font-bold text-foreground dark:text-white">
                            Create your account
                        </h1>
                    </div>

                    {/* ✅ Scrollable Form - NO SCROLLBAR */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        <Card className="border border-border dark:border-border shadow-lg bg-card">
                            <CardContent className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    {/* Error Alert */}
                                    {error && (
                                        <Alert className="py-3 bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900/50">
                                            <AlertTriangle className="h-4 w-4 text-red-600" />
                                            <AlertDescription className="text-red-700 dark:text-red-400 text-xs">{error}</AlertDescription>
                                        </Alert>
                                    )}

                                    {/* Company Info */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4 text-primary dark:text-primary" />
                                            <span className="text-sm font-semibold text-foreground dark:text-white">Company Information</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-foreground dark:text-white">GST Number*</Label>
                                                <div className="relative">
                                                    <Input
                                                        name="gstNumber"
                                                        placeholder="15-digit GST"
                                                        value={formData.gstNumber}
                                                        onChange={handleInputChange}
                                                        required
                                                        className={cn(
                                                            "h-11 text-sm pr-10 uppercase border-border dark:border-border bg-card",
                                                            gstValid === true && "border-green-500",
                                                            gstValid === false && "border-red-500"
                                                        )}
                                                        maxLength={15}
                                                    />
                                                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                        {gstLookupLoading && <Loader2 className="w-4 h-4 animate-spin text-primary dark:text-primary" />}
                                                        {!gstLookupLoading && gstValid === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                        {!gstLookupLoading && gstValid === false && formData.gstNumber && <XCircle className="w-4 h-4 text-red-500" />}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-foreground dark:text-white">Company Name*</Label>
                                                <div className="relative">
                                                    <Input
                                                        name="companyName"
                                                        placeholder="Company name"
                                                        value={formData.companyName}
                                                        onChange={handleInputChange}
                                                        required
                                                        className={cn(
                                                            "h-11 text-sm border-border dark:border-border bg-card",
                                                            gstData && "bg-green-50 dark:bg-green-900/20 border-green-300"
                                                        )}
                                                    />
                                                    {gstData && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <Sparkles className="w-4 h-4 text-green-600" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground dark:text-white">PAN Number</Label>
                                            <Input
                                                name="panNumber"
                                                placeholder="10-digit PAN"
                                                value={formData.panNumber}
                                                onChange={handleInputChange}
                                                className={cn(
                                                    "h-11 text-sm uppercase border-border dark:border-border bg-card",
                                                    formData.panNumber && "bg-green-50 dark:bg-green-900/20 border-green-300"
                                                )}
                                                maxLength={10}
                                            />
                                        </div>
                                    </div>

                                    {/* Admin Details */}
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-1.5">
                                            <User className="w-4 h-4 text-primary dark:text-primary" />
                                            <span className="text-sm font-semibold text-foreground dark:text-white">Admin User Details</span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-foreground dark:text-white">Full Name*</Label>
                                                <div className="relative">
                                                    <Input
                                                        name="userName"
                                                        placeholder="Your name"
                                                        value={formData.userName}
                                                        onChange={handleInputChange}
                                                        required
                                                        className={cn(
                                                            "h-11 text-sm border-border dark:border-border bg-card",
                                                            gstData && "bg-green-50 dark:bg-green-900/20 border-green-300"
                                                        )}
                                                    />
                                                    {gstData && (
                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                            <Sparkles className="w-4 h-4 text-green-600" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-foreground dark:text-white">Phone</Label>
                                                <Input
                                                    name="userPhone"
                                                    placeholder="10-digit number"
                                                    value={formData.userPhone}
                                                    onChange={handleInputChange}
                                                    className="h-11 text-sm border-border dark:border-border bg-card"
                                                    maxLength={10}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground dark:text-white">Email Address*</Label>
                                            <Input
                                                name="email"
                                                type="email"
                                                placeholder="admin@company.com"
                                                value={formData.email}
                                                onChange={handleInputChange}
                                                required
                                                className="h-11 text-sm border-border dark:border-border bg-card"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <Label className="text-sm font-medium text-foreground dark:text-white">Username* (for login)</Label>
                                            <div className="relative">
                                                <Input
                                                    name="username"
                                                    placeholder="Unique username"
                                                    value={formData.username}
                                                    onChange={handleInputChange}
                                                    onBlur={(e) => {
                                                        if (e.target.value.length >= 3) {
                                                            checkUsernameAvailability(e.target.value);
                                                        }
                                                    }}
                                                    required
                                                    className={cn(
                                                        "h-11 text-sm border-border dark:border-border bg-card",
                                                        usernameAvailable === true && "border-green-500",
                                                        usernameAvailable === false && "border-red-500"
                                                    )}
                                                    minLength={3}
                                                    disabled={loading}
                                                />
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                    {checkingUsername && <Loader2 className="w-4 h-4 animate-spin text-primary dark:text-primary" />}
                                                    {!checkingUsername && usernameAvailable === true && <CheckCircle className="w-4 h-4 text-green-500" />}
                                                    {!checkingUsername && usernameAvailable === false && formData.username && <XCircle className="w-4 h-4 text-red-500" />}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-foreground dark:text-white">Password*</Label>
                                                <Input
                                                    name="password"
                                                    type="password"
                                                    placeholder="Min 6 characters"
                                                    value={formData.password}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="h-11 text-sm border-border dark:border-border bg-card"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium text-foreground dark:text-white">Confirm Password*</Label>
                                                <Input
                                                    name="confirmPassword"
                                                    type="password"
                                                    placeholder="Re-enter password"
                                                    value={formData.confirmPassword}
                                                    onChange={handleInputChange}
                                                    required
                                                    className="h-11 text-sm border-border dark:border-border bg-card"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Terms & Submit */}
                                    <div className="space-y-4 pt-2">
                                        <div className="flex items-center space-x-2">
                                            <Checkbox
                                                id="terms"
                                                checked={formData.termsAccepted}
                                                onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: !!checked })}
                                            />
                                            <Label htmlFor="terms" className="text-sm font-normal text-muted-foreground dark:text-muted-foreground cursor-pointer">
                                                I agree to the Terms & Conditions
                                            </Label>
                                        </div>

                                        <Button
                                            type="submit"
                                            className="w-full h-11 text-base bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-semibold shadow-md hover:shadow-lg transition-all"
                                            disabled={loading || !formData.termsAccepted || usernameAvailable === false || gstValid !== true}
                                        >
                                            {loading ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Creating Account...
                                                </>
                                            ) : (
                                                <>
                                                    Create Account
                                                    <ArrowRight className="ml-2 h-4 w-4" />
                                                </>
                                            )}
                                        </Button>

                                        <p className="text-center text-sm text-muted-foreground dark:text-muted-foreground">
                                            Already have an account?{' '}
                                            <Link to="/login" className="text-primary dark:text-primary hover:underline font-medium">Sign in</Link>
                                        </p>
                                    </div>
                                </form>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL - SAME AS BEFORE */}
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
                        Complete logistics management platform
                    </p>

                    {/* Feature Pills */}
                    <div className="flex flex-wrap justify-center gap-3 mb-14">
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                            <Package className="w-4 h-4 text-primary" />
                            <span className="text-sm text-gray-300">Smart Booking</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="text-sm text-gray-300">Secure</span>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-full backdrop-blur-sm">
                            <Zap className="w-4 h-4 text-primary" />
                            <span className="text-sm text-gray-300">Real-time</span>
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