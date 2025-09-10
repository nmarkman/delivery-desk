// Tab visibility handler to prevent unwanted refreshes
// This runs outside React's lifecycle to avoid framework conflicts

let isTabActive = true;
let lastActiveTime = Date.now();
const TAB_INACTIVE_THRESHOLD = 60 * 60 * 1000; // 1 hour (increased from 30 seconds)

// Store the current scroll position and form state
let savedState: {
  scrollY: number;
  scrollX: number;
  timestamp: number;
} | null = null;

// Prevent page unload during tab switches
export function initTabVisibilityHandler() {
  // Handle visibility change events
  document.addEventListener('visibilitychange', handleVisibilityChange, false);
  
  // Handle focus/blur events as backup
  window.addEventListener('focus', handleWindowFocus, false);
  window.addEventListener('blur', handleWindowBlur, false);
  
  // Handle beforeunload to detect actual navigation vs tab switch
  window.addEventListener('beforeunload', handleBeforeUnload, false);
  
  // Prevent aggressive browser memory management
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      // Keep a minimal activity to prevent browser from suspending the tab
      setInterval(() => {
        if (!document.hidden) {
          lastActiveTime = Date.now();
        }
      }, 10000); // Update every 10 seconds when visible
    });
  }
}

function handleVisibilityChange() {
  if (document.hidden) {
    // Tab is now hidden
    isTabActive = false;
    saveCurrentState();
    
    // Prevent Supabase from detecting this as a disconnect
    if ((window as any).supabase?.auth) {
      try {
        // Keep the session alive
        (window as any).supabase.auth.getSession();
      } catch (e) {
        console.debug('Session keep-alive during tab switch:', e);
      }
    }
  } else {
    // Tab is now visible
    const wasInactive = !isTabActive;
    isTabActive = true;
    const inactiveDuration = Date.now() - lastActiveTime;
    
    // Only restore state if we were inactive for a short time
    if (wasInactive && inactiveDuration < TAB_INACTIVE_THRESHOLD) {
      restoreState();
    }
    
    lastActiveTime = Date.now();
    
    // Prevent any pending refreshes
    preventRefresh();
  }
}

function handleWindowFocus() {
  if (!isTabActive) {
    isTabActive = true;
    lastActiveTime = Date.now();
    preventRefresh();
  }
}

function handleWindowBlur() {
  isTabActive = false;
  saveCurrentState();
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  // Only show warning if there are unsaved changes
  // This helps distinguish between tab switches and actual navigation
  const hasUnsavedChanges = checkForUnsavedChanges();
  
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
}

function saveCurrentState() {
  savedState = {
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    timestamp: Date.now()
  };
}

function restoreState() {
  if (savedState && Date.now() - savedState.timestamp < 3600000) { // Within 1 hour (matching threshold)
    // Restore scroll position smoothly
    requestAnimationFrame(() => {
      window.scrollTo({
        top: savedState!.scrollY,
        left: savedState!.scrollX,
        behavior: 'instant'
      });
    });
  }
}

function preventRefresh() {
  // Override any pending location changes
  if (window.location.hash === '#refresh' || window.location.hash === '#reload') {
    window.location.hash = '';
  }
  
  // Stop any pending navigation
  if (window.stop) {
    try {
      window.stop();
    } catch (e) {
      // Ignore errors from stopping non-existent navigation
    }
  }
}

function checkForUnsavedChanges(): boolean {
  // Check for form inputs with values
  const inputs = document.querySelectorAll('input, textarea, select');
  for (const input of inputs) {
    const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    if (element.type === 'hidden' || element.disabled) continue;
    
    // Check if the input has been modified
    if ('defaultValue' in element && element.value !== element.defaultValue) {
      return true;
    }
    if ('defaultChecked' in element && (element as HTMLInputElement).checked !== (element as HTMLInputElement).defaultChecked) {
      return true;
    }
  }
  
  return false;
}

// Clean up function
export function cleanupTabVisibilityHandler() {
  document.removeEventListener('visibilitychange', handleVisibilityChange);
  window.removeEventListener('focus', handleWindowFocus);
  window.removeEventListener('blur', handleWindowBlur);
  window.removeEventListener('beforeunload', handleBeforeUnload);
}