<script setup>
import { ref } from 'vue';
import { auth } from '@/services/firebaseConfig';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const email = ref('');
const password = ref('');
const loading = ref(false);
const error = ref('');

const login = async () => {
  error.value = '';
  loading.value = true;
  try {
    await signInWithEmailAndPassword(auth, email.value, password.value);
    router.push('/admin');
  } catch (err) {
    error.value = 'Invalid email or password';
    console.error('Login error:', err);
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <v-container class="d-flex align-center justify-center" style="min-height: 100vh;">
    <v-card class="pa-8" style="width: 100%; max-width: 400px;">
      <v-card-title class="text-h4 mb-8 text-center">Admin Login</v-card-title>

      <v-alert v-if="error" type="error" class="mb-6">{{ error }}</v-alert>

      <v-form @submit.prevent="login">
        <v-text-field
          v-model="email"
          label="Email"
          type="email"
          required
          class="mb-4"
        ></v-text-field>

        <v-text-field
          v-model="password"
          label="Password"
          type="password"
          required
          class="mb-6"
        ></v-text-field>

        <v-btn
          type="submit"
          color="primary"
          size="large"
          :loading="loading"
          block
        >
          Login
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>
