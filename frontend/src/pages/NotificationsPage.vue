<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Notifications</h2>
      <button class="btn-secondary" :disabled="store.loading" @click="markAll">Mark all read</button>
    </div>

    <LoadingSpinner v-if="store.loading && store.items.length === 0" />
    <EmptyState v-else-if="store.items.length === 0" message="No notifications" icon="🔔" />
    <ul v-else class="flex flex-col gap-2">
      <li
        v-for="item in store.items"
        :key="item.id"
        class="card flex items-start justify-between gap-4"
        :class="item.isRead ? 'opacity-70' : 'border-l-4 border-l-brand-500'"
      >
        <div class="flex items-start gap-3">
          <span class="text-xl" v-text="iconFor(item.type)"></span>
          <div>
            <p class="font-medium" v-text="item.title"></p>
            <p class="text-sm text-slate-500" v-text="item.message"></p>
            <p class="mt-1 text-xs text-slate-400" v-text="formatDate(item.createdAt)"></p>
          </div>
        </div>
        <button
          v-if="!item.isRead"
          class="btn-secondary px-3 py-1"
          @click="store.markRead(item.id)"
        >
          Mark read
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useNotificationStore } from '@/stores/notification.store';
import { useToast } from '@/composables/useToast';
import { extractError } from '@/api/client';
import { formatDate } from '@/utils/format';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { NotificationType } from '@/types';

const store = useNotificationStore();
const toast = useToast();

const iconFor = (type: NotificationType): string => {
  const map: Record<NotificationType, string> = {
    APPLICATION_SENT: '✅',
    APPLICATION_FAILED: '❌',
    HIGH_SCORE_JOB: '⭐',
    SYSTEM_STOPPED: '🛑',
    SYSTEM_STARTED: '🚀',
  };
  return map[type] ?? '🔔';
};

const markAll = async (): Promise<void> => {
  try {
    await store.markAllRead();
    toast.success('All notifications marked read');
  } catch (err) {
    toast.error(extractError(err).message);
  }
};

onMounted(() => {
  void store.refresh();
});
</script>
