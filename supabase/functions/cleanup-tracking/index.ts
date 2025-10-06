// supabase/functions/cleanup-tracking/index.ts

import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'

Deno.serve(async (req) => {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    try {
        // 1. Auto-disable tracking for delivered bookings
        const { data: deliveredBookings } = await supabase
            .from('bookings')
            .select('id')
            .in('status', ['DELIVERED', 'CANCELLED'])
            .eq('tracking_enabled', true);

        for (const booking of deliveredBookings || []) {
            await supabase
                .from('bookings')
                .update({ tracking_enabled: false })
                .eq('id', booking.id);

            await supabase
                .from('vehicle_assignments')
                .update({
                    tracking_end_time: new Date().toISOString(),
                    status: 'COMPLETED'
                })
                .eq('booking_id', booking.id)
                .eq('status', 'ACTIVE');
        }

        // 2. Reset monthly API usage on 1st of month
        const today = new Date();
        if (today.getDate() === 1) {
            await supabase
                .from('tracking_configurations')
                .update({ current_month_usage: 0 })
                .gt('current_month_usage', 0);
        }

        // 3. Clean up old API logs (keep 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        await supabase
            .from('fastag_api_logs')
            .delete()
            .lt('created_at', thirtyDaysAgo.toISOString());

        return new Response(
            JSON.stringify({ success: true, message: 'Cleanup completed' }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            { headers: { 'Content-Type': 'application/json' } }
        );
    }
});