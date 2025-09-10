import api from '../../api/axios';

export interface Vehicle {
  id: string;
  regNumber: string;
  type: string;
  capacity: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'MAINTENANCE';
  verified: boolean;
  driver?: Driver;
  lastLocation?: Location;
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  experience: string;
}

export interface Location {
  lat: number;
  lng: number;
  lastUpdated: string;
  source: 'FASTAG' | 'SIM' | 'GPS';
}

export interface AssignmentPayload {
  vehicleId: string;
  driverId: string;
  status: 'DISPATCHED';
}

export interface AssignmentResponse {
  bookingId: string;
  status: 'DISPATCHED';
  vehicle: {
    id: string;
    regNumber: string;
    type: string;
    driver: {
      name: string;
      phone: string;
    };
  };
  location: Location;
}

export const searchVehicles = (query: string) => 
  api.get<Vehicle[]>('/api/v1/vehicles', { params: { query } });

export const getVehicles = () => 
  api.get<Vehicle[]>('/api/v1/vehicles');

export const assignVehicle = (bookingId: string, payload: AssignmentPayload) => 
  api.post<AssignmentResponse>(`/api/v1/bookings/${bookingId}/assign`, payload);

export const unassignVehicle = (bookingId: string) => 
  api.post(`/api/v1/bookings/${bookingId}/unassign`);

export const getVehicleLocation = (vehicleId: string) => 
  api.get<Location>(`/api/v1/vehicles/${vehicleId}/location`);