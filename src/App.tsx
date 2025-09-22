import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AdminRoute, ProtectedRoute } from "@/components/ProtectedRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { BookingList } from "@/features/bookings/BookingList";
import { BookingDetail } from "@/features/bookings/BookingDetail";
import { VehicleManagement } from "@/features/vehicles/VehicleManagement";
import { WarehouseList } from "@/features/warehouses/WarehouseList";
import { WarehouseDetails } from "@/features/warehouses/WarehouseDetails";
import { Dashboard } from "@/pages/Dashboard";
import { Login } from "@/pages/Login";
import { Signup } from "@/pages/Signup";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { testConnection } from "./api/test";
import Broker from "./pages/Broker";
import { Customers } from "./pages/Customers";
import { CompanySettings } from "./pages/CompanySettings";
import { EmployeeSignup } from "./pages/EmployeeSignup";
import { Profile } from "./components/Profile";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  useEffect(() => {
    testConnection()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/employee-signup" element={<EmployeeSignup />} />
              {/* Protected Routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <MainLayout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/profile" element={<Profile />} />
                      <Route path="/bookings" element={<BookingList />} />
                      <Route path="/bookings/:id" element={<BookingDetail />} />
                      <Route path="/vehicles" element={<VehicleManagement />} />
                      <Route path="/brokers" element={<Broker />} />
                      <Route path="/customers" element={<Customers />} />
                      <Route path="/warehouses" element={<WarehouseList />} />
                      <Route path="/warehouses/:id" element={<WarehouseDetails />} />
                      <Route path="/company-settings" element={
                        <AdminRoute>
                          <CompanySettings />
                        </AdminRoute>
                      } />
                      <Route path="*" element={<NotFound />} />

                    </Routes>
                  </MainLayout>
                </ProtectedRoute>
              } />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
};

export default App;