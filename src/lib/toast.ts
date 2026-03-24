/**
 * Event-based toast utility.
 *
 * Can be called from anywhere (React components, plain utility functions, etc.)
 * without needing React context. The ToastProvider in Toast.tsx subscribes to
 * these events and renders the notifications.
 *
 * Usage:
 *   import { toast } from '@/lib/toast';
 *   toast.success('Saved!');
 *   toast.error('Something went wrong');
 */

type ToastType = 'success' | 'error' | 'warning' | 'info';

type ToastListener = (type: ToastType, message: string) => void;

const listeners: ToastListener[] = [];

export const toast = {
  success: (message: string) => listeners.forEach((l) => l('success', message)),
  error: (message: string) => listeners.forEach((l) => l('error', message)),
  warning: (message: string) => listeners.forEach((l) => l('warning', message)),
  info: (message: string) => listeners.forEach((l) => l('info', message)),

  /** Subscribe to toast events. Returns an unsubscribe function. */
  subscribe: (fn: ToastListener) => {
    listeners.push(fn);
    return () => {
      const i = listeners.indexOf(fn);
      if (i >= 0) listeners.splice(i, 1);
    };
  },
};
