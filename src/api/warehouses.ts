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
        booking:bookings(
          id,
          booking_id,
          material_description,
          cargo_units,
          consignor:parties!consignor_id(name),
          consignee:parties!consignee_id(name)
        )
      )
    `)
    .eq('id', warehouseId)
    .eq('consignments.status', 'IN_WAREHOUSE')
    .single();

  if (error) {
    console.error('Error fetching warehouse details:', error);
    throw error;
  }

  // Transform the data to match the expected format
  if (data && data.consignments) {
    data.consignments = data.consignments.map((consignment: any) => ({
      ...consignment,
      booking: {
        ...consignment.booking,
        consignor_name: consignment.booking?.consignor?.name || 'Unknown',
        consignee_name: consignment.booking?.consignee?.name || 'Unknown'
      }
    }));
  }

  return data;
};

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
export const updateBookingWarehouse = async (bookingId: string, warehouseId: string) => {
  try {
    console.log('Updating booking warehouse:', { bookingId, warehouseId });

    // First get booking with party details
    const { data: booking, error: getError } = await supabase
      .from('bookings')
      .select(`
        *,
        consignor:parties!consignor_id(name),
        consignee:parties!consignee_id(name)
      `)
      .eq('id', bookingId)
      .single();

    if (getError) throw getError;

    // ✅ Handle REMOVE case
    if (warehouseId === 'remove') {
      // Get current warehouse ID
      const currentWarehouseId = booking.current_warehouse_id;

      if (!currentWarehouseId) {
        throw new Error('Booking is not in any warehouse');
      }

      // Find active consignment
      const { data: consignments } = await supabase
        .from('consignments')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('warehouse_id', currentWarehouseId)
        .is('departure_date', null);

      if (consignments && consignments.length > 0) {
        const consignment = consignments[0];

        // Mark consignment as departed
        await supabase
          .from('consignments')
          .update({
            departure_date: new Date().toISOString(),
            status: 'DEPARTED'  // ✅ Using valid status
          })
          .eq('id', consignment.id);

        // Create warehouse log
        await supabase
          .from('warehouse_logs')
          .insert({
            consignment_id: consignment.id,
            warehouse_id: currentWarehouseId,
            type: 'OUTGOING',
            notes: `Goods removed from warehouse - ${booking.booking_id}`,
            created_at: new Date().toISOString()
          });

        // Update warehouse stock
        await supabase.rpc('update_warehouse_stock', {
          warehouse_id: currentWarehouseId,
          stock_change: -1
        });

        // Add timeline entry
        await supabase
          .from('booking_timeline')
          .insert({
            booking_id: bookingId,
            action: 'DEPARTED_FROM_WAREHOUSE',
            description: 'Goods removed from warehouse',
            warehouse_id: currentWarehouseId
          });
      }

      // Clear warehouse from booking and reset status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          current_warehouse_id: null,
          status: 'CONFIRMED',  // ✅ Reset to confirmed when removed
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      if (updateError) throw updateError;

      return { success: true, message: 'Removed from warehouse' };

    } else {
      // ✅ Handle ADD TO WAREHOUSE case

      // Check for active vehicle assignment
      const { data: assignments, error: assignmentError } = await supabase
        .from('vehicle_assignments')
        .select(`
          id,
          vehicle_type,
          owned_vehicle_id,
          hired_vehicle_id,
          status
        `)
        .eq('booking_id', bookingId)
        .eq('status', 'ACTIVE');

      if (assignmentError) throw assignmentError;

      // If there's an active assignment, unassign it
      const activeAssignment = assignments && assignments[0];
      if (activeAssignment) {
        // Update assignment status
        await supabase
          .from('vehicle_assignments')
          .update({
            released_at: new Date().toISOString(),
            status: 'COMPLETED'
          })
          .eq('id', activeAssignment.id);

        // Update vehicle status
        if (activeAssignment.vehicle_type === 'OWNED') {
          await supabase
            .from('owned_vehicles')
            .update({ status: 'AVAILABLE' })
            .eq('id', activeAssignment.owned_vehicle_id);
        } else {
          await supabase
            .from('hired_vehicles')
            .update({ status: 'AVAILABLE' })
            .eq('id', activeAssignment.hired_vehicle_id);
        }

        // Add timeline entry for vehicle unassignment
        await supabase
          .from('booking_timeline')
          .insert({
            booking_id: bookingId,
            action: 'VEHICLE_UNASSIGNED',
            description: 'Vehicle unassigned - goods moved to warehouse'
          });
      }

      // Update booking with new warehouse and status
      await supabase
        .from('bookings')
        .update({
          current_warehouse_id: warehouseId,
          status: 'AT_WAREHOUSE',  // ✅ Set AT_WAREHOUSE status
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      // Check if consignment already exists
      const { data: existingConsignments } = await supabase
        .from('consignments')
        .select('id')
        .eq('booking_id', bookingId)
        .eq('warehouse_id', warehouseId)
        .is('departure_date', null);

      if (!existingConsignments?.length) {
        // Generate consignment ID
        const timestamp = Date.now().toString().slice(-6);
        const consignment_id = `CNS-${timestamp}`;

        // Create new consignment
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

        // Create warehouse log
        await supabase
          .from('warehouse_logs')
          .insert({
            consignment_id: newConsignment.id,
            warehouse_id: warehouseId,
            type: 'INCOMING',
            notes: `Goods received from booking ${booking.booking_id} - ${booking.consignor.name} to ${booking.consignee.name}`,
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

        // Update warehouse stock
        await supabase.rpc('update_warehouse_stock', {
          warehouse_id: warehouseId,
          stock_change: 1
        });
      }

      return { success: true, message: 'Added to warehouse' };
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
        booking:bookings(
          booking_id,
          consignor:parties!consignor_id(name),
          consignee:parties!consignee_id(name)
        )
      ),
      performed_by:users(name, email)
    `)
    .eq('warehouse_id', warehouseId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching warehouse logs:', error);
    throw error;
  }

  // Transform the data
  const transformedData = (data || []).map(log => ({
    ...log,
    consignment: {
      ...log.consignment,
      booking: {
        ...log.consignment?.booking,
        consignor_name: log.consignment?.booking?.consignor?.name || 'Unknown',
        consignee_name: log.consignment?.booking?.consignee?.name || 'Unknown'
      }
    }
  }));

  return transformedData;
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