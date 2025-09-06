import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter,
  DollarSign,
  Clock,
  CheckCircle,
  AlertTriangle,
  Eye,
  Download,
  Settings,
  Info
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, calculateOverdueStatus, extractClientShortform, generateNextInvoiceNumber, parseInvoiceNumber } from '@/utils/invoiceHelpers';
import { generateDateBasedInvoiceNumber } from '@/utils/dateBasedInvoiceNumbering';
import { parseDateSafely } from '@/utils/dateUtils';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { InvoiceTemplate, type InvoiceData, type InvoiceLineItemData, type BillingInfo } from '@/components/invoices/InvoiceTemplate';
import { PaymentStatusButton } from '@/components/invoices/PaymentStatusButton';
import BillingDetailsModal from '@/components/BillingDetailsModal';
import { useOpportunityBilling } from '@/hooks/useOpportunityBilling';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

// Helper function to format dates without timezone issues
const formatDateSafe = (dateString: string): string => {
  if (!dateString) return '';
  // Parse as local date to avoid timezone shifts
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day); // month is 0-indexed
  return date.toLocaleDateString();
};

interface InvoiceLineItem {
  id: string;
  opportunity_id: string;
  invoice_number: string | null;
  invoice_status: 'draft' | 'sent' | 'paid' | 'overdue' | null;
  description: string;
  details: string | null;
  quantity: number;
  unit_rate: number;
  line_total: number;
  billed_at: string | null;
  payment_date: string | null;
  sent_date: string | null;
  service_period_start: string | null;
  service_period_end: string | null;
  opportunities: {
    company_name: string;
    name: string;
    opportunity_billing_info: {
      organization_name: string;
      organization_address: string;
      organization_contact_name: string;
      organization_contact_email: string;
      bill_to_name: string;
      bill_to_address: string;
      bill_to_contact_name: string;
      bill_to_contact_email: string;
      payment_terms: number;
      po_number?: string;
      custom_payment_terms_text?: string;
    } | null;
  } | null;
}

interface InvoiceSummary {
  totalOutstanding: number;
  totalOverdue: number;
  totalCollected: number;
  draftCount: number;
  sentCount: number;
  overdueCount: number;
  paidCount: number;
}

