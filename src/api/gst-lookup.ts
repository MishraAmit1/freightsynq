import { supabase } from '@/lib/supabase';

// ============================================
// ✅ GST LOOKUP API WITH CACHING
// ============================================

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
    serviceDown?: boolean;
    userMessage?: string;
    technicalError?: string;
    gstStatus?: string;
}

// ============================================
// ✅ CACHING SYSTEM
// ============================================

// Memory Cache (Session - faster access)
const memoryCache = new Map<string, { data: GSTData; timestamp: number }>();

// Cache duration: 24 hours
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// LocalStorage key
const CACHE_KEY = 'gst_verified_cache';

// API Call tracking
let apiCallCount = 0;
let cacheHitCount = 0;

// ✅ Get from cache (Memory + LocalStorage)
export const getCachedGST = (gstin: string): GSTData | null => {
    const normalizedGST = gstin.toUpperCase().trim();
    
    // 1. Check memory cache first (fastest)
    const memoryData = memoryCache.get(normalizedGST);
    if (memoryData && Date.now() - memoryData.timestamp < CACHE_DURATION) {
        cacheHitCount++;
        console.log(`✅ CACHE HIT (Memory): ${normalizedGST}`);
        console.log(`📊 Stats: ${cacheHitCount} cache hits, ${apiCallCount} API calls`);
        return memoryData.data;
    }

    // 2. Check localStorage (persistent)
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
            const cacheData = JSON.parse(stored);
            const gstEntry = cacheData[normalizedGST];
            
            if (gstEntry && Date.now() - gstEntry.timestamp < CACHE_DURATION) {
                // Restore to memory cache for faster future access
                memoryCache.set(normalizedGST, {
                    data: gstEntry.data,
                    timestamp: gstEntry.timestamp
                });
                
                cacheHitCount++;
                console.log(`✅ CACHE HIT (LocalStorage): ${normalizedGST}`);
                console.log(`📊 Stats: ${cacheHitCount} cache hits, ${apiCallCount} API calls`);
                return gstEntry.data;
            }
        }
    } catch (error) {
        console.error('Cache read error:', error);
    }

    console.log(`❌ CACHE MISS: ${normalizedGST} - Will call API`);
    return null;
};

// ✅ Save to cache (Memory + LocalStorage)
const setCachedGST = (gstin: string, data: GSTData): void => {
    const normalizedGST = gstin.toUpperCase().trim();
    const timestamp = Date.now();

    // 1. Save to memory cache
    memoryCache.set(normalizedGST, { data, timestamp });

    // 2. Save to localStorage
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        const cacheData = stored ? JSON.parse(stored) : {};
        
        cacheData[normalizedGST] = { data, timestamp };
        
        // Keep only last 100 entries to prevent storage overflow
        const entries = Object.entries(cacheData);
        if (entries.length > 100) {
            const sorted = entries.sort((a: any, b: any) => b[1].timestamp - a[1].timestamp);
            const trimmed = Object.fromEntries(sorted.slice(0, 100));
            localStorage.setItem(CACHE_KEY, JSON.stringify(trimmed));
        } else {
            localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
        }
        
        console.log(`💾 CACHED: ${normalizedGST} (Valid for 24 hours)`);
    } catch (error) {
        console.error('Cache write error:', error);
    }
};

// ============================================
// ✅ MAIN LOOKUP FUNCTION (WITH CACHING)
// ============================================

