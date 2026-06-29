import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useAuthStore } from './stores/auth.store';
import './style.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

// Restore the persisted session before mounting so guards resolve correctly.
const authStore = useAuthStore(pinia);
authStore.bootstrap();

app.mount('#app');
