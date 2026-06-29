<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-bold">System logs</h2>
      <div class="flex flex-wrap items-center gap-2">
        <select v-model="levelFilter" class="input w-36" @change="applyFilters">
          <option value="">All levels</option>
          <option v-for="level in levels" :key="level" :value="level" v-text="level"></option>
        </select>
        <select v-model="categoryFilter" class="input w-36" @change="applyFilters">
          <option value="">All categories</option>
          <option v-for="category in categories" :key="category" :value="category" v-text="category"></option>
        </select>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
    <EmptyState v-else-if="logs.length === 0" message="No logs recorded" icon="🗒️" />
    <div v-else class="card overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
          <tr>
            <th class="py-2 pr-4">Time</th>
            <th class="py-2 pr-4">Level</th>
            <th class="py-2 pr-4">Category</th>
            <th class="py-2">Message</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="log in logs" :key="log.id" class="border-b border-slate-100 last:border-0 dark:border-slate-800">
            <td class="py-2 pr-4 whitespace-nowrap text-slate-500" v-text="formatDate(log.createdAt)"></td>
            <td class="py-2 pr-4"><span class="badge" :class="levelClass(log.level)" v-text="log.level"></span></td>
            <td class="py-2 pr-4 text-slate-500" v-text="log.category"></td>
            <td class="py-2" v-text="log.message"></td>
          </tr>
        </tbody>
      </table>
      <PaginationControls :meta="meta" @change="changePage" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { logApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { formatDate } from '@/utils/format';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import PaginationControls from '@/components/PaginationControls.vue';
import type { LogEntry, LogLevel, PaginationMeta } from '@/types';

const toast = useToast();
const levels = ['TRACE', 'DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL'];
const categories = ['TELEGRAM', 'AI', 'EMAIL', 'AUTH', 'SYSTEM', 'ERROR'];

const logs = ref<LogEntry[]>([]);
const meta = ref<PaginationMeta>({ page: 1, pageSize: 25, total: 0, totalPages: 1 });
const loading = ref(true);
const levelFilter = ref('');
const categoryFilter = ref('');

const levelClass = (level: LogLevel): string => {
  const map: Record<string, string> = {
    TRACE: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    DEBUG: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    INFO: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    WARN: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    ERROR: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    FATAL: 'bg-rose-200 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
  };
  return map[level] ?? map.INFO;
};

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    const result = await logApi.list({
      page: meta.value.page,
      pageSize: meta.value.pageSize,
      level: levelFilter.value || undefined,
      category: categoryFilter.value || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    logs.value = result.items;
    meta.value = result.meta;
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    loading.value = false;
  }
};

const applyFilters = (): void => {
  meta.value.page = 1;
  void load();
};

const changePage = (page: number): void => {
  meta.value.page = page;
  void load();
};

onMounted(load);
</script>
