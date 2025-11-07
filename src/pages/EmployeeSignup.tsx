import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Truck, CheckCircle, Building2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

export const EmployeeSignup = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        name: '',
        phone: '',
        companyCode: '',
    });
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

    const verifyCompanyCode = async () => {
        if (!formData.companyCode) {
            setError('Please enter a company code');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const code = formData.companyCode.trim();
            console.log('Verifying company code:', code);

            // Simple direct query
            const { data, error } = await supabase
                .from('companies')
                .select('id, name, email, phone')
                .eq('company_code', code);

            console.log('Query result:', { data, error });

            if (error) {
                console.error('Company code verification error:', error);
                setError('Invalid company code. Please check and try again.');
                return;
            }

            if (data && data.length > 0) {
                setCompanyDetails(data[0]);
                setStep('details');
            } else {
                setError('Invalid company code. Please check and try again.');
            }
        } catch (error: any) {
            console.error('Verification error:', error);
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

        // Validation
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
            // Step 1: Create auth user first
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: formData.email,
                password: formData.password,
                options: {
                    data: {
                        name: formData.name,
                        phone: formData.phone,
                        role: 'operator',
                        company_id: companyDetails.id
                    }
                }
            });

            if (authError) {
                setError(authError.message);
                return;
            }

            if (authData.user) {
                console.log('✅ Auth user created:', authData.user.id);

                // Step 2: Sign in immediately to get authenticated session
                const { error: signInError } = await supabase.auth.signInWithPassword({
                    email: formData.email,
                    password: formData.password,
                });

                if (signInError) {
                    console.error('Sign in error:', signInError);
                    setError('Account created but could not sign in. Please login manually.');
                    setSuccess(true);
                    return;
                }

                // Step 3: Now create the profile with authenticated user
                const { error: profileError } = await supabase
                    .from('users')
                    .insert({
                        id: authData.user.id,
                        email: formData.email,
                        name: formData.name,
                        phone: formData.phone || '',
                        role: 'operator',
                        company_id: companyDetails.id,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    });

                if (profileError) {
                    console.error('❌ Profile creation error:', profileError);
                    // Don't show error to user if profile creation fails
                    // The trigger or manual creation will handle it
                }

                console.log('✅ Employee signup complete');
                setSuccess(true);

                // Redirect to dashboard
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
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
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="pt-6">
                        <div className="text-center space-y-4">
                            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
                            <h2 className="text-2xl font-bold">Account Created!</h2>
                            <p className="text-muted-foreground">
                                Your employee account has been created successfully. You can now sign in.
                            </p>
                            <Button asChild className="w-full">
                                <Link to="/login">Go to Login</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary-hover rounded-lg flex items-center justify-center">
                            <Truck className="w-6 h-6 text-primary-foreground" />
                        </div>
                    </div>
                    <CardTitle className="text-2xl">Join Your Company</CardTitle>
                    <CardDescription>
                        {step === 'code'
                            ? 'Enter your company code to join'
                            : `Join ${companyDetails?.name} as an employee`}
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
                                        placeholder="Enter company code (e.g. AMT001)"
                                        value={formData.companyCode}
                                        onChange={handleInputChange}
                                        required
                                        disabled={loading}
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Ask your company administrator for the code
                                    </p>
                                </div>

                                <Button
                                    type="button"
                                    onClick={verifyCompanyCode}
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Verify Company
                                </Button>
                            </>
                        ) : (
                            <>
                                {/* Company Information */}
                                <div className="bg-muted/30 p-3 rounded-lg mb-4">
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
                                        <Label htmlFor="name">Full Name</Label>
                                        <Input
                                            id="name"
                                            name="name"
                                            placeholder="Enter your full name"
                                            value={formData.name}
                                            onChange={handleInputChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="phone">Phone Number</Label>
                                        <Input
                                            id="phone"
                                            name="phone"
                                            placeholder="Enter phone number"
                                            value={formData.phone}
                                            onChange={handleInputChange}
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email</Label>
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="Enter your email address"
                                            value={formData.email}
                                            onChange={handleInputChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="password">Password</Label>
                                        <Input
                                            id="password"
                                            name="password"
                                            type="password"
                                            placeholder="Create password (min 6 characters)"
                                            value={formData.password}
                                            onChange={handleInputChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="confirmPassword">Confirm Password</Label>
                                        <Input
                                            id="confirmPassword"
                                            name="confirmPassword"
                                            type="password"
                                            placeholder="Confirm your password"
                                            value={formData.confirmPassword}
                                            onChange={handleInputChange}
                                            required
                                            disabled={loading}
                                        />
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={loading}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Create Account
                                </Button>
                            </>
                        )}
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary hover:underline">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};