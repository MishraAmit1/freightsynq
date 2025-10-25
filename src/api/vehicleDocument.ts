import { supabase } from '@/lib/supabase';

// Types
export interface VehicleDocument {
    id: string;
    vehicle_id: string;
    vehicle_type: 'OWNED' | 'HIRED';
    document_type: 'RC' | 'DL' | 'INSURANCE' | 'PERMIT' | 'AGREEMENT' | 'OTHER';
    file_name: string;
    file_url: string | null;
    is_verified: boolean;
    uploaded_date: string;
    expiry_date?: string;
    company_id: string;
}

export interface UploadDocumentParams {
    vehicle_id: string;
    vehicle_type: 'OWNED' | 'HIRED';
    document_type: 'RC' | 'DL' | 'INSURANCE' | 'PERMIT' | 'AGREEMENT' | 'OTHER';
    file: File;
    expiry_date?: string;
}

// Allowed file types
const ALLOWED_FILE_TYPES = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
];

// Max file size: 5MB
const MAX_FILE_SIZE = 5 * 1024 * 1024;

/**
 * Validate file before upload
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `File size must be less than 5MB. Your file is ${(file.size / 1024 / 1024).toFixed(2)}MB`
        };
    }

    // Check file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return {
            valid: false,
            error: `File type not allowed. Only PDF, JPG, PNG, and WEBP files are accepted`
        };
    }

    return { valid: true };
};

/**
 * Generate unique file name to avoid conflicts
 */
const generateUniqueFileName = (originalName: string, vehicleId: string): string => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 8);
    const extension = originalName.split('.').pop();
    const nameWithoutExt = originalName.replace(`.${extension}`, '').substring(0, 30);

    // Format: vehicleId_timestamp_random_originalname.ext
    return `${vehicleId}_${timestamp}_${randomStr}_${nameWithoutExt}.${extension}`;
};

/**
 * Upload vehicle document to Supabase Storage
 */
export const uploadVehicleDocument = async ({
    vehicle_id,
    vehicle_type,
    document_type,
    file,
    expiry_date
}: UploadDocumentParams): Promise<VehicleDocument> => {
    try {
        console.log('📤 Starting document upload:', {
            vehicle_id,
            vehicle_type,
            document_type,
            fileName: file.name,
            fileSize: file.size
        });

        // Validate file
        const validation = validateFile(file);
        if (!validation.valid) {
            throw new Error(validation.error);
        }

        // Generate unique file name
        const uniqueFileName = generateUniqueFileName(file.name, vehicle_id);
        const filePath = `${vehicle_type.toLowerCase()}/${vehicle_id}/${uniqueFileName}`;

        console.log('📁 Uploading to path:', filePath);

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
            .from('vehicle-documents')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) {
            console.error('❌ Storage upload error:', uploadError);
            throw new Error(`Upload failed: ${uploadError.message}`);
        }

        console.log('✅ File uploaded to storage:', uploadData);

        // Get public URL (won't work for private bucket, but we'll use signed URL)
        const { data: { publicUrl } } = supabase.storage
            .from('vehicle-documents')
            .getPublicUrl(filePath);

        // For private bucket, we'll store the path and generate signed URL when needed
        const storagePath = uploadData.path;

        // Save document info to database
        const { data: documentData, error: dbError } = await supabase
            .from('vehicle_documents')
            .insert({
                vehicle_id,
                vehicle_type,
                document_type,
                file_name: file.name,
                file_url: storagePath, // Store storage path, not public URL
                expiry_date: expiry_date || null,
                is_verified: false
            })
            .select()
            .single();

        if (dbError) {
            console.error('❌ Database insert error:', dbError);

            // Cleanup: Delete uploaded file if database insert fails
            await supabase.storage
                .from('vehicle-documents')
                .remove([filePath]);

            throw new Error(`Database error: ${dbError.message}`);
        }

        console.log('✅ Document saved to database:', documentData);

        return documentData;
    } catch (error: any) {
        console.error('❌ Upload vehicle document error:', error);
        throw error;
    }
};

/**
 * Upload multiple documents at once
 */
export const uploadMultipleDocuments = async (
    documents: UploadDocumentParams[]
): Promise<VehicleDocument[]> => {
    try {
        const uploadPromises = documents.map(doc => uploadVehicleDocument(doc));
        const results = await Promise.allSettled(uploadPromises);

        const successful: VehicleDocument[] = [];
        const failed: any[] = [];

        results.forEach((result, index) => {
            if (result.status === 'fulfilled') {
                successful.push(result.value);
            } else {
                failed.push({
                    fileName: documents[index].file.name,
                    error: result.reason.message
                });
            }
        });

        if (failed.length > 0) {
            console.warn('⚠️ Some uploads failed:', failed);
        }

        return successful;
    } catch (error) {
        console.error('❌ Multiple upload error:', error);
        throw error;
    }
};

