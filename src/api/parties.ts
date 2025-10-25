import { supabase } from '@/lib/supabase'

export interface Party {
  id: string
  name: string
  contact_person?: string
  phone: string
  email?: string
  address_line1: string
  address_line2?: string
  city: string
  state: string
  pincode: string
  gst_number?: string
  pan_number?: string
  party_type: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH'
  status: 'ACTIVE' | 'INACTIVE'
}

// Fetch all parties (with optional type filter)
export const fetchParties = async (type?: 'CONSIGNOR' | 'CONSIGNEE' | 'BOTH') => {
  let query = supabase
    .from('parties')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name');

  if (type && type !== 'BOTH') {
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
    .or(`name.ilike.%${searchTerm}%,name.ilike.%${searchTerm.toLowerCase()}%,name.ilike.%${searchTerm.toUpperCase()}%`)  // ✅ Case-insensitive
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