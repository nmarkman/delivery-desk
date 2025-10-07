import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Settings, Calendar, Edit3, Check, X, AlertCircle, Loader2, Trash2, FileText, ChevronDown, ChevronUp, Plus, Send, Copy, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLineItems } from '@/hooks/useLineItems';
import { useOpportunityBilling } from '@/hooks/useOpportunityBilling';
import BillingDetailsModal from './BillingDetailsModal';
import ContractUploadModal from './ContractUploadModal';
import InvoicePreviewModal from './InvoicePreviewModal';
import type { InvoiceData } from '@/components/invoices/InvoiceTemplate';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface LineItem {
  id: string;
  description: string;
  item_type: string;
  billed_at: string | null;
  unit_rate: number;
  quantity: number | null;
  line_total: number | null;
  details: string | null;
  act_reference: string | null;
  invoice_number: string | null;
  invoice_status?: 'draft' | 'sent' | 'paid' | 'overdue' | null;
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
  estimated_close_date: string | null;
  created_at: string | null;
}

interface InvoiceStatusCounts {
  draft: number;
  sent: number;
  paid: number;
  overdue: number;
}

interface OpportunityCardProps {
  opportunity: Opportunity;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onExpandToggle?: (opportunityId: string, expanded: boolean) => void;
  onDataChange?: () => void;
  invoiceStatusCounts?: InvoiceStatusCounts;
  statusFilter?: string;
}

