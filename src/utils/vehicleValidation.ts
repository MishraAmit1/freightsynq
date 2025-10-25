// src/utils/vehicleValidation.ts

import { SupabaseClient } from '@supabase/supabase-js';

export interface VehicleNumberValidation {
    isValid: boolean;
    error?: string;
    formatted?: string;
    details?: {
        state: string;
        rto: string;
        series: string;
        number: string;
    };
}

// State codes mapping
const INDIAN_STATE_CODES: Record<string, string> = {
    'AN': 'Andaman and Nicobar',
    'AP': 'Andhra Pradesh',
    'AR': 'Arunachal Pradesh',
    'AS': 'Assam',
    'BR': 'Bihar',
    'CH': 'Chandigarh',
    'CG': 'Chhattisgarh',
    'DD': 'Daman and Diu',
    'DL': 'Delhi',
    'DN': 'Dadra and Nagar Haveli',
    'GA': 'Goa',
    'GJ': 'Gujarat',
    'HP': 'Himachal Pradesh',
    'HR': 'Haryana',
    'JH': 'Jharkhand',
    'JK': 'Jammu and Kashmir',
    'KA': 'Karnataka',
    'KL': 'Kerala',
    'LA': 'Ladakh',
    'LD': 'Lakshadweep',
    'MH': 'Maharashtra',
    'ML': 'Meghalaya',
    'MN': 'Manipur',
    'MP': 'Madhya Pradesh',
    'MZ': 'Mizoram',
    'NL': 'Nagaland',
    'OD': 'Odisha',
    'OR': 'Odisha',
    'PB': 'Punjab',
    'PY': 'Puducherry',
    'RJ': 'Rajasthan',
    'SK': 'Sikkim',
    'TN': 'Tamil Nadu',
    'TR': 'Tripura',
    'TS': 'Telangana',
    'UP': 'Uttar Pradesh',
    'UK': 'Uttarakhand',
    'WB': 'West Bengal',
};

/**
 * Validate Indian vehicle number format
 */
export const validateIndianVehicleNumber = (
    vehicleNumber: string
): VehicleNumberValidation => {
    if (!vehicleNumber || vehicleNumber.trim() === '') {
        return {
            isValid: false,
            error: 'Vehicle number is required'
        };
    }

    // Remove spaces and hyphens, convert to uppercase
    const cleaned = vehicleNumber.replace(/[\s-]/g, '').toUpperCase();

    // Regex patterns for different formats
    const patterns = [
        // Standard format: XX00XX0000 (e.g., MH12AB1234)
        /^([A-Z]{2})(\d{2})([A-Z]{1,2})(\d{4})$/,

        // Old format: XX00X0000 (e.g., MH12A1234)
        /^([A-Z]{2})(\d{2})([A-Z]{1})(\d{4})$/,

        // Special format for some states: XX0XX0000 (e.g., DL1CAB1234)
        /^([A-Z]{2})(\d{1,2})([A-Z]{2})(\d{4})$/
    ];

    let match = null;
    for (const pattern of patterns) {
        match = cleaned.match(pattern);
        if (match) break;
    }

    if (!match) {
        return {
            isValid: false,
            error: 'Invalid format. Expected: XX-00-XX-0000 (e.g., MH-12-AB-1234)'
        };
    }

    const [, stateCode, rtoCode, series, number] = match;

    // Validate state code
    if (!INDIAN_STATE_CODES[stateCode]) {
        return {
            isValid: false,
            error: `Invalid state code: ${stateCode}`
        };
    }

    // Format with hyphens
    const formatted = `${stateCode}-${rtoCode}-${series}-${number}`;

    return {
        isValid: true,
        formatted,
        details: {
            state: INDIAN_STATE_CODES[stateCode],
            rto: rtoCode,
            series,
            number
        }
    };
};

/**
 * Check if vehicle already exists in database
 */
export const checkVehicleExists = async (
    vehicleNumber: string,
    supabase: SupabaseClient
): Promise<{ exists: boolean; vehicleType?: 'owned' | 'hired' }> => {
    try {
        const cleaned = vehicleNumber.replace(/[\s-]/g, '').toUpperCase();

        // Check in owned vehicles
        const { data: ownedVehicles } = await supabase
            .from('owned_vehicles')
            .select('id, vehicle_number')
            .ilike('vehicle_number', `%${cleaned}%`);

        if (ownedVehicles && ownedVehicles.length > 0) {
            return { exists: true, vehicleType: 'owned' };
        }

        // Check in hired vehicles
        const { data: hiredVehicles } = await supabase
            .from('hired_vehicles')
            .select('id, vehicle_number')
            .ilike('vehicle_number', `%${cleaned}%`);

        if (hiredVehicles && hiredVehicles.length > 0) {
            return { exists: true, vehicleType: 'hired' };
        }

        return { exists: false };
    } catch (error) {
        console.error('Error checking vehicle existence:', error);
        return { exists: false };
    }
};

/**
 * Complete validation with DB check
 */
export const validateVehicleNumber = async (
    vehicleNumber: string,
    supabase: SupabaseClient
): Promise<VehicleNumberValidation> => {
    // First validate format
    const formatValidation = validateIndianVehicleNumber(vehicleNumber);

    if (!formatValidation.isValid) {
        return formatValidation;
    }

    // Then check if already exists
    const existsCheck = await checkVehicleExists(vehicleNumber, supabase);

    if (existsCheck.exists) {
        return {
            isValid: false,
            error: `Vehicle already exists in ${existsCheck.vehicleType} fleet`,
            formatted: formatValidation.formatted
        };
    }

    return formatValidation;
};