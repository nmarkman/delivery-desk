import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Clock, Calendar, Play, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface DailySyncSettings {
  enabled: boolean;
  syncTime: string;
  nextSyncAt: string | null;
  lastSyncAt: string | null;
  status: string;
  error: string | null;
}

export function DailySyncSettings() {
  const [settings, setSettings] = useState<DailySyncSettings>({
    enabled: true,
    syncTime: '02:00',
    nextSyncAt: null,
    lastSyncAt: null,
    status: 'pending',
    error: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  // Load current settings
  useEffect(() => {
    loadDailySyncSettings();
  }, []);

  const loadDailySyncSettings = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: connection, error } = await supabase
        .from('user_act_connections')
        .select(`
          daily_sync_enabled,
          daily_sync_time,
          next_sync_at,
          last_daily_sync_at,
          daily_sync_status,
          daily_sync_error
        `)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error) {
        console.error('Failed to load daily sync settings:', error);
        return;
      }

      if (connection) {
        setSettings({
          enabled: connection.daily_sync_enabled ?? true,
          syncTime: connection.daily_sync_time?.substring(0, 5) || '02:00',
          nextSyncAt: connection.next_sync_at,
          lastSyncAt: connection.last_daily_sync_at,
          status: connection.daily_sync_status || 'pending',
          error: connection.daily_sync_error
        });
      }
    } catch (error) {
      console.error('Exception loading daily sync settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const saveDailySyncSettings = async () => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Calculate next sync time
      const [hours, minutes] = settings.syncTime.split(':').map(Number);
      const nextSync = new Date();
      nextSync.setHours(hours, minutes, 0, 0);
      
      // If the time has already passed today, set for tomorrow
      if (nextSync <= new Date()) {
        nextSync.setDate(nextSync.getDate() + 1);
      }

      const { error } = await supabase
        .from('user_act_connections')
        .update({
          daily_sync_enabled: settings.enabled,
          daily_sync_time: `${settings.syncTime}:00`,
          next_sync_at: settings.enabled ? nextSync.toISOString() : null,
          daily_sync_status: 'pending',
          daily_sync_error: null
        })
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) {
        throw error;
      }

      // Update local settings
      setSettings(prev => ({
        ...prev,
        nextSyncAt: settings.enabled ? nextSync.toISOString() : null,
        status: 'pending',
        error: null
      }));

      toast({
        title: "Settings Saved",
        description: "Daily sync settings have been updated successfully.",
      });
    } catch (error) {
      console.error('Failed to save daily sync settings:', error);
      toast({
        title: "Save Failed",
        description: error instanceof Error ? error.message : "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const triggerManualDailySync = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('daily-sync', {
        body: { manual_trigger: true }
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Daily Sync Triggered",
        description: "Manual daily sync has been started. Check the history for results.",
      });

      // Refresh settings to show updated status
      setTimeout(() => {
        loadDailySyncSettings();
      }, 2000);
    } catch (error) {
      console.error('Failed to trigger daily sync:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to trigger daily sync",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const formatNextSync = (timestamp: string | null) => {
    if (!timestamp) return 'Not scheduled';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 24) {
      return `In ${diffHours} hours`;
    } else {
      return date.toLocaleDateString() + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
  };

  const getStatusBadge = () => {
    const statusConfig: Record<string, { variant: 'secondary' | 'default' | 'destructive', label: string, icon: any }> = {
      pending: { variant: 'secondary', label: 'Pending', icon: Clock },
      running: { variant: 'default', label: 'Running', icon: Play },
      success: { variant: 'default', label: 'Success', icon: CheckCircle2 },
      failed: { variant: 'destructive', label: 'Failed', icon: AlertCircle }
    };
    
    return statusConfig[settings.status] || statusConfig.pending;
  };

  const statusBadge = getStatusBadge();
  const StatusIcon = statusBadge.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Daily Sync Schedule
            </CardTitle>
            <CardDescription>
              Automatically sync your Act! data every day at a scheduled time
            </CardDescription>
          </div>
          <Badge 
            variant={statusBadge.variant} 
            className={settings.status === 'success' ? 'bg-green-500' : undefined}
          >
            <StatusIcon className="h-3 w-3 mr-1" />
            {statusBadge.label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Sync Toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="daily-sync-enabled" className="font-medium">
              Enable Daily Sync
            </Label>
            <p className="text-sm text-muted-foreground">
              Automatically sync opportunities and tasks from Act! CRM
            </p>
          </div>
          <Switch
            id="daily-sync-enabled"
            checked={settings.enabled}
            onCheckedChange={(enabled) => setSettings(prev => ({ ...prev, enabled }))}
            disabled={isLoading || isSaving}
          />
        </div>

        {settings.enabled && (
          <>
            {/* Sync Time Setting */}
            <div className="space-y-2">
              <Label htmlFor="sync-time" className="font-medium">
                Sync Time
              </Label>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="sync-time"
                  type="time"
                  value={settings.syncTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, syncTime: e.target.value }))}
                  className="w-32"
                  disabled={isLoading || isSaving}
                />
                <span className="text-sm text-muted-foreground">
                  ({Intl.DateTimeFormat().resolvedOptions().timeZone})
                </span>
              </div>
            </div>

            {/* Next Sync Info */}
            <div className="bg-muted/50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-muted-foreground">Next Sync:</span>
                  <p className="mt-1">{formatNextSync(settings.nextSyncAt)}</p>
                </div>
                {settings.lastSyncAt && (
                  <div>
                    <span className="font-medium text-muted-foreground">Last Sync:</span>
                    <p className="mt-1">
                      {new Date(settings.lastSyncAt).toLocaleDateString()} at{' '}
                      {new Date(settings.lastSyncAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Error Display */}
        {settings.error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Last sync failed: {settings.error}
            </AlertDescription>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <Button
            onClick={saveDailySyncSettings}
            disabled={isSaving || isLoading}
            className="flex-1"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </Button>
          
          {settings.enabled && (
            <Button
              variant="outline"
              onClick={triggerManualDailySync}
              disabled={isLoading || isSaving}
              className="flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              {isLoading ? 'Running...' : 'Run Now'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}