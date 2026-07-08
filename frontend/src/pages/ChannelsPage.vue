<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <h2 class="text-xl font-bold">Channels</h2>
      <button class="btn-primary" @click="openAddModal">Add Channel</button>
    </div>

    <LoadingSpinner v-if="loading" />
    <div v-else-if="channels.length === 0" class="card text-center text-slate-500">
      No channels configured yet. Add a Telegram channel to start monitoring jobs.
    </div>
    <div v-else class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      <div v-for="channel in channels" :key="channel.id" class="card flex flex-col gap-3">
        <div class="flex items-start justify-between">
          <div>
            <h3 class="font-bold" v-text="channel.title || channel.channelId"></h3>
            <p v-if="channel.username" class="text-xs text-slate-500" v-text="'@' + channel.username"></p>
          </div>
          <span
            class="rounded-full px-2 py-1 text-xs font-medium"
            :class="{
              'bg-emerald-100 text-emerald-700': channel.status === 'ACTIVE',
              'bg-slate-100 text-slate-700': channel.status === 'PAUSED',
              'bg-rose-100 text-rose-700': channel.status === 'ERROR',
            }"
            v-text="channel.status"
          ></span>
        </div>
        
        <div class="flex items-center gap-1 text-xs">
          <span class="text-slate-500">Last message:</span>
          <span
            v-if="channel.lastMessageAt"
            :class="isRecent(channel.lastMessageAt) ? 'text-emerald-600 font-medium' : 'text-rose-600 font-medium'"
            v-text="new Date(channel.lastMessageAt).toLocaleString()"
          ></span>
          <span v-else class="text-rose-600 font-medium">Never</span>
        </div>

        <div class="mt-2 flex items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <button
            class="btn-secondary text-xs flex-1"
            @click="toggleStatus(channel)"
          >
            <span v-text="channel.status === 'ACTIVE' ? 'Pause' : 'Activate'"></span>
          </button>
          <button
            class="btn-secondary text-xs flex-1"
            :disabled="syncingId === channel.id"
            @click="syncChannel(channel)"
          >
            <span v-text="syncingId === channel.id ? 'Syncing...' : 'Sync'"></span>
          </button>
          <button
            class="btn-secondary text-xs text-rose-600 hover:bg-rose-50"
            @click="removeChannel(channel)"
          >
            Delete
          </button>
        </div>
      </div>
    </div>

    <!-- Add Modal -->
    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div class="card w-full max-w-md flex flex-col gap-4">
        <h3 class="text-lg font-bold">Add Telegram Channel</h3>
        
        <div>
          <label class="label">Channel ID or Username</label>
          <input 
            v-model="newChannelId" 
            type="text" 
            class="input" 
            placeholder="e.g. @remotejobs or -100123456789" 
            @keyup.enter="addChannel"
          />
          <p class="mt-1 text-xs text-slate-500">Enter the channel's username or its numeric ID if it's private.</p>
        </div>

        <div>
          <label class="label">Display Title</label>
          <input 
            v-model="newChannelTitle" 
            type="text" 
            class="input" 
            placeholder="e.g. Remote JS Jobs" 
            @keyup.enter="addChannel"
          />
        </div>

        <div class="flex justify-end gap-2 mt-2">
          <button class="btn-secondary" @click="closeModal">Cancel</button>
          <button class="btn-primary" :disabled="saving || !newChannelId" @click="addChannel">
            <span v-text="saving ? 'Adding...' : 'Add Channel'"></span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { channelApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import type { TelegramChannel } from '@/types';

const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const syncingId = ref<string | null>(null);
const channels = ref<TelegramChannel[]>([]);

const showModal = ref(false);
const newChannelId = ref('');
const newChannelTitle = ref('');

const isRecent = (dateStr: string | null | undefined): boolean => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  return diffInHours < 24;
};

const load = async () => {
  loading.value = true;
  try {
    const data = await channelApi.list();
    channels.value = data.items;
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    loading.value = false;
  }
};

const openAddModal = () => {
  newChannelId.value = '';
  newChannelTitle.value = '';
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
};

const addChannel = async () => {
  if (!newChannelId.value) return;
  saving.value = true;
  try {
    await channelApi.create({
      channelId: newChannelId.value,
      title: newChannelTitle.value || newChannelId.value,
      status: 'ACTIVE'
    });
    toast.success('Channel added');
    closeModal();
    await load();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    saving.value = false;
  }
};

const toggleStatus = async (channel: TelegramChannel) => {
  try {
    const newStatus = channel.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    await channelApi.update(channel.id, { status: newStatus });
    channel.status = newStatus;
    toast.success(`Channel ${newStatus.toLowerCase()}`);
  } catch (err) {
    toast.error(extractError(err).message);
  }
};

const syncChannel = async (channel: TelegramChannel) => {
  syncingId.value = channel.id;
  try {
    const result = await channelApi.sync(channel.id);
    toast.success(`Synced ${result.processed} messages, found ${result.jobs} jobs`);
    await load();
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    syncingId.value = null;
  }
};

const removeChannel = async (channel: TelegramChannel) => {
  if (!confirm(`Are you sure you want to remove ${channel.title || channel.channelId}?`)) return;
  try {
    await channelApi.remove(channel.id);
    toast.success('Channel removed');
    await load();
  } catch (err) {
    toast.error(extractError(err).message);
  }
};

onMounted(load);
</script>
