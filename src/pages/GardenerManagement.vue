<script setup>
import { ref, onMounted } from 'vue';
import { database } from '@/services/firebaseConfig';
import { ref as dbRef, get } from 'firebase/database';

const gardeners = ref([]);
const returningGardeners = ref([]);
const loading = ref(true);
const activeTab = ref('new');

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

onMounted(loadData);
</script>

<template>
  <v-card class="pa-6">
    <v-card-title class="text-h5 px-0">Returning gardener management</v-card-title>

    <v-tabs v-model="activeTab" color="primary">
      <v-tab value="new">New registrations</v-tab>
      <v-tab value="returning">Returning gardeners</v-tab>
    </v-tabs>

    <v-window v-model="activeTab" class="mt-4">
      <v-window-item value="new">
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
      </v-window-item>

      <v-window-item value="returning">
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
      </v-window-item>
    </v-window>
  </v-card>
</template>
