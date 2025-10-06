import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, FileText, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import OpportunityCard from '@/components/OpportunityCard';
import OpportunityFilter from '@/components/OpportunityFilter';
import { formatCurrency, calculateOverdueStatus } from '@/utils/invoiceHelpers';
import { calculateDashboardMetrics } from '@/utils/dashboardCalculations';

// Enable debug logging for troubleshooting
const DEBUG_DASHBOARD = true;

function logDashboardEvent(event: string, details?: unknown) {
  if (DEBUG_DASHBOARD) {
    const timestamp = new Date().toISOString();
    console.log(`[Dashboard ${timestamp}] ${event}`, details || '');
  }
}

// Helper function to format currency without decimals for large amounts
const formatCurrencyNoDecimals = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

interface Client {
  id: string;
  name: string;
  outstanding_balance: number;
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

interface InvoiceLineItem {
  id: string;
  opportunity_id: string;
  invoice_number: string | null;
  invoice_status: 'draft' | 'sent' | 'paid' | 'overdue' | null;
  line_total: number;
  billed_at: string | null;
  payment_date: string | null;
  opportunities?: {
    opportunity_billing_info?: Array<{
      payment_terms?: number;
    }>;
  };
}

interface LineItem {
  id: string;
  opportunity_id: string;
  description: string;
  unit_rate: number;
  act_deleted_at: string | null;
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Log component mount
  useEffect(() => {
    logDashboardEvent('DASHBOARD_MOUNT', {
      userId: user?.id,
      timestamp: Date.now(),
      url: window.location.href
    });
    
    return () => {
      logDashboardEvent('DASHBOARD_UNMOUNT');
    };
  }, []);
  
  // Infinite scroll state
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const OPPORTUNITIES_PER_PAGE = 10;

  // Filter opportunities based on search term
  const handleFilterChange = useCallback((searchTerm: string) => {
    setSearchFilter(searchTerm);
  }, []);

  // Update filtered opportunities when opportunities or search filter changes
  useEffect(() => {
    if (!searchFilter.trim()) {
      setFilteredOpportunities(opportunities);
    } else {
      const filtered = opportunities.filter((opp) =>
        opp.company_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        opp.name.toLowerCase().includes(searchFilter.toLowerCase())
      );
      setFilteredOpportunities(filtered);
    }
  }, [opportunities, searchFilter]);

