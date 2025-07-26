import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, AlertCircle, CheckCircle, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, isAfter, isBefore, addDays } from 'date-fns';

interface Deliverable {
  id: string;
  title: string;
  description: string;
  due_date: string;
  status: string;
  priority: string;
  client_id: string;
  clients: { name: string };
}

export default function DeliverablesReport() {
  console.log('🔄 DeliverablesReport: Component render started');
  
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('🔄 DeliverablesReport: Current state', { 
    userExists: !!user, 
    authLoading, 
    deliverablesCount: deliverables.length,
    loading 
  });

  useEffect(() => {
    console.log('🔄 DeliverablesReport: Auth useEffect triggered', { authLoading, userExists: !!user });
    if (!authLoading && !user) {
      console.log('🚨 DeliverablesReport: No user found, navigating to auth');
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    console.log('🔄 DeliverablesReport: Data fetch useEffect triggered', { userExists: !!user });
    if (user) {
      console.log('✅ DeliverablesReport: User found, fetching deliverables');
      fetchDeliverables();
    }
  }, [user]);

  const fetchDeliverables = async () => {
    console.log('📡 DeliverablesReport: fetchDeliverables started');
    try {
      const { data, error } = await supabase
        .from('deliverables')
        .select(`
          *,
          clients (name)
        `)
        .eq('user_id', user?.id)
        .order('due_date', { ascending: true });

      console.log('📡 DeliverablesReport: Data fetched', { error, dataCount: data?.length });
      if (error) throw error;
      if (data) {
        console.log('📡 DeliverablesReport: Setting deliverables state');
        setDeliverables(data);
      }
    } catch (error) {
      console.error('📡 DeliverablesReport: Error fetching deliverables:', error);
    } finally {
      console.log('📡 DeliverablesReport: Setting loading to false');
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

  if (authLoading || loading) {
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
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Deliverables</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats.overdue}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Due Soon</CardTitle>
            <Clock className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{stats.dueSoon}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{stats.completed}</div>
          </CardContent>
        </Card>
      </div>

      {/* Deliverables by Status */}
      <div className="space-y-6">
        {/* Overdue Items */}
        {groupedDeliverables.overdue.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-destructive flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Overdue Deliverables
              </CardTitle>
              <CardDescription>Items that need immediate attention</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupedDeliverables.overdue.map((deliverable) => (
                  <div key={deliverable.id} className="border border-destructive/20 rounded-lg p-4 bg-destructive/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{deliverable.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-muted-foreground">
                            Client: {deliverable.clients?.name}
                          </span>
                          <span className="text-sm text-destructive">
                            Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityBadge(deliverable.priority)}>
                          {deliverable.priority}
                        </Badge>
                        <Badge className="bg-destructive text-destructive-foreground">
                          Overdue
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Due Soon */}
        {groupedDeliverables.dueSoon.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-warning flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Due Soon (Next 7 Days)
              </CardTitle>
              <CardDescription>Items approaching their deadline</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {groupedDeliverables.dueSoon.map((deliverable) => (
                  <div key={deliverable.id} className="border border-warning/20 rounded-lg p-4 bg-warning/5">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{deliverable.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-muted-foreground">
                            Client: {deliverable.clients?.name}
                          </span>
                          <span className="text-sm text-warning">
                            Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityBadge(deliverable.priority)}>
                          {deliverable.priority}
                        </Badge>
                        <Badge className={getStatusBadge(deliverable.status)}>
                          {deliverable.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Deliverables */}
        <Card>
          <CardHeader>
            <CardTitle>All Deliverables</CardTitle>
            <CardDescription>Complete timeline of deliverables by status</CardDescription>
          </CardHeader>
          <CardContent>
            {deliverables.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No deliverables found. Add your first deliverable to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {deliverables.map((deliverable) => (
                  <div key={deliverable.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{deliverable.title}</h4>
                        <p className="text-sm text-muted-foreground mt-1">{deliverable.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <span className="text-sm text-muted-foreground">
                            Client: {deliverable.clients?.name}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Due: {format(new Date(deliverable.due_date), 'MMM dd, yyyy')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityBadge(deliverable.priority)}>
                          {deliverable.priority}
                        </Badge>
                        <Badge className={getStatusBadge(getDeliverableStatus(deliverable))}>
                          {getDeliverableStatus(deliverable) === 'due-soon' ? 'Due Soon' : deliverable.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
    </Layout>
  );
}