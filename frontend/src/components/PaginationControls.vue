<template>
  <div
    v-if="meta.totalPages > 1"
    class="flex items-center justify-between gap-2 pt-4 text-sm"
  >
    <p class="text-slate-500">
      <span v-text="rangeLabel"></span>
    </p>
    <div class="flex items-center gap-1">
      <button
        class="btn-secondary px-3 py-1"
        :disabled="meta.page <= 1"
        @click="$emit('change', meta.page - 1)"
      >
        Prev
      </button>
      <span class="px-2" v-text="pageLabel"></span>
      <button
        class="btn-secondary px-3 py-1"
        :disabled="meta.page >= meta.totalPages"
        @click="$emit('change', meta.page + 1)"
      >
        Next
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { PaginationMeta } from '@/types';

const props = defineProps<{ meta: PaginationMeta }>();
defineEmits<{ (event: 'change', page: number): void }>();

const pageLabel = computed(() => `Page ${props.meta.page} of ${props.meta.totalPages}`);
const rangeLabel = computed(() => {
  const start = (props.meta.page - 1) * props.meta.pageSize + 1;
  const end = Math.min(props.meta.page * props.meta.pageSize, props.meta.total);
  return `${start}-${end} of ${props.meta.total}`;
});
</script>
