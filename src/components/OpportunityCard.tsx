import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, ChevronUp, Settings, Calendar, Tag, Edit3, Check, X } from 'lucide-react';
import { useLineItems } from '@/hooks/useLineItems';

interface LineItem {
  id: string;
  description: string;
  item_type: string;
  billed_at: string | null;
  unit_rate: number;
  quantity: number | null;
  line_total: number | null;
  details: string | null;
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
}

export default function OpportunityCard({ opportunity, defaultExpanded = true }: OpportunityCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingDate, setEditingDate] = useState<string>('');
  
  // Use React Query hook for optimistic updates
  const { lineItems, isLoading: loadingLineItems, updateDueDate, isUpdating } = useLineItems(
    isExpanded ? opportunity.id : ''
  );

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const getTypeIcon = (type: string) => {
    return type.toLowerCase() === 'retainer' ? <Calendar className="h-3 w-3" /> : <Tag className="h-3 w-3" />;
  };

  const startEditingDate = (item: LineItem) => {
    setEditingItemId(item.id);
    // Format existing date for input or use empty string
    setEditingDate(item.billed_at ? item.billed_at : '');
  };

  const cancelEditingDate = () => {
    setEditingItemId(null);
    setEditingDate('');
  };

  const saveDueDate = (itemId: string) => {
    // Use optimistic update via React Query
    updateDueDate({
      itemId,
      billed_at: editingDate || null,
      opportunityId: opportunity.id,
    });

    // Clear editing state
    setEditingItemId(null);
    setEditingDate('');
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


  return (
    <Card className="w-full transition-all duration-200 hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg truncate">{opportunity.company_name}</CardTitle>
            <CardDescription className="mt-1">
              {opportunity.primary_contact} • {opportunity.name}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 ml-4">
            <Badge variant={opportunity.status === 'Project Stage' ? "default" : "secondary"}>
              {opportunity.status}
            </Badge>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={toggleExpanded}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="pt-0 animate-in slide-in-from-top-2 duration-200">
          <div className="space-y-3">
            {/* Contract Details */}
            {opportunity.total_contract_value > 0 && (
              <div className="flex justify-between items-center text-sm">
                <span className="text-muted-foreground">Contract Value:</span>
                <span className="font-medium">
                  ${opportunity.total_contract_value.toLocaleString()}
                </span>
              </div>
            )}
            
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
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">
                    Line Items ({lineItems.length})
                  </span>
                  {deliverablesMissingDates > 0 && (
                    <Badge variant="outline" className="text-xs text-orange-600 border-orange-300 bg-orange-50">
                      {deliverablesMissingDates} need due dates
                    </Badge>
                  )}
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  Manage
                </Button>
              </div>
              
              {loadingLineItems ? (
                <div className="flex items-center justify-center py-4">
                  <div className="text-xs text-muted-foreground">Loading line items...</div>
                </div>
              ) : lineItems.length === 0 ? (
                <div className="text-xs text-muted-foreground italic py-2">
                  No line items found for this opportunity
                </div>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                  {lineItems.map((item) => (
                    <div key={item.id} className={`border rounded-lg p-3 group ${getItemHighlightClass(item)}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 line-clamp-2">
                            {item.description}
                          </div>
                        </div>
                        {item.details && (
                          <div className="flex items-center gap-2 ml-3">
                            <Badge 
                              variant="outline"
                              className="flex items-center justify-center space-x-1 text-xs text-gray-500 border-gray-300 bg-transparent"
                            >
                              {getTypeIcon(item.details)}
                              <span className="capitalize">{item.details.toLowerCase()}</span>
                            </Badge>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-gray-600">Billing Date:</span>
                          
                          {editingItemId === item.id ? (
                            // Editing mode
                            <div className="flex items-center gap-1 ml-1">
                              <Input
                                type="date"
                                value={editingDate}
                                onChange={(e) => setEditingDate(e.target.value)}
                                className="h-6 w-36 text-xs"
                                disabled={isUpdating}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => saveDueDate(item.id)}
                                disabled={isUpdating}
                              >
                                <Check className="h-3 w-3 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={cancelEditingDate}
                                disabled={isUpdating}
                              >
                                <X className="h-3 w-3 text-gray-500" />
                              </Button>
                            </div>
                          ) : (
                            // Display mode
                            <div className="flex items-center gap-1 ml-1">
                              <span className="font-medium">
                                {item.billed_at 
                                  ? new Date(item.billed_at + 'T00:00:00').toLocaleDateString()
                                  : <span className={needsDueDate(item) ? "text-orange-600 font-semibold" : "text-orange-600"}>
                                      {needsDueDate(item) ? "⚠ Not set" : "Not set"}
                                    </span>
                                }
                              </span>
                              {isDeliverable(item) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-4 w-4 p-0 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => startEditingDate(item)}
                                >
                                  <Edit3 className="h-3 w-3 text-gray-400 hover:text-blue-600" />
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {item.line_total && (
                          <div className="flex justify-end">
                            <span className="text-gray-600">Total:</span>
                            <span className="font-medium ml-1">
                              ${Math.round(item.line_total).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Placeholder for Billing Status - will be added in future tasks */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground font-medium">Billing Details:</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-orange-600 font-medium">Not configured</span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="h-6 px-2 text-xs"
                  >
                    <Settings className="h-3 w-3 mr-1" />
                    Configure
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}