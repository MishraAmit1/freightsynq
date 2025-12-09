// api/lr-sequences.ts
import { supabase } from '@/lib/supabase';

export interface LRCitySequence {
    id: string;
    company_id: string;
    city_name: string;
    prefix: string;
    current_lr_number: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}
// ✅ NEW: Fetch all LRs for a specific city
export interface CityLR {
    id: string;
    booking_id: string;
    lr_number: string;
    lr_date: string;
    from_location: string;
    to_location: string;
    status: string;
    created_at: string;
    consignor: { name: string } | null;
    consignee: { name: string } | null;
}

// ✅ NEW FUNCTION - Don't touch existing ones
export const fetchLRsByCityId = async (cityId: string): Promise<CityLR[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (!userData?.company_id) throw new Error('Company ID not found');

    const { data, error } = await supabase
        .from('bookings')
        .select(`
            id,
            booking_id,
            lr_number,
            lr_date,
            from_location,
            to_location,
            status,
            created_at,
            consignor:parties!consignor_id(name),
            consignee:parties!consignee_id(name)
        `)
        .eq('company_id', userData.company_id)
        .eq('lr_city_id', cityId)
        .not('lr_number', 'is', null)
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Error fetching city LRs by ID:', error);
        throw error;
    }

    return data || [];
};

// ✅ ENHANCED VERSION - Works with both old and new data
export const fetchLRsByCity = async (cityPrefix: string, cityId?: string): Promise<CityLR[]> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (!userData?.company_id) throw new Error('Company ID not found');

    // ✅ FIX: Only use city_id method for new implementation
    if (cityId) {
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                id,
                booking_id,
                lr_number,
                lr_date,
                from_location,
                to_location,
                status,
                created_at,
                consignor:parties!consignor_id(name),
                consignee:parties!consignee_id(name)
            `)
            .eq('company_id', userData.company_id)
            .eq('lr_city_id', cityId)  // ✅ Only match exact city ID
            .not('lr_number', 'is', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching city LRs:', error);
            throw error;
        }

        // ✅ Return whatever we find (even empty array)
        return data || [];
    } else {
        // ✅ Old method - only if no cityId provided
        const { data, error } = await supabase
            .from('bookings')
            .select(`
                id,
                booking_id,
                lr_number,
                lr_date,
                from_location,
                to_location,
                status,
                created_at,
                consignor:parties!consignor_id(name),
                consignee:parties!consignee_id(name)
            `)
            .eq('company_id', userData.company_id)
            .like('lr_number', `${cityPrefix}%`)
            .not('lr_number', 'is', null)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Error fetching city LRs:', error);
            throw error;
        }

        return data || [];
    }
};
// Get all cities for company
export const fetchLRCities = async (): Promise<LRCitySequence[]> => {
    const { data, error } = await supabase
        .from('lr_city_sequences')
        .select('*')
        .order('city_name', { ascending: true });

    if (error) {
        console.error('Error fetching LR cities:', error);
        throw error;
    }

    return data || [];
};

// Get active city
export const getActiveLRCity = async (): Promise<LRCitySequence | null> => {
    const { data, error } = await supabase
        .from('lr_city_sequences')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();

    if (error) {
        console.error('Error fetching active LR city:', error);
        throw error;
    }

    return data;
};

// Get next LR number (using RPC)
export const getNextLRNumber = async (): Promise<{
    city_name: string;
    prefix: string;
    lr_number: string;
    current_number: number;
}> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (!userData?.company_id) throw new Error('Company ID not found');

    const { data, error } = await supabase.rpc('get_next_lr_number', {
        p_company_id: userData.company_id
    });

    if (error) throw error;
    return data;
};

// Add new city
// ✅ FIXED VERSION:
export const addLRCity = async (cityData: {
    city_name: string;
    prefix: string;
    current_lr_number: number;
}) => {
    // Get current user's company_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (!userData?.company_id) throw new Error('Company ID not found');

    // ✅ Explicitly include company_id in insert
    const { data, error } = await supabase
        .from('lr_city_sequences')
        .insert([{
            ...cityData,
            company_id: userData.company_id, // ← Explicit company_id
            is_active: false
        }])
        .select()
        .single();

    if (error) {
        console.error('Error adding LR city:', error);
        throw error;
    }

    return data;
};

// Set active city (deactivate others)
export const setActiveLRCity = async (cityId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (!userData?.company_id) throw new Error('Company ID not found');

    // First, deactivate all cities for this company
    const { error: deactivateError } = await supabase
        .from('lr_city_sequences')
        .update({ is_active: false })
        .eq('company_id', userData.company_id);

    if (deactivateError) throw deactivateError;

    // Then activate selected city
    const { error: activateError } = await supabase
        .from('lr_city_sequences')
        .update({ is_active: true })
        .eq('id', cityId);

    if (activateError) throw activateError;

    return true;
};

// Update city number (admin correction)
export const updateLRCityNumber = async (
    cityId: string,
    newNumber: number
) => {
    const { data, error } = await supabase
        .from('lr_city_sequences')
        .update({
            current_lr_number: newNumber,
            updated_at: new Date().toISOString()
        })
        .eq('id', cityId)
        .select()
        .single();

    if (error) {
        console.error('Error updating LR city number:', error);
        throw error;
    }

    return data;
};

// Delete city (soft delete - make inactive)
export const deleteLRCity = async (cityId: string) => {
    // Check if it's active
    const { data: city } = await supabase
        .from('lr_city_sequences')
        .select('is_active')
        .eq('id', cityId)
        .single();

    if (city?.is_active) {
        throw new Error('Cannot delete active city. Please activate another city first.');
    }

    const { error } = await supabase
        .from('lr_city_sequences')
        .delete()
        .eq('id', cityId);

    if (error) {
        console.error('Error deleting LR city:', error);
        throw error;
    }

    return true;
};

// Increment LR number (call after LR save)
export const incrementLRNumber = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();

    if (!userData?.company_id) throw new Error('Company ID not found');

    const { error } = await supabase.rpc('increment_lr_number', {
        p_company_id: userData.company_id
    });

    if (error) throw error;
    return true;
};