// Tab visibility handler to prevent unwanted refreshes
// This runs outside React's lifecycle to avoid framework conflicts

// Enable debug logging for troubleshooting
const DEBUG_TAB_VISIBILITY = true;

let isTabActive = true;
let lastActiveTime = Date.now();
const TAB_INACTIVE_THRESHOLD = 60 * 60 * 1000; // 1 hour (increased from 30 seconds)

// Debug logger
function logTabEvent(event: string, details?: unknown) {
  if (DEBUG_TAB_VISIBILITY) {
    const timestamp = new Date().toISOString();
    console.log(`[TabVisibility ${timestamp}] ${event}`, details || '');
  }
}

// Store the current scroll position and form state
let savedState: {
  scrollY: number;
  scrollX: number;
  timestamp: number;
} | null = null;

// Prevent page unload during tab switches
export function initTabVisibilityHandler() {
  logTabEvent('INIT', { 
    currentUrl: window.location.href,
    userAgent: navigator.userAgent,
    timestamp: Date.now() 
  });
  
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
  const isHidden = document.hidden;
  
  logTabEvent('VISIBILITY_CHANGE', {
    hidden: isHidden,
    wasActive: isTabActive,
    lastActiveTime,
    currentTime: Date.now(),
    documentState: document.visibilityState,
    hasFocus: document.hasFocus()
  });
  
  if (isHidden) {
    // Tab is now hidden
    isTabActive = false;
    saveCurrentState();
    
    // Prevent Supabase from detecting this as a disconnect
    if ((window as any).supabase?.auth) {
      try {
        // Keep the session alive
        logTabEvent('SUPABASE_SESSION_KEEPALIVE_ATTEMPT');
        (window as any).supabase.auth.getSession();
      } catch (e) {
        logTabEvent('SUPABASE_SESSION_KEEPALIVE_ERROR', { error: e });
      }
    }
  } else {
    // Tab is now visible
    const wasInactive = !isTabActive;
    isTabActive = true;
    const inactiveDuration = Date.now() - lastActiveTime;
    
    logTabEvent('TAB_BECOMING_VISIBLE', {
      wasInactive,
      inactiveDuration,
      threshold: TAB_INACTIVE_THRESHOLD,
      willRestoreState: wasInactive && inactiveDuration < TAB_INACTIVE_THRESHOLD
    });
    
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
  logTabEvent('WINDOW_FOCUS', {
    wasActive: isTabActive,
    currentTime: Date.now()
  });
  
  if (!isTabActive) {
    isTabActive = true;
    lastActiveTime = Date.now();
    preventRefresh();
  }
}

function handleWindowBlur() {
  logTabEvent('WINDOW_BLUR', {
    wasActive: isTabActive,
    currentTime: Date.now()
  });
  
  isTabActive = false;
  saveCurrentState();
}

function handleBeforeUnload(e: BeforeUnloadEvent) {
  // Only show warning if there are unsaved changes
  // This helps distinguish between tab switches and actual navigation
  const hasUnsavedChanges = checkForUnsavedChanges();
  
  logTabEvent('BEFORE_UNLOAD', {
    hasUnsavedChanges,
    currentUrl: window.location.href,
    timestamp: Date.now()
  });
  
  if (hasUnsavedChanges) {
    e.preventDefault();
    e.returnValue = '';
    return '';
  }
}

function saveCurrentState() {
  const state = {
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    timestamp: Date.now()
  };
  
  logTabEvent('SAVE_STATE', {
    scrollPosition: { x: state.scrollX, y: state.scrollY },
    url: window.location.href
  });
  
  savedState = state;
}

function restoreState() {
  if (savedState && Date.now() - savedState.timestamp < 3600000) { // Within 1 hour (matching threshold)
    logTabEvent('RESTORE_STATE', {
      scrollPosition: { x: savedState.scrollX, y: savedState.scrollY },
      stateAge: Date.now() - savedState.timestamp,
      url: window.location.href
    });
    
    // Restore scroll position smoothly
    requestAnimationFrame(() => {
      window.scrollTo({
        top: savedState!.scrollY,
        left: savedState!.scrollX,
        behavior: 'instant'
      });
    });
  } else {
    logTabEvent('RESTORE_STATE_SKIPPED', {
      reason: savedState ? 'state_too_old' : 'no_saved_state',
      stateAge: savedState ? Date.now() - savedState.timestamp : null
    });
  }
}

function preventRefresh() {
  const hadRefreshHash = window.location.hash === '#refresh' || window.location.hash === '#reload';
  
  logTabEvent('PREVENT_REFRESH', {
    hadRefreshHash,
    currentHash: window.location.hash,
    url: window.location.href
  });
  
  // Override any pending location changes
  if (hadRefreshHash) {
    window.location.hash = '';
  }
  
  // Stop any pending navigation
  if (window.stop) {
    try {
      window.stop();
      logTabEvent('NAVIGATION_STOPPED');
    } catch (e) {
      logTabEvent('NAVIGATION_STOP_ERROR', { error: e });
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