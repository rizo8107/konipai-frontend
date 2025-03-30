import { useState, useEffect, Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme/theme-provider";

// Lazy load all pages for better performance
const DashboardPage = lazy(() => import("./pages/admin/DashboardPage"));
const OrdersPage = lazy(() => import("./pages/admin/OrdersPage"));
const CustomersPage = lazy(() => import("./pages/admin/CustomersPage"));
const ProductsPage = lazy(() => import("./pages/admin/ProductsPage"));
const PaymentsPage = lazy(() => import("./pages/admin/PaymentsPage"));
const SettingsPage = lazy(() => import("./pages/admin/SettingsPage"));
const WhatsAppActivitiesPage = lazy(() => import("./pages/admin/WhatsAppActivitiesPage"));
const WhatsAppTemplatesPage = lazy(() => import("./pages/admin/WhatsAppTemplatesPage"));
const EmailActivitiesPage = lazy(() => import("./pages/admin/EmailActivitiesPage"));
const EmailTemplatesPage = lazy(() => import("./pages/admin/EmailTemplatesPage"));
const LoginPage = lazy(() => import("./pages/LoginPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const EmailTest = lazy(() => import("./components/email/EmailTest"));

// Fallback loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen w-full">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// Initialize app
const initializeApp = () => {
  // Log important configuration
  console.log(`Initializing Konipai CRM v${import.meta.env.VITE_APP_VERSION || '1.0.0'}`);
  console.log(`Environment: ${import.meta.env.MODE}`);
  
  if (import.meta.env.VITE_POCKETBASE_URL) {
    console.log(`PocketBase URL: ${import.meta.env.VITE_POCKETBASE_URL}`);
  } else {
    console.warn("PocketBase URL not found in configuration, using default");
  }
  
  // Log API configuration
  console.log(`API URL: ${import.meta.env.VITE_API_URL}`);
  console.log(`Email API URL: ${import.meta.env.VITE_EMAIL_API_URL}`);
  console.log(`WhatsApp API URL: ${import.meta.env.VITE_WHATSAPP_API_URL}`);
  
  // API timeout settings
  if (import.meta.env.VITE_API_TIMEOUT) {
    console.log(`API Timeout: ${import.meta.env.VITE_API_TIMEOUT}ms`);
  }
};

// Configure React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

const App = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  
  useEffect(() => {
    try {
      initializeApp();
      setIsInitialized(true);
    } catch (error) {
      console.error("Failed to initialize app:", error);
      // Still set initialized to avoid infinite loading
      setIsInitialized(true);
    }
  }, []);
  
  if (!isInitialized) {
    return <PageLoader />;
  }
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="dark" storageKey="konipai-theme">
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                {/* Public routes */}
                <Route path="/" element={<Navigate to="/login" />} />
                <Route path="/login" element={<LoginPage />} />
                
                {/* Admin routes */}
                <Route path="/admin" element={<DashboardPage />} />
                <Route path="/admin/orders" element={<OrdersPage />} />
                <Route path="/admin/customers" element={<CustomersPage />} />
                <Route path="/admin/products" element={<ProductsPage />} />
                <Route path="/admin/payments" element={<PaymentsPage />} />
                <Route path="/admin/settings" element={<SettingsPage />} />
                <Route path="/admin/whatsapp" element={<WhatsAppActivitiesPage />} />
                <Route path="/admin/whatsapp-templates" element={<WhatsAppTemplatesPage />} />
                <Route path="/admin/email" element={<EmailActivitiesPage />} />
                <Route path="/admin/email-templates" element={<EmailTemplatesPage />} />
                
                {/* Test routes */}
                <Route path="/test/email" element={
                  <div className="container mx-auto py-8">
                    <h1 className="text-2xl font-bold mb-6">Email Service Test</h1>
                    <EmailTest />
                  </div>
                } />
                
                {/* Catch-all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
