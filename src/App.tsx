import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { initTabVisibilityHandler, cleanupTabVisibilityHandler } from "@/utils/tabVisibilityHandler";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ActSync from "./pages/ActSync";
import Invoices from "./pages/Invoices";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import DeliverablesReport from "./pages/DeliverablesReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false, // Prevent refetch when window regains focus
      refetchOnReconnect: false, // Prevent refetch on network reconnect
      refetchOnMount: false, // Prevent refetch when component mounts if data exists
      staleTime: 60 * 60 * 1000, // Consider data fresh for 1 hour (increased from 5 min)
      cacheTime: 2 * 60 * 60 * 1000, // Keep data in cache for 2 hours (increased from 10 min)
      retry: 1, // Retry failed requests once
    },
  },
});

const App = () => {
  useEffect(() => {
    // Initialize tab visibility handler on mount
    initTabVisibilityHandler();
    
    // Cleanup on unmount
    return () => {
      cleanupTabVisibilityHandler();
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/act-sync" element={<ActSync />} />
              <Route path="/invoices" element={<Invoices />} />
              <Route path="/invoices/:invoiceId" element={<Invoices />} />
              <Route path="/invoice-generator" element={<InvoiceGenerator />} />
              <Route path="/deliverables" element={<DeliverablesReport />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
