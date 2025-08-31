import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  extractClientShortform, 
  ensureUniqueShortform, 
  generateNextInvoiceNumber,
  parseInvoiceNumber
} from '@/utils/invoiceHelpers';

export interface InvoiceGenerationData {
  invoiceNumber: string;
  clientShortform: string;
  organizationName: string;
}

export function useInvoiceGeneration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Queries existing invoice numbers for a specific client shortform
   * @param clientShortform - The client shortform to query
   * @returns Array of existing invoice numbers for this client
   */
  const queryExistingInvoiceNumbers = useCallback(async (clientShortform: string): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('invoice_number')
        .not('invoice_number', 'is', null)
        .like('invoice_number', `${clientShortform}-%`)
        .order('invoice_number', { ascending: true });

      if (error) {
        console.error('Error querying invoice numbers:', error);
        return [];
      }

      return data?.map(item => item.invoice_number).filter(Boolean) as string[] || [];
    } catch (err) {
      console.error('Error in queryExistingInvoiceNumbers:', err);
      return [];
    }
  }, []);

  /**
   * Gets all existing client shortforms to ensure uniqueness
   * @returns Array of all existing shortforms
   */
  const getExistingShortforms = useCallback(async (): Promise<string[]> => {
    try {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('invoice_number')
        .not('invoice_number', 'is', null);

      if (error) {
        console.error('Error querying existing shortforms:', error);
        return [];
      }

      const shortforms = new Set<string>();
      data?.forEach(item => {
        if (item.invoice_number) {
          const parsed = parseInvoiceNumber(item.invoice_number);
          if (parsed) {
            shortforms.add(parsed.shortform);
          }
        }
      });

      return Array.from(shortforms);
    } catch (err) {
      console.error('Error in getExistingShortforms:', err);
      return [];
    }
  }, []);

  /**
   * Gets the last invoice number for a specific client
   * @param clientShortform - The client shortform
   * @returns The last invoice number, or null if none found
   */
  const getLastInvoiceNumber = useCallback(async (clientShortform: string): Promise<string | null> => {
    try {
      const invoiceNumbers = await queryExistingInvoiceNumbers(clientShortform);
      
      if (invoiceNumbers.length === 0) {
        return null;
      }

      // Sort by sequence number to get the highest
      const sortedNumbers = invoiceNumbers
        .map(num => ({
          original: num,
          parsed: parseInvoiceNumber(num)
        }))
        .filter(item => item.parsed !== null)
        .sort((a, b) => (b.parsed?.sequence || 0) - (a.parsed?.sequence || 0));

      return sortedNumbers[0]?.original || null;
    } catch (err) {
      console.error('Error in getLastInvoiceNumber:', err);
      return null;
    }
  }, [queryExistingInvoiceNumbers]);

  /**
   * Generates a complete invoice number for a given organization
   * @param organizationName - The organization name from opportunity_billing_info
   * @returns Promise with invoice generation data
   */
  const generateInvoiceNumber = useCallback(async (
    organizationName: string
  ): Promise<InvoiceGenerationData | null> => {
    setLoading(true);
    setError(null);

    try {
      // Step 1: Extract base shortform from organization name
      const baseShortform = extractClientShortform(organizationName);

      // Step 2: Get existing shortforms to ensure uniqueness
      const existingShortforms = await getExistingShortforms();

      // Step 3: Ensure shortform is unique
      const uniqueShortform = ensureUniqueShortform(baseShortform, existingShortforms);

      // Step 4: Get last invoice number for this client
      const lastInvoiceNumber = await getLastInvoiceNumber(uniqueShortform);

      // Step 5: Generate next sequential invoice number
      const nextInvoiceNumber = generateNextInvoiceNumber(uniqueShortform, lastInvoiceNumber);

      return {
        invoiceNumber: nextInvoiceNumber,
        clientShortform: uniqueShortform,
        organizationName
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate invoice number';
      setError(errorMessage);
      console.error('Error generating invoice number:', err);
      return null;
    } finally {
      setLoading(false);
    }
  }, [getExistingShortforms, getLastInvoiceNumber]);

  /**
   * Batch generates invoice numbers for multiple line items from the same organization
   * @param organizationName - The organization name
   * @param count - Number of invoice numbers to generate
   * @returns Array of invoice numbers
   */
  const generateBatchInvoiceNumbers = useCallback(async (
    organizationName: string,
    count: number
  ): Promise<string[]> => {
    setLoading(true);
    setError(null);

    try {
      const invoiceNumbers: string[] = [];
      
      // Generate the first one normally
      const firstResult = await generateInvoiceNumber(organizationName);
      if (!firstResult) {
        throw new Error('Failed to generate first invoice number');
      }

      invoiceNumbers.push(firstResult.invoiceNumber);

      // Generate subsequent numbers sequentially
      const { clientShortform } = firstResult;
      let lastNumber = firstResult.invoiceNumber;

      for (let i = 1; i < count; i++) {
        const nextNumber = generateNextInvoiceNumber(clientShortform, lastNumber);
        invoiceNumbers.push(nextNumber);
        lastNumber = nextNumber;
      }

      return invoiceNumbers;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate batch invoice numbers';
      setError(errorMessage);
      console.error('Error generating batch invoice numbers:', err);
      return [];
    } finally {
      setLoading(false);
    }
  }, [generateInvoiceNumber]);

  return {
    generateInvoiceNumber,
    generateBatchInvoiceNumbers,
    queryExistingInvoiceNumbers,
    getExistingShortforms,
    getLastInvoiceNumber,
    loading,
    error,
    clearError: () => setError(null)
  };
}