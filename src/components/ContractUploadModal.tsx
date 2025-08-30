import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, AlertCircle, X, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import LineItemsTable from './LineItemsTable';

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

interface ContractUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunityId: string;
  opportunityName: string;
  companyName: string;
  onUploadSuccess?: () => void;
}

export default function ContractUploadModal({
  isOpen,
  onClose,
  opportunityId,
  opportunityName,
  companyName,
  onUploadSuccess
}: ContractUploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [lineItems, setLineItems] = useState<DisplayItem[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    isProcessing: false,
    isUploadComplete: false,
    isProcessingComplete: false,
    error: null,
    progress: 0
  });
  
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === 'application/pdf') {
        setSelectedFile(file);
        setUploadState(prev => ({ ...prev, error: null }));
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
    setSelectedFile(null);
    // Reset the file input
    const fileInput = document.getElementById('modal-pdf-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const pdfFile = files.find(file => file.type === 'application/pdf');
    
    if (pdfFile) {
      setSelectedFile(pdfFile);
      setUploadState(prev => ({ ...prev, error: null }));
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
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadState(prev => ({ 
        ...prev, 
        error: 'Please select a PDF file' 
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
      formData.append('opportunity_id', opportunityId);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + Math.random() * 8, 75)
        }));
      }, 500);

      // Call the Supabase Edge Function
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
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
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      
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
          opportunity_id: opportunityId
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
        
        // Call success callback to refresh parent component
        if (onUploadSuccess) {
          onUploadSuccess();
        }
        
        // Auto-close modal after successful creation
        setTimeout(() => {
          handleClose();
        }, 1500); // Wait 1.5 seconds to let user see the success message
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
    setLineItems([]);
    setUploadState({
      isUploading: false,
      isProcessing: false,
      isUploadComplete: false,
      isProcessingComplete: false,
      error: null,
      progress: 0
    });
    // Reset file input
    const fileInput = document.getElementById('modal-pdf-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleModalOpenChange = (open: boolean) => {
    // Only allow closing when not actively uploading or processing
    if (!open && !uploadState.isUploading && !uploadState.isProcessing) {
      handleClose();
    }
  };

  const isFormValid = selectedFile && !uploadState.isUploading;

  return (
    <Dialog open={isOpen} onOpenChange={handleModalOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Line Items</DialogTitle>
          <DialogDescription>
            For <strong>{opportunityName}</strong> at <strong>{companyName}</strong>
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* File Upload Section - Show as optional addition */}
          {!uploadState.isUploadComplete && lineItems.length === 0 && (
            <div className="border-t pt-3">
              <div className="text-center mb-2">
                <span className="text-sm font-medium text-gray-900">Upload a PDF</span>
                <p className="text-xs text-gray-600">Extract line items automatically from your contract</p>
              </div>
              <div className="space-y-3">
                <div 
                  className={`border border-dashed rounded-lg transition-colors ${
                    isDragOver 
                      ? 'border-blue-400 bg-blue-50' 
                      : selectedFile 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-gray-300 hover:border-gray-400'
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                    {!selectedFile ? (
                      <div className="p-3 text-center">
                        <Upload className="h-5 w-5 text-gray-400 mx-auto mb-1" />
                        <div className="text-xs text-gray-600 mb-2">
                          Drop PDF or <button className="font-medium text-blue-600 hover:underline" onClick={() => document.getElementById('modal-pdf-upload')?.click()}>choose file</button>
                        </div>
                        <Input
                          id="modal-pdf-upload"
                          type="file"
                          accept=".pdf"
                          onChange={handleFileSelect}
                          disabled={uploadState.isUploading}
                          className="hidden"
                        />
                      </div>
                    ) : (
                      <div className="p-2 flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium text-green-800">{selectedFile.name}</span>
                          <span className="text-xs text-green-600">({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)</span>
                        </div>
                        <Button
                          onClick={handleFileRemove}
                          variant="ghost"
                          size="sm"
                          disabled={uploadState.isUploading}
                          className="h-6 w-6 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                </div>

                {uploadState.error && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{uploadState.error}</AlertDescription>
                  </Alert>
                )}

                {selectedFile && (
                  <div className="flex justify-center">
                    <Button
                      onClick={handleUpload}
                      disabled={!isFormValid}
                      className="flex items-center space-x-2"
                      size="sm"
                    >
                      {uploadState.isUploading ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="h-4 w-4" />
                          <span>Upload</span>
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Line Items Table - Always show for manual addition or extracted items */}
          <LineItemsTable
            lineItems={lineItems}
            onLineItemsChange={setLineItems}
            onDelete={handleLineItemDelete}
            onEdit={handleLineItemEdit}
            isProcessing={uploadState.isProcessing}
            onSubmit={handleSubmit}
            onReset={resetForm}
            showActionButtons={lineItems.length > 0 && !uploadState.isProcessingComplete}
          />

          {/* Progress Bar - Only show when uploading */}
          {uploadState.isUploading && (
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

          {/* Processing Progress - Show when processing */}
          {uploadState.isProcessing && (
            <Card>
              <CardContent className="pt-6">
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
              <div className="flex justify-center space-x-4">
                <Button
                  onClick={resetForm}
                  variant="outline"
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  <RotateCcw className="h-5 w-5" />
                  <span>Process Another Contract</span>
                </Button>
                
                <Button
                  onClick={handleClose}
                  size="lg"
                  className="flex items-center space-x-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  <span>Done</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}