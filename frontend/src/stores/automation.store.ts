import { defineStore } from 'pinia';
import { ref } from 'vue';
import { automationApi } from '@/api';
import type { AutomationStatus } from '@/types';

export const useAutomationStore = defineStore('automation', () => {
  const status = ref<AutomationStatus | null>(null);
  const loading = ref(false);

  const refresh = async (): Promise<void> => {
    loading.value = true;
    try {
      status.value = await automationApi.status();
    } finally {
      loading.value = false;
    }
  };

  const pause = async (): Promise<void> => {
    await automationApi.pause();
    await refresh();
  };

  const resume = async (): Promise<void> => {
    await automationApi.resume();
    await refresh();
  };

  return { status, loading, refresh, pause, resume };
});
