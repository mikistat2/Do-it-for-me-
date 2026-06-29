<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-bold">Applications</h2>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="search"
          class="input w-56"
          type="search"
          placeholder="Search subject, email…"
          @keyup.enter="applyFilters"
        />
        <select v-model="statusFilter" class="input w-40" @change="applyFilters">
          <option value="">All statuses</option>
          <option v-for="status in statuses" :key="status" :value="status" v-text="status"></option>
        </select>
        <button class="btn-primary" @click="applyFilters">Search</button>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
    <EmptyState v-else-if="applications.length === 0" message="No applications yet" icon="📨" />
    <div v-else class="card overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
          <tr>
            <th class="py-2 pr-4">Subject</th>
            <th class="py-2 pr-4">Recipient</th>
            <th class="py-2 pr-4">Status</th>
            <th class="py-2 pr-4">Attempts</th>
            <th class="py-2 pr-4">Sent</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="app in applications" :key="app.id" class="border-b border-slate-100 last:border-0 dark:border-slate-800">
            <td class="py-3 pr-4 font-medium" v-text="app.subject"></td>
            <td class="py-3 pr-4 text-slate-500" v-text="app.toEmail"></td>
            <td class="py-3 pr-4"><StatusBadge :status="app.status" /></td>
            <td class="py-3 pr-4" v-text="app.attempts"></td>
            <td class="py-3 pr-4 text-slate-500" v-text="formatDate(app.sentAt)"></td>
            <td class="py-3 text-right">
              <button class="btn-secondary px-3 py-1" @click="openApplication(app)">View</button>
            </td>
          </tr>
        </tbody>
      </table>
      <PaginationControls :meta="meta" @change="changePage" />
    </div>

    <ModalDialog v-model="modalOpen" :title="selected?.subject ?? 'Application'">
      <div v-if="selected" class="flex flex-col gap-3">
        <div class="flex items-center gap-2">
          <StatusBadge :status="selected.status" />
          <span class="text-sm text-slate-500" v-text="selected.toEmail"></span>
        </div>
        <p v-if="selected.error" class="rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-900/30 dark:text-rose-300" v-text="selected.error"></p>
        <div class="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <h4 class="mb-2 text-sm font-semibold uppercase text-slate-500">Generated email</h4>
          <p class="mb-2 text-sm font-medium" v-text="selected.subject"></p>
          <p class="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300" v-text="selected.body"></p>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { applicationApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { formatDate } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import PaginationControls from '@/components/PaginationControls.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import type { Application, PaginationMeta } from '@/types';

const toast = useToast();
const statuses = ['QUEUED', 'SENDING', 'SENT', 'FAILED', 'SKIPPED'];

const applications = ref<Application[]>([]);
const meta = ref<PaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
const loading = ref(true);
const search = ref('');
const statusFilter = ref('');

const modalOpen = ref(false);
const selected = ref<Application | null>(null);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    const result = await applicationApi.list({
      page: meta.value.page,
      pageSize: meta.value.pageSize,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    applications.value = result.items;
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

const openApplication = (app: Application): void => {
  selected.value = app;
  modalOpen.value = true;
};

onMounted(load);
</script>
