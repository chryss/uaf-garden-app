<script setup>
import { ref } from 'vue';
import { auth, database } from '@/services/firebaseConfig';
import { get, ref as dbRef } from 'firebase/database';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();
const email = ref('');
const password = ref('');
const loading = ref(false);
const resetLoading = ref(false);
const error = ref(route.query['not-admin'] ? 'That account is not configured as an admin.' : '');
const message = ref('');

const formatFirebaseError = (err) => {
  if (!err) {
    return 'An unknown error occurred.';
  }

  const code = err.code ? `${err.code}: ` : '';
  const details = err.message || 'Unknown Firebase error';
  return `${code}${details}`;
};

const isAdmin = async (user) => {
  const snapshot = await get(dbRef(database, `admins/${user.uid}`));
  return snapshot.exists();
};

const login = async () => {
  error.value = '';
  message.value = '';
  loading.value = true;
  try {
    const credential = await signInWithEmailAndPassword(auth, email.value, password.value);
    const adminUser = await isAdmin(credential.user);
    if (!adminUser) {
      await signOut(auth);
      error.value = 'That account is not configured as an admin.';
      return;
    }

    router.push('/admin');
  } catch (err) {
    error.value = formatFirebaseError(err);
    console.error('Login error:', err);
  } finally {
    loading.value = false;
  }
};

const sendReset = async () => {
  error.value = '';
  message.value = '';

  if (!email.value) {
    error.value = 'Enter your admin email address first.';
    return;
  }

  resetLoading.value = true;
  try {
    await sendPasswordResetEmail(auth, email.value);
    message.value = 'Password reset email sent.';
  } catch (err) {
    error.value = formatFirebaseError(err);
    console.error('Password reset error:', err);
  } finally {
    resetLoading.value = false;
  }
};
</script>

<template>
  <v-container class="d-flex align-center justify-center" style="min-height: 100vh;">
    <v-card class="pa-8" style="width: 100%; max-width: 420px;">
      <v-card-title class="text-h4 mb-2 text-center">Admin Login</v-card-title>
      <v-card-subtitle class="text-center mb-6">
        Use your admin email and password. You can reset the password if needed.
      </v-card-subtitle>

      <v-alert v-if="error" type="error" class="mb-4">{{ error }}</v-alert>
      <v-alert v-if="message" type="success" variant="tonal" class="mb-4">{{ message }}</v-alert>

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
          class="mb-4"
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

        <v-btn
          class="mt-3"
          variant="text"
          color="primary"
          block
          type="button"
          :loading="resetLoading"
          @click="sendReset"
        >
          Forgot password? Send reset email
        </v-btn>
      </v-form>
    </v-card>
  </v-container>
</template>
