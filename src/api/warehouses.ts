import { supabase } from '@/lib/supabase'

// Get all warehouses
export const fetchWarehouses = async () => {
  const { data, error } = await supabase
    .from('warehouses')
    .select('*')
    .eq('status', 'ACTIVE')
    .order('name')

  if (error) {
    console.error('Error fetching warehouses:', error)
    throw error
  }
  
  return data || []
}

// Get warehouse details with consignments
export const fetchWarehouseDetails = async (warehouseId: string) => {
  const { data, error } = await supabase
    .from('warehouses')
    .select(`
      *,
      consignments(
        *,
        booking:bookings(booking_id, consignor_name, consignee_name, material_description, cargo_units)
      )
    `)
    .eq('id', warehouseId)
    .eq('consignments.status', 'IN_WAREHOUSE')
    .single()

  if (error) {
    console.error('Error fetching warehouse details:', error)
    throw error
  }
  
  return data
}

// Add new warehouse
export const createWarehouse = async (warehouseData: {
  name: string
  city: string
  state: string
  address: string
  capacity: number
  manager_name: string
  manager_phone: string
  manager_email: string
}) => {
  // Generate warehouse code
  const code = `W${String(Date.now()).slice(-3)}`

  const { data, error } = await supabase
    .from('warehouses')
    .insert([{
      ...warehouseData,
      code,
      current_stock: 0,
      status: 'ACTIVE'
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating warehouse:', error)
    throw error
  }
  
  return data
}
// Add these functions to your warehouses.ts file:

// Update consignment status
// Add this function to warehouses.ts:
export const updateBookingWarehouse = async (bookingId: string, warehouseId: string) => {
  try {
    console.log('Updating booking warehouse:', { bookingId, warehouseId });

    // If removing warehouse
    if (warehouseId === 'remove') {
      // Get current warehouse
      const { data: booking, error: getError } = await supabase
        .from('bookings')
        .select('current_warehouse_id')
        .eq('id', bookingId)
        .single();

      if (getError) throw getError;

      if (booking.current_warehouse_id) {
        // Close active consignment
        const { data: consignment, error: consignmentError } = await supabase
          .from('consignments')
          .update({
            departure_date: new Date().toISOString(),
            status: 'IN_TRANSIT'
          })
          .eq('booking_id', bookingId)
          .eq('warehouse_id', booking.current_warehouse_id)
          .is('departure_date', null)
          .select('id, warehouse_id')
          .single();

        if (consignmentError) throw consignmentError;

        // 🔥 NEW: Create OUTGOING warehouse log
        await supabase
          .from('warehouse_logs')
          .insert({
            consignment_id: consignment.id,
            warehouse_id: consignment.warehouse_id,
            type: 'OUTGOING',
            notes: 'Goods removed from warehouse - booking updated',
            created_at: new Date().toISOString()
          });

        // Add timeline entry
        await supabase
          .from('booking_timeline')
          .insert({
            booking_id: bookingId,
            action: 'DEPARTED_FROM_WAREHOUSE',
            description: 'Goods departed from warehouse',
            warehouse_id: booking.current_warehouse_id
          });

        // Update booking
        await supabase
          .from('bookings')
          .update({ current_warehouse_id: null })
          .eq('id', bookingId);
      }

      return { success: true };
    } else {
      // Assigning to warehouse
      // Update booking with warehouse
      const { data: booking, error: bookingError } = await supabase
        .from('bookings')
        .update({ current_warehouse_id: warehouseId })
        .eq('id', bookingId)
        .select('booking_id, consignor_name, consignee_name, material_description, cargo_units')
        .single();

      if (bookingError) throw bookingError;

      // Check if consignment already exists for this booking-warehouse combination
      const { data: existingConsignment, error: checkError } = await supabase
        .from('consignments')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('warehouse_id', warehouseId)
        .is('departure_date', null)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingConsignment) {
        // Generate unique consignment ID
        const timestamp = Date.now().toString().slice(-6);
        const consignment_id = `CNS-${timestamp}`;
        
        // Create consignment
        const { data: newConsignment, error: consignmentError } = await supabase
          .from('consignments')
          .insert([{
            consignment_id,
            booking_id: bookingId,
            warehouse_id: warehouseId,
            status: 'IN_WAREHOUSE',
            arrival_date: new Date().toISOString()
          }])
          .select()
          .single();

        if (consignmentError) throw consignmentError;

        // 🔥 NEW: Create INCOMING warehouse log
        await supabase
          .from('warehouse_logs')
          .insert({
            consignment_id: newConsignment.id,
            warehouse_id: warehouseId,
            type: 'INCOMING',
            notes: `Goods received from booking ${booking.booking_id} - ${booking.consignor_name} to ${booking.consignee_name}`,
            created_at: new Date().toISOString()
          });

        // Add timeline entry
        await supabase
          .from('booking_timeline')
          .insert({
            booking_id: bookingId,
            action: 'ARRIVED_AT_WAREHOUSE',
            description: 'Goods arrived at warehouse',
            warehouse_id: warehouseId
          });

        // Update warehouse stock (+1)
        await supabase.rpc('update_warehouse_stock', {
          warehouse_id: warehouseId,
          stock_change: 1
        });
      }

      return booking;
    }
  } catch (error) {
    console.error('Error in updateBookingWarehouse:', error);
    throw error;
  }
};
export const updateConsignmentStatus = async (consignmentId: string, newStatus: string, warehouseId?: string) => {
  try {
    // Update consignment status
    const { data: consignment, error: consignmentError } = await supabase
      .from('consignments')
      .update({ 
        status: newStatus,
        departure_date: newStatus === 'IN_TRANSIT' ? new Date().toISOString() : null
      })
      .eq('id', consignmentId)
      .select('warehouse_id')
      .single()

    if (consignmentError) throw consignmentError

    // Update warehouse stock if moving out of warehouse
    if (newStatus === 'IN_TRANSIT' || newStatus === 'DELIVERED') {
      const targetWarehouseId = warehouseId || consignment.warehouse_id
      
      const { error: stockError } = await supabase.rpc('update_warehouse_stock', {
        warehouse_id: targetWarehouseId,
        stock_change: -1 // Remove 1 unit from warehouse
      })

      if (stockError) {
        console.error('Stock update error:', stockError);
        // Don't throw error, just log it
      }
    }

    return consignment
  } catch (error) {
    console.error('Error updating consignment status:', error)
    throw error
  }
}
// Add this to warehouses.ts:

export const syncBookingConsignmentStatus = async (consignmentId: string, newStatus: string) => {
  try {
    // Get consignment with booking info
    const { data: consignment, error: getError } = await supabase
      .from('consignments')
      .select(`
        id, 
        booking_id, 
        warehouse_id,
        booking:bookings(booking_id, consignor_name, consignee_name)
      `)
      .eq('id', consignmentId)
      .single()

    if (getError) throw getError

    // Determine updates based on status
    const shouldRemoveWarehouse = newStatus === 'DELIVERED'
    const shouldUpdateStock = (newStatus === 'IN_TRANSIT' || newStatus === 'DELIVERED')

    // Update consignment
    const { error: consignmentError } = await supabase
      .from('consignments')
      .update({ 
        status: newStatus,
        departure_date: shouldUpdateStock ? new Date().toISOString() : null
      })
      .eq('id', consignmentId)

    if (consignmentError) throw consignmentError

    // 🔥 NEW: Create OUTGOING warehouse log when goods leave
    if (shouldUpdateStock) {
      await supabase
        .from('warehouse_logs')
        .insert({
          consignment_id: consignmentId,
          warehouse_id: consignment.warehouse_id,
          type: 'OUTGOING',
          notes: `Goods dispatched - status changed to ${newStatus} for booking ${consignment.booking?.booking_id}`,
          created_at: new Date().toISOString()
        });
    }

    // Update booking
    const bookingUpdate: any = { status: newStatus }
    if (shouldRemoveWarehouse) {
      bookingUpdate.current_warehouse_id = null
    }

    const { error: bookingError } = await supabase
      .from('bookings')
      .update(bookingUpdate)
      .eq('id', consignment.booking_id)

    if (bookingError) throw bookingError

    // Update warehouse stock
    if (shouldUpdateStock) {
      const { error: stockError } = await supabase.rpc('update_warehouse_stock', {
        warehouse_id: consignment.warehouse_id,
        stock_change: -1
      })

      if (stockError) {
        console.error('Stock update error:', stockError)
        // Don't throw - stock update failure shouldn't break the flow
      }
    }

    return { success: true }
  } catch (error) {
    console.error('Error syncing status:', error)
    throw error
  }
}
// warehouses.ts mein add karein:

export const fetchWarehouseLogs = async (warehouseId: string) => {
  const { data, error } = await supabase
    .from('warehouse_logs')
    .select(`
      *,
      consignment:consignments(
        consignment_id,
        booking:bookings(booking_id, consignor_name, consignee_name)
      ),
      performed_by:users(name, email)
    `)
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching warehouse logs:', error);
    throw error;
  }
  
  return data || [];
};
// Create consignment entry
export const createConsignment = async (consignmentData: {
  booking_id: string
  warehouse_id: string
  status?: string
}) => {
  // Generate consignment ID
  const consignment_id = `CNS-${Date.now().toString().slice(-6)}`

  const { data, error } = await supabase
    .from('consignments')
    .insert([{
      ...consignmentData,
      consignment_id,
      status: consignmentData.status || 'IN_WAREHOUSE'
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating consignment:', error)
    throw error
  }
  
  return data
}

// Update warehouse stock
export const updateWarehouseStock = async (warehouseId: string, stockChange: number) => {
  const { data, error } = await supabase.rpc('update_warehouse_stock', {
    warehouse_id: warehouseId,
    stock_change: stockChange
  })

  if (error) {
    console.error('Error updating warehouse stock:', error)
    throw error
  }
  
  return data
}