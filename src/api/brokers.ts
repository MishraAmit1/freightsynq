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

// Create new broker
export const createBroker = async (brokerData: {
  name: string
  contact_person: string
  phone: string
  email?: string
}) => {
  const { data, error } = await supabase
    .from('brokers')
    .insert([{
      ...brokerData,
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