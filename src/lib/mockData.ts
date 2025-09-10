export interface Booking {
  id: string;
  bookingId: string;
  consignorName: string;
  consigneeName: string;
  fromLocation: string;
  toLocation: string;
  cargoUnits: number;
  materialDescription: string;
  serviceType: "FTL" | "PTL";
  status: "DRAFT" | "QUOTED" | "CONFIRMED" | "DISPATCHED" | "IN_TRANSIT" | "DELIVERED" | "CANCELLED";
  bookingDateTime: string;
  pickupDate?: string;
  invoiceNumber?: string;
  assignedVehicle?: AssignedVehicle;
  shipmentStatus: "AT_WAREHOUSE" | "IN_TRANSIT" | "DELIVERED";
  currentLocation?: string;
  lrNumber?: string;
  lrDate?: string;
  broker?: BrokerInfo;
}

export interface BrokerInfo {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
}

export interface Vehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: string;
  status: "AVAILABLE" | "OCCUPIED" | "MAINTENANCE" | "INACTIVE";
  isVerified: boolean;
  isOwned: boolean;
  assignedBookingId?: string;
  broker?: BrokerInfo;
  documents: VehicleDocument[];
  addedDate: string;
}

export interface VehicleDocument {
  id: string;
  type: "RC" | "DL" | "INSURANCE" | "PERMIT" | "OTHER";
  fileName: string;
  uploadedDate: string;
  isVerified: boolean;
}

export interface AssignedVehicle {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: string;
  driver: {
    id: string;
    name: string;
    phone: string;
  };
}

