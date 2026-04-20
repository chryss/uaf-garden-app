<script setup>
import { useRouter } from 'vue-router';
import { auth } from '@/services/firebaseConfig';
import { ref, watch } from 'vue';

const router = useRouter();
const isAdmin = ref(false);

// Check if current user is authenticated
watch(() => router.currentRoute.value, (route) => {
  isAdmin.value = route.path.startsWith('/admin');
});

auth.onAuthStateChanged(user => {
  // Auth state updates handled here
});
</script>

<template>
  <v-app>
    <router-view />
  </v-app>
</template>

<style scoped>
</style>
