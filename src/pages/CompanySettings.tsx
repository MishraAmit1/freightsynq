import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Copy, Users, Building2, RefreshCw } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const CompanySettings = () => {
    const { company, userProfile } = useAuth();
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [companyCode, setCompanyCode] = useState('');
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        if (company) {
            loadData();
            setIsAdmin(userProfile?.role === 'admin');
        }
    }, [company, userProfile]);

    const loadData = async () => {
        setLoading(true);
        try {
            // Get company code
            const { data: companyData, error: companyError } = await supabase
                .from('companies')
                .select('company_code')
                .eq('id', company.id)
                .single();

            if (companyError) throw companyError;
            setCompanyCode(companyData.company_code || '');

            // Get employees
            const { data: employeesData, error: employeesError } = await supabase
                .from('users')
                .select('id, name, email, phone, role, created_at')
                .eq('company_id', company.id)
                .order('created_at', { ascending: false });

            if (employeesError) throw employeesError;
            setEmployees(employeesData || []);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to load data',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const generateNewCode = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            // Generate a new code
            const newCode = `${company.name.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 900) + 100}`;

            // Update company
            const { error } = await supabase
                .from('companies')
                .update({ company_code: newCode })
                .eq('id', company.id);

            if (error) throw error;

            setCompanyCode(newCode);
            toast({
                title: 'Success',
                description: 'Company code updated successfully',
            });
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message || 'Failed to update company code',
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    const copyCodeToClipboard = () => {
        navigator.clipboard.writeText(companyCode);
        toast({
            title: 'Copied!',
            description: 'Company code copied to clipboard',
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-foreground">Company Settings</h1>
                    <p className="text-muted-foreground">Manage your company settings and employees</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Company Code Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Building2 className="w-5 h-5 mr-2" />
                            Company Code
                        </CardTitle>
                        <CardDescription>
                            Share this code with employees to join your company
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="flex items-center space-x-2">
                                <Input
                                    value={companyCode}
                                    readOnly
                                    className="font-mono text-lg"
                                />
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={copyCodeToClipboard}
                                >
                                    <Copy className="h-4 w-4" />
                                </Button>
                            </div>

                            {isAdmin && (
                                <Button
                                    variant="outline"
                                    onClick={generateNewCode}
                                    disabled={loading}
                                    className="w-full"
                                >
                                    {loading ? (
                                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    ) : (
                                        <RefreshCw className="h-4 w-4 mr-2" />
                                    )}
                                    Generate New Code
                                </Button>
                            )}

                            <Alert>
                                <AlertDescription>
                                    Anyone with this code can join your company as an employee.
                                    Generate a new code if you want to revoke access.
                                </AlertDescription>
                            </Alert>
                        </div>
                    </CardContent>
                </Card>

                {/* Employees Card */}
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center">
                            <Users className="w-5 h-5 mr-2" />
                            Employees ({employees.length})
                        </CardTitle>
                        <CardDescription>
                            People with access to your company data
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {employees.length === 0 ? (
                                    <div className="text-center py-4 text-muted-foreground">
                                        No employees found
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {employees.map((employee) => (
                                            <div
                                                key={employee.id}
                                                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
                                            >
                                                <div>
                                                    <div className="font-medium">{employee.name}</div>
                                                    <div className="text-xs text-muted-foreground">{employee.email}</div>
                                                </div>
                                                <div className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                                                    {employee.role}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="pt-2">
                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => window.open('/employee-signup', '_blank')}
                                    >
                                        Employee Signup Link
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};