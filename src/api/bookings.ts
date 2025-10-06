import { supabase } from '@/lib/supabase'
export interface BookingData {
  id: string
  booking_id: string
  consignor_name: string
  consignee_name: string
  from_location: string
  to_location: string
  cargo_units?: string
  material_description?: string
  service_type: 'FTL' | 'PTL'
  status: string
  pickup_date?: string
  lr_number?: string
  lr_date?: string
  bilti_number?: string;
  invoice_number?: string;
  created_at: string
  current_warehouse?: {
    id?: string
    name: string
    city: string
  }
  vehicle_assignments?: Array<{
    status: string
    vehicle: {
      vehicle_number: string
      vehicle_type: string
      capacity: string
    }
    driver: {
      name: string
      phone: string
    }
    broker?: {
      name: string
      contact_person?: string
      phone?: string
    }
  }>
}

export const fetchBookings = async (): Promise<BookingData[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      consignor:parties!consignor_id(id, name, city, state),
      consignee:parties!consignee_id(id, name, city, state),
      current_warehouse:warehouses(id, name, city),
      vehicle_assignments!left(
        id,
        status,
        vehicle_type,
        owned_vehicle_id,
        hired_vehicle_id,
        owned_vehicle:owned_vehicles!owned_vehicle_id(
          vehicle_number,
          vehicle_type,
          capacity
        ),
        hired_vehicle:hired_vehicles!hired_vehicle_id(
          vehicle_number,
          vehicle_type,
          capacity
        ),
        driver:drivers(name, phone),
        broker:brokers(name, contact_person, phone)
      )
    `)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching bookings:', error);
    throw error;
  }

  const transformedData = (data || []).map(booking => {
    // Find only ACTIVE assignments
    const activeAssignment = (booking.vehicle_assignments || []).find(va => va.status === 'ACTIVE');

    let vehicle = null;
    let broker = undefined;

    if (activeAssignment) {
      vehicle = activeAssignment.vehicle_type === 'OWNED'
        ? activeAssignment.owned_vehicle
        : activeAssignment.hired_vehicle;

      broker = activeAssignment.broker;
    }

    return {
      ...booking,
      consignor_name: booking.consignor?.name || 'Unknown',
      consignee_name: booking.consignee?.name || 'Unknown',
      current_warehouse: booking.current_warehouse ? {
        id: booking.current_warehouse.id,
        name: booking.current_warehouse.name,
        city: booking.current_warehouse.city,
      } : undefined,
      vehicle_assignments: activeAssignment && vehicle ? [{
        ...activeAssignment,
        vehicle: {
          vehicle_number: vehicle.vehicle_number,
          vehicle_type: vehicle.vehicle_type,
          capacity: vehicle.capacity
        },
        driver: activeAssignment.driver,
        broker: broker
      }] : []
    };
  });

  return transformedData;
};

export const createBooking = async (bookingData: {
  consignor_id: string
  consignee_id: string
  from_location: string
  to_location: string
  service_type: 'FTL' | 'PTL'
  pickup_date?: string
  material_description: string;
  cargo_units: string;
}) => {
  // Get current user ID
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User not authenticated');
  }

  const today = new Date()
  const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '')
  const timeStr = Date.now().toString().slice(-4)
  const booking_id = `BKG-${dateStr}-${timeStr}`

  const { data, error } = await supabase
    .from('bookings')
    .insert([{
      ...bookingData,
      booking_id,
      status: 'DRAFT',
      created_by: user.id // ADD THIS LINE
    }])
    .select()
    .single()

  if (error) {
    console.error('Error creating booking:', error)
    throw error
  }

  return data
}

export const updateBookingStatus = async (bookingId: string, status: string) => {
  try {
    console.log(`🔍 Starting status update for booking ${bookingId} to ${status}`);

    // Get current booking data
    const { data: currentBooking, error: fetchError } = await supabase
      .from('bookings')
      .select('status, current_warehouse_id')
      .eq('id', bookingId)
      .single();

    if (fetchError) throw fetchError;

    const wasDelivered = currentBooking.status === 'DELIVERED';
    const isBecomingDelivered = status === 'DELIVERED';

    // Case 1: Changing TO DELIVERED (clear everything)
    if (isBecomingDelivered && !wasDelivered) {
      console.log(`📦 Booking ${bookingId} being marked as DELIVERED - Starting cleanup`);

      // Get current active vehicle assignment
      const { data: activeAssignment } = await supabase
        .from('vehicle_assignments')
        .select(`
  id,
  vehicle_type,
  owned_vehicle_id,
  hired_vehicle_id,
  status
`)
        .eq('booking_id', bookingId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      // Clear vehicle assignment
      if (activeAssignment) {
        // Update vehicle status to AVAILABLE
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

        // Mark assignment as completed
        await supabase
          .from('vehicle_assignments')
          .update({
            status: 'COMPLETED',
            released_at: new Date().toISOString()
          })
          .eq('id', activeAssignment.id);

        // Add timeline
        await supabase
          .from('booking_timeline')
          .insert({
            booking_id: bookingId,
            action: 'VEHICLE_UNASSIGNED',
            description: 'Vehicle automatically unassigned - booking delivered'
          });
      }

      // Clear warehouse
      if (currentBooking.current_warehouse_id) {
        const { data: consignment } = await supabase
          .from('consignments')
          .update({
            departure_date: new Date().toISOString(),
            status: 'DELIVERED'
          })
          .eq('booking_id', bookingId)
          .eq('warehouse_id', currentBooking.current_warehouse_id)
          .is('departure_date', null)
          .select('id, warehouse_id')
          .maybeSingle();

        if (consignment) {
          await supabase
            .from('warehouse_logs')
            .insert({
              consignment_id: consignment.id,
              warehouse_id: consignment.warehouse_id,
              type: 'OUTGOING',
              notes: 'Goods delivered - booking completed',
              created_at: new Date().toISOString()
            });

          await supabase.rpc('update_warehouse_stock', {
            warehouse_id: consignment.warehouse_id,
            stock_change: -1
          });
        }

        // Clear warehouse from booking
        await supabase
          .from('bookings')
          .update({ current_warehouse_id: null })
          .eq('id', bookingId);
      }

      // Update status
      await supabase
        .from('bookings')
        .update({ status: 'DELIVERED' })
        .eq('id', bookingId);

      console.log('✅ Booking delivered - assignments cleared');
    }

    // Case 2: Changing FROM DELIVERED to something else (restore last assignments)
    else if (wasDelivered && !isBecomingDelivered) {
      console.log(`🔄 Restoring booking ${bookingId} from DELIVERED to ${status}`);

      // **FIX: Check timeline to see what was the last action before DELIVERED**
      const { data: lastActions } = await supabase
        .from('booking_timeline')
        .select('action, warehouse_id, created_at')
        .eq('booking_id', bookingId)
        .in('action', ['VEHICLE_ASSIGNED', 'ARRIVED_AT_WAREHOUSE', 'DEPARTED_FROM_WAREHOUSE'])
        .order('created_at', { ascending: false })
        .limit(5); // Get last 5 actions to analyze

      console.log('🔍 Last actions:', lastActions);

      // Determine what to restore based on timeline
      let shouldRestoreVehicle = false;
      let shouldRestoreWarehouse = false;
      let warehouseToRestore = null;

      if (lastActions && lastActions.length > 0) {
        // Check the most recent non-unassignment action
        for (const action of lastActions) {
          if (action.action === 'VEHICLE_ASSIGNED') {
            shouldRestoreVehicle = true;
            console.log('🚚 Last action was vehicle assignment - will restore vehicle');
            break;
          } else if (action.action === 'ARRIVED_AT_WAREHOUSE') {
            shouldRestoreWarehouse = true;
            warehouseToRestore = action.warehouse_id;
            console.log('🏭 Last action was warehouse assignment - will restore warehouse');
            break;
          }
        }
      }

      // Restore based on what was determined
      if (shouldRestoreVehicle) {
        // Get last completed vehicle assignment
        const { data: lastAssignment } = await supabase
          .from('vehicle_assignments')
          .select(`
            *,
            driver:drivers(*),
            broker:brokers(*)
          `)
          .eq('booking_id', bookingId)
          .eq('status', 'COMPLETED')
          .order('released_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastAssignment) {
          // Create new active assignment
          const { data: newAssignment } = await supabase
            .from('vehicle_assignments')
            .insert([{
              booking_id: bookingId,
              driver_id: lastAssignment.driver_id,
              broker_id: lastAssignment.broker_id,
              vehicle_type: lastAssignment.vehicle_type,
              owned_vehicle_id: lastAssignment.owned_vehicle_id,
              hired_vehicle_id: lastAssignment.hired_vehicle_id,
              assigned_at: new Date().toISOString(),
              status: 'ACTIVE'
            }])
            .select()
            .single();

          if (newAssignment) {
            // Update vehicle status to OCCUPIED
            if (lastAssignment.vehicle_type === 'OWNED') {
              await supabase
                .from('owned_vehicles')
                .update({ status: 'OCCUPIED' })
                .eq('id', lastAssignment.owned_vehicle_id);
            } else {
              await supabase
                .from('hired_vehicles')
                .update({ status: 'OCCUPIED' })
                .eq('id', lastAssignment.hired_vehicle_id);
            }

            // Add timeline
            await supabase
              .from('booking_timeline')
              .insert({
                booking_id: bookingId,
                action: 'VEHICLE_ASSIGNED',
                description: 'Vehicle restored - booking status changed from DELIVERED'
              });

            console.log('✅ Vehicle assignment restored');
          }
        }
      } else if (shouldRestoreWarehouse && warehouseToRestore) {
        // Restore warehouse
        await supabase
          .from('bookings')
          .update({ current_warehouse_id: warehouseToRestore })
          .eq('id', bookingId);

        // Create new consignment
        const timestamp = Date.now().toString().slice(-6);
        const consignment_id = `CNS-${timestamp}`;

        const { data: newConsignment } = await supabase
          .from('consignments')
          .insert([{
            consignment_id,
            booking_id: bookingId,
            warehouse_id: warehouseToRestore,
            status: 'IN_WAREHOUSE',
            arrival_date: new Date().toISOString()
          }])
          .select()
          .single();

        if (newConsignment) {
          await supabase
            .from('warehouse_logs')
            .insert({
              consignment_id: newConsignment.id,
              warehouse_id: warehouseToRestore,
              type: 'INCOMING',
              notes: 'Goods restored to warehouse - booking status changed from DELIVERED',
              created_at: new Date().toISOString()
            });

          await supabase.rpc('update_warehouse_stock', {
            warehouse_id: warehouseToRestore,
            stock_change: 1
          });

          console.log('✅ Warehouse restored');
        }
      } else {
        console.log('ℹ️ No specific assignment to restore - checking fallbacks');

        // Fallback: Try to restore the most recent thing
        const { data: lastConsignment } = await supabase
          .from('consignments')
          .select('warehouse_id')
          .eq('booking_id', bookingId)
          .eq('status', 'DELIVERED')
          .order('departure_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastConsignment?.warehouse_id) {
          await supabase
            .from('bookings')
            .update({ current_warehouse_id: lastConsignment.warehouse_id })
            .eq('id', bookingId);
          console.log('✅ Fallback: Warehouse restored');
        }
      }

      // Update status
      await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);

      console.log('✅ Booking restored from DELIVERED');
    }

    // Case 3: Normal status change (not involving DELIVERED)
    else {
      console.log(`📊 Normal status update to ${status}`);
      await supabase
        .from('bookings')
        .update({ status })
        .eq('id', bookingId);
    }

    return { success: true };

  } catch (error) {
    console.error('❌ Error in updateBookingStatus:', error);
    throw error;
  }
};
export const fetchBookingById = async (id: string) => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      current_warehouse:warehouses(id, name, city),
      vehicle_assignments!left(
        status,
        vehicle_type,
        owned_vehicle:owned_vehicles!owned_vehicle_id(
          id,
          vehicle_number,
          vehicle_type,
          capacity
        ),
        hired_vehicle:hired_vehicles!hired_vehicle_id(
          id,
          vehicle_number,
          vehicle_type,
          capacity
        ),
        driver:drivers(
          id,
          name,
          phone,
          experience
        ),
        broker:brokers(
          name,
          contact_person,
          phone
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching booking:', error)
    throw error
  }

  if (data) {
    // ✅ FIXED - Only get ACTIVE assignments (like BookingList does)
    const activeAssignment = (data.vehicle_assignments || []).find(va => va.status === 'ACTIVE');

    if (activeAssignment) {
      const vehicle = activeAssignment.vehicle_type === 'OWNED'
        ? activeAssignment.owned_vehicle
        : activeAssignment.hired_vehicle

      data.vehicle_assignments = vehicle ? [{
        ...activeAssignment,
        vehicle: {
          id: vehicle.id,
          vehicle_number: vehicle.vehicle_number,
          vehicle_type: vehicle.vehicle_type,
          capacity: vehicle.capacity
        },
        driver: activeAssignment.driver,
        broker: activeAssignment.broker
      }] : []
    } else {
      // ✅ IMPORTANT - No assignment means empty array
      data.vehicle_assignments = [];
    }
  }

  return data
}

export const updateBookingLR = async (bookingId: string, lrData: {
  lr_number?: string | null
  lr_date?: string | null
  bilti_number?: string | null
  invoice_number?: string | null
  material_description?: string | null
  cargo_units?: string | null
}) => {
  const payload = {
    lr_number: lrData.lrNumber ?? lrData.lr_number ?? null,
    lr_date: lrData.lrDate ?? lrData.lr_date ?? null,
    bilti_number: lrData.biltiNumber ?? lrData.bilti_number ?? null,
    invoice_number: lrData.invoiceNumber ?? lrData.invoice_number ?? null,
    material_description: lrData.materialDescription ?? lrData.material_description ?? null,
    cargo_units: lrData.cargoUnitsString ?? lrData.cargo_units ?? null,
  };

  const { data, error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', bookingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating booking LR:', error)
    throw error
  }

  return data
}

export const generateLRNumber = async () => {
  const { data, error } = await supabase
    .from('bookings')
    .select('lr_number')
    .not('lr_number', 'is', null)
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('Error fetching latest LR:', error)
    return `LR${String(Date.now()).slice(-4)}`
  }

  if (data && data.length > 0) {
    const lastLR = data[0].lr_number
    const lastNumber = parseInt(lastLR.replace('LR', '')) || 1000
    return `LR${String(lastNumber + 1).padStart(4, '0')}`
  }

  return 'LR1001'
}

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

export const updateBooking = async (bookingId: string, bookingData: {
  consignor_id?: string | null
  consignee_id?: string | null
  from_location?: string | null
  to_location?: string | null
  service_type?: 'FTL' | 'PTL' | null
  pickup_date?: string | null
}) => {
  // Convert empty strings to null for DB to accept
  const payload = {
    consignor_id: bookingData.consignor_id === '' ? null : bookingData.consignor_id,
    consignee_id: bookingData.consignee_id === '' ? null : bookingData.consignee_id,
    from_location: bookingData.from_location === '' ? null : bookingData.from_location,
    to_location: bookingData.to_location === '' ? null : bookingData.to_location,
    service_type: bookingData.service_type,
    pickup_date: bookingData.pickup_date === '' ? null : bookingData.pickup_date,
  };

  const { data, error } = await supabase
    .from('bookings')
    .update(payload)
    .eq('id', bookingId)
    .select()
    .single()

  if (error) {
    console.error('Error updating booking:', error)
    throw error
  }

  return data
}
export const deleteBooking = async (bookingId: string) => {
  const { data: assignments, error: assignmentsError } = await supabase
    .from('vehicle_assignments')
    .select('id')
    .eq('booking_id', bookingId)
    .eq('status', 'ACTIVE');

  if (assignmentsError) {
    console.error('Error checking active assignments:', assignmentsError);
    throw new Error('Failed to check active assignments.');
  }

  if (assignments && assignments.length > 0) {
    throw new Error('Cannot delete booking with active vehicle assignments');
  }

  const { data: booking, error: bookingError } = await supabase
    .from('bookings')
    .select('current_warehouse_id')
    .eq('id', bookingId)
    .single();

  if (bookingError) {
    console.error('Error checking booking warehouse:', bookingError);
    throw new Error('Failed to check booking warehouse status.');
  }

  if (booking?.current_warehouse_id) {
    throw new Error('Cannot delete booking currently in warehouse');
  }

  // 🔥 First, get all consignments for this booking
  const { data: consignments, error: getConsignmentsError } = await supabase
    .from('consignments')
    .select('id')
    .eq('booking_id', bookingId);

  if (getConsignmentsError) {
    console.error('Error fetching consignments:', getConsignmentsError);
    throw new Error('Failed to fetch consignments.');
  }

  // 🔥 Delete warehouse logs for all consignments
  if (consignments && consignments.length > 0) {
    const consignmentIds = consignments.map(c => c.id);

    const { error: deleteWarehouseLogsError } = await supabase
      .from('warehouse_logs')
      .delete()
      .in('consignment_id', consignmentIds);

    if (deleteWarehouseLogsError) {
      console.error('Error deleting warehouse logs:', deleteWarehouseLogsError);
      throw new Error('Failed to delete warehouse logs.');
    }
  }

  // 🔥 Now delete consignments
  const { error: deleteConsignmentsError } = await supabase
    .from('consignments')
    .delete()
    .eq('booking_id', bookingId);

  if (deleteConsignmentsError) {
    console.error('Error deleting associated consignments:', deleteConsignmentsError);
    throw new Error('Failed to delete associated consignments.');
  }

  // 🔥 Delete associated vehicle assignments
  const { error: deleteVehicleAssignmentsError } = await supabase
    .from('vehicle_assignments')
    .delete()
    .eq('booking_id', bookingId);

  if (deleteVehicleAssignmentsError) {
    console.error('Error deleting associated vehicle assignments:', deleteVehicleAssignmentsError);
    throw new Error('Failed to delete associated vehicle assignments.');
  }

  // 🔥 Delete associated booking timeline entries
  const { error: deleteTimelineError } = await supabase
    .from('booking_timeline')
    .delete()
    .eq('booking_id', bookingId);

  if (deleteTimelineError) {
    console.error('Error deleting associated timeline entries:', deleteTimelineError);
    throw new Error('Failed to delete associated timeline entries.');
  }

  // Finally, delete the booking
  const { error } = await supabase
    .from('bookings')
    .delete()
    .eq('id', bookingId)

  if (error) {
    console.error('Error deleting booking:', error)
    throw error
  }

  return true
}
export const fetchBookingTimeline = async (bookingId: string) => {
  const { data, error } = await supabase
    .from('booking_timeline')
    .select(`
      *,
      warehouse:warehouses(name, city)
    `)
    .eq('booking_id', bookingId)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching booking timeline:', error);
    throw error;
  }

  return data || [];
};