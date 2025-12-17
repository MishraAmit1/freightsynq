// src/api/standalone-lr-generator.ts
import { supabase } from '@/lib/supabase';

// =====================================================
// Types & Interfaces
// =====================================================
export interface StandaloneLRDocument {
  id: string;
  company_id: string;
  created_by: string;
  
  // LR Details
  standalone_lr_number: string;
  lr_date: string;
  
  // Consignor
  consignor_name: string;
  consignor_address?: string;
  consignor_city?: string;
  consignor_state?: string;
  consignor_pincode?: string;
  consignor_phone?: string;
  consignor_gst?: string;
  consignor_email?: string;
  
  // Consignee
  consignee_name: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_state?: string;
  consignee_pincode?: string;
  consignee_phone?: string;
  consignee_gst?: string;
  consignee_email?: string;
  
  // Route
  from_location: string;
  to_location: string;
  
  // Goods
  material_description?: string;
  packages_qty?: string;
  weight?: number;
  invoice_number?: string;
  invoice_value?: number;
  eway_bill_number?: string;
  
  // Vehicle & Driver
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  
  // Payment
  freight_amount?: number;
  payment_mode?: 'PAID' | 'TO_PAY' | 'TO_BE_BILLED';
  
  // Other
  remarks?: string;
  template_code?: string;
  status?: 'DRAFT' | 'GENERATED' | 'SENT' | 'CANCELLED';
  pdf_file_url?: string;
  generated_at?: string;
  
  // Metadata
  created_at: string;
  updated_at: string;
}

export interface CreateStandaloneLRData extends Omit<StandaloneLRDocument, 'id' | 'company_id' | 'created_by' | 'created_at' | 'updated_at'> {}

export interface UpdateStandaloneLRData extends Partial<CreateStandaloneLRData> {}

// =====================================================
// Helper: Get Current User's Company ID
// =====================================================
async function getCurrentCompanyId(): Promise<string> {
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw new Error('User not authenticated');

  const { data: userData, error: userDataError } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (userDataError || !userData?.company_id) {
    throw new Error('Company ID not found for user');
  }

  return userData.company_id;
}

// =====================================================
// Function: Generate Standalone LR Number
// =====================================================
export async function generateStandaloneLRNumber(): Promise<string> {
  try {
    const companyId = await getCurrentCompanyId();
    
    const { data, error } = await supabase
      .rpc('generate_standalone_lr_number', { p_company_id: companyId });

    if (error) throw error;
    return data as string;
  } catch (error) {
    console.error('Error generating standalone LR number:', error);
    throw error;
  }
}

// =====================================================
// Function: Create Standalone LR Document
// =====================================================
export async function createStandaloneLRDocument(lrData: CreateStandaloneLRData): Promise<StandaloneLRDocument> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const companyId = await getCurrentCompanyId();

    // If no LR number provided, generate one
    let standalone_lr_number = lrData.standalone_lr_number;
    if (!standalone_lr_number) {
      standalone_lr_number = await generateStandaloneLRNumber();
    }

    const { data, error } = await supabase
      .from('standalone_lr_documents')
      .insert([{
        ...lrData,
        standalone_lr_number,
        company_id: companyId,
        created_by: user.id,
      }])
      .select()
      .single();

    if (error) throw error;
    return data as StandaloneLRDocument;
  } catch (error) {
    console.error('Error creating standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// Function: Update Standalone LR Document
// =====================================================
export async function updateStandaloneLRDocument(
  id: string,
  updates: UpdateStandaloneLRData
): Promise<StandaloneLRDocument> {
  try {
    const { data, error } = await supabase
      .from('standalone_lr_documents')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as StandaloneLRDocument;
  } catch (error) {
    console.error('Error updating standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// Function: Get Standalone LR Documents (with filters)
// =====================================================
export interface StandaloneLRFilters {
  status?: 'DRAFT' | 'GENERATED' | 'SENT' | 'CANCELLED';
  from_date?: string;
  to_date?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getStandaloneLRDocuments(filters?: StandaloneLRFilters): Promise<StandaloneLRDocument[]> {
  try {
    const companyId = await getCurrentCompanyId();
    
    let query = supabase
      .from('standalone_lr_documents')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.from_date) {
      query = query.gte('lr_date', filters.from_date);
    }

    if (filters?.to_date) {
      query = query.lte('lr_date', filters.to_date);
    }

    if (filters?.search) {
      query = query.or(`standalone_lr_number.ilike.%${filters.search}%,consignor_name.ilike.%${filters.search}%,consignee_name.ilike.%${filters.search}%`);
    }

    if (filters?.limit) {
      query = query.limit(filters.limit);
    }

    if (filters?.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data as StandaloneLRDocument[];
  } catch (error) {
    console.error('Error fetching standalone LR documents:', error);
    throw error;
  }
}

// =====================================================
// Function: Get Standalone LR Document by ID
// =====================================================
export async function getStandaloneLRDocumentById(id: string): Promise<StandaloneLRDocument> {
  try {
    const { data, error } = await supabase
      .from('standalone_lr_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as StandaloneLRDocument;
  } catch (error) {
    console.error('Error fetching standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// Function: Delete Standalone LR Document
// =====================================================
export async function deleteStandaloneLRDocument(id: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('standalone_lr_documents')
      .delete()
      .eq('id', id);

    if (error) throw error;
  } catch (error) {
    console.error('Error deleting standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// Function: Get Recent Standalone LR Documents
// =====================================================
export async function getRecentStandaloneLRDocuments(limit: number = 5): Promise<StandaloneLRDocument[]> {
  return getStandaloneLRDocuments({ limit, status: undefined });
}

// =====================================================
// Function: Duplicate Standalone LR Document
// =====================================================
export async function duplicateStandaloneLRDocument(id: string): Promise<StandaloneLRDocument> {
  try {
    const original = await getStandaloneLRDocumentById(id);
    
    const newLRNumber = await generateStandaloneLRNumber();

    const { id: _, created_at, updated_at, standalone_lr_number, status, generated_at, pdf_file_url, ...copyData } = original;

    return await createStandaloneLRDocument({
      ...copyData,
      standalone_lr_number: newLRNumber,
      lr_date: new Date().toISOString().split('T')[0],
      status: 'DRAFT',
    });
  } catch (error) {
    console.error('Error duplicating standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// Function: Get Standalone LR Statistics
// =====================================================
export interface StandaloneLRStats {
  total: number;
  draft: number;
  generated: number;
  sent: number;
  this_month: number;
}

export async function getStandaloneLRStatistics(): Promise<StandaloneLRStats> {
  try {
    const companyId = await getCurrentCompanyId();
    
    const { data, error } = await supabase
      .from('standalone_lr_documents')
      .select('status, created_at')
      .eq('company_id', companyId);

    if (error) throw error;

    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const stats: StandaloneLRStats = {
      total: data.length,
      draft: data.filter(d => d.status === 'DRAFT').length,
      generated: data.filter(d => d.status === 'GENERATED').length,
      sent: data.filter(d => d.status === 'SENT').length,
      this_month: data.filter(d => new Date(d.created_at) >= firstDayOfMonth).length,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching standalone LR statistics:', error);
    throw error;
  }     
}