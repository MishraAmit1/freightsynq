import { useQuery, UseQueryOptions } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

type Fn<T> = () => Promise<T>;

export function useSupabaseQuery<TData>(
    key: any[],
    fn: Fn<TData>,
    opts?: Omit<UseQueryOptions<TData, any, TData, any[]>, 'queryKey' | 'queryFn'>
) {
    const { isInitialized, user } = useAuth();
    const enabled = (opts?.enabled ?? true) && isInitialized && !!user;

    return useQuery({
        queryKey: key,
        queryFn: async () => {
            // ensure session header is attached
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) {
                // tiny delay and one more try
                await new Promise(r => setTimeout(r, 150));
                const again = await supabase.auth.getSession();
                if (!again.data.session?.access_token) {
                    throw new Error('No session yet');
                }
            }

            try {
                return await fn();
            } catch (e: any) {
                // If unauthorized, try once after a short delay
                if (e?.code === 'PGRST301' || e?.status === 401) {
                    await new Promise(r => setTimeout(r, 250));
                    return await fn();
                }
                throw e;
            }
        },
        enabled,
        ...opts,
    });
}