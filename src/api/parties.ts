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

// api/parties.ts - ADD THESE FUNCTIONS AT THE END

// ============================================
// ✅ HELPER FUNCTIONS - Calculate Metrics
// ============================================

/**
 * Get the most recent booking date for a party
 */
const calculateLastBooking = (party: any): string | null => {
  const allBookings = [
    ...(party.consignor_bookings || []),
    ...(party.consignee_bookings || [])
  ];

  if (allBookings.length === 0) return null;

  const mostRecent = allBookings.reduce((latest, booking) => {
    const currentDate = new Date(booking.created_at);
    const latestDate = new Date(latest.created_at);
    return currentDate > latestDate ? booking : latest;
  });

  return mostRecent.created_at;
};

/**
 * Count bookings in current month
 */
const calculateTripsThisMonth = (party: any): number => {
  const allBookings = [
    ...(party.consignor_bookings || []),
    ...(party.consignee_bookings || [])
  ];

  const now = new Date();
  const thisMonth = now.getMonth();
  const thisYear = now.getFullYear();

  return allBookings.filter(booking => {
    const bookingDate = new Date(booking.created_at);
    return bookingDate.getMonth() === thisMonth &&
      bookingDate.getFullYear() === thisYear;
  }).length;
};

/**
 * Calculate POD confirmation rate for consignees
 */
const calculatePODRate = (party: any): number => {
  // Only relevant for consignees
  if (party.party_type !== 'CONSIGNEE' && party.party_type !== 'BOTH') {
    return 0;
  }

  const consigneeBookings = party.consignee_bookings || [];

  if (consigneeBookings.length === 0) return 0;

  // Count bookings with POD uploaded
  const withPOD = consigneeBookings.filter(b => b.pod_uploaded_at !== null).length;

  return Math.round((withPOD / consigneeBookings.length) * 100);
};

/**
 * Get billing status text
 */
const calculateBillingStatus = (party: any): string => {
  if (!party.is_billing_party) return "—";

  const allBookings = [
    ...(party.consignor_bookings || []),
    ...(party.consignee_bookings || [])
  ];

  // Get billed bookings
  const billedBookings = allBookings.filter(b => b.billed_at !== null);

  if (billedBookings.length === 0) {
    return "Never Billed";
  }

  // Find most recent billed booking
  const lastBilled = billedBookings.reduce((latest, booking) => {
    const currentDate = new Date(booking.billed_at);
    const latestDate = new Date(latest.billed_at);
    return currentDate > latestDate ? booking : latest;
  });

  // Calculate days since last bill
  const daysSince = Math.floor(
    (Date.now() - new Date(lastBilled.billed_at).getTime()) /
    (1000 * 60 * 60 * 24)
  );

  if (daysSince > 30) {
    return `Pending >${daysSince}d`;
  }

  // Format date nicely
  const billedDate = new Date(lastBilled.billed_at);
  const month = billedDate.toLocaleDateString('en-US', { month: 'short' });
  const day = billedDate.getDate().toString().padStart(2, '0');

  return `Last Billed ${day} ${month}`;
};

/**
 * Calculate outstanding (count of unbilled bookings)
 */
const calculateOutstanding = (party: any): number => {
  if (!party.is_billing_party) return 0;

  const allBookings = [
    ...(party.consignor_bookings || []),
    ...(party.consignee_bookings || [])
  ];

  // Count bookings without billed_at
  return allBookings.filter(b => b.billed_at === null).length;
};

// ============================================
// ✅ MAIN FUNCTION - Fetch Parties with Metrics
// ============================================

/**
 * Fetch all parties with calculated metrics
 * Returns dynamic data instead of static/dummy values
 */
export const fetchPartiesWithMetrics = async () => {
  try {
    console.log('🔍 Fetching parties with real metrics...');

    const { data, error } = await supabase
      .from('parties')
      .select(`
        *,
        consignor_bookings:bookings!consignor_id(
          id,
          created_at,
          billed_at,
          pod_uploaded_at,
          invoice_number,
          billing_status
        ),
        consignee_bookings:bookings!consignee_id(
          id,
          created_at,
          billed_at,
          pod_uploaded_at,
          billing_status
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching parties:', error);
      throw error;
    }

    console.log(`✅ Fetched ${data?.length || 0} parties from database`);

    // Process and add calculated metrics
    const partiesWithMetrics = (data || []).map(party => {
      const metrics = {
        // ✅ DYNAMIC: Last booking date
        last_booking_date: calculateLastBooking(party),

        // ✅ DYNAMIC: Monthly trips count
        trips_this_month: calculateTripsThisMonth(party),

        // ✅ LOGIC-BASED: Verification badges
        has_gst_verified: !!party.gst_number,
        has_pan_verified: !!party.pan_number,
        has_documents: false, // Remove - no table exists

        // ✅ DYNAMIC: Billing metrics
        billing_status: calculateBillingStatus(party),
        outstanding_amount: calculateOutstanding(party),

        // ✅ DYNAMIC: POD confirmation rate
        pod_confirmation_rate: calculatePODRate(party)
      };

      return {
        ...party,
        ...metrics
      };
    });

    console.log(`✅ Calculated metrics for ${partiesWithMetrics.length} parties`);

    return partiesWithMetrics;

  } catch (error) {
    console.error('❌ Error in fetchPartiesWithMetrics:', error);
    throw error;
  }
};