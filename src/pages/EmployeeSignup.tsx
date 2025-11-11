// src/pages/EmployeeSignup.tsx - FINAL VERSION
import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, CheckCircle, Building2, User, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export const EmployeeSignup = () => {
    // ✅ ADDED 'username' to state
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        username: '', // ✅ NEW FIELD
        phone: '',
        companyCode: '',
    });

    // ✅ ADDED state for username validation
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [checkingUsername, setCheckingUsername] = useState(false);

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const [companyDetails, setCompanyDetails] = useState<any>(null);
    const [step, setStep] = useState<'code' | 'details'>('code');

    const { user } = useAuth();
    const navigate = useNavigate();

    // If already logged in, redirect to dashboard
    if (user) {
        return <Navigate to="/" replace />;
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({
            ...prev,
            [e.target.name]: e.target.value
        }));
    };

    // ✅ NEW: Function to check username
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
                setUsernameAvailable(false);
                return;
            }

            if (data === true) {
                setUsernameAvailable(false);
                setError('Username is already taken.');
            } else {
                setUsernameAvailable(true);
                setError('');
            }
        } catch (err) {
            setUsernameAvailable(false);
        } finally {
            setCheckingUsername(false);
        }
    };

    const verifyCompanyCode = async () => {
        if (!formData.companyCode) {
            setError('Please enter a company code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const code = formData.companyCode.trim().toUpperCase();
            console.log('Verifying company code:', code);

            const { data, error } = await supabase
                .from('companies')
                .select('id, name, email')
                .eq('company_code', code)
                .single();

            if (error || !data) {
                setError('Invalid company code. Please check and try again.');
                return;
            }

            setCompanyDetails(data);
            setStep('details');
        } catch (error: any) {
            setError(error.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (step === 'code') {
            await verifyCompanyCode();
            return;
        }

        setLoading(true);
        setError('');

        // Validations
        if (usernameAvailable === false || !formData.username) {
            setError('Please choose a valid and available username.');
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
            console.log('🚀 Calling employee-signup edge function...');

            // ✅ Call Edge Function
            const { data, error } = await supabase.functions.invoke('employee-signup', {
                body: {
                    email: formData.email,
                    password: formData.password,
                    name: formData.name,
                    username: formData.username.trim(),
                    phone: formData.phone || null,
                    companyId: companyDetails.id,
                }
            });

            console.log('📦 Edge function response:', { data, error });

            if (error) {
                console.error('❌ Edge function error:', error);
                setError(error.message || 'Failed to create account');
                setLoading(false);
                return;
            }

            // 🔥 CORRECT POSITION - Inside handleSubmit
            if (data?.success) {
                console.log('✅ Account created successfully');

                toast.success('Account Created!', {
                    description: 'Redirecting to login page...',
                    duration: 3000
                });

                // Direct redirect to login after 2 seconds
                setTimeout(() => {
                    navigate('/login');
                }, 2000);

                // Don't show success component, just redirect
                // setSuccess(true); // Remove this if you want direct redirect
            } else {
                console.error('❌ Signup failed:', data?.error);
                setError(data?.error || 'Failed to create account');
                setLoading(false);
            }

        } catch (error: any) {
            console.error('💥 Unexpected error:', error);
            setError(error.message || 'An unexpected error occurred.');
            setLoading(false);
        }
    };
    // handleSubmit mein success ke baad:


    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-lg flex items-center justify-center">
                            <Truck className="w-6 h-6 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Join Your Company</CardTitle>
                    <CardDescription>
                        {step === 'code'
                            ? 'Enter your company code to get started'
                            : `You are joining: ${companyDetails?.name}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        {error && (
                            <Alert variant="destructive">
                                <AlertDescription>{error}</AlertDescription>
                            </Alert>
                        )}

                        {step === 'code' ? (
                            <>
                                <div className="space-y-2">
                                    <Label htmlFor="companyCode">Company Code</Label>
                                    <Input
                                        id="companyCode"
                                        name="companyCode"
                                        placeholder="Enter company code (e.g., ABC123)"
                                        value={formData.companyCode}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                        className="uppercase"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Ask your company administrator for this code.
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={verifyCompanyCode}
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Verify & Continue
                                </Button>
                            </>
                        ) : (
                            <>
                                {/* Company Information */}
                                <div className="bg-muted/50 p-3 rounded-lg">
                                    <div className="flex items-center space-x-3">
                                        <Building2 className="w-5 h-5 text-primary" />
                                        <div>
                                            <h3 className="font-medium">{companyDetails?.name}</h3>
                                            <p className="text-xs text-muted-foreground">
                                                {companyDetails?.email}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* User Information */}
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="name">Full Name*</Label>
                                        <Input
                                            id="name" name="name" placeholder="Enter your full name"
                                            value={formData.name} onChange={handleInputChange} required disabled={loading}
                                        />
                                    </div>

                                    {/* ✅ NEW: Username Field */}
                                    <div className="space-y-2">
                                        <Label htmlFor="username">Username* (for login)</Label>
                                        <div className="relative">
                                            <Input
                                                id="username" name="username" placeholder="e.g., rajesh_operator"
                                                value={formData.username} onChange={handleInputChange} required disabled={loading}
                                                onBlur={(e) => checkUsernameAvailability(e.target.value)}
                                                className={cn(
                                                    "pr-8",
                                                    usernameAvailable === true && "border-green-500",
                                                    usernameAvailable === false && "border-red-500"
                                                )}
                                            />
                                            <div className="absolute right-2.5 top-2.5">
                                                {checkingUsername && <Loader2 className="h-4 w-4 animate-spin" />}
                                                {!checkingUsername && usernameAvailable === true && <CheckCircle className="h-4 w-4 text-green-500" />}
                                                {!checkingUsername && usernameAvailable === false && formData.username && <XCircle className="h-4 w-4 text-red-500" />}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone" name="phone" placeholder="Enter your 10-digit number"
                                            value={formData.phone} onChange={handleInputChange} disabled={loading} maxLength={10}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email*</Label>
                                        <Input
                                            id="email" name="email" type="email" placeholder="Enter your work email"
                                            value={formData.email} onChange={handleInputChange} required disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password*</Label>
                                        <Input
                                            id="password" name="password" type="password" placeholder="Min 6 characters"
                                            value={formData.password} onChange={handleInputChange} required disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password*</Label>
                                        <Input
                                            id="confirmPassword" name="confirmPassword" type="password" placeholder="Confirm your password"
                                            value={formData.confirmPassword} onChange={handleInputChange} required disabled={loading}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading || usernameAvailable === false}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create My Account
                                </Button>
                            </>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:underline font-medium">
                                Sign In
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};