/**
 * Simple notification utilities for showing user feedback
 */

export interface NotificationOptions {
  duration?: number;
  position?: 'top' | 'bottom' | 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

/**
 * Show an error notification to the user
 * @param title - The error title
 * @param message - The error message
 * @param options - Additional options
 */
export function showError(title: string, message?: string, options?: NotificationOptions): void {
  // For now, use console.error as a fallback
  // In a real implementation, this would integrate with a toast/notification system
  console.error(`${title}${message ? `: ${message}` : ''}`);
  
  // You can integrate with libraries like react-hot-toast, react-toastify, etc.
  // Example with react-hot-toast:
  // toast.error(`${title}${message ? `: ${message}` : ''}`, options);
}

/**
 * Show a success notification to the user
 * @param title - The success title
 * @param message - The success message
 * @param options - Additional options
 */
export function showSuccess(title: string, message?: string, options?: NotificationOptions): void {
  console.log(`✅ ${title}${message ? `: ${message}` : ''}`);
  
  // Example with react-hot-toast:
  // toast.success(`${title}${message ? `: ${message}` : ''}`, options);
}

/**
 * Show an info notification to the user
 * @param title - The info title
 * @param message - The info message
 * @param options - Additional options
 */
export function showInfo(title: string, message?: string, options?: NotificationOptions): void {
  console.info(`ℹ️ ${title}${message ? `: ${message}` : ''}`);
  
  // Example with react-hot-toast:
  // toast(`${title}${message ? `: ${message}` : ''}`, options);
}

/**
 * Show a warning notification to the user
 * @param title - The warning title
 * @param message - The warning message
 * @param options - Additional options
 */
export function showWarning(title: string, message?: string, options?: NotificationOptions): void {
  console.warn(`⚠️ ${title}${message ? `: ${message}` : ''}`);
  
  // Example with react-hot-toast:
  // toast(`${title}${message ? `: ${message}` : ''}`, { icon: '⚠️', ...options });
}