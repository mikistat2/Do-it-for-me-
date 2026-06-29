<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
    <div class="card w-full max-w-md">
      <div class="mb-6 text-center">
        <div class="mb-2 text-4xl">🤖</div>
        <h1 class="text-2xl font-bold">JobBot</h1>
        <p class="text-sm text-slate-500" v-text="mode === 'login' ? 'Sign in to your account' : 'Create a new account'"></p>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="handleSubmit">
        <div v-if="mode === 'register'">
          <label class="label" for="fullName">Full name</label>
          <input id="fullName" v-model="form.fullName" class="input" type="text" required />
        </div>
        <div>
          <label class="label" for="email">Email</label>
          <input id="email" v-model="form.email" class="input" type="email" required />
        </div>
        <div>
          <label class="label" for="password">Password</label>
          <input id="password" v-model="form.password" class="input" type="password" required minlength="8" />
        </div>

        <p v-if="error" class="text-sm text-rose-500" v-text="error"></p>

        <button class="btn-primary" type="submit" :disabled="loading">
          <span v-text="loading ? 'Please wait…' : (mode === 'login' ? 'Sign in' : 'Register')"></span>
        </button>
      </form>

      <p class="mt-4 text-center text-sm text-slate-500">
        <span v-text="mode === 'login' ? 'No account yet?' : 'Already registered?'"></span>
        <button class="ml-1 font-medium text-brand-600 hover:underline" @click="toggleMode">
          <span v-text="mode === 'login' ? 'Register' : 'Sign in'"></span>
        </button>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { extractError } from '@/api/client';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const mode = ref<'login' | 'register'>('login');
const loading = ref(false);
const error = ref('');
const form = reactive({ email: '', password: '', fullName: '' });

const toggleMode = (): void => {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
};

const handleSubmit = async (): Promise<void> => {
  loading.value = true;
  error.value = '';
  try {
    if (mode.value === 'login') {
      await authStore.login(form.email, form.password);
    } else {
      await authStore.register(form.email, form.password, form.fullName);
    }
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.replace(redirect);
  } catch (err) {
    error.value = extractError(err).message;
  } finally {
    loading.value = false;
  }
};
</script>
