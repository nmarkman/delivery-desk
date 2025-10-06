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
import { Settings, Calendar, Edit3, Check, X, AlertCircle, Loader2, Trash2, FileText, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLineItems } from '@/hooks/useLineItems';
import { useOpportunityBilling } from '@/hooks/useOpportunityBilling';
import BillingDetailsModal from './BillingDetailsModal';
import ContractUploadModal from './ContractUploadModal';
import { toast } from 'sonner';

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

interface OpportunityCardProps {
  opportunity: Opportunity;
  defaultExpanded?: boolean;
  isExpanded?: boolean;
  onExpandToggle?: (opportunityId: string, expanded: boolean) => void;
  onDataChange?: () => void;
}

export default function OpportunityCard({ opportunity, defaultExpanded = false, isExpanded, onExpandToggle, onDataChange }: OpportunityCardProps) {
  const navigate = useNavigate();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState<string>('');
  const [editingDate, setEditingDate] = useState<string>('');
  const [editingPrice, setEditingPrice] = useState<string>('');
  const [billingModalOpen, setBillingModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

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

  // Calculate contract value from active line items
  const calculatedContractValue = lineItems.reduce((sum, item) => {
    return sum + (item.unit_rate || 0);
  }, 0);

  // Calculate invoice status counts (this would come from invoice_line_items in real implementation)
  // For now, using placeholder logic - this will need to be passed from Dashboard
  const invoiceStatusCounts = {
    draft: 0,
    sent: 0,
    paid: 0,
    overdue: 0
  };

  return (
    <TooltipProvider>
      <Card className="w-full transition-all duration-200 hover:shadow-md flex flex-col">
        <CardHeader className="pb-3">
          {/* Top row: Company name, contract value, gear icon, + icon */}
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg truncate">{opportunity.company_name}</CardTitle>
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
            {invoiceStatusCounts.draft > 0 && (
              <Badge variant="secondary" className="text-xs">
                {invoiceStatusCounts.draft} Draft
              </Badge>
            )}
            {invoiceStatusCounts.sent > 0 && (
              <Badge variant="default" className="text-xs bg-blue-500">
                {invoiceStatusCounts.sent} Sent
              </Badge>
            )}
            {invoiceStatusCounts.paid > 0 && (
              <Badge variant="default" className="text-xs bg-green-500">
                {invoiceStatusCounts.paid} Paid
              </Badge>
            )}
            {invoiceStatusCounts.overdue > 0 && (
              <Badge variant="destructive" className="text-xs">
                {invoiceStatusCounts.overdue} Overdue
              </Badge>
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
              ) : (
                <div className="space-y-2">
                  {lineItems.map((item) => (
                    <div key={item.id} className={`border rounded-lg p-3 group relative ${getItemHighlightClass(item)}`}>
                      {/* Header with Description and Action Buttons */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0 pr-16">
                          {editingItemId === item.id ? (
                            <textarea
                              value={editingDescription}
                              onChange={(e) => setEditingDescription(e.target.value)}
                              className="text-sm font-medium border border-gray-300 rounded-md px-3 py-2 w-full min-h-[60px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Enter description..."
                              disabled={updatingItemId === item.id}
                              rows={2}
                            />
                          ) : (
                            <div className="text-sm font-medium text-gray-900 line-clamp-2">
                              {item.description}
                            </div>
                          )}
                        </div>
                        
                        {/* Circular Action Buttons in top-right */}
                        <div className="absolute top-3 right-3 flex gap-1">
                          {editingItemId === item.id ? (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full bg-green-100 hover:bg-green-200"
                                onClick={() => saveItem(item.id)}
                                disabled={updatingItemId === item.id}
                                title="Save changes"
                              >
                                {updatingItemId === item.id ? (
                                  <Loader2 className="h-3 w-3 text-green-600 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3 text-green-600" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full bg-gray-100 hover:bg-gray-200"
                                onClick={cancelEditing}
                                disabled={updatingItemId !== null}
                                title="Cancel editing"
                              >
                                <X className="h-3 w-3 text-gray-600" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full bg-blue-100 hover:bg-blue-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => startEditingItem(item)}
                                title="Edit line item"
                                disabled={updatingItemId === item.id || deletingItemId === item.id}
                              >
                                <Edit3 className="h-3 w-3 text-blue-600" />
                              </Button>
                              {/* Invoice Connection Button - only show for billed items with billing info */}
                              {item.billed_at && billingInfo && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 w-6 p-0 rounded-full bg-green-100 hover:bg-green-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => navigate(`/invoices/${item.id}`)}
                                  title="View invoice"
                                  disabled={updatingItemId === item.id || deletingItemId === item.id}
                                >
                                  <FileText className="h-3 w-3 text-green-600" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => {
                                  if (confirm('Are you sure you want to delete this line item? This will also remove it from Act! CRM.')) {
                                    setDeletingItemId(item.id);
                                    deleteLineItem(item.id, item.act_reference);
                                  }
                                }}
                                title="Delete line item"
                                disabled={updatingItemId === item.id || deletingItemId === item.id}
                              >
                                {deletingItemId === item.id ? (
                                  <Loader2 className="h-3 w-3 text-red-600 animate-spin" />
                                ) : (
                                  <Trash2 className="h-3 w-3 text-red-600" />
                                )}
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Details Grid */}
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Billing Date:</span>
                          
                          {editingItemId === item.id ? (
                            <Input
                              type="date"
                              value={editingDate}
                              onChange={(e) => setEditingDate(e.target.value)}
                              className="h-6 w-36 text-xs ml-1"
                              disabled={updatingItemId === item.id}
                            />
                          ) : (
                            <span className="font-medium ml-1">
                              {item.billed_at 
                                ? new Date(item.billed_at + 'T00:00:00').toLocaleDateString()
                                : <span className={needsDueDate(item) ? "text-orange-600 font-semibold" : "text-orange-600"}>
                                    {needsDueDate(item) ? "⚠ Not set" : "Not set"}
                                  </span>
                              }
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-end gap-1">
                          {item.details && (
                            <>
                              <span className="text-gray-600 capitalize">{item.details.toLowerCase()}</span>
                              <span className="text-gray-400">|</span>
                            </>
                          )}
                          <span className="text-gray-600">Price:</span>
                          
                          {editingItemId === item.id ? (
                            <Input
                              type="number"
                              value={editingPrice}
                              onChange={(e) => setEditingPrice(e.target.value)}
                              className="h-6 w-32 text-xs text-right ml-1"
                              placeholder="0"
                              step="0.01"
                              disabled={updatingItemId === item.id}
                            />
                          ) : (
                            <span className="font-medium ml-1">
                              ${item.unit_rate?.toLocaleString() || '0'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
        
        {/* Billing Status - Always at bottom as card footer */}
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
      </Card>
    </TooltipProvider>
  );
}