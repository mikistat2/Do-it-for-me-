import {
  createRouter,
  createWebHistory,
  RouteRecordRaw,
} from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { setUnauthorizedHandler } from '@/api/client';

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    name: 'login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { public: true },
  },
  {
    path: '/',
    component: () => import('@/layouts/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      {
        path: 'dashboard',
        name: 'dashboard',
        component: () => import('@/pages/DashboardPage.vue'),
      },
      {
        path: 'jobs',
        name: 'jobs',
        component: () => import('@/pages/JobsPage.vue'),
      },
      {
        path: 'applications',
        name: 'applications',
        component: () => import('@/pages/ApplicationsPage.vue'),
      },
      {
        path: 'drafts',
        name: 'drafts',
        component: () => import('@/pages/DraftsPage.vue'),
      },
      {
        path: 'profile',
        name: 'profile',
        component: () => import('@/pages/ProfilePage.vue'),
      },
      {
        path: 'settings',
        name: 'settings',
        component: () => import('@/pages/SettingsPage.vue'),
      },
      {
        path: 'notifications',
        name: 'notifications',
        component: () => import('@/pages/NotificationsPage.vue'),
      },
      {
        path: 'channels',
        name: 'channels',
        component: () => import('@/pages/ChannelsPage.vue'),
      },
      {
        path: 'logs',
        name: 'logs',
        component: () => import('@/pages/LogsPage.vue'),
      },
      {
        path: 'statistics',
        name: 'statistics',
        component: () => import('@/pages/StatisticsPage.vue'),
      },
    ],
  },
  { path: '/:pathMatch(.*)*', redirect: { name: 'dashboard' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: () => ({ top: 0 }),
});

router.beforeEach((to) => {
  const auth = useAuthStore();
  auth.bootstrap();

  if (to.meta.requiresAuth && !auth.isAuthenticated) {
    return { name: 'login', query: { redirect: to.fullPath } };
  }
  if (to.meta.public && auth.isAuthenticated) {
    return { name: 'dashboard' };
  }
  return true;
});

setUnauthorizedHandler(() => {
  const auth = useAuthStore();
  auth.clearSession();
  void router.replace({ name: 'login' });
});

export default router;
