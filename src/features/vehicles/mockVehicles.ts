import { Vehicle } from './vehicles.api';

export const mockVehicles: Vehicle[] = [
  {
    id: "v_1",
    regNumber: "GJ05AB1234",
    type: "32ft Truck",
    capacity: "32 Tons",
    status: "AVAILABLE",
    verified: true,
    driver: {
      id: "d_1",
      name: "Ravi Kumar",
      phone: "+91 98765 43210",
      licenseNumber: "GJ0520220001234",
      experience: "8 years"
    },
    lastLocation: {
      lat: 23.0225,
      lng: 72.5714,
      lastUpdated: new Date().toISOString(),
      source: "FASTAG"
    }
  },
  {
    id: "v_2",
    regNumber: "MH12CD5678",
    type: "20ft Container",
    capacity: "25 Tons",
    status: "AVAILABLE",
    verified: true,
    driver: {
      id: "d_2",
      name: "Amit Singh",
      phone: "+91 98765 43211",
      licenseNumber: "MH1220220001235",
      experience: "12 years"
    },
    lastLocation: {
      lat: 19.0760,
      lng: 72.8777,
      lastUpdated: new Date().toISOString(),
      source: "GPS"
    }
  },
  {
    id: "v_3",
    regNumber: "KA03EF9012",
    type: "40ft Trailer",
    capacity: "40 Tons",
    status: "ASSIGNED",
    verified: true,
    driver: {
      id: "d_3",
      name: "Suresh Patel",
      phone: "+91 98765 43212",
      licenseNumber: "KA0320220001236",
      experience: "5 years"
    },
    lastLocation: {
      lat: 12.9716,
      lng: 77.5946,
      lastUpdated: new Date().toISOString(),
      source: "SIM"
    }
  },
  {
    id: "v_4",
    regNumber: "TN09GH3456",
    type: "14ft Truck",
    capacity: "10 Tons",
    status: "MAINTENANCE",
    verified: true,
    driver: {
      id: "d_4",
      name: "Rajesh Sharma",
      phone: "+91 98765 43213",
      licenseNumber: "TN0920220001237",
      experience: "6 years"
    }
  },
  {
    id: "v_5",
    regNumber: "DL08IJ7890",
    type: "24ft Truck",
    capacity: "20 Tons",
    status: "AVAILABLE",
    verified: false,
    driver: {
      id: "d_5",
      name: "Vijay Gupta",
      phone: "+91 98765 43214",
      licenseNumber: "DL0820220001238",
      experience: "3 years"
    },
    lastLocation: {
      lat: 28.7041,
      lng: 77.1025,
      lastUpdated: new Date().toISOString(),
      source: "GPS"
    }
  }
];