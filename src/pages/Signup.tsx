import { useState, useEffect } from 'react'; // ✅ Added useEffect
import { Navigate, Link, useNavigate, useSearchParams } from 'react-router-dom'; // ✅ Added useSearchParams
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
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
    AlertTriangle
} from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { lookupGST, GSTData } from '@/api/gst-lookup';

export const Signup = () => {
    const [searchParams] = useSearchParams(); // ✅ NEW
    const [formData, setFormData] = useState({
        email: '',
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
    const [success, setSuccess] = useState(false);

    const [gstValidating, setGstValidating] = useState(false);
    const [gstData, setGstData] = useState<GSTData | null>(null);
    const [gstLookupLoading, setGstLookupLoading] = useState(false);
    const [gstValid, setGstValid] = useState<boolean | null>(null);
    const [showGstDetails, setShowGstDetails] = useState(false);

    // ✅ NEW - Invite code states
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

    // ✅ NEW - Check for invite code in URL
    useEffect(() => {
        const code = searchParams.get('invite');
        if (code) {
            setInviteCode(code);
            validateInvite(code);
        }
    }, [searchParams]);

    // ✅ NEW - Validate invite code
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
                setError(data.error || 'Invalid invite code');
            }
        } catch (err: any) {
            console.error('Invite validation error:', err);
            setInviteValid(false);
            setInviteError('Failed to validate invite code');
            setError('Failed to validate invite code');
        } finally {
            setValidatingInvite(false);
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
            setShowGstDetails(false);
            setGstValid(null);
        }
    };

    const handleGSTLookup = async (gstNumber: string) => {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(gstNumber)) {
            setGstValid(false);
            setGstData(null);
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
                setShowGstDetails(true);
                const panFromGst = gstNumber.substring(2, 12);

                setFormData(prev => ({
                    ...prev,
                    companyName: result.tradeName || '',
                    userName: result.legalName || prev.userName,
                    panNumber: panFromGst || prev.panNumber
                }));

                toast.success('GST Verified', {
                    description: `Company: ${result.tradeName}`,
                });
            } else {
                setGstValid(false);
                setGstData(null);
                setError(result.error || 'Invalid GST number');
            }
        } catch (err: any) {
            console.error('GST lookup error:', err);
            setGstValid(false);
            setGstData(null);
            setError('Failed to verify GST number');
        } finally {
            setGstLookupLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (loading) return;

        setLoading(true);
        setError('');

        // ✅ NEW - Check invite code if present
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
                userPhone: formData.userPhone,
                gstNumber: formData.gstNumber,
                panNumber: formData.panNumber,
                companyType: formData.companyType,
                city: gstData?.city || '',
                state: gstData?.state || '',
                address: gstData?.address || '',
                pincode: gstData?.pincode || '',
                inviteCode: inviteCode || null, // ✅ NEW - Include invite code
                portalAccessDays: inviteData?.portal_access_days || null // ✅ NEW
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

    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
                <Card className="w-full max-w-md border-border/50 shadow-2xl">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <div className="relative">
                                <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                                <div className="absolute inset-0 blur-2xl bg-green-500/20 animate-pulse" />
                            </div>
                            <h2 className="text-2xl font-bold">Registration Successful!</h2>
                            <p className="text-muted-foreground">Your company account has been created.</p>
                            <Button asChild className="w-full">
                                <Link to="/login">Continue to Login <ArrowRight className="ml-2 h-4 w-4" /></Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ✅ NEW - Show validation loading
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
    // ✅ NEW - BLOCK INVALID INVITES (Form mat dikhao)
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
                                <ul className="text-xs text-muted-foreground space-y-1">
                                    <li>✗ Already used by another company</li>
                                    <li>✗ Invite has expired</li>
                                    <li>✗ Invite was cancelled</li>
                                    <li>✗ Invalid code</li>
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
    // ✅ NEW - BLOCK PUBLIC SIGNUP (No invite = No entry)
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
                                <ul className="text-xs text-muted-foreground space-y-1 text-left">
                                    <li>• Contact our sales team</li>
                                    <li>• Request an invitation from your admin</li>
                                    <li>• Email us at: sales@freightsynq.com</li>
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
            <div className="w-full lg:w-1/2 flex items-center justify-center p-4 bg-background">
                <div className="w-full max-w-lg">
                    <div className="mb-4">
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
                                <Truck className="w-5 h-5 text-primary-foreground" />
                            </div>
                            <h1 className="text-2xl font-bold">Create Company Account</h1>
                        </div>
                        <p className="text-sm text-muted-foreground">Join FreightSynQ logistics platform</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        {/* ✅ NEW - Invite Status Alert */}
                        {/* ✅ UPDATED - Simple alert */}
                        {inviteCode && inviteValid && (
                            <Alert className="border-green-200 bg-green-50">
                                <CheckCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-green-800 text-sm">
                                    <strong>✅ Valid Invite</strong>
                                    <br />
                                    Portal Access: <strong>{inviteData?.portal_access_days} days</strong>
                                </AlertDescription>
                            </Alert>
                        )}

                        {error && (
                            <Alert variant="destructive" className="py-2">
                                <AlertDescription className="text-xs">{error}</AlertDescription>
                            </Alert>
                        )}

                        {/* Company Info */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Company Info</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs mb-1">GST Number</Label>
                                    <div className="relative">
                                        <Input
                                            name="gstNumber"
                                            placeholder="Enter GST..."
                                            value={formData.gstNumber}
                                            onChange={handleInputChange}
                                            className={cn(
                                                "h-8 text-sm pr-8 uppercase",
                                                gstValid === true && "border-green-500",
                                                gstValid === false && "border-red-500"
                                            )}
                                            maxLength={15}
                                        />
                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                            {gstLookupLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                            {!gstLookupLoading && gstValid === true && <CheckCircle className="w-3.5 h-3.5 text-green-500" />}
                                            {!gstLookupLoading && gstValid === false && formData.gstNumber && <XCircle className="w-3.5 h-3.5 text-red-500" />}
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs mb-1">Company Name*</Label>
                                    <div className="relative">
                                        <Input
                                            name="companyName"
                                            placeholder="Auto-fills from GST"
                                            value={formData.companyName}
                                            onChange={handleInputChange}
                                            required
                                            className={cn(
                                                "h-8 text-sm",
                                                gstData && "bg-green-50 border-green-300"
                                            )}
                                        />

                                        {gstData && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                            <Sparkles className="w-3.5 h-3.5 text-green-600" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent>
                                                        <p>Auto-filled from GST</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs mb-1">PAN Number</Label>
                                    <Input
                                        name="panNumber"
                                        placeholder="Auto-fills from GST"
                                        value={formData.panNumber}
                                        onChange={handleInputChange}
                                        className="h-8 text-sm uppercase"
                                        maxLength={10}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Admin Details */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <User className="w-3.5 h-3.5 text-muted-foreground" />
                                <span className="text-xs font-medium text-muted-foreground">Admin Details</span>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs mb-1">Full Name*</Label>
                                    <div className="relative">
                                        <Input
                                            name="userName"
                                            placeholder="Auto-fills from GST"
                                            value={formData.userName}
                                            onChange={handleInputChange}
                                            required
                                            className={cn("h-8 text-sm", gstData && "bg-green-50 border-green-300")}
                                        />
                                        {gstData && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                            <Sparkles className="w-3.5 h-3.5 text-green-600" />
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent><p>Auto-filled from GST</p></TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-xs mb-1">Phone</Label>
                                    <Input
                                        name="userPhone"
                                        placeholder="9876543210"
                                        value={formData.userPhone}
                                        onChange={handleInputChange}
                                        className="h-8 text-sm"
                                        maxLength={10}
                                    />
                                </div>
                            </div>

                            <div>
                                <Label className="text-xs mb-1">Email Address*</Label>
                                <Input
                                    name="email"
                                    type="email"
                                    placeholder="admin@company.com"
                                    value={formData.email}
                                    onChange={handleInputChange}
                                    required
                                    className="h-8 text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div>
                                    <Label className="text-xs mb-1">Password*</Label>
                                    <Input
                                        name="password"
                                        type="password"
                                        placeholder="Min 6 characters"
                                        value={formData.password}
                                        onChange={handleInputChange}
                                        required
                                        className="h-8 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs mb-1">Confirm Password*</Label>
                                    <Input
                                        name="confirmPassword"
                                        type="password"
                                        placeholder="Confirm"
                                        value={formData.confirmPassword}
                                        onChange={handleInputChange}
                                        required
                                        className="h-8 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Terms & Submit */}
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center space-x-2">
                                <Checkbox
                                    id="terms"
                                    checked={formData.termsAccepted}
                                    onCheckedChange={(checked) => setFormData({ ...formData, termsAccepted: !!checked })}
                                    className="w-3.5 h-3.5"
                                />
                                <Label htmlFor="terms" className="text-xs text-muted-foreground cursor-pointer">
                                    I agree to the Terms & Conditions
                                </Label>
                            </div>

                            <Button
                                type="submit"
                                className="w-full h-9"
                                disabled={loading || !formData.termsAccepted}
                            >
                                {loading ? (
                                    <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> Creating...</>
                                ) : (
                                    <>Create Account <Sparkles className="ml-2 h-3.5 w-3.5" /></>
                                )}
                            </Button>

                            <p className="text-center text-xs text-muted-foreground">
                                Already have an account?{' '}
                                <Link to="/login" className="text-primary hover:underline">Sign in</Link>
                            </p>
                        </div>
                    </form>
                </div>
            </div>

            {/* Right Panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary via-primary/90 to-primary/80 relative">
                <div className="absolute inset-0 bg-grid-white/5" />
                <div className="absolute top-1/4 -left-20 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-white/5 rounded-full blur-3xl" />

                <div className="flex items-center justify-center w-full h-full relative z-10">
                    <div className="max-w-md px-8">
                        <div className="mb-8 text-center">
                            <div className="inline-flex w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl items-center justify-center">
                                <Truck className="w-10 h-10 text-white" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-bold text-white text-center mb-4">
                            Welcome to FreightSynQ
                        </h2>
                        <p className="text-white/90 text-center mb-8">
                            Complete logistics management platform
                        </p>

                        <div className="space-y-3">
                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Package className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">Smart Booking</p>
                                    <p className="text-white/70 text-xs">Manage shipments efficiently</p>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Shield className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">Secure Platform</p>
                                    <p className="text-white/70 text-xs">Enterprise-grade security</p>
                                </div>
                            </div>

                            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-3 flex items-center gap-3">
                                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center flex-shrink-0">
                                    <Zap className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="text-white font-medium text-sm">Real-time Tracking</p>
                                    <p className="text-white/70 text-xs">Live shipment updates</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};