/**
 * Utility functions for invoice calculations and formatting
 */

/**
 * Extracts a 2-4 character shortform from an organization name for invoice numbering
 * @param organizationName - The full organization name
 * @param customSchoolCode - Optional custom school code override
 * @returns A 2-4 character uppercase abbreviation
 */
export function extractClientShortform(organizationName: string, customSchoolCode?: string): string {
  // If custom school code is provided, use it directly
  if (customSchoolCode && customSchoolCode.trim().length > 0) {
    return customSchoolCode.trim().toUpperCase();
  }

  if (!organizationName || organizationName.trim().length === 0) {
    return 'UNK';
  }

  const name = organizationName.trim().toUpperCase();
  
  // Remove common business suffixes and words
  const cleanName = name
    .replace(/\b(LLC|INC|CORP|CORPORATION|COMPANY|CO|LTD|LIMITED|UNIVERSITY|UNIV|COLLEGE)\b/g, '')
    .replace(/[^A-Z0-9\s]/g, '') // Remove special characters
    .trim();

  // Split into words and filter out empty strings
  const words = cleanName.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 0) {
    // Fallback: use first 3 characters of original name
    return name.slice(0, 3);
  }

  if (words.length === 1) {
    // Single word: take first 3-4 characters
    const word = words[0];
    return word.length >= 4 ? word.slice(0, 4) : word.slice(0, 3);
  }

  if (words.length === 2) {
    // Two words: take first 2 chars of each
    return words[0].slice(0, 2) + words[1].slice(0, 2);
  }

  // Three or more words: take first char of first 3-4 words
  if (words.length >= 4) {
    return words.slice(0, 4).map(word => word[0]).join('');
  } else {
    return words.slice(0, 3).map(word => word[0]).join('');
  }
}

/**
 * Validates and ensures a shortform is unique by adding distinguishing characters if needed
 * @param baseShortform - The base shortform generated from organization name
 * @param existingShortforms - Array of existing shortforms to check against
 * @returns A unique shortform
 */
export function ensureUniqueShortform(
  baseShortform: string, 
  existingShortforms: string[]
): string {
  const base = baseShortform.toUpperCase();
  
  if (!existingShortforms.includes(base)) {
    return base;
  }

  // Try adding numbers 1-99
  for (let i = 1; i <= 99; i++) {
    const candidate = `${base}${i}`;
    if (!existingShortforms.includes(candidate)) {
      return candidate;
    }
  }

  // Fallback: add random suffix
  const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase();
  return `${base}${randomSuffix}`;
}

/**
 * Generates a sequential invoice number for a client
 * @param clientShortform - The client's shortform abbreviation
 * @param lastInvoiceNumber - The last invoice number used for this client (e.g., "WSU-005")
 * @returns Next sequential invoice number (e.g., "WSU-006")
 */
export function generateNextInvoiceNumber(
  clientShortform: string,
  lastInvoiceNumber?: string
): string {
  const shortform = clientShortform.toUpperCase();
  
  if (!lastInvoiceNumber) {
    return `${shortform}-001`;
  }

  // Extract the numeric part from the last invoice number
  const match = lastInvoiceNumber.match(/-(\d+)$/);
  if (!match) {
    return `${shortform}-001`;
  }

  const lastNumber = parseInt(match[1], 10);
  const nextNumber = lastNumber + 1;
  
  // Format with leading zeros (3 digits)
  const paddedNumber = nextNumber.toString().padStart(3, '0');
  return `${shortform}-${paddedNumber}`;
}

/**
 * Parses an invoice number to extract client shortform and sequence number
 * @param invoiceNumber - Invoice number in format "ABC-001"
 * @returns Object with shortform and sequence number, or null if invalid
 */
export function parseInvoiceNumber(invoiceNumber: string): {
  shortform: string;
  sequence: number;
} | null {
  if (!invoiceNumber) {
    return null;
  }

  const match = invoiceNumber.match(/^([A-Z0-9]+)-(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    shortform: match[1],
    sequence: parseInt(match[2], 10)
  };
}

/**
 * Calculates overdue status for an invoice line item
 * Criteria: due_date < current_date AND status = 'sent' AND payment_date IS NULL
 * @param status - Current invoice status
 * @param billedAt - Date when line item was billed
 * @param paymentDate - Date when payment was received (null if unpaid)
 * @param paymentTerms - Payment terms in days (default 30)
 * @returns True if invoice is overdue
 */
export function calculateOverdueStatus(
  status: string | null,
  billedAt: string | null,
  paymentDate: string | null,
  paymentTerms: number = 30
): boolean {
  // Must be sent status and not yet paid
  if (!status || !billedAt || status !== 'sent' || paymentDate !== null) {
    return false;
  }

  const billedDate = new Date(billedAt);
  const dueDate = new Date(billedDate);
  dueDate.setDate(dueDate.getDate() + paymentTerms);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0); // Start of day
  dueDate.setHours(0, 0, 0, 0); // Start of day
  
  return today > dueDate;
}

/**
 * Formats currency amounts for display
 * @param amount - Numeric amount
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number | null): string {
  if (amount === null || amount === undefined) {
    return '$0.00';
  }
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}