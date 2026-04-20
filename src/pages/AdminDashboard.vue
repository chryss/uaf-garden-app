<script setup>
import { ref } from 'vue';
import { auth } from '@/services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();

const logout = async () => {
  try {
    await signOut(auth);
    router.push('/admin/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};
</script>

<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Admin Dashboard</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container>
        <v-row class="mt-8">
          <v-col cols="12">
            <h1 class="text-h3 mb-8">Admin Dashboard</h1>
          </v-col>
        </v-row>

        <v-row>
          <v-col cols="12" md="4">
            <v-card class="text-center pa-6 cursor-pointer" @click="$router.push('/admin/plots')">
              <v-card-title>Plot Management</v-card-title>
              <v-card-text>Manage plots and verify payments</v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card class="text-center pa-6 cursor-pointer" @click="$router.push('/admin/gardeners')">
              <v-card-title>Gardener Management</v-card-title>
              <v-card-text>View and edit gardener registrations</v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" md="4">
            <v-card class="text-center pa-6 cursor-pointer" @click="$router.push('/admin/cms')">
              <v-card-title>CMS Editor</v-card-title>
              <v-card-text>Edit website content</v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.cursor-pointer {
  cursor: pointer;
}
.cursor-pointer:hover {
  background-color: #f5f5f5;
}
</style>
