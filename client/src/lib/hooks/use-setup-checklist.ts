import { useState, useEffect } from 'react';

const CHECKLIST_DISMISSED_KEY = 'setup-checklist-dismissed';

/**
 * Hook to manage the setup checklist visibility
 * Persists dismissal state to localStorage
 */
export function useSetupChecklist() {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if checklist was previously dismissed
    const dismissed = localStorage.getItem(CHECKLIST_DISMISSED_KEY);
    if (dismissed === 'true') {
      setIsDismissed(true);
    }
  }, []);

  const dismiss = () => {
    setIsDismissed(true);
    localStorage.setItem(CHECKLIST_DISMISSED_KEY, 'true');
  };

  const reset = () => {
    setIsDismissed(false);
    localStorage.removeItem(CHECKLIST_DISMISSED_KEY);
  };

  return {
    isDismissed,
    dismiss,
    reset,
  };
}
