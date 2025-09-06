import { calculateOverdueStatus } from './invoiceHelpers';

// Types for dashboard metrics
export interface DashboardMetrics {
  totalActiveContractValue: number;
  totalOutstanding: number;
  outstandingCount: number;
  billedUnpaidAmount: number;
  billedUnpaidCount: number;
  uniqueClients: number;
}

// Types for line items and opportunities
interface LineItem {
  opportunity_id: string;
  unit_rate: number;
}

interface InvoiceLineItem {
  id: string;
  billed_at: string | null;
  payment_date: string | null;
  line_total: number | null;
  invoice_status: string | null;
  opportunities?: {
    opportunity_billing_info?: Array<{
      payment_terms?: number;
    }>;
  };
}

interface Opportunity {
  id: string;
  company_name: string;
}

/**
 * Calculate total active contract value from all line items
 */
export function calculateTotalActiveContractValue(
  lineItems: LineItem[],
  opportunities: Opportunity[]
): number {
  const allOpportunityIds = new Set(opportunities.map(opp => opp.id));
  return lineItems
    .filter(item => allOpportunityIds.has(item.opportunity_id))
    .reduce((sum, item) => sum + (item.unit_rate || 0), 0);
}

/**
 * Calculate total outstanding amount (Total ACV minus paid invoices)
 */
export function calculateTotalOutstanding(
  lineItems: LineItem[], 
  invoiceLineItems: InvoiceLineItem[],
  opportunities: Opportunity[]
): number {
  // Total ACV from contract values (unit_rate)
  const totalACV = calculateTotalActiveContractValue(lineItems, opportunities);
  
  // Sum of paid invoices (line_total of paid items)
  const paidInvoicesTotal = invoiceLineItems
    .filter(item => item.billed_at && item.payment_date && item.invoice_status === 'paid')
    .reduce((sum, item) => sum + (item.line_total || 0), 0);
  
  return totalACV - paidInvoicesTotal;
}

/**
 * Get outstanding invoices (sent and overdue, not paid)
 */
export function getOutstandingInvoices(invoiceLineItems: InvoiceLineItem[]): InvoiceLineItem[] {
  return invoiceLineItems.filter(item => {
    if (!item.billed_at || item.payment_date) return false; // Must be billed and not paid
    const status = item.invoice_status || 'draft';
    if (status === 'sent' || status === 'overdue') return true;
    
    // Also check if it should be calculated as overdue
    const billingInfo = item.opportunities?.opportunity_billing_info;
    const paymentTerms = Array.isArray(billingInfo) && billingInfo.length > 0 ? billingInfo[0].payment_terms || 30 : 30;
    return calculateOverdueStatus(status, item.billed_at, item.payment_date, paymentTerms);
  });
}

/**
 * Calculate billed & unpaid amount (currency value of outstanding invoices)
 */
export function calculateBilledUnpaidAmount(invoiceLineItems: InvoiceLineItem[]): number {
  return getOutstandingInvoices(invoiceLineItems).reduce((sum, item) => sum + (item.line_total || 0), 0);
}

/**
 * Calculate billed & unpaid count
 */
export function calculateBilledUnpaidCount(invoiceLineItems: InvoiceLineItem[]): number {
  return getOutstandingInvoices(invoiceLineItems).length;
}

/**
 * Calculate unique clients count
 */
export function calculateUniqueClients(opportunities: Opportunity[]): number {
  return new Set(opportunities.map(opp => opp.company_name)).size;
}

/**
 * Calculate all dashboard metrics at once
 */
export function calculateDashboardMetrics(
  lineItems: LineItem[],
  invoiceLineItems: InvoiceLineItem[],
  opportunities: Opportunity[]
): DashboardMetrics {
  const outstandingInvoices = getOutstandingInvoices(invoiceLineItems);
  
  return {
    totalActiveContractValue: calculateTotalActiveContractValue(lineItems, opportunities),
    totalOutstanding: calculateTotalOutstanding(lineItems, invoiceLineItems, opportunities),
    outstandingCount: outstandingInvoices.length,
    billedUnpaidAmount: calculateBilledUnpaidAmount(invoiceLineItems),
    billedUnpaidCount: outstandingInvoices.length,
    uniqueClients: calculateUniqueClients(opportunities),
  };
}
