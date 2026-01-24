import { calculateETAFromDistance, getRouteDistance } from '@/lib/distance-calculator'
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
  eway_bill_details?: any[]
  created_at: string
  estimated_arrival?: string
  remarks?: string;
  route_distance_km?: number
  last_tracked_at?: string;
actual_delivery?: string;
  updated_at?: string; 
  // 🆕 NEW: Dynamic ETA Fields
  dynamic_eta?: string
  current_speed?: number
  distance_covered?: number
  distance_remaining?: number
  eta_last_updated_at?: string
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

// ✅ ADD THIS NEW INTERFACE
export interface CompanyBranch {
  id: string;
  company_id: string;
  branch_name: string;
  branch_code: string;
  city?: string;
  address?: string;
  status: 'ACTIVE' | 'INACTIVE';
  is_default: boolean;
  created_at: string;
}

export const fetchBookings = async (): Promise<BookingData[]> => {
  const { data, error } = await supabase
    .from('bookings')
    .select(`
      *,
      consignor:parties!consignor_id(id, name, city, state),
      consignee:parties!consignee_id(id, name, city, state),
      branch:company_branches(id, branch_name, branch_code, city),
      current_warehouse:warehouses(id, name, city),
      vehicle_assignments!left(
        id,
        status,
        vehicle_type,
        owned_vehicle_id,
        hired_vehicle_id,
        last_toll_crossed,
        last_toll_time,
        tracking_start_time,
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
      branch_name: booking.branch?.branch_name || '',
      branch_code: booking.branch?.branch_code || '',
      branch_city: booking.branch?.city || '',
      eway_bill_details: booking.eway_bill_details || [],
      material_description: booking.material_description || '',
      cargo_units: booking.cargo_units || '',

      // 🆕 NEW: Dynamic ETA Fields
      dynamic_eta: booking.dynamic_eta,
      current_speed: booking.current_speed,
      distance_covered: booking.distance_covered,
      distance_remaining: booking.distance_remaining,
      eta_last_updated_at: booking.eta_last_updated_at,

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
        broker: broker,
      }] : []
    };
  });

  return transformedData;
};

// ✅ UPDATED - Now requires branch_id
// ✅ UPDATED createBooking with FREE distance calculation
export const createBooking = async (bookingData: {
  consignor_id: string;
  consignee_id: string;
  from_location: string;
  to_location: string;
  service_type: 'FTL' | 'PTL';
  pickup_date?: string;
  material_description: string;
  cargo_units: string;
  bilti_number?: string | null;
  invoice_number?: string | null;
  eway_bill_details?: any[];
  branch_id: string;
}) => {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get user's company_id
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.company_id) {
      throw new Error('User company not found');
    }

    console.log('🎫 Generating booking ID for branch:', bookingData.branch_id);

    // Generate booking ID
    const { data: bookingId, error: idError } = await supabase
      .rpc('generate_booking_id_new', {
        p_company_id: userProfile.company_id,
        p_branch_id: bookingData.branch_id
      });

    if (idError) {
      console.error('❌ Error generating booking ID:', idError);
      throw idError;
    }

    console.log('✅ Generated booking ID:', bookingId);

    // ═══════════════════════════════════════════════════════════
    // ✅ NEW: Calculate REAL distance using FREE APIs
    // ═══════════════════════════════════════════════════════════

    console.log('📍 Calculating route distance...');

    const routeResult = await getRouteDistance(
      bookingData.from_location,
      bookingData.to_location
    );

    console.log('📊 Distance result:', routeResult);

    // Calculate ETA based on actual distance
    const estimatedArrival = calculateETAFromDistance(
      routeResult.distance,
      bookingData.pickup_date
    );

    console.log('⏰ Estimated arrival:', estimatedArrival.toISOString());

    // ═══════════════════════════════════════════════════════════

    // Create booking with distance and ETA
    const { data, error } = await supabase
      .from('bookings')
      .insert([{
        booking_id: bookingId,
        company_id: userProfile.company_id,
        branch_id: bookingData.branch_id,
        consignor_id: bookingData.consignor_id,
        consignee_id: bookingData.consignee_id,
        from_location: bookingData.from_location,
        to_location: bookingData.to_location,
        service_type: bookingData.service_type,
        pickup_date: bookingData.pickup_date,
        material_description: bookingData.material_description,
        cargo_units: bookingData.cargo_units,
        bilti_number: bookingData.bilti_number || null,
        invoice_number: bookingData.invoice_number || null,
        eway_bill_details: bookingData.eway_bill_details || [],
        route_distance_km: routeResult.distance,        // ✅ NEW: Save distance
        estimated_arrival: estimatedArrival.toISOString(), // ✅ NEW: Save ETA
        status: 'DRAFT',
        created_by: user.id
      }])
      .select()
      .single();

    if (error) {
      console.error('❌ Error creating booking:', error);
      throw error;
    }

    console.log('✅ Booking created:', data.booking_id);
    console.log(`   📏 Distance: ${routeResult.distance} km`);
    console.log(`   ⏰ ETA: ${estimatedArrival.toISOString()}`);
    console.log(`   📡 Method: ${routeResult.method}`);

    return data;

  } catch (error: any) {
    console.error('❌ Error in createBooking:', error);
    throw error;
  }
};

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

    // Case 1: Changing TO DELIVERED (clear everything & set date)
    if (isBecomingDelivered && !wasDelivered) {
      console.log(`📦 Booking ${bookingId} being marked as DELIVERED - Starting cleanup`);

      // Get current active vehicle assignment
      const { data: activeAssignment } = await supabase
        .from('vehicle_assignments')
        .select(`id, vehicle_type, owned_vehicle_id, hired_vehicle_id, status`)
        .eq('booking_id', bookingId)
        .eq('status', 'ACTIVE')
        .maybeSingle();

      // Clear vehicle assignment
      if (activeAssignment) {
        if (activeAssignment.vehicle_type === 'OWNED') {
          await supabase.from('owned_vehicles').update({ status: 'AVAILABLE' }).eq('id', activeAssignment.owned_vehicle_id);
        } else {
          await supabase.from('hired_vehicles').update({ status: 'AVAILABLE' }).eq('id', activeAssignment.hired_vehicle_id);
        }
        await supabase.from('vehicle_assignments').update({ status: 'COMPLETED', released_at: new Date().toISOString() }).eq('id', activeAssignment.id);
        await supabase.from('booking_timeline').insert({ booking_id: bookingId, action: 'VEHICLE_UNASSIGNED', description: 'Vehicle automatically unassigned - booking delivered' });
      }

      // Clear warehouse
      if (currentBooking.current_warehouse_id) {
        const { data: consignment } = await supabase.from('consignments').update({ departure_date: new Date().toISOString(), status: 'DELIVERED' }).eq('booking_id', bookingId).eq('warehouse_id', currentBooking.current_warehouse_id).is('departure_date', null).select('id, warehouse_id').maybeSingle();
        if (consignment) {
          await supabase.from('warehouse_logs').insert({ consignment_id: consignment.id, warehouse_id: consignment.warehouse_id, type: 'OUTGOING', notes: 'Goods delivered - booking completed', created_at: new Date().toISOString() });
          await supabase.rpc('update_warehouse_stock', { warehouse_id: consignment.warehouse_id, stock_change: -1 });
        }
        await supabase.from('bookings').update({ current_warehouse_id: null }).eq('id', bookingId);
      }

      // ✅ FIX: Update actual_delivery along with status
      await supabase
        .from('bookings')
        .update({ 
          status: 'DELIVERED',
          actual_delivery: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', bookingId);

      console.log('✅ Booking delivered - assignments cleared & date set');
    }

    // Case 2: Changing FROM DELIVERED to something else (Restore Logic)
    else if (wasDelivered && !isBecomingDelivered) {
      console.log(`🔄 Restoring booking ${bookingId} from DELIVERED to ${status}`);

      // Check timeline to see what was the last action before DELIVERED
      const { data: lastActions } = await supabase
        .from('booking_timeline')
        .select('action, warehouse_id, created_at')
        .eq('booking_id', bookingId)
        .in('action', ['VEHICLE_ASSIGNED', 'ARRIVED_AT_WAREHOUSE', 'DEPARTED_FROM_WAREHOUSE'])
        .order('created_at', { ascending: false })
        .limit(5);

      let shouldRestoreVehicle = false;
      let shouldRestoreWarehouse = false;
      let warehouseToRestore = null;

      if (lastActions && lastActions.length > 0) {
        for (const action of lastActions) {
          if (action.action === 'VEHICLE_ASSIGNED') {
            shouldRestoreVehicle = true;
            break;
          } else if (action.action === 'ARRIVED_AT_WAREHOUSE') {
            shouldRestoreWarehouse = true;
            warehouseToRestore = action.warehouse_id;
            break;
          }
        }
      }

      if (shouldRestoreVehicle) {
        const { data: lastAssignment } = await supabase
          .from('vehicle_assignments')
          .select(`*, driver:drivers(*), broker:brokers(*)`)
          .eq('booking_id', bookingId)
          .eq('status', 'COMPLETED')
          .order('released_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (lastAssignment) {
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
            if (lastAssignment.vehicle_type === 'OWNED') {
              await supabase.from('owned_vehicles').update({ status: 'OCCUPIED' }).eq('id', lastAssignment.owned_vehicle_id);
            } else {
              await supabase.from('hired_vehicles').update({ status: 'OCCUPIED' }).eq('id', lastAssignment.hired_vehicle_id);
            }
            await supabase.from('booking_timeline').insert({ booking_id: bookingId, action: 'VEHICLE_ASSIGNED', description: 'Vehicle restored - booking status changed from DELIVERED' });
          }
        }
      } else if (shouldRestoreWarehouse && warehouseToRestore) {
        await supabase.from('bookings').update({ current_warehouse_id: warehouseToRestore }).eq('id', bookingId);
        const consignment_id = `CNS-${Date.now().toString().slice(-6)}`;
        const { data: newConsignment } = await supabase
          .from('consignments')
          .insert([{ consignment_id, booking_id: bookingId, warehouse_id: warehouseToRestore, status: 'IN_WAREHOUSE', arrival_date: new Date().toISOString() }])
          .select().single();

        if (newConsignment) {
          await supabase.from('warehouse_logs').insert({ consignment_id: newConsignment.id, warehouse_id: warehouseToRestore, type: 'INCOMING', notes: 'Goods restored to warehouse - booking status changed from DELIVERED', created_at: new Date().toISOString() });
          await supabase.rpc('update_warehouse_stock', { warehouse_id: warehouseToRestore, stock_change: 1 });
        }
      } else {
        // Fallback restoration
        const { data: lastConsignment } = await supabase
          .from('consignments')
          .select('warehouse_id')
          .eq('booking_id', bookingId)
          .eq('status', 'DELIVERED')
          .order('departure_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        if (lastConsignment?.warehouse_id) {
          await supabase.from('bookings').update({ current_warehouse_id: lastConsignment.warehouse_id }).eq('id', bookingId);
        }
      }

      // ✅ FIX: Reset actual_delivery when reverting
      await supabase
        .from('bookings')
        .update({ 
          status,
          actual_delivery: null 
        })
        .eq('id', bookingId);

      console.log('✅ Booking restored from DELIVERED');
    }

    // Case 3: Normal status change
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
      branch:company_branches(
        id,
        branch_name,
        branch_code,
        city
      ),
      consignor:parties!bookings_consignor_id_fkey(
        id,
        name,
        contact_person,
        phone,
        email,
        address_line1,
        city,
        state,
        pincode,
        gst_number,
        pan_number
      ),
      consignee:parties!bookings_consignee_id_fkey(
        id,
        name,
        contact_person,
        phone,
        email,
        address_line1,
        city,
        state,
        pincode,
        gst_number,
        pan_number
      ),
      vehicle_assignments!left(
        id,
        status,
        vehicle_type,
        created_at,
        last_toll_crossed,
        last_toll_time,
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
          experience,
          license_number
        ),
        broker:brokers(
          id,
          name,
          contact_person,
          phone,
          email,
          city
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
    const activeAssignment = (data.vehicle_assignments || []).find(va => va.status === 'ACTIVE');

    if (activeAssignment) {
      const vehicle = activeAssignment.vehicle_type === 'OWNED'
        ? activeAssignment.owned_vehicle
        : activeAssignment.hired_vehicle

      data.vehicle_assignments = vehicle ? [{
        ...activeAssignment,
        id: activeAssignment.id,
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
      data.vehicle_assignments = [];
    }

    data.consignor_name = data.consignor?.name || 'Unknown Consignor';
    data.consignee_name = data.consignee?.name || 'Unknown Consignee';
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
  eway_bill_details?: any[]
}) => {
  const payload = {
    lr_number: lrData.lrNumber ?? lrData.lr_number ?? null,
    lr_date: lrData.lrDate ?? lrData.lr_date ?? null,
    bilti_number: lrData.biltiNumber ?? lrData.bilti_number ?? null,
    invoice_number: lrData.invoiceNumber ?? lrData.invoice_number ?? null,
    material_description: lrData.materialDescription ?? lrData.material_description ?? null,
    cargo_units: lrData.cargoUnitsString ?? lrData.cargo_units ?? null,
    eway_bill_details: lrData.ewayBillDetails ?? lrData.eway_bill_details ?? []
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

// export const generateLRNumber = async () => {
//   const { data, error } = await supabase
//     .from('bookings')
//     .select('lr_number')
//     .not('lr_number', 'is', null)
//     .order('created_at', { ascending: false })
//     .limit(1)

//   if (error) {
//     console.error('Error fetching latest LR:', error)
//     return `LR${String(Date.now()).slice(-4)}`
//   }

//   if (data && data.length > 0) {
//     const lastLR = data[0].lr_number
//     const lastNumber = parseInt(lastLR.replace('LR', '')) || 1000
//     return `LR${String(lastNumber + 1).padStart(4, '0')}`
//   }

//   return 'LR1001'
// }

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
   branch_id?: string | null      // ✅ Already there
  lr_city_id?: string | null    
}) => {
  // Convert empty strings to null for DB to accept
  const payload = {
    consignor_id: bookingData.consignor_id === '' ? null : bookingData.consignor_id,
    consignee_id: bookingData.consignee_id === '' ? null : bookingData.consignee_id,
    from_location: bookingData.from_location === '' ? null : bookingData.from_location,
    to_location: bookingData.to_location === '' ? null : bookingData.to_location,
    service_type: bookingData.service_type,
    pickup_date: bookingData.pickup_date === '' ? null : bookingData.pickup_date,
     branch_id: bookingData.branch_id === '' ? null : bookingData.branch_id,           // ✅ ADD
    lr_city_id: bookingData.lr_city_id === '' ? null : bookingData.lr_city_id,
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

// ============================================
// ✅ BRANCH MANAGEMENT FUNCTIONS (NEW)
// ============================================

/**
 * Fetch all branches for current company
 */
export const fetchCompanyBranches = async (): Promise<CompanyBranch[]> => {
  try {
    const { data, error } = await supabase
      .from('company_branches')
      .select('*')
      .eq('status', 'ACTIVE')
      .order('branch_code');

    if (error) {
      console.error('Error fetching branches:', error);
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error in fetchCompanyBranches:', error);
    throw error;
  }
};

/**
 * Get default branch (usually "A")
 */
export const getDefaultBranch = async (): Promise<CompanyBranch | null> => {
  try {
    const { data, error } = await supabase
      .from('company_branches')
      .select('*')
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching default branch:', error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error in getDefaultBranch:', error);
    return null;
  }
};

/**
 * Create new branch
 */
export const createBranch = async (branchData: {
  branch_name: string;
  city?: string;
  address?: string;
}): Promise<CompanyBranch> => {
  try {
    // Get current branches to determine next code
    const branches = await fetchCompanyBranches();

    // Generate next branch code (A, B, C, D...)
    const nextCode = String.fromCharCode(65 + branches.length);

    // Get current user's company_id
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (!userProfile?.company_id) {
      throw new Error('User company not found');
    }

    // Create branch
    const { data, error } = await supabase
      .from('company_branches')
      .insert([{
        branch_name: branchData.branch_name,
        branch_code: nextCode,
        city: branchData.city || null,
        address: branchData.address || null,
        status: 'ACTIVE',
        is_default: branches.length === 0 // First branch = default
      }])
      .select()
      .single();

    if (error) {
      console.error('Error creating branch:', error);
      throw error;
    }

    // Create counter for new branch
    await supabase
      .from('booking_counters')
      .insert([{
        company_id: userProfile.company_id,
        branch_id: data.id,
        current_number: 0
      }]);

    console.log('✅ Branch created:', data.branch_code, '-', data.branch_name);

    return data;
  } catch (error) {
    console.error('Error in createBranch:', error);
    throw error;
  }
};