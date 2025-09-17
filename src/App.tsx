import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { BookingList } from "@/features/bookings/BookingList";
import { BookingDetail } from "@/features/bookings/BookingDetail";
import { VehicleManagement } from "@/features/vehicles/VehicleManagement";
import { WarehouseList } from "@/features/warehouses/WarehouseList";
import { WarehouseDetails } from "@/features/warehouses/WarehouseDetails";
import { Dashboard } from "@/pages/Dashboard";
import NotFound from "./pages/NotFound";
import { useEffect } from "react";
import { testConnection } from "./api/test";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  // useEffect component ke andar hona chahiye
  useEffect(() => {
    testConnection()
  }, [])
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <MainLayout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/bookings" element={<BookingList />} />
              <Route path="/bookings/:id" element={<BookingDetail />} />
              <Route path="/vehicles" element={<VehicleManagement />} />
              <Route path="/warehouses" element={<WarehouseList />} />
              <Route path="/warehouses/:id" element={<WarehouseDetails />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </MainLayout>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
};

export default App;