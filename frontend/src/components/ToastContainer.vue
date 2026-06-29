<template>
  <div class="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
    <transition-group name="toast">
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="flex items-start justify-between gap-3 rounded-lg px-4 py-3 text-sm shadow-lg"
        :class="toastClass(toast.type)"
      >
        <span v-text="toast.message"></span>
        <button class="opacity-70 hover:opacity-100" @click="remove(toast.id)">
          ✕
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToast, type Toast } from '@/composables/useToast';

const { toasts, remove } = useToast();

const toastClass = (type: Toast['type']): string => {
  switch (type) {
    case 'success':
      return 'bg-emerald-600 text-white';
    case 'error':
      return 'bg-rose-600 text-white';
    default:
      return 'bg-slate-800 text-white';
  }
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.25s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateY(10px);
}
</style>
