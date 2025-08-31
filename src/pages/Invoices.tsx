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
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency, calculateOverdueStatus, extractClientShortform, generateNextInvoiceNumber } from '@/utils/invoiceHelpers';
import { InvoiceTemplate, type InvoiceData, type InvoiceLineItemData, type BillingInfo } from '@/components/invoices/InvoiceTemplate';

interface InvoiceLineItem {
  id: string;
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
    } | null;
  } | null;
}

interface InvoiceSummary {
  totalOutstanding: number;
  totalOverdue: number;
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
  // Removed complex useInvoiceGeneration hook - using direct utility functions instead
  
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InvoiceLineItem[]>([]);
  const [summary, setSummary] = useState<InvoiceSummary>({
    totalOutstanding: 0,
    totalOverdue: 0,
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

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

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
        }
      }
    } else {
      setSelectedInvoice(null);
    }
  }, [invoiceId, invoiceLineItems]);

  const fetchInvoiceData = async () => {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select(`
          id,
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
              po_number
            )
          )
        `)
        .not('billed_at', 'is', null)
        .is('act_deleted_at', null)
        .eq('user_id', user?.id)
        .order('billed_at', { ascending: false });

      if (error) throw error;

      const itemsWithNumbers = await autoGenerateInvoiceNumbers(data || []);
      setInvoiceLineItems(itemsWithNumbers);
      calculateSummary(itemsWithNumbers);
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
    const itemsNeedingNumbers = items.filter(item => !item.invoice_number && item.opportunities?.company_name);
    
    if (itemsNeedingNumbers.length === 0) {
      return updatedItems;
    }
    
    console.log(`Auto-generating invoice numbers for ${itemsNeedingNumbers.length} items...`);
    
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
        const dateA = new Date(a.billed_at || '').getTime();
        const dateB = new Date(b.billed_at || '').getTime();
        return dateA - dateB;
      });
    });
    
    // Generate sequential invoice numbers for each company
    for (const [companyName, companyItems] of Object.entries(itemsByCompany)) {
      try {
        // Get the shortform for this company (no uniqueness checking)
        const clientShortform = extractClientShortform(companyName);
        console.log(`Processing ${companyItems.length} items for ${companyName} (${clientShortform})`);
        
        // Find existing invoice numbers for this shortform to determine next sequence
        const { data: existingData } = await supabase
          .from('invoice_line_items')
          .select('invoice_number')
          .not('invoice_number', 'is', null)
          .like('invoice_number', `${clientShortform}-%`)
          .order('invoice_number', { ascending: false });
        
        // Determine starting sequence number
        let nextSequence = 1;
        if (existingData && existingData.length > 0) {
          const highestNumber = existingData[0].invoice_number;
          const match = highestNumber?.match(/-(\d+)$/);
          if (match) {
            nextSequence = parseInt(match[1], 10) + 1;
          }
        }
        
        // Generate and update each item
        for (let i = 0; i < companyItems.length; i++) {
          const item = companyItems[i];
          const sequenceNumber = (nextSequence + i).toString().padStart(3, '0');
          const invoiceNumber = `${clientShortform}-${sequenceNumber}`;
          
          try {
            const { error } = await supabase
              .from('invoice_line_items')
              .update({ invoice_number: invoiceNumber })
              .eq('id', item.id);
              
            if (!error) {
              console.log(`Generated ${invoiceNumber} for ${companyName} item ${item.id} (billed: ${item.billed_at})`);
              
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

  const calculateSummary = (items: InvoiceLineItem[]) => {
    const summary = items.reduce((acc, item) => {
      const status = item.invoice_status || 'draft';
      const isOverdue = calculateOverdueStatus(status, item.billed_at);
      
      // Count by status
      acc[`${status}Count` as keyof InvoiceSummary] += 1;
      
      if (isOverdue) {
        acc.overdueCount += 1;
      }

      // Outstanding balance (sent but not paid)
      if (status === 'sent' && !item.payment_date) {
        acc.totalOutstanding += item.line_total;
      }

      // Overdue balance
      if (isOverdue) {
        acc.totalOverdue += item.line_total;
      }

      return acc;
    }, {
      totalOutstanding: 0,
      totalOverdue: 0,
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
        filtered = filtered.filter(item => 
          calculateOverdueStatus(item.invoice_status, item.billed_at)
        );
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
    const isOverdue = calculateOverdueStatus(status, item.billed_at);
    
    if (isOverdue) {
      return <Badge variant="destructive">Overdue</Badge>;
    }

    const variants = {
      draft: <Badge variant="secondary">Draft</Badge>,
      sent: <Badge variant="outline">Sent</Badge>,
      paid: <Badge variant="default" className="bg-green-600">Paid</Badge>,
      overdue: <Badge variant="destructive">Overdue</Badge>
    };
    
    return variants[status] || variants.draft;
  };

  const convertToInvoiceData = (item: InvoiceLineItem): InvoiceData | null => {
    if (!item.opportunities?.opportunity_billing_info) return null;

    const billingInfo = item.opportunities.opportunity_billing_info;
    
    return {
      invoice_number: item.invoice_number || 'DRAFT',
      invoice_date: item.billed_at || new Date().toISOString().split('T')[0],
      due_date: item.billed_at ? 
        new Date(new Date(item.billed_at).getTime() + (billingInfo?.payment_terms || 30) * 24 * 60 * 60 * 1000).toISOString().split('T')[0] :
        new Date().toISOString().split('T')[0],
      status: (item.invoice_status as any) || 'draft',
      billing_info: {
        organization_name: billingInfo.organization_name,
        organization_address: billingInfo.organization_address || '',
        organization_contact_name: billingInfo.organization_contact_name || '',
        organization_contact_email: billingInfo.organization_contact_email || '',
        bill_to_name: billingInfo.bill_to_name || item.opportunities.company_name,
        bill_to_address: billingInfo.bill_to_address || '',
        bill_to_contact_name: billingInfo.bill_to_contact_name || '',
        bill_to_contact_email: billingInfo.bill_to_contact_email || '',
        payment_terms: billingInfo.payment_terms || 30,
        po_number: billingInfo.po_number
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
      total_amount: item.line_total
    };
  };

  const viewInvoice = (item: InvoiceLineItem) => {
    // Navigate to individual invoice route
    navigate(`/invoices/${item.id}`);
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
              <h1 className="text-3xl font-bold text-foreground">
                Invoice {selectedInvoice.invoice_number}
              </h1>
              <p className="text-muted-foreground">
                {selectedInvoice.billing_info.organization_name}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <InvoiceTemplate invoice={selectedInvoice} />
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoices</h1>
            <p className="text-muted-foreground">Manage your invoices and track payments</p>
          </div>
          <Button onClick={() => navigate('/invoice-generator')} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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
              <CardTitle className="text-sm font-medium">Paid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{summary.paidCount}</div>
              <p className="text-xs text-muted-foreground">This period</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search invoices..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
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
                <SelectTrigger className="w-[200px]">
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
          </CardContent>
        </Card>

        {/* Invoice List */}
        <Card>
          <CardHeader>
            <CardTitle>Invoice List</CardTitle>
            <CardDescription>
              {filteredItems.length} of {invoiceLineItems.length} invoices
            </CardDescription>
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
                {filteredItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">
                          {item.invoice_number || 'DRAFT'}
                        </h4>
                        {getStatusBadge(item)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.opportunities?.company_name} • {item.description} • {formatCurrency(item.line_total)}
                      </p>
                      {item.billed_at && (
                        <p className="text-xs text-muted-foreground">
                          Billed: {new Date(item.billed_at).toLocaleDateString()}
                          {item.payment_date && ` • Paid: ${new Date(item.payment_date).toLocaleDateString()}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => viewInvoice(item)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View
                      </Button>
                      <Button variant="outline" size="sm" className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        PDF
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}