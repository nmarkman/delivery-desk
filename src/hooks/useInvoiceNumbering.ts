/**
 * React hook for date-based invoice number generation and management
 */

import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { 
  generateDateBasedInvoiceNumber,
  convertToDateBasedFormat,
  isOldSequentialFormat 
} from '@/utils/dateBasedInvoiceNumbering';
import { extractClientShortform } from '@/utils/invoiceHelpers';
import { parseDateSafely, getTodayYMD } from '@/utils/dateUtils';

export function useInvoiceNumbering() {
  const { toast } = useToast();

  /**
   * Generates a new date-based invoice number for a client
   * @param companyName - Company name to extract shortform from
   * @param opportunityId - Opportunity ID to fetch billing info and custom school code
   * @param billedDate - Date the invoice was billed (defaults to today)
   * @returns Promise resolving to the new invoice number
   */
  const generateNewInvoiceNumber = useCallback(async (
    companyName: string,
    opportunityId?: string,
    billedDate?: string | Date
  ): Promise<string | null> => {
    try {
      // Fetch billing info to get custom school code if available
      let customSchoolCode: string | undefined;
      if (opportunityId) {
        const { data: billingData, error: billingError } = await supabase
          .from('opportunity_billing_info')
          .select('custom_school_code')
          .eq('opportunity_id', opportunityId)
          .single();
        
        if (!billingError && billingData?.custom_school_code) {
          customSchoolCode = billingData.custom_school_code;
        }
      }

      const clientShortform = extractClientShortform(companyName, customSchoolCode);
      const dateToUse = billedDate ? billedDate : getTodayYMD();
      
      // Query existing invoice numbers for this client
      const { data: existingData, error } = await supabase
        .from('invoice_line_items')
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .like('invoice_number', `${clientShortform}-%`)
        .order('invoice_number', { ascending: false });

      if (error) {
        console.error('Error querying existing invoice numbers:', error);
        toast({
          title: "Error",
          description: "Failed to generate invoice number. Please try again.",
          variant: "destructive"
        });
        return null;
      }

      const existingNumbers = existingData?.map(item => item.invoice_number).filter(Boolean) as string[] || [];
      
      return generateDateBasedInvoiceNumber(clientShortform, dateToUse, existingNumbers);
    } catch (error) {
      console.error('Error generating invoice number:', error);
      toast({
        title: "Error",
        description: "Failed to generate invoice number. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  }, [toast]);

  /**
   * Migrates old sequential invoice numbers to date-based format
   * @param lineItemId - ID of the line item to migrate
   * @param oldInvoiceNumber - Current invoice number in old format
   * @param billedDate - Date the invoice was billed
   * @returns Promise resolving to success status
   */
  const migrateInvoiceNumber = useCallback(async (
    lineItemId: string,
    oldInvoiceNumber: string,
    billedDate: string
  ): Promise<boolean> => {
    try {
      if (!isOldSequentialFormat(oldInvoiceNumber)) {
        console.log(`Invoice number ${oldInvoiceNumber} is already in new format`);
        return true;
      }

      // Extract shortform from old number
      const shortformMatch = oldInvoiceNumber.match(/^([A-Z0-9]+)-(\d+)$/);
      if (!shortformMatch) {
        console.error(`Invalid old invoice number format: ${oldInvoiceNumber}`);
        return false;
      }

      const clientShortform = shortformMatch[1];

      // Query existing date-based numbers for this client to avoid conflicts
      const { data: existingData, error: queryError } = await supabase
        .from('invoice_line_items')
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .like('invoice_number', `${clientShortform}-%-%`); // Date-based format has two dashes

      if (queryError) {
        console.error('Error querying existing date-based invoice numbers:', queryError);
        return false;
      }

      const existingDateBasedNumbers = existingData?.map(item => item.invoice_number).filter(Boolean) as string[] || [];
      
      // Generate new date-based number
      const newInvoiceNumber = generateDateBasedInvoiceNumber(
        clientShortform, 
        parseDateSafely(billedDate), 
        existingDateBasedNumbers
      );

      // Update the database
      const { error: updateError } = await supabase
        .from('invoice_line_items')
        .update({ invoice_number: newInvoiceNumber })
        .eq('id', lineItemId);

      if (updateError) {
        console.error('Error updating invoice number:', updateError);
        return false;
      }

      console.log(`Migrated ${oldInvoiceNumber} → ${newInvoiceNumber}`);
      return true;
    } catch (error) {
      console.error('Error migrating invoice number:', error);
      return false;
    }
  }, []);

  /**
   * Batch migrates all old sequential invoice numbers to date-based format
   * @returns Promise resolving to migration results
   */
  const batchMigrateInvoiceNumbers = useCallback(async (): Promise<{
    success: number;
    failed: number;
    skipped: number;
  }> => {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    try {
      // Query all invoice line items with old format numbers
      const { data: lineItems, error } = await supabase
        .from('invoice_line_items')
        .select('id, invoice_number, billed_at')
        .not('invoice_number', 'is', null)
        .not('billed_at', 'is', null);

      if (error) {
        console.error('Error querying line items for migration:', error);
        toast({
          title: "Migration Error",
          description: "Failed to query invoice line items for migration.",
          variant: "destructive"
        });
        return { success: 0, failed: 0, skipped: 0 };
      }

      if (!lineItems || lineItems.length === 0) {
        toast({
          title: "No Items to Migrate",
          description: "No invoice line items found for migration.",
        });
        return { success: 0, failed: 0, skipped: 0 };
      }

      // Filter to only old format numbers
      const itemsToMigrate = lineItems.filter(item => 
        item.invoice_number && isOldSequentialFormat(item.invoice_number)
      );

      toast({
        title: "Migration Started",
        description: `Migrating ${itemsToMigrate.length} invoice numbers to date-based format...`,
      });

      // Process each item
      for (const item of itemsToMigrate) {
        const success = await migrateInvoiceNumber(
          item.id,
          item.invoice_number!,
          item.billed_at!
        );

        if (success) {
          successCount++;
        } else {
          failedCount++;
        }
      }

      skippedCount = lineItems.length - itemsToMigrate.length;

      toast({
        title: "Migration Complete",
        description: `Successfully migrated ${successCount} invoice numbers. ${failedCount} failed, ${skippedCount} skipped.`,
        variant: successCount > 0 ? "default" : "destructive"
      });

      return { success: successCount, failed: failedCount, skipped: skippedCount };
    } catch (error) {
      console.error('Error during batch migration:', error);
      toast({
        title: "Migration Error",
        description: "An error occurred during the migration process.",
        variant: "destructive"
      });
      return { success: successCount, failed: failedCount, skipped: skippedCount };
    }
  }, [migrateInvoiceNumber, toast]);

  return {
    generateNewInvoiceNumber,
    migrateInvoiceNumber,
    batchMigrateInvoiceNumbers
  };
}