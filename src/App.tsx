// src/App.tsx - UPDATED
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminRoute, ProtectedRoute } from "@/components/ProtectedRoute";
import { SuperAdminRoute } from "@/components/SuperAdminRoute"; // NEW
import { MainLayout } from "@/components/layout/MainLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout"; // NEW
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
import AddPartyForm from "./pages/AddPartyForm";
import { Profile } from "./components/Profile";
import { LRTemplateSettings } from "./pages/LRTemplateSettings";
import Drivers from "./pages/Drivers";
import { CompanyProfile } from "./pages/CompanyProfile";
import { VerificationPending } from "./pages/VerificationPending";
import { VerifyEmail } from "./pages/VerifyEmail";
import { SetupChecker } from "./components/guards/SetupChecker";
import { BranchManagement } from "./pages/branches";

// Super Admin Pages
import { SuperAdminDashboard } from "./pages/super-admin/SuperAdminDashboard"; // NEW
import { CreateInvites } from "./pages/super-admin/CreateInvites";
import { ManageCompanies } from "./pages/super-admin/ManageCompanies";
import { SystemStats } from "./pages/super-admin/SystemStats";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ✅ NEW: Router Component to handle super admin routing
const AppRouter = () => {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ✅ SUPER ADMIN ONLY ROUTES R
  if (isSuperAdmin) {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/super-admin" replace />} />
        <Route path="/" element={<Navigate to="/super-admin" replace />} />

        {/* Super Admin Protected Routes */}
        <Route path="/super-admin/*" element={
          <SuperAdminRoute>
            <SuperAdminLayout>
              <Routes>
                <Route path="/" element={<SuperAdminDashboard />} />
                <Route path="/invites" element={<CreateInvites />} />
                <Route path="/companies" element={<ManageCompanies />} />
                <Route path="/stats" element={<SystemStats />} />
              </Routes>
            </SuperAdminLayout>
          </SuperAdminRoute>
        } />

        {/* Redirect all other routes to super admin dashboard */}
        <Route path="*" element={<Navigate to="/super-admin" replace />} />
      </Routes>
    );
  }

  // ✅ REGULAR USER ROUTES
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/employee-signup" element={<EmployeeSignup />} />
      <Route path="/verification-pending" element={<VerificationPending />} />
      <Route path="/verify-email" element={<VerifyEmail />} />

      {/* Block super-admin routes for regular users */}
      <Route path="/super-admin/*" element={<Navigate to="/" replace />} />

      {/* Protected Routes */}
      <Route path="/*" element={
        <ProtectedRoute>
          <SetupChecker>
            <MainLayout>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/form" element={<AddPartyForm />} />
                <Route path="/bookings" element={<BookingList />} />
                <Route path="/bookings/:id" element={<BookingDetail />} />
                <Route path="/vehicles" element={<VehicleManagement />} />
                <Route path="/brokers" element={<Broker />} />
                <Route path="/drivers" element={<Drivers />} />
                <Route path="/customers" element={<Customers />} />
                <Route path="/lr-template-settings" element={<LRTemplateSettings />} />
                <Route path="/warehouses" element={<WarehouseList />} />
                <Route path="/warehouses/:id" element={<WarehouseDetails />} />
                <Route path="/branches" element={<BranchManagement />} />

                <Route path="/company-settings" element={
                  <AdminRoute>
                    <CompanySettings />
                  </AdminRoute>
                } />
                <Route path="/company-profile" element={
                  <AdminRoute>
                    <CompanyProfile />
                  </AdminRoute>
                } />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </MainLayout>
          </SetupChecker>
        </ProtectedRoute>
      } />
    </Routes>
  );
};

const App = () => {
  useEffect(() => {
    testConnection();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRouter />
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;