/**
 * Fetch all documents for a vehicle
 */
export const fetchVehicleDocuments = async (
    vehicleId: string,
    vehicleType: 'OWNED' | 'HIRED'
): Promise<VehicleDocument[]> => {
    try {
        const { data, error } = await supabase
            .from('vehicle_documents')
            .select('*')
            .eq('vehicle_id', vehicleId)
            .eq('vehicle_type', vehicleType)
            .order('uploaded_date', { ascending: false });

        if (error) {
            console.error('❌ Fetch documents error:', error);
            throw error;
        }

        return data || [];
    } catch (error) {
        console.error('❌ Fetch vehicle documents error:', error);
        throw error;
    }
};

/**
 * Generate signed URL for private document (valid for 1 hour)
 */
export const getDocumentSignedUrl = async (filePath: string): Promise<string> => {
    try {
        const { data, error } = await supabase.storage
            .from('vehicle-documents')
            .createSignedUrl(filePath, 3600); // 1 hour expiry

        if (error) {
            console.error('❌ Signed URL error:', error);
            throw error;
        }

        return data.signedUrl;
    } catch (error) {
        console.error('❌ Get signed URL error:', error);
        throw error;
    }
};

/**
 * Download document
 */
export const downloadDocument = async (
    filePath: string,
    fileName: string
): Promise<void> => {
    try {
        // Get signed URL
        const signedUrl = await getDocumentSignedUrl(filePath);

        // Trigger download
        const link = document.createElement('a');
        link.href = signedUrl;
        link.download = fileName;
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    } catch (error) {
        console.error('❌ Download error:', error);
        throw error;
    }
};

/**
 * Delete vehicle document
 */
export const deleteVehicleDocument = async (
    documentId: string,
    filePath: string
): Promise<void> => {
    try {
        console.log('🗑️ Deleting document:', { documentId, filePath });

        // Delete from storage first
        const { error: storageError } = await supabase.storage
            .from('vehicle-documents')
            .remove([filePath]);

        if (storageError) {
            console.error('⚠️ Storage delete error:', storageError);
            // Continue anyway, might already be deleted
        }

        // Delete from database
        const { error: dbError } = await supabase
            .from('vehicle_documents')
            .delete()
            .eq('id', documentId);

        if (dbError) {
            console.error('❌ Database delete error:', dbError);
            throw dbError;
        }

        console.log('✅ Document deleted successfully');
    } catch (error) {
        console.error('❌ Delete document error:', error);
        throw error;
    }
};

/**
 * Verify/Unverify document
 */
export const verifyDocument = async (
    documentId: string,
    isVerified: boolean
): Promise<VehicleDocument> => {
    try {
        const { data, error } = await supabase
            .from('vehicle_documents')
            .update({ is_verified: isVerified })
            .eq('id', documentId)
            .select()
            .single();

        if (error) {
            console.error('❌ Verify document error:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('❌ Verify document error:', error);
        throw error;
    }
};

/**
 * Update document expiry date
 */
export const updateDocumentExpiry = async (
    documentId: string,
    expiryDate: string
): Promise<VehicleDocument> => {
    try {
        const { data, error } = await supabase
            .from('vehicle_documents')
            .update({ expiry_date: expiryDate })
            .eq('id', documentId)
            .select()
            .single();

        if (error) {
            console.error('❌ Update expiry error:', error);
            throw error;
        }

        return data;
    } catch (error) {
        console.error('❌ Update document expiry error:', error);
        throw error;
    }
};

/**
 * Get documents grouped by type
 */
export const getDocumentsByType = async (
    vehicleId: string,
    vehicleType: 'OWNED' | 'HIRED'
): Promise<Record<string, VehicleDocument[]>> => {
    try {
        const documents = await fetchVehicleDocuments(vehicleId, vehicleType);

        // Group by document_type
        const grouped = documents.reduce((acc, doc) => {
            if (!acc[doc.document_type]) {
                acc[doc.document_type] = [];
            }
            acc[doc.document_type].push(doc);
            return acc;
        }, {} as Record<string, VehicleDocument[]>);

        return grouped;
    } catch (error) {
        console.error('❌ Get documents by type error:', error);
        throw error;
    }
};

/**
 * Check if document is expiring soon (within 30 days)
 */
export const isDocumentExpiringSoon = (expiryDate?: string): boolean => {
    if (!expiryDate) return false;

    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil(
        (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
};

/**
 * Check if document is expired
 */
export const isDocumentExpired = (expiryDate?: string): boolean => {
    if (!expiryDate) return false;

    const expiry = new Date(expiryDate);
    const today = new Date();

    return expiry < today;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
};