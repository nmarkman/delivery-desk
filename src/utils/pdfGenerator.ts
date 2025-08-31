import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { parseInvoiceNumber } from '@/utils/invoiceHelpers';

export interface PDFGenerationOptions {
  invoiceNumber: string;
  clientShortform?: string;
  filename?: string;
  element?: HTMLElement;
  quality?: number;
}

/**
 * Generates a filename for the PDF download following the convention:
 * [ClientShortform]_CRCG Invoice [Invoice Number]_[YYYY-MM-DD].pdf
 * 
 * @param invoiceNumber - The invoice number (e.g., "WSU-001")
 * @param clientShortform - Optional client shortform override
 * @returns Formatted filename
 */
export function generatePDFFilename(invoiceNumber: string, clientShortform?: string): string {
  // Extract shortform from invoice number if not provided
  const shortform = clientShortform || parseInvoiceNumber(invoiceNumber)?.shortform || 'INVOICE';
  
  // Get current date in YYYY-MM-DD format
  const currentDate = new Date().toISOString().split('T')[0];
  
  // Build filename: [ClientShortform]_CRCG Invoice [Invoice Number]_[YYYY-MM-DD].pdf
  const filename = `${shortform}_CRCG Invoice ${invoiceNumber}_${currentDate}.pdf`;
  
  return filename;
}

/**
 * Finds the invoice template element on the page
 * @returns The invoice template element or null if not found
 */
function findInvoiceElement(): HTMLElement | null {
  // Try multiple selectors to find the invoice template
  const selectors = [
    '.invoice-template',
    '[class*="invoice-template"]',
    '#invoice-template',
    '[data-testid="invoice-template"]'
  ];
  
  for (const selector of selectors) {
    const element = document.querySelector(selector) as HTMLElement;
    if (element && element.offsetWidth > 0 && element.offsetHeight > 0) {
      return element;
    }
  }
  
  return null;
}

/**
 * Generates a PDF from an HTML element using jsPDF with html2canvas integration.
 * This approach provides clean, high-quality PDF output without browser dependencies.
 * 
 * @param options - PDF generation options
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export async function generateInvoicePDF(options: PDFGenerationOptions): Promise<void> {
  const {
    invoiceNumber,
    clientShortform,
    filename: customFilename,
    element: customElement,
    quality = 1
  } = options;

  // Find the invoice element to render
  const targetElement = customElement || findInvoiceElement();
  
  if (!targetElement) {
    throw new Error('Invoice template element not found. Make sure the invoice is visible on the page.');
  }

  // Generate filename
  const filename = customFilename || generatePDFFilename(invoiceNumber, clientShortform);

  try {
    // Create jsPDF instance optimized for letter-size single page
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter', // 8.5" x 11"
      compress: true
    });

    // Use jsPDF's built-in HTML rendering with optimized settings
    await new Promise<void>((resolve, reject) => {
      pdf.html(targetElement, {
        callback: function (doc) {
          try {
            // Save the PDF with the generated filename
            doc.save(filename);
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        margin: [40, 40, 40, 40], // top, right, bottom, left margins in pts
        autoPaging: 'text', // Avoid cutting text across pages
        width: 515, // Content width (letter width - margins)
        windowWidth: 1000, // Render width for better quality
        html2canvas: {
          scale: quality,
          useCORS: true,
          allowTaint: true, // Allow tainted canvas for better SVG support
          backgroundColor: '#ffffff',
          scrollX: 0,
          scrollY: 0,
          windowWidth: targetElement.scrollWidth,
          windowHeight: targetElement.scrollHeight,
          ignoreElements: (element) => {
            // Skip SVG icons that cause loading errors
            return element.tagName === 'svg' && element.getAttribute('class')?.includes('lucide');
          }
        }
      });
    });

  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Alternative method using html2canvas directly, then adding to jsPDF.
 * This provides more control but requires manual scaling and positioning.
 * 
 * @param options - PDF generation options
 * @returns Promise that resolves when PDF is generated and downloaded
 */
