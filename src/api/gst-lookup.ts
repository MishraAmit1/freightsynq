// src/api/gst-lookup.ts

import { supabase } from '@/lib/supabase';

// Interface for GST data
export interface GSTData {
    success: boolean;
    gstin?: string;
    status?: string;
    tradeName?: string;
    legalName?: string;
    constitutionType?: string;
    taxpayerType?: string;
    businessNature?: string;
    city?: string;
    state?: string;
    pincode?: string;
    address?: string;
    registrationDate?: string;
    lastUpdated?: string;
    eInvoiceEnabled?: boolean;
    jurisdiction?: string;
    error?: string;
}

// Function to call the edge function
export const lookupGST = async (gstin: string): Promise<GSTData> => {
    try {
        const { data, error } = await supabase.functions.invoke<GSTData>('gst-lookup', {
            body: { gstin }
        });

        if (error) {
            console.error('Supabase function invoke error:', error);
            return { success: false, error: error.message };
        }

        if (!data.success) {
            console.warn('GST lookup API returned an error:', data.error);
            return { success: false, error: data.error };
        }

        return data;
    } catch (err: any) {
        console.error('Unexpected error during GST lookup:', err);
        return {
            success: false,
            error: err.message || 'An unexpected error occurred.'
        };
    }
};