import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Users, FileText, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

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

export default function Dashboard() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
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

      if (clientsResult.data) setClients(clientsResult.data);
      if (invoicesResult.data) setInvoices(invoicesResult.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

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
        <div className="text-muted-foreground">Loading dashboard...</div>
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
            <div className="text-2xl font-bold">${totalBalance.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              From {clients.length} clients
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{clients.length}</div>
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

      {/* Clients Overview */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Clients</CardTitle>
            <CardDescription>Your clients and their outstanding balances</CardDescription>
          </CardHeader>
          <CardContent>
            {clients.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No clients found. Start by adding your first client!
              </div>
            ) : (
              <div className="space-y-4">
                {clients.slice(0, 5).map((client) => (
                  <div key={client.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">{client.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Outstanding: ${(client.outstanding_balance || 0).toFixed(2)}
                      </p>
                    </div>
                    <Badge variant={client.outstanding_balance > 0 ? "destructive" : "default"}>
                      {client.outstanding_balance > 0 ? "Pending" : "Paid"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
            <CardDescription>Latest invoice activity</CardDescription>
          </CardHeader>
          <CardContent>
            {invoices.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                No invoices found. Create your first invoice!
              </div>
            ) : (
              <div className="space-y-4">
                {invoices.slice(0, 5).map((invoice) => (
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
    </div>
  );
}