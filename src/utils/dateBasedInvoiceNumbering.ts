/**
 * Date-based invoice numbering utility functions
 * Format: CLIENT-MMDDYY-XX (e.g., WSU-120324-01, WSU-120324-02)
 */

import { parseDateSafely } from './dateUtils';

/**
 * Formats a date to MMDDYY format for invoice numbers
 * Handles timezone issues that cause JavaScript to render dates as "previous day"
 * @param date - Date object or date string (YYYY-MM-DD format)
 * @returns MMDDYY formatted string
 */
export function formatDateForInvoiceNumber(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    // Use safe parsing to avoid timezone issues
    dateObj = parseDateSafely(date);
  } else {
    dateObj = date;
  }
  
  // Use local timezone methods to avoid UTC conversion issues
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const year = String(dateObj.getFullYear()).slice(-2);
  
  return `${month}${day}${year}`;
}

/**
 * Generates a date-based invoice number with sequential numbering for duplicate dates
 * @param clientShortform - The client's shortform abbreviation (e.g., "WSU")
 * @param billedDate - The date the invoice was billed (used for MMDDYY part)
 * @param existingInvoiceNumbers - Array of existing invoice numbers for this client
 * @returns Date-based invoice number (e.g., "WSU-120324-01")
 */
export function generateDateBasedInvoiceNumber(
  clientShortform: string,
  billedDate: Date | string,
  existingInvoiceNumbers: string[]
): string {
  const shortform = clientShortform.toUpperCase();
  const dateFormatted = formatDateForInvoiceNumber(billedDate);
  const baseNumber = `${shortform}-${dateFormatted}`;
  
  // Find all existing invoice numbers with the same date prefix
  const sameDate = existingInvoiceNumbers.filter(num => 
    num.startsWith(baseNumber)
  );
  
  if (sameDate.length === 0) {
    return `${baseNumber}-01`;
  }
  
  // Extract sequence numbers and find the highest
  const sequenceNumbers = sameDate
    .map(num => {
      const match = num.match(/-(\d{2})$/);
      return match ? parseInt(match[1], 10) : 0;
    })
    .filter(num => num > 0);
  
  const highestSequence = sequenceNumbers.length > 0 ? Math.max(...sequenceNumbers) : 0;
  const nextSequence = highestSequence + 1;
  
  // Format with leading zero (2 digits)
  const paddedSequence = nextSequence.toString().padStart(2, '0');
  return `${baseNumber}-${paddedSequence}`;
}

/**
 * Parses a date-based invoice number to extract components
 * @param invoiceNumber - Invoice number in format "ABC-MMDDYY-XX"
 * @returns Object with components, or null if invalid format
 */
export function parseDateBasedInvoiceNumber(invoiceNumber: string): {
  shortform: string;
  date: string;
  sequence: number;
  dateObj: Date;
} | null {
  if (!invoiceNumber) {
    return null;
  }

  const match = invoiceNumber.match(/^([A-Z0-9]+)-(\d{6})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const [, shortform, dateStr, sequenceStr] = match;
  
  // Parse MMDDYY back to date object (using local timezone to avoid "previous day" bugs)
  const month = parseInt(dateStr.slice(0, 2), 10);
  const day = parseInt(dateStr.slice(2, 4), 10);
  const year = 2000 + parseInt(dateStr.slice(4, 6), 10);
  
  // Use local timezone constructor to avoid UTC conversion issues
  const dateObj = new Date(year, month - 1, day);
  
  return {
    shortform,
    date: dateStr,
    sequence: parseInt(sequenceStr, 10),
    dateObj
  };
}

/**
 * Validates if an invoice number follows the date-based format
 * @param invoiceNumber - Invoice number to validate
 * @returns True if valid date-based format
 */
export function isValidDateBasedInvoiceNumber(invoiceNumber: string): boolean {
  return parseDateBasedInvoiceNumber(invoiceNumber) !== null;
}

/**
 * Converts an old sequential invoice number to date-based format
 * @param oldInvoiceNumber - Old format invoice number (e.g., "WSU-001")
 * @param billedDate - The date this invoice was billed
 * @param existingDateBasedNumbers - Existing date-based numbers to avoid conflicts
 * @returns New date-based invoice number
 */
export function convertToDateBasedFormat(
  oldInvoiceNumber: string,
  billedDate: Date | string,
  existingDateBasedNumbers: string[]
): string {
  // Extract shortform from old number
  const match = oldInvoiceNumber.match(/^([A-Z0-9]+)-(\d+)$/);
  if (!match) {
    // Fallback if old format is invalid
    return generateDateBasedInvoiceNumber('UNK', billedDate, existingDateBasedNumbers);
  }
  
  const shortform = match[1];
  return generateDateBasedInvoiceNumber(shortform, billedDate, existingDateBasedNumbers);
}

/**
 * Checks if an invoice number uses the old sequential format
 * @param invoiceNumber - Invoice number to check
 * @returns True if using old format (CLIENT-XXX)
 */
export function isOldSequentialFormat(invoiceNumber: string): boolean {
  if (!invoiceNumber) return false;
  
  // Old format: CLIENT-XXX (3+ digits)
  const oldFormatMatch = invoiceNumber.match(/^([A-Z0-9]+)-(\d{3,})$/);
  
  // New format: CLIENT-MMDDYY-XX (6 digits, dash, 2 digits)
  const newFormatMatch = invoiceNumber.match(/^([A-Z0-9]+)-(\d{6})-(\d{2})$/);
  
  return oldFormatMatch !== null && newFormatMatch === null;
}