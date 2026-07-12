export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

/**
 * Global utility to dispatch toast notifications across any layer (hooks, API fetch, components).
 */
export function showToast(message: string, type: ToastType = 'info', title?: string, duration = 4000) {
  if (typeof window === 'undefined') return;
  
  const id = Math.random().toString(36).substring(2, 9);
  const event = new CustomEvent('app-toast', {
    detail: { id, type, title, message, duration } as ToastMessage
  });
  
  window.dispatchEvent(event);
}

export function showSuccessToast(message: string, title?: string) {
  showToast(message, 'success', title, 4000);
}

export function showErrorToast(message: string, title?: string) {
  showToast(message, 'error', title, 6000); // Errors stay slightly longer
}

export function showWarningToast(message: string, title?: string) {
  showToast(message, 'warning', title, 5000);
}

export function showInfoToast(message: string, title?: string) {
  showToast(message, 'info', title, 4000);
}
