import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore, addDays } from 'date-fns';
import DOMPurify from 'dompurify';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  status: string;
  priority: string | null;
  fee_amount: number | null;
  client_id: string | null;
  opportunity_id: string | null;
  act_raw_data?: any;
}

export default function DeliverablesReport() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDeliverables();
    }
  }, [user]);

  const fetchDeliverables = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('deliverables')
        .select('*')
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      if (error) throw error;
      console.log('Fetched deliverables:', data); // Debug log
      setDeliverables(data || []);
    } catch (error) {
      console.error('Error fetching deliverables:', error);
      setError(error instanceof Error ? error.message : 'Failed to load deliverables');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      completed: 'bg-success text-success-foreground',
      'in-progress': 'bg-warning text-warning-foreground',
      pending: 'bg-muted text-muted-foreground',
      overdue: 'bg-destructive text-destructive-foreground'
    };
    return variants[status as keyof typeof variants] || variants.pending;
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      high: 'bg-destructive text-destructive-foreground',
      medium: 'bg-warning text-warning-foreground',
      low: 'bg-muted text-muted-foreground'
    };
    return variants[priority as keyof typeof variants] || variants.medium;
  };

  const getClientName = (deliverable: Deliverable) => {
    // Try to extract from Act! raw data
    if (deliverable.act_raw_data?.contacts?.[0]?.displayName) {
      return deliverable.act_raw_data.contacts[0].displayName;
    }
    return 'Unknown';
  };

  const renderSafeHtml = (html: string | null) => {
    if (!html) return null;
    const sanitized = DOMPurify.sanitize(html);
    return <div dangerouslySetInnerHTML={{ __html: sanitized }} className="text-sm text-muted-foreground" />;
  };

  const getDeliverableStatus = (deliverable: Deliverable) => {
    const dueDate = new Date(deliverable.due_date);
    const today = new Date();
    const isOverdue = isBefore(dueDate, today) && deliverable.status !== 'completed';
    const isDueSoon = isAfter(dueDate, today) && isBefore(dueDate, addDays(today, 7));

    if (isOverdue) return 'overdue';
    if (deliverable.status === 'completed') return 'completed';
    if (isDueSoon) return 'due-soon';
    return deliverable.status;
  };

  const groupedDeliverables = {
    overdue: deliverables.filter(d => getDeliverableStatus(d) === 'overdue'),
    dueSoon: deliverables.filter(d => getDeliverableStatus(d) === 'due-soon'),
    inProgress: deliverables.filter(d => d.status === 'in-progress'),
    pending: deliverables.filter(d => d.status === 'pending' && getDeliverableStatus(d) !== 'overdue' && getDeliverableStatus(d) !== 'due-soon'),
    completed: deliverables.filter(d => d.status === 'completed')
  };

  const stats = {
    total: deliverables.length,
    overdue: groupedDeliverables.overdue.length,
    dueSoon: groupedDeliverables.dueSoon.length,
    completed: groupedDeliverables.completed.length
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
            Loading deliverables...
          </div>
        </div>
      </Layout>
    );
  }

  if (error) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="text-destructive">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium">Failed to load deliverables</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
            <Button onClick={fetchDeliverables} variant="outline">
              Try Again
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Deliverables Report</h1>
            <p className="text-muted-foreground">Track upcoming deliverables and deadlines</p>
          </div>
          <Button type="button">
            <Plus className="h-4 w-4 mr-2" />
            Add Deliverable
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFilter === 'all' ? 'ring-2 ring-primary' : ''
            }`}
            onClick={() => setSelectedFilter('all')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Deliverables</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFilter === 'overdue' ? 'ring-2 ring-destructive' : ''
            }`}
            onClick={() => setSelectedFilter('overdue')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFilter === 'due-soon' ? 'ring-2 ring-warning' : ''
            }`}
            onClick={() => setSelectedFilter('due-soon')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.dueSoon}</div>
            </CardContent>
          </Card>

          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedFilter === 'completed' ? 'ring-2 ring-success' : ''
            }`}
            onClick={() => setSelectedFilter('completed')}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-success">{stats.completed}</div>
            </CardContent>
          </Card>
        </div>

        {/* Deliverables List */}
        <Card>
          <CardContent className="p-0">
            {deliverables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No deliverables found.{' '}
                <Link to="/act-sync" className="text-primary hover:underline">
                  Connect to Act! CRM to see your tasks!
                </Link>
              </div>
            ) : selectedFilter === 'all' ? (
              // Show grouped view for "Total" filter
              <div>
                {/* Overdue Section */}
                {groupedDeliverables.overdue.length > 0 && (
                  <div>
                    <div className="px-4 py-3 bg-destructive/5 border-b border-destructive/20">
                      <h3 className="font-medium text-destructive flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        Overdue ({groupedDeliverables.overdue.length})
                      </h3>
                    </div>
                    <div className="divide-y">
                      {groupedDeliverables.overdue.map((deliverable) => (
                        <div key={deliverable.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{deliverable.title}</h4>
                                <Badge variant="destructive" className="shrink-0">
                                  Overdue
                                </Badge>
                              </div>
                              {deliverable.description && (
                                <div className="mb-2">
                                  {renderSafeHtml(deliverable.description)}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Client: {getClientName(deliverable)}</span>
                                <span className="text-destructive">
                                  Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                                </span>
                                {deliverable.fee_amount && deliverable.fee_amount > 0 && (
                                  <span>Fee: ${deliverable.fee_amount.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {deliverable.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {deliverable.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Due Soon Section */}
                {groupedDeliverables.dueSoon.length > 0 && (
                  <div>
                    <div className="px-4 py-3 bg-warning/5 border-b border-warning/20">
                      <h3 className="font-medium text-warning flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Due Soon ({groupedDeliverables.dueSoon.length})
                      </h3>
                    </div>
                    <div className="divide-y">
                      {groupedDeliverables.dueSoon.map((deliverable) => (
                        <div key={deliverable.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{deliverable.title}</h4>
                                <Badge variant="secondary" className="shrink-0">
                                  Due Soon
                                </Badge>
                              </div>
                              {deliverable.description && (
                                <div className="mb-2">
                                  {renderSafeHtml(deliverable.description)}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Client: {getClientName(deliverable)}</span>
                                <span className="text-warning">
                                  Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                                </span>
                                {deliverable.fee_amount && deliverable.fee_amount > 0 && (
                                  <span>Fee: ${deliverable.fee_amount.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {deliverable.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {deliverable.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Other Items Section */}
                {groupedDeliverables.pending.length > 0 && (
                  <div>
                    <div className="px-4 py-3 bg-muted/50 border-b">
                      <h3 className="font-medium text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Other ({groupedDeliverables.pending.length})
                      </h3>
                    </div>
                    <div className="divide-y">
                      {groupedDeliverables.pending.map((deliverable) => (
                        <div key={deliverable.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{deliverable.title}</h4>
                                <Badge variant="outline" className="shrink-0">
                                  {deliverable.status}
                                </Badge>
                              </div>
                              {deliverable.description && (
                                <div className="mb-2">
                                  {renderSafeHtml(deliverable.description)}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Client: {getClientName(deliverable)}</span>
                                <span>
                                  Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                                </span>
                                {deliverable.fee_amount && deliverable.fee_amount > 0 && (
                                  <span>Fee: ${deliverable.fee_amount.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {deliverable.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {deliverable.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Completed Section */}
                {groupedDeliverables.completed.length > 0 && (
                  <div>
                    <div className="px-4 py-3 bg-success/5 border-b border-success/20">
                      <h3 className="font-medium text-success flex items-center gap-2">
                        <CheckCircle className="h-4 w-4" />
                        Completed ({groupedDeliverables.completed.length})
                      </h3>
                    </div>
                    <div className="divide-y">
                      {groupedDeliverables.completed.map((deliverable) => (
                        <div key={deliverable.id} className="p-4 hover:bg-muted/50 transition-colors">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-medium truncate">{deliverable.title}</h4>
                                <Badge variant="default" className="shrink-0 bg-success text-success-foreground">
                                  Completed
                                </Badge>
                              </div>
                              {deliverable.description && (
                                <div className="mb-2">
                                  {renderSafeHtml(deliverable.description)}
                                </div>
                              )}
                              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                <span>Client: {getClientName(deliverable)}</span>
                                <span>
                                  Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                                </span>
                                {deliverable.fee_amount && deliverable.fee_amount > 0 && (
                                  <span>Fee: ${deliverable.fee_amount.toFixed(2)}</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {deliverable.priority && (
                                <Badge variant="outline" className="text-xs">
                                  {deliverable.priority}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // Show filtered view for other filters
              <div className="divide-y">
                {deliverables
                  .filter((deliverable) => {
                    const status = getDeliverableStatus(deliverable);
                    if (selectedFilter === 'overdue') return status === 'overdue';
                    if (selectedFilter === 'due-soon') return status === 'due-soon';
                    if (selectedFilter === 'completed') return status === 'completed';
                    return true;
                  })
                  .map((deliverable) => {
                    const status = getDeliverableStatus(deliverable);
                    const isOverdue = status === 'overdue';
                    const isDueSoon = status === 'due-soon';
                    
                    return (
                      <div key={deliverable.id} className="p-4 hover:bg-muted/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium truncate">{deliverable.title}</h4>
                              <Badge 
                                variant={isOverdue ? "destructive" : isDueSoon ? "secondary" : "outline"}
                                className="shrink-0"
                              >
                                {isOverdue ? 'Overdue' : isDueSoon ? 'Due Soon' : deliverable.status}
                              </Badge>
                            </div>
                            {deliverable.description && (
                              <div className="mb-2">
                                {renderSafeHtml(deliverable.description)}
                              </div>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>Client: {getClientName(deliverable)}</span>
                              <span className={isOverdue ? 'text-destructive' : isDueSoon ? 'text-warning' : ''}>
                                Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                              </span>
                              {deliverable.fee_amount && deliverable.fee_amount > 0 && (
                                <span>Fee: ${deliverable.fee_amount.toFixed(2)}</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {deliverable.priority && (
                              <Badge variant="outline" className="text-xs">
                                {deliverable.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}