export async function generateInvoicePDFCanvas(options: PDFGenerationOptions): Promise<void> {
  const {
    invoiceNumber,
    clientShortform,
    filename: customFilename,
    element: customElement,
    quality = 2
  } = options;

  // Find the invoice element to render
  const targetElement = customElement || findInvoiceElement();
  
  if (!targetElement) {
    throw new Error('Invoice template element not found. Make sure the invoice is visible on the page.');
  }

  // Generate filename
  const filename = customFilename || generatePDFFilename(invoiceNumber, clientShortform);

  try {
    // Render element to canvas with html2canvas
    const canvas = await html2canvas(targetElement, {
      scale: quality,
      useCORS: true,
      allowTaint: true, // Allow tainted canvas for better SVG support
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: targetElement.scrollWidth,
      windowHeight: targetElement.scrollHeight,
      ignoreElements: (element) => {
        // Skip SVG icons that cause loading errors
        return element.tagName === 'svg' && element.getAttribute('class')?.includes('lucide');
      },
      onclone: (clonedDoc, element) => {
        // Remove download buttons and other non-essential elements
        const elementsToHide = clonedDoc.querySelectorAll('.no-pdf, .no-print, [class*="download"], button');
        elementsToHide.forEach((el) => {
          if (el instanceof HTMLElement) {
            el.style.display = 'none';
          }
        });

        // Replace SVG icons with text equivalents in the cloned document
        const svgIcons = clonedDoc.querySelectorAll('svg[class*="lucide"]');
        svgIcons.forEach((svg) => {
          if (svg.parentNode) {
            const span = clonedDoc.createElement('span');
            span.style.display = 'none'; // Hide the replacement
            svg.parentNode.replaceChild(span, svg);
          }
        });
        return element;
      }
    });

    // Create PDF and add canvas as image
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'pt',
      format: 'letter',
      compress: true
    });

    // Calculate dimensions to fit on letter-size page
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const canvasAspectRatio = canvas.height / canvas.width;
    
    // Scale to fit within page margins
    const margins = 40;
    const availableWidth = pdfWidth - (2 * margins);
    const availableHeight = pdfHeight - (2 * margins);
    
    let imgWidth = availableWidth;
    let imgHeight = imgWidth * canvasAspectRatio;
    
    // If image is too tall, scale down based on height
    if (imgHeight > availableHeight) {
      imgHeight = availableHeight;
      imgWidth = imgHeight / canvasAspectRatio;
    }

    // Center the image on the page
    const xOffset = (pdfWidth - imgWidth) / 2;
    const yOffset = margins;

    // Convert canvas to image and add to PDF
    const imgData = canvas.toDataURL('image/png', 1.0);
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, imgWidth, imgHeight);

    // Save the PDF
    pdf.save(filename);

  } catch (error) {
    console.error('Error generating PDF with canvas method:', error);
    throw new Error(`Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Downloads the invoice as a PDF. Uses the primary jsPDF html method by default.
 * Falls back to canvas method if needed.
 * 
 * @param invoiceNumber - The invoice number for filename generation
 * @param clientShortform - Optional client shortform override
 * @param useCanvasMethod - Whether to use the canvas method instead of html method
 * @returns Promise that resolves when the PDF is downloaded
 */
export async function downloadInvoicePDF(
  invoiceNumber: string, 
  clientShortform?: string,
  useCanvasMethod: boolean = true // Default to canvas method for better reliability
): Promise<void> {
  // Validate input
  if (!invoiceNumber || invoiceNumber.trim() === '') {
    throw new Error('Invoice number is required');
  }

  // Check if PDF generation is supported
  if (!isPDFGenerationSupported()) {
    throw new Error('PDF generation is not supported in this environment');
  }

  const options: PDFGenerationOptions = {
    invoiceNumber: invoiceNumber.trim(),
    clientShortform,
    quality: 2 // High quality for crisp text and images
  };

  try {
    if (useCanvasMethod) {
      await generateInvoicePDFCanvas(options);
    } else {
      await generateInvoicePDF(options);
    }
  } catch (error) {
    console.error('PDF generation failed, attempting fallback method:', error);
    
    // Try the alternative method as fallback
    try {
      if (!useCanvasMethod) {
        await generateInvoicePDFCanvas(options);
      } else {
        await generateInvoicePDF(options);
      }
    } catch (fallbackError) {
      console.error('Fallback PDF generation also failed:', fallbackError);
      throw new Error(`PDF generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

/**
 * Utility function to check if PDF generation is supported in the current environment
 * @returns boolean indicating if PDF generation is available
 */
export function isPDFGenerationSupported(): boolean {
  return typeof window !== 'undefined' && 
         typeof document !== 'undefined' && 
         typeof HTMLCanvasElement !== 'undefined';
}