export default function Invoices() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { invoiceId } = useParams();
  const { toast } = useToast();
  
  // Check for downloadPDF query parameter
  const searchParams = new URLSearchParams(window.location.search);
  const shouldDownloadPDF = searchParams.get('downloadPDF') === 'true';
  // Removed complex useInvoiceGeneration hook - using direct utility functions instead
  
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InvoiceLineItem[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    totalOutstanding: 0,
    totalOverdue: 0,
    totalCollected: 0,
    draftCount: 0,
    sentCount: 0,
    overdueCount: 0,
    paidCount: 0
  });
  const [loading_, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [selectedCompanyName, setSelectedCompanyName] = useState<string>('');

  // Billing hook for the selected opportunity
  const { 
    billingInfo, 
    saveBillingInfoAsync, 
    refetch: refetchBillingInfo,
    isLoading: billingLoading 
  } = useOpportunityBilling(selectedOpportunityId || '');

  // Helper function to check if billing info is complete
  const isBillingInfoComplete = (billingInfo: any): boolean => {
    if (!billingInfo || !Array.isArray(billingInfo) || billingInfo.length === 0) {
      return false;
    }
    const info = billingInfo[0];
    return !!(
      info.organization_name &&
      info.organization_address &&
      info.organization_contact_name &&
      info.organization_contact_email &&
      info.bill_to_name &&
      info.bill_to_address &&
      info.bill_to_contact_name &&
      info.bill_to_contact_email
    );
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  // Handle URL query parameters for pre-applied filters
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const statusParam = searchParams.get('status');
    if (statusParam && ['draft', 'sent', 'paid', 'overdue'].includes(statusParam)) {
      setStatusFilter(statusParam);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchInvoiceData();
    }
  }, [user]);

  useEffect(() => {
    applyFilters();
  }, [invoiceLineItems, searchTerm, statusFilter, clientFilter]);

  // Handle individual invoice view
  useEffect(() => {
    if (invoiceId && invoiceLineItems.length > 0) {
      const item = invoiceLineItems.find(item => item.id === invoiceId);
      if (item) {
        const invoiceData = convertToInvoiceData(item);
        if (invoiceData) {
          setSelectedInvoice(invoiceData);
          
          // If PDF download was requested, trigger it after a short delay to ensure template is rendered
          if (shouldDownloadPDF && invoiceData.invoice_number) {
            setTimeout(() => {
              const parsedInvoice = parseInvoiceNumber(invoiceData.invoice_number);
              const clientShortform = parsedInvoice?.shortform || extractClientShortform(invoiceData.billing_info.organization_name);
              
              downloadInvoicePDF(invoiceData.invoice_number, clientShortform)
                .then(() => {
                  toast({
                    title: "PDF Downloaded",
                    description: `Invoice ${invoiceData.invoice_number} has been downloaded as PDF.`
                  });
                  // Remove the query parameter from URL after successful download
                  navigate(`/invoices/${invoiceId}`, { replace: true });
                })
                .catch((error) => {
                  console.error('Error generating PDF:', error);
                  toast({
                    title: "PDF Generation Failed",
                    description: "There was an error generating the PDF. Please try again.",
                    variant: "destructive"
                  });
                  // Remove the query parameter even on error
                  navigate(`/invoices/${invoiceId}`, { replace: true });
                });
            }, 1000); // 1 second delay to ensure template is fully rendered
          }
        }
      }
    } else {
      setSelectedInvoice(null);
    }
  }, [invoiceId, invoiceLineItems, shouldDownloadPDF, toast, navigate]);

  // Scroll to top when viewing individual invoice
  useEffect(() => {
    if (invoiceId && selectedInvoice) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [invoiceId, selectedInvoice]);

  const fetchInvoiceData = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select(`
          id,
          opportunity_id,
          invoice_number,
          invoice_status,
          description,
          details,
          quantity,
          unit_rate,
          line_total,
          billed_at,
          payment_date,
          sent_date,
          service_period_start,
          service_period_end,
          opportunities (
            company_name,
            name,
            opportunity_billing_info (
              organization_name,
              organization_address,
              organization_contact_name,
              organization_contact_email,
              bill_to_name,
              bill_to_address,
              bill_to_contact_name,
              bill_to_contact_email,
              payment_terms,
              po_number,
              custom_payment_terms_text
            )
          )
        `)
        .not('billed_at', 'is', null)
        .is('act_deleted_at', null)
        .eq('user_id', user?.id)
        .order('billed_at', { ascending: true });

      if (error) throw error;

      const itemsWithNumbers = await autoGenerateInvoiceNumbers(data || []);
      const itemsWithUpdatedStatus = await updateOverdueStatuses(itemsWithNumbers);
      setInvoiceLineItems(itemsWithUpdatedStatus);
      calculateSummary(itemsWithUpdatedStatus);
    } catch (error) {
      console.error('Error fetching invoice data:', error);
      toast({
        title: "Error",
        description: "Failed to load invoice data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const autoGenerateInvoiceNumbers = async (items: InvoiceLineItem[]): Promise<InvoiceLineItem[]> => {
    const updatedItems = [...items];
    const itemsNeedingNumbers = items.filter(item => !item.invoice_number && item.opportunities?.company_name && item.billed_at);
    
    if (itemsNeedingNumbers.length === 0) {
      return updatedItems;
    }
    
    console.log(`Auto-generating date-based invoice numbers for ${itemsNeedingNumbers.length} items...`);
    
    // Group items by company name and sort by billed_at date within each group
    const itemsByCompany = itemsNeedingNumbers.reduce((acc, item) => {
      const companyName = item.opportunities!.company_name;
      if (!acc[companyName]) {
        acc[companyName] = [];
      }
      acc[companyName].push(item);
      return acc;
    }, {} as Record<string, InvoiceLineItem[]>);
    
    // Sort each company's items by billed_at date (earliest first)
    Object.keys(itemsByCompany).forEach(companyName => {
      itemsByCompany[companyName].sort((a, b) => {
        const dateA = parseDateSafely(a.billed_at || '').getTime();
        const dateB = parseDateSafely(b.billed_at || '').getTime();
        return dateA - dateB;
      });
    });
    
    // Generate date-based invoice numbers for each company
    for (const [companyName, companyItems] of Object.entries(itemsByCompany)) {
      try {
        // Get custom school code from billing info for this opportunity
        let customSchoolCode: string | undefined;
        if (companyItems.length > 0) {
          const opportunityId = companyItems[0].opportunity_id;
          if (opportunityId) {
            const { data: billingData, error: billingError } = await supabase
              .from('opportunity_billing_info')
              .select('custom_school_code')
              .eq('opportunity_id', opportunityId)
              .single();
            
            if (!billingError && billingData?.custom_school_code) {
              customSchoolCode = billingData.custom_school_code;
            }
          }
        }

        // Get the shortform for this company (with custom override if available)
        const clientShortform = extractClientShortform(companyName, customSchoolCode);
        console.log(`Processing ${companyItems.length} items for ${companyName} (${clientShortform}) with date-based numbering${customSchoolCode ? ` using custom code: ${customSchoolCode}` : ''}`);
        
        // Find existing invoice numbers for this shortform (both old and new formats)
        const { data: existingData } = await supabase
          .from('invoice_line_items')
          .select('invoice_number')
          .not('invoice_number', 'is', null)
          .like('invoice_number', `${clientShortform}-%`);
        
        const existingNumbers = existingData?.map(item => item.invoice_number).filter(Boolean) as string[] || [];
        
        // Generate and update each item using date-based numbering
        for (const item of companyItems) {
          if (!item.billed_at) {
            console.warn(`Skipping item ${item.id} - no billed_at date`);
            continue;
          }
          
          // Generate date-based invoice number
          const invoiceNumber = generateDateBasedInvoiceNumber(
            clientShortform, 
            item.billed_at,
            existingNumbers
          );
          
          // Add this number to existing list to avoid duplicates in this batch
          existingNumbers.push(invoiceNumber);
          
          try {
            const { error } = await supabase
              .from('invoice_line_items')
              .update({ invoice_number: invoiceNumber })
              .eq('id', item.id);
              
            if (!error) {
              console.log(`Generated date-based ${invoiceNumber} for ${companyName} item ${item.id} (billed: ${item.billed_at})`);
              
              // Update the item in our array
              const itemIndex = updatedItems.findIndex(ui => ui.id === item.id);
              if (itemIndex !== -1) {
                updatedItems[itemIndex] = {
                  ...updatedItems[itemIndex],
                  invoice_number: invoiceNumber
                };
              }
            } else {
              console.error('Error updating invoice number:', error);
            }
          } catch (error) {
            console.error('Error updating item:', error);
          }
        }
      } catch (error) {
        console.error(`Error processing company ${companyName}:`, error);
      }
    }
    
    return updatedItems;
  };

  const updateOverdueStatuses = async (items: InvoiceLineItem[]): Promise<InvoiceLineItem[]> => {
    const updatedItems = [...items];
    const itemsToUpdate: InvoiceLineItem[] = [];

    // Find items that should be marked as overdue
    for (const item of items) {
      if (item.invoice_status === 'sent' && !item.payment_date && item.billed_at) {
        const billingInfo = item.opportunities?.opportunity_billing_info;
        const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
        
        if (calculateOverdueStatus('sent', item.billed_at, null, paymentTerms)) {
          itemsToUpdate.push(item);
        }
      }
    }

    if (itemsToUpdate.length === 0) {
      return updatedItems;
    }

    console.log(`Updating ${itemsToUpdate.length} items to overdue status...`);

    // Update each overdue item in the database
    for (const item of itemsToUpdate) {
      try {
        const { error } = await supabase
          .from('invoice_line_items')
          .update({ invoice_status: 'overdue' })
          .eq('id', item.id);
          
        if (!error) {
          console.log(`Updated item ${item.id} to overdue status`);
          
          // Update the item in our array
          const itemIndex = updatedItems.findIndex(ui => ui.id === item.id);
          if (itemIndex !== -1) {
            updatedItems[itemIndex] = {
              ...updatedItems[itemIndex],
              invoice_status: 'overdue'
            };
          }
        } else {
          console.error('Error updating overdue status:', error);
        }
      } catch (error) {
        console.error('Error updating overdue item:', error);
      }
    }

    return updatedItems;
  };

  const calculateSummary = (items: InvoiceLineItem[]) => {
    const summary = items.reduce((acc, item) => {
      const status = item.invoice_status || 'draft';
      
      // Get payment terms from billing info
      const billingInfo = item.opportunities?.opportunity_billing_info;
      const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
      
      const isOverdue = calculateOverdueStatus(status, item.billed_at, item.payment_date, paymentTerms);
      
      // Count by status
      acc[`${status}Count` as keyof InvoiceSummary] += 1;
      
      if (isOverdue) {
        acc.overdueCount += 1;
      }

      // Outstanding balance (sent but not paid)
      if (status === 'sent' && !item.payment_date) {
        acc.totalOutstanding += item.line_total;
      }

      // Overdue balance - check both status and calculated overdue
      if (status === 'overdue' || isOverdue) {
        acc.totalOverdue += item.line_total;
      }

      // Collected balance (paid invoices)
      if (status === 'paid' && item.payment_date) {
        acc.totalCollected += item.line_total;
      }

      return acc;
    }, {
      totalOutstanding: 0,
      totalOverdue: 0,
      totalCollected: 0,
      draftCount: 0,
      sentCount: 0,
      overdueCount: 0,
      paidCount: 0
    });

    setSummary(summary);
  };

  const applyFilters = () => {
    let filtered = invoiceLineItems;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(item => 
        item.opportunities?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(item => {
          const status = item.invoice_status || 'draft';
          // Check if already marked as overdue in database
          if (status === 'overdue') {
            return true;
          }
          // Or check if it should be calculated as overdue
          const billingInfo = item.opportunities?.opportunity_billing_info;
          const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
          return calculateOverdueStatus(status, item.billed_at, item.payment_date, paymentTerms);
        });
      } else {
        filtered = filtered.filter(item => item.invoice_status === statusFilter);
      }
    }

    // Client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter(item => 
        item.opportunities?.company_name === clientFilter
      );
    }

    setFilteredItems(filtered);
  };

  const getStatusBadge = (item: InvoiceLineItem) => {
    const status = item.invoice_status || 'draft';
    const billingInfo = item.opportunities?.opportunity_billing_info;
    const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
    const isOverdue = calculateOverdueStatus(status, item.billed_at, item.payment_date, paymentTerms);
    
    if (isOverdue) {
      return <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold border-red-700 animate-pulse">Overdue</Badge>;
    }

    const variants = {
      draft: <Badge variant="secondary" className="bg-gray-200 text-gray-700">Draft</Badge>,
      sent: <Badge variant="default" className="bg-blue-600 hover:bg-blue-700 text-white">Sent</Badge>,
      paid: <Badge variant="default" className="bg-green-600 hover:bg-green-700 text-white">Paid</Badge>,
      overdue: <Badge variant="destructive" className="bg-red-600 hover:bg-red-700 text-white font-semibold border-red-700">Overdue</Badge>
    };
    
    return variants[status] || variants.draft;
  };

  const convertToInvoiceData = (item: InvoiceLineItem): InvoiceData | null => {
    if (!item.opportunities?.opportunity_billing_info || !Array.isArray(item.opportunities.opportunity_billing_info) || item.opportunities.opportunity_billing_info.length === 0) return null;

    const billingInfo = item.opportunities.opportunity_billing_info[0];
    
    return {
      invoice_number: item.invoice_number || 'DRAFT',
      invoice_date: item.billed_at || new Date().toISOString().split('T')[0],
      due_date: item.billed_at ? 
        new Date(new Date(item.billed_at).getTime() + (billingInfo?.payment_terms || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
        new Date().toISOString().split('T')[0],
      status: (item.invoice_status as any) || 'draft',
      billing_info: {
        organization_name: billingInfo?.organization_name || '',
        organization_address: billingInfo?.organization_address || '',
        organization_contact_name: billingInfo?.organization_contact_name || '',
        organization_contact_email: billingInfo?.organization_contact_email || '',
        bill_to_name: billingInfo?.bill_to_name || item.opportunities?.company_name || '',
        bill_to_address: billingInfo?.bill_to_address || '',
        bill_to_contact_name: billingInfo?.bill_to_contact_name || '',
        bill_to_contact_email: billingInfo?.bill_to_contact_email || '',
        payment_terms: billingInfo?.payment_terms || 30,
        po_number: billingInfo?.po_number || '',
        custom_payment_terms_text: billingInfo?.custom_payment_terms_text || ''
      },
      line_items: [{
        id: item.id,
        description: item.description,
        details: item.details || undefined,
        quantity: item.quantity,
        unit_rate: item.unit_rate,
        line_total: item.line_total,
        service_period_start: item.service_period_start || undefined,
        service_period_end: item.service_period_end || undefined
      }],
      subtotal: item.line_total,
      tax_amount: 0,
      total_amount: item.line_total,
      company_name: item.opportunities?.company_name,
      opportunity_name: item.opportunities?.name
    };
  };

  const viewInvoice = (item: InvoiceLineItem) => {
    // Navigate to individual invoice route
    navigate(`/invoices/${item.id}`);
  };

  const handleDownloadPDF = async (item: InvoiceLineItem) => {
    if (!item.invoice_number) {
      toast({
        title: "Cannot Download PDF",
        description: "This invoice needs an invoice number first. Please mark it as sent to generate a number.",
        variant: "destructive"
      });
      return;
    }

    // For invoices in the list, navigate to the individual invoice view and trigger PDF download
    // This ensures the template is properly rendered before PDF generation
    navigate(`/invoices/${item.id}?downloadPDF=true`);
  };

  const handleConfigureBilling = (item: InvoiceLineItem) => {
    setSelectedOpportunityId(item.opportunity_id);
    setSelectedCompanyName(item.opportunities?.company_name || '');
    setBillingModalOpen(true);
  };

  const uniqueClients = Array.from(
    new Set(invoiceLineItems.map(item => item.opportunities?.company_name).filter(Boolean))
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  // If viewing individual invoice, show invoice detail view
  if (invoiceId && selectedInvoice) {
    return (
      <Layout>
        <div className="space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <Button 
                variant="outline" 
                onClick={() => navigate('/invoices')}
                className="mb-4"
              >
                ← Back to Invoices
              </Button>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-foreground">
                  Invoice {selectedInvoice.invoice_number}
                </h1>
                {(() => {
                  const currentItem = invoiceLineItems.find(item => item.id === invoiceId);
                  return currentItem ? getStatusBadge(currentItem) : null;
                })()}
              </div>
              <p className="text-muted-foreground mb-2">
                {selectedInvoice.billing_info.organization_name} • {formatCurrency((() => {
                  const currentItem = invoiceLineItems.find(item => item.id === invoiceId);
                  return currentItem?.line_total || 0;
                })())}
              </p>
              {(() => {
                const currentItem = invoiceLineItems.find(item => item.id === invoiceId);
                if (currentItem?.billed_at) {
                  return (
                    <p className="text-sm text-muted-foreground">
                      Billed: {formatDateSafe(currentItem.billed_at)}
                      {currentItem.payment_date && ` • Paid: ${formatDateSafe(currentItem.payment_date)}`}
                    </p>
                  );
                }
                return null;
              })()}
            </div>
            <div className="flex items-center gap-2">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={() => {
                  const currentItem = invoiceLineItems.find(item => item.id === invoiceId);
                  if (currentItem) {
                    handleDownloadPDF(currentItem);
                  }
                }}
              >
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
              {(() => {
                const currentItem = invoiceLineItems.find(item => item.id === invoiceId);
                return currentItem ? (
                  <PaymentStatusButton 
                    invoiceId={currentItem.id}
                    currentStatus={currentItem.invoice_status}
                    invoiceNumber={currentItem.invoice_number || 'DRAFT'}
                    onStatusChange={() => fetchInvoiceData()}
                  />
                ) : null;
              })()}
            </div>
          </div>
          
          <Card className={(() => {
            const currentItem = invoiceLineItems.find(item => item.id === invoiceId);
            if (currentItem) {
              const billingInfo = currentItem.opportunities?.opportunity_billing_info;
              const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
              const isOverdue = calculateOverdueStatus(currentItem.invoice_status, currentItem.billed_at, currentItem.payment_date, paymentTerms);
              return isOverdue ? 'border-red-200 bg-red-50/50' : '';
            }
            return '';
          })()}>
            <CardContent className="p-6">
              <InvoiceTemplate invoice={selectedInvoice} showDownloadButton={false} />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <TooltipProvider>
      <Layout>
        <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
          <p className="text-muted-foreground">Manage your invoices and track payments</p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Draft</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{summary.draftCount}</div>
              <p className="text-xs text-muted-foreground">Ready to send</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(summary.totalOutstanding)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.sentCount} sent invoice{summary.sentCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertTriangle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{formatCurrency(summary.totalOverdue)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.overdueCount} overdue invoice{summary.overdueCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collected</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{formatCurrency(summary.totalCollected || 0)}</div>
              <p className="text-xs text-muted-foreground">
                {summary.paidCount} paid invoice{summary.paidCount !== 1 ? 's' : ''}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <CardTitle>Invoice List</CardTitle>
                <CardDescription>
                  {filteredItems.length} of {invoiceLineItems.length} invoices
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full sm:w-[250px]"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="All statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={clientFilter} onValueChange={setClientFilter}>
                  <SelectTrigger className="w-full sm:w-[200px]">
                    <SelectValue placeholder="All clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All clients</SelectItem>
                    {uniqueClients.map((client) => (
                      <SelectItem key={client} value={client!}>
                        {client}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading_ ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading invoices...
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found matching your filters.
              </div>
            ) : (
              <div className="space-y-3">
                {filteredItems.map((item) => {
                  const billingInfo = item.opportunities?.opportunity_billing_info;
                  const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
                  const isOverdue = calculateOverdueStatus(item.invoice_status, item.billed_at, item.payment_date, paymentTerms);
                  return (
                  <div key={item.id} className={`flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 ${isOverdue ? 'border-red-200 bg-red-50/50 hover:bg-red-50' : ''}`}>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">
                          {item.invoice_number || 'DRAFT'}
                        </h4>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(item)}
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-muted-foreground hover:text-foreground cursor-help transition-colors" />
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-sm">
                              <div className="space-y-1">
                                <p className="font-medium">{item.description}</p>
                                {item.details && (
                                  <p className="text-xs text-muted-foreground">{item.details}</p>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.opportunities?.company_name} • {formatCurrency(item.line_total)}
                      </p>
                      {item.billed_at && (
                        <p className="text-xs text-muted-foreground">
                          Billed: {formatDateSafe(item.billed_at)}
                          {item.payment_date && ` • Paid: ${formatDateSafe(item.payment_date)}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isBillingInfoComplete(item.opportunities?.opportunity_billing_info) ? (
                        <>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => viewInvoice(item)}
                            className="flex items-center gap-2"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex items-center gap-2"
                            onClick={() => handleDownloadPDF(item)}
                            disabled={!item.invoice_number}
                          >
                            <Download className="h-4 w-4" />
                            PDF
                          </Button>
                          <PaymentStatusButton 
                            invoiceId={item.id}
                            currentStatus={item.invoice_status}
                            invoiceNumber={item.invoice_number || 'DRAFT'}
                            onStatusChange={() => fetchInvoiceData()}
                          />
                        </>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleConfigureBilling(item)}
                          className="flex items-center gap-2 text-orange-600 border-orange-300 hover:bg-orange-50"
                        >
                          <Settings className="h-4 w-4" />
                          Configure Billing
                        </Button>
                      )}
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        </div>

        {/* Billing Details Modal */}
        <BillingDetailsModal
          open={billingModalOpen}
          onOpenChange={setBillingModalOpen}
          opportunityId={selectedOpportunityId || ''}
          companyName={selectedCompanyName}
          billingInfo={billingInfo}
          onSave={async (savedBillingInfo) => {
            try {
              // Save billing info and wait for completion
              await saveBillingInfoAsync(savedBillingInfo);
              
              // Refresh both billing info and invoice data
              await Promise.all([
                refetchBillingInfo(),
                fetchInvoiceData()
              ]);
              
              setBillingModalOpen(false);
            } catch (error) {
              console.error('Error saving billing info:', error);
              // Don't close modal on error so user can try again
            }
          }}
        />
      </Layout>
    </TooltipProvider>
  );
}