import React from 'react';
import { formatCurrency, parseInvoiceNumber } from '@/utils/invoiceHelpers';
import { downloadInvoicePDF, isPDFGenerationSupported } from '@/utils/pdfGenerator';
import { formatDateForDisplay } from '@/utils/dateUtils';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import '@/styles/invoice-print.css';

export interface InvoiceLineItemData {
  id: string;
  description: string;
  details?: string;
  quantity: number;
  unit_rate: number;
  line_total: number;
  service_period_start?: string;
  service_period_end?: string;
}

export interface BillingInfo {
  organization_name: string;
  organization_address: string;
  organization_contact_name: string;
  organization_contact_email: string;
  bill_to_name: string;
  bill_to_address: string;
  bill_to_contact_name: string;
  bill_to_contact_email: string;
  payment_terms: number;
  po_number?: string;
  custom_payment_terms_text?: string;
}

export interface InvoiceData {
  invoice_number: string;
  invoice_date: string;
  due_date: string;
  billing_info: BillingInfo;
  line_items: InvoiceLineItemData[];
  subtotal: number;
  tax_amount?: number;
  total_amount: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  company_name?: string;
  opportunity_name?: string;
}

interface InvoiceTemplateProps {
  invoice: InvoiceData;
  className?: string;
  showDownloadButton?: boolean;
}

