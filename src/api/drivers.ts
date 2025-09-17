import { supabase } from '@/lib/supabase'

// Create new driver
export const createDriver = async (driverData: {
  name: string
  phone: string
  license_number: string
  experience?: string
}) => {
  const { data, error } = await supabase
    .from('drivers')
    .insert([{
      ...driverData,
      status: 'ACTIVE'
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating driver:', error)
    throw error
  }
  
  return data
}

// Get all drivers
export const fetchAllDrivers = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('name')

  if (error) {
    console.error('Error fetching drivers:', error)
    throw error
  }
  
  return data || []
}