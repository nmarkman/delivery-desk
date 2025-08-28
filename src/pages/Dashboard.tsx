import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, FileText, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Client {
  id: string;
  name: string;
  outstanding_balance: number;
}

interface Invoice {
  id: string;
  status: string;
  amount: number;
  client_id: string;
}

interface Opportunity {
  id: string;
  company_name: string;
  name: string;
  primary_contact: string;
  retainer_amount: number | null;
  total_contract_value: number;
  status: string;
  contract_start_date: string | null;
  contract_end_date: string | null;
  created_at: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Infinite scroll state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const OPPORTUNITIES_PER_PAGE = 10;

  const fetchOpportunities = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const from = pageNum * OPPORTUNITIES_PER_PAGE;
      const to = from + OPPORTUNITIES_PER_PAGE - 1;

      const opportunitiesResult = await supabase
        .from('opportunities')
        .select('*')
        .eq('user_id', user?.id)
        .or('actual_close_date.is.null,actual_close_date.gt.' + new Date().toISOString().split('T')[0])
        .is('act_deleted_at', null)
        .order('company_name', { ascending: true })
        .range(from, to);

      if (opportunitiesResult.error) {
        throw new Error(`Failed to fetch opportunities: ${opportunitiesResult.error.message}`);
      }

      const newOpportunities = opportunitiesResult.data || [];
      
      if (reset) {
        setOpportunities(newOpportunities);
      } else {
        setOpportunities(prev => [...prev, ...newOpportunities]);
      }
      
      // Check if we have more data
      setHasMore(newOpportunities.length === OPPORTUNITIES_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id, OPPORTUNITIES_PER_PAGE]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [clientsResult, invoicesResult] = await Promise.all([
        supabase
          .from('clients')
          .select('*')
          .eq('user_id', user?.id),
        supabase
          .from('invoices')
          .select('*')
          .eq('user_id', user?.id)
      ]);

      // Check for errors
      if (clientsResult.error) throw new Error(`Failed to fetch clients: ${clientsResult.error.message}`);
      if (invoicesResult.error) throw new Error(`Failed to fetch invoices: ${invoicesResult.error.message}`);

      if (clientsResult.data) setClients(clientsResult.data);
      if (invoicesResult.data) setInvoices(invoicesResult.data);
      
      // Fetch first page of opportunities
      await fetchOpportunities(0, true);
    } catch (error) {
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  // Infinite scroll effect
  useEffect(() => {
    const handleScroll = () => {
      if (!scrollRef.current || loadingMore || !hasMore) return;

      const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
      
      // Load more when user scrolls to within 100px of bottom
      if (scrollTop + clientHeight >= scrollHeight - 100) {
        setLoadingMore(true);
        fetchOpportunities(page + 1, false);
      }
    };

    const scrollElement = scrollRef.current;
    if (scrollElement) {
      scrollElement.addEventListener('scroll', handleScroll);
      return () => scrollElement.removeEventListener('scroll', handleScroll);
    }
  }, [loadingMore, hasMore, page, fetchOpportunities]);

  // Opportunities are already filtered at database level for active ones (actual_close_date null or future)
  const activeOpportunities = opportunities;
  
  // Calculate metrics from active opportunities data only
  const uniqueClients = new Set(activeOpportunities.map(opp => opp.company_name)).size;
  const totalOutstanding = activeOpportunities.reduce((sum, opp) => sum + (opp.retainer_amount || 0), 0);
  
  // Keep existing invoice logic
  const totalBalance = clients.reduce((sum, client) => sum + (client.outstanding_balance || 0), 0);
  const totalInvoices = invoices.length;
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending').length;
  const paidInvoices = invoices.filter(inv => inv.status === 'paid').length;

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
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
          Loading dashboard...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-4">
          <div className="text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p className="font-medium">Failed to load dashboard</p>
            <p className="text-sm text-muted-foreground">{error}</p>
          </div>
          <Button onClick={fetchData} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of your business metrics</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalOutstanding.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {uniqueClients} clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueClients}</div>
            <p className="text-xs text-muted-foreground">
              Active clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {paidInvoices} paid, {pendingInvoices} pending
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingInvoices}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting payment
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Grid - Two Column Layout */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Opportunities</h2>
          <p className="text-muted-foreground">Manage your active opportunities and their details</p>
        </div>
        
        {activeOpportunities.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8 text-muted-foreground">
                No active opportunities found.{' '}
                <Link to="/act-sync" className="text-primary hover:underline">
                  Connect to Act! CRM to see your opportunities!
                </Link>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div 
            ref={scrollRef}
            className="max-h-[800px] overflow-y-auto pr-2"
          >
            <div className="grid gap-6 md:grid-cols-2 grid-cols-1">
              {activeOpportunities.map((opportunity) => (
                <Card key={opportunity.id} className="w-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg">{opportunity.company_name}</CardTitle>
                        <CardDescription className="mt-1">
                          {opportunity.primary_contact} • {opportunity.name}
                        </CardDescription>
                      </div>
                      <Badge variant={opportunity.status === 'Project Stage' ? "default" : "secondary"}>
                        {opportunity.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  
                  <CardContent className="pt-0">
                    <div className="space-y-3">
                      {/* Contract Details */}
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Contract Value:</span>
                        <span className="font-medium">${opportunity.total_contract_value.toLocaleString()}</span>
                      </div>
                      
                      {opportunity.retainer_amount && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Retainer:</span>
                          <span className="font-medium">${opportunity.retainer_amount.toLocaleString()}</span>
                        </div>
                      )}
                      
                      {/* Placeholder for Line Items - will be added in future tasks */}
                      <div className="pt-2 border-t">
                        <div className="text-sm text-muted-foreground mb-2">Line Items:</div>
                        <div className="text-xs text-muted-foreground italic">
                          Line item management coming soon...
                        </div>
                      </div>
                      
                      {/* Placeholder for Billing Status - will be added in future tasks */}
                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Billing Details:</span>
                          <span className="text-xs text-orange-600">Not configured</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {/* Loading indicator for infinite scroll */}
            {loadingMore && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-6 w-6 animate-spin mr-2" />
                <span className="text-muted-foreground">Loading more opportunities...</span>
              </div>
            )}
            
            {/* End of data indicator */}
            {!hasMore && activeOpportunities.length > 0 && (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No more opportunities to load
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Recent Invoices - Moved to bottom */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Invoices</CardTitle>
          <CardDescription>Latest invoice activity</CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              No invoices found.{' '}
              <Link to="/invoices" className="text-primary hover:underline">
                Create your first invoice!
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {invoices.slice(0, 6).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">Invoice #{invoice.id.slice(0, 8)}</p>
                    <p className="text-sm text-muted-foreground">
                      Amount: ${invoice.amount.toFixed(2)}
                    </p>
                  </div>
                  <Badge className={getStatusBadge(invoice.status)}>
                    {invoice.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}