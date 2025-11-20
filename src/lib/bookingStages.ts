// src/lib/bookingStages.ts
import {
    Truck,
    FileText,
    CheckCircle2,
    Upload,
    Receipt,
    Eye,
    PackageCheck
} from "lucide-react";

// ============================================
// Booking Stage Types
// ============================================
export type BookingStage =
    | 'DRAFT'           // Just created, no vehicle
    | 'DISPATCHED'      // Vehicle assigned
    | 'IN_TRANSIT'      // LR created, on the road
    | 'DELIVERED'       // Reached destination
    | 'POD_UPLOADED'    // Proof of delivery uploaded
    | 'BILLED';         // Invoice generated

// ============================================
// Stage Configuration
// ============================================
export const stageConfig: Record<BookingStage, {
    label: string;
    color: string;
    bgColor: string;
    textColor: string;
}> = {
    DRAFT: {
        label: 'Draft',
        color: 'gray',
        bgColor: 'bg-gray-100',
        textColor: 'text-gray-700'
    },
    DISPATCHED: {
        label: 'Dispatched',
        color: 'orange',
        bgColor: 'bg-orange-100',
        textColor: 'text-orange-700'
    },
    IN_TRANSIT: {
        label: 'In Transit',
        color: 'blue',
        bgColor: 'bg-blue-100',
        textColor: 'text-blue-700'
    },
    DELIVERED: {
        label: 'Delivered',
        color: 'green',
        bgColor: 'bg-green-100',
        textColor: 'text-green-700'
    },
    POD_UPLOADED: {
        label: 'POD Uploaded',
        color: 'purple',
        bgColor: 'bg-purple-100',
        textColor: 'text-purple-700'
    },
    BILLED: {
        label: 'Billed',
        color: 'emerald',
        bgColor: 'bg-emerald-100',
        textColor: 'text-emerald-700'
    }
};

// ============================================
// Progressive Action Type
// ============================================
export interface ProgressiveAction {
    label: string;
    icon: any;
    color: string;
    variant: 'default' | 'outline' | 'secondary';
    stage: BookingStage;
}

export const getBookingStage = (booking: any): BookingStage => {
    // Reverse order - check latest stages first

    // Stage 6: Billed (final stage)
    // ✅ FIX: Only consider BILLED if billed_at is set
    if (booking.billed_at || booking.billedAt) {
        return 'BILLED';
    }

    // Stage 5: POD Uploaded
    if (booking.pod_uploaded_at || booking.podUploadedAt || booking.pod_file_url || booking.podFileUrl) {
        return 'POD_UPLOADED';
    }

    // Stage 4: Delivered
    if (booking.status === 'DELIVERED' || booking.actual_delivery || booking.actualDelivery) {
        return 'DELIVERED';
    }

    // ✅ Stage 3: In Transit (LR created)
    if (booking.lrNumber || booking.lr_number || booking.status === 'IN_TRANSIT') {
        return 'IN_TRANSIT';
    }

    // Stage 2: Dispatched (vehicle assigned)
    if (booking.assignedVehicle || booking.vehicle_assignments?.length > 0 || booking.status === 'DISPATCHED') {
        return 'DISPATCHED';
    }

    // Stage 1: Draft (default)
    return 'DRAFT';
};

// ============================================
// Get Progressive Action Button
// ============================================
export const getProgressiveAction = (
    stage: BookingStage,
    booking: any
): ProgressiveAction | null => {

    // Don't show button for cancelled bookings
    if (booking.status === 'CANCELLED') {
        return null;
    }

    switch (stage) {
        case 'DRAFT':
            return {
                label: 'Assign Vehicle',
                icon: Truck,
                color: 'bg-orange-500 hover:bg-orange-600 text-white',
                variant: 'default',
                stage: 'DRAFT'
            };

        case 'DISPATCHED':
            return {
                label: 'Create LR',
                icon: FileText,
                color: 'bg-blue-500 hover:bg-blue-600 text-white',
                variant: 'default',
                stage: 'DISPATCHED'
            };

        case 'IN_TRANSIT':
            return {
                label: 'Mark Delivered',
                icon: CheckCircle2,
                color: 'bg-green-500 hover:bg-green-600 text-white',
                variant: 'default',
                stage: 'IN_TRANSIT'
            };

        case 'DELIVERED':
            return {
                label: 'Upload POD',
                icon: Upload,
                color: 'bg-purple-500 hover:bg-purple-600 text-white',
                variant: 'default',
                stage: 'DELIVERED'
            };

        case 'POD_UPLOADED':
            return {
                label: 'Generate Invoice',
                icon: Receipt,
                color: 'bg-indigo-500 hover:bg-indigo-600 text-white',
                variant: 'default',
                stage: 'POD_UPLOADED'
            };

        case 'BILLED':
            return {
                label: 'View Invoice',
                icon: Eye,
                color: 'bg-emerald-500 hover:bg-emerald-600 text-white',
                variant: 'default',
                stage: 'BILLED'
            };

        default:
            return null;
    }
};

// ============================================
// Helper: Get Stage Progress Percentage
// ============================================
export const getStageProgress = (stage: BookingStage): number => {
    const progress: Record<BookingStage, number> = {
        DRAFT: 16,
        DISPATCHED: 33,
        IN_TRANSIT: 50,
        DELIVERED: 66,
        POD_UPLOADED: 83,
        BILLED: 100
    };
    return progress[stage];
};

// ============================================
// Helper: Is Stage Complete
// ============================================
export const isStageComplete = (currentStage: BookingStage, checkStage: BookingStage): boolean => {
    const order: BookingStage[] = ['DRAFT', 'DISPATCHED', 'IN_TRANSIT', 'DELIVERED', 'POD_UPLOADED', 'BILLED'];
    return order.indexOf(currentStage) >= order.indexOf(checkStage);
};