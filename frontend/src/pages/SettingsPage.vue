<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-xl font-bold">Settings</h2>
    <LoadingSpinner v-if="loading" />
    <template v-else-if="form">
      <div class="card flex flex-col gap-4">
        <h3 class="text-sm font-semibold uppercase text-slate-500">Automation</h3>
        <label class="flex items-center justify-between gap-4">
          <div>
            <p class="font-medium">Automation paused</p>
            <p class="text-xs text-slate-500">When paused, JobBot will not auto-send applications.</p>
          </div>
          <input v-model="form.automationPaused" type="checkbox" class="h-5 w-5" />
        </label>
        <label class="flex items-center justify-between gap-4">
          <div>
            <p class="font-medium">Auto apply</p>
            <p class="text-xs text-slate-500">Automatically send applications when criteria are met.</p>
          </div>
          <input v-model="form.autoApply" type="checkbox" class="h-5 w-5" />
        </label>
        <div>
          <label class="label">Match threshold (<span v-text="form.matchThreshold"></span>)</label>
          <input v-model.number="form.matchThreshold" type="range" min="0" max="100" class="w-full" />
        </div>
      </div>

      <div class="card flex flex-col gap-4">
        <h3 class="text-sm font-semibold uppercase text-slate-500">Notifications</h3>
        <label class="flex items-center justify-between gap-4">
          <span>Notify on high-score job</span>
          <input v-model="form.notifyOnHighScore" type="checkbox" class="h-5 w-5" />
        </label>
        <label class="flex items-center justify-between gap-4">
          <span>Notify when application sent</span>
          <input v-model="form.notifyOnSent" type="checkbox" class="h-5 w-5" />
        </label>
        <label class="flex items-center justify-between gap-4">
          <span>Notify when application fails</span>
          <input v-model="form.notifyOnFailed" type="checkbox" class="h-5 w-5" />
        </label>
      </div>

      <div class="flex justify-end">
        <button class="btn-primary" :disabled="saving" @click="save">
          <span v-text="saving ? 'Saving…' : 'Save settings'"></span>
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { settingsApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import { useAutomationStore } from '@/stores/automation.store';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import type { Settings } from '@/types';

const toast = useToast();
const automationStore = useAutomationStore();
const loading = ref(true);
const saving = ref(false);
const form = ref<Settings | null>(null);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    form.value = await settingsApi.get();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    loading.value = false;
  }
};

const save = async (): Promise<void> => {
  if (!form.value) {
    return;
  }
  saving.value = true;
  try {
    form.value = await settingsApi.update({
      automationPaused: form.value.automationPaused,
      autoApply: form.value.autoApply,
      matchThreshold: form.value.matchThreshold,
      notifyOnHighScore: form.value.notifyOnHighScore,
      notifyOnSent: form.value.notifyOnSent,
      notifyOnFailed: form.value.notifyOnFailed,
    });
    await automationStore.refresh();
    toast.success('Settings saved');
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>