  const fetchOpportunities = useCallback(async (pageNum: number = 0, reset: boolean = false) => {
    logDashboardEvent('FETCH_OPPORTUNITIES_START', {
      pageNum,
      reset,
      userId: user?.id
    });
    
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
      
      logDashboardEvent('FETCH_OPPORTUNITIES_SUCCESS', {
        count: newOpportunities.length,
        pageNum,
        reset
      });
      
      if (reset) {
        setOpportunities(newOpportunities);
      } else {
        setOpportunities(prev => [...prev, ...newOpportunities]);
      }
      
      // Check if we have more data
      setHasMore(newOpportunities.length === OPPORTUNITIES_PER_PAGE);
      setPage(pageNum);
    } catch (error) {
      logDashboardEvent('FETCH_OPPORTUNITIES_ERROR', { error, pageNum, reset });
      console.error('Error fetching opportunities:', error);
      setError(error instanceof Error ? error.message : 'Failed to load opportunities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [user?.id, OPPORTUNITIES_PER_PAGE]);

  const fetchData = async () => {
    logDashboardEvent('FETCH_DATA_START', {
      userId: user?.id,
      timestamp: Date.now()
    });
    
    try {
      setLoading(true);
      setError(null);
      
      const clientsResult = await supabase
        .from('clients')
        .select('*')
        .eq('user_id', user?.id);

      // Check for errors
      if (clientsResult.error) throw new Error(`Failed to fetch clients: ${clientsResult.error.message}`);

      if (clientsResult.data) setClients(clientsResult.data);

      // Fetch all invoice line items for metrics (both billed and draft)
      const invoiceResult = await supabase
        .from('invoice_line_items')
        .select(`
          id,
          opportunity_id,
          invoice_number,
          invoice_status,
          line_total,
          billed_at,
          payment_date,
          opportunities!inner(
            user_id,
            opportunity_billing_info(payment_terms)
          )
        `)
        .eq('opportunities.user_id', user?.id);

      if (invoiceResult.error) throw new Error(`Failed to fetch invoice data: ${invoiceResult.error.message}`);
      
      if (invoiceResult.data) setInvoiceLineItems(invoiceResult.data);

      // Fetch all line items for contract value calculation
      const lineItemsResult = await supabase
        .from('invoice_line_items')
        .select(`
          id,
          opportunity_id,
          description,
          unit_rate,
          act_deleted_at,
          opportunities!inner(user_id)
        `)
        .eq('opportunities.user_id', user?.id)
        .is('act_deleted_at', null); // Exclude soft deleted items

      if (lineItemsResult.error) throw new Error(`Failed to fetch line items: ${lineItemsResult.error.message}`);
      
      if (lineItemsResult.data) setLineItems(lineItemsResult.data);
      
      // Fetch first page of opportunities
      await fetchOpportunities(0, true);
      
      logDashboardEvent('FETCH_DATA_COMPLETE', {
        clientCount: clients.length,
        invoiceLineItemCount: invoiceLineItems.length,
        lineItemCount: lineItems.length
      });
    } catch (error) {
      logDashboardEvent('FETCH_DATA_ERROR', { error });
      console.error('Error fetching data:', error);
      setError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      setLoading(false);
    }
  };

  // Track if this is the first mount
  const isFirstMount = useRef(true);
  const prevUserId = useRef<string | undefined>();

  useEffect(() => {
    // Only fetch data on first mount or if user ID actually changes
    // This prevents refetching when Supabase refreshes the auth token on tab focus
    logDashboardEvent('USER_EFFECT_TRIGGERED', {
      user: !!user,
      userId: user?.id,
      isFirstMount: isFirstMount.current,
      prevUserId: prevUserId.current,
      willFetch: user && (isFirstMount.current || prevUserId.current !== user.id)
    });
    
    if (user) {
      if (isFirstMount.current || prevUserId.current !== user.id) {
        logDashboardEvent('TRIGGERING_DATA_FETCH', {
          reason: isFirstMount.current ? 'first_mount' : 'user_changed',
          oldUserId: prevUserId.current,
          newUserId: user.id
        });
        fetchData();
        prevUserId.current = user.id;
        isFirstMount.current = false;
      } else {
        logDashboardEvent('SKIPPING_DATA_FETCH', {
          reason: 'same_user',
          userId: user.id
        });
      }
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

  // Use filtered opportunities for display
  const activeOpportunities = filteredOpportunities;
  
  // Calculate metrics based on current view (filtered opportunities when search is active)
  const metricsOpportunities = searchFilter.trim() ? filteredOpportunities : opportunities;
  
  // For filtering, we also need to filter lineItems and invoiceLineItems to match filtered opportunities
  const filteredOpportunityIds = new Set(metricsOpportunities.map(opp => opp.id));
  const filteredLineItems = searchFilter.trim() 
    ? lineItems.filter(item => filteredOpportunityIds.has(item.opportunity_id))
    : lineItems;
  const filteredInvoiceLineItems = searchFilter.trim()
    ? invoiceLineItems.filter(item => filteredOpportunityIds.has(item.opportunity_id))
    : invoiceLineItems;
  
  const {
    uniqueClients,
    totalActiveContractValue,
    totalOutstanding,
    outstandingCount,
    billedUnpaidAmount,
    billedUnpaidCount
  } = calculateDashboardMetrics(filteredLineItems, filteredInvoiceLineItems, metricsOpportunities);

  // Click handlers for navigating to invoices with filters
  const handleBilledUnpaidClick = () => {
    navigate('/invoices?status=sent');
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
      {/* COMMENTED OUT - Dashboard header moved to top navigation (Phase 2: Dashboard Consolidation)
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your business metrics</p>
        </div>
        <RefreshButton
          onSyncComplete={fetchData}
          variant="secondary"
          size="default"
        />
      </div>
      */}

      {/* Metrics Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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
            <CardTitle className="text-sm font-medium">Total Active Contract Value</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(totalActiveContractValue)}</div>
            <p className="text-xs text-muted-foreground">
              From {metricsOpportunities.length} active opportunit{metricsOpportunities.length !== 1 ? 'ies' : 'y'}
            </p>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all duration-200 hover:shadow-md hover:ring-4 hover:ring-purple-300 hover:ring-opacity-80" 
          onClick={handleBilledUnpaidClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Billed & Unpaid</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(billedUnpaidAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Awaiting collection ({billedUnpaidCount} invoice{billedUnpaidCount !== 1 ? 's' : ''})
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(totalOutstanding)}</div>
            <p className="text-xs text-muted-foreground">
              Total ACV minus Paid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Grid - Two Column Layout */}
      <div>
        <div className="mb-4 flex justify-between items-start">
          <div>
            <h2 className="text-2xl font-semibold">Opportunities</h2>
            <p className="text-muted-foreground">Manage your active opportunities and their details</p>
          </div>
          <OpportunityFilter
            onFilterChange={handleFilterChange}
            placeholder="Search by company or opportunity name..."
            className="mt-1"
          />
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
            <div className="flex flex-col gap-6">
              {activeOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  defaultExpanded={true}
                  onDataChange={fetchData}
                />
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
    </div>
  );
}