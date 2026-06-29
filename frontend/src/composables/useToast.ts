import { ref } from 'vue';

export interface Toast {
  id: number;
  type: 'success' | 'error' | 'info';
  message: string;
}

const toasts = ref<Toast[]>([]);
let counter = 0;

export const useToast = () => {
  const push = (type: Toast['type'], message: string): void => {
    const id = (counter += 1);
    toasts.value.push({ id, type, message });
    setTimeout(() => {
      remove(id);
    }, 4000);
  };

  const remove = (id: number): void => {
    toasts.value = toasts.value.filter((toast) => toast.id !== id);
  };

  return {
    toasts,
    remove,
    success: (message: string) => push('success', message),
    error: (message: string) => push('error', message),
    info: (message: string) => push('info', message),
  };
};
