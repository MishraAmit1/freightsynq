// ============================================
// 📊 ETA CALCULATION UTILITIES
// ============================================

/**
 * Get SLA status with color coding
 */
export const getSLAStatus = (eta: Date | string, deliveryStatus?: string): {
    status: 'on-time' | 'at-risk' | 'delayed';
    label: string;
    color: string;
    bgColor: string;
    icon: string;
} => {
    // If already delivered, show completed
    if (deliveryStatus === 'DELIVERED') {
        return {
            status: 'on-time',
            label: 'Delivered',
            color: 'text-green-700',
            bgColor: 'bg-green-100 dark:bg-green-950/20',
            icon: '✅'
        };
    }

    const now = new Date();
    const etaDate = new Date(eta);

    // Calculate hours difference
    const hoursDiff = (etaDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursDiff < 0) {
        // Delayed
        const hoursDelayed = Math.abs(Math.floor(hoursDiff));
        return {
            status: 'delayed',
            label: `Delayed ${hoursDelayed}h`,
            color: 'text-red-700',
            bgColor: 'bg-red-100 dark:bg-red-950/20',
            icon: '🔴'
        };
    } else if (hoursDiff < 12) {
        // At risk (less than 12 hours)
        const hoursLeft = Math.floor(hoursDiff);
        return {
            status: 'at-risk',
            label: `${hoursLeft}h left`,
            color: 'text-yellow-700',
            bgColor: 'bg-yellow-100 dark:bg-yellow-950/20',
            icon: '⚠️'
        };
    } else {
        // On time
        const hoursLeft = Math.floor(hoursDiff);
        return {
            status: 'on-time',
            label: hoursLeft < 48 ? `${hoursLeft}h left` : 'On Time',
            color: 'text-green-700',
            bgColor: 'bg-green-100 dark:bg-green-950/20',
            icon: '🟢'
        };
    }
};

/**
 * Format ETA for display
 */
// export const formatETA = (eta: Date | string): string => {
//     const etaDate = new Date(eta);

//     const today = new Date();
//     const tomorrow = new Date(today);
//     tomorrow.setDate(tomorrow.getDate() + 1);

//     // Format date
//     const dateStr = etaDate.toLocaleDateString('en-IN', {
//         day: '2-digit',
//         month: 'short'
//     });

//     // Format time
//     const timeStr = etaDate.toLocaleTimeString('en-IN', {
//         hour: '2-digit',
//         minute: '2-digit',
//         hour12: true
//     });

//     // Check if today/tomorrow
//     if (etaDate.toDateString() === today.toDateString()) {
//         return `Today, ${timeStr}`;
//     } else if (etaDate.toDateString() === tomorrow.toDateString()) {
//         return `Tomorrow, ${timeStr}`;
//     } else {
//         return `${dateStr}, ${timeStr}`;
//     }
// };
const getMonthShort = (monthIndex: number): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[monthIndex];
};
/**
 * Format ETA date - "12 Dec 2025"
 */
export const formatETA = (eta: Date | string): string => {
    const etaDate = new Date(eta);
    const day = etaDate.getDate().toString().padStart(2, '0');
    const month = getMonthShort(etaDate.getMonth());
    const year = etaDate.getFullYear();  // ✅ Year add kiya

    return `${day} ${month} ${year}`;  // ✅ Updated format
};