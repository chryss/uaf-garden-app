<script setup>
import { ref, onMounted } from 'vue';
import { database, auth } from '@/services/firebaseConfig';
import { ref as dbRef, get, update } from 'firebase/database';
import { signOut } from 'firebase/auth';
import { useRouter } from 'vue-router';

const router = useRouter();
const plots = ref([]);
const loading = ref(true);

const loadPlots = async () => {
  try {
    const plotsRef = dbRef(database, 'plots');
    const snapshot = await get(plotsRef);
    if (snapshot.exists()) {
      plots.value = Object.entries(snapshot.val()).map(([id, data]) => ({
        id,
        ...data
      }));
    }
  } catch (error) {
    console.error('Error loading plots:', error);
  } finally {
    loading.value = false;
  }
};

const markAsPaid = async (plotId) => {
  try {
    const plotRef = dbRef(database, `plots/${plotId}`);
    await update(plotRef, { paymentVerified: true });
    await loadPlots();
  } catch (error) {
    console.error('Error updating plot:', error);
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

onMounted(loadPlots);
</script>

<template>
  <v-app>
    <v-app-bar color="primary">
      <v-app-bar-title>Plot Management</v-app-bar-title>
      <v-spacer></v-spacer>
      <v-btn icon @click="logout">
        <v-icon>mdi-logout</v-icon>
      </v-btn>
    </v-app-bar>

    <v-main>
      <v-container class="mt-8">
        <v-data-table
          :headers="[
            { title: 'Plot ID', key: 'id' },
            { title: 'Name', key: 'name' },
            { title: 'Status', key: 'status' },
            { title: 'Registered Gardener', key: 'registeredGardenerId' },
            { title: 'Payment Verified', key: 'paymentVerified' },
            { title: 'Actions', key: 'actions' }
          ]"
          :items="plots"
          :loading="loading"
          class="elevation-1"
        >
          <template v-slot:item.actions="{ item }">
            <v-btn
              v-if="!item.paymentVerified"
              size="small"
              color="success"
              @click="markAsPaid(item.id)"
            >
              Mark as Paid
            </v-btn>
          </template>
        </v-data-table>
      </v-container>
    </v-main>
  </v-app>
</template>
