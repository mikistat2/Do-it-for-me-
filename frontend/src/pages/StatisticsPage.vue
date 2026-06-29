<template>
  <div class="flex flex-col gap-6">
    <h2 class="text-xl font-bold">Statistics</h2>
    <LoadingSpinner v-if="loading" />
    <template v-else-if="stats">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total jobs" :value="stats.summary.totals.jobs" icon="💼" accent="brand" />
        <StatCard label="Total applications" :value="stats.summary.totals.applications" icon="📨" accent="sky" />
        <StatCard label="Success rate" :value="successRate" icon="✅" accent="emerald" />
        <StatCard label="Avg match score" :value="avgScore" icon="⭐" accent="amber" />
      </div>

      <div class="card">
        <h3 class="mb-4 text-sm font-semibold uppercase text-slate-500">Applications trend (14 days)</h3>
        <div class="h-72">
          <LineChart :labels="trendLabels" :series="trendSeries" />
        </div>
      </div>

      <div class="card">
        <h3 class="mb-4 text-sm font-semibold uppercase text-slate-500">Jobs by status</h3>
        <div class="h-72">
          <BarChart :labels="statusLabels" :values="statusValues" label="Jobs" color="#0ea5e9" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { dashboardApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { formatDay } from '@/utils/format';
import StatCard from '@/components/StatCard.vue';
import BarChart from '@/components/BarChart.vue';
import LineChart from '@/components/LineChart.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import type { StatisticsResponse } from '@/types';

const toast = useToast();
const loading = ref(true);
const stats = ref<StatisticsResponse | null>(null);

const successRate = computed(() => `${Math.round((stats.value?.summary.successRate ?? 0) * 100)}%`);
const avgScore = computed(() => Math.round(stats.value?.summary.averageMatchScore ?? 0));

const trendLabels = computed(() =>
  (stats.value?.applicationsTrend ?? []).map((point) => formatDay(point.date)),
);
const trendSeries = computed(() => [
  {
    label: 'Sent',
    values: (stats.value?.applicationsTrend ?? []).map((point) => point.sent),
    color: '#10b981',
  },
  {
    label: 'Failed',
    values: (stats.value?.applicationsTrend ?? []).map((point) => point.failed),
    color: '#f43f5e',
  },
]);

const statusLabels = computed(() => Object.keys(stats.value?.jobsByStatus ?? {}));
const statusValues = computed(() => Object.values(stats.value?.jobsByStatus ?? {}));

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    stats.value = await dashboardApi.statistics();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    loading.value = false;
  }
};

onMounted(load);
</script>
