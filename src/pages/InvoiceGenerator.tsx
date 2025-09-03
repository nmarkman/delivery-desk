import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Plus, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { InvoiceTemplate, type InvoiceData } from '@/components/invoices/InvoiceTemplate';

interface Client {
  id: string;
  name: string;
  email: string;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_id: string;
  amount: number;
  status: string;
  due_date: string;
  month_year: string;
  clients: { name: string };
}

export default function InvoiceGenerator() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [amount, setAmount] = useState('');
  const [monthYear, setMonthYear] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showDesignPreview, setShowDesignPreview] = useState(false);

  // Sample data for design preview
  const sampleInvoiceData: InvoiceData = {
    invoice_number: "WSU-001",
    invoice_date: "2024-01-15",
    due_date: "2024-02-14",
    status: "draft",
    billing_info: {
      organization_name: "Washington State University",
      organization_address: "1500 NE Stadium Way\nPullman, WA 99164\nUnited States",
      organization_contact_name: "Sarah Johnson",
      organization_contact_email: "sarah.johnson@wsu.edu",
      bill_to_name: "Washington State University",
      bill_to_address: "Accounts Payable Department\n1500 NE Stadium Way\nPullman, WA 99164\nUnited States",
      bill_to_contact_name: "Mike Williams",
      bill_to_contact_email: "accounts.payable@wsu.edu",
      payment_terms: 30,
      po_number: "WSU-2024-001"
    },
    line_items: [
      {
        id: "1",
        description: "Monthly Retainer - Strategic Consulting",
        details: "Strategic retail consulting services for January 2024",
        quantity: 1,
        unit_rate: 5000,
        line_total: 5000,
        service_period_start: "2024-01-01",
        service_period_end: "2024-01-31"
      },
      {
        id: "2", 
        description: "Market Analysis Report",
        details: "Comprehensive analysis of regional retail market trends and competitive positioning",
        quantity: 1,
        unit_rate: 2500,
        line_total: 2500
      },
      {
        id: "3",
        description: "Store Layout Optimization",
        details: "On-site consultation and layout recommendations for flagship store",
        quantity: 8,
        unit_rate: 200,
        line_total: 1600
      }
    ],
    subtotal: 9100,
    tax_amount: 0,
    total_amount: 9100,
    company_name: "Wayne State University",
    opportunity_name: "Consulting and Project Management Services"
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const [clientsResult, invoicesResult] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('invoices')
          .select(`
            *,
            clients (name)
          `)
          .eq('user_id', user?.id)
          .order('created_at', { ascending: false })
      ]);

      if (clientsResult.data) setClients(clientsResult.data);
      if (invoicesResult.data) setInvoices(invoicesResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  const generateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedClient || !amount || !monthYear) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    
    try {
      const invoiceNumber = `INV-${Date.now()}`;
      
      const { error } = await supabase
        .from('invoices')
        .insert({
          user_id: user?.id,
          client_id: selectedClient,
          invoice_number: invoiceNumber,
          amount: parseFloat(amount),
          month_year: monthYear,
          status: 'draft',
          invoice_date: new Date().toISOString().split('T')[0],
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invoice created successfully!",
      });

      // Reset form
      setSelectedClient('');
      setAmount('');
      setMonthYear('');
      
      // Refresh invoices
      fetchData();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      paid: 'bg-success text-success-foreground',
      pending: 'bg-warning text-warning-foreground',
      draft: 'bg-muted text-muted-foreground',
      overdue: 'bg-destructive text-destructive-foreground'
    };
    return variants[status as keyof typeof variants] || variants.draft;
  };

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

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Invoice Generator</h1>
            <p className="text-muted-foreground">Create and manage invoices for your clients</p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => setShowDesignPreview(!showDesignPreview)}
            className="flex items-center gap-2"
          >
            <Eye className="h-4 w-4" />
            {showDesignPreview ? 'Hide' : 'Preview'} CRCG Template
          </Button>
        </div>

        {showDesignPreview && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center text-lg">🎨 Design Preview - CRCG Invoice Template</CardTitle>
              <CardDescription className="text-center">
                Review the invoice design and provide feedback below. This shows how invoices will look when generated.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="max-h-[800px] overflow-y-auto border rounded-lg">
                <InvoiceTemplate invoice={sampleInvoiceData} />
              </div>
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-900 mb-2">Design Review Notes:</h4>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• CRCG logo and "COLLEGIATE RETAIL" branding in header</li>
                  <li>• Professional layout matching existing invoice format</li>
                  <li>• All billing information, line items, and totals included</li>
                  <li>• Print-optimized styling for PDF generation</li>
                  <li>• Ready for your feedback and any design adjustments</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Invoice Creation Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Create New Invoice
              </CardTitle>
              <CardDescription>Generate a new invoice for a client</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={generateInvoice} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client">Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="month-year">Month/Year</Label>
                  <Input
                    id="month-year"
                    type="month"
                    value={monthYear}
                    onChange={(e) => setMonthYear(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Amount ($)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={submitting}>
                  {submitting ? 'Creating...' : 'Create Invoice'}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Invoice Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Invoice Preview
              </CardTitle>
              <CardDescription>Preview of your invoice template</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                <div className="text-center">
                  <h3 className="text-lg font-bold">INVOICE</h3>
                  <p className="text-sm text-muted-foreground">DeliveryDesk Services</p>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium">To:</p>
                    <p>{selectedClient ? clients.find(c => c.id === selectedClient)?.name : 'Select Client'}</p>
                  </div>
                  <div>
                    <p className="font-medium">Invoice #:</p>
                    <p>INV-{Date.now().toString().slice(-6)}</p>
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between">
                    <span>Service Period:</span>
                    <span>{monthYear || 'Select Month'}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2">
                    <span>Total:</span>
                    <span>${amount || '0.00'}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Invoices */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Manage your existing invoices</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No invoices found. Create your first invoice above!
              </div>
            ) : (
              <div className="space-y-3">
                {invoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h4 className="font-medium">{invoice.invoice_number}</h4>
                        <Badge className={getStatusBadge(invoice.status)}>
                          {invoice.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {invoice.clients?.name} • {invoice.month_year} • ${invoice.amount.toFixed(2)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
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