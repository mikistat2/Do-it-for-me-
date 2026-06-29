<template>
  <div class="flex flex-col gap-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 class="text-xl font-bold">Overview</h2>
        <p class="text-sm text-slate-500">Live status of your job automation pipeline.</p>
      </div>
      <div class="flex items-center gap-2">
        <span
          class="badge"
          :class="automationStore.status?.automationPaused ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300'"
          v-text="automationStore.status?.automationPaused ? 'Paused' : 'Running'"
        ></span>
        <button
          v-if="automationStore.status?.automationPaused"
          class="btn-success"
          :disabled="automationStore.loading"
          @click="resume"
        >
          Resume
        </button>
        <button
          v-else
          class="btn-secondary"
          :disabled="automationStore.loading"
          @click="pause"
        >
          Pause
        </button>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />

    <template v-else-if="overview">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Jobs detected" :value="overview.summary.totals.jobs" icon="💼" accent="brand" />
        <StatCard label="Applications sent" :value="overview.summary.totals.applicationsSent" icon="📨" accent="emerald" />
        <StatCard label="Pending drafts" :value="overview.summary.totals.pendingDrafts" icon="📝" accent="amber" />
        <StatCard label="Success rate" :value="successRate" icon="✅" accent="sky" />
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="card">
          <h3 class="mb-4 text-sm font-semibold uppercase text-slate-500">Jobs by status</h3>
          <div class="h-64">
            <BarChart :labels="statusLabels" :values="statusValues" label="Jobs" />
          </div>
        </div>
        <div class="card">
          <h3 class="mb-4 text-sm font-semibold uppercase text-slate-500">Pipeline health</h3>
          <ul class="flex flex-col gap-3 text-sm">
            <li class="flex items-center justify-between">
              <span>Matched jobs</span>
              <span class="font-semibold" v-text="overview.summary.totals.matchedJobs"></span>
            </li>
            <li class="flex items-center justify-between">
              <span>Average match score</span>
              <span class="font-semibold" v-text="avgScore"></span>
            </li>
            <li class="flex items-center justify-between">
              <span>Applications failed</span>
              <span class="font-semibold text-rose-500" v-text="overview.summary.totals.applicationsFailed"></span>
            </li>
            <li class="flex items-center justify-between">
              <span>Monitored channels</span>
              <span class="font-semibold" v-text="overview.summary.totals.channels"></span>
            </li>
            <li class="flex items-center justify-between">
              <span>Unread notifications</span>
              <span class="font-semibold" v-text="overview.summary.totals.unreadNotifications"></span>
            </li>
          </ul>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div class="card">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase text-slate-500">Recent applications</h3>
            <RouterLink class="text-sm text-brand-600 hover:underline" :to="{ name: 'applications' }">View all</RouterLink>
          </div>
          <EmptyState v-if="overview.recentApplications.length === 0" message="No applications yet" />
          <ul v-else class="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            <li v-for="app in overview.recentApplications" :key="app.id" class="flex items-center justify-between py-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium" v-text="app.job?.title ?? app.subject"></p>
                <p class="truncate text-xs text-slate-500" v-text="app.toEmail"></p>
              </div>
              <StatusBadge :status="app.status" />
            </li>
          </ul>
        </div>
        <div class="card">
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-sm font-semibold uppercase text-slate-500">Pending drafts</h3>
            <RouterLink class="text-sm text-brand-600 hover:underline" :to="{ name: 'drafts' }">View all</RouterLink>
          </div>
          <EmptyState v-if="overview.pendingDrafts.length === 0" message="No pending drafts" />
          <ul v-else class="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            <li v-for="draft in overview.pendingDrafts" :key="draft.id" class="flex items-center justify-between py-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium" v-text="draft.subject"></p>
                <p class="truncate text-xs text-slate-500" v-text="draft.toEmail"></p>
              </div>
              <StatusBadge :status="draft.status" />
            </li>
          </ul>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink } from 'vue-router';
import { dashboardApi } from '@/api';
import { extractError } from '@/api/client';
import { useAutomationStore } from '@/stores/automation.store';
import { useToast } from '@/composables/useToast';
import StatCard from '@/components/StatCard.vue';
import StatusBadge from '@/components/StatusBadge.vue';
import BarChart from '@/components/BarChart.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import type { DashboardOverview } from '@/types';

const automationStore = useAutomationStore();
const toast = useToast();

const overview = ref<DashboardOverview | null>(null);
const loading = ref(true);

const statusLabels = computed(() => Object.keys(overview.value?.jobsByStatus ?? {}));
const statusValues = computed(() => Object.values(overview.value?.jobsByStatus ?? {}));
const successRate = computed(() => `${Math.round((overview.value?.summary.successRate ?? 0) * 100)}%`);
const avgScore = computed(() => Math.round(overview.value?.summary.averageMatchScore ?? 0));

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    overview.value = await dashboardApi.overview();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    loading.value = false;
  }
};

const pause = async (): Promise<void> => {
  try {
    await automationStore.pause();
    toast.success('Automation paused');
  } catch (err) {
    toast.error(extractError(err).message);
  }
};

const resume = async (): Promise<void> => {
  try {
    await automationStore.resume();
    toast.success('Automation resumed');
  } catch (err) {
    toast.error(extractError(err).message);
  }
};

onMounted(async () => {
  await Promise.all([load(), automationStore.refresh()]);
});
</script>
