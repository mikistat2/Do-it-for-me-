<template>
  <div class="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
    <div class="card w-full max-w-md">
      <div class="mb-6 text-center">
        <div class="mb-2 text-4xl">🤖</div>
        <h1 class="text-2xl font-bold">JobBot</h1>
        <p class="text-sm text-slate-500" v-text="subtitle"></p>
      </div>

      <!-- Login -->
      <form v-if="mode === 'login'" class="flex flex-col gap-4" @submit.prevent="handleLogin">
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
          <span v-text="loading ? 'Please wait…' : 'Sign in'"></span>
        </button>
      </form>

      <!-- Register step 1: account details -->
      <form
        v-else-if="registerStep === 1"
        class="flex flex-col gap-4"
        @submit.prevent="goToTelegramStep"
      >
        <div>
          <label class="label" for="fullName">Full name</label>
          <input id="fullName" v-model="form.fullName" class="input" type="text" required />
        </div>
        <div>
          <label class="label" for="regEmail">Email</label>
          <input id="regEmail" v-model="form.email" class="input" type="email" required />
        </div>
        <div>
          <label class="label" for="regPassword">Password</label>
          <input id="regPassword" v-model="form.password" class="input" type="password" required minlength="8" />
        </div>
        <div>
          <label class="label" for="phone">Phone number</label>
          <input
            id="phone"
            v-model="form.phone"
            class="input"
            type="tel"
            required
            placeholder="+1234567890"
          />
          <p class="mt-1 text-xs text-slate-500">
            Include country code. Telegram will send a login code to your Telegram app.
          </p>
        </div>

        <p v-if="error" class="text-sm text-rose-500" v-text="error"></p>

        <button class="btn-primary" type="submit" :disabled="loading">
          <span v-text="loading ? 'Please wait…' : 'Continue to Telegram verification'"></span>
        </button>
      </form>

      <!-- Register step 2: Telegram verification -->
      <form
        v-else-if="registerStep === 2"
        class="flex flex-col gap-4"
        @submit.prevent="handleTelegramVerify"
      >
        <div class="rounded-lg bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <p>
            We sent a verification code to Telegram for
            <strong v-text="form.phone"></strong>.
          </p>
          <p class="mt-1">Open the Telegram app on your phone and enter the code below.</p>
        </div>

        <div>
          <label class="label" for="telegramCode">Telegram verification code</label>
          <input
            id="telegramCode"
            v-model="form.telegramCode"
            class="input"
            type="text"
            required
            inputmode="numeric"
            autocomplete="one-time-code"
            placeholder="12345"
          />
        </div>

        <div v-if="needs2fa">
          <label class="label" for="telegram2fa">Telegram 2FA password</label>
          <input
            id="telegram2fa"
            v-model="form.telegram2fa"
            class="input"
            type="password"
            required
          />
          <p v-if="twoFaHint" class="mt-1 text-xs text-slate-500">
            Hint: <span v-text="twoFaHint"></span>
          </p>
        </div>

        <p v-if="error" class="text-sm text-rose-500" v-text="error"></p>
        <p v-if="telegramVerified" class="text-sm text-emerald-600">
          Telegram verified<span v-if="verifiedUsername"> as @{{ verifiedUsername }}</span>. Creating your account…
        </p>

        <div class="flex gap-2">
          <button class="btn-secondary flex-1" type="button" :disabled="loading" @click="backToDetails">
            Back
          </button>
          <button class="btn-primary flex-1" type="submit" :disabled="loading || telegramVerified">
            <span v-text="loading ? 'Please wait…' : (needs2fa ? 'Verify & Register' : 'Verify & Register')"></span>
          </button>
        </div>

        <button
          class="text-sm text-brand-600 hover:underline disabled:opacity-50"
          type="button"
          :disabled="loading || resendCooldown > 0"
          @click="resendCode"
        >
          <span v-text="resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'"></span>
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
import { computed, onUnmounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth.store';
import { authApi } from '@/api';
import { extractError } from '@/api/client';

const authStore = useAuthStore();
const router = useRouter();
const route = useRoute();

const mode = ref<'login' | 'register'>('login');
const registerStep = ref<1 | 2>(1);
const loading = ref(false);
const error = ref('');
const registrationToken = ref('');
const REGISTRATION_TOKEN_KEY = 'jobbot.registrationToken';

const persistRegistrationToken = (token: string): void => {
  registrationToken.value = token;
  sessionStorage.setItem(REGISTRATION_TOKEN_KEY, token);
};

const clearRegistrationToken = (): void => {
  registrationToken.value = '';
  sessionStorage.removeItem(REGISTRATION_TOKEN_KEY);
};

const storedToken = sessionStorage.getItem(REGISTRATION_TOKEN_KEY);
if (storedToken) {
  registrationToken.value = storedToken;
}
const needs2fa = ref(false);
const twoFaHint = ref<string | null>(null);
const telegramVerified = ref(false);
const verifiedUsername = ref<string | null>(null);
const resendCooldown = ref(0);

const form = reactive({
  email: '',
  password: '',
  fullName: '',
  phone: '',
  telegramCode: '',
  telegram2fa: '',
});

let cooldownTimer: ReturnType<typeof setInterval> | null = null;

const subtitle = computed(() => {
  if (mode.value === 'login') {
    return 'Sign in to your account';
  }
  if (registerStep.value === 1) {
    return 'Create a new account';
  }
  return 'Verify your Telegram account';
});

const startResendCooldown = (): void => {
  resendCooldown.value = 60;
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
  }
  cooldownTimer = setInterval(() => {
    resendCooldown.value -= 1;
    if (resendCooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
    }
  }, 1000);
};

