<template>
  <RouterView />
  <ToastContainer />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router';
import ToastContainer from '@/components/ToastContainer.vue';
import { useTheme } from '@/composables/useTheme';

// Initialise theme handling so the persisted preference is applied on load.
useTheme();
</script>
