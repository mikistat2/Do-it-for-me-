import { defineStore } from 'pinia';
import { ref } from 'vue';
import { notificationApi } from '@/api';
import type { AppNotification } from '@/types';

export const useNotificationStore = defineStore('notifications', () => {
  const items = ref<AppNotification[]>([]);
  const unreadCount = ref(0);
  const loading = ref(false);

  const refresh = async (): Promise<void> => {
    loading.value = true;
    try {
      const result = await notificationApi.list({ page: 1, pageSize: 20 });
      items.value = result.items;
      unreadCount.value = result.items.filter((item) => !item.isRead).length;
    } finally {
      loading.value = false;
    }
  };

  const markRead = async (id: string): Promise<void> => {
    await notificationApi.markRead(id);
    const target = items.value.find((item) => item.id === id);
    if (target && !target.isRead) {
      target.isRead = true;
      unreadCount.value = Math.max(0, unreadCount.value - 1);
    }
  };

  const markAllRead = async (): Promise<void> => {
    await notificationApi.markAllRead();
    items.value.forEach((item) => {
      item.isRead = true;
    });
    unreadCount.value = 0;
  };

  return { items, unreadCount, loading, refresh, markRead, markAllRead };
});
