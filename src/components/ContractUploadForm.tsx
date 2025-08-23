import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from './ui/card';
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
  company_name?: string;
  total_contract_value?: number;
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
  const [isDragOver, setIsDragOver] = useState(false);
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
        
                                  console.log('Querying active opportunities...');
        // Filter for active opportunities: actual_close_date is null or in the future
        const { data, error } = await supabase
          .from('opportunities')
          .select('id, name, company_name, total_contract_value')
          .or('actual_close_date.is.null,actual_close_date.gt.' + new Date().toISOString().split('T')[0])
          .order('created_at', { ascending: false });
        
        console.log('Query result (active filter):', { data, error });

        if (error) {
          throw error;
        }

        if (data) {
          setOpportunities(data);
        } else {
          // Fallback to mock data if no opportunities found
          const mockOpportunities: Opportunity[] = [
            { id: '2a3b11a5-fe50-4c6b-8aad-15bf864b75f0', name: 'Website Development Project', company_name: 'ABC Corp', total_contract_value: 25000 },
            { id: 'opportunity-2', name: 'Marketing Campaign', company_name: 'XYZ Inc', total_contract_value: 15000 },
            { id: 'opportunity-3', name: 'Consulting Services', company_name: 'DEF Ltd', total_contract_value: 8000 },
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
          { id: '2a3b11a5-fe50-4c6b-8aad-15bf864b75f0', name: 'Website Development Project', company_name: 'ABC Corp', total_contract_value: 25000 },
          { id: 'opportunity-2', name: 'Marketing Campaign', company_name: 'XYZ Inc', total_contract_value: 15000 },
          { id: 'opportunity-3', name: 'Consulting Services', company_name: 'DEF Ltd', total_contract_value: 8000 },
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

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      onFileSelect(pdfFile);
      toast({
        title: "File Selected",
        description: pdfFile.name,
      });
    } else {
      toast({
        title: "Invalid File Type",
        description: "Please drop a PDF file",
        variant: "destructive",
      });
    }
  }, [onFileSelect, toast]);

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
      <CardContent className="space-y-6 pt-6">
        {/* File Upload Section */}
        <div className="space-y-4">
          <Label htmlFor="pdf-upload">Contract PDF</Label>
          <div 
            className={`border-2 border-dashed rounded-lg transition-all duration-200 ${
              isDragOver 
                ? 'border-blue-400 bg-blue-50 scale-[1.02]' 
                : selectedFile 
                  ? 'border-green-300 bg-green-50' 
                  : 'border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100'
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {!selectedFile ? (
              <div className="p-6 text-center">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <div className="text-sm text-gray-600 mb-2">
                  <span className="font-medium">Click to upload</span> or drag and drop
                </div>
                <div className="text-xs text-gray-500 mb-4">PDF files only</div>
                <Input
                  id="pdf-upload"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  disabled={isUploading}
                  className="hidden"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('pdf-upload')?.click()}
                  disabled={isUploading}
                  className="mx-auto"
                >
                  Choose PDF File
                </Button>
              </div>
            ) : (
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="font-medium text-green-800">{selectedFile.name}</div>
                      <div className="text-sm text-green-600">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={handleFileRemove}
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
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
              }>
                {selectedOpportunity && opportunities.length > 0 && (() => {
                  const selected = opportunities.find(opp => opp.id === selectedOpportunity);
                  if (selected) {
                    return (
                      <div className="flex flex-col w-full min-w-0">
                        <div className="flex items-center justify-between w-full">
                          <span className="truncate flex-1 text-left font-medium">
                            {selected.name}
                          </span>
                          <span className="text-sm text-gray-500 ml-2 flex-shrink-0">
                            ${selected.total_contract_value?.toLocaleString() || '0'}
                          </span>
                        </div>
                        {selected.company_name && (
                          <div className="text-xs text-gray-500 truncate">
                            {selected.company_name}
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {opportunities.map((opportunity) => (
                <SelectItem key={opportunity.id} value={opportunity.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{opportunity.name}</span>
                    {opportunity.company_name && (
                      <span className="text-sm text-gray-500">{opportunity.company_name}</span>
                    )}
                    {opportunity.total_contract_value && (
                      <span className="text-sm text-gray-500">
                        ${opportunity.total_contract_value.toLocaleString()}
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
        <div className="flex justify-center">
          <Button
            onClick={onUpload}
            disabled={!isFormValid}
            className="flex items-center justify-center space-x-2 px-8"
            size="lg"
          >
          {isUploading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Processing...</span>
            </>
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>Upload Contract</span>
            </>
          )}
        </Button>
        </div>

        {/* Form Status */}
        <div className="text-sm text-gray-600 text-center">
          {!selectedFile && "Select a PDF file to begin"}
          {selectedFile && !selectedOpportunity && "Choose an opportunity to continue"}
          {isFormValid && "Ready to upload and process"}
        </div>
      </CardContent>
    </Card>
  );
}
