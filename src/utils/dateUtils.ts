/**
 * Date utility functions that handle timezone issues consistently
 * Prevents the common JavaScript "previous day" bug when working with dates
 */

/**
 * Safely parses a date string to avoid timezone issues that cause "previous day" bugs
 * @param dateStr - Date string in YYYY-MM-DD format
 * @returns Date object in local timezone
 */
export function parseDateSafely(dateStr: string): Date {
  if (!dateStr) {
    return new Date();
  }
  
  if (dateStr.includes('T')) {
    // Already has time component, use as-is
    return new Date(dateStr);
  }
  
  // For YYYY-MM-DD format, manually construct date to avoid UTC interpretation
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Formats a date to YYYY-MM-DD format consistently
 * @param date - Date object or date string
 * @returns YYYY-MM-DD formatted string
 */
export function formatDateToYMD(date: Date | string): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseDateSafely(date);
  } else {
    dateObj = date;
  }
  
  // Use local timezone methods to avoid UTC conversion issues
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date for display in the UI (avoiding timezone bugs)
 * @param date - Date object or date string
 * @param options - Intl.DateTimeFormat options
 * @returns Formatted date string
 */
export function formatDateForDisplay(
  date: Date | string,
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  }
): string {
  let dateObj: Date;
  
  if (typeof date === 'string') {
    dateObj = parseDateSafely(date);
  } else {
    dateObj = date;
  }
  
  // Use Intl.DateTimeFormat with explicit timezone to avoid issues
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
  }).format(dateObj);
}

/**
 * Gets today's date in YYYY-MM-DD format (local timezone)
 * @returns Today's date string
 */
export function getTodayYMD(): string {
  const today = new Date();
  return formatDateToYMD(today);
}

/**
 * Calculates the difference in days between two dates
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Number of days difference (positive if date1 is after date2)
 */
export function daysDifference(date1: Date | string, date2: Date | string): number {
  const d1 = typeof date1 === 'string' ? parseDateSafely(date1) : date1;
  const d2 = typeof date2 === 'string' ? parseDateSafely(date2) : date2;
  
  // Reset time components to avoid partial day issues
  const d1Start = new Date(d1.getFullYear(), d1.getMonth(), d1.getDate());
  const d2Start = new Date(d2.getFullYear(), d2.getMonth(), d2.getDate());
  
  const diffTime = d1Start.getTime() - d2Start.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Adds days to a date safely
 * @param date - Base date
 * @param days - Number of days to add
 * @returns New date with days added
 */
export function addDays(date: Date | string, days: number): Date {
  const dateObj = typeof date === 'string' ? parseDateSafely(date) : new Date(date);
  const newDate = new Date(dateObj);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

/**
 * Checks if a date is in the past (compared to today)
 * @param date - Date to check
 * @returns True if the date is before today
 */
export function isDateInPast(date: Date | string): boolean {
  const dateObj = typeof date === 'string' ? parseDateSafely(date) : date;
  const today = new Date();
  
  // Compare only date parts (ignore time)
  const dateOnly = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate());
  const todayOnly = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  return dateOnly < todayOnly;
}

/**
 * Converts a date to the format expected by HTML date inputs (YYYY-MM-DD)
 * @param date - Date to convert
 * @returns Date string in HTML input format
 */
export function toHTMLDateInputValue(date: Date | string): string {
  return formatDateToYMD(date);
}

/**
 * Creates a Date object from HTML date input value (avoiding timezone issues)
 * @param htmlDateValue - Value from HTML date input (YYYY-MM-DD)
 * @returns Date object in local timezone
 */
export function fromHTMLDateInputValue(htmlDateValue: string): Date {
  return parseDateSafely(htmlDateValue);
}