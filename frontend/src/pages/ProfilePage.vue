<template>
  <div class="flex flex-col gap-4">
    <h2 class="text-xl font-bold">Profile</h2>
    <LoadingSpinner v-if="loading" />
    <form v-else-if="form" class="flex flex-col gap-6" @submit.prevent="save">
      <div class="card grid grid-cols-1 gap-4 md:grid-cols-2">
        <div>
          <label class="label">Full name</label>
          <input v-model="form.fullName" class="input" type="text" required />
        </div>
        <div>
          <label class="label">Email</label>
          <input v-model="form.email" class="input" type="email" required />
        </div>
        <div>
          <label class="label">Phone</label>
          <input v-model="form.phone" class="input" type="text" />
        </div>
        <div>
          <label class="label">Portfolio URL</label>
          <input v-model="form.portfolio" class="input" type="url" />
        </div>
        <div>
          <label class="label">LinkedIn</label>
          <input v-model="form.linkedin" class="input" type="url" />
        </div>
        <div>
          <label class="label">GitHub</label>
          <input v-model="form.github" class="input" type="url" />
        </div>
        <div>
          <label class="label">Expected salary</label>
          <input v-model.number="form.expectedSalary" class="input" type="number" min="0" />
        </div>
        <div>
          <label class="label">Minimum match score</label>
          <input v-model.number="form.minMatchScore" class="input" type="number" min="0" max="100" />
        </div>
      </div>

      <div class="card flex flex-col gap-4">
        <div>
          <label class="label">Skills (comma separated)</label>
          <input v-model="skillsText" class="input" type="text" />
        </div>
        <div>
          <label class="label">Preferred roles (comma separated)</label>
          <input v-model="rolesText" class="input" type="text" />
        </div>
        <div>
          <label class="label">Preferred locations (comma separated)</label>
          <input v-model="locationsText" class="input" type="text" />
        </div>
        <div>
          <label class="label">Resume text</label>
          <textarea v-model="form.resumeText" class="input h-48"></textarea>
        </div>
      </div>

      <div class="flex justify-end">
        <button class="btn-primary" type="submit" :disabled="saving">
          <span v-text="saving ? 'Saving…' : 'Save profile'"></span>
        </button>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { profileApi } from '@/api';
import { extractError } from '@/api/client';
import { useToast } from '@/composables/useToast';
import LoadingSpinner from '@/components/LoadingSpinner.vue';
import type { Profile } from '@/types';

const toast = useToast();
const loading = ref(true);
const saving = ref(false);
const form = ref<Profile | null>(null);
const skillsText = ref('');
const rolesText = ref('');
const locationsText = ref('');

const toList = (value: string): string[] =>
  value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

const load = async (): Promise<void> => {
  loading.value = true;
  try {
    const profile = await profileApi.get();
    form.value = profile;
    skillsText.value = profile.skills.join(', ');
    rolesText.value = profile.preferredRoles.join(', ');
    locationsText.value = profile.preferredLocations.join(', ');
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    loading.value = false;
  }
};

const save = async (): Promise<void> => {
  if (!form.value) {
    return;
  }
  saving.value = true;
  try {
    const updated = await profileApi.update({
      fullName: form.value.fullName,
      email: form.value.email,
      phone: form.value.phone,
      portfolio: form.value.portfolio,
      linkedin: form.value.linkedin,
      github: form.value.github,
      resumeText: form.value.resumeText,
      expectedSalary: form.value.expectedSalary,
      minMatchScore: form.value.minMatchScore,
      skills: toList(skillsText.value),
      preferredRoles: toList(rolesText.value),
      preferredLocations: toList(locationsText.value),
    });
    form.value = updated;
    toast.success('Profile saved');
  } catch (err) {
    toast.error(extractError(err).message);
  } finally {
    saving.value = false;
  }
};

onMounted(load);
</script>
