import { supabase } from '@/lib/supabase';

export interface AccessRequest {
  id: string;
  company_id: string;
  user_id: string;
  user_email: string;
  company_name: string;
  requested_features: string[];
  reason: string;
  business_type?: string;
  expected_monthly_bookings?: number;
  additional_notes?: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  requested_at: string;
  processed_at?: string;
  processed_by?: string;
  grant_duration?: number;
  admin_notes?: string;
  created_at: string;
}

export interface CreateAccessRequestData {
  requested_features: string[];
  reason: string;
  business_type?: string;
  expected_monthly_bookings?: number;
  additional_notes?: string;
}

/**
 * Create a new access request
 */
export const createAccessRequest = async (data: CreateAccessRequestData): Promise<AccessRequest> => {
  // Get current user and company
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data: userData, error: userError } = await supabase
    .from('users')
    .select('company_id, email, name')
    .eq('id', user.id)
    .single();

  if (userError || !userData) throw new Error('User not found');

  const { data: companyData, error: companyError } = await supabase
    .from('companies')
    .select('name')
    .eq('id', userData.company_id)
    .single();

  if (companyError || !companyData) throw new Error('Company not found');

  // Insert request
  const { data: request, error } = await supabase
    .from('access_requests')
    .insert({
      company_id: userData.company_id,
      user_id: user.id,
      user_email: userData.email,
      company_name: companyData.name,
      requested_features: data.requested_features,
      reason: data.reason,
      business_type: data.business_type,
      expected_monthly_bookings: data.expected_monthly_bookings,
      additional_notes: data.additional_notes,
      status: 'PENDING'
    })
    .select()
    .single();

  if (error) throw error;
  return request;
};

/**
 * Fetch access requests (for Super Admin)
 */
export const fetchAccessRequests = async (status?: 'PENDING' | 'APPROVED' | 'REJECTED'): Promise<AccessRequest[]> => {
  let query = supabase
    .from('access_requests')
    .select('*')
    .order('requested_at', { ascending: false });

  if (status) {
    query = query.eq('status', status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

/**
 * Get request count by status
 */
export const getRequestCounts = async () => {
  const { count: pendingCount } = await supabase
    .from('access_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'PENDING');

  const { count: approvedCount } = await supabase
    .from('access_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'APPROVED');

  const { count: rejectedCount } = await supabase
    .from('access_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'REJECTED');

  return {
    pending: pendingCount || 0,
    approved: approvedCount || 0,
    rejected: rejectedCount || 0,
  };
};

/**
 * Approve access request
 */
export const approveAccessRequest = async (
  requestId: string,
  grantDuration: number,
  adminNotes?: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  // Get request details
  const { data: request, error: fetchError } = await supabase
    .from('access_requests')
    .select('company_id')
    .eq('id', requestId)
    .single();

  if (fetchError || !request) throw new Error('Request not found');

  // Update company access level
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + grantDuration);

  const { error: companyError } = await supabase
    .from('companies')
    .update({
      access_level: 'FULL',
      access_expires_at: expiryDate.toISOString()
    })
    .eq('id', request.company_id);

  if (companyError) throw companyError;

  // Update request status
  const { error: updateError } = await supabase
    .from('access_requests')
    .update({
      status: 'APPROVED',
      processed_at: new Date().toISOString(),
      processed_by: user.id,
      grant_duration: grantDuration,
      admin_notes: adminNotes
    })
    .eq('id', requestId);

  if (updateError) throw updateError;
};

/**
 * Reject access request
 */
export const rejectAccessRequest = async (
  requestId: string,
  adminNotes: string
): Promise<void> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { error } = await supabase
    .from('access_requests')
    .update({
      status: 'REJECTED',
      processed_at: new Date().toISOString(),
      processed_by: user.id,
      admin_notes: adminNotes
    })
    .eq('id', requestId);

  if (error) throw error;
};

/**
 * Get user's request status
 */
export const getUserRequestStatus = async (): Promise<AccessRequest | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'PENDING')
    .order('requested_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};
/**
 * Get user's latest request (pending, rejected, or recently approved)
 */
export const getUserLatestRequest = async (): Promise<AccessRequest | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // Get user's company_id
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single();

  if (!userData?.company_id) return null;

  // Get latest request for this company
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .eq('company_id', userData.company_id)
    .order('requested_at', { ascending: false })
    .limit(1)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching request:', error);
    return null;
  }
  
  return data;
};