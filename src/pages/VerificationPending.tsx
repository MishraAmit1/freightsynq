// pages/VerificationPending.tsx - FIXED VERSION
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, RefreshCw, CheckCircle2, ArrowLeft, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';

export const VerificationPending = () => {
    const { toast } = useToast();
    const navigate = useNavigate();
    const [resending, setResending] = useState(false);
    const [resent, setResent] = useState(false);
    const [email, setEmail] = useState('');
    const [showEmailInput, setShowEmailInput] = useState(false);

    useEffect(() => {
        // Try to get email from localStorage
        const pendingEmail = localStorage.getItem('pendingVerificationEmail');

        if (pendingEmail) {
            setEmail(pendingEmail);
        } else {
            // Check if user is logged in (already verified)
            checkUserStatus();
        }
    }, []);

    const checkUserStatus = async () => {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
            if (user.email_confirmed_at) {
                // Already verified, redirect to dashboard
                toast({
                    title: '✅ Already Verified',
                    description: 'Your email is already verified. Redirecting...',
                });
                setTimeout(() => {
                    navigate('/');
                }, 1500);
            } else {
                // User logged in but not verified
                setEmail(user.email || '');
            }
        } else {
            // No user session, show email input
            setShowEmailInput(true);
        }
    };

    const handleResendEmail = async () => {
        // Validate email
        if (!email || !email.includes('@')) {
            toast({
                title: '❌ Invalid Email',
                description: 'Please enter a valid email address',
                variant: 'destructive',
            });
            return;
        }

        setResending(true);
        try {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: email.trim(),
            });

            if (error) throw error;

            setResent(true);

            // Store for future use
            localStorage.setItem('pendingVerificationEmail', email);

            toast({
                title: '✅ Email Sent',
                description: 'Verification email has been resent. Please check your inbox.',
            });
        } catch (error: any) {
            console.error('Resend error:', error);
            toast({
                title: '❌ Error',
                description: error.message || 'Failed to resend email. Please try signing up again.',
                variant: 'destructive',
            });
        } finally {
            setResending(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
            <Card className="w-full max-w-md border-border/50 shadow-2xl">
                <CardHeader className="text-center space-y-4">
                    <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                        <Mail className="w-8 h-8 text-primary" />
                    </div>
                    <CardTitle className="text-2xl">Check Your Email</CardTitle>
                    <CardDescription className="text-base">
                        We've sent a verification link to verify your account
                    </CardDescription>
                    {email && !showEmailInput && (
                        <p className="font-semibold text-foreground text-sm">{email}</p>
                    )}
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* Instructions */}
                    <div className="space-y-3">
                        <Alert className="border-blue-200 bg-blue-50/50">
                            <AlertDescription className="text-blue-700 space-y-2">
                                <p className="font-medium">Next steps:</p>
                                <ol className="list-decimal list-inside space-y-1 text-sm">
                                    <li>Check your email inbox</li>
                                    <li>Click the verification link</li>
                                    <li>Complete your company setup</li>
                                </ol>
                            </AlertDescription>
                        </Alert>

                        <Alert>
                            <AlertDescription className="text-sm">
                                💡 Didn't receive the email? Check your spam folder or resend below.
                            </AlertDescription>
                        </Alert>
                    </div>

                    {/* Email Input (if needed) */}
                    {showEmailInput && (
                        <div className="space-y-2">
                            <Label htmlFor="email">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={resending}
                                className="h-11"
                            />
                            <p className="text-xs text-muted-foreground">
                                Enter the email you used during signup
                            </p>
                        </div>
                    )}

                    {/* Email Display (if known) */}
                    {!showEmailInput && email && (
                        <div className="p-3 bg-muted/30 rounded-lg border">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-muted-foreground">Sending to:</p>
                                    <p className="font-medium text-sm">{email}</p>
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setShowEmailInput(true)}
                                    className="text-xs"
                                >
                                    Change
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Resend Button */}
                    <Button
                        onClick={handleResendEmail}
                        disabled={resending || resent || !email}
                        className="w-full"
                        variant={resent ? "outline" : "default"}
                    >
                        {resending ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                Sending...
                            </>
                        ) : resent ? (
                            <>
                                <CheckCircle2 className="mr-2 h-4 w-4" />
                                Email Sent!
                            </>
                        ) : (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Resend Verification Email
                            </>
                        )}
                    </Button>

                    {/* Help Text */}
                    {resent && (
                        <Alert className="border-green-200 bg-green-50/50">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-700 text-sm">
                                A new verification email has been sent. Please check your inbox.
                            </AlertDescription>
                        </Alert>
                    )}

                    {/* Back to Login */}
                    <div className="text-center space-y-2">
                        <Link
                            to="/login"
                            className="text-sm text-muted-foreground hover:text-primary inline-flex items-center"
                        >
                            <ArrowLeft className="mr-1 h-3 w-3" />
                            Back to Login
                        </Link>
                        <p className="text-xs text-muted-foreground">
                            or{' '}
                            <Link to="/signup" className="text-primary hover:underline">
                                Sign up again
                            </Link>
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};