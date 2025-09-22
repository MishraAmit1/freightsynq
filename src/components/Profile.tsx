// Profile.tsx - Clean version with theme colors only
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    User,
    Mail,
    Phone,
    Building2,
    Shield,
    Calendar,
    Edit,
    Save,
    X,
    Lock,
    Loader2,
    Check,
    AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export const Profile = () => {
    const { userProfile, company, refreshUserProfile } = useAuth();
    const { toast } = useToast();
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
    });

    const [passwordData, setPasswordData] = useState({
        newPassword: "",
        confirmPassword: "",
    });

    // Real-time password validation
    const passwordsMatch = passwordData.newPassword && passwordData.confirmPassword &&
        passwordData.newPassword.trim() === passwordData.confirmPassword.trim();
    const passwordLengthValid = passwordData.newPassword.trim().length >= 6;

    useEffect(() => {
        if (userProfile) {
            setFormData({
                name: userProfile.name || "",
                email: userProfile.email || "",
                phone: userProfile.phone || "",
            });
        }
    }, [userProfile]);

    const handleSave = async () => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from("users")
                .update({
                    name: formData.name,
                    phone: formData.phone,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", userProfile?.id);

            if (error) throw error;

            await refreshUserProfile();
            setIsEditing(false);
            toast({
                title: "Profile updated",
                description: "Your profile has been updated successfully.",
            });
        } catch (error: any) {
            toast({
                title: "Error",
                description: error.message || "Failed to update profile",
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        const newPass = passwordData.newPassword.trim();
        const confirmPass = passwordData.confirmPassword.trim();

        if (!newPass || !confirmPass) {
            toast({
                title: "Error",
                description: "Please fill in both password fields",
                variant: "destructive",
            });
            return;
        }

        if (newPass !== confirmPass) {
            toast({
                title: "Error",
                description: "New passwords do not match",
                variant: "destructive",
            });
            return;
        }

        if (newPass.length < 6) {
            toast({
                title: "Error",
                description: "Password must be at least 6 characters long",
                variant: "destructive",
            });
            return;
        }

        setIsChangingPassword(true);
        try {
            const { error } = await supabase.auth.updateUser({
                password: newPass
            });

            if (error) throw error;

            setPasswordData({
                newPassword: "",
                confirmPassword: "",
            });

            toast({
                title: "Password updated",
                description: "Your password has been changed successfully.",
            });
        } catch (error: any) {
            console.error("Password update error:", error);
            toast({
                title: "Error",
                description: error.message || "Failed to update password",
                variant: "destructive",
            });
        } finally {
            setIsChangingPassword(false);
        }
    };

    const getRoleBadgeVariant = (role: string): "destructive" | "default" | "secondary" | "outline" => {
        switch (role) {
            case "admin":
                return "destructive";
            case "manager":
                return "default";
            default:
                return "secondary";
        }
    };

    const getRoleIcon = (role: string) => {
        switch (role) {
            case "admin":
                return <Shield className="w-3 h-3 mr-1" />;
            case "manager":
                return <Building2 className="w-3 h-3 mr-1" />;
            default:
                return <User className="w-3 h-3 mr-1" />;
        }
    };

    return (
        <div className="container max-w-4xl mx-auto py-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-2">
                <h1 className="text-3xl font-bold">Profile Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences
                </p>
            </div>

            <Tabs defaultValue="general" className="space-y-6">
                <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
                    <TabsTrigger value="general" className="flex items-center gap-2">
                        <User className="w-4 h-4" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="security" className="flex items-center gap-2">
                        <Lock className="w-4 h-4" />
                        Security
                    </TabsTrigger>
                </TabsList>

                {/* General Tab */}
                <TabsContent value="general" className="space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle>Profile Information</CardTitle>
                                    <CardDescription>
                                        Update your personal details and contact information
                                    </CardDescription>
                                </div>
                                {!isEditing ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditing(true)}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        Edit
                                    </Button>
                                ) : (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFormData({
                                                    name: userProfile?.name || "",
                                                    email: userProfile?.email || "",
                                                    phone: userProfile?.phone || "",
                                                });
                                            }}
                                            disabled={isLoading}
                                        >
                                            <X className="w-4 h-4 mr-2" />
                                            Cancel
                                        </Button>
                                        <Button
                                            size="sm"
                                            onClick={handleSave}
                                            disabled={isLoading}
                                        >
                                            {isLoading ? (
                                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            ) : (
                                                <Save className="w-4 h-4 mr-2" />
                                            )}
                                            Save
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-8">
                            {/* Avatar Section */}
                            <div className="flex flex-col sm:flex-row items-center sm:items-start space-y-4 sm:space-y-0 sm:space-x-6">
                                <Avatar className="w-24 h-24 border-2 border-border shadow-lg">
                                    <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${userProfile?.name}`} />
                                    <AvatarFallback className="text-2xl">
                                        {userProfile?.name?.charAt(0)?.toUpperCase() || "U"}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="text-center sm:text-left space-y-2">
                                    <h3 className="text-2xl font-semibold">{userProfile?.name}</h3>
                                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                                        <Badge variant={getRoleBadgeVariant(userProfile?.role || "operator")}>
                                            {getRoleIcon(userProfile?.role || "operator")}
                                            {userProfile?.role?.charAt(0).toUpperCase() + userProfile?.role?.slice(1)}
                                        </Badge>
                                        <span className="text-sm text-muted-foreground">at {company?.name}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Form Fields */}
                            <div className="grid gap-6">
                                <div className="grid gap-2">
                                    <Label htmlFor="name" className="flex items-center font-medium">
                                        <User className="w-4 h-4 mr-2" />
                                        Full Name
                                    </Label>
                                    <Input
                                        id="name"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        disabled={!isEditing}
                                        className="h-11"
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="email" className="flex items-center font-medium">
                                        <Mail className="w-4 h-4 mr-2" />
                                        Email Address
                                    </Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={formData.email}
                                        disabled
                                        className="h-11 bg-muted"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Email cannot be changed. Contact admin for assistance.
                                    </p>
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="phone" className="flex items-center font-medium">
                                        <Phone className="w-4 h-4 mr-2" />
                                        Phone Number
                                    </Label>
                                    <Input
                                        id="phone"
                                        type="tel"
                                        placeholder="+91 98765 43210"
                                        value={formData.phone || ""}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                        disabled={!isEditing}
                                        className="h-11"
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Additional Info */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Building2 className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Company</p>
                                                <p className="font-medium">{company?.name}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center space-x-3">
                                            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Calendar className="w-5 h-5 text-primary" />
                                            </div>
                                            <div>
                                                <p className="text-sm text-muted-foreground">Member Since</p>
                                                <p className="font-medium">
                                                    {userProfile?.created_at
                                                        ? format(new Date(userProfile.created_at), "dd MMM yyyy")
                                                        : "N/A"}
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Security Tab */}
                <TabsContent value="security" className="space-y-6">
                    <Card className="shadow-lg">
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Lock className="w-5 h-5 mr-2" />
                                Change Password
                            </CardTitle>
                            <CardDescription>
                                Update your password to keep your account secure
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid gap-4">
                                <Label htmlFor="new-password" className="flex items-center font-medium">
                                    <Lock className="w-4 h-4 mr-2" />
                                    New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="new-password"
                                        type="password"
                                        value={passwordData.newPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                        placeholder="Enter new password (min 6 characters)"
                                        className="h-11 pr-10"
                                    />
                                    {passwordData.newPassword && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {passwordLengthValid ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-destructive" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                {passwordData.newPassword && !passwordLengthValid && (
                                    <p className="text-xs text-destructive">Password must be at least 6 characters</p>
                                )}
                            </div>

                            <div className="grid gap-4">
                                <Label htmlFor="confirm-password" className="flex items-center font-medium">
                                    <Lock className="w-4 h-4 mr-2" />
                                    Confirm New Password
                                </Label>
                                <div className="relative">
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        value={passwordData.confirmPassword}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                        placeholder="Confirm new password"
                                        className="h-11 pr-10"
                                    />
                                    {passwordData.confirmPassword && (
                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                            {passwordsMatch ? (
                                                <Check className="w-4 h-4 text-green-500" />
                                            ) : (
                                                <AlertCircle className="w-4 h-4 text-destructive" />
                                            )}
                                        </div>
                                    )}
                                </div>
                                {passwordData.confirmPassword && !passwordsMatch && (
                                    <p className="text-xs text-destructive">Passwords do not match</p>
                                )}
                            </div>

                            <Button
                                onClick={handlePasswordChange}
                                disabled={isChangingPassword || !passwordsMatch || !passwordLengthValid || !passwordData.newPassword || !passwordData.confirmPassword}
                                className="w-full h-11"
                            >
                                {isChangingPassword ? (
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                ) : (
                                    <Lock className="w-4 h-4 mr-2" />
                                )}
                                Update Password
                            </Button>
                        </CardContent>
                    </Card>

                    {/* Security Tips */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center">
                                <Shield className="w-5 h-5 mr-2" />
                                Security Tips
                            </CardTitle>
                            <CardDescription>
                                Keep your account secure with these recommendations
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start space-x-2">
                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Use a strong password with at least 8 characters</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Include numbers, symbols, and mixed case letters</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Don't reuse passwords from other accounts</span>
                                </li>
                                <li className="flex items-start space-x-2">
                                    <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span>Enable two-factor authentication when available</span>
                                </li>
                            </ul>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};