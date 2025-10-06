// api/analytics.ts

import { supabase } from "@/lib/supabase";

// Get company API usage
export async function getCompanyApiUsage() {
    const { data, error } = await supabase
        .from('company_api_usage')
        .select('*')
        .eq('company_id', await getCurrentCompanyId())
        .order('month', { ascending: false });

    if (error) throw error;
    return data || [];
}

// Get daily API usage for current month
export async function getDailyApiUsage() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('company_daily_api_usage')
        .select('*')
        .eq('company_id', await getCurrentCompanyId())
        .gte('date', startOfMonth.toISOString())
        .order('date', { ascending: false });

    if (error) throw error;
    return data || [];
}

// Get current month's total
export async function getCurrentMonthUsage() {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
        .from('fastag_api_logs')
        .select('api_cost', { count: 'exact' })
        .eq('company_id', await getCurrentCompanyId())
        .gte('created_at', startOfMonth.toISOString())
        .eq('status', 'SUCCESS');

    if (error) throw error;

    const totalCost = data?.reduce((sum, log) => sum + (log.api_cost || 0), 0) || 0;

    return {
        calls: data?.length || 0,
        cost: totalCost,
        limit: 4000 // Monthly budget
    };
}

// Helper function
async function getCurrentCompanyId() {
    const { data: { user } } = await supabase.auth.getUser();
    const { data } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user?.id)
        .single();

    return data?.company_id;
}