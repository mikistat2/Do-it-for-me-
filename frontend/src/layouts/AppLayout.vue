<template>
  <div class="flex min-h-full">
    <aside
      class="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 md:flex"
    >
      <div class="mb-6 flex items-center gap-2 px-2">
        <span class="text-2xl">🤖</span>
        <span class="text-lg font-bold">JobBot</span>
      </div>
      <nav class="flex flex-1 flex-col gap-1">
        <RouterLink
          v-for="link in links"
          :key="link.name"
          :to="{ name: link.name }"
          class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          active-class="!bg-brand-600 !text-white"
        >
          <span v-text="link.icon"></span>
          <span v-text="link.label"></span>
        </RouterLink>
      </nav>
    </aside>

    <div class="flex min-w-0 flex-1 flex-col">
      <header
        class="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900"
      >
        <div class="flex items-center gap-3">
          <button class="btn-secondary md:hidden" @click="mobileOpen = !mobileOpen">
            ☰
          </button>
          <h1 class="text-lg font-semibold capitalize" v-text="currentTitle"></h1>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="btn-secondary"
            :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
            @click="toggleDark()"
            v-text="isDark ? '☀️' : '🌙'"
          ></button>
          <RouterLink :to="{ name: 'notifications' }" class="btn-secondary relative">
            🔔
            <span
              v-if="notificationStore.unreadCount > 0"
              class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-xs text-white"
              v-text="notificationStore.unreadCount"
            ></span>
          </RouterLink>
          <div class="hidden text-right sm:block">
            <p class="text-sm font-medium" v-text="authStore.user?.email"></p>
            <p class="text-xs text-slate-500" v-text="authStore.user?.role"></p>
          </div>
          <button class="btn-secondary" @click="handleLogout">Logout</button>
        </div>
      </header>

      <transition name="fade">
        <nav
          v-if="mobileOpen"
          class="flex flex-col gap-1 border-b border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:hidden"
        >
          <RouterLink
            v-for="link in links"
            :key="link.name"
            :to="{ name: link.name }"
            class="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            active-class="!bg-brand-600 !text-white"
            @click="mobileOpen = false"
            v-text="`${link.icon}  ${link.label}`"
          ></RouterLink>
        </nav>
      </transition>

      <main class="flex-1 overflow-y-auto p-4 md:p-6">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { useNotificationStore } from '@/stores/notification.store';
import { useTheme } from '@/composables/useTheme';

const authStore = useAuthStore();
const notificationStore = useNotificationStore();
const router = useRouter();
const route = useRoute();
const { isDark, toggleDark } = useTheme();

const mobileOpen = ref(false);

const links = [
  { name: 'dashboard', label: 'Dashboard', icon: '📊' },
  { name: 'jobs', label: 'Jobs', icon: '💼' },
  { name: 'applications', label: 'Applications', icon: '📨' },
  { name: 'drafts', label: 'Drafts', icon: '📝' },
  { name: 'statistics', label: 'Statistics', icon: '📈' },
  { name: 'channels', label: 'Channels', icon: '📺' },
  { name: 'notifications', label: 'Notifications', icon: '🔔' },
  { name: 'logs', label: 'Logs', icon: '🗒️' },
  { name: 'profile', label: 'Profile', icon: '👤' },
  { name: 'settings', label: 'Settings', icon: '⚙️' },
];

const currentTitle = computed(() => String(route.name ?? 'dashboard'));

const handleLogout = async (): Promise<void> => {
  await authStore.logout();
  await router.replace({ name: 'login' });
};

onMounted(() => {
  void notificationStore.refresh();
});
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