const resetRegisterState = (): void => {
  registerStep.value = 1;
  clearRegistrationToken();
  needs2fa.value = false;
  twoFaHint.value = null;
  telegramVerified.value = false;
  verifiedUsername.value = null;
  form.telegramCode = '';
  form.telegram2fa = '';
  form.phone = '';
};

const toggleMode = (): void => {
  mode.value = mode.value === 'login' ? 'register' : 'login';
  error.value = '';
  resetRegisterState();
};

const normalizePhone = (phone: string): string => {
  const trimmed = phone.trim();
  return trimmed.startsWith('+') ? trimmed : `+${trimmed.replace(/^0+/, '')}`;
};

const sendTelegramCode = async (): Promise<void> => {
  const result = await authApi.sendTelegramCode(
    normalizePhone(form.phone),
    registrationToken.value || undefined,
  );
  persistRegistrationToken(result.registrationToken);
  startResendCooldown();
};

const goToTelegramStep = async (): Promise<void> => {
  loading.value = true;
  error.value = '';
  try {
    await sendTelegramCode();
    registerStep.value = 2;
  } catch (err) {
    error.value = extractError(err).message;
  } finally {
    loading.value = false;
  }
};

const backToDetails = (): void => {
  registerStep.value = 1;
  error.value = '';
  needs2fa.value = false;
  twoFaHint.value = null;
  form.telegramCode = '';
  form.telegram2fa = '';
};

const resendCode = async (): Promise<void> => {
  loading.value = true;
  error.value = '';
  try {
    await sendTelegramCode();
  } catch (err) {
    error.value = extractError(err).message;
  } finally {
    loading.value = false;
  }
};

const handleTelegramVerify = async (): Promise<void> => {
  if (!registrationToken.value) {
    error.value = 'Verification session missing. Please request a new code.';
    return;
  }

  loading.value = true;
  error.value = '';
  try {
    const result = await authStore.register(
      form.email,
      form.password,
      form.fullName,
      registrationToken.value,
      form.telegramCode,
      form.telegram2fa || undefined,
    );

    if (result?.status === 'needs_2fa') {
      needs2fa.value = true;
      twoFaHint.value = result.hint ?? null;
      return;
    }

    clearRegistrationToken();
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.replace(redirect);
  } catch (err) {
    error.value = extractError(err).message;
  } finally {
    loading.value = false;
  }
};

const handleLogin = async (): Promise<void> => {
  loading.value = true;
  error.value = '';
  try {
    await authStore.login(form.email, form.password);
    const redirect = (route.query.redirect as string) || '/dashboard';
    await router.replace(redirect);
  } catch (err) {
    error.value = extractError(err).message;
  } finally {
    loading.value = false;
  }
};

onUnmounted(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer);
  }
});
</script>
