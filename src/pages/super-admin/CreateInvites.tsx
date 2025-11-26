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
                <h1 className="text-3xl font-bold flex items-center gap-2 text-foreground dark:text-white">
                    <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                        <Plus className="w-8 h-8 text-primary dark:text-primary" />
                    </div>
                    Create Company Invite
                </h1>
                <p className="text-muted-foreground dark:text-muted-foreground mt-2">
                    Generate invite codes for new companies to join the platform
                </p>
            </div>

            <div className="grid gap-6">
                {/* Generate Form */}
                <Card className="bg-card border border-border dark:border-border">
                    <CardHeader className="border-b border-border dark:border-border">
                        <CardTitle className="text-foreground dark:text-white">Invite Details</CardTitle>
                        <CardDescription className="text-muted-foreground dark:text-muted-foreground">
                            Configure the invite code parameters
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-6">
                        <div className="space-y-2">
                            <Label htmlFor="companyName" className="text-sm font-medium text-foreground dark:text-white">
                                Company Name <span className="text-red-600">*</span>
                            </Label>
                            <Input
                                id="companyName"
                                placeholder="ABC Transport Ltd."
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                className="border-border dark:border-border bg-card text-foreground dark:text-white placeholder:text-muted-foreground dark:placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-primary"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="inviteExpiry" className="text-sm font-medium text-foreground dark:text-white">
                                    Signup Valid For
                                </Label>
                                <Select value={inviteExpiry} onValueChange={setInviteExpiry}>
                                    <SelectTrigger
                                        id="inviteExpiry"
                                        className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border dark:border-border">
                                        <SelectItem value="24">24 Hours</SelectItem>
                                        <SelectItem value="48">48 Hours</SelectItem>
                                        <SelectItem value="72">3 Days</SelectItem>
                                        <SelectItem value="168">7 Days</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="portalAccess" className="text-sm font-medium text-foreground dark:text-white">
                                    Portal Access Duration
                                </Label>
                                <Select value={portalAccess} onValueChange={setPortalAccess}>
                                    <SelectTrigger
                                        id="portalAccess"
                                        className="border-border dark:border-border bg-card focus:ring-2 focus:ring-ring focus:border-primary"
                                    >
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-card border-border dark:border-border">
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
                            className="w-full bg-primary hover:bg-primary-hover active:bg-primary-active text-primary-foreground font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                    <Card className="border-green-200 dark:border-green-900/50 bg-gradient-to-br from-green-50/80 to-green-100/30 dark:from-green-900/10 dark:to-green-900/5">
                        <CardHeader className="border-b border-green-200 dark:border-green-900/50">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-green-100 dark:bg-green-900/30 rounded-lg">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                </div>
                                <CardTitle className="text-green-900 dark:text-green-400">Invite Generated Successfully!</CardTitle>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-6">
                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-green-700 dark:text-green-400">Invite Code</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={generatedInvite.invite_code}
                                        readOnly
                                        className="font-mono font-bold text-lg bg-card border-green-200 dark:border-green-900/50 text-foreground dark:text-white"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            navigator.clipboard.writeText(generatedInvite.invite_code);
                                            toast.success('Code copied!');
                                        }}
                                        className="bg-card border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20"
                                    >
                                        <Copy className="w-4 h-4 text-green-600" />
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-sm font-medium text-green-700 dark:text-green-400">Invite Link</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={`${window.location.origin}/signup?invite=${generatedInvite.invite_code}`}
                                        readOnly
                                        className="bg-card text-sm border-green-200 dark:border-green-900/50 text-foreground dark:text-white"
                                    />
                                    <Button
                                        variant="outline"
                                        onClick={copyInviteLink}
                                        className="bg-card border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
                                    >
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy Link
                                    </Button>
                                </div>
                            </div>

                            <Alert className="bg-card border-green-200 dark:border-green-900/50">
                                <AlertCircle className="h-4 w-4 text-green-600" />
                                <AlertDescription className="text-sm text-foreground dark:text-white">
                                    <div className="space-y-1">
                                        <div>
                                            <strong className="text-green-700 dark:text-green-400">Expires:</strong>{' '}
                                            <span className="text-muted-foreground dark:text-muted-foreground">
                                                {new Date(generatedInvite.expires_at).toLocaleString('en-IN', {
                                                    day: '2-digit',
                                                    month: 'short',
                                                    year: 'numeric',
                                                    hour: '2-digit',
                                                    minute: '2-digit'
                                                })}
                                            </span>
                                        </div>
                                        <div>
                                            <strong className="text-green-700 dark:text-green-400">Portal Access:</strong>{' '}
                                            <span className="text-muted-foreground dark:text-muted-foreground">
                                                {generatedInvite.portal_access_days} days
                                            </span>
                                        </div>
                                    </div>
                                </AlertDescription>
                            </Alert>

                            <Button
                                variant="outline"
                                onClick={() => setGeneratedInvite(null)}
                                className="w-full bg-card border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 text-green-600"
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