<template>
  <span class="badge" :class="badgeClass" v-text="label"></span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{ status: string }>();

const label = computed(() => props.status.replace(/_/g, ' '));

const badgeClass = computed(() => {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    SENT: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    APPLIED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    APPROVED: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    STRONG_APPLY: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
    PENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    QUEUED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    SENDING: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300',
    DRAFTED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    MATCHED: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    DETECTED: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    CONSIDER: 'bg-sky-100 text-sky-700 dark:bg-sky-900/50 dark:text-sky-300',
    APPLY: 'bg-brand-100 text-brand-700 dark:bg-brand-900/50 dark:text-brand-300',
    FAILED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    ERROR: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    REJECTED: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    SKIP: 'bg-rose-100 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300',
    SKIPPED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    PAUSED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
    ARCHIVED: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  };
  return map[props.status] ?? 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
});
</script>
