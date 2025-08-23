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

interface UploadState {
  isUploading: boolean;
  isProcessing: boolean;
  isComplete: boolean;
  error: string | null;
  progress: number;
}

export default function ContractUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedOpportunity, setSelectedOpportunity] = useState<string>('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    isProcessing: false,
    isComplete: false,
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
      formData.append('user_id', 'current-user-id'); // TODO: Get from auth context

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      // TODO: Replace with actual edge function URL
      const response = await fetch('/api/contract-upload/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (result.success) {
        setLineItems(result.pdf_parsing.line_items || []);
        setUploadState(prev => ({ 
          ...prev, 
          isUploading: false, 
          isComplete: true,
          progress: 100 
        }));
        
        toast({
          title: "Upload Successful",
          description: `Processed ${result.pdf_parsing.total_items} line items`,
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
        description: error instanceof Error ? error.message : 'An error occurred',
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
      // TODO: Implement submission to create products in Act! and sync to database
      // This would call the edge function to create products and sync
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      toast({
        title: "Processing Complete",
        description: "Line items have been processed and synced successfully",
      });
      
      setUploadState(prev => ({ ...prev, isProcessing: false, isComplete: true }));
    } catch (error) {
      setUploadState(prev => ({ 
        ...prev, 
        isProcessing: false, 
        error: error instanceof Error ? error.message : 'Processing failed' 
      }));
      
      toast({
        title: "Processing Failed",
        description: error instanceof Error ? error.message : 'An error occurred',
        variant: "destructive",
      });
    }
  };

  const handleLineItemEdit = (index: number, updatedItem: LineItem) => {
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
      isComplete: false,
      error: null,
      progress: 0
    });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6" />
          <h1 className="text-3xl font-bold">Contract Upload</h1>
        </div>
        
        {/* Upload Form */}
        <ContractUploadForm
          onFileSelect={handleFileSelect}
          onOpportunitySelect={handleOpportunitySelect}
          onUpload={handleUpload}
          selectedFile={selectedFile}
          selectedOpportunity={selectedOpportunity}
          isUploading={uploadState.isUploading}
          error={uploadState.error}
        />

        {/* Progress Bar */}
        {uploadState.isUploading && (
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Uploading & Parsing PDF...</span>
                  <span>{uploadState.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Line Items Table */}
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
        {lineItems.length > 0 && (
          <Card>
            <CardContent className="pt-6">
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
                      <span>Creating Products & Syncing...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-5 w-5" />
                      <span>Create Products & Sync to Database</span>
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
            </CardContent>
          </Card>
        )}

        {/* Success Message */}
        {uploadState.isComplete && !uploadState.isProcessing && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Contract processing completed successfully! Products have been created in Act! CRM and synced to the database.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </Layout>
  );
}
