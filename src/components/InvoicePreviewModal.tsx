import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Download, Send, CheckCircle, Loader2, DollarSign } from 'lucide-react';
import { InvoiceTemplate, type InvoiceData } from '@/components/invoices/InvoiceTemplate';
import { downloadInvoicePDF } from '@/utils/pdfGenerator';
import { parseInvoiceNumber, extractClientShortform } from '@/utils/invoiceHelpers';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InvoicePreviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoiceData: InvoiceData | null;
  lineItemId: string | null;
  onStatusChange?: () => void;
}

export default function InvoicePreviewModal({
  open,
  onOpenChange,
  invoiceData,
  lineItemId,
  onStatusChange,
}: InvoicePreviewModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Reset updating state when modal closes
  useEffect(() => {
    if (!open) {
      setIsUpdating(false);
      setIsDownloading(false);
    }
  }, [open]);

  if (!invoiceData) {
    return null;
  }

  const handleDownloadPDF = async () => {
    if (!invoiceData.invoice_number) {
      toast.error('Cannot download PDF', {
        description: 'This invoice needs an invoice number first.'
      });
      return;
    }

    setIsDownloading(true);
    try {
      const parsedInvoice = parseInvoiceNumber(invoiceData.invoice_number);
      const clientShortform = parsedInvoice?.shortform || extractClientShortform(invoiceData.billing_info.organization_name);

      await downloadInvoicePDF(invoiceData.invoice_number, clientShortform);

      toast.success('PDF Downloaded', {
        description: `Invoice ${invoiceData.invoice_number} has been downloaded.`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('PDF Generation Failed', {
        description: 'There was an error generating the PDF. Please try again.'
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const handleMarkAsSent = async () => {
    if (!lineItemId) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('invoice_line_items')
        .update({
          invoice_status: 'sent',
          sent_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', lineItemId);

      if (error) throw error;

      toast.success('Invoice marked as sent');
      if (onStatusChange) onStatusChange();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking invoice as sent:', error);
      toast.error('Failed to mark invoice as sent');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!lineItemId) return;

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('invoice_line_items')
        .update({
          invoice_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', lineItemId);

      if (error) throw error;

      toast.success('Invoice marked as paid');
      if (onStatusChange) onStatusChange();
      onOpenChange(false);
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast.error('Failed to mark invoice as paid');
    } finally {
      setIsUpdating(false);
    }
  };

  const showMarkAsSent = invoiceData.status === 'draft';
  const showMarkAsPaid = invoiceData.status === 'sent' || invoiceData.status === 'overdue';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-0 sticky top-0 bg-white z-10 border-b">
          <div className="flex items-start justify-between pb-4">
            <DialogTitle className="text-2xl font-bold">
              Invoice {invoiceData.invoice_number}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 rounded-full"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pb-4">
            <Button
              variant="outline"
              onClick={handleDownloadPDF}
              disabled={isDownloading || isUpdating}
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Download PDF
            </Button>

            {showMarkAsSent && (
              <Button
                variant="default"
                onClick={handleMarkAsSent}
                disabled={isUpdating || isDownloading}
                className="flex items-center gap-2"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Mark as Sent
              </Button>
            )}

            {showMarkAsPaid && (
              <Button
                variant="default"
                onClick={handleMarkAsPaid}
                disabled={isUpdating || isDownloading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isUpdating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <DollarSign className="h-4 w-4" />
                )}
                Mark as Paid
              </Button>
            )}
          </div>
        </DialogHeader>

        {/* Invoice Template */}
        <div className="px-6 pb-6">
          <InvoiceTemplate invoice={invoiceData} showDownloadButton={false} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
