export interface Warehouse {
  id: string;
  name: string;
  city: string;
  state: string;
  capacity: number;
  currentStock: number;
  manager: string;
  phone: string;
  email: string;
  address: string;
  latitude?: number;
  longitude?: number;
}

export interface Consignment {
  id: string;
  bookingId: string;
  shipper: string;
  consignee: string;
  status: "In Warehouse" | "Pending Delivery" | "Assigned Vehicle" | "In Transit" | "Delivered";
  arrivalDate: string;
  warehouseId: string;
  materialDescription: string;
  cargoUnits: number;
  assignedVehicleId?: string;
  deliveryDate?: string;
}

export interface WarehouseLog {
  id: string;
  consignmentId: string;
  warehouseId: string;
  type: "INCOMING" | "OUTGOING";
  timestamp: string;
  vehicleId?: string;
  notes?: string;
}

// Mock warehouse data
export const mockWarehouses: Warehouse[] = [
  {
    id: "W001",
    name: "Mumbai Central Hub",
    city: "Mumbai",
    state: "Maharashtra",
    capacity: 500,
    currentStock: 320,
    manager: "Rahul Mehta",
    phone: "+91-9876543220",
    email: "rahul.mehta@freightsynq.com",
    address: "Plot 15, Warehouse Complex, Andheri East, Mumbai - 400069",
    latitude: 19.1136,
    longitude: 72.8697
  },
  {
    id: "W002",
    name: "Delhi NCR Distribution Center",
    city: "Gurgaon",
    state: "Haryana",
    capacity: 750,
    currentStock: 480,
    manager: "Priya Sharma",
    phone: "+91-9876543221",
    email: "priya.sharma@freightsynq.com",
    address: "Sector 18, Industrial Area, Gurgaon - 122015",
    latitude: 28.4595,
    longitude: 77.0266
  },
  {
    id: "W003",
    name: "Bangalore Tech Park Warehouse",
    city: "Bangalore",
    state: "Karnataka",
    capacity: 400,
    currentStock: 150,
    manager: "Suresh Kumar",
    phone: "+91-9876543222",
    email: "suresh.kumar@freightsynq.com",
    address: "Electronics City Phase 1, Bangalore - 560100",
    latitude: 12.9716,
    longitude: 77.5946
  },
  {
    id: "W004",
    name: "Pune Manufacturing Hub",
    city: "Pune",
    state: "Maharashtra",
    capacity: 600,
    currentStock: 280,
    manager: "Anjali Deshmukh",
    phone: "+91-9876543223",
    email: "anjali.deshmukh@freightsynq.com",
    address: "Hinjewadi IT Park, Pune - 411057",
    latitude: 18.5204,
    longitude: 73.8567
  },
  {
    id: "W005",
    name: "Chennai Port Logistics Center",
    city: "Chennai",
    state: "Tamil Nadu",
    capacity: 800,
    currentStock: 650,
    manager: "Venkat Raman",
    phone: "+91-9876543224",
    email: "venkat.raman@freightsynq.com",
    address: "Ennore Port Area, Chennai - 600057",
    latitude: 13.0827,
    longitude: 80.2707
  },
  {
    id: "W006",
    name: "Kolkata Eastern Gateway",
    city: "Kolkata",
    state: "West Bengal",
    capacity: 350,
    currentStock: 95,
    manager: "Indira Sen",
    phone: "+91-9876543225",
    email: "indira.sen@freightsynq.com",
    address: "Salt Lake Sector V, Kolkata - 700091",
    latitude: 22.5726,
    longitude: 88.3639
  }
];