export function InvoiceTemplate({ invoice, className = "", showDownloadButton = true }: InvoiceTemplateProps) {
  const { billing_info: billing } = invoice;
  const { toast } = useToast();
  
  // Calculate due date for display
  const invoiceDate = new Date(invoice.invoice_date);
  const dueDate = new Date(invoiceDate);
  dueDate.setDate(dueDate.getDate() + billing.payment_terms);

  // Extract client shortform for PDF filename
  const parsedInvoice = parseInvoiceNumber(invoice.invoice_number);
  const clientShortform = parsedInvoice?.shortform || 'CLIENT';

  // Handle PDF download
  const handleDownloadPDF = async () => {
    try {
      await downloadInvoicePDF(invoice.invoice_number, clientShortform);
      
      toast({
        title: "PDF Downloaded",
        description: `Invoice ${invoice.invoice_number} has been downloaded as PDF.`
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "There was an error generating the PDF. Please try again.",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className={`invoice-template max-w-4xl mx-auto bg-white shadow-lg print:shadow-none print:max-w-none print:mx-0 ${className}`}>
      {/* Download PDF Button - Visible on screen, hidden during PDF generation */}
      {showDownloadButton && isPDFGenerationSupported() && (
        <div className="flex justify-end p-4 pb-0 no-pdf">
          <Button
            onClick={handleDownloadPDF}
            variant="outline"
            size="sm"
            className="flex items-center gap-2 hover:bg-blue-50"
          >
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>
      )}
      
      {/* Company Header */}
      <div className="px-6 pt-6 pb-1 print:px-3 print:pt-3 print:pb-1">
        <div className="flex justify-between items-start mb-2 print:mb-1">
          <div className="flex-1">
            <div className="text-xs text-gray-800 leading-tight print:text-xs print:leading-tight">
              <div className="font-semibold">Collegiate Retail Consulting Group</div>
              <div>330 Cedarcrest Lane</div>
              <div>Double Oak, TX 75077</div>
              <div>917.821.0596</div>
              <div>rmarkman@collegiateretailconsulting.com</div>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4">
            <div className="text-right">
              <img 
                src="https://osywqypaamxxqlgnvgqw.supabase.co/storage/v1/object/public/public-images/crcg-logo.png"
                alt="CRCG Logo"
                className="h-12 w-auto ml-auto print:h-10"
              />
            </div>
          </div>
        </div>

        {/* Invoice Header Bar */}
        <div className="bg-gray-600 text-white px-4 py-2 mb-2 print:mb-1">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-base font-semibold print:text-sm">INVOICE NO. #{invoice.invoice_number}</h3>
            </div>
            <div className="text-right">
              <div>{formatDateForDisplay(invoice.invoice_date, { month: 'numeric', day: 'numeric', year: 'numeric' })}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Billing Information */}
      <div className="px-6 print:px-3">
        <div className="grid grid-cols-2 gap-8 mb-6 print:mb-4">
          {/* Left Column - Organization */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 print:mb-1 border-b border-gray-300 pb-1">ORGANIZATION</h4>
            <div className="text-xs text-gray-800 leading-snug print:text-xs print:leading-tight">
              <div>{billing.organization_name}</div>
              <div className="whitespace-pre-line mt-1">
                {billing.organization_address}
              </div>
              <div className="mt-2">
                <div>Attn: {billing.organization_contact_name}</div>
                <div>{billing.organization_contact_email}</div>
              </div>
            </div>
          </div>

          {/* Right Column - Bill To */}
          <div>
            <h4 className="font-semibold text-gray-700 mb-2 print:mb-1 border-b border-gray-300 pb-1">BILL TO</h4>
            <div className="text-xs text-gray-800 leading-snug print:text-xs print:leading-tight">
              <div>Attn: {billing.bill_to_contact_name}</div>
              <div>{billing.bill_to_name}</div>
              <div className="whitespace-pre-line mt-1">
                {billing.bill_to_address}
              </div>
              {billing.po_number && (
                <div className="mt-2">
                  <div>Purchase Order Number: {billing.po_number}</div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Company and Service Header */}
        {(invoice.company_name || invoice.opportunity_name) && (
          <div className="mb-4 print:mb-3">
            <div className="text-center border border-gray-400 px-4 py-2 print:py-1 bg-gray-50 print:bg-white">
              <div className="font-semibold text-sm text-gray-800 print:text-xs">
                {invoice.company_name}
              </div>
              <div className="text-sm text-gray-600 print:text-xs">
                {invoice.opportunity_name || 'Consulting and Project Management Services'}
              </div>
            </div>
          </div>
        )}

        {/* Line Items Table */}
        <div className="mb-6 print:mb-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-600 text-white">
                  <th className="text-left py-2 px-3 text-xs font-semibold w-20 print:text-xs print:py-1">QUANTITY</th>
                  <th className="text-left py-2 px-3 text-xs font-semibold print:text-xs print:py-1">DESCRIPTION</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold w-32 print:text-xs print:py-1">UNIT PRICE</th>
                  <th className="text-right py-2 px-3 text-xs font-semibold w-32 print:text-xs print:py-1">TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {invoice.line_items.map((item, index) => (
                  <tr key={item.id} className="border-b border-gray-300">
                    <td className="py-2 px-3 text-xs text-center align-top print:py-1 print:text-xs">
                      {item.quantity}
                    </td>
                    <td className="py-2 px-3 text-xs align-top print:py-1 print:text-xs">
                      <div className="font-medium">{item.description}</div>
                    </td>
                    <td className="py-2 px-3 text-xs text-right align-top print:py-1 print:text-xs">
                      {formatCurrency(item.unit_rate)}
                    </td>
                    <td className="py-2 px-3 text-xs text-right font-medium align-top print:py-1 print:text-xs">
                      {formatCurrency(item.line_total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Totals Section */}
        <div className="border-t-2 border-gray-400 pt-3 mb-6 print:pt-2 print:mb-4">
          <div className="flex justify-end">
            <div className="w-80">
              <div className="flex justify-between items-center py-1 border-b border-gray-300">
                <span className="font-semibold text-gray-700 text-xs print:text-xs">SUBTOTAL</span>
                <span className="font-semibold text-xs print:text-xs">{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.tax_amount && invoice.tax_amount > 0 ? (
                <div className="flex justify-between items-center py-1 border-b border-gray-300">
                  <span className="font-semibold text-gray-700 text-xs print:text-xs">TAX</span>
                  <span className="font-semibold text-xs print:text-xs">{formatCurrency(invoice.tax_amount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between items-center py-1 border-b-2 border-gray-400">
                <span className="font-bold text-sm print:text-xs">TOTAL</span>
                <span className="font-bold text-sm print:text-xs">{formatCurrency(invoice.total_amount)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="text-center text-xs print:text-xs mt-2 print:mt-1 pb-8 print:pb-6">
          <div className="font-semibold">
            {billing.custom_payment_terms_text && billing.custom_payment_terms_text.trim() 
              ? billing.custom_payment_terms_text.trim()
              : `Net ${billing.payment_terms}`
            }
          </div>
        </div>
      </div>
    </div>
  );
}