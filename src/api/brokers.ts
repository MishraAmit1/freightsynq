// api/brokers.ts
import { supabase } from '@/lib/supabase'

// Get all brokers
export const fetchBrokers = async () => {
  const { data, error } = await supabase
    .from('brokers')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name')

  if (error) {
    console.error('Error fetching brokers:', error)
    throw error
  }

  return data || []
}

// Create new broker - UPDATED (phone optional)
export const createBroker = async (brokerData: {
  name: string
  contact_person: string
  phone?: string  // ✅ Optional bana diya
  email?: string
  city?: string
}) => {
  const { data, error } = await supabase
    .from('brokers')
    .insert([{
      ...brokerData,
      phone: brokerData.phone || null,  // ✅ Handle empty phone
      status: 'ACTIVE'
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating broker:', error)
    throw error
  }

  return data
}