<script setup>
import { ref, onMounted } from 'vue';
import { database, auth } from '@/services/firebaseConfig';
import { ref as dbRef, get } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const gardeners = ref([]);
const returningGardeners = ref([]);
const loading = ref(true);

const loadData = async () => {
  try {
    const gardenersRef = dbRef(database, 'gardeners');
    const gardenersSnapshot = await get(gardenersRef);
    if (gardenersSnapshot.exists()) {
      gardeners.value = Object.entries(gardenersSnapshot.val()).map(([id, data]) => ({
        id,
        ...data
      }));
    }

    const returningRef = dbRef(database, 'returning-gardeners');
    const returningSnapshot = await get(returningRef);
    if (returningSnapshot.exists()) {
      returningGardeners.value = Object.entries(returningSnapshot.val()).map(([id, data]) => ({
        id,
        ...data
      }));
    }
  } catch (error) {
    console.error('Error loading data:', error);
  } finally {
    loading.value = false;
  }
};

const logout = async () => {
  try {
    await signOut(auth);
    router.push('/admin/login');
  } catch (error) {
    console.error('Logout error:', error);
  }
};

onMounted(loadData);
</script>

<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Gardener Management</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container class="mt-8">
        <v-tabs>
          <v-tab>New Registrations</v-tab>
          <v-tab>Returning Gardeners</v-tab>

          <v-tab-item>
            <v-data-table
              :headers="[
                { title: 'Name', key: 'lastName' },
                { title: 'Email', key: 'email' },
                { title: 'Plot ID', key: 'plotId' },
                { title: 'Payment Verified', key: 'paymentVerified' }
              ]"
              :items="gardeners"
              :loading="loading"
              class="elevation-1"
            ></v-data-table>
          </v-tab-item>

          <v-tab-item>
            <v-data-table
              :headers="[
                { title: 'Name', key: 'lastName' },
                { title: 'Affiliation', key: 'affiliation' },
                { title: 'Had Plot', key: 'hadPlotLastYear' }
              ]"
              :items="returningGardeners"
              :loading="loading"
              class="elevation-1"
            ></v-data-table>
          </v-tab-item>
        </v-tabs>
      </v-container>
    </v-main>
  </v-app>
</template>
