import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DollarSign, Users, FileText, Clock, AlertCircle, Loader2, ChevronDown, ChevronUp, X, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import OpportunityCard from '@/components/OpportunityCard';
import OpportunityFilter from '@/components/OpportunityFilter';
import InvoiceStatusFilter from '@/components/InvoiceStatusFilter';
import ClientFilter from '@/components/ClientFilter';
import { formatCurrency, calculateOverdueStatus } from '@/utils/invoiceHelpers';
import { calculateDashboardMetrics } from '@/utils/dashboardCalculations';
import { useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();
  const [clients, setClients] = useState<Client[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<Opportunity[]>([]);
  const [invoiceLineItems, setInvoiceLineItems] = useState<InvoiceLineItem[]>([]);
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expand/collapse state management with localStorage
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('deliverydesk_expanded_cards');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });
  const [allExpanded, setAllExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem('deliverydesk_expand_all_state');
      return saved === 'true';
    } catch {
      return false;
    }
  });

  // Persist expand/collapse state to localStorage
  useEffect(() => {
    localStorage.setItem('deliverydesk_expanded_cards', JSON.stringify(expandedCards));
  }, [expandedCards]);

  useEffect(() => {
    localStorage.setItem('deliverydesk_expand_all_state', String(allExpanded));
  }, [allExpanded]);

  // Handle individual card expand/collapse
  const handleCardExpandToggle = (opportunityId: string, expanded: boolean) => {
    setExpandedCards(prev => ({
      ...prev,
      [opportunityId]: expanded
    }));
  };

  // Handle expand/collapse all
  const handleExpandAll = () => {
    const newExpandedState = !allExpanded;
    setAllExpanded(newExpandedState);
    const newExpandedCards: Record<string, boolean> = {};
    activeOpportunities.forEach(opp => {
      newExpandedCards[opp.id] = newExpandedState;
    });
    setExpandedCards(newExpandedCards);
  };

  // Calculate invoice status counts per opportunity
  const getInvoiceStatusCounts = (opportunityId: string) => {
    // Only count items that have invoice_status set (billed items)
    const oppInvoices = invoiceLineItems.filter(item =>
      item.opportunity_id === opportunityId && item.invoice_status
    );

    return {
      draft: oppInvoices.filter(item => item.invoice_status === 'draft').length,
      sent: oppInvoices.filter(item => item.invoice_status === 'sent').length,
      paid: oppInvoices.filter(item => item.invoice_status === 'paid').length,
      overdue: oppInvoices.filter(item => item.invoice_status === 'overdue').length,
    };
  };

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

  const OPPORTUNITIES_PER_PAGE = 10;

  // Filter opportunities based on search term
  const handleFilterChange = useCallback((searchTerm: string) => {
    setSearchFilter(searchTerm);
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSearchFilter('');
    setStatusFilter('all');
    setClientFilter('all');
  }, []);

  // Check if any filters are active
  const hasActiveFilters = searchFilter.trim() !== '' || statusFilter !== 'all' || clientFilter !== 'all';

  // Update filtered opportunities when opportunities, search filter, status filter, or client filter changes
  useEffect(() => {
    // Save current scroll position
    const scrollY = window.scrollY;

    let filtered = opportunities;

    // Apply search filter
    if (searchFilter.trim()) {
      filtered = filtered.filter((opp) =>
        opp.company_name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        opp.name.toLowerCase().includes(searchFilter.toLowerCase())
      );
    }

    // Apply client filter
    if (clientFilter !== 'all') {
      filtered = filtered.filter((opp) =>
        opp.company_name.trim().replace(/\s+/g, ' ') === clientFilter
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((opp) => {
        const oppInvoices = invoiceLineItems.filter(item => {
          if (item.opportunity_id !== opp.id) return false;

          const status = item.invoice_status || 'draft';

          // Get payment terms for overdue calculation
          const billingInfo = item.opportunities?.opportunity_billing_info;
          const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
          const isOverdue = calculateOverdueStatus(status, item.billed_at, item.payment_date, paymentTerms);

          // Handle different filter values
          if (statusFilter === 'sent') {
            // "Sent" filter shows both sent and overdue (overdue are technically sent invoices)
            return status === 'sent' || isOverdue;
          } else if (statusFilter === 'overdue') {
            // "Overdue" filter shows only calculated overdue
            return isOverdue;
          } else {
            // Other filters (draft, paid) match exactly
            return status === statusFilter;
          }
        });
        return oppInvoices.length > 0;
      });
    }

    setFilteredOpportunities(filtered);

    // Restore scroll position after state update
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollY);
    });
  }, [opportunities, searchFilter, statusFilter, clientFilter, invoiceLineItems]);

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
        .eq('opportunities.user_id', user?.id)
        .is('act_deleted_at', null); // Exclude soft deleted items

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

  // Background refresh for invoice data when line items change
  // This preserves scroll position and filters while updating metrics
  const refreshInvoiceDataInBackground = useCallback(async () => {
    if (!user?.id) return;

    logDashboardEvent('BACKGROUND_REFRESH_START', { userId: user.id });

    // Save current scroll position
    const scrollY = window.scrollY;

    try {
      // Fetch updated invoice line items (for metrics and status)
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
        .eq('opportunities.user_id', user.id)
        .is('act_deleted_at', null);

      if (invoiceResult.error) {
        console.warn('Background refresh error (invoices):', invoiceResult.error);
        return;
      }

      // Fetch updated line items (for contract value calculations)
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
        .eq('opportunities.user_id', user.id)
        .is('act_deleted_at', null);

      if (lineItemsResult.error) {
        console.warn('Background refresh error (line items):', lineItemsResult.error);
        return;
      }

      // Update both state values to refresh metrics
      if (invoiceResult.data) {
        setInvoiceLineItems(invoiceResult.data);
      }

      if (lineItemsResult.data) {
        setLineItems(lineItemsResult.data);
      }

      logDashboardEvent('BACKGROUND_REFRESH_SUCCESS', {
        invoiceCount: invoiceResult.data?.length || 0,
        lineItemCount: lineItemsResult.data?.length || 0
      });

      // Restore scroll position immediately
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollY);
      });
    } catch (error) {
      logDashboardEvent('BACKGROUND_REFRESH_ERROR', { error });
      console.warn('Background refresh failed:', error);
    }
  }, [user?.id]);

  // Listen for React Query cache updates and refresh data in background
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      // When any lineItems query is invalidated, refresh invoice data
      if (event?.type === 'updated' && event?.query?.queryKey?.[0] === 'lineItems') {
        logDashboardEvent('QUERY_CACHE_UPDATE', {
          queryKey: event.query.queryKey,
          state: event.query.state.status
        });

        // Delay the background refresh to avoid interfering with ongoing mutations
        // This prevents race conditions where the refresh tries to fetch data
        // while a mutation is still in progress
        setTimeout(() => {
          refreshInvoiceDataInBackground();
        }, 1000);
      }
    });

    return () => unsubscribe();
  }, [user?.id, queryClient, refreshInvoiceDataInBackground]);

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
      if (loadingMore || !hasMore) return;

      const { scrollY, innerHeight } = window;
      const { scrollHeight } = document.documentElement;

      // Load more when user scrolls to within 100px of bottom
      if (scrollY + innerHeight >= scrollHeight - 100) {
        setLoadingMore(true);
        fetchOpportunities(page + 1, false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [loadingMore, hasMore, page, fetchOpportunities]);

  // Use filtered opportunities for display
  const activeOpportunities = filteredOpportunities;

  // Extract unique client names for the client filter dropdown
  // Clean client names to remove extra whitespace and normalize spacing
  const uniqueClientNames = Array.from(
    new Set(opportunities.map(opp => opp.company_name.trim().replace(/\s+/g, ' ')))
  );

  // Filter line items to match ONLY the filtered opportunities (including status filter),
  // but include ALL line item statuses for those opportunities
  // This way:
  // - Total Active Clients reflects the filtered opportunity count
  // - Dollar metrics (ACV, Paid, Billed & Unpaid, Outstanding) show full amounts for those opportunities
  const filteredOpportunityIds = new Set(filteredOpportunities.map(opp => opp.id));
  const filteredLineItems = lineItems.filter(item => filteredOpportunityIds.has(item.opportunity_id));
  const filteredInvoiceLineItems = invoiceLineItems.filter(item => filteredOpportunityIds.has(item.opportunity_id));

  const {
    uniqueClients,
    totalActiveContractValue,
    totalOutstanding,
    outstandingCount,
    billedUnpaidAmount,
    billedUnpaidCount,
    totalPaid,
    paidCount
  } = calculateDashboardMetrics(filteredLineItems, filteredInvoiceLineItems, filteredOpportunities);

  // Click handlers for applying invoice status filters
  const handlePaidClick = () => {
    setStatusFilter('paid');
  };

  const handleBilledUnpaidClick = () => {
    setStatusFilter('sent');
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
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
        {/* 1. Total Active Clients */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Active Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueClients}</div>
          </CardContent>
        </Card>

        {/* 2. Total ACV */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total ACV</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(totalActiveContractValue)}</div>
          </CardContent>
        </Card>

        {/* 3. Total Paid */}
        <Card
          className="cursor-pointer transition-all duration-200 hover:shadow-md hover:ring-4 hover:ring-green-300 hover:ring-opacity-80"
          onClick={handlePaidClick}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(totalPaid)}</div>
            <p className="text-xs text-muted-foreground">
              {paidCount} invoice{paidCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* 4. Billed & Unpaid */}
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
              {billedUnpaidCount} invoice{billedUnpaidCount !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>

        {/* 5. Total Outstanding */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Outstanding</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrencyNoDecimals(totalOutstanding)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Opportunities Section */}
      <div>
        <div className="mb-4">
          <h2 className="text-2xl font-semibold">Opportunity Management</h2>
        </div>

        <div className="sticky top-16 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-3 mb-4 border-b">
          <div className="flex gap-3 items-center w-full">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExpandAll}
              className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
            >
              {allExpanded ? (
                <>
                  <ChevronUp className="h-4 w-4" />
                  Collapse All
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4" />
                  Expand All
                </>
              )}
            </Button>
            <div className="w-[240px] flex-shrink-0">
              <InvoiceStatusFilter
                value={statusFilter}
                onValueChange={setStatusFilter}
              />
            </div>
            <div className="w-[280px] flex-shrink-0">
              <ClientFilter
                value={clientFilter}
                onValueChange={setClientFilter}
                clients={uniqueClientNames}
              />
            </div>
            <OpportunityFilter
              onFilterChange={handleFilterChange}
              placeholder="Search by company or opportunity name..."
              className="flex-1 min-w-[300px]"
            />
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="flex items-center gap-1 flex-shrink-0 whitespace-nowrap"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
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
          <div>
            <div className="flex flex-col gap-6">
              {activeOpportunities.map((opportunity) => (
                <OpportunityCard
                  key={opportunity.id}
                  opportunity={opportunity}
                  defaultExpanded={false}
                  isExpanded={expandedCards[opportunity.id] ?? false}
                  onExpandToggle={handleCardExpandToggle}
                  invoiceStatusCounts={getInvoiceStatusCounts(opportunity.id)}
                  statusFilter={statusFilter}
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