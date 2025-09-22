import { supabase } from '@/lib/supabase'

// Types
export interface OwnedVehicle {
  id: string
  vehicle_number: string
  vehicle_type: string
  capacity: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'MAINTENANCE' | 'INACTIVE'
  is_verified: boolean
  registration_date?: string
  insurance_expiry?: string
  fitness_expiry?: string
  permit_expiry?: string
  purchase_date?: string
  purchase_price?: number
  current_value?: number
  fuel_type?: string
  mileage_reading?: number
  created_at: string
  updated_at: string
  vehicle_assignments?: VehicleAssignment[]
}

export interface HiredVehicle {
  id: string
  vehicle_number: string
  vehicle_type: string
  capacity: string
  broker_id: string
  status: 'AVAILABLE' | 'OCCUPIED' | 'RELEASED'
  hire_date?: string
  rate_per_trip?: number
  created_at: string
  updated_at: string
  broker?: {
    name: string
    contact_person: string
    phone: string
  }
  vehicle_assignments?: VehicleAssignment[]
}

export interface VehicleAssignment {
  id: string
  status: string
  driver?: {
    id: string
    name: string
    phone: string
    experience?: string
  }
  booking?: {
    booking_id: string
    from_location: string
    to_location: string
  }
}

// Fetch owned vehicles
export const fetchOwnedVehicles = async () => {
  const { data, error } = await supabase
    .from('owned_vehicles')
    .select(`
      *,
      vehicle_assignments!owned_vehicle_id(
        id,
        status,
        driver:drivers(id, name, phone, experience),
        booking:bookings(booking_id, from_location, to_location)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching owned vehicles:', error)
    throw error
  }
  return data || []
}
// Add this to your vehicles API file
export const createDriver = async (driverData: {
  name: string
  phone: string
  license_number: string
  experience?: string
  address?: string
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
// Fetch hired vehicles
export const fetchHiredVehicles = async () => {
  const { data, error } = await supabase
    .from('hired_vehicles')
    .select(`
      *,
      broker:brokers(name, contact_person, phone),
      vehicle_assignments!hired_vehicle_id(
        id,
        status,
        driver:drivers(id, name, phone, experience),
        booking:bookings(booking_id, from_location, to_location)
      )
    `)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching hired vehicles:', error)
    throw error
  }
  return data || []
}

// Fetch available owned vehicles
export const fetchAvailableOwnedVehicles = async () => {
  const { data, error } = await supabase
    .from('owned_vehicles')
    .select('*')
    .eq('status', 'AVAILABLE')
    .order('vehicle_number')

  if (error) {
    console.error('Error fetching available owned vehicles:', error)
    throw error
  }
  return data || []
}

// Fetch available hired vehicles
export const fetchAvailableHiredVehicles = async () => {
  const { data, error } = await supabase
    .from('hired_vehicles')
    .select(`
      *,
      broker:brokers(name, contact_person, phone)
    `)
    .eq('status', 'AVAILABLE')
    .order('vehicle_number')

  if (error) {
    console.error('Error fetching available hired vehicles:', error)
    throw error
  }
  return data || []
}

// Create owned vehicle
export const createOwnedVehicle = async (vehicleData: {
  vehicle_number: string
  vehicle_type: string
  capacity: string
  registration_date?: string
  insurance_expiry?: string
  fitness_expiry?: string
  permit_expiry?: string
}) => {
  const { data, error } = await supabase
    .from('owned_vehicles')
    .insert([{
      ...vehicleData,
      status: 'AVAILABLE',
      is_verified: false
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating owned vehicle:', error)
    throw error
  }
  return data
}

// Create hired vehicle
export const createHiredVehicle = async (vehicleData: {
  vehicle_number: string
  vehicle_type: string
  capacity: string
  broker_id: string
  rate_per_trip?: number
}) => {
  const { data, error } = await supabase
    .from('hired_vehicles')
    .insert([{
      ...vehicleData,
      status: 'AVAILABLE',
      hire_date: new Date().toISOString().split('T')[0]
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating hired vehicle:', error)
    throw error
  }
  return data
}

// Verify owned vehicle
export const verifyOwnedVehicle = async (vehicleId: string, isVerified: boolean) => {
  const { data, error } = await supabase
    .from('owned_vehicles')
    .update({ is_verified: isVerified })
    .eq('id', vehicleId)
    .select()
    .single()

  if (error) {
    console.error('Error verifying owned vehicle:', error)
    throw error
  }
  return data
}

// Verify hired vehicle
export const verifyHiredVehicle = async (vehicleId: string, isVerified: boolean) => {
  const { data, error } = await supabase
    .from('hired_vehicles')
    .update({ is_verified: isVerified })
    .eq('id', vehicleId)
    .select()
    .single()

  if (error) {
    console.error('Error verifying hired vehicle:', error)
    throw error
  }
  return data
}

// Assign vehicle to booking
export const assignVehicleToBooking = async (assignmentData: {
  booking_id: string
  vehicle_type: 'OWNED' | 'HIRED'
  vehicle_id: string
  driver_id: string
  broker_id?: string
}) => {
  try {
    // Check if booking is currently at warehouse
    const { data: booking } = await supabase
      .from('bookings')
      .select('current_warehouse_id')
      .eq('id', assignmentData.booking_id)
      .single();

    // If at warehouse, remove from warehouse first
    if (booking?.current_warehouse_id) {
      // Get active consignment
      const { data: consignment } = await supabase
        .from('consignments')
        .select('id')
        .eq('booking_id', assignmentData.booking_id)
        .eq('warehouse_id', booking.current_warehouse_id)
        .is('departure_date', null)
        .single();

      if (consignment) {
        // Create OUTGOING warehouse log
        await supabase
          .from('warehouse_logs')
          .insert({
            consignment_id: consignment.id,
            warehouse_id: booking.current_warehouse_id,
            type: 'OUTGOING',
            vehicle_id: assignmentData.vehicle_id,
            notes: `Vehicle assigned for delivery - goods dispatched from warehouse`,
            created_at: new Date().toISOString()
          });

        // Update consignment departure
        await supabase
          .from('consignments')
          .update({
            departure_date: new Date().toISOString(),
            status: 'IN_TRANSIT'
          })
          .eq('id', consignment.id);

        // Clear warehouse from booking
        await supabase
          .from('bookings')
          .update({ current_warehouse_id: null })
          .eq('id', assignmentData.booking_id);

        // Add timeline entry for warehouse departure
        await supabase
          .from('booking_timeline')
          .insert({
            booking_id: assignmentData.booking_id,
            action: 'DEPARTED_FROM_WAREHOUSE',
            description: `Goods departed from warehouse for vehicle assignment`,
            warehouse_id: booking.current_warehouse_id
          });
      }
    }

    // Call the RPC function (it creates timeline entry internally)
    const { data, error } = await supabase.rpc('assign_vehicle_to_booking_v2', {
      p_booking_id: assignmentData.booking_id,
      p_vehicle_type: assignmentData.vehicle_type,
      p_vehicle_id: assignmentData.vehicle_id,
      p_driver_id: assignmentData.driver_id,
      p_broker_id: assignmentData.broker_id || null
    });

    if (error) throw error;

    // ❌ REMOVE THIS - RPC already creates timeline entry
    // await supabase
    //   .from('booking_timeline')
    //   .insert({
    //     booking_id: assignmentData.booking_id,
    //     action: 'VEHICLE_ASSIGNED',
    //     description: `Vehicle ${vehicleNumber} assigned with driver ${driverName}`,
    //   });

    return data;
  } catch (error) {
    console.error('Error assigning vehicle:', error);
    throw error;
  }
};

// Unassign vehicle from booking
export const unassignVehicle = async (bookingId: string) => {
  try {
    // Call the RPC function (it creates timeline entry internally)
    const { data, error } = await supabase.rpc('unassign_vehicle_from_booking_v2', {
      p_booking_id: bookingId
    });

    if (error) throw error;

    // ❌ REMOVE THIS - RPC already creates timeline entry
    // await supabase
    //   .from('booking_timeline')
    //   .insert({
    //     booking_id: bookingId,
    //     action: 'VEHICLE_UNASSIGNED',
    //     description: `Vehicle ${vehicleNumber} unassigned from booking`,
    //   });

    return data;
  } catch (error) {
    console.error('Error unassigning vehicle:', error);
    throw error;
  }
};



// Get all drivers
export const fetchDrivers = async () => {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name')

  if (error) {
    console.error('Error fetching drivers:', error)
    throw error
  }
  return data || []
}

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

// Add vehicle location
export const addVehicleLocation = async (locationData: {
  vehicle_id: string
  latitude: number
  longitude: number
  source: 'FASTAG' | 'SIM' | 'GPS'
}) => {
  const { data, error } = await supabase
    .from('vehicle_locations')
    .insert([locationData])
    .select()
    .single()

  if (error) {
    console.error('Error adding vehicle location:', error)
    throw error
  }
  return data
}

// Upload vehicle document
export const uploadVehicleDocument = async (documentData: {
  vehicle_id: string
  document_type: 'RC' | 'DL' | 'INSURANCE' | 'PERMIT' | 'AGREEMENT' | 'OTHER'
  file_name: string
  file_url?: string
  expiry_date?: string
}) => {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .insert([documentData])
    .select()
    .single()

  if (error) {
    console.error('Error uploading document:', error)
    throw error
  }
  return data
}

// Verify vehicle document
export const verifyVehicleDocument = async (documentId: string) => {
  const { data, error } = await supabase
    .from('vehicle_documents')
    .update({ is_verified: true })
    .eq('id', documentId)
    .select()
    .single()

  if (error) {
    console.error('Error verifying document:', error)
    throw error
  }
  return data
}
// Combined function to get all available vehicles (owned + hired)
export const fetchAvailableVehicles = async () => {
  try {
    // Fetch both owned and hired vehicles in parallel
    const [ownedVehicles, hiredVehicles] = await Promise.all([
      fetchAvailableOwnedVehicles(),
      fetchAvailableHiredVehicles()
    ]);

    // Combine both arrays and add is_owned flag
    const combinedVehicles = [
      ...ownedVehicles.map(v => ({ ...v, is_owned: true })),
      ...hiredVehicles.map(v => ({ ...v, is_owned: false }))
    ];

    return combinedVehicles;
  } catch (error) {
    console.error('Error fetching available vehicles:', error);
    throw error;
  }
}