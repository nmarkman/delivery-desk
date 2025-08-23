import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription } from '../components/ui/alert';
import { Loader2, FileText, CheckCircle, AlertCircle, Play, RotateCcw } from 'lucide-react';
import { useToast } from '../hooks/use-toast';
import ContractUploadForm from '../components/ContractUploadForm';
import LineItemsTable from '../components/LineItemsTable';
import { Layout } from '../components/Layout';

interface LineItem {
  type: 'retainer' | 'deliverable';
  name: string;
  amount: number;
  date?: string;
  original_text: string;
}

// Act! Product interface for processed line items
interface ActProduct {
  id: string;
  name: string;
  price: number;
  quantity: number;
  itemNumber: string; // Date string that will be parsed to billed_at
  type: string; // e.g., "Retainer", "Deliverable"
  total: number;
  opportunityID: string;
  created?: string;
  edited?: string;
}

// Union type for both parsed and processed items
type DisplayItem = LineItem | ActProduct;

interface UploadState {
  isUploading: boolean;
  isProcessing: boolean;
  isUploadComplete: boolean;
  isProcessingComplete: boolean;
  error: string | null;
  progress: number;
}

export default function ContractUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>('');
  const [lineItems, setLineItems] = useState<DisplayItem[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    isProcessing: false,
    isUploadComplete: false,
    isProcessingComplete: false,
    error: null,
    progress: 0
  });
  
  const { toast } = useToast();

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setUploadState(prev => ({ ...prev, error: null }));
  };

  const handleOpportunitySelect = (opportunityId: string) => {
    setSelectedOpportunity(opportunityId);
  };

  const handleUpload = async () => {
    if (!selectedFile || !selectedOpportunity) {
      setUploadState(prev => ({ 
        ...prev, 
        error: 'Please select both a PDF file and an opportunity' 
      }));
      return;
    }

    setUploadState(prev => ({ 
      ...prev, 
      isUploading: true, 
      error: null,
      progress: 0 
    }));

    try {
      const formData = new FormData();
      formData.append('pdf', selectedFile);
      formData.append('opportunity_id', selectedOpportunity);
      // user_id will be extracted from JWT token in the Edge Function

      // Simulate progress with slower, more realistic timing
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 8, 75)
        }));
      }, 500);

      // Call the actual Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Get the user's JWT token from Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No active session found. Please log in again.');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/contract-upload/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Upload failed: ${response.statusText}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If we can't parse the error, use the status text
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      
      if (result.success) {
        // Use the processed/expanded line items that match what's in the database
        const processedItems = result.processed_line_items?.line_items || result.pdf_parsing.line_items || [];
        setLineItems(processedItems);
        setUploadState(prev => ({ 
          ...prev, 
          isUploading: false, 
          isUploadComplete: true,
          progress: 100 
        }));
        
        const totalItems = result.processed_line_items?.total_items || result.pdf_parsing.total_items || 0;
        toast({
          title: "Contract Uploaded Successfully",
          description: `Found ${totalItems} items in your contract (${result.processed_line_items?.retainers_count || 0} retainers, ${result.processed_line_items?.deliverables_count || 0} deliverables)`,
        });
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {
      setUploadState(prev => ({ 
        ...prev, 
        isUploading: false, 
        error: error instanceof Error ? error.message : 'Upload failed' 
      }));
      
              toast({
          title: "Upload Failed",
          description: error instanceof Error ? error.message : 'Something went wrong while uploading your contract',
          variant: "destructive",
        });
    }
  };

  const handleSubmit = async () => {
    if (lineItems.length === 0) {
      setUploadState(prev => ({ ...prev, error: 'No line items to process' }));
      return;
    }

    setUploadState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      // Call the submit endpoint with the actual reviewed line items
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
      // Get the user's JWT token from Supabase client
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(supabaseUrl, import.meta.env.VITE_SUPABASE_ANON_KEY);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        throw new Error('No active session found. Please log in again.');
      }
      
      const response = await fetch(`${supabaseUrl}/functions/v1/contract-upload/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          line_items: lineItems,
          opportunity_id: selectedOpportunity
        }),
      });

      if (!response.ok) {
        throw new Error(`Processing failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        toast({
          title: "Products Created Successfully",
          description: `Successfully created ${result.workflow_steps.step1_act_creation.successful_creations} products in Act! CRM and updated your database`,
        });
        
        setUploadState(prev => ({ ...prev, isProcessing: false, isProcessingComplete: true }));
      } else {
        throw new Error(result.message || 'Processing failed');
      }
    } catch (error) {
      setUploadState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Processing failed' 
      }));
      
              toast({
          title: "Processing Failed",
          description: error instanceof Error ? error.message : 'Something went wrong while creating your products',
          variant: "destructive",
        });
    }
  };

  const handleLineItemEdit = (index: number, updatedItem: DisplayItem) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = updatedItem;
    setLineItems(newLineItems);
  };

  const handleLineItemDelete = (index: number) => {
    const newLineItems = lineItems.filter((_, i) => i !== index);
    setLineItems(newLineItems);
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedOpportunity('');
    setLineItems([]);
    setUploadState({
      isUploading: false,
      isProcessing: false,
      isUploadComplete: false,
      isProcessingComplete: false,
      error: null,
      progress: 0
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Upload Contract PDF</h1>
          <p className="text-gray-600 text-lg">Select a contract/agreement, choose an opportunity to associate billing line items with, and click upload to process!</p>
        </div>
        
        {/* Upload Form - Only show when no line items have been extracted */}
        {lineItems.length === 0 && (
          <ContractUploadForm
            onFileSelect={handleFileSelect}
            onOpportunitySelect={handleOpportunitySelect}
            onUpload={handleUpload}
            selectedFile={selectedFile}
            selectedOpportunity={selectedOpportunity}
            isUploading={uploadState.isUploading}
            error={uploadState.error}
          />
        )}

        {/* Progress Bar - Only show when uploading and no line items yet */}
        {uploadState.isUploading && lineItems.length === 0 && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Processing your contract...</span>
                  <span>{Math.round(uploadState.progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
                <div className="text-xs text-gray-600 text-center">
                  {uploadState.progress < 30 && "Uploading your contract..."}
                  {uploadState.progress >= 30 && uploadState.progress < 70 && "Analyzing contract content..."}
                  {uploadState.progress >= 70 && uploadState.progress < 85 && "Retrieving line items..."}
                  {uploadState.progress >= 85 && "Almost done..."}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Extracted Line Items */}
        {lineItems.length > 0 && (
          <LineItemsTable
            lineItems={lineItems}
            onLineItemsChange={setLineItems}
            onDelete={handleLineItemDelete}
            onEdit={handleLineItemEdit}
            isProcessing={uploadState.isProcessing}
          />
        )}

        {/* Action Buttons */}
        {lineItems.length > 0 && !uploadState.isProcessingComplete && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Ready to Create Products?</h3>
                  <p className="text-gray-600 text-sm">Click the button below to create these as products in Act! associated with your opportunity</p>
                </div>
                <div className="flex space-x-4">
                  <Button
                    onClick={handleSubmit}
                    disabled={uploadState.isProcessing}
                    className="flex items-center space-x-2"
                    size="lg"
                  >
                    {uploadState.isProcessing ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span>Creating Products...</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-5 w-5" />
                        <span>Create & Assign Products</span>
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={resetForm}
                    variant="outline"
                    disabled={uploadState.isProcessing}
                    size="lg"
                    className="flex items-center space-x-2"
                  >
                    <RotateCcw className="h-5 w-5" />
                    <span>Start Over</span>
                  </Button>
                </div>
                
                {/* Processing Progress */}
                {uploadState.isProcessing && (
                  <div className="space-y-2">
                                    <div className="flex justify-between text-sm">
                  <span>Processing your contract...</span>
                  <span>Creating products in Act! CRM</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full animate-pulse" style={{ width: '100%' }} />
                </div>
                <div className="text-xs text-gray-600 text-center">
                  Creating products → Fetching details → Updating database
                </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Success Message - Only show after final processing is complete */}
        {uploadState.isProcessingComplete && !uploadState.isProcessing && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Great! Your contract has been processed successfully. All products have been created in Act! CRM and assigned to your opportunity.
              </AlertDescription>
            </Alert>
            
            {/* Start Over Button after completion */}
            <div className="flex justify-center">
              <Button
                onClick={resetForm}
                variant="outline"
                size="lg"
                className="flex items-center space-x-2"
              >
                <RotateCcw className="h-5 w-5" />
                <span>Process Another Contract</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
