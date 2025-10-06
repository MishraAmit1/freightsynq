// components/ApiUsageDashboard.tsx
import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar, AlertCircle, Zap } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export const ApiUsageDashboard = () => {
    const [monthlyUsage, setMonthlyUsage] = useState({ calls: 0, cost: 0, limit: 4000 });
    const [dailyUsage, setDailyUsage] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    // In ApiUsageDashboard.tsx
    const loadData = async () => {
        try {
            setLoading(true);

            // Get current month's usage
            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            // Get current user's company ID
            const { data: { user } } = await supabase.auth.getUser();
            const { data: userData } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            const companyId = userData?.company_id;

            // Get API logs with company filter
            const { data: apiLogs, error } = await supabase
                .from('fastag_api_logs')
                .select('api_cost, created_at')
                .eq('company_id', companyId) // Add company filter
                .gte('created_at', startOfMonth.toISOString())
                .eq('status', 'SUCCESS');

            if (error) throw error;

            // Calculate total cost
            const totalCost = apiLogs?.reduce((sum, log) => sum + (log.api_cost || 0), 0) || 0;

            setMonthlyUsage({
                calls: apiLogs?.length || 0,
                cost: totalCost,
                limit: 4000 // Monthly budget
            });

            // Get daily usage
            const dailyData: { [key: string]: { calls: number, cost: number } } = {};

            apiLogs?.forEach(log => {
                const date = new Date(log.created_at).toISOString().split('T')[0];
                if (!dailyData[date]) {
                    dailyData[date] = { calls: 0, cost: 0 };
                }
                dailyData[date].calls += 1;
                dailyData[date].cost += log.api_cost || 0;
            });

            const formattedDailyData = Object.entries(dailyData).map(([date, data]) => ({
                date,
                api_calls: data.calls,
                daily_cost: data.cost
            })).sort((a, b) => b.date.localeCompare(a.date));

            setDailyUsage(formattedDailyData);

        } catch (error) {
            console.error('Error loading API usage data:', error);
        } finally {
            setLoading(false);
        }
    };

    const percentUsed = (monthlyUsage.cost / monthlyUsage.limit) * 100;

    return (
        <Card className="border-border shadow-xl bg-gradient-to-br from-background via-background to-muted/5">
            <CardHeader className="border-b bg-gradient-to-r from-primary/5 to-transparent">
                <CardTitle className="flex items-center gap-2">
                    <div className="p-2 bg-primary/10 rounded-lg">
                        <Zap className="w-5 h-5 text-primary" />
                    </div>
                    FASTag API Usage
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-4">
                        <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full"></div>
                    </div>
                ) : (
                    <>
                        {/* Monthly Budget Progress */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground">Monthly Budget</span>
                                <span className="font-medium">₹{monthlyUsage.cost.toFixed(2)} / ₹{monthlyUsage.limit}</span>
                            </div>
                            <Progress value={percentUsed} className="h-2" />
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>{percentUsed.toFixed(1)}% used</span>
                                <span>₹{(monthlyUsage.limit - monthlyUsage.cost).toFixed(2)} remaining</span>
                            </div>
                            <div className="flex justify-between text-xs mt-1">
                                <Badge variant="outline" className="bg-muted/50">
                                    {monthlyUsage.calls} API Calls
                                </Badge>
                                <Badge variant={percentUsed > 80 ? "destructive" : percentUsed > 50 ? "warning" : "success"} className="text-xs">
                                    {percentUsed > 80 ? 'High Usage' : percentUsed > 50 ? 'Moderate' : 'Low Usage'}
                                </Badge>
                            </div>
                        </div>

                        {/* Daily Usage */}
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                                <Calendar className="w-4 h-4" />
                                Daily Usage (Last 7 Days)
                            </h4>

                            {dailyUsage.length > 0 ? (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                                    {dailyUsage.slice(0, 7).map((day, index) => (
                                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border/50">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-primary"></div>
                                                <span className="text-sm">{new Date(day.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm">{day.api_calls} calls</span>
                                                <span className="text-sm font-medium">₹{day.daily_cost.toFixed(2)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-muted-foreground">
                                    <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                                    <p>No API usage data available</p>
                                </div>
                            )}
                        </div>

                        {/* Cost Saving Tips */}
                        <div className="pt-4 border-t">
                            <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4" />
                                Cost Saving Tips
                            </h4>
                            <ul className="text-xs text-muted-foreground space-y-1">
                                <li>• Track vehicles less frequently (every 30-60 minutes)</li>
                                <li>• Use cached data when possible</li>
                                <li>• Disable tracking for completed bookings</li>
                            </ul>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};