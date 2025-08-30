import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Clock, 
  ChevronDown, 
  ChevronRight,
  Database,
  Users,
  Calendar
} from 'lucide-react';

interface SyncError {
  record_id?: string;
  error_type: 'validation' | 'database' | 'api' | 'mapping';
  error_message: string;
  error_details?: any;
}

interface SyncResult {
  success: boolean;
  operation_type: string;
  started_at: string;
  completed_at?: string;
  total_records_processed: number;
  records_created: number;
  records_updated: number;
  records_failed: number;
  errors: SyncError[];
  warnings: string[];
  batch_id: string;
  duration_ms?: number;
}

interface SyncResultsDisplayProps {
  results?: {
    opportunities_data?: {
      success: boolean;
      data?: {
        sync_result?: SyncResult;
        api_response?: {
          count: number;
          sample_structure: string[];
        };
      };
    };
    tasks_data?: {
      success: boolean;
      data?: {
        sync_result?: SyncResult;
        api_response?: {
          count: number;
          sample_structure: string[];
        };
      };
    };
  };
  operationType: 'analysis' | 'sync';
}

export function SyncResultsDisplay({ results, operationType }: SyncResultsDisplayProps) {
  const [expandedSections, setExpandedSections] = React.useState<Record<string, boolean>>({
    opportunities: false,
    tasks: false,
    errors: false,
    warnings: false
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!results) {
    return null;
  }

  const oppsResult = results.opportunities_data?.data?.sync_result;
  // const tasksResult = results.tasks_data?.data?.sync_result; // DISABLED: Task sync is disabled

  const getTotalStats = () => {
    // Only include opportunities data since task sync is disabled
    const total = {
      processed: (oppsResult?.total_records_processed || 0),
      created: (oppsResult?.records_created || 0),
      updated: (oppsResult?.records_updated || 0),
      failed: (oppsResult?.records_failed || 0),
      errors: [...(oppsResult?.errors || [])],
      warnings: [...(oppsResult?.warnings || [])]
    };
    return total;
  };

  const totalStats = getTotalStats();
  const successRate = totalStats.processed > 0 ? 
    ((totalStats.created + totalStats.updated) / totalStats.processed) * 100 : 0;

  const formatDuration = (ms?: number) => {
    if (!ms) return 'N/A';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle2 className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    );
  };

  return (
    <div className="space-y-4">
      {/* Overall Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            {operationType === 'analysis' ? 'Analysis Results' : 'Sync Results'}
          </CardTitle>
          <CardDescription>
            {operationType === 'analysis' 
              ? 'Data structure analysis from Act! CRM'
              : 'Synchronization results from Act! CRM to database'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Success Rate */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Success Rate</span>
              <span>{successRate.toFixed(1)}%</span>
            </div>
            <Progress value={successRate} className="h-2" />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalStats.processed}</div>
              <div className="text-xs text-muted-foreground">Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{totalStats.created}</div>
              <div className="text-xs text-muted-foreground">Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{totalStats.updated}</div>
              <div className="text-xs text-muted-foreground">Updated</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{totalStats.failed}</div>
              <div className="text-xs text-muted-foreground">Failed</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Opportunities */}
        {results.opportunities_data && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Opportunities
                </div>
                {getStatusIcon(results.opportunities_data.success)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {oppsResult && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-green-600">{oppsResult.records_created}</div>
                      <div className="text-xs text-muted-foreground">Created</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-orange-600">{oppsResult.records_updated}</div>
                      <div className="text-xs text-muted-foreground">Updated</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{oppsResult.records_failed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duration: {formatDuration(oppsResult.duration_ms)}
                  </div>

                  {oppsResult.warnings.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between p-2 h-auto"
                          onClick={() => toggleSection('opportunities')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            {oppsResult.warnings.length} warnings
                          </div>
                          {expandedSections.opportunities ? 
                            <ChevronDown className="h-3 w-3" /> : 
                            <ChevronRight className="h-3 w-3" />
                          }
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {oppsResult.warnings.slice(0, 5).map((warning, i) => (
                            <div key={i} className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              {warning}
                            </div>
                          ))}
                          {oppsResult.warnings.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              +{oppsResult.warnings.length - 5} more warnings...
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Tasks/Deliverables - DISABLED: Task sync is no longer active */}
        {/* {results.tasks_data && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-base">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Deliverables
                </div>
                {getStatusIcon(results.tasks_data.success)}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {tasksResult && (
                <>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <div className="text-center">
                      <div className="font-medium text-green-600">{tasksResult.records_created}</div>
                      <div className="text-xs text-muted-foreground">Created</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-orange-600">{tasksResult.records_updated}</div>
                      <div className="text-xs text-muted-foreground">Updated</div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium text-red-600">{tasksResult.records_failed}</div>
                      <div className="text-xs text-muted-foreground">Failed</div>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Duration: {formatDuration(tasksResult.duration_ms)}
                  </div>

                  {tasksResult.warnings.length > 0 && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-between p-2 h-auto"
                          onClick={() => toggleSection('tasks')}
                        >
                          <div className="flex items-center gap-1 text-xs">
                            <AlertTriangle className="h-3 w-3 text-yellow-500" />
                            {tasksResult.warnings.length} warnings
                          </div>
                          {expandedSections.tasks ? 
                            <ChevronDown className="h-3 w-3" /> : 
                            <ChevronRight className="h-3 w-3" />
                          }
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                          {tasksResult.warnings.slice(0, 5).map((warning, i) => (
                            <div key={i} className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded">
                              {warning}
                            </div>
                          ))}
                          {tasksResult.warnings.length > 5 && (
                            <div className="text-xs text-muted-foreground">
                              +{tasksResult.warnings.length - 5} more warnings...
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        )} */}
      </div>

      {/* Errors Section */}
      {totalStats.errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <XCircle className="h-4 w-4 text-red-500" />
              Errors ({totalStats.errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {totalStats.errors.slice(0, 10).map((error, i) => (
                <Alert key={i} variant="destructive" className="py-2">
                  <AlertDescription className="text-sm">
                    <div className="font-medium">{error.error_type} error</div>
                    <div className="text-xs mt-1">{error.error_message}</div>
                    {error.record_id && (
                      <div className="text-xs text-muted-foreground mt-1">
                        Record: {error.record_id}
                      </div>
                    )}
                  </AlertDescription>
                </Alert>
              ))}
              {totalStats.errors.length > 10 && (
                <div className="text-sm text-muted-foreground text-center">
                  +{totalStats.errors.length - 10} more errors...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
} 