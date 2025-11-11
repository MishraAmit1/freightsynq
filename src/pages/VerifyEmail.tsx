// pages/VerifyEmail.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';

export const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        handleEmailVerification();
    }, []);

    const handleEmailVerification = async () => {
        try {
            console.log('🔍 Starting verification...');

            // ✅ Get data from URL
            const encodedData = searchParams.get('data');
            if (!encodedData) {
                throw new Error('No signup data found. Please sign up again.');
            }

            const signupData = JSON.parse(atob(encodedData));
            console.log('📦 Signup data received:', signupData);

            // ✅ Check session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                throw new Error('Session expired. Please login.');
            }

            // ✅ Check if already setup
            const { data: existingUser } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', session.user.id)
                .single();

            if (existingUser?.company_id) {
                console.log('✅ Company already exists');
                setStatus('success');
                setTimeout(() => navigate('/'), 1000);
                return;
            }

            // ✅ Setup company with address
            console.log('🏢 Setting up company...');
            const { data: result, error: rpcError } = await supabase.rpc('setup_new_company', {
                p_company_name: signupData.companyName,
                p_user_email: session.user.email,
                p_user_name: signupData.userName,
                p_username: signupData.username,
                p_user_phone: signupData.userPhone || null,
                p_gst_number: signupData.gstNumber || null,
                p_pan_number: signupData.panNumber || null,
                p_company_type: signupData.companyType || 'transporter',
                p_city: signupData.city || null,
                p_state: signupData.state || null,
                p_address: signupData.address || null,
                p_pincode: signupData.pincode || null
            });

            if (rpcError) throw rpcError;

            console.log('✅ Company setup complete:', result);

            // ✅ NEW - Handle invite code if present
            if (signupData.inviteCode && signupData.portalAccessDays) {
                console.log('🎫 Invite Code:', signupData.inviteCode);
                console.log('📅 Portal Days:', signupData.portalAccessDays);
                console.log('🎫 Processing invite code:', signupData.inviteCode);

                // Calculate expiry date
                const accessExpiryDate = new Date();
                accessExpiryDate.setDate(accessExpiryDate.getDate() + parseInt(signupData.portalAccessDays));

                // Update company with access expiry
                const { error: updateError } = await supabase
                    .from('companies')
                    .update({
                        access_expires_at: accessExpiryDate.toISOString(),
                        is_trial: signupData.portalAccessDays <= 30
                    })
                    .eq('id', result.company_id);
                console.log('✅ Invite update error', updateError);
                if (updateError) {
                    console.error('⚠️ Failed to set company expiry:', updateError);
                } else {
                    console.log('✅ Company access expiry set:', accessExpiryDate);
                }

                // Mark invite as used
                const { error: inviteError } = await supabase
                    .from('company_invites')
                    .update({
                        status: 'used',
                        used_at: new Date().toISOString(),
                        used_by_user_id: session.user.id,
                        used_by_email: session.user.email
                    })
                    .eq('invite_code', signupData.inviteCode);

                if (inviteError) {
                    console.error('⚠️ Failed to mark invite as used:', inviteError);
                } else {
                    console.log('✅ Invite marked as used');
                }
            }

            setStatus('success');

            // Clean up
            localStorage.removeItem('pendingVerificationEmail');

            // Redirect
            setTimeout(() => {
                window.location.href = '/';
            }, 2000);

        } catch (error: any) {
            console.error('❌ Verification failed:', error);
            setStatus('error');
            setErrorMessage(error.message);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20 p-4">
            <Card className="w-full max-w-md border-border/50 shadow-2xl">
                <CardHeader className="text-center space-y-4">
                    {status === 'verifying' && (
                        <>
                            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <Loader2 className="w-8 h-8 text-primary animate-spin" />
                            </div>
                            <CardTitle className="text-2xl">Verifying Your Email</CardTitle>
                            <CardDescription>Please wait while we set up your account...</CardDescription>
                        </>
                    )}

                    {status === 'success' && (
                        <>
                            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                                <CheckCircle2 className="w-8 h-8 text-green-600" />
                            </div>
                            <CardTitle className="text-2xl text-green-600">Email Verified!</CardTitle>
                            <CardDescription>Your account has been successfully verified.</CardDescription>
                        </>
                    )}

                    {status === 'error' && (
                        <>
                            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                                <XCircle className="w-8 h-8 text-red-600" />
                            </div>
                            <CardTitle className="text-2xl text-red-600">Verification Failed</CardTitle>
                            <CardDescription>We couldn't verify your email address.</CardDescription>
                        </>
                    )}
                </CardHeader>

                <CardContent className="space-y-4">
                    {status === 'verifying' && (
                        <Alert>
                            <AlertDescription>
                                Setting up your company workspace...
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === 'success' && (
                        <Alert className="border-green-200 bg-green-50/50">
                            <AlertDescription className="text-green-700">
                                Redirecting to your dashboard...
                            </AlertDescription>
                        </Alert>
                    )}

                    {status === 'error' && (
                        <>
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>{errorMessage}</AlertDescription>
                            </Alert>

                            <div className="space-y-2">
                                <Button
                                    onClick={() => navigate('/signup')}
                                    className="w-full"
                                >
                                    Try Signing Up Again
                                </Button>
                                <Button
                                    onClick={() => navigate('/login')}
                                    variant="outline"
                                    className="w-full"
                                >
                                    Back to Login
                                </Button>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};