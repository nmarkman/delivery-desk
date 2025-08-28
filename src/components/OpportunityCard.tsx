import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp, Settings } from 'lucide-react';

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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

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
            
            {/* Placeholder for Line Items - will be added in future tasks */}
            <div className="pt-3 border-t border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-muted-foreground font-medium">Line Items:</span>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 px-2 text-xs text-blue-600 hover:text-blue-700"
                >
                  Manage
                </Button>
              </div>
              <div className="text-xs text-muted-foreground italic pl-1">
                Line item management coming soon...
              </div>
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