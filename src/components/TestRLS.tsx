import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export const TestRLS = () => {
    const { user, company } = useAuth();
    const [testResults, setTestResults] = useState<any>({});
    const [loading, setLoading] = useState(false);

    const runTests = async () => {
        setLoading(true);
        const results: any = {};

        try {
            // Test 1: Current user info
            results.currentUser = {
                id: user?.id,
                email: user?.email,
                companyName: company?.name,
                companyId: company?.id
            };

            // Test 2: Get user company via RPC
            const { data: companyId, error: companyError } = await supabase.rpc('get_user_company_id');
            results.rpcCompanyId = companyId;
            results.rpcError = companyError?.message;

            // Test 3: Fetch bookings
            const { data: bookings, error: bookingsError } = await supabase
                .from('bookings')
                .select('booking_id, company_id, from_location, to_location, created_at')
                .order('created_at', { ascending: false });

            results.bookingsCount = bookings?.length || 0;
            results.bookings = bookings?.slice(0, 5); // Show only first 5
            results.bookingsError = bookingsError?.message;

            // Test 4: Fetch parties
            const { data: parties, error: partiesError } = await supabase
                .from('parties')
                .select('name, company_id, party_type');

            results.partiesCount = parties?.length || 0;
            results.parties = parties;
            results.partiesError = partiesError?.message;

            // Test 5: Check unique company IDs in bookings
            if (bookings && bookings.length > 0) {
                const uniqueCompanyIds = [...new Set(bookings.map(b => b.company_id))];
                results.uniqueCompanyIds = uniqueCompanyIds;
                results.allFromSameCompany = uniqueCompanyIds.length === 1;
            }
            // Add to TestRLS component
            // Test 6: Fetch brokers
            const { data: brokers, error: brokersError } = await supabase
                .from('brokers')
                .select('name, company_id');

            results.brokersCount = brokers?.length || 0;
            results.brokers = brokers;

            // Test 7: Fetch warehouses  
            const { data: warehouses, error: warehousesError } = await supabase
                .from('warehouses')
                .select('name, company_id');

            results.warehousesCount = warehouses?.length || 0;
            results.warehouses = warehouses;

        } catch (error: any) {
            results.error = error.message;
        }

        setTestResults(results);
        setLoading(false);
    };

    useEffect(() => {
        if (user) {
            runTests();
        }
    }, [user]);

    return (
        <Card className="m-4 border-2 border-yellow-500">
            <CardHeader className="bg-yellow-50">
                <CardTitle className="text-lg">🧪 RLS Test Results - Multi-Tenant Check</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <h3 className="font-bold text-sm mb-1">Current User:</h3>
                        <div className="bg-gray-100 p-2 rounded text-xs">
                            <div>Email: {testResults.currentUser?.email}</div>
                            <div>Company: {testResults.currentUser?.companyName}</div>
                            <div>Company ID: {testResults.currentUser?.companyId}</div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-sm mb-1">RPC Company Check:</h3>
                        <div className="bg-gray-100 p-2 rounded text-xs">
                            <div>RPC Result: {testResults.rpcCompanyId || 'NULL'}</div>
                            <div>Match: {testResults.rpcCompanyId === testResults.currentUser?.companyId ? '✅' : '❌'}</div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-sm mb-1">
                        Bookings ({testResults.bookingsCount || 0}):
                        {testResults.allFromSameCompany &&
                            <span className="text-green-600 ml-2">✅ All from same company</span>
                        }
                    </h3>
                    <div className="bg-gray-100 p-2 rounded text-xs max-h-40 overflow-auto">
                        {testResults.bookings?.map((b: any, i: number) => (
                            <div key={i} className="mb-1">
                                {b.booking_id} - {b.from_location} → {b.to_location}
                                <span className="text-gray-500 ml-2">(Company: {b.company_id?.slice(0, 8)}...)</span>
                            </div>
                        ))}
                        {testResults.bookingsCount === 0 && <div className="text-gray-500">No bookings found</div>}
                    </div>
                </div>

                <div>
                    <h3 className="font-bold text-sm mb-1">Parties ({testResults.partiesCount || 0}):</h3>
                    <div className="bg-gray-100 p-2 rounded text-xs max-h-20 overflow-auto">
                        {testResults.parties?.map((p: any, i: number) => (
                            <div key={i}>{p.name} ({p.party_type})</div>
                        ))}
                        {testResults.partiesCount === 0 && <div className="text-gray-500">No parties found</div>}
                    </div>
                </div>

                {testResults.error && (
                    <div className="bg-red-100 p-2 rounded text-xs text-red-600">
                        Error: {testResults.error}
                    </div>
                )}

                <Button onClick={runTests} disabled={loading} size="sm">
                    {loading ? 'Testing...' : 'Re-run Tests'}
                </Button>
            </CardContent>
        </Card>
    );
};