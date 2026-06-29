<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-bold">Jobs</h2>
      <div class="flex flex-wrap items-center gap-2">
        <input
          v-model="search"
          class="input w-56"
          type="search"
          placeholder="Search title, company…"
          @keyup.enter="applyFilters"
        />
        <select v-model="statusFilter" class="input w-40" @change="applyFilters">
          <option value="">All statuses</option>
          <option v-for="status in statuses" :key="status" :value="status" v-text="status"></option>
        </select>
        <select v-model="sortBy" class="input w-40" @change="applyFilters">
          <option value="createdAt">Newest</option>
          <option value="score">Match score</option>
          <option value="title">Title</option>
        </select>
        <button class="btn-primary" @click="applyFilters">Search</button>
      </div>
    </div>

    <LoadingSpinner v-if="loading" />
    <EmptyState v-else-if="jobs.length === 0" message="No jobs match your filters" icon="💼" />
    <div v-else class="card overflow-x-auto">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-slate-200 text-xs uppercase text-slate-500 dark:border-slate-800">
          <tr>
            <th class="py-2 pr-4">Title</th>
            <th class="py-2 pr-4">Company</th>
            <th class="py-2 pr-4">Score</th>
            <th class="py-2 pr-4">Status</th>
            <th class="py-2 pr-4">Detected</th>
            <th class="py-2"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="job in jobs"
            :key="job.id"
            class="border-b border-slate-100 last:border-0 dark:border-slate-800"
          >
            <td class="py-3 pr-4 font-medium" v-text="job.title"></td>
            <td class="py-3 pr-4 text-slate-500" v-text="job.company ?? '—'"></td>
            <td class="py-3 pr-4">
              <span v-if="job.match" class="font-semibold" v-text="job.match.score"></span>
              <span v-else class="text-slate-400">—</span>
            </td>
            <td class="py-3 pr-4"><StatusBadge :status="job.status" /></td>
            <td class="py-3 pr-4 text-slate-500" v-text="formatDay(job.createdAt)"></td>
            <td class="py-3 text-right">
              <button class="btn-secondary px-3 py-1" @click="openJob(job.id)">View</button>
            </td>
          </tr>
        </tbody>
      </table>
      <PaginationControls :meta="meta" @change="changePage" />
    </div>

    <ModalDialog v-model="modalOpen" :title="selected?.title ?? 'Job details'">
      <div v-if="selected" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <StatusBadge :status="selected.status" />
          <span class="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" v-text="selected.remoteType"></span>
          <span v-if="selected.salary" class="badge bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300" v-text="selected.salary"></span>
        </div>

        <div class="grid grid-cols-2 gap-3 text-sm">
          <div><span class="text-slate-500">Company:</span> <span v-text="selected.company ?? '—'"></span></div>
          <div><span class="text-slate-500">Email:</span> <span v-text="selected.contactEmail ?? '—'"></span></div>
          <div><span class="text-slate-500">Phone:</span> <span v-text="selected.contactPhone ?? '—'"></span></div>
          <div><span class="text-slate-500">Experience:</span> <span v-text="selected.experience ?? '—'"></span></div>
          <div><span class="text-slate-500">Deadline:</span> <span v-text="formatDay(selected.deadline)"></span></div>
        </div>

        <div v-if="selected.skills && selected.skills.length" class="flex flex-wrap gap-1">
          <span
            v-for="skill in selected.skills"
            :key="skill.id"
            class="badge bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300"
            v-text="skill.name"
          ></span>
        </div>

        <div v-if="selected.match" class="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
          <div class="mb-2 flex items-center justify-between">
            <h4 class="text-sm font-semibold uppercase text-slate-500">AI match review</h4>
            <div class="flex items-center gap-2">
              <span class="text-lg font-bold" v-text="selected.match.score + '/100'"></span>
              <StatusBadge :status="selected.match.recommendation" />
            </div>
          </div>
          <p class="mb-2 text-sm" v-text="selected.match.reason"></p>
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p class="text-xs font-semibold text-emerald-600">Strengths</p>
              <ul class="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
                <li v-for="(item, idx) in selected.match.strengths" :key="idx" v-text="item"></li>
              </ul>
            </div>
            <div>
              <p class="text-xs font-semibold text-rose-600">Weaknesses</p>
              <ul class="list-inside list-disc text-sm text-slate-600 dark:text-slate-300">
                <li v-for="(item, idx) in selected.match.weaknesses" :key="idx" v-text="item"></li>
              </ul>
            </div>
          </div>
        </div>

        <div>
          <h4 class="mb-1 text-sm font-semibold uppercase text-slate-500">Description</h4>
          <p class="whitespace-pre-wrap text-sm text-slate-600 dark:text-slate-300" v-text="selected.description"></p>
        </div>

        <div class="flex justify-end gap-2">
          <button
            class="btn-primary"
            :disabled="sending || !selected.contactEmail"
            @click="manualSend"
          >
            <span v-text="sending ? 'Sending…' : 'Manual send'"></span>
          </button>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { applicationApi, jobApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { formatDay } from '@/utils/format';
import StatusBadge from '@/components/StatusBadge.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import PaginationControls from '@/components/PaginationControls.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import type { Job, PaginationMeta } from '@/types';

const toast = useToast();
const statuses = ['DETECTED', 'MATCHED', 'DRAFTED', 'APPLIED', 'SKIPPED', 'ARCHIVED'];

const jobs = ref<Job[]>([]);
const meta = ref<PaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
const loading = ref(true);
const search = ref('');
const statusFilter = ref('');
const sortBy = ref('createdAt');

const modalOpen = ref(false);
const selected = ref<Job | null>(null);
const sending = ref(false);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    const result = await jobApi.list({
      page: meta.value.page,
      pageSize: meta.value.pageSize,
      search: search.value || undefined,
      status: statusFilter.value || undefined,
      sortBy: sortBy.value,
      sortOrder: sortBy.value === 'title' ? 'asc' : 'desc',
    });
    jobs.value = result.items;
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

const openJob = async (id: string): Promise<void> => {
  try {
    selected.value = await jobApi.get(id);
    modalOpen.value = true;
  } catch (err) {
    toast.error(extractError(err).message);
  }
};

const manualSend = async (): Promise<void> => {
  if (!selected.value) {
    return;
  }
  sending.value = true;
  try {
    await applicationApi.manualSend(selected.value.id);
    toast.success('Application queued for sending');
    modalOpen.value = false;
    await load();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    sending.value = false;
  }
};

onMounted(load);
</script>