// Mock consignments data
export const mockConsignments: Consignment[] = [
  {
    id: "C001",
    bookingId: "LR-20250906-0001",
    shipper: "ABC Manufacturing Ltd",
    consignee: "XYZ Industries Pvt Ltd",
    status: "In Warehouse",
    arrivalDate: "2025-09-06T10:30:00Z",
    warehouseId: "W001",
    materialDescription: "Plastic buckets and containers",
    cargoUnits: 50
  },
  {
    id: "C002",
    bookingId: "LR-20250906-0002",
    shipper: "PQR Textiles",
    consignee: "Fashion Hub Delhi",
    status: "In Warehouse",
    arrivalDate: "2025-09-04T14:20:00Z",
    warehouseId: "W002",
    materialDescription: "Cotton fabric rolls",
    cargoUnits: 25
  },
  {
    id: "C003",
    bookingId: "LR-20250906-0005",
    shipper: "Steel Works Ltd",
    consignee: "Construction Co",
    status: "In Warehouse",
    arrivalDate: "2025-09-05T09:15:00Z",
    warehouseId: "W005",
    materialDescription: "Steel bars and rods",
    cargoUnits: 200
  },
  {
    id: "C004",
    bookingId: "LR-20250906-0006",
    shipper: "Pharma Distribution",
    consignee: "Medical Stores Chain",
    status: "Assigned Vehicle",
    arrivalDate: "2025-09-03T16:45:00Z",
    warehouseId: "W001",
    materialDescription: "Pharmaceutical products",
    cargoUnits: 30,
    assignedVehicleId: "V003"
  },
  {
    id: "C005",
    bookingId: "LR-20250906-0008",
    shipper: "Electronics Suppliers",
    consignee: "Retail Chain",
    status: "In Warehouse",
    arrivalDate: "2025-09-02T11:00:00Z",
    warehouseId: "W003",
    materialDescription: "Consumer electronics",
    cargoUnits: 75
  },
  {
    id: "C006",
    bookingId: "LR-20250906-0009",
    shipper: "Agricultural Supplies",
    consignee: "Farmers Cooperative",
    status: "Pending Delivery",
    arrivalDate: "2025-09-07T08:30:00Z",
    warehouseId: "W004",
    materialDescription: "Seeds and fertilizers",
    cargoUnits: 120
  }
];

// Mock warehouse logs
export const mockWarehouseLogs: WarehouseLog[] = [
  {
    id: "WL001",
    consignmentId: "C001",
    warehouseId: "W001",
    type: "INCOMING",
    timestamp: "2025-09-06T10:30:00Z",
    vehicleId: "V001",
    notes: "Consignment received in good condition"
  },
  {
    id: "WL002",
    consignmentId: "C002",
    warehouseId: "W002",
    type: "INCOMING",
    timestamp: "2025-09-04T14:20:00Z",
    vehicleId: "V002",
    notes: "Fabric rolls stored in climate-controlled area"
  },
  {
    id: "WL003",
    consignmentId: "C007",
    warehouseId: "W001",
    type: "OUTGOING",
    timestamp: "2025-09-08T15:45:00Z",
    vehicleId: "V004",
    notes: "Dispatched for final delivery"
  }
];

// Helper functions
export const calculateAging = (arrivalDate: string): number => {
  const arrival = new Date(arrivalDate);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - arrival.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const getStockUtilization = (currentStock: number, capacity: number): number => {
  return (currentStock / capacity) * 100;
};

export const getWarehouseById = (id: string): Warehouse | undefined => {
  return mockWarehouses.find(warehouse => warehouse.id === id);
};

export const getConsignmentsByWarehouse = (warehouseId: string): Consignment[] => {
  return mockConsignments.filter(consignment => 
    consignment.warehouseId === warehouseId && consignment.status === "In Warehouse"
  );
};

export const getWarehouseLogs = (warehouseId: string, type?: "INCOMING" | "OUTGOING"): WarehouseLog[] => {
  return mockWarehouseLogs.filter(log => {
    if (log.warehouseId !== warehouseId) return false;
    if (type && log.type !== type) return false;
    return true;
  });
};

// Status color helpers
export const getStatusColor = (status: string) => {
  switch (status) {
    case "In Warehouse":
      return "bg-info text-info-foreground";
    case "Assigned Vehicle":
      return "bg-warning text-warning-foreground";
    case "Pending Delivery":
      return "bg-muted text-muted-foreground";
    case "In Transit":
      return "bg-primary text-primary-foreground";
    case "Delivered":
      return "bg-success text-success-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
};

export const getAgingColor = (days: number) => {
  if (days <= 1) return "text-success";
  if (days <= 3) return "text-warning";
  return "text-destructive";
};

export const getCapacityColor = (utilization: number) => {
  if (utilization <= 60) return "text-success";
  if (utilization <= 85) return "text-warning";
  return "text-destructive";
};