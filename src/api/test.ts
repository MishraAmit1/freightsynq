import { supabase } from '@/lib/supabase'

export const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('warehouses')
      .select('*')
      .limit(1)
    
    if (error) {
      console.error('Supabase connection error:', error)
      return false
    }
    
    console.log('Supabase connected successfully!', data)
    return true
  } catch (err) {
    console.error('Connection failed:', err)
    return false
  }
}