// src/pages/super-admin/CreateInvites.tsx
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { Loader2, Copy, CheckCircle, AlertCircle, Plus, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const CreateInvites = () => {
    const { isSuperAdmin, user } = useAuth();
    const [companyName, setCompanyName] = useState('');
    const [inviteExpiry, setInviteExpiry] = useState('48');
    const [portalAccess, setPortalAccess] = useState('30');
    const [loading, setLoading] = useState(false);
    const [generatedInvite, setGeneratedInvite] = useState<any>(null);

    // Protection
    if (!isSuperAdmin) {
        return <Navigate to="/" replace />;
    }

    const generateInvite = async () => {
        if (!companyName.trim()) {
            toast.error('Please enter company name');
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase.rpc('create_company_invite', {
                p_company_name: companyName,
                p_invite_valid_hours: parseInt(inviteExpiry),
                p_portal_access_days: parseInt(portalAccess),
                p_created_by: user?.id
            });

            if (error) throw error;

            setGeneratedInvite(data);
            toast.success('Invite code generated successfully!');

            // Reset form
            setCompanyName('');
        } catch (error: any) {
            console.error('Generate invite error:', error);
            toast.error(error.message || 'Failed to generate invite');
        } finally {
            setLoading(false);
        }
    };

    const copyInviteLink = () => {
        const link = `${window.location.origin}/signup?invite=${generatedInvite.invite_code}`;
        navigator.clipboard.writeText(link);
        toast.success('Invite link copied to clipboard!');
    };

    return (
        <div className="container mx-auto p-6 max-w-4xl">
            <div className="mb-6">
                <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Plus className="w-8 h-8 text-primary" />
                    Create Company Invite
                </h1>
                <p className="text-muted-foreground mt-2">
                    Generate invite codes for new companies to join the platform
                </p>
            </div>

            <div className="grid gap-6">
                {/* Generate Form */}
                <Card>
                    <CardHeader>
                        <CardTitle>Invite Details</CardTitle>
                        <CardDescription>
                            Configure the invite code parameters
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="companyName">Company Name *</Label>
                            <Input
                                id="companyName"
                                placeholder="ABC Transport Ltd."
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="mt-1"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="inviteExpiry">Signup Valid For</Label>
                                <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                                    <SelectTrigger id="inviteExpiry" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="24">24 Hours</SelectItem>
                                        <SelectItem value="48">48 Hours</SelectItem>
                                        <SelectItem value="72">3 Days</SelectItem>
                                        <SelectItem value="168">7 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="portalAccess">Portal Access Duration</Label>
                                <Select value={portalAccess} onValueChange={setPortalAccess}>
                                    <SelectTrigger id="portalAccess" className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="15">15 Days (Trial)</SelectItem>
                                        <SelectItem value="30">1 Month</SelectItem>
                                        <SelectItem value="90">3 Months</SelectItem>
                                        <SelectItem value="180">6 Months</SelectItem>
                                        <SelectItem value="365">1 Year</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <Button
                            onClick={generateInvite}
                            disabled={loading || !companyName.trim()}
                            className="w-full"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Generate Invite Code
                                </>
                            )}
                        </Button>
                    </CardContent>
                </Card>

                {/* Generated Invite */}
                {generatedInvite && (
                    <Card className="border-green-200 bg-green-50/50">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-5 h-5 text-green-600" />
                                <CardTitle className="text-green-900">Invite Generated Successfully!</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label className="text-green-700">Invite Code</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={generatedInvite.invite_code}
                                        readOnly
                                        className="font-mono font-bold text-lg bg-white"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedInvite.invite_code);
                                            toast.success('Code copied!');
                                        }}
                                    >
                                        <Copy className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>

                            <div>
                                <Label className="text-green-700">Invite Link</Label>
                                <div className="flex gap-2 mt-1">
                                    <Input
                                        value={`${window.location.origin}/signup?invite=${generatedInvite.invite_code}`}
                                        readOnly
                                        className="bg-white text-sm"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={copyInviteLink}
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Link
                                    </Button>
                                </div>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    <strong>Expires:</strong> {new Date(generatedInvite.expires_at).toLocaleString()}
                                    <br />
                                    <strong>Portal Access:</strong> {generatedInvite.portal_access_days} days
                                </AlertDescription>
                            </Alert>

                            <Button
                                variant="outline"
                                onClick={() => setGeneratedInvite(null)}
                                className="w-full"
                            >
                                <RefreshCw className="w-4 h-4 mr-2" />
                                Create Another Invite
                            </Button>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
};