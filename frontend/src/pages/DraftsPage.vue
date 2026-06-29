<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-xl font-bold">Application drafts</h2>
      <select v-model="statusFilter" class="input w-40" @change="applyFilters">
        <option value="">All statuses</option>
        <option v-for="status in statuses" :key="status" :value="status" v-text="status"></option>
      </select>
    </div>

    <LoadingSpinner v-if="loading" />
    <EmptyState v-else-if="drafts.length === 0" message="No drafts to review" icon="📝" />
    <div v-else class="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div v-for="draft in drafts" :key="draft.id" class="card flex flex-col gap-3">
        <div class="flex items-start justify-between gap-2">
          <div class="min-w-0">
            <p class="truncate font-semibold" v-text="draft.subject"></p>
            <p class="truncate text-xs text-slate-500" v-text="draft.toEmail"></p>
          </div>
          <StatusBadge :status="draft.status" />
        </div>
        <p class="line-clamp-3 text-sm text-slate-600 dark:text-slate-300" v-text="draft.body"></p>
        <div class="flex flex-wrap gap-2">
          <button class="btn-secondary px-3 py-1" @click="openDraft(draft)">View &amp; edit</button>
          <button
            v-if="draft.status === 'PENDING'"
            class="btn-success px-3 py-1"
            :disabled="busyId === draft.id"
            @click="approve(draft.id)"
          >
            Approve &amp; send
          </button>
          <button
            v-if="draft.status === 'PENDING'"
            class="btn-danger px-3 py-1"
            :disabled="busyId === draft.id"
            @click="reject(draft.id)"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
    <PaginationControls :meta="meta" @change="changePage" />

    <ModalDialog v-model="modalOpen" :title="'Edit draft'">
      <div v-if="editing" class="flex flex-col gap-3">
        <div>
          <label class="label">Recipient email</label>
          <input v-model="editing.toEmail" class="input" type="email" />
        </div>
        <div>
          <label class="label">Subject</label>
          <input v-model="editing.subject" class="input" type="text" />
        </div>
        <div>
          <label class="label">Body</label>
          <textarea v-model="editing.body" class="input h-64"></textarea>
        </div>
        <div class="flex justify-end gap-2">
          <button class="btn-secondary" :disabled="saving" @click="saveDraft">Save changes</button>
          <button
            v-if="editing.status === 'PENDING'"
            class="btn-success"
            :disabled="saving"
            @click="approveFromModal"
          >
            Approve &amp; send
          </button>
        </div>
      </div>
    </ModalDialog>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { draftApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import StatusBadge from '@/components/StatusBadge.vue';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import EmptyState from '@/components/EmptyState.vue';
import PaginationControls from '@/components/PaginationControls.vue';
import ModalDialog from '@/components/ModalDialog.vue';
import type { ApplicationDraft, PaginationMeta } from '@/types';

const toast = useToast();
const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'SENT'];

const drafts = ref<ApplicationDraft[]>([]);
const meta = ref<PaginationMeta>({ page: 1, pageSize: 10, total: 0, totalPages: 1 });
const loading = ref(true);
const statusFilter = ref('');
const busyId = ref<string | null>(null);

const modalOpen = ref(false);
const editing = ref<ApplicationDraft | null>(null);
const saving = ref(false);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    const result = await draftApi.list({
      page: meta.value.page,
      pageSize: meta.value.pageSize,
      status: statusFilter.value || undefined,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });
    drafts.value = result.items;
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

const openDraft = (draft: ApplicationDraft): void => {
  editing.value = { ...draft };
  modalOpen.value = true;
};

const saveDraft = async (): Promise<void> => {
  if (!editing.value) {
    return;
  }
  saving.value = true;
  try {
    await draftApi.update(editing.value.id, {
      subject: editing.value.subject,
      body: editing.value.body,
      toEmail: editing.value.toEmail,
    });
    toast.success('Draft updated');
    modalOpen.value = false;
    await load();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    saving.value = false;
  }
};

const approve = async (id: string): Promise<void> => {
  busyId.value = id;
  try {
    await draftApi.approve(id);
    toast.success('Draft approved and queued');
    await load();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    busyId.value = null;
  }
};

const approveFromModal = async (): Promise<void> => {
  if (!editing.value) {
    return;
  }
  await saveDraft();
  await approve(editing.value.id);
};

const reject = async (id: string): Promise<void> => {
  busyId.value = id;
  try {
    await draftApi.reject(id);
    toast.info('Draft rejected');
    await load();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    busyId.value = null;
  }
};

onMounted(load);
</script>
