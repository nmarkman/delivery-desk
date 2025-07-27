import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle, Settings, Globe } from 'lucide-react';
import { useActConnection } from '@/hooks/useActConnection';

interface ActConnectionFormProps {
  onConnectionSaved?: () => void;
}

const REGIONS = [
  { value: 'us', label: 'United States', endpoint: 'https://apius.act.com' },
  { value: 'ca', label: 'Canada', endpoint: 'https://apica.act.com' },
  { value: 'eu', label: 'Europe', endpoint: 'https://apieu.act.com' }
] as const;

export function ActConnectionForm({ onConnectionSaved }: ActConnectionFormProps) {
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    databaseName: '',
    region: 'us' as 'us' | 'ca' | 'eu',
    connectionName: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);

  const { isLoading, connectionStatus, testConnection, saveConnection, loadConnectionStatus } = useActConnection();

  useEffect(() => {
    loadConnectionStatus();
  }, [loadConnectionStatus]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.username.trim()) {
      errors.username = 'Username is required';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    }

    if (!formData.databaseName.trim()) {
      errors.databaseName = 'Database name is required';
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.databaseName)) {
      errors.databaseName = 'Database name can only contain letters, numbers, hyphens, and underscores';
    }

    if (!formData.region) {
      errors.region = 'Region is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleTestConnection = async () => {
    if (!validateForm()) return;

    setTestResult(null);
    const result = await testConnection(formData);
    setTestResult(result);
  };

  const handleSaveConnection = async () => {
    if (!validateForm()) return;

    const success = await saveConnection(formData);
    if (success) {
      setFormData({
        username: '',
        password: '',
        databaseName: '',
        region: 'us',
        connectionName: ''
      });
      setTestResult(null);
      onConnectionSaved?.();
    }
  };

  const selectedRegion = REGIONS.find(r => r.value === formData.region);

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Act! CRM Connection
        </CardTitle>
        <CardDescription>
          Configure your Act! CRM credentials and test the connection
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Status */}
        {connectionStatus.status !== 'untested' && (
          <Alert>
            <div className="flex items-center gap-2">
              {connectionStatus.isConnected ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <div>
                <div className="font-medium">
                  Current Status: <Badge variant={connectionStatus.isConnected ? 'default' : 'destructive'}>
                    {connectionStatus.status}
                  </Badge>
                </div>
                {connectionStatus.error && (
                  <AlertDescription className="mt-1 text-sm">
                    {connectionStatus.error}
                  </AlertDescription>
                )}
                {connectionStatus.lastTested && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Last tested: {new Date(connectionStatus.lastTested).toLocaleString()}
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Username */}
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="your-username"
              className={validationErrors.username ? 'border-red-500' : ''}
            />
            {validationErrors.username && (
              <p className="text-sm text-red-500">{validationErrors.username}</p>
            )}
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              placeholder="your-password"
              className={validationErrors.password ? 'border-red-500' : ''}
            />
            {validationErrors.password && (
              <p className="text-sm text-red-500">{validationErrors.password}</p>
            )}
          </div>

          {/* Database Name */}
          <div className="space-y-2">
            <Label htmlFor="databaseName">Database Name</Label>
            <Input
              id="databaseName"
              value={formData.databaseName}
              onChange={(e) => handleInputChange('databaseName', e.target.value)}
              placeholder="YourDatabase"
              className={validationErrors.databaseName ? 'border-red-500' : ''}
            />
            {validationErrors.databaseName && (
              <p className="text-sm text-red-500">{validationErrors.databaseName}</p>
            )}
          </div>

          {/* Region */}
          <div className="space-y-2">
            <Label htmlFor="region">Region</Label>
            <Select value={formData.region} onValueChange={(value: 'us' | 'ca' | 'eu') => handleInputChange('region', value)}>
              <SelectTrigger className={validationErrors.region ? 'border-red-500' : ''}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REGIONS.map((region) => (
                  <SelectItem key={region.value} value={region.value}>
                    <div className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      <div>
                        <div>{region.label}</div>
                        <div className="text-xs text-muted-foreground">{region.endpoint}</div>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.region && (
              <p className="text-sm text-red-500">{validationErrors.region}</p>
            )}
          </div>
        </div>

        {/* Connection Name (Optional) */}
        <div className="space-y-2">
          <Label htmlFor="connectionName">Connection Name (Optional)</Label>
          <Input
            id="connectionName"
            value={formData.connectionName}
            onChange={(e) => handleInputChange('connectionName', e.target.value)}
            placeholder={`${formData.databaseName || 'Database'} (${selectedRegion?.label || 'Region'})`}
          />
          <p className="text-xs text-muted-foreground">
            Friendly name to identify this connection
          </p>
        </div>

        {/* API Endpoint Info */}
        {selectedRegion && (
          <Alert>
            <Globe className="h-4 w-4" />
            <AlertDescription>
              <strong>API Endpoint:</strong> {selectedRegion.endpoint}
            </AlertDescription>
          </Alert>
        )}

        {/* Test Result */}
        {testResult && (
          <Alert variant={testResult.success ? 'default' : 'destructive'}>
            <div className="flex items-center gap-2">
              {testResult.success ? (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              ) : (
                <XCircle className="h-4 w-4 text-red-500" />
              )}
              <AlertDescription>
                {testResult.success ? 'Connection test successful!' : testResult.error}
              </AlertDescription>
            </div>
          </Alert>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-4">
          <Button
            onClick={handleTestConnection}
            disabled={isLoading}
            variant="outline"
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Testing...
              </>
            ) : (
              'Test Connection'
            )}
          </Button>

          <Button
            onClick={handleSaveConnection}
            disabled={isLoading || !testResult?.success}
            className="flex-1"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Connection'
            )}
          </Button>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          Your credentials are stored securely and used only for Act! CRM integration
        </p>
      </CardContent>
    </Card>
  );
} 