export const lookupGST = async (gstin: string): Promise<GSTData> => {
    const normalizedGST = gstin.toUpperCase().trim();
    
    console.log('');
    console.log('🔍 ═══════════════════════════════════════');
    console.log(`🔍 GST LOOKUP: ${normalizedGST}`);
    console.log('🔍 ═══════════════════════════════════════');

    // ✅ CHECK CACHE FIRST
    const cached = getCachedGST(normalizedGST);
    if (cached) {
        console.log('✅ Returning cached data - NO API CALL! 💰');
        console.log('🔍 ═══════════════════════════════════════');
        console.log('');
        return cached;
    }

    // ✅ MAKE API CALL (Only if not cached)
    apiCallCount++;
    console.log(`📡 API CALL #${apiCallCount}: ${normalizedGST}`);
    console.log('📡 Calling Supabase Edge Function...');

    try {
        const { data, error } = await supabase.functions.invoke<GSTData>('gst-lookup', {
            body: { gstin: normalizedGST }
        });

        console.log('📦 Edge function response received');

        if (error) {
            console.error('❌ Supabase function error:', error);
            const errorData: GSTData = {
                success: false,
                error: 'Unable to connect to GST service',
                serviceDown: true,
                userMessage: 'Network error. You can proceed with manual entry.'
            };
            // Don't cache network errors
            return errorData;
        }

        if (!data) {
            const noDataError: GSTData = {
                success: false,
                error: 'No response from GST service',
                serviceDown: true,
                userMessage: 'Service not responding. You can proceed with manual entry.'
            };
            // Don't cache no-response errors
            return noDataError;
        }

        // ✅ CACHE THE RESPONSE
        if (data.success) {
            console.log(`✅ GST VERIFIED: ${data.tradeName}`);
            setCachedGST(normalizedGST, data);
        } else if (!data.serviceDown) {
            // Cache invalid GST responses too (to avoid re-checking)
            console.log(`⚠️ GST Invalid: ${data.error}`);
            setCachedGST(normalizedGST, data);
        }
        // Don't cache serviceDown responses

        console.log('🔍 ═══════════════════════════════════════');
        console.log('');

        return data;

    } catch (err: any) {
        console.error('💥 Unexpected error:', err);
        return {
            success: false,
            error: 'Unable to verify GST number',
            serviceDown: true,
            userMessage: 'Something went wrong. You can proceed with manual entry.',
            technicalError: err.message
        };
    }
};

// ============================================
// ✅ UTILITY FUNCTIONS
// ============================================

// Get cache statistics
export const getGSTCacheStats = () => {
    const totalRequests = apiCallCount + cacheHitCount;
    const savingsPercent = totalRequests > 0 
        ? ((cacheHitCount / totalRequests) * 100).toFixed(1) 
        : '0';
    
    let cachedEntries = 0;
    try {
        const stored = localStorage.getItem(CACHE_KEY);
        if (stored) {
            cachedEntries = Object.keys(JSON.parse(stored)).length;
        }
    } catch (e) {}

    return {
        totalRequests,
        apiCalls: apiCallCount,
        cacheHits: cacheHitCount,
        savingsPercent: savingsPercent + '%',
        cachedEntries,
        memoryCacheSize: memoryCache.size
    };
};

// Log statistics to console
export const logGSTStats = () => {
    const stats = getGSTCacheStats();
    console.log('');
    console.log('📊 ═══════════════════════════════════════');
    console.log('📊 GST API USAGE STATISTICS');
    console.log('📊 ═══════════════════════════════════════');
    console.log(`📊 Total Requests:    ${stats.totalRequests}`);
    console.log(`📊 API Calls (₹):     ${stats.apiCalls}`);
    console.log(`📊 Cache Hits (Free): ${stats.cacheHits}`);
    console.log(`📊 Cost Savings:      ${stats.savingsPercent}`);
    console.log(`📊 Cached Entries:    ${stats.cachedEntries}`);
    console.log('📊 ═══════════════════════════════════════');
    console.log('');
    return stats;
};

// Clear all cache
export const clearGSTCache = () => {
    memoryCache.clear();
    localStorage.removeItem(CACHE_KEY);
    console.log('🗑️ GST cache cleared');
};

// Check if GST is already cached
export const isGSTCached = (gstin: string): boolean => {
    return getCachedGST(gstin) !== null;
};

// ============================================
// ✅ EXISTING FUNCTIONS (UNCHANGED)
// ============================================

// Check if service is available
export const checkGSTServiceStatus = async (): Promise<boolean> => {
    try {
        const testGST = '27AADCK0528K1ZJ';
        const result = await lookupGST(testGST);
        return !result.serviceDown;
    } catch (err) {
        console.error('Error checking GST service status:', err);
        return false;
    }
};

// Retry mechanism
export const lookupGSTWithRetry = async (
    gstin: string,
    maxRetries: number = 2,
    retryDelay: number = 2000
): Promise<GSTData> => {
    let lastError: GSTData | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        if (attempt > 0) {
            console.log(`🔄 Retry attempt ${attempt} for GST: ${gstin}`);
            await new Promise(resolve => setTimeout(resolve, retryDelay));
        }

        const result = await lookupGST(gstin);

        if (result.success) {
            return result;
        }

        if (result.serviceDown) {
            console.log('🔴 Service is down, skipping retries');
            return result;
        }

        lastError = result;
    }

    return lastError || {
        success: false,
        error: 'GST verification failed after multiple attempts',
        serviceDown: false
    };
};