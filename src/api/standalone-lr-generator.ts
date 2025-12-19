// src/api/standalone-lr-generator.ts
import { supabase } from '@/lib/supabase';

// =====================================================
// Types & Interfaces
// =====================================================
export interface GoodsItem {
  id: string;
  description?: string;
  quantity?: string;
}

export interface StandaloneLRDocument {
  id: string;
  company_id: string;
  created_by: string;
  
  standalone_lr_number: string;
  lr_date: string;
  
  company_name?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_phone?: string;
  company_email?: string;
  company_gst?: string;
  company_pan?: string;
  company_logo_url?: string;
  
  consignor_name: string;
  consignor_address?: string;
  consignor_city?: string;
  consignor_state?: string;
  consignor_pincode?: string;
  consignor_phone?: string;
  consignor_gst?: string;
  consignor_email?: string;
  
  consignee_name: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_state?: string;
  consignee_pincode?: string;
  consignee_phone?: string;
  consignee_gst?: string;
  consignee_email?: string;
  
  from_location: string;
  to_location: string;
  
  goods_items?: GoodsItem[];
  material_description?: string;
  packages_qty?: string;
  
  weight?: number;
  invoice_number?: string;
  invoice_value?: number;
  eway_bill_number?: string;
  
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  
  freight_amount?: number;
  payment_mode?: 'PAID' | 'TO_PAY' | 'TO_BE_BILLED';
  
  remarks?: string;
  template_code?: string;
  status?: 'DRAFT' | 'GENERATED' | 'SENT' | 'CANCELLED';
  pdf_file_url?: string;
  generated_at?: string;
  
  created_at: string;
  updated_at: string;
}

export interface CreateStandaloneLRData {
  standalone_lr_number?: string;
  lr_date: string;
  
  company_name?: string;
  company_address?: string;
  company_city?: string;
  company_state?: string;
  company_phone?: string;
  company_email?: string;
  company_gst?: string;
  company_pan?: string;
  company_logo_url?: string;
  
  consignor_name: string;
  consignor_address?: string;
  consignor_city?: string;
  consignor_state?: string;
  consignor_pincode?: string;
  consignor_phone?: string;
  consignor_gst?: string;
  consignor_email?: string;
  
  consignee_name: string;
  consignee_address?: string;
  consignee_city?: string;
  consignee_state?: string;
  consignee_pincode?: string;
  consignee_phone?: string;
  consignee_gst?: string;
  consignee_email?: string;
  
  from_location: string;
  to_location: string;
  
  goods_items?: GoodsItem[];
  weight?: number;
  invoice_number?: string;
  invoice_value?: number;
  eway_bill_number?: string;
  
  vehicle_number?: string;
  driver_name?: string;
  driver_phone?: string;
  
  freight_amount?: number;
  payment_mode?: 'PAID' | 'TO_PAY' | 'TO_BE_BILLED';
  
  remarks?: string;
  template_code?: string;
  status?: 'DRAFT' | 'GENERATED' | 'SENT' | 'CANCELLED';
}

export interface UpdateStandaloneLRData extends Partial<CreateStandaloneLRData> {}

