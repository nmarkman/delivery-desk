import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { useEffect } from "react";
import { initTabVisibilityHandler, cleanupTabVisibilityHandler } from "@/utils/tabVisibilityHandler";

// Enable debug logging for troubleshooting
const DEBUG_APP = true;

function logAppEvent(event: string, details?: unknown) {
  if (DEBUG_APP) {
    const timestamp = new Date().toISOString();
    console.log(`[App ${timestamp}] ${event}`, details || '');
  }
}
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

logAppEvent('QUERY_CLIENT_INITIALIZED', {
  staleTime: 60 * 60 * 1000,
  cacheTime: 2 * 60 * 60 * 1000,
  refetchOnWindowFocus: false,
  refetchOnMount: false
});

const App = () => {
  useEffect(() => {
    logAppEvent('APP_MOUNT', {
      timestamp: Date.now(),
      url: window.location.href,
      userAgent: navigator.userAgent
    });
    
    // Initialize tab visibility handler on mount
    initTabVisibilityHandler();
    logAppEvent('TAB_VISIBILITY_HANDLER_INITIALIZED');
    
    // Add route change listener
    const handleRouteChange = () => {
      logAppEvent('ROUTE_CHANGE', {
        url: window.location.href,
        pathname: window.location.pathname,
        hash: window.location.hash
      });
    };
    
    window.addEventListener('popstate', handleRouteChange);
    
    // Cleanup on unmount
    return () => {
      logAppEvent('APP_UNMOUNT');
      cleanupTabVisibilityHandler();
      window.removeEventListener('popstate', handleRouteChange);
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
