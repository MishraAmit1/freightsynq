import api from '../../api/axios';

export interface BookingPayload {
  consignorName: string;
  consigneeName: string;
  fromLocation: string;
  toLocation: string;
  cargoUnits: number;
  materialDescription: string;
  serviceType: 'FTL' | 'PTL';
  pickupDate?: string;
  invoiceNumber?: string;
  status: 'DRAFT' | 'CONFIRMED';
}

export interface BookingResponse {
  id: string;
  bookingId: string;
  status: 'DRAFT' | 'CONFIRMED';
  createdAt: string;
}

export interface LocationResponse {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
}

export const createBooking = (payload: BookingPayload) => 
  api.post<BookingResponse>('/api/v1/bookings', payload);

export const patchBooking = (id: string, payload: Partial<BookingPayload>) => 
  api.patch<BookingResponse>(`/api/v1/bookings/${id}`, payload);

export const confirmBooking = (id: string) => 
  api.post<BookingResponse>(`/api/v1/bookings/${id}/confirm`);

export const getBooking = (id: string) => 
  api.get<BookingResponse>(`/api/v1/bookings/${id}`);

export const searchLocations = (query: string) => 
  api.get<LocationResponse[]>('/api/v1/locations', { params: { query } });