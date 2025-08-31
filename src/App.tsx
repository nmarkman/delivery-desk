import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ActSync from "./pages/ActSync";
import Invoices from "./pages/Invoices";
import InvoiceGenerator from "./pages/InvoiceGenerator";
import DeliverablesReport from "./pages/DeliverablesReport";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
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

export default App;
