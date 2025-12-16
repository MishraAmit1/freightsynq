import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminRoute, ProtectedRoute } from "@/components/ProtectedRoute";
import { FreeAccessRoute } from "@/components/FreeAccessRoute"; // ✅ NEW
import { SuperAdminRoute } from "@/components/SuperAdminRoute";
import { MainLayout } from "@/components/layout/MainLayout";
import { SuperAdminLayout } from "@/components/layout/SuperAdminLayout";
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
import { SuperAdminDashboard } from "./pages/super-admin/SuperAdminDashboard";
import { ManageCompanies } from "./pages/super-admin/ManageCompanies";
import { SystemStats } from "./pages/super-admin/SystemStats";
import { Tracking } from "./pages/Tracking";
import { ForgotPassword } from "./pages/ForgotPassword";
import { ResetPassword } from "./pages/ResetPassword";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// ✅ Router Component
const AppRouter = () => {
  const { isSuperAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  // ✅ SUPER ADMIN ROUTES
  if (isSuperAdmin) {
    return (
      <Routes>
        <Route path="/login" element={<Navigate to="/super-admin" replace />} />
        <Route path="/" element={<Navigate to="/super-admin" replace />} />

        {/* Super Admin Protected Routes */}
        <Route
          path="/super-admin/*"
          element={
            <SuperAdminRoute>
              <SuperAdminLayout>
                <Routes>
                  <Route path="/" element={<SuperAdminDashboard />} />
                  <Route path="/companies" element={<ManageCompanies />} />
                  <Route path="/stats" element={<SystemStats />} />
                </Routes>
              </SuperAdminLayout>
            </SuperAdminRoute>
          }
        />

        {/* Redirect all other routes to super admin dashboard */}
        <Route path="*" element={<Navigate to="/super-admin" replace />} />
      </Routes>
    );
  }

  // ✅ REGULAR USER ROUTES (FREE + FULL)
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/employee-signup" element={<EmployeeSignup />} />
      <Route path="/verification-pending" element={<VerificationPending />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Block super-admin routes for regular users */}
      <Route path="/super-admin/*" element={<Navigate to="/" replace />} />

      {/* Protected Routes */}
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <SetupChecker>
              <MainLayout>
                <Routes>
                  {/* ✅ FREE + FULL Access Routes (Everyone) */}
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/tracking" element={<Tracking />} />

                  {/* ✅ FULL Access ONLY Routes */}
                  <Route
                    path="/form"
                    element={
                      <FreeAccessRoute>
                        <AddPartyForm />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/bookings"
                    element={
                      <FreeAccessRoute>
                        <BookingList />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/bookings/:id"
                    element={
                      <FreeAccessRoute>
                        <BookingDetail />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/vehicles"
                    element={
                      <FreeAccessRoute>
                        <VehicleManagement />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/brokers"
                    element={
                      <FreeAccessRoute>
                        <Broker />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/drivers"
                    element={
                      <FreeAccessRoute>
                        <Drivers />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/customers"
                    element={
                      <FreeAccessRoute>
                        <Customers />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/lr-template-settings"
                    element={
                      <FreeAccessRoute>
                        <LRTemplateSettings />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/warehouses"
                    element={
                      <FreeAccessRoute>
                        <WarehouseList />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/warehouses/:id"
                    element={
                      <FreeAccessRoute>
                        <WarehouseDetails />
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/branches"
                    element={
                      <FreeAccessRoute>
                        <BranchManagement />
                      </FreeAccessRoute>
                    }
                  />

                  {/* ✅ ADMIN + FULL Access Routes */}
                  <Route
                    path="/company-settings"
                    element={
                      <FreeAccessRoute>
                        <AdminRoute>
                          <CompanySettings />
                        </AdminRoute>
                      </FreeAccessRoute>
                    }
                  />
                  <Route
                    path="/company-profile"
                    element={
                      <FreeAccessRoute>
                        <AdminRoute>
                          <CompanyProfile />
                        </AdminRoute>
                      </FreeAccessRoute>
                    }
                  />

                  <Route path="*" element={<NotFound />} />
                </Routes>
              </MainLayout>
            </SetupChecker>
          </ProtectedRoute>
        }
      />
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
