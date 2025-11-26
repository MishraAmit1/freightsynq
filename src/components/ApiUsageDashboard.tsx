import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, Calendar, AlertCircle, Zap, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/utils';

export const ApiUsageDashboard = () => {
    const [monthlyUsage, setMonthlyUsage] = useState({ calls: 0, cost: 0, limit: 4000 });
    const [dailyUsage, setDailyUsage] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            setLoading(true);

            const startOfMonth = new Date();
            startOfMonth.setDate(1);
            startOfMonth.setHours(0, 0, 0, 0);

            const { data: { user } } = await supabase.auth.getUser();
            const { data: userData } = await supabase
                .from('users')
                .select('company_id')
                .eq('id', user?.id)
                .single();

            const companyId = userData?.company_id;

            const { data: apiLogs, error } = await supabase
                .from('fastag_api_logs')
                .select('api_cost, created_at')
                .eq('company_id', companyId)
                .gte('created_at', startOfMonth.toISOString())
                .eq('status', 'SUCCESS');

            if (error) throw error;

            const totalCost = apiLogs?.reduce((sum, log) => sum + (log.api_cost || 0), 0) || 0;

            setMonthlyUsage({
                calls: apiLogs?.length || 0,
                cost: totalCost,
                limit: 4000
            });

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

    const getUsageStatusBadge = () => {
        if (percentUsed > 80) {
            return {
                label: 'High Usage',
                className: 'bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200 dark:border-red-900/50'
            };
        }
        if (percentUsed > 50) {
            return {
                label: 'Moderate',
                className: 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200 dark:border-yellow-900/50'
            };
        }
        return {
            label: 'Low Usage',
            className: 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50'
        };
    };

    const usageStatus = getUsageStatusBadge();

    return (
        <Card className="bg-card border border-border dark:border-border shadow-sm">
            <CardHeader className="border-b border-border dark:border-border bg-gradient-to-r from-[#FFFBF0] dark:from-[#FCC52C]/5 to-transparent">
                <CardTitle className="flex items-center gap-2 text-foreground dark:text-white">
                    <div className="p-2 bg-accent dark:bg-primary/10 rounded-lg">
                        <Zap className="w-5 h-5 text-primary dark:text-primary" />
                    </div>
                    FASTag API Usage
                </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="relative">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <div className="absolute inset-0 blur-xl bg-primary/20 animate-pulse rounded-full" />
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Monthly Budget Progress */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">Monthly Budget</span>
                                <span className="font-medium text-foreground dark:text-white">
                                    ₹{monthlyUsage.cost.toFixed(2)} / ₹{monthlyUsage.limit}
                                </span>
                            </div>

                            {/* Progress Bar */}
                            <div className="relative">
                                <Progress
                                    value={percentUsed}
                                    className="h-2.5 bg-muted"
                                />
                            </div>

                            <div className="flex justify-between text-xs text-muted-foreground dark:text-muted-foreground">
                                <span>{percentUsed.toFixed(1)}% used</span>
                                <span>₹{(monthlyUsage.limit - monthlyUsage.cost).toFixed(2)} remaining</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                                <Badge
                                    variant="outline"
                                    className="bg-muted text-foreground dark:text-white border-border dark:border-border"
                                >
                                    <Zap className="w-3 h-3 mr-1" />
                                    {monthlyUsage.calls} API Calls
                                </Badge>
                                <Badge
                                    className={cn("text-xs border", usageStatus.className)}
                                >
                                    {usageStatus.label}
                                </Badge>
                            </div>
                        </div>

                        {/* Daily Usage */}
                        <div className="pt-4 border-t border-border dark:border-border">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground dark:text-white">
                                <div className="p-1 bg-blue-100 dark:bg-blue-900/20 rounded">
                                    <Calendar className="w-4 h-4 text-blue-600" />
                                </div>
                                Daily Usage (Last 7 Days)
                            </h4>

                            {dailyUsage.length > 0 ? (
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                                    {dailyUsage.slice(0, 7).map((day, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 rounded-lg bg-muted border border-border dark:border-border transition-all hover:bg-accent dark:hover:bg-muted"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-[#F38810]"></div>
                                                <span className="text-sm text-foreground dark:text-white">
                                                    {new Date(day.date).toLocaleDateString('en-IN', {
                                                        day: '2-digit',
                                                        month: 'short'
                                                    })}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="text-sm text-muted-foreground dark:text-muted-foreground">
                                                    {day.api_calls} calls
                                                </span>
                                                <span className="text-sm font-semibold text-foreground dark:text-white">
                                                    ₹{day.daily_cost.toFixed(2)}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                        <AlertCircle className="w-6 h-6 text-muted-foreground dark:text-muted-foreground" />
                                    </div>
                                    <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                                        No API usage data available
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Cost Saving Tips */}
                        <div className="pt-4 border-t border-border dark:border-border">
                            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2 text-foreground dark:text-white">
                                <div className="p-1 bg-green-100 dark:bg-green-900/20 rounded">
                                    <TrendingUp className="w-4 h-4 text-green-600" />
                                </div>
                                Cost Saving Tips
                            </h4>
                            <div className="bg-accent dark:bg-primary/5 rounded-lg p-3 border border-primary/20">
                                <ul className="text-xs text-muted-foreground dark:text-muted-foreground space-y-1.5">
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary dark:text-primary mt-0.5">•</span>
                                        <span>Track vehicles less frequently (every 30-60 minutes)</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary dark:text-primary mt-0.5">•</span>
                                        <span>Use cached data when possible</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-primary dark:text-primary mt-0.5">•</span>
                                        <span>Disable tracking for completed bookings</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
};