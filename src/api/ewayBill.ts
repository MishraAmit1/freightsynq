// src/api/ewayBill.ts
import { supabase } from '@/lib/supabase'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

/**
 * Fetch E-way Bill details by number (using ApiSathi)
 */
export async function fetchEwayBillDetails(ewayBillNumber: string) {
    try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            throw new Error('Not authenticated');
        }

        const response = await fetch(
            `${FUNCTIONS_URL}/get-eway-bill-details`,
            {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ eway_bill_number: ewayBillNumber }),
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'Failed to fetch E-way bill details');
        }

        return data;
    } catch (error: any) {
        console.error('❌ fetchEwayBillDetails error:', error);
        throw error;
    }
}

/**
 * Format validity date and check expiry status
 */
export function formatValidityDate(dateString: string): {
    formatted: string;
    isExpired: boolean;
    isExpiringSoon: boolean;
} {
    // Parse: "10/11/2025 11:59:00 PM"
    const parts = dateString.trim().split(' ');
    const [day, month, year] = parts[0].split('/').map(Number);
    const timePart = parts[1] || '23:59:59';
    const meridiem = parts[2] || 'PM';

    let [hours, minutes, seconds] = timePart.split(':').map(Number);

    // Convert to 24-hour format
    if (meridiem?.toUpperCase() === 'PM' && hours !== 12) hours += 12;
    if (meridiem?.toUpperCase() === 'AM' && hours === 12) hours = 0;

    // Create date object
    const validUntil = new Date(year, month - 1, day, hours, minutes || 59, seconds || 59);
    const now = new Date();
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // Format for display
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    const ampm = hours >= 12 ? 'pm' : 'am';
    const formatted = `${day} ${monthNames[month - 1]} ${year}, ${displayHours}:${String(minutes).padStart(2, '0')} ${ampm}`;

    return {
        formatted,
        isExpired: validUntil < now,
        isExpiringSoon: validUntil > now && validUntil < oneDayFromNow
    };
}