<template>
  <teleport to="body">
    <transition name="modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-40 flex items-center justify-center bg-black/50 p-4"
        @click.self="$emit('update:modelValue', false)"
      >
        <div
          class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-6 shadow-xl dark:bg-slate-900"
        >
          <div class="mb-4 flex items-center justify-between">
            <h3 class="text-lg font-semibold" v-text="title"></h3>
            <button
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              @click="$emit('update:modelValue', false)"
            >
              ✕
            </button>
          </div>
          <slot></slot>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
defineProps<{ modelValue: boolean; title: string }>();
defineEmits<{ (event: 'update:modelValue', value: boolean): void }>();
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}
.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
