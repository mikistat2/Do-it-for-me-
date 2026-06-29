<template>
  <div class="flex flex-col items-center justify-center gap-2 py-12 text-center">
    <span class="text-4xl" v-text="icon"></span>
    <p class="text-sm font-medium text-slate-500 dark:text-slate-400" v-text="message"></p>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message: string; icon?: string }>(), {
  icon: '📭',
});
</script>
