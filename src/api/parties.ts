import { supabase } from '@/lib/supabase'

export interface Party {
  id: string
  name: string
  contact_person?: string
  phone: string
  email?: string
  address_line1: string
  city: string
  state: string
  pincode: string
  gst_number?: string
  pan_number?: string
  party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH'
  status: 'ACTIVE' | 'INACTIVE'
  needs_update?: boolean
  company_id?: string
  is_billing_party?: boolean  // ✅ ADDED
}

// ✅ NEW FUNCTION - Fetch billing parties
export const fetchBillingParties = async () => {
  const { data, error } = await supabase
    .from('parties')
    .select('*')
    .eq('status', 'ACTIVE')
    .eq('is_billing_party', true)
    .order('name');

  if (error) {
    console.error('Error fetching billing parties:', error);
    throw error;
  }

  return data || [];
};

// ✅ UPDATED - Added BILLING type support
export const fetchParties = async (type?: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH' | 'BILLING') => {
  let query = supabase
    .from('parties')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name');

  if (type === 'BILLING') {
    query = query.eq('is_billing_party', true);
  } else if (type && type !== 'BOTH') {
    query = query.or(`party_type.eq.${type},party_type.eq.BOTH`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching parties:', error);
    throw error;
  }

  return data || [];
};

// Create new party
export const createParty = async (partyData: Omit<Party, 'id'>) => {
  const { data, error } = await supabase
    .from('parties')
    .insert([partyData])
    .select()
    .single();

  if (error) {
    console.error('Error creating party:', error);
    throw error;
  }

  return data;
};

// Search parties by name
export const searchParties = async (searchTerm: string, type?: 'CONSIGNOR' | 'CONSIGNEE') => {
  let query = supabase
    .from('parties')
    .select('*')
    .eq('status', 'ACTIVE')
    .or(`name.ilike.%${searchTerm}%,name.ilike.%${searchTerm.toLowerCase()}%,name.ilike.%${searchTerm.toUpperCase()}%`)
    .limit(10);

  if (type) {
    query = query.or(`party_type.eq.${type},party_type.eq.BOTH`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error searching parties:', error);
    throw error;
  }

  return data || [];
};

// Find party by GST number
export const findPartyByGST = async (gstNumber: string): Promise<Party | null> => {
  try {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('gst_number', gstNumber)
      .eq('status', 'ACTIVE')
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding party by GST:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in findPartyByGST:', error);
    throw error;
  }
};

// ✅ UPDATED - Added is_billing_party field
export const createPartyFromEway = async (ewayData: {
  name: string;
  gst_number: string;
  city: string;
  state: string;
  pincode: string;
  address1: string;
  address2?: string;
  party_type: 'CONSIGNOR' | 'CONSIGNEE';
}): Promise<Party> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const partyData: Record<string, any> = {
      name: ewayData.name || 'Unknown Party',
      gst_number: ewayData.gst_number,
      city: ewayData.city || 'Unknown City',
      state: ewayData.state || 'Unknown State',
      pincode: ewayData.pincode || '000000',
      address_line1: ewayData.address1 || 'Address to be updated',
      contact_person: 'To be updated',
      phone: '0000000000',
      party_type: ewayData.party_type,
      status: 'ACTIVE',
      needs_update: true,
      is_billing_party: false,  // ✅ ADDED
      company_id: profile?.company_id || null
    };

    console.log('📤 Creating party with data:', partyData);

    const { data, error } = await supabase
      .from('parties')
      .insert([partyData])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating party from E-way:', error);
      throw error;
    }

    console.log('✅ Party created from E-way bill:', data.name);
    return data;
  } catch (error) {
    console.error('❌ Error in createPartyFromEway:', error);
    throw error;
  }
};

// ✅ UPDATED - Added is_billing_party field
export const updatePartyContact = async (
  partyId: string,
  contactData: {
    contact_person?: string;
    phone?: string;
    email?: string;
    is_billing_party?: boolean;  // ✅ ADDED
  }
): Promise<Party> => {
  try {
    const updateData = {
      ...contactData,
      needs_update: false
    };

    const { data, error } = await supabase
      .from('parties')
      .update(updateData)
      .eq('id', partyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating party contact:', error);
      throw error;
    }

    console.log('✅ Party contact updated:', data.name);
    return data;
  } catch (error) {
    console.error('Error in updatePartyContact:', error);
    throw error;
  }
};

// Fetch parties that need contact details update
export const fetchIncompleteParties = async (): Promise<Party[]> => {
  try {
    const { data, error } = await supabase
      .from('parties')
      .select('*')
      .eq('needs_update', true)
      .eq('status', 'ACTIVE')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching incomplete parties:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchIncompleteParties:', error);
    throw error;
  }
};

// ✅ NEW FUNCTION - Update party billing status
export const updatePartyBillingStatus = async (
  partyId: string,
  isBillingParty: boolean
): Promise<Party> => {
  try {
    const { data, error } = await supabase
      .from('parties')
      .update({ is_billing_party: isBillingParty })
      .eq('id', partyId)
      .select()
      .single();

    if (error) {
      console.error('Error updating party billing status:', error);
      throw error;
    }

    console.log(`✅ Party billing status updated: ${data.name} - ${isBillingParty ? 'Billing' : 'Not Billing'}`);
    return data;
  } catch (error) {
    console.error('Error in updatePartyBillingStatus:', error);
    throw error;
  }
};