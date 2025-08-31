import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Send, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface PaymentStatusButtonProps {
  invoiceId: string;
  currentStatus: 'draft' | 'sent' | 'paid' | 'overdue' | null;
  invoiceNumber: string;
  onStatusChange?: (newStatus: 'draft' | 'sent' | 'paid' | 'overdue') => void;
}

export function PaymentStatusButton({ 
  invoiceId, 
  currentStatus, 
  invoiceNumber,
  onStatusChange 
}: PaymentStatusButtonProps) {
  const { toast } = useToast();
  const [showSentDialog, setShowSentDialog] = useState(false);
  const [showPaidDialog, setShowPaidDialog] = useState(false);
  const [updating, setUpdating] = useState(false);

  const handleMarkAsSent = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('invoice_line_items')
        .update({
          invoice_status: 'sent',
          sent_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Invoice Sent",
        description: `Invoice ${invoiceNumber} marked as sent`,
      });

      onStatusChange?.('sent');
    } catch (error) {
      console.error('Error marking invoice as sent:', error);
      toast({
        title: "Error",
        description: "Failed to update invoice status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
      setShowSentDialog(false);
    }
  };

  const handleMarkAsPaid = async () => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from('invoice_line_items')
        .update({
          invoice_status: 'paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', invoiceId);

      if (error) throw error;

      toast({
        title: "Payment Received",
        description: `Invoice ${invoiceNumber} marked as paid`,
      });

      onStatusChange?.('paid');
    } catch (error) {
      console.error('Error marking invoice as paid:', error);
      toast({
        title: "Error",
        description: "Failed to update payment status",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
      setShowPaidDialog(false);
    }
  };

  // Determine available actions based on current status
  const canMarkAsSent = currentStatus === 'draft';
  const canMarkAsPaid = currentStatus === 'sent' || currentStatus === 'overdue';

  if (!canMarkAsSent && !canMarkAsPaid) {
    return null; // No actions available for paid invoices
  }

  return (
    <>
      {canMarkAsSent && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowSentDialog(true)}
          disabled={updating}
          className="flex items-center gap-2"
        >
          <Send className="h-4 w-4" />
          {updating ? 'Sending...' : 'Mark as Sent'}
        </Button>
      )}
      
      {canMarkAsPaid && (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowPaidDialog(true)}
          disabled={updating}
          className="flex items-center gap-2 border-green-500 text-green-700 hover:bg-green-50"
        >
          <DollarSign className="h-4 w-4" />
          {updating ? 'Processing...' : 'Mark as Paid'}
        </Button>
      )}

      {/* Mark as Sent Confirmation Dialog */}
      <AlertDialog open={showSentDialog} onOpenChange={setShowSentDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Sent</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark invoice {invoiceNumber} as sent? 
              This will set the sent date to today and change the status to "Sent".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsSent}>
              Mark as Sent
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Mark as Paid Confirmation Dialog */}
      <AlertDialog open={showPaidDialog} onOpenChange={setShowPaidDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark Invoice as Paid</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to mark invoice {invoiceNumber} as paid? 
              This will set the payment date to today and change the status to "Paid".
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleMarkAsPaid}>
              Mark as Paid
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}