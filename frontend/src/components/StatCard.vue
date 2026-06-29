<template>
  <div class="card flex items-center gap-4">
    <div
      class="flex h-12 w-12 items-center justify-center rounded-lg text-2xl"
      :class="accentClass"
    >
      <span v-text="icon"></span>
    </div>
    <div>
      <p class="text-sm text-slate-500 dark:text-slate-400" v-text="label"></p>
      <p class="text-2xl font-bold" v-text="value"></p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    value: string | number;
    icon: string;
    accent?: 'brand' | 'emerald' | 'rose' | 'amber' | 'sky';
  }>(),
  { accent: 'brand' },
);

const accentClass = computed(() => {
  const map: Record<string, string> = {
    brand: 'bg-brand-100 text-brand-700 dark:bg-brand-900 dark:text-brand-200',
    emerald:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-200',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-200',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-200',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-200',
  };
  return map[props.accent];
});
</script>