export const mockBookings: Booking[] = [
  {
    id: "1",
    bookingId: "LR-20250906-0001",
    consignorName: "ABC Manufacturing Ltd",
    consigneeName: "XYZ Industries Pvt Ltd",
    fromLocation: "Vapi, Gujarat",
    toLocation: "Delhi NCR",
    cargoUnits: 50,
    materialDescription: "Plastic buckets and containers",
    serviceType: "FTL",
    status: "IN_TRANSIT",
    bookingDateTime: "2025-09-06T09:00:00Z",
    pickupDate: "2025-09-09",
    invoiceNumber: "INV-2025-001",
    assignedVehicle: {
      id: "V001",
      vehicleNumber: "GJ-05-AB-1234",
      vehicleType: "Truck - 20ft",
      capacity: "15 tons",
      driver: {
        id: "D001",
        name: "Ramesh Kumar",
        phone: "+91-9876543210"
      }
    },
    shipmentStatus: "IN_TRANSIT",
    currentLocation: "Near Ahmedabad, Gujarat",
    lrNumber: "LR1001",
    lrDate: "2025-09-09T08:30:00Z"
  },
  {
    id: "2",
    bookingId: "LR-20250906-0002",
    consignorName: "PQR Textiles",
    consigneeName: "Fashion Hub Delhi",
    fromLocation: "Surat, Gujarat",
    toLocation: "Mumbai, Maharashtra",
    cargoUnits: 25,
    materialDescription: "Cotton fabric rolls",
    serviceType: "PTL",
    status: "CONFIRMED",
    bookingDateTime: "2025-09-06T10:30:00Z",
    pickupDate: "2025-09-10",
    shipmentStatus: "AT_WAREHOUSE"
  },
  {
    id: "3",
    bookingId: "LR-20250906-0003",
    consignorName: "Tech Components Ltd",
    consigneeName: "Electronics Mart",
    fromLocation: "Pune, Maharashtra",
    toLocation: "Bangalore, Karnataka",
    cargoUnits: 100,
    materialDescription: "Electronic components and parts",
    serviceType: "FTL",
    status: "DISPATCHED",
    bookingDateTime: "2025-09-06T11:15:00Z",
    pickupDate: "2025-09-08",
    assignedVehicle: {
      id: "V002",
      vehicleNumber: "MH-12-CD-5678",
      vehicleType: "Container - 40ft",
      capacity: "25 tons",
      driver: {
        id: "D002",
        name: "Suresh Patel",
        phone: "+91-9876543211"
      }
    },
    shipmentStatus: "IN_TRANSIT",
    currentLocation: "Near Satara, Maharashtra",
    lrNumber: "LR1002",
    lrDate: "2025-09-08T07:45:00Z"
  },
  {
    id: "4",
    bookingId: "LR-20250906-0004",
    consignorName: "Agricultural Supplies Co",
    consigneeName: "Farmers Cooperative",
    fromLocation: "Rajkot, Gujarat",
    toLocation: "Indore, Madhya Pradesh",
    cargoUnits: 75,
    materialDescription: "Seeds and fertilizers",
    serviceType: "FTL",
    status: "DELIVERED",
    bookingDateTime: "2025-09-05T14:20:00Z",
    pickupDate: "2025-09-06",
    assignedVehicle: {
      id: "V003",
      vehicleNumber: "GJ-01-EF-9012",
      vehicleType: "Truck - 16ft",
      capacity: "12 tons",
      driver: {
        id: "D003",
        name: "Mohan Singh",
        phone: "+91-9876543212"
      }
    },
    shipmentStatus: "DELIVERED",
    currentLocation: "Indore, Madhya Pradesh"
  },
  {
    id: "5",
    bookingId: "LR-20250906-0005",
    consignorName: "Steel Works Ltd",
    consigneeName: "Construction Co",
    fromLocation: "Chennai, Tamil Nadu",
    toLocation: "Hyderabad, Telangana",
    cargoUnits: 200,
    materialDescription: "Steel bars and rods",
    serviceType: "FTL",
    status: "QUOTED",
    bookingDateTime: "2025-09-06T15:45:00Z",
    pickupDate: "2025-09-12",
    shipmentStatus: "AT_WAREHOUSE"
  },
  {
    id: "6", 
    bookingId: "LR-20250906-0006",
    consignorName: "Pharma Distribution",
    consigneeName: "Medical Stores Chain",
    fromLocation: "Ahmedabad, Gujarat",
    toLocation: "Kolkata, West Bengal",
    cargoUnits: 30,
    materialDescription: "Pharmaceutical products",
    serviceType: "PTL",
    status: "DRAFT",
    bookingDateTime: "2025-09-06T16:00:00Z",
    shipmentStatus: "AT_WAREHOUSE"
  },
  {
    id: "7",
    bookingId: "LR-20250906-0007",
    consignorName: "Auto Parts Manufacturing",
    consigneeName: "Vehicle Assembly Plant",
    fromLocation: "Aurangabad, Maharashtra",
    toLocation: "Chennai, Tamil Nadu",
    cargoUnits: 150,
    materialDescription: "Automotive components",
    serviceType: "FTL",
    status: "CANCELLED",
    bookingDateTime: "2025-09-05T12:30:00Z",
    pickupDate: "2025-09-07",
    shipmentStatus: "AT_WAREHOUSE"
  }
];

export interface VehicleOption {
  id: string;
  vehicleNumber: string;
  vehicleType: string;
  capacity: string;
  status: string;
}

export interface DriverOption {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
}

// Mock Brokers Data
export const mockBrokers: BrokerInfo[] = [
  {
    id: "B001",
    name: "Gujarat Transport Co.",
    contactPerson: "Ravi Patel",
    phone: "+91-9876543216",
    email: "ravi@gujarattransport.com"
  },
  {
    id: "B002", 
    name: "Maharashtra Logistics",
    contactPerson: "Suresh Deshmukh",
    phone: "+91-9876543217",
    email: "suresh@mahalogistics.com"
  },
  {
    id: "B003",
    name: "Karnataka Freight Services",
    contactPerson: "Venkat Rao",
    phone: "+91-9876543218", 
    email: "venkat@karnatakafreight.com"
  }
];

