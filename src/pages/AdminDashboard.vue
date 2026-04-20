<script setup>
import { ref } from 'vue';
import { auth } from '@/services/firebaseConfig';
import { signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';
import PlotManagement from '@/pages/PlotManagement.vue';
import GardenerManagement from '@/pages/GardenerManagement.vue';
import CMSEditor from '@/pages/CMSEditor.vue';

const router = useRouter();
const activeTab = ref('plots');

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
      <v-container class="mt-8">
        <v-card class="pa-6">
          <v-card-title class="text-h4 px-0 mb-4">Admin Dashboard</v-card-title>

          <v-tabs v-model="activeTab" color="primary">
            <v-tab value="plots">Plot reservation management</v-tab>
            <v-tab value="gardeners">Returning gardener management</v-tab>
            <v-tab value="config">Global configuration</v-tab>
          </v-tabs>

          <v-window v-model="activeTab" class="mt-6">
            <v-window-item value="plots">
              <PlotManagement />
            </v-window-item>

            <v-window-item value="gardeners">
              <GardenerManagement />
            </v-window-item>

            <v-window-item value="config">
              <CMSEditor />
            </v-window-item>
          </v-window>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>