// =====================================================
// ✅ HELPER: Parse goods_items safely (handles double-stringify)
// =====================================================
function parseGoodsItems(goodsItems: any): GoodsItem[] {
  if (!goodsItems) return [];
  
  // Already an array
  if (Array.isArray(goodsItems)) {
    return goodsItems.filter(item => item && (item.description || item.quantity));
  }
  
  // It's a string - need to parse
  if (typeof goodsItems === 'string') {
    try {
      let parsed = JSON.parse(goodsItems);
      
      // Check if it was double-stringified
      if (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      
      // Ensure it's an array
      if (Array.isArray(parsed)) {
        return parsed.filter(item => item && (item.description || item.quantity));
      }
      
      return [];
    } catch (e) {
      console.error('❌ Error parsing goods_items:', e, goodsItems);
      return [];
    }
  }
  
  // If it's an object (single item), wrap in array
  if (typeof goodsItems === 'object') {
    return [goodsItems].filter(item => item && (item.description || item.quantity));
  }
  
  return [];
}

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
// Generate Standalone LR Number
// =====================================================
export async function generateStandaloneLRNumber(): Promise<string> {
  try {
    const companyId = await getCurrentCompanyId();
    
    const { data, error } = await supabase
      .rpc('generate_standalone_lr_number', { p_company_id: companyId });

    if (error) {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      
      const { count } = await supabase
        .from('standalone_lr_documents')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', companyId);
      
      const sequence = String((count || 0) + 1).padStart(4, '0');
      return `SLR-${year}${month}-${sequence}`;
    }
    
    return data as string;
  } catch (error) {
    console.error('Error generating standalone LR number:', error);
    const timestamp = Date.now().toString(36).toUpperCase();
    return `SLR-${timestamp}`;
  }
}

// =====================================================
// ✅ CREATE - Fixed: Don't stringify for JSONB column
// =====================================================
export async function createStandaloneLRDocument(lrData: CreateStandaloneLRData): Promise<StandaloneLRDocument> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('User not authenticated');

    const companyId = await getCurrentCompanyId();

    let standalone_lr_number = lrData.standalone_lr_number;
    if (!standalone_lr_number) {
      standalone_lr_number = await generateStandaloneLRNumber();
    }

    // ✅ Filter and prepare goods_items - DON'T stringify!
    const validGoodsItems = (lrData.goods_items || []).filter(
      item => item && (item.description || item.quantity)
    );

    const insertData = {
      ...lrData,
      standalone_lr_number,
      company_id: companyId,
      created_by: user.id,
      // ✅ JSONB column - Supabase handles serialization automatically
      goods_items: validGoodsItems.length > 0 ? validGoodsItems : [],
    };

    console.log('📝 Creating LR with goods_items:', insertData.goods_items);

    const { data, error } = await supabase
      .from('standalone_lr_documents')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      goods_items: parseGoodsItems(data.goods_items),
    } as StandaloneLRDocument;
  } catch (error) {
    console.error('Error creating standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// ✅ UPDATE - Fixed: Don't stringify for JSONB column
// =====================================================
export async function updateStandaloneLRDocument(
  id: string,
  updates: UpdateStandaloneLRData
): Promise<StandaloneLRDocument> {
  try {
    // ✅ Filter and prepare goods_items
    let goods_items = undefined;
    if (updates.goods_items !== undefined) {
      const validItems = (updates.goods_items || []).filter(
        item => item && (item.description || item.quantity)
      );
      goods_items = validItems.length > 0 ? validItems : [];
    }

    const updateData = {
      ...updates,
      // ✅ JSONB column - don't stringify
      goods_items,
    };

    console.log('📝 Updating LR with goods_items:', updateData.goods_items);

    const { data, error } = await supabase
      .from('standalone_lr_documents')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    
    return {
      ...data,
      goods_items: parseGoodsItems(data.goods_items),
    } as StandaloneLRDocument;
  } catch (error) {
    console.error('Error updating standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// ✅ GET LIST - Fixed: Parse goods_items properly
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
    
    // ✅ Parse goods_items for each document using helper
    return (data || []).map(doc => {
      const parsedGoodsItems = parseGoodsItems(doc.goods_items);
      console.log(`📦 LR ${doc.standalone_lr_number} goods_items:`, parsedGoodsItems);
      
      return {
        ...doc,
        goods_items: parsedGoodsItems,
      };
    }) as StandaloneLRDocument[];
  } catch (error) {
    console.error('Error fetching standalone LR documents:', error);
    throw error;
  }
}

// =====================================================
// ✅ GET BY ID - Fixed: Parse goods_items properly
// =====================================================
export async function getStandaloneLRDocumentById(id: string): Promise<StandaloneLRDocument> {
  try {
    const { data, error } = await supabase
      .from('standalone_lr_documents')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    
    const parsedGoodsItems = parseGoodsItems(data.goods_items);
    console.log(`📦 LR ${data.standalone_lr_number} goods_items:`, parsedGoodsItems);
    
    return {
      ...data,
      goods_items: parsedGoodsItems,
    } as StandaloneLRDocument;
  } catch (error) {
    console.error('Error fetching standalone LR document:', error);
    throw error;
  }
}

// =====================================================
// DELETE
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
// DUPLICATE
// =====================================================
export async function duplicateStandaloneLRDocument(id: string): Promise<StandaloneLRDocument> {
  try {
    const original = await getStandaloneLRDocumentById(id);
    
    const newLRNumber = await generateStandaloneLRNumber();

    const { 
      id: _, 
      created_at, 
      updated_at, 
      standalone_lr_number, 
      status, 
      generated_at, 
      pdf_file_url,
      company_id,
      created_by,
      ...copyData 
    } = original;

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
// STATISTICS
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
      total: data?.length || 0,
      draft: data?.filter(d => d.status === 'DRAFT').length || 0,
      generated: data?.filter(d => d.status === 'GENERATED').length || 0,
      sent: data?.filter(d => d.status === 'SENT').length || 0,
      this_month: data?.filter(d => new Date(d.created_at) >= firstDayOfMonth).length || 0,
    };

    return stats;
  } catch (error) {
    console.error('Error fetching standalone LR statistics:', error);
    throw error;
  }     
}