export default function OpportunityCard({
  opportunity,
  defaultExpanded = false,
  isExpanded,
  onExpandToggle,
  onDataChange,
  invoiceStatusCounts = { draft: 0, sent: 0, paid: 0, overdue: 0 },
  statusFilter = 'all'
}: OpportunityCardProps) {
  const navigate = useNavigate();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [editingDate, setEditingDate] = useState<string>('');
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [invoicePreviewModalOpen, setInvoicePreviewModalOpen] = useState(false);
  const [selectedInvoiceData, setSelectedInvoiceData] = useState<InvoiceData | null>(null);
  const [selectedLineItemId, setSelectedLineItemId] = useState<string | null>(null);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);
  const [updatingStatusItemId, setUpdatingStatusItemId] = useState<string | null>(null);

  // Collapse/expand state - controlled from parent or local
  const [localExpanded, setLocalExpanded] = useState(defaultExpanded);
  const expanded = isExpanded !== undefined ? isExpanded : localExpanded;

  const handleToggleExpand = () => {
    const newExpanded = !expanded;
    if (onExpandToggle) {
      onExpandToggle(opportunity.id, newExpanded);
    } else {
      setLocalExpanded(newExpanded);
    }
  };
  
  // Use React Query hook for optimistic updates
  const { 
    lineItems, 
    isLoading: loadingLineItems, 
    hasError,
    updateErrorMessage,
    deleteErrorMessage,
    isUpdateSuccess,
    isDeleteSuccess,
    updateLineItem,
    deleteLineItem,
    refetch: refetchLineItems
  } = useLineItems(opportunity.id);

  // Use billing hook to fetch billing information
  const { 
    billingInfo, 
    isLoading: loadingBillingInfo, 
    saveBillingInfo, 
    isSaving 
  } = useOpportunityBilling(opportunity.id);

  // Handle error and success notifications
  useEffect(() => {
    if (updateErrorMessage) {
      toast.error('Update Failed', { 
        description: updateErrorMessage,
        duration: 5000 
      });
    }
  }, [updateErrorMessage]);

  useEffect(() => {
    if (deleteErrorMessage) {
      toast.error('Delete Failed', { 
        description: deleteErrorMessage,
        duration: 5000 
      });
    }
  }, [deleteErrorMessage]);

  useEffect(() => {
    if (isUpdateSuccess) {
      toast.success('Line item updated successfully', {
        description: 'Changes have been saved and synced with Act! CRM'
      });
      // Trigger dashboard data refresh
      if (onDataChange) {
        onDataChange();
      }
    }
  }, [isUpdateSuccess, onDataChange]);

  useEffect(() => {
    if (isDeleteSuccess) {
      toast.success('Line item deleted successfully', {
        description: 'Item has been removed and synced with Act! CRM'
      });
      setDeletingItemId(null); // Clear delete loading state
      // Trigger dashboard data refresh
      if (onDataChange) {
        onDataChange();
      }
    }
  }, [isDeleteSuccess, onDataChange]);

  // Clear update loading state when update completes
  useEffect(() => {
    if (isUpdateSuccess || updateErrorMessage) {
      setUpdatingItemId(null);
    }
  }, [isUpdateSuccess, updateErrorMessage]);

  // Clear delete loading state when delete completes  
  useEffect(() => {
    if (isDeleteSuccess || deleteErrorMessage) {
      setDeletingItemId(null);
    }
  }, [isDeleteSuccess, deleteErrorMessage]);



  const startEditingItem = (item: LineItem) => {
    setEditingItemId(item.id);
    setEditingDescription(item.description);
    setEditingDate(item.billed_at ? item.billed_at : '');
    setEditingPrice(item.unit_rate.toString());
  };

  const cancelEditing = () => {
    setEditingItemId(null);
    setEditingDescription('');
    setEditingDate('');
    setEditingPrice('');
  };

  const saveItem = (itemId: string) => {
    // Set loading state for this specific item
    setUpdatingItemId(itemId);

    // Use the enhanced updateLineItem function with all fields
    updateLineItem(itemId, {
      description: editingDescription,
      billed_at: editingDate || null,
      unit_rate: parseFloat(editingPrice) || 0,
    });

    // Clear editing state
    cancelEditing();
  };

  // Mark invoice as sent
  const markAsSent = async (itemId: string) => {
    setUpdatingStatusItemId(itemId);
    try {
      const { error } = await supabase
        .from('invoice_line_items')
        .update({ invoice_status: 'sent' })
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Invoice marked as sent');
      refetchLineItems();
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error marking invoice as sent:', error);
      toast.error('Failed to mark invoice as sent');
    } finally {
      setUpdatingStatusItemId(null);
    }
  };

  // Mark invoice as paid
  const markAsPaid = async (itemId: string) => {
    setUpdatingStatusItemId(itemId);
    try {
      const { error } = await supabase
        .from('invoice_line_items')
        .update({
          invoice_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', itemId);

      if (error) throw error;

      toast.success('Invoice marked as paid');
      refetchLineItems();
      if (onDataChange) onDataChange();
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    } finally {
      setUpdatingStatusItemId(null);
    }
  };

  // Copy invoice details to clipboard
  const copyInvoiceDetails = async (item: LineItem) => {
    const invoiceText = `Invoice #${item.invoice_number || 'Draft'}
Description: ${item.description}
Amount: $${item.unit_rate?.toLocaleString() || '0'}
Date: ${item.billed_at ? new Date(item.billed_at + 'T00:00:00').toLocaleDateString() : 'Not set'}
Status: ${item.invoice_status || 'Draft'}`;

    try {
      await navigator.clipboard.writeText(invoiceText);
      toast.success('Invoice details copied to clipboard');
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy to clipboard');
    }
  };

  // Convert line item to invoice data for modal preview
  const convertLineItemToInvoiceData = (item: LineItem): InvoiceData | null => {
    if (!billingInfo) return null;

    const invoiceDate = item.billed_at || new Date().toISOString().split('T')[0];
    const dueDate = new Date(new Date(invoiceDate).getTime() + (billingInfo.payment_terms || 30) * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    return {
      invoice_number: item.invoice_number || 'DRAFT',
      invoice_date: invoiceDate,
      due_date: dueDate,
      status: (item.invoice_status || 'draft') as 'draft' | 'sent' | 'paid' | 'overdue',
      billing_info: {
        organization_name: billingInfo.organization_name || '',
        organization_address: billingInfo.organization_address || '',
        organization_contact_name: billingInfo.organization_contact_name || '',
        organization_contact_email: billingInfo.organization_contact_email || '',
        bill_to_name: billingInfo.bill_to_name || opportunity.company_name,
        bill_to_address: billingInfo.bill_to_address || '',
        bill_to_contact_name: billingInfo.bill_to_contact_name || '',
        bill_to_contact_email: billingInfo.bill_to_contact_email || '',
        payment_terms: billingInfo.payment_terms || 30,
        po_number: billingInfo.po_number || '',
        custom_payment_terms_text: billingInfo.custom_payment_terms_text || '',
      },
      line_items: [
        {
          id: item.id,
          description: item.description,
          details: item.details || undefined,
          quantity: item.quantity || 1,
          unit_rate: item.unit_rate,
          line_total: item.line_total || item.unit_rate,
        },
      ],
      subtotal: item.line_total || item.unit_rate,
      tax_amount: 0,
      total_amount: item.line_total || item.unit_rate,
      company_name: opportunity.company_name,
      opportunity_name: opportunity.name,
    };
  };

  // Handle viewing invoice in modal
  const handleViewInvoice = (item: LineItem) => {
    const invoiceData = convertLineItemToInvoiceData(item);
    if (invoiceData) {
      setSelectedInvoiceData(invoiceData);
      setSelectedLineItemId(item.id);
      setInvoicePreviewModalOpen(true);
    } else {
      toast.error('Cannot view invoice', {
        description: 'Billing information must be configured first.',
      });
    }
  };

  const isDeliverable = (item: LineItem): boolean => {
    return item.details?.toLowerCase() === 'deliverable';
  };

  const needsDueDate = (item: LineItem): boolean => {
    return isDeliverable(item) && !item.billed_at;
  };

  const getItemHighlightClass = (item: LineItem): string => {
    if (needsDueDate(item)) {
      return 'border-orange-200 bg-orange-50 shadow-sm';
    }
    return 'border-gray-200 bg-gray-50';
  };

  const deliverablesMissingDates = lineItems.filter(needsDueDate).length;

  // Filter and sort line items
  const filteredAndSortedLineItems = lineItems
    // First filter by status if a specific status is selected
    .filter(item => {
      if (statusFilter === 'all') return true;
      return item.invoice_status === statusFilter;
    })
    // Then sort chronologically by billing date
    .sort((a, b) => {
      // Items with billing dates come first, sorted chronologically (earliest first)
      if (a.billed_at && b.billed_at) {
        return new Date(a.billed_at).getTime() - new Date(b.billed_at).getTime();
      }
      // Items with billing dates come before items without
      if (a.billed_at && !b.billed_at) return -1;
      if (!a.billed_at && b.billed_at) return 1;
      // If both don't have billing dates, maintain original order
      return 0;
    });

  // Calculate contract value from filtered line items
  const calculatedContractValue = filteredAndSortedLineItems.reduce((sum, item) => {
    return sum + (item.unit_rate || 0);
  }, 0);

  // Calculate actual invoice status counts from displayed line items
  const actualInvoiceStatusCounts = {
    draft: lineItems.filter(item => item.invoice_status === 'draft').length,
    sent: lineItems.filter(item => item.invoice_status === 'sent').length,
    paid: lineItems.filter(item => item.invoice_status === 'paid').length,
    overdue: lineItems.filter(item => item.invoice_status === 'overdue').length,
  };

  // Calculate total dollar amounts by status
  const statusTotals = {
    draft: lineItems.filter(item => item.invoice_status === 'draft').reduce((sum, item) => sum + (item.unit_rate || 0), 0),
    sent: lineItems.filter(item => item.invoice_status === 'sent').reduce((sum, item) => sum + (item.unit_rate || 0), 0),
    paid: lineItems.filter(item => item.invoice_status === 'paid').reduce((sum, item) => sum + (item.unit_rate || 0), 0),
    overdue: lineItems.filter(item => item.invoice_status === 'overdue').reduce((sum, item) => sum + (item.unit_rate || 0), 0),
  };

  // Use actual counts if available, otherwise fall back to passed counts
  const displayStatusCounts = lineItems.length > 0 ? actualInvoiceStatusCounts : invoiceStatusCounts;

  return (
    <TooltipProvider>
      <Card className="w-full transition-all duration-200 hover:shadow-md flex flex-col">
        <CardHeader className="pb-3 bg-gray-50">
          {/* Top row: Company name, contract value, gear icon, + icon */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{opportunity.company_name}</CardTitle>
              {opportunity.estimated_close_date && (
                <p className="text-sm text-muted-foreground mt-1">
                  Est. Close: {(() => {
                    const [year, month, day] = opportunity.estimated_close_date.split('-');
                    return `${month}/${day}/${year}`;
                  })()}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              <div className="text-sm font-medium">
                ${calculatedContractValue.toLocaleString()}
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className={`h-8 w-8 relative ${!billingInfo && !loadingBillingInfo ? 'animate-pulse border-orange-600' : ''}`}
                    onClick={() => setBillingModalOpen(true)}
                  >
                    <Settings className={`h-4 w-4 ${!billingInfo && !loadingBillingInfo ? 'text-orange-600' : ''}`} />
                    {!billingInfo && !loadingBillingInfo && (
                      <span className="absolute -top-1 -right-1 flex h-3 w-3 items-center justify-center rounded-full bg-orange-600 text-[8px] font-bold text-white">
                        !
                      </span>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{!billingInfo && !loadingBillingInfo ? 'Billing Configuration Missing' : 'Billing Configuration'}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setUploadModalOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add Products</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>

        {/* Second row: Invoice status badges and View Invoices button */}
        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            {displayStatusCounts.draft > 0 && (statusFilter === 'all' || statusFilter === 'draft') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Badge variant="secondary" className="text-xs cursor-help">
                      {displayStatusCounts.draft} Draft
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>${statusTotals.draft.toLocaleString()} in draft invoices</p>
                </TooltipContent>
              </Tooltip>
            )}
            {displayStatusCounts.sent > 0 && (statusFilter === 'all' || statusFilter === 'sent') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Badge variant="default" className="text-xs bg-blue-500 hover:bg-blue-500 cursor-help">
                      {displayStatusCounts.sent} Sent
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>${statusTotals.sent.toLocaleString()} in sent invoices</p>
                </TooltipContent>
              </Tooltip>
            )}
            {displayStatusCounts.paid > 0 && (statusFilter === 'all' || statusFilter === 'paid') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Badge variant="default" className="text-xs bg-green-500 hover:bg-green-500 cursor-help">
                      {displayStatusCounts.paid} Paid
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>${statusTotals.paid.toLocaleString()} in paid invoices</p>
                </TooltipContent>
              </Tooltip>
            )}
            {displayStatusCounts.overdue > 0 && (statusFilter === 'all' || statusFilter === 'overdue') && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex">
                    <Badge variant="destructive" className="text-xs hover:bg-destructive cursor-help">
                      {displayStatusCounts.overdue} Overdue
                    </Badge>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>${statusTotals.overdue.toLocaleString()} in overdue invoices</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleExpand}
            className="flex items-center gap-1"
          >
            {expanded ? (
              <>
                <ChevronUp className="h-4 w-4" />
                Hide Invoices
              </>
            ) : (
              <>
                <ChevronDown className="h-4 w-4" />
                View Invoices
              </>
            )}
          </Button>
        </div>
      </CardHeader>

      {/* Collapsible content with smooth transition */}
      <div
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          expanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <CardContent className="pt-0 flex-1 flex flex-col">
          <div className="flex-1 space-y-3">
            
            {/* Contract Dates */}
            {(opportunity.contract_start_date || opportunity.contract_end_date) && (
              <div className="space-y-2">
                {opportunity.contract_start_date && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">Start Date:</span>
                    <span className="font-medium">
                      {new Date(opportunity.contract_start_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
                {opportunity.contract_end_date && (
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-muted-foreground">End Date:</span>
                    <span className="font-medium">
                      {new Date(opportunity.contract_end_date).toLocaleDateString()}
                    </span>
                  </div>
                )}
              </div>
            )}
            
            {/* Line Items Table */}
            <div className="pt-3 border-t border-gray-100">
              {loadingLineItems ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-xs text-muted-foreground">Loading line items...</div>
                </div>
              ) : lineItems.length === 0 ? (
                <div className="text-xs text-muted-foreground italic py-2">
                  No line items found for this opportunity
                </div>
              ) : filteredAndSortedLineItems.length === 0 ? (
                <div className="text-xs text-muted-foreground italic py-2">
                  No {statusFilter} invoices found for this opportunity
                </div>
              ) : (
                <div className="space-y-1">
                  {filteredAndSortedLineItems.map((item) => (
                    <div key={item.id} className={`border-b last:border-b-0 py-2 px-2 group relative hover:bg-gray-50 ${needsDueDate(item) ? 'bg-orange-50/30' : ''}`}>
                      {/* Single row layout with Description, Date, Price, Status */}
                      <div className="flex items-start gap-4">
                        {/* Description - takes most space, wraps to show full text */}
                        <div className="flex-1 min-w-0">
                          {editingItemId === item.id ? (
                            <textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="text-sm font-medium border border-gray-300 rounded-md px-2 py-1 w-full min-h-[40px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter description..."
                              disabled={updatingItemId === item.id}
                              rows={1}
                            />
                          ) : (
                            <div className="text-sm text-gray-900 break-words">
                              {item.description}
                            </div>
                          )}
                        </div>

                        {/* Right side container - slides left on hover to make room for action buttons */}
                        <div className="flex items-center gap-4 transition-all duration-200 group-hover:mr-40">
                          {/* Date */}
                          <div className="flex items-center gap-1 text-xs text-gray-600 w-36 justify-end flex-shrink-0">
                            {editingItemId === item.id ? (
                              <Input
                                type="date"
                                value={editingDate}
                                onChange={(e) => setEditingDate(e.target.value)}
                                className="h-7 w-full text-xs pr-2"
                                disabled={updatingItemId === item.id}
                              />
                            ) : (
                              <span className="text-right">
                                {item.billed_at
                                  ? new Date(item.billed_at + 'T00:00:00').toLocaleDateString()
                                  : <span className={needsDueDate(item) ? "text-orange-600 font-semibold" : "text-orange-600"}>
                                      {needsDueDate(item) ? "⚠ Not set" : "Not set"}
                                    </span>
                                }
                              </span>
                            )}
                          </div>

                          {/* Price and Status */}
                          <div className="flex items-center gap-2 justify-end flex-shrink-0 min-w-[180px]">
                            {editingItemId === item.id ? (
                              <Input
                                type="number"
                                value={editingPrice}
                                onChange={(e) => setEditingPrice(e.target.value)}
                                className="h-7 w-28 text-xs text-right"
                                placeholder="0"
                                step="0.01"
                                disabled={updatingItemId === item.id}
                              />
                            ) : (
                              <>
                                <span className="text-sm font-medium">
                                  ${item.unit_rate?.toLocaleString() || '0'}
                                </span>
                                {item.invoice_status && (
                                  <Badge
                                    variant={
                                      item.invoice_status === 'draft' ? 'secondary' :
                                      item.invoice_status === 'sent' ? 'default' :
                                      item.invoice_status === 'paid' ? 'default' :
                                      'destructive'
                                    }
                                    className={`text-xs pointer-events-none ${
                                      item.invoice_status === 'sent' ? 'bg-blue-500 hover:bg-blue-500' :
                                      item.invoice_status === 'paid' ? 'bg-green-500 hover:bg-green-500' :
                                      item.invoice_status === 'overdue' ? 'hover:bg-destructive' : ''
                                    }`}
                                  >
                                    {item.invoice_status.charAt(0).toUpperCase() + item.invoice_status.slice(1)}
                                  </Badge>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons - absolute positioned on the right, appear on hover */}
                        <div className="absolute right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          {editingItemId === item.id ? (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => saveItem(item.id)}
                                    disabled={updatingItemId === item.id}
                                  >
                                    {updatingItemId === item.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Check className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Save changes</p></TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={cancelEditing}
                                    disabled={updatingItemId !== null}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Cancel</p></TooltipContent>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => startEditingItem(item)}
                                    disabled={updatingItemId === item.id || deletingItemId === item.id || updatingStatusItemId === item.id}
                                  >
                                    <Edit3 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Edit</p></TooltipContent>
                              </Tooltip>

                              {item.billed_at && billingInfo && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => handleViewInvoice(item)}
                                      disabled={updatingItemId === item.id || deletingItemId === item.id || updatingStatusItemId === item.id}
                                    >
                                      <FileText className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>View Invoice</p></TooltipContent>
                                </Tooltip>
                              )}

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => {
                                      if (confirm('Are you sure you want to delete this line item? This will also remove it from Act! CRM.')) {
                                        setDeletingItemId(item.id);
                                        deleteLineItem(item.id, item.act_reference);
                                      }
                                    }}
                                    disabled={updatingItemId === item.id || deletingItemId === item.id || updatingStatusItemId === item.id}
                                  >
                                    {deletingItemId === item.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent><p>Delete</p></TooltipContent>
                              </Tooltip>

                              {/* Status-based action buttons - only show if billing info is set AND billing date is set */}
                              {billingInfo && item.billed_at && item.invoice_status === 'draft' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => markAsSent(item.id)}
                                      disabled={updatingItemId === item.id || deletingItemId === item.id || updatingStatusItemId === item.id}
                                    >
                                      {updatingStatusItemId === item.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <Send className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Mark as Sent</p></TooltipContent>
                                </Tooltip>
                              )}

                              {billingInfo && item.billed_at && (item.invoice_status === 'sent' || item.invoice_status === 'overdue') && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7"
                                      onClick={() => markAsPaid(item.id)}
                                      disabled={updatingItemId === item.id || deletingItemId === item.id || updatingStatusItemId === item.id}
                                    >
                                      {updatingStatusItemId === item.id ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                      ) : (
                                        <CheckCircle className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent><p>Mark as Paid</p></TooltipContent>
                                </Tooltip>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>

        {/* COMMENTED OUT - Billing Status footer (Phase 2: Task 5 - moved to gear icon in header)
        <div className="pt-3 border-t border-gray-100 mt-auto">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground font-medium">Billing Details:</span>
            <div className="flex items-center gap-2">
              {loadingBillingInfo ? (
                <span className="text-xs text-gray-500">Loading...</span>
              ) : billingInfo ? (
                <span className="text-xs text-green-600 font-medium">✓ Configured</span>
              ) : (
                <span className="text-xs text-orange-600 font-medium">Not configured</span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => setBillingModalOpen(true)}
                disabled={loadingBillingInfo}
              >
                <Settings className="h-3 w-3 mr-1" />
                {billingInfo ? 'Edit' : 'Configure'}
              </Button>
            </div>
          </div>
        </div>
        */}
      </CardContent>
    </div>

      {/* Billing Details Modal */}
      <BillingDetailsModal
        open={billingModalOpen}
        onOpenChange={setBillingModalOpen}
        opportunityId={opportunity.id}
        companyName={opportunity.company_name}
        billingInfo={billingInfo}
        onSave={saveBillingInfo}
      />
      
      {/* Contract Upload Modal */}
      <ContractUploadModal
        isOpen={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        opportunityId={opportunity.id}
        opportunityName={opportunity.name}
        companyName={opportunity.company_name}
        onUploadSuccess={() => refetchLineItems()}
      />

      {/* Invoice Preview Modal */}
      <InvoicePreviewModal
        open={invoicePreviewModalOpen}
        onOpenChange={setInvoicePreviewModalOpen}
        invoiceData={selectedInvoiceData}
        lineItemId={selectedLineItemId}
        onStatusChange={() => {
          refetchLineItems();
          if (onDataChange) onDataChange();
        }}
      />
      </Card>
    </TooltipProvider>
  );
}