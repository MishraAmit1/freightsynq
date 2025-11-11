// src/api/gst-lookup.ts

import { supabase } from '@/lib/supabase';

// Interface for GST data - Updated with new fields
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
    serviceDown?: boolean;      // 🔥 Flag for service down
    userMessage?: string;        // 🔥 User-friendly message
    technicalError?: string;     // 🔥 For debugging
}

// Function to call the edge function
export const lookupGST = async (gstin: string): Promise<GSTData> => {
    try {
        console.log('🔍 Starting GST lookup for:', gstin);

        const { data, error } = await supabase.functions.invoke<any>('gst-lookup', {
            body: { gstin }
        });

        console.log('📦 Edge function response:', { data, error });

        // 🔥 Handle Edge Function errors
        if (error) {
            console.error('❌ Supabase function invoke error:', error);

            // Check if error message indicates service down
            if (error.message?.includes('503') ||
                error.message?.includes('Service Unavailable') ||
                error.message?.includes('service is down')) {

                console.log('🔴 Service down detected from error');
                return {
                    success: false,
                    error: 'GST verification service is temporarily unavailable',
                    serviceDown: true,
                    userMessage: 'The government GST service is currently down. You can proceed with manual entry.'
                };
            }

            // Check for Edge Function specific errors
            if (error.message?.includes('Edge Function returned a non-2xx status code')) {
                console.log('⚠️ Edge function non-2xx status, checking data...');

                // Sometimes data is still available even with error
                if (data) {
                    return handleResponseData(data);
                }

                return {
                    success: false,
                    error: 'GST verification service is experiencing issues',
                    serviceDown: true,
                    userMessage: 'Unable to verify GST at this time. You can proceed with manual entry.'
                };
            }

            return {
                success: false,
                error: error.message || 'GST verification failed',
                serviceDown: false
            };
        }

        // 🔥 Handle successful response
        return handleResponseData(data);

    } catch (err: any) {
        console.error('💥 Unexpected error during GST lookup:', err);

        // More user-friendly error messages
        let userError = 'Unable to verify GST number';
        let isServiceDown = false;

        if (err.message?.includes('Failed to fetch') ||
            err.message?.includes('NetworkError')) {
            userError = 'Network error - please check your internet connection';
            isServiceDown = true;
        } else if (err.message?.includes('timeout')) {
            userError = 'Request timed out - please try again';
            isServiceDown = true;
        }

        return {
            success: false,
            error: userError,
            serviceDown: isServiceDown,
            userMessage: isServiceDown ?
                'Unable to connect to GST service. You can proceed with manual entry.' :
                'Please check the GST number and try again.',
            technicalError: err.message
        };
    }
};

// 🔥 Helper function to handle response data
function handleResponseData(data: any): GSTData {
    if (!data) {
        console.warn('⚠️ No data received from edge function');
        return {
            success: false,
            error: 'No response received from verification service',
            serviceDown: true,
            userMessage: 'Service is not responding. You can proceed with manual entry.'
        };
    }

    console.log('🔍 Processing response data:', data);

    // Check if service is down
    if (data.serviceDown === true) {
        console.log('🔴 Service down flag detected in response');
        return {
            success: false,
            error: data.error || 'GST verification service is temporarily unavailable',
            serviceDown: true,
            userMessage: data.userMessage || 'The government GST service is currently unavailable. You can proceed with manual entry.',
            technicalError: data.technicalError
        };
    }

    // Check for other errors
    if (!data.success) {
        console.warn('❌ GST lookup API returned an error:', data.error);
        return {
            success: false,
            error: data.error || 'GST verification failed',
            serviceDown: false,
            technicalError: data.technicalError
        };
    }

    // Success case
    console.log('✅ GST verification successful');
    return data;
}

// 🔥 Optional - Function to check if service is available
export const checkGSTServiceStatus = async (): Promise<boolean> => {
    try {
        // Test with a known valid GST number
        const testGST = '27AADCK0528K1ZJ'; // Example GST
        const result = await lookupGST(testGST);

        // If service is down, it will have the serviceDown flag
        return !result.serviceDown;
    } catch (err) {
        console.error('Error checking GST service status:', err);
        return false;
    }
};

// 🔥 Optional - Retry mechanism with better error handling
export const lookupGSTWithRetry = async (
    gstin: string,
    maxRetries: number = 2,
    retryDelay: number = 2000
): Promise<GSTData> => {
    let lastError: GSTData | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            console.log(`🔄 Retry attempt ${attempt} for GST: ${gstin}`);
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        const result = await lookupGST(gstin);

        // If successful, return immediately
        if (result.success) {
            return result;
        }

        // If service is down, don't retry
        if (result.serviceDown) {
            console.log('🔴 Service is down, skipping retries');
            return result;
        }

        lastError = result;
    }

    // Return last error after all retries
    return lastError || {
        success: false,
        error: 'GST verification failed after multiple attempts',
        serviceDown: false
    };
};