// Mock Vehicles Data (Enhanced)
export const mockVehicles: Vehicle[] = [
  {
    id: "V001",
    vehicleNumber: "GJ-05-AB-1234",
    vehicleType: "Truck - 20ft",
    capacity: "15 tons",
    status: "OCCUPIED",
    isVerified: true,
    isOwned: true,
    assignedBookingId: "1",
    documents: [
      { id: "D1", type: "RC", fileName: "RC_GJ05AB1234.pdf", uploadedDate: "2024-01-15", isVerified: true },
      { id: "D2", type: "DL", fileName: "DL_Driver1.pdf", uploadedDate: "2024-01-15", isVerified: true }
    ],
    addedDate: "2024-01-15"
  },
  {
    id: "V002",
    vehicleNumber: "MH-12-CD-5678",
    vehicleType: "Container - 40ft",
    capacity: "25 tons",
    status: "OCCUPIED",
    isVerified: true,
    isOwned: true,
    assignedBookingId: "3",
    documents: [
      { id: "D3", type: "RC", fileName: "RC_MH12CD5678.pdf", uploadedDate: "2024-01-20", isVerified: true },
      { id: "D4", type: "DL", fileName: "DL_Driver2.pdf", uploadedDate: "2024-01-20", isVerified: true }
    ],
    addedDate: "2024-01-20"
  },
  {
    id: "V003",
    vehicleNumber: "GJ-01-EF-9012",
    vehicleType: "Truck - 16ft",
    capacity: "12 tons",
    status: "AVAILABLE",
    isVerified: true,
    isOwned: true,
    documents: [
      { id: "D5", type: "RC", fileName: "RC_GJ01EF9012.pdf", uploadedDate: "2024-01-25", isVerified: true },
      { id: "D6", type: "DL", fileName: "DL_Driver3.pdf", uploadedDate: "2024-01-25", isVerified: true }
    ],
    addedDate: "2024-01-25"
  },
  {
    id: "V004",
    vehicleNumber: "GJ-06-GH-3456",
    vehicleType: "Truck - 20ft",
    capacity: "15 tons",
    status: "AVAILABLE",
    isVerified: true,
    isOwned: true,
    documents: [
      { id: "D7", type: "RC", fileName: "RC_GJ06GH3456.pdf", uploadedDate: "2024-02-01", isVerified: true },
      { id: "D8", type: "DL", fileName: "DL_Driver4.pdf", uploadedDate: "2024-02-01", isVerified: true }
    ],
    addedDate: "2024-02-01"
  },
  {
    id: "V005", 
    vehicleNumber: "MH-14-IJ-7890",
    vehicleType: "Container - 40ft",
    capacity: "25 tons",
    status: "AVAILABLE",
    isVerified: false,
    isOwned: false,
    broker: mockBrokers[0],
    documents: [
      { id: "D9", type: "RC", fileName: "RC_MH14IJ7890.pdf", uploadedDate: "2024-02-05", isVerified: false }
    ],
    addedDate: "2024-02-05"
  },
  {
    id: "V006",
    vehicleNumber: "KA-03-KL-2345",
    vehicleType: "Truck - 16ft", 
    capacity: "12 tons",
    status: "MAINTENANCE",
    isVerified: true,
    isOwned: true,
    documents: [
      { id: "D10", type: "RC", fileName: "RC_KA03KL2345.pdf", uploadedDate: "2024-02-10", isVerified: true },
      { id: "D11", type: "DL", fileName: "DL_Driver6.pdf", uploadedDate: "2024-02-10", isVerified: true }
    ],
    addedDate: "2024-02-10"
  }
];

export const mockDrivers: DriverOption[] = [
  {
    id: "D004",
    name: "Rajesh Sharma",
    phone: "+91-9876543213",
    licenseNumber: "DL-1234567890"
  },
  {
    id: "D005",
    name: "Vikram Yadav", 
    phone: "+91-9876543214",
    licenseNumber: "DL-0987654321"
  },
  {
    id: "D006",
    name: "Ankit Gupta",
    phone: "+91-9876543215", 
    licenseNumber: "DL-1122334455"
  }
];

// Helper function to get next booking ID
export const getNextBookingId = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const sequence = String(mockBookings.length + 1).padStart(4, '0');
  return `BKG-${year}${month}${day}-${sequence}`;
};

// Helper function to get next LR number
export const getNextLRNumber = () => {
  const existingLRs = mockBookings.filter(b => b.lrNumber).length;
  return `LR${String(existingLRs + 1001).padStart(4, '0')}`;
};