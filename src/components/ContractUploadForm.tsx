import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Upload, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

interface Opportunity {
  id: string;
  name: string;
  client_name?: string;
  value?: number;
}

interface ContractUploadFormProps {
  onFileSelect: (file: File) => void;
  onOpportunitySelect: (opportunityId: string) => void;
  onUpload: () => void;
  selectedFile: File | null;
  selectedOpportunity: string;
  isUploading: boolean;
  error: string | null;
}

export default function ContractUploadForm({
  onFileSelect,
  onOpportunitySelect,
  onUpload,
  selectedFile,
  selectedOpportunity,
  isUploading,
  error
}: ContractUploadFormProps) {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [isLoadingOpportunities, setIsLoadingOpportunities] = useState(false);
  const { toast } = useToast();

  // Load opportunities from Supabase
  useEffect(() => {
    const loadOpportunities = async () => {
      setIsLoadingOpportunities(true);
      try {
        // Import Supabase client dynamically
        const { createClient } = await import('@supabase/supabase-js');
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
        
        if (!supabaseUrl || !supabaseAnonKey) {
          throw new Error('Missing Supabase environment variables');
        }

        const supabase = createClient(supabaseUrl, supabaseAnonKey);
        
        const { data, error } = await supabase
          .from('opportunities')
          .select('id, name, client_name, value')
          .eq('is_active', true)
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        if (data) {
          setOpportunities(data);
        } else {
          // Fallback to mock data if no opportunities found
          const mockOpportunities: Opportunity[] = [
            { id: '2a3b11a5-fe50-4c6b-8aad-15bf864b75f0', name: 'Website Development Project', client_name: 'ABC Corp', value: 25000 },
            { id: 'opportunity-2', name: 'Marketing Campaign', client_name: 'XYZ Inc', value: 15000 },
            { id: 'opportunity-3', name: 'Consulting Services', client_name: 'DEF Ltd', value: 8000 },
          ];
          setOpportunities(mockOpportunities);
        }
      } catch (error) {
        console.error('Failed to load opportunities:', error);
        toast({
          title: "Error",
          description: "Failed to load opportunities from database",
          variant: "destructive",
        });
        
        // Fallback to mock data on error
        const mockOpportunities: Opportunity[] = [
          { id: '2a3b11a5-fe50-4c6b-8aad-15bf864b75f0', name: 'Website Development Project', client_name: 'ABC Corp', value: 25000 },
          { id: 'opportunity-2', name: 'Marketing Campaign', client_name: 'XYZ Inc', value: 15000 },
          { id: 'opportunity-3', name: 'Consulting Services', client_name: 'DEF Ltd', value: 8000 },
        ];
        setOpportunities(mockOpportunities);
      } finally {
        setIsLoadingOpportunities(false);
      }
    };

    loadOpportunities();
  }, [toast]);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        onFileSelect(file);
        toast({
          title: "File Selected",
          description: file.name,
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please select a PDF file",
          variant: "destructive",
        });
      }
    }
  };

  const handleFileRemove = () => {
    onFileSelect(null as any);
    // Reset the file input
    const fileInput = document.getElementById('pdf-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleOpportunitySelect = (opportunityId: string) => {
    onOpportunitySelect(opportunityId);
    const opportunity = opportunities.find(opp => opp.id === opportunityId);
    if (opportunity) {
      toast({
        title: "Opportunity Selected",
        description: opportunity.name,
      });
    }
  };

  const isFormValid = selectedFile && selectedOpportunity && !isUploading;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload Contract PDF</CardTitle>
        <CardDescription>
          Select a contract PDF and choose an opportunity to associate the line items with
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <Label htmlFor="pdf-upload">Contract PDF</Label>
          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <Input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="flex-1"
              />
              {selectedFile && (
                <Button
                  onClick={handleFileRemove}
                  variant="outline"
                  size="sm"
                  disabled={isUploading}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            {selectedFile && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <div className="font-medium text-green-800">{selectedFile.name}</div>
                  <div className="text-sm text-green-600">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Opportunity Selection */}
        <div className="space-y-4">
          <Label htmlFor="opportunity-select">Opportunity</Label>
          <Select
            value={selectedOpportunity}
            onValueChange={handleOpportunitySelect}
            disabled={isUploading || isLoadingOpportunities}
          >
            <SelectTrigger>
              <SelectValue placeholder={
                isLoadingOpportunities ? "Loading opportunities..." : "Choose an opportunity"
              } />
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((opportunity) => (
                <SelectItem key={opportunity.id} value={opportunity.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opportunity.name}</span>
                    {opportunity.client_name && (
                      <span className="text-sm text-gray-500">{opportunity.client_name}</span>
                    )}
                    {opportunity.value && (
                      <span className="text-sm text-gray-500">
                        ${opportunity.value.toLocaleString()}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Error Display */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Upload Button */}
        <Button
          onClick={onUpload}
          disabled={!isFormValid}
          className="w-full flex items-center justify-center space-x-2"
          size="lg"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Uploading & Parsing...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>Upload & Parse Contract</span>
            </>
          )}
        </Button>

        {/* Form Status */}
        <div className="text-sm text-gray-600 text-center">
          {!selectedFile && "Select a PDF file to begin"}
          {selectedFile && !selectedOpportunity && "Choose an opportunity to continue"}
          {isFormValid && "Ready to upload and parse"}
        </div>
      </CardContent>
    </Card>
  );
}
