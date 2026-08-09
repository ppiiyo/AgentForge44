export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

function safeFormatString(val: any): string {
  if (val === null || val === undefined) return '';
  if (typeof val === 'string') return val;
  if (val instanceof Error) return val.message || String(val);
  if (typeof val === 'object') {
    if (val._reactName || val.nativeEvent || val.target || val.preventDefault) {
      return '[UI Event]';
    }
    try {
      return JSON.stringify(val);
    } catch {
      return '[Complex Object]';
    }
  }
  return String(val);
}

/**
 * Global utility to dispatch toast notifications across any layer (hooks, API fetch, components).
 */
export function showToast(message: any, type: ToastType = 'info', title?: any, duration = 4000) {
  if (typeof window === 'undefined') return;
  
  const cleanMessage = safeFormatString(message);
  const cleanTitle = title !== undefined && title !== null ? safeFormatString(title) : undefined;
  const cleanType = (['success', 'error', 'info', 'warning'].includes(type as string) ? type : 'info') as ToastType;
  const cleanDuration = typeof duration === 'number' ? duration : 4000;

  const id = Math.random().toString(36).substring(2, 9);
  const event = new CustomEvent('app-toast', {
    detail: { id, type: cleanType, title: cleanTitle, message: cleanMessage, duration: cleanDuration } as ToastMessage
  });
  
  window.dispatchEvent(event);
}

export function showSuccessToast(message: any, title?: any) {
  showToast(message, 'success', title, 4000);
}

export function showErrorToast(message: any, title?: any) {
  showToast(message, 'error', title, 6000); // Errors stay slightly longer
}

export function showWarningToast(message: any, title?: any) {
  showToast(message, 'warning', title, 5000);
}

export function showInfoToast(message: any, title?: any) {
  showToast(message, 'info', title, 